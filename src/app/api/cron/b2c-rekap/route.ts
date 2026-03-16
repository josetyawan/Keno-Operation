
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

            const productivityMap = new Map<string, number>();
            const userIdsInUnit = new Set(unitUsers.map(u => u.id));

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
            
            const totalProductivity = Array.from(productivityMap.values()).reduce((sum, count) => sum + count, 0);
            const productiveUserCount = productivityMap.size;

            if (totalProductivity > 0 || productiveUserCount > 0) {
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
                    date: format(today, 'dd MMMM yyyy', { locale: idLocale }),
                    totalSales: totalProductivity,
                    totalVisit: productiveUserCount,
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
