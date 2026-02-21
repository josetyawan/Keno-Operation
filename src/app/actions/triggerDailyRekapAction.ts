'use server';

import { initializeFirebase } from '@/firebase/init';
import { getFirestore, collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { format, isWeekend } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { UserProfile, Schedule, Attendance, Holiday } from '@/lib/types';
import { sendDailyRekapReport } from '@/ai/flows/send-daily-rekap-report';

type DailyStatus = 'Hadir' | 'Izin' | 'Cuti' | 'Libur' | 'Shift Malam';

type UserDailyInfo = {
    user: UserProfile;
    status: DailyStatus;
    sto: string;
};

// Helper function from the original file
async function fetchCollection<T>(firestore: any, collectionName: string, constraints: any[] = []): Promise<T[]> {
    const ref = collection(firestore, collectionName);
    const q = query(ref, ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
}

// Helper function from the original file
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
    rekap += `TOTAL : ${total}\n`;
    rekap += `HADIR : ${hadir.length}\n`;
    rekap += `IJIN  : ${ijin.length}\n`;
    rekap += `LIBUR : ${libur.length}\n`;
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


export async function triggerDailyRekapAction(): Promise<{success: boolean, message: string}> {
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
        
        const isTodayHoliday = holidays.length > 0;
        const isTodayWeekend = isWeekend(today);

        const scheduleMap = new Map(schedules.map(s => [s.userId, s]));
        const attendanceMap = new Map(attendances.map(a => [a.userId, a]));

        const allUserStatuses: UserDailyInfo[] = users
            .filter(u => u.role === 'teknisi')
            .map(user => {
                const schedule = scheduleMap.get(user.id);
                const attendance = attendanceMap.get(user.id);
                const sto = user.psa || 'KDS'; 

                let status: DailyStatus = 'Libur';

                if (schedule) {
                    if (schedule.shiftType === 'ijin') status = 'Izin';
                    else if (schedule.shiftType === 'cuti') status = 'Cuti';
                    else if (schedule.shiftType === 'malam') status = 'Shift Malam';
                    else if (['piket-demak', 'siang-malam', 'weekend-duty', 'holiday-duty'].includes(schedule.shiftType)) {
                         status = attendance ? 'Hadir' : 'Libur';
                    }
                } else {
                    if (!isTodayWeekend && !isTodayHoliday) {
                       status = attendance ? 'Hadir' : 'Libur';
                    } else {
                       status = 'Libur';
                    }
                }
                
                if (attendance && status !== 'Izin' && status !== 'Cuti') {
                    status = 'Hadir';
                }

                return { user, status, sto };
            });
        
        const assuranceB2CUsers = allUserStatuses.filter(u => u.user.unit === 'B2C' || u.user.unit === 'MTC');
        const assuranceB2BUsers = allUserStatuses.filter(u => u.user.unit === 'B2B');
        const provisioningUsers = allUserStatuses.filter(u => u.user.unit === 'Provisioning');

        const rekapMessages: string[] = [];
        if (provisioningUsers.length > 0) rekapMessages.push(generateRekapString(provisioningUsers, 'PROVI', formattedDateHeader));
        if (assuranceB2CUsers.length > 0) rekapMessages.push(generateRekapString(assuranceB2CUsers, 'ASSURANCE - B2C', formattedDateHeader));
        if (assuranceB2BUsers.length > 0) rekapMessages.push(generateRekapString(assuranceB2BUsers, 'ASSURANCE - B2B', formattedDateHeader));
        
        let photosToSend: string[] = [];
        const hasNightShift = allUserStatuses.some(u => u.status === 'Shift Malam');
        const isJagaDay = isTodayWeekend || isTodayHoliday || hasNightShift;
        
        if (isJagaDay) {
            photosToSend = attendances.map(a => a.checkInPhotoUrl).filter((url): url is string => !!url);
        }

        if (rekapMessages.length > 0 || photosToSend.length > 0) {
            const result = await sendDailyRekapReport({
                rekapMessages: rekapMessages,
                photos: photosToSend,
                photoCaption: isJagaDay ? "Rekap Foto Absen Jaga" : undefined,
            });
            if (result.success) {
                return { success: true, message: `Rekap berhasil dikirim. ${rekapMessages.length} pesan teks dan ${photosToSend.length} foto dikirim.` };
            } else {
                 throw new Error(result.error || 'Gagal mengirim rekap ke Telegram.');
            }
        } else {
             return { success: true, message: 'Tidak ada data rekap untuk dikirim hari ini.' };
        }

    } catch (error: any) {
        console.error('Error in manual rekap trigger:', error);
        return { success: false, message: error.message };
    }
}
