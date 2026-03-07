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

    const shiftPriority: Record<string, number> = {
        'ijin': 1,
        'cuti': 1,
        'tukar-jaga': 2,
        'h': 3,
        'pu': 3,
        'pb': 3,
        'ptm': 3,
        'pt/bd': 3,
        'weekend-duty': 4,
        'holiday-duty': 4,
        'piket-demak': 5,
        'siang-malam': 5,
        'malam': 5,
        'libur-dijadwalkan': 6,
        'l': 6
    };

    allSchedules.forEach(schedule => {
      const dateKey = format(schedule.date.toDate(), 'yyyy-MM-dd');
      const mapKey = `${schedule.userId}-${dateKey}`;
      const newShift = schedule.shiftType;
      const existingShift = map.get(mapKey);

      if (existingShift) {
        const newPriority = shiftPriority[newShift.toLowerCase()] || 99;
        const existingPriority = shiftPriority[existingShift.toLowerCase()] || 99;
        // If the new shift has a higher priority (lower number), replace the existing one.
        if (newPriority < existingPriority) {
          map.set(mapKey, newShift);
        }
      } else {
        // If no entry exists, just add the new one.
        map.set(mapKey, newShift);
      }
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

  const getDayStatus = (user: UserProfile, day: Date): DayStatusInfo => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const shift = schedulesMap.get(`${user.id}-${dateKey}`);

    const isDayWeekend = isWeekend(day);
    const isDayHoliday = holidaysMap.has(dateKey);
    const isOffDay = isDayWeekend || isDayHoliday;

    const shiftMapping: Record<string, string> = {
        'h': 'H', 'pu': 'PU', 'pb': 'PB', 'ptm': 'PTM', 'pt/bd': 'PT/BD',
        'piket-demak': 'PDM', 'siang-malam': 'S/MC', 'malam': 'M',
        'weekend-duty': 'H', 'holiday-duty': 'H',
        'ijin': 'i', 'cuti': 'C',
        'tukar-jaga': 'TJ', 'libur-dijadwalkan': 'L', 'l': 'L'
    };

    if (shift) {
        const lowerShift = shift.toLowerCase();
        const displayStatus = shiftMapping[lowerShift] || shift.toUpperCase();
        
        // A "jaga" shift is only colored purple if it's on an actual off day.
        const isJagaShift = (lowerShift === 'weekend-duty' || lowerShift === 'holiday-duty') && isOffDay;

        return { status: displayStatus, isJaga: isJagaShift };
    }

    // If no specific schedule, determine if it's a workday or off day.
    if (isOffDay) {
        return { status: 'L', isJaga: false };
    }

    // Default for a workday with no schedule is 'H'.
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
                            const dayInfo = getDayStatus(user, day);
                            return (
                            <TableCell key={day.toString()} className={cn("text-center font-bold p-1 border border-slate-300", {
                                'bg-red-500 text-white': dayInfo.status === 'L',
                                'bg-yellow-400 text-black': dayInfo.status === 'i',
                                'bg-blue-500 text-white': dayInfo.status === 'C',
                                'bg-green-200 text-black': ['PDM', 'S/MC', 'M'].includes(dayInfo.status),
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
                    <div className="flex items-center gap-2"><div className="w-4 h-4 bg-white border"></div><span>Hadir (H, PU, PB, dll)</span></div>
                    <div className="flex items-center gap-2"><div className="w-4 h-4 bg-purple-500 border"></div><span>H (Jaga Libur)</span></div>
                    <div className="flex items-center gap-2"><div className="w-4 h-4 bg-green-200 border"></div><span>Piket (PDM, S/MC, M)</span></div>
                    <div className="flex items-center gap-2"><div className="w-4 h-4 bg-orange-400 border"></div><span>TJ (Tukar Jaga)</span></div>
                    <div className="flex items-center gap-2"><div className="w-4 h-4 bg-red-500 border"></div><span>L (Libur)</span></div>
                    <div className="flex items-center gap-2"><div className="w-4 h-4 bg-yellow-400 border"></div><span>i (Izin)</span></div>
                    <div className="flex items-center gap-2"><div className="w-4 h-4 bg-blue-500 border"></div><span>C (Cuti)</span></div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground space-y-1">
                    <p>S/MC: Siang/Malam on Call | PDM: Piket Demak | M: Piket Malam</p>
                    <p>PU: Area Utara | PB: Area Barat | PTM: Area Timur | PT/BD: Area Demak FAC, FN, FM</p>
                </div>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
