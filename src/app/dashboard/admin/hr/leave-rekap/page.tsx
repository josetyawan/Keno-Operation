
'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { useRouter } from 'next/navigation';
import { collection, query, doc } from 'firebase/firestore';
import type { UserProfile, Schedule } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { format, getYear, getMonth, startOfMonth, endOfMonth } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function LeaveRekapPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const [selectedMonth, setSelectedMonth] = useState<string>(String(currentMonth));
    const [selectedYear, setSelectedYear] = useState<string>(String(currentYear));

    const { data: currentUserProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(
        useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore])
    );

    // --- Data Fetching ---
    const usersQuery = useMemoFirebase(() => query(collection(firestore, 'users')), [firestore]);
    const { data: allUsers, isLoading: areUsersLoading } = useCollection<UserProfile>(usersQuery);

    const schedulesQuery = useMemoFirebase(() => query(collection(firestore, 'schedules')), [firestore]);
    const { data: allSchedules, isLoading: areSchedulesLoading } = useCollection<Schedule>(schedulesQuery);
    
    // --- Memoized Data Processing ---
    const activeTeknisi = useMemo(() => {
        if (!allUsers) return [];
        return allUsers.filter(u => u.registrationStatus === 'approved' && u.role === 'teknisi').sort((a,b) => (a.displayName || '').localeCompare(b.displayName || ''));
    }, [allUsers]);

    const monthlyRekap = useMemo(() => {
        if (!allSchedules || activeTeknisi.length === 0) return [];
        
        const year = parseInt(selectedYear);
        const monthIndex = parseInt(selectedMonth);
        const startDate = startOfMonth(new Date(year, monthIndex));
        const endDate = endOfMonth(new Date(year, monthIndex));

        const schedulesInMonth = allSchedules.filter(s => {
            const scheduleDate = s.date.toDate();
            return scheduleDate >= startDate && scheduleDate <= endDate;
        });

        return activeTeknisi.map(teknisi => {
            const teknisiSchedules = schedulesInMonth.filter(s => s.userId === teknisi.id);
            const ijinCount = teknisiSchedules.filter(s => s.shiftType === 'ijin').length;
            const cutiCount = teknisiSchedules.filter(s => s.shiftType === 'cuti').length;
            
            return {
                userId: teknisi.id,
                userName: teknisi.displayName || teknisi.email,
                nik: teknisi.nik || '-',
                ijinCount,
                cutiCount,
            };
        });

    }, [allSchedules, activeTeknisi, selectedMonth, selectedYear]);

    const handleExport = () => {
        if (monthlyRekap.length === 0) {
            toast({ variant: 'destructive', title: 'Tidak ada data untuk diekspor' });
            return;
        }

        const dataToExport = monthlyRekap.map((item, index) => ({
            'No': index + 1,
            'Nama Teknisi': item.userName,
            'NIK': item.nik,
            'Jumlah Izin': item.ijinCount,
            'Jumlah Cuti': item.cutiCount,
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Izin Cuti');
        
        const monthName = format(new Date(parseInt(selectedYear), parseInt(selectedMonth)), 'MMMM-yyyy', { locale: idLocale });
        XLSX.writeFile(workbook, `Rekap_Izin_Cuti_${monthName}.xlsx`);

        toast({ title: 'Ekspor Berhasil', description: 'File Excel telah diunduh.' });
    };

    const isLoading = isUserLoading || isProfileLoading || areUsersLoading || areSchedulesLoading;

    if (isLoading && !currentUserProfile) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-96" />
                <Card><CardHeader><Skeleton className="h-24 w-full" /></CardHeader>
                    <CardContent><Skeleton className="h-40 w-full" /></CardContent>
                </Card>
            </div>
        );
    }
    
    // --- Year and Month options for Select ---
    const yearOptions = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i));
    const monthOptions = Array.from({ length: 12 }, (_, i) => ({
        value: String(i),
        label: format(new Date(2000, i), 'MMMM', { locale: idLocale }),
    }));

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Rekap Izin & Cuti Teknisi</h1>
                    <p className="text-muted-foreground">Hitung jumlah izin dan cuti per teknisi dalam satu bulan.</p>
                </div>
                 <Button onClick={handleExport} disabled={monthlyRekap.length === 0}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Download Excel
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Filter Periode</CardTitle>
                    <CardDescription>Pilih bulan dan tahun untuk melihat rekapitulasi.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4">
                        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Pilih Bulan..." /></SelectTrigger>
                            <SelectContent>{monthOptions.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={selectedYear} onValueChange={setSelectedYear}>
                            <SelectTrigger className="w-[120px]"><SelectValue placeholder="Pilih Tahun..." /></SelectTrigger>
                            <SelectContent>{yearOptions.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Tabel Rekapitulasi</CardTitle>
                    <CardDescription>
                        Menampilkan rekap untuk periode {format(new Date(parseInt(selectedYear), parseInt(selectedMonth)), 'MMMM yyyy', { locale: idLocale })}.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>No.</TableHead>
                                <TableHead>Nama Teknisi</TableHead>
                                <TableHead>NIK</TableHead>
                                <TableHead className="text-center">Jumlah Izin</TableHead>
                                <TableHead className="text-center">Jumlah Cuti</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({length: 5}).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-5 w-5" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                    </TableRow>
                                ))
                            ) : monthlyRekap && monthlyRekap.length > 0 ? (
                                monthlyRekap.map((item, index) => (
                                    <TableRow key={item.userId}>
                                        <TableCell>{index + 1}</TableCell>
                                        <TableCell className="font-medium">{item.userName}</TableCell>
                                        <TableCell className="text-muted-foreground">{item.nik}</TableCell>
                                        <TableCell className="text-center font-bold">{item.ijinCount}</TableCell>
                                        <TableCell className="text-center font-bold">{item.cutiCount}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        Tidak ada data jadwal yang ditemukan untuk periode ini.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

