import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase/init';
import { getFirestore, collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { UserProfile, Schedule, RiwayatGangguan, OtherWork } from '@/lib/types';
import { sendB2cRekap } from '@/ai/flows/send-b2c-rekap';

export const dynamic = 'force-dynamic';

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
        const formattedDateHeader = format(today, 'dd/MM/yyyy', { locale: idLocale });
        
        const startOfToday = new Date(today.setHours(0, 0, 0, 0));
        const endOfToday = new Date(today.setHours(23, 59, 59, 999));
        
        const dateForScheduleQuery = new Date(startOfToday.getTime());

        // 1. Fetch all necessary data
        const [b2cUsers, schedules, riwayatList, otherWorks] = await Promise.all([
            fetchCollection<UserProfile>(firestore, 'users', [where('unit', '==', 'B2C'), where('registrationStatus', '==', 'approved')]),
            fetchCollection<Schedule>(firestore, 'schedules', [where('date', '==', Timestamp.fromDate(dateForScheduleQuery))]),
            fetchCollection<RiwayatGangguan>(firestore, 'riwayat-gangguan', [
                where('tanggalLapor', '>=', Timestamp.fromDate(startOfToday)),
                where('tanggalLapor', '<=', Timestamp.fromDate(endOfToday))
            ]),
            fetchCollection<OtherWork>(firestore, 'other-works', [
                where('tanggalPengerjaan', '>=', Timestamp.fromDate(startOfToday)),
                where('tanggalPengerjaan', '<=', Timestamp.fromDate(endOfToday))
            ])
        ]);

        const scheduleMap = new Map(schedules.map(s => [s.userId, s.shiftType]));
        const productivityMap = new Map<string, number>();

        // 2. Calculate productivity
        riwayatList.forEach(item => {
            productivityMap.set(item.userId, (productivityMap.get(item.userId) || 0) + 1);
        });
        otherWorks.forEach(item => {
            productivityMap.set(item.userId, (productivityMap.get(item.userId) || 0) + 1);
        });

        // 3. Generate Summary Table
        const summaryData = b2cUsers.map(user => {
            const userSchedule = scheduleMap.get(user.id);
            const isLibur = userSchedule === 'l' || userSchedule === 'libur-dijadwalkan' || userSchedule === 'cuti';
            const productivity = isLibur ? 'L' : (productivityMap.get(user.id) || 0);
            return {
                name: (user.displayName || user.email).toUpperCase(),
                productivity: productivity
            };
        }).sort((a,b) => a.name.localeCompare(b.name));

        let summaryMessage = `📆 REKAP TEKNISI B2C SEKTOR KUDUS (${formattedDateHeader})\n\n`;
        summaryMessage += 'NAMA TEKNISI | PRODUKTIVITAS\n';
        summaryData.forEach(item => {
            summaryMessage += `${item.name} | ${item.productivity}\n`;
        });

        // 4. Generate Detail Section
        let detailMessage = `📌 DETAIL PRODUKTIVITAS TEKNISI B2C\n`;
        const productiveUsers = b2cUsers.filter(user => (productivityMap.get(user.id) || 0) > 0);

        if (productiveUsers.length === 0) {
            detailMessage += '\nTidak ada produktivitas tercatat hari ini.';
        } else {
            productiveUsers.forEach(user => {
                const userRiwayat = riwayatList.filter(r => r.userId === user.id);
                const userOtherWorks = otherWorks.filter(w => w.userId === user.id);
                
                detailMessage += `\n${user.displayName || user.email} ${user.telegramUsername ? `@${user.telegramUsername.replace('@', '')}` : ''}\n`;
                detailMessage += 'TIKET | SERVICE | SEGMEN\n';
                
                userRiwayat.forEach(r => {
                    detailMessage += `${r.noTiket || ''} | ${r.noService || ''} | ${r.jenisOrder}\n`;
                });
                userOtherWorks.forEach(w => {
                    detailMessage += `${w.namaPekerjaan || ''} | | ${w.jenisOrder}\n`;
                });
            });
        }
        
        // 5. Send to Telegram
        const result = await sendB2cRekap({ summaryMessage, detailMessage });

        if (result.success) {
            return NextResponse.json({ message: 'B2C Rekap sent successfully.' });
        } else {
            throw new Error(result.error || 'Failed to send B2C rekap to Telegram.');
        }

    } catch (error: any) {
        console.error('Error in b2c-rekap cron:', error);
        return new NextResponse(`Internal Server Error: ${error.message}`, { status: 500 });
    }
}
