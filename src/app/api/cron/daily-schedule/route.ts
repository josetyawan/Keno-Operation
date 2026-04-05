
import { NextResponse } from 'next/server';
import { collection, query, where, Timestamp, getDocs } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase/init';
import type { UserProfile, Schedule, Attendance, Holiday } from '@/lib/types';
import { format, isWeekend } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { triggerDailyRekapAction } from '@/app/actions/triggerDailyRekapAction';

export const dynamic = 'force-dynamic';

type DailyStatus = 'Hadir' | 'Izin' | 'Cuti' | 'Libur' | 'Shift Malam';
type UserDailyInfo = {
    user: UserProfile;
    status: DailyStatus;
    sto: string;
};

function generateRekapString(userInfos: UserDailyInfo[], title: string, dateHeader: string): string {
    const total = userInfos.length;
    const hadir = userInfos.filter(u => u.status === 'Hadir').sort((a,b) => (a.user.displayName || '').localeCompare(b.user.displayName || ''));
    const ijin = userInfos.filter(u => u.status === 'Izin' || u.status === 'Cuti').sort((a,b) => (a.user.displayName || '').localeCompare(b.user.displayName || ''));
    const libur = userInfos.filter(u => u.status === 'Libur').sort((a,b) => (a.user.displayName || '').localeCompare(b.user.displayName || ''));
    const shiftMalam = userInfos.filter(u => u.status === 'Shift Malam').sort((a,b) => (a.user.displayName || '').localeCompare(b.user.displayName || ''));
    
    const persenHadir = total > 0 ? ((hadir.length / total) * 100).toFixed(1) : '0.0';

    let rekap = `<pre>📊 ${title}\n`;
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
    rekap += `</pre>`;

    return rekap;
}

export async function GET() {
  try {
    const { firestore } = initializeFirebase();
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const endOfToday = new Date(today.setHours(23, 59, 59, 999));

    const usersQuery = query(collection(firestore, 'users'), where('registrationStatus', '==', 'approved'));
    const schedulesQuery = query(collection(firestore, 'schedules'), where('date', '==', Timestamp.fromDate(startOfToday)));
    const attendancesQuery = query(collection(firestore, 'attendances'), where('checkInTime', '>=', Timestamp.fromDate(startOfToday)), where('checkInTime', '<=', Timestamp.fromDate(endOfToday)));
    const holidaysQuery = query(collection(firestore, 'holidays'), where('date', '==', Timestamp.fromDate(startOfToday)));

    const [usersSnap, schedulesSnap, attendancesSnap, holidaysSnap] = await Promise.all([
      getDocs(usersQuery),
      getDocs(schedulesQuery),
      getDocs(attendancesQuery),
      getDocs(holidaysQuery),
    ]);

    const users = usersSnap.docs.map(d => d.data() as UserProfile);
    const schedules = schedulesSnap.docs.map(d => d.data() as Schedule);
    const attendances = attendancesSnap.docs.map(d => d.data() as Attendance);
    const holidays = holidaysSnap.docs.map(d => d.data() as Holiday);

    const formattedDateHeader = format(today, 'dd/MM/yyyy', { locale: idLocale });
    const isTodayHoliday = holidays.length > 0;
    const isTodayWeekend = isWeekend(today);

    const scheduleMap = new Map(schedules.map(s => [s.userId, s]));

    const allUserStatuses: UserDailyInfo[] = users
      .filter(u => u.role === 'teknisi')
      .map(user => {
        const userSchedule = scheduleMap.get(user.id);
        const sto = user.psa || 'KDS'; 

        let status: DailyStatus = 'Hadir';

        if (userSchedule) {
            const shiftType = userSchedule.shiftType;
            if (shiftType === 'ijin') status = 'Izin';
            else if (shiftType === 'cuti') status = 'Cuti';
            else if (shiftType === 'malam') status = 'Shift Malam';
            else if (['l', 'libur-dijadwalkan', 'tukar-jaga'].includes(shiftType)) status = 'Libur';
            else status = 'Hadir';
        } else {
            if (isTodayHoliday || isTodayWeekend) {
                status = 'Libur';
            } else {
                status = 'Hadir';
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

    const onDutyUserIds = new Set<string>();
    schedules.forEach(s => {
        if ((isTodayWeekend && s.shiftType === 'weekend-duty') || (isTodayHoliday && s.shiftType === 'holiday-duty') || s.shiftType === 'malam' || s.shiftType === 'siang-malam') {
            onDutyUserIds.add(s.userId);
        }
    });

    const photosToSend = attendances.filter(att => onDutyUserIds.has(att.userId)).map(att => att.checkInPhotoUrl).filter((url): url is string => !!url);
    const isJagaDay = onDutyUserIds.size > 0;

    if (rekapMessages.length === 0 && photosToSend.length === 0) {
      return NextResponse.json({ status: 'ok', message: 'Tidak ada data rekap untuk dikirim hari ini.' });
    }

    const result = await triggerDailyRekapAction({
      rekapMessages: rekapMessages,
      photos: photosToSend,
      photoCaption: isJagaDay ? "Rekap Foto Absen Jaga" : undefined,
    });

    if (!result.success) {
      throw new Error(result.message);
    }

    return NextResponse.json({ status: 'ok', sent: result.message });
  } catch (error: any) {
    console.error('Error in /api/cron/daily-schedule:', error);
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}
