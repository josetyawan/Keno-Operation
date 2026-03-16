
import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase/init';
import { getFirestore, collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { format, isWeekend } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { UserProfile, Schedule, Attendance, Holiday } from '@/lib/types';
import { sendDailyRekapReport } from '@/ai/flows/send-daily-rekap-report';
import { sendTelegramMessage } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

type DailyStatus = 'Hadir' | 'Izin' | 'Cuti' | 'Libur' | 'Shift Malam';

type UserDailyInfo = {
    user: UserProfile;
    status: DailyStatus;
    sto: string;
};

async function fetchCollection<T>(firestore: any, collectionName: string, constraints: any[] = []): Promise<T[]> {
    const ref = collection(firestore, collectionName);
    const q = query(ref, ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
}

function generateRekapString(userInfos: UserDailyInfo[], title: string, dateHeader: string): string {
    const total = userInfos.length;
    const hadir = userInfos.filter(u => u.status === 'Hadir').sort((a,b) => (a.user.displayName || '').localeCompare(b.user.displayName || ''));
    const ijin = userInfos.filter(u => u.status === 'Izin' || u.status === 'Cuti').sort((a,b) => (a.user.displayName || '').localeCompare(b.user.displayName || ''));
    const libur = userInfos.filter(u => u.status === 'Libur').sort((a,b) => (a.user.displayName || '').localeCompare(b.user.displayName || ''));
    const shiftMalam = userInfos.filter(u => u.status === 'Shift Malam').sort((a,b) => (a.user.displayName || '').localeCompare(b.user.displayName || ''));
    
    const persenHadir = total > 0 ? ((hadir.length / total) * 100).toFixed(1) : '0.0';

    let rekap = `📊 ${title}\n`;
    rekap += `SA KUDUS ${dateHeader}\n`;
    rekap += `PT TELKOM AKSES\n`;
    rekap += `=============================\n`;
    rekap += `TOTAL   : ${total}\n`;
    rekap += `HADIR   : ${hadir.length}\n`;
    rekap += `IJIN    : ${ijin.length}\n`;
    rekap += `LIBUR   : ${libur.length}\n`;
    rekap += `% HADIR : ${persenHadir}%\n\n`;

    rekap += `👷 MASUK\n`;
    rekap += hadir.length > 0 ? hadir.map(u => `▸ ${u.user.displayName} (${u.sto})`).join('\n') : '-';
    rekap += `\n\n`;

    rekap += `👷 LIBUR\n`;
    rekap += libur.length > 0 ? libur.map(u => `✖️ ▸ ${u.user.displayName} (${u.sto})`).join('\n') : '-';
    rekap += `\n\n`;

    rekap += `👷 IJIN/CUTI\n`;
    rekap += ijin.length > 0 ? ijin.map(u => `▸ ${u.user.displayName} (${u.sto})`).join('\n') : '-';
    rekap += `\n\n`;

    rekap += `🌙 SHIFT MALAM\n`;
    rekap += shiftMalam.length > 0 ? shiftMalam.map(u => `🌙 ▸ ${u.user.displayName} (${u.sto})`).join('\n') : '-';

    return rekap;
}

export async function GET(request: NextRequest) {
    try {
        const { firestore } = initializeFirebase();
        const today = new Date();
        const formattedDateHeader = format(today, 'dd/MM/yyyy', { locale: idLocale });
        
        const startOfToday = new Date(today.setHours(0, 0, 0, 0));
        const endOfToday = new Date(today.setHours(23, 59, 59, 999));
        
        const dateForScheduleQuery = new Date(startOfToday.getTime());


        const [users, schedules, attendances, holidays] = await Promise.all([
            fetchCollection<UserProfile>(firestore, 'users', [where('registrationStatus', '==', 'approved')]),
            fetchCollection<Schedule>(firestore, 'schedules', [where('date', '==', Timestamp.fromDate(dateForScheduleQuery))]),
            fetchCollection<Attendance>(firestore, 'attendances', [
                where('checkInTime', '>=', Timestamp.fromDate(startOfToday)),
                where('checkInTime', '<=', Timestamp.fromDate(endOfToday))
            ]),
            fetchCollection<Holiday>(firestore, 'holidays', [where('date', '==', Timestamp.fromDate(dateForScheduleQuery))])
        ]);
        
        const scheduleMap = new Map(schedules.map(s => [s.userId, s]));
        const isTodayHoliday = holidays.length > 0;
        const isTodayWeekend = isWeekend(today);

        const allUserStatuses: UserDailyInfo[] = users
            .filter(u => u.role === 'teknisi')
            .map(user => {
                const userSchedule = scheduleMap.get(user.id);
                const sto = user.psa || 'KDS'; 

                let status: DailyStatus = 'Hadir'; // Default to 'Hadir' on a workday

                if (userSchedule) { // If there is an imported schedule
                    const shiftType = userSchedule.shiftType;
                     if (shiftType === 'ijin') status = 'Izin';
                     else if (shiftType === 'cuti') status = 'Cuti';
                     else if (shiftType === 'malam') status = 'Shift Malam';
                     else if (['l', 'libur-dijadwalkan', 'tukar-jaga'].includes(shiftType)) status = 'Libur';
                     // All other codes ('H', 'PU', 'PB', 'PDM', etc.) are treated as 'Hadir'
                     else status = 'Hadir';
                } else { // No imported schedule for today
                    // If no specific schedule, determine status based on day type
                    if (isTodayHoliday || isTodayWeekend) {
                        status = 'Libur';
                    } else {
                        status = 'Hadir'; // Default for a workday
                    }
                }
                
                return { user, status, sto };
            });

        const assuranceB2CUsers = allUserStatuses.filter(u => u.user.unit?.trim().toUpperCase() === 'B2C');
        const mtcUsers = allUserStatuses.filter(u => u.user.unit?.trim().toUpperCase() === 'MTC');
        const assuranceB2BUsers = allUserStatuses.filter(u => u.user.unit?.trim().toUpperCase() === 'B2B');
        const provisioningUsers = allUserStatuses.filter(u => u.user.unit?.trim().toUpperCase() === 'PROVISIONING');

        const rekapMessages: string[] = [];
        if (provisioningUsers.length > 0) rekapMessages.push(generateRekapString(provisioningUsers, 'PROVISIONING', formattedDateHeader));
        if (assuranceB2CUsers.length > 0) rekapMessages.push(generateRekapString(assuranceB2CUsers, 'ASSURANCE - B2C', formattedDateHeader));
        if (mtcUsers.length > 0) rekapMessages.push(generateRekapString(mtcUsers, 'ASSURANCE - MTC', formattedDateHeader));
        if (assuranceB2BUsers.length > 0) rekapMessages.push(generateRekapString(assuranceB2BUsers, 'ASSURANCE - B2B', formattedDateHeader));
        
        // --- CORRECTED PHOTO LOGIC ---
        const onDutyUserIds = new Set<string>();
        schedules.forEach(s => {
            if (
                (isTodayWeekend && s.shiftType === 'weekend-duty') ||
                (isTodayHoliday && s.shiftType === 'holiday-duty') ||
                s.shiftType === 'malam' ||
                s.shiftType === 'siang-malam'
            ) {
                onDutyUserIds.add(s.userId);
            }
        });

        const photosToSend = (attendances || [])
            .filter(att => onDutyUserIds.has(att.userId))
            .map(att => att.checkInPhotoUrl)
            .filter((url): url is string => !!url);
            
        const isJagaDay = onDutyUserIds.size > 0;
        // --- END OF CORRECTION ---

        if (rekapMessages.length > 0 || photosToSend.length > 0) {
            if (!process.env.TELEGRAM_BOT_TOKEN_ABSENSI || !process.env.TELEGRAM_CHAT_ID_ABSENSI) {
                throw new Error('Telegram Bot Token atau Absensi Chat ID tidak diatur di file .env untuk rekap harian.');
            }

            const messageText = await sendDailyRekapReport({
                rekapMessages: rekapMessages,
                photos: photosToSend,
                photoCaption: isJagaDay ? "Rekap Foto Absen Jaga" : undefined,
            });

            await sendTelegramMessage({
                botToken: process.env.TELEGRAM_BOT_TOKEN_ABSENSI,
                chatId: process.env.TELEGRAM_CHAT_ID_ABSENSI,
                text: messageText,
                photoUrls: photosToSend,
                photoCaption: isJagaDay ? "Rekap Foto Absen Jaga" : undefined,
            });

            return NextResponse.json({ message: 'Daily rekap sent successfully.' });
        } else {
            return NextResponse.json({ message: 'No data to send for daily rekap.' });
        }

    } catch (error: any) {
        console.error('Error in daily-schedule cron:', error);
        return new NextResponse(`Internal Server Error: ${error.message}`, { status: 500 });
    }
}
