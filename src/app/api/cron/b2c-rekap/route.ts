
import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase/init';
import { getFirestore, collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { format, isSameDay } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { UserProfile, Schedule, RiwayatGangguan, OtherWork, ProvisioningRecord } from '@/lib/types';
import { sendProductivityRekap } from '@/ai/flows/send-b2c-rekap';
import { sendTelegramMessage } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

const units = ['B2C', 'B2B', 'MTC', 'Provisioning'];

async function fetchCollection<T>(firestore: any, collectionName: string, constraints: any[] = []): Promise<T[]> {
    const ref = collection(firestore, collectionName);
    const q = query(ref, ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
}

export async function GET(request: NextRequest) {
    try {
        const { firestore } = initializeFirebase();
        const today = new Date();
        const startDate = new Date(today.setHours(0, 0, 0, 0));
        const endDate = new Date(today.setHours(23, 59, 59, 999));
        
        const [allUsers, allSchedules, allRiwayat, allOtherWorks, allProvisioning] = await Promise.all([
            fetchCollection<UserProfile>(firestore, 'users', [where('registrationStatus', '==', 'approved')]),
            fetchCollection<Schedule>(firestore, 'schedules', [
                where('date', '>=', Timestamp.fromDate(startDate)),
                where('date', '<=', Timestamp.fromDate(endDate))
            ]),
            fetchCollection<RiwayatGangguan>(firestore, 'riwayat-gangguan', [
                where('tanggalLapor', '>=', Timestamp.fromDate(startDate)),
                where('tanggalLapor', '<=', Timestamp.fromDate(endDate))
            ]),
            fetchCollection<OtherWork>(firestore, 'other-works', [
                where('tanggalPengerjaan', '>=', Timestamp.fromDate(startDate)),
                where('tanggalPengerjaan', '<=', Timestamp.fromDate(endDate))
            ]),
            fetchCollection<ProvisioningRecord>(firestore, 'provisioning-records', [
                where('completedAt', '>=', Timestamp.fromDate(startDate)),
                where('completedAt', '<=', Timestamp.fromDate(endDate))
            ])
        ]);

        for (const unit of units) {
            const unitUsers = allUsers.filter(u => u.unit === unit && u.role === 'teknisi');
            if (unitUsers.length === 0) continue;

            const userIdsInUnit = new Set(unitUsers.map(u => u.id));
            const productivityMap = new Map<string, number>();

            allRiwayat.forEach(item => {
                if (userIdsInUnit.has(item.userId)) {
                    productivityMap.set(item.userId, (productivityMap.get(item.userId) || 0) + 1);
                }
            });
            allOtherWorks.forEach(item => {
                if (userIdsInUnit.has(item.userId)) {
                    productivityMap.set(item.userId, (productivityMap.get(item.userId) || 0) + 1);
                }
            });
            allProvisioning.forEach(item => {
                if (item.assignedTo_userId && userIdsInUnit.has(item.assignedTo_userId)) {
                    productivityMap.set(item.assignedTo_userId, (productivityMap.get(item.assignedTo_userId) || 0) + 1);
                }
            });
            
            const scheduleMap = new Map(allSchedules.map(s => [s.userId, s.shiftType]));

            // Generate Summary Data
            const summaryData = unitUsers.map(user => {
                let productivity: number | 'L' = productivityMap.get(user.id) || 0;
                const userSchedule = scheduleMap.get(user.id);
                const isLibur = userSchedule === 'l' || userSchedule === 'libur-dijadwalkan' || userSchedule === 'cuti' || userSchedule === 'ijin';
                if (isLibur) {
                    productivity = 'L';
                }
                return {
                    name: (user.displayName || user.email).toUpperCase(),
                    productivity: productivity,
                };
            }).sort((a, b) => a.name.localeCompare(b.name));

            // Generate Detail Data
            const productiveUsers = unitUsers.filter(user => (productivityMap.get(user.id) || 0) > 0);

            const detailData = productiveUsers.map(user => {
                const userRiwayat = allRiwayat.filter(r => r.userId === user.id);
                const userOtherWorks = allOtherWorks.filter(w => w.userId === user.id);
                const userProvisioning = allProvisioning.filter(p => p.assignedTo_userId === user.id);
            
                const tickets = [
                    ...userRiwayat.map(r => ({ id: r.id, ticket: r.noTiket || '', service: r.noService || '', segment: r.jenisOrder })),
                    ...userOtherWorks.map(w => ({ id: w.id, ticket: w.namaPekerjaan || '', service: '', segment: w.jenisOrder })),
                    ...userProvisioning.map(p => ({ id: p.id, ticket: p.workorder || '', service: p.serviceNo || '', segment: p.crmOrder }))
                ];
            
                return {
                    userName: user.displayName || user.email,
                    telegramUsername: user.telegramUsername ? `@${user.telegramUsername.replace('@', '')}` : '',
                    tickets: tickets
                };
            });

            const totalProductivity = Array.from(productivityMap.values()).reduce((sum, count) => sum + count, 0);

            if (totalProductivity > 0) {
                let targetChatId: string | undefined;
                if (unit === 'B2C' || unit === 'MTC') {
                    targetChatId = process.env.TELEGRAM_CHAT_ID_B2C_MTC;
                } else if (unit === 'B2B') {
                    targetChatId = process.env.TELEGRAM_CHAT_ID_B2B;
                } else if (unit === 'Provisioning') {
                    targetChatId = process.env.TELEGRAM_CHAT_ID_PROVISIONING;
                }

                if (!process.env.TELEGRAM_BOT_TOKEN || !targetChatId) {
                  console.error(`Telegram Bot Token or Chat ID for unit ${unit} is not set.`);
                  continue; // Skip this unit if config is missing
                }
                
                const messageText = await sendProductivityRekap({
                    unit,
                    date: format(new Date(), 'dd MMMM yyyy', { locale: idLocale }),
                    summaryData: summaryData,
                    detailData: detailData,
                });
                
                await sendTelegramMessage({
                    botToken: process.env.TELEGRAM_BOT_TOKEN,
                    chatId: targetChatId,
                    text: messageText
                });

                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        return NextResponse.json({ message: 'Productivity rekap sent successfully.' });

    } catch (error: any) {
        console.error('Error in productivity-rekap cron:', error);
        return new NextResponse(`Internal Server Error: ${error.message}`, { status: 500 });
    }
}
