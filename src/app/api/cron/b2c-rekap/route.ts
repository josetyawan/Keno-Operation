import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase/init';
import { getFirestore, collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { format, isSameDay } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { UserProfile, Schedule, RiwayatGangguan, OtherWork } from '@/lib/types';
import { sendProductivityRekap } from '@/ai/flows/send-b2c-rekap';

export const dynamic = 'force-dynamic';

const units = ['B2C', 'B2B', 'MTC', 'Provisioning'];

type SummaryData = {
    name: string;
    productivity: number | 'L';
};

type DetailData = {
    userName: string;
    telegramUsername: string;
    tickets: {
        id: string;
        ticket: string;
        service: string;
        segment: string;
    }[];
};

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
        
        const [allUsers, allSchedules, allRiwayat, allOtherWorks] = await Promise.all([
            fetchCollection<UserProfile>('users', [where('registrationStatus', '==', 'approved')]),
            fetchCollection<Schedule>('schedules', [
                where('date', '>=', Timestamp.fromDate(startDate)),
                where('date', '<=', Timestamp.fromDate(endDate))
            ]),
            fetchCollection<RiwayatGangguan>('riwayat-gangguan', [
                where('tanggalLapor', '>=', Timestamp.fromDate(startDate)),
                where('tanggalLapor', '<=', Timestamp.fromDate(endDate))
            ]),
            fetchCollection<OtherWork>('other-works', [
                where('tanggalPengerjaan', '>=', Timestamp.fromDate(startDate)),
                where('tanggalPengerjaan', '<=', Timestamp.fromDate(endDate))
            ])
        ]);

        for (const unit of units) {
            const unitUsers = allUsers.filter(u => u.unit === unit && u.role === 'teknisi');
            if (unitUsers.length === 0) continue;

            const scheduleMap = new Map(allSchedules.map(s => [s.userId, s.shiftType]));
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

            const summaryData: SummaryData[] = unitUsers
                .map(user => {
                    let productivity: number | 'L' = productivityMap.get(user.id) || 0;
                    const userSchedule = scheduleMap.get(user.id);
                    const isLibur = userSchedule === 'l' || userSchedule === 'libur-dijadwalkan' || userSchedule === 'cuti' || userSchedule === 'ijin';
                    if (isLibur) {
                        productivity = 'L';
                    }
                    return {
                        name: (user.displayName || user.email).toUpperCase(),
                        productivity: productivity
                    };
                }).sort((a, b) => a.name.localeCompare(b.name));

            const productiveUsers = unitUsers.filter(user => (productivityMap.get(user.id) || 0) > 0);
            
            const detailData: DetailData[] = productiveUsers.map(user => {
                const userRiwayat = allRiwayat.filter(r => r.userId === user.id);
                const userOtherWorks = allOtherWorks.filter(w => w.userId === user.id);
                const tickets = [
                    ...userRiwayat.map(r => ({ id: r.id, ticket: r.noTiket || '', service: r.noService || '', segment: r.jenisOrder })),
                    ...userOtherWorks.map(w => ({ id: w.id, ticket: w.namaPekerjaan || '', service: '', segment: w.jenisOrder }))
                ];
                return {
                    userName: user.displayName || user.email,
                    telegramUsername: user.telegramUsername ? `@${user.telegramUsername.replace('@', '')}` : '',
                    tickets: tickets
                };
            }).sort((a, b) => a.userName.localeCompare(b.userName));

            // Generate Messages
            const dateHeader = format(today, 'dd/MM/yyyy');
            let summaryMessage = `📆 REKAP TEKNISI ${unit.toUpperCase()} SEKTOR KUDUS (${dateHeader})\n\n`;
            summaryMessage += 'NAMA TEKNISI | PRODUKTIVITAS\n';
            summaryMessage += summaryData.map(item => `${item.name} | ${item.productivity}`).join('\n');
    
            let detailMessage = `📌 DETAIL PRODUKTIVITAS TEKNISI ${unit.toUpperCase()}`;
            if (detailData.length === 0) {
                detailMessage += '\n\nTidak ada produktivitas tercatat untuk hari ini.';
            } else {
                detailMessage += detailData.map(user => {
                    const userBlock = `\n\n${user.userName} ${user.telegramUsername}\n` +
                                    'TIKET | SERVICE | SEGMEN\n' +
                                    user.tickets.map(t => `${t.ticket || ''} | ${t.service || ''} | ${t.segment}`).join('\n');
                    return userBlock;
                }).join('');
            }

            // Send to Telegram
            await sendProductivityRekap({ unit, summaryMessage, detailMessage });
        }

        return NextResponse.json({ message: 'Productivity rekap sent successfully.' });

    } catch (error: any) {
        console.error('Error in productivity-rekap cron:', error);
        return new NextResponse(`Internal Server Error: ${error.message}`, { status: 500 });
    }
}
