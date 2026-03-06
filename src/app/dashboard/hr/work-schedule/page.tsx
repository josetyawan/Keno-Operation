
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { UserProfile, Schedule, Holiday } from '@/lib/types';
import {
  format,
  getDaysInMonth,
  startOfMonth,
  addMonths,
  subMonths,
  isWeekend,
} from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

const units = ['Provisioning', 'B2B', 'B2C', 'MTC', 'ALL'];

type DayStatusInfo = {
    status: string; // 'H', 'L', 'PDM', etc.
    isJaga: boolean; // Is it an on-duty shift on a holiday/weekend?
}

export default function WorkSchedulePage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedUnit, setSelectedUnit] = useState('ALL');

  // --- Data Fetching & Auth ---
  const { data: currentUserProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(
    useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore])
  );
  
  const usersQuery = useMemoFirebase(() => {
    if (!currentUserProfile) return null; // Wait for profile to load
    return query(collection(firestore, 'users'));
  }, [firestore, currentUserProfile]);
  
  const { data: allUsers, isLoading: areUsersLoading } = useCollection<UserProfile>(usersQuery);

  const schedulesQuery = useMemoFirebase(() => query(collection(firestore, 'schedules')), [firestore]);
  const { data: allSchedules, isLoading: areSchedulesLoading } = useCollection<Schedule>(schedulesQuery);
  
  const holidaysQuery = useMemoFirebase(() => query(collection(firestore, 'holidays')), [firestore]);
  const { data: allHolidays, isLoading: areHolidaysLoading } = useCollection<Holiday>(holidaysQuery);

  // --- Memoized Data Processing ---
  const filteredUsers = useMemo(() => {
    if (!allUsers) return []; // Wait for allUsers to load for everyone

    const activeUsers = allUsers.filter(u => u.registrationStatus === 'approved' && u.role === 'teknisi').sort((a,b) => (a.displayName || '').localeCompare(b.displayName || ''));
    
    if (selectedUnit === 'ALL') return activeUsers;
    
    return activeUsers.filter(u => u.unit?.trim().toUpperCase() === selectedUnit.toUpperCase());
  }, [allUsers, selectedUnit]);

  const schedulesMap = useMemo(() => {
    const map = new Map<string, string>(); // Key: 'userId-yyyy-MM-dd', Value: shiftType
    if (!allSchedules) return map;
    allSchedules.forEach(schedule => {
      const dateKey = format(schedule.date.toDate(), 'yyyy-MM-dd');
      map.set(`${schedule.userId}-${dateKey}`, schedule.shiftType);
    });
    return map;
  }, [allSchedules]);
  
  const holidaysMap = useMemo(() => {
    const map = new Map<string, boolean>(); // Key: 'yyyy-MM-dd', Value: true
    if (!allHolidays) return map;
    allHolidays.forEach(holiday => {
        const dateKey = format(holiday.date.toDate(), 'yyyy-MM-dd');
        map.set(dateKey, true);
    });
    return map;
  }, [allHolidays]);

  // --- Calendar Logic ---
  const monthStart = startOfMonth(currentDate);
  const daysInMonth = getDaysInMonth(currentDate);
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => new Date(monthStart.getFullYear(), monthStart.getMonth(), i + 1));

  const getDayStatus = (userId: string, day: Date): DayStatusInfo => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const shift = schedulesMap.get(`${userId}-${dateKey}`);

    const isDayWeekend = isWeekend(day);
    const isDayHoliday = holidaysMap.has(dateKey);
    const isOffDay = isDayWeekend || isDayHoliday;

    if (shift) {
        switch (shift) {
            case 'piket-demak': return { status: 'PDM', isJaga: false };
            case 'siang-malam': return { status: 'SM', isJaga: false };
            case 'malam': return { status: 'M', isJaga: false };
            case 'ijin': return { status: 'i', isJaga: false };
            case 'cuti': return { status: 'C', isJaga: false };
            case 'tukar-jaga': return { status: 'TJ', isJaga: false };
            case 'weekend-duty':
            case 'holiday-duty':
                // A shift is only 'jaga' (special on-duty) if it occurs on an actual off-day.
                return { status: 'H', isJaga: isOffDay };
        }
    }

    if (isOffDay) {
        return { status: 'L', isJaga: false };
    }
    
    return { status: 'H', isJaga: false };
  };

  const changeMonth = (amount: number) => {
    setCurrentDate(prev => amount > 0 ? addMonths(prev, 1) : subMonths(prev, 1));
  };
  
  const isLoading = isUserLoading || isProfileLoading || areUsersLoading || areSchedulesLoading || areHolidaysLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Jadwal Kerja</h1>
          <p className="text-muted-foreground">
            Tampilan kalender jadwal kerja bulanan untuk semua teknisi.
          </p>
        </div>
      </div>
      
      <Card>
        <CardHeader className="flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle>Filter & Navigasi</CardTitle>
            <CardDescription>
                Pilih unit dan bulan untuk menampilkan jadwal.
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Pilih Unit" /></SelectTrigger>
                <SelectContent>
                    {units.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => changeMonth(-1)}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="w-40 text-center font-semibold">{format(currentDate, 'MMMM yyyy', { locale: idLocale })}</span>
              <Button variant="outline" size="icon" onClick={() => changeMonth(1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto relative">
            <Table className="border-collapse border border-slate-400">
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-card z-20 w-[120px] border border-slate-300">NIK</TableHead>
                  <TableHead className="sticky left-[120px] bg-card z-20 w-[150px] border border-slate-300">No. Telepon</TableHead>
                  <TableHead className="sticky left-[270px] bg-card z-20 w-[200px] border border-slate-300">Nama</TableHead>
                  {daysArray.map(day => (
                    <TableHead key={day.toString()} className={cn("text-center p-2 border border-slate-300", (isWeekend(day) || holidaysMap.has(format(day, 'yyyy-MM-dd'))) && 'bg-red-100')}>
                      <div>{format(day, 'E', { locale: idLocale }).slice(0,2)}</div>
                      <div>{format(day, 'dd')}</div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell className="sticky left-0 bg-card z-10 border border-slate-300"><Skeleton className="h-5 w-full"/></TableCell>
                            <TableCell className="sticky left-[120px] bg-card z-10 border border-slate-300"><Skeleton className="h-5 w-full"/></TableCell>
                            <TableCell className="sticky left-[270px] bg-card z-10 border border-slate-300"><Skeleton className="h-5 w-full"/></TableCell>
                            {Array.from({ length: daysInMonth }).map((_, j) => (
                                <TableCell key={j} className="border border-slate-300"><Skeleton className="h-5 w-full"/></TableCell>
                            ))}
                        </TableRow>
                    ))
                ) : filteredUsers.length > 0 ? (
                    filteredUsers.map(user => (
                        <TableRow key={user.id}>
                        <TableCell className="sticky left-0 bg-card z-10 font-mono text-xs border border-slate-300">{user.nik || '-'}</TableCell>
                        <TableCell className="sticky left-[120px] bg-card z-10 font-mono text-xs border border-slate-300">{user.noHpTsel || '-'}</TableCell>
                        <TableCell className="sticky left-[270px] bg-card z-10 font-medium border border-slate-300">{user.displayName}</TableCell>
                        {daysArray.map(day => {
                            const dayInfo = getDayStatus(user.id, day);
                            return (
                            <TableCell key={day.toString()} className={cn("text-center font-bold p-1 border border-slate-300", {
                                'bg-red-500 text-white': dayInfo.status === 'L',
                                'bg-yellow-400 text-black': dayInfo.status === 'i',
                                'bg-blue-500 text-white': dayInfo.status === 'C',
                                'bg-green-200 text-black': ['PDM', 'SM', 'M'].includes(dayInfo.status),
                                'bg-orange-400 text-black': dayInfo.status === 'TJ',
                                'bg-purple-500 text-white': dayInfo.isJaga,
                            })}>
                                {dayInfo.status}
                            </TableCell>
                            )
                        })}
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={daysInMonth + 3} className="h-24 text-center">
                            Tidak ada teknisi yang ditemukan untuk unit ini.
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
           <div className="mt-4 flex flex-col gap-2 text-sm">
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                    <div className="flex items-center gap-2"><div className="w-4 h-4 bg-white border"></div><span>H: Masuk</span></div>
                    <div className="flex items-center gap-2"><div className="w-4 h-4 bg-purple-500 border"></div><span>H: Jaga</span></div>
                    <div className="flex items-center gap-2"><div className="w-4 h-4 bg-green-200 border"></div><span>PDM/SM/M: Piket</span></div>
                    <div className="flex items-center gap-2"><div className="w-4 h-4 bg-orange-400 border"></div><span>TJ: Tukar Jaga</span></div>
                    <div className="flex items-center gap-2"><div className="w-4 h-4 bg-red-500 border"></div><span>L: Libur</span></div>
                    <div className="flex items-center gap-2"><div className="w-4 h-4 bg-yellow-400 border"></div><span>i: Ijin</span></div>
                    <div className="flex items-center gap-2"><div className="w-4 h-4 bg-blue-500 border"></div><span>C: Cuti</span></div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground space-y-1">
                    <p>H: Masuk Pagi Biasa | L: Libur / Weekend / Hari Libur Nasional | TJ: Pengajuan Tukar Jaga | H (ungu): Jaga terjadwal di hari libur/weekend</p>
                    <p>PDM: Piket Demak | SM: Piket Siang-Malam (14:00-08:00) | M: Piket Malam (22:00-07:00)</p>
                </div>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
