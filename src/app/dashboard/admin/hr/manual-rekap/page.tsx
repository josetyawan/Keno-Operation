

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { useRouter } from 'next/navigation';
import { doc, collection, query, where, Timestamp, getDocs } from 'firebase/firestore';
import type { UserProfile, Schedule, Attendance, Holiday } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { triggerDailyRekapAction } from '@/app/actions/triggerDailyRekapAction';
import { Bot, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { format, isWeekend } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

type DailyStatus = 'Hadir' | 'Izin' | 'Cuti' | 'Libur' | 'Shift Malam';

type UserDailyInfo = {
    user: UserProfile;
    status: DailyStatus;
    sto: string;
};

// Helper function to generate the report string, now on the client
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


export default function ManualRekapPage() {
    const [isTriggering, setIsTriggering] = useState(false);
    const { toast } = useToast();
    const router = useRouter();
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();

    const [today, setToday] = useState<Date | null>(null);

    useEffect(() => {
        // Set the date only on the client-side
        setToday(new Date());
    }, []);

    const { data: currentUserProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(
        useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore])
    );
    
    // --- Data fetching moved to client ---
    const startOfToday = useMemo(() => {
        if (!today) return null;
        const d = new Date(today);
        d.setHours(0,0,0,0);
        return d;
    }, [today]);

    const endOfToday = useMemo(() => {
        if (!today) return null;
        const d = new Date(today);
        d.setHours(23,59,59,999);
        return d;
    }, [today]);
    
    const usersQuery = useMemoFirebase(() => query(collection(firestore, 'users'), where('registrationStatus', '==', 'approved')), [firestore]);
    const schedulesQuery = useMemoFirebase(() => {
        if (!startOfToday) return null;
        return query(collection(firestore, 'schedules'), where('date', '==', Timestamp.fromDate(startOfToday)))
    }, [firestore, startOfToday]);
    const attendancesQuery = useMemoFirebase(() => {
        if (!startOfToday || !endOfToday) return null;
        return query(collection(firestore, 'attendances'), where('checkInTime', '>=', Timestamp.fromDate(startOfToday)), where('checkInTime', '<=', Timestamp.fromDate(endOfToday)))
    }, [firestore, startOfToday, endOfToday]);
    const holidaysQuery = useMemoFirebase(() => {
        if (!startOfToday) return null;
        return query(collection(firestore, 'holidays'), where('date', '==', Timestamp.fromDate(startOfToday)))
    }, [firestore, startOfToday]);

    const { data: users, isLoading: areUsersLoading } = useCollection<UserProfile>(usersQuery);
    const { data: schedules, isLoading: areSchedulesLoading } = useCollection<Schedule>(schedulesQuery);
    const { data: attendances, isLoading: areAttendancesLoading } = useCollection<Attendance>(attendancesQuery);
    const { data: holidays, isLoading: areHolidaysLoading } = useCollection<Holiday>(holidaysQuery);
    
    const isDataLoading = areUsersLoading || areSchedulesLoading || areAttendancesLoading || areHolidaysLoading || !today;

    useEffect(() => {
        if (!isUserLoading && !isProfileLoading) {
            const isAdminOrKorlap = currentUserProfile?.role === 'admin' || currentUserProfile?.role === 'korlap';
            if (!user || !isAdminOrKorlap) {
                router.push('/dashboard');
            }
        }
    }, [user, currentUserProfile, isUserLoading, isProfileLoading, router]);

    const handleTrigger = async () => {
        setIsTriggering(true);
        if (!users || !schedules || !attendances || !holidays || !today) {
            toast({ variant: 'destructive', title: 'Data Belum Siap', description: 'Data yang diperlukan untuk rekap belum termuat sepenuhnya.' });
            setIsTriggering(false);
            return;
        }

        try {
            // --- Logic moved from server action ---
            const formattedDateHeader = format(today, 'dd/MM/yyyy', { locale: idLocale });
            const isTodayHoliday = holidays.length > 0;
            const isTodayWeekend = isWeekend(today);

            const scheduleMap = new Map(schedules.map(s => [s.userId, s]));

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
            
            if (rekapMessages.length === 0 && photosToSend.length === 0) {
                 toast({ title: 'Tidak Ada Data', description: 'Tidak ada data rekap untuk dikirim hari ini.' });
                 setIsTriggering(false);
                 return;
            }
            
            // Call the simplified server action
            const result = await triggerDailyRekapAction({
                rekapMessages: rekapMessages,
                photos: photosToSend,
                photoCaption: isJagaDay ? "Rekap Foto Absen Jaga" : undefined,
            });

            if (result.success) {
                toast({
                    title: 'Sukses',
                    description: result.message,
                });
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
             toast({
                variant: 'destructive',
                title: 'Gagal Mengirim Rekap',
                description: error.message || 'Terjadi kesalahan yang tidak diketahui.',
            });
        }
        setIsTriggering(false);
    };

    if (isUserLoading || isProfileLoading || !today) {
        return (
             <div className="mx-auto grid w-full max-w-2xl flex-1 auto-rows-max gap-6">
                <Skeleton className="h-8 w-64" />
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-72" />
                        <Skeleton className="h-4 w-96 mt-1" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-10 w-full mt-6" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="mx-auto grid w-full max-w-2xl flex-1 auto-rows-max gap-6">
            <h1 className="text-3xl font-bold tracking-tight">Trigger Rekap Manual</h1>
             <Card>
                <CardHeader>
                    <CardTitle>Kirim Laporan Rekap Harian</CardTitle>
                    <CardDescription>
                        Gunakan tombol ini untuk mengirimkan rekap absensi harian secara manual ke grup Telegram.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Perhatian</AlertTitle>
                        <AlertDescription>
                           Fungsi ini akan mengambil data absensi hari ini, membuat rekap, dan langsung mengirimkannya. Pastikan Anda hanya menekannya saat diperlukan untuk menghindari spam di grup.
                        </AlertDescription>
                    </Alert>
                    <Button onClick={handleTrigger} disabled={isTriggering || isDataLoading} className="w-full mt-6" size="lg">
                        {(isTriggering || isDataLoading) ? <Loader2 className="mr-2 animate-spin" /> : <Bot className="mr-2" />}
                        {(isTriggering) ? 'Mengirim...' : (isDataLoading ? 'Memuat Data...' : 'Kirim Rekap Hari Ini ke Telegram')}
                    </Button>
                </CardContent>
             </Card>
        </div>
    );
}
