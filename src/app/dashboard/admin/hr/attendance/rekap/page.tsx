'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, Timestamp, doc, orderBy, writeBatch, getDocs, startOfMonth, endOfMonth, getDaysInMonth, isWeekend } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { format, isValid } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import Image from 'next/image';
import type { UserProfile, Attendance, Schedule, Holiday } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { Calendar as CalendarIcon, Download, MapPin, Trash2, Loader2, FileSpreadsheet } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


export default function AttendanceRekapPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    // State for photo rekap
    const [selectedDate, setSelectedDate] = useState<Date | undefined>();
    const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false);
    const [isDeletingAll, setIsDeletingAll] = useState(false);

    // State for Excel export
    const [exportMonth, setExportMonth] = useState<string>(String(new Date().getMonth()));
    const [exportYear, setExportYear] = useState<string>(String(new Date().getFullYear()));
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        setSelectedDate(new Date());
    }, []);

    const { data: currentUserProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(
        useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore])
    );

    useEffect(() => {
        if (!isUserLoading && !isProfileLoading) {
            if (!user || (currentUserProfile?.role !== 'admin' && currentUserProfile?.role !== 'korlap')) {
                router.push('/dashboard');
            }
        }
    }, [user, currentUserProfile, isUserLoading, isProfileLoading, router]);
    
    // --- Queries for Photo Rekap ---
    const attendancesQuery = useMemoFirebase(() => {
        if (!selectedDate) return null;
        const start = new Date(selectedDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(selectedDate);
        end.setHours(23, 59, 59, 999);

        return query(
            collection(firestore, 'attendances'),
            where('checkInTime', '>=', Timestamp.fromDate(start)),
            where('checkInTime', '<=', Timestamp.fromDate(end)),
            orderBy('checkInTime', 'asc')
        );
    }, [firestore, selectedDate]);

    const { data: attendances, isLoading: areAttendancesLoading } = useCollection<Attendance>(attendancesQuery);
    
    // --- Queries for Excel Export ---
    const exportDateRange = useMemo(() => {
        if (!exportMonth || !exportYear) return null;
        const year = parseInt(exportYear);
        const month = parseInt(exportMonth);
        const startDate = startOfMonth(new Date(year, month));
        const endDate = endOfMonth(startDate);
        return { startDate, endDate };
    }, [exportMonth, exportYear]);

    const allUsersQuery = useMemoFirebase(() => query(collection(firestore, 'users'), where('registrationStatus', '==', 'approved')), [firestore]);
    const { data: allUsers, isLoading: areUsersLoading } = useCollection<UserProfile>(allUsersQuery);

    const schedulesForMonthQuery = useMemoFirebase(() => {
        if (!exportDateRange) return null;
        return query(
            collection(firestore, 'schedules'),
            where('date', '>=', Timestamp.fromDate(exportDateRange.startDate)),
            where('date', '<=', Timestamp.fromDate(exportDateRange.endDate))
        );
    }, [firestore, exportDateRange]);
    const { data: schedulesInMonth, isLoading: areSchedulesLoading } = useCollection<Schedule>(schedulesForMonthQuery);
    
    const attendancesForMonthQuery = useMemoFirebase(() => {
        if (!exportDateRange) return null;
        return query(
            collection(firestore, 'attendances'),
            where('checkInTime', '>=', Timestamp.fromDate(exportDateRange.startDate)),
            where('checkInTime', '<=', Timestamp.fromDate(exportDateRange.endDate))
        );
    }, [firestore, exportDateRange]);
    const { data: attendancesInMonth, isLoading: areAttendancesInMonthLoading } = useCollection<Attendance>(attendancesForMonthQuery);

    const holidaysQuery = useMemoFirebase(() => query(collection(firestore, 'holidays')), [firestore]);
    const { data: allHolidays, isLoading: areHolidaysLoading } = useCollection<Holiday>(holidaysQuery);


    const userMap = useMemo(() => {
        if (!allUsers) return new Map();
        return new Map(allUsers.map(u => [u.id, u.displayName || u.email]));
    }, [allUsers]);
    
    const handleDownloadJpg = async () => {
        const recordsToDownload = attendances?.filter(att => att.checkInPhotoUrl);
        if (!recordsToDownload || recordsToDownload.length === 0) {
            toast({
                variant: 'destructive',
                title: 'Tidak ada gambar',
                description: 'Tidak ada foto absensi untuk diunduh pada tanggal yang dipilih.',
            });
            return;
        }

        toast({
            title: 'Mempersiapkan unduhan...',
            description: `Memuat ${recordsToDownload.length} gambar untuk membuat kolase. Ini mungkin butuh waktu.`,
        });

        try {
            const { toJpeg } = await import('html-to-image');
            const printableArea = document.getElementById('printable-area');
            if (!printableArea) {
                throw new Error('Gagal menemukan area untuk diunduh.');
            }
            
            const images = Array.from(printableArea.getElementsByTagName('img'));
            const imageLoadPromises = images.map(img => {
                if (img.complete && img.naturalHeight !== 0) {
                    return Promise.resolve();
                }
                return new Promise<void>((resolve) => {
                    img.onload = () => resolve();
                    img.onerror = () => {
                        console.warn(`Could not load image for download: ${img.src}`);
                        resolve(); 
                    };
                });
            });

            await Promise.all(imageLoadPromises);

            toast({
                title: 'Membuat kolase...',
                description: 'Semua gambar telah dimuat, proses pembuatan file JPG dimulai.',
            });

            const dataUrl = await toJpeg(printableArea, {
                quality: 0.95,
                backgroundColor: '#ffffff',
                pixelRatio: 2,
                cacheBust: true,
            });

            const link = document.createElement('a');
            const dateString = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : 'rekap';
            link.download = `rekap-absensi-${dateString}.jpg`;
            link.href = dataUrl;
            link.click();
            link.remove();
        } catch (error) {
            console.error('Gagal membuat gambar:', error);
            toast({
                variant: 'destructive',
                title: 'Gagal Mengunduh',
                description: 'Terjadi kesalahan saat membuat file JPG.',
            });
        }
    };


    const handleDeleteAll = async () => {
        if (!attendances || attendances.length === 0) {
            toast({ variant: "destructive", title: "Tidak ada data untuk dihapus" });
            return;
        }
        setIsDeletingAll(true);
        try {
            const batch = writeBatch(firestore);
            attendances.forEach(att => {
                const docRef = doc(firestore, 'attendances', att.id);
                batch.delete(docRef);
            });
            await batch.commit();
            toast({
                title: "Semua Absensi Dihapus",
                description: `${attendances.length} data absensi untuk tanggal ini telah berhasil dihapus.`,
            });
            setIsDeleteAllDialogOpen(false);
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Gagal Menghapus",
                description: error.message,
            });
        } finally {
            setIsDeletingAll(false);
        }
    };

    const handleExport = async () => {
        setIsExporting(true);

        const teknisi = allUsers?.filter(u => u.role === 'teknisi') || [];
        if (teknisi.length === 0) {
            toast({ variant: 'destructive', title: 'Tidak ada data teknisi untuk diekspor.' });
            setIsExporting(false);
            return;
        }
        
        try {
            const XLSX = await import('xlsx');
            
            const year = parseInt(exportYear);
            const month = parseInt(exportMonth);
            const daysInMonth = getDaysInMonth(new Date(year, month));

            const holidaysMap = new Map(allHolidays?.map(h => [format(h.date.toDate(), 'yyyy-MM-dd'), true]));
            const schedulesMap = new Map(schedulesInMonth?.map(s => [`${s.userId}-${format(s.date.toDate(), 'yyyy-MM-dd')}`, s]));
            const attendancesMap = new Map(attendancesInMonth?.map(a => [`${a.userId}-${format(a.checkInTime.toDate(), 'yyyy-MM-dd')}`, a]));
            
            const workingShiftTypes = ['h', 'pu', 'pb', 'ptm', 'pt/bd', 'piket-demak', 'siang-malam', 'malam', 'weekend-duty', 'holiday-duty'];

            const dataToExport = teknisi.map((tek, index) => {
                const counts = { Hadir: 0, Terlambat: 0, Izin: 0, Cuti: 0, Mangkir: 0, Libur: 0 };
                
                for (let day = 1; day <= daysInMonth; day++) {
                    const currentDate = new Date(year, month, day);
                    const dateKey = format(currentDate, 'yyyy-MM-dd');
                    const mapKey = `${tek.id}-${dateKey}`;

                    const attendance = attendancesMap.get(mapKey);
                    const schedule = schedulesMap.get(mapKey);

                    if (attendance) {
                        if (attendance.status === 'present') counts.Hadir++;
                        else counts.Terlambat++; // Includes 'late' and 'remote-progress'
                    } else if (schedule) {
                        if (schedule.shiftType === 'ijin') counts.Izin++;
                        else if (schedule.shiftType === 'cuti') counts.Cuti++;
                        else if (['l', 'libur-dijadwalkan', 'tukar-jaga'].includes(schedule.shiftType)) counts.Libur++;
                        else if (workingShiftTypes.includes(schedule.shiftType)) counts.Mangkir++;
                    } else {
                        if (isWeekend(currentDate) || holidaysMap.has(dateKey)) {
                            counts.Libur++;
                        } else {
                            counts.Mangkir++;
                        }
                    }
                }

                return {
                    'No': index + 1,
                    'Nama Teknisi': tek.displayName || tek.email,
                    'NIK': tek.nik || '-',
                    'Hadir': counts.Hadir,
                    'Terlambat': counts.Terlambat,
                    'Izin': counts.Izin,
                    'Cuti': counts.Cuti,
                    'Mangkir': counts.Mangkir,
                    'Libur': counts.Libur,
                };
            });

            const worksheet = XLSX.utils.json_to_sheet(dataToExport);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Absensi');

            const monthLabel = format(new Date(year, month), 'MMMM-yyyy', { locale: idLocale });
            XLSX.writeFile(workbook, `Rekap_Absensi_${monthLabel}.xlsx`);

            toast({ title: 'Ekspor Berhasil', description: 'File Excel telah diunduh.' });
        } catch (error) {
            console.error('Export error:', error);
            toast({ variant: 'destructive', title: 'Gagal Mengekspor', description: 'Terjadi kesalahan saat membuat file.' });
        } finally {
            setIsExporting(false);
        }
    };
    
    const pageIsLoading = isUserLoading || isProfileLoading || areAttendancesLoading || areUsersLoading;
    const exportIsLoading = areUsersLoading || areSchedulesLoading || areAttendancesInMonthLoading || areHolidaysLoading;

    const monthOptions = useMemo(() => Array.from({ length: 12 }, (_, i) => ({
        value: String(i),
        label: format(new Date(2000, i), 'MMMM', { locale: idLocale }),
    })), []);
    const yearOptions = useMemo(() => Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i)), []);

    return (
        <div id="rekap-page" className="space-y-6">
            <style>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #printable-area, #printable-area * {
                        visibility: visible;
                    }
                    #printable-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                    .no-print {
                        display: none;
                    }
                }
            `}</style>
            
            <div className="flex items-center justify-between no-print">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Rekap Absensi</h1>
                    <p className="text-muted-foreground">Lihat foto absensi teknisi berdasarkan tanggal dan unduh rekap bulanan.</p>
                </div>
            </div>

            <Card className="no-print">
                <CardHeader>
                    <CardTitle>Export Rekap Absensi Bulanan</CardTitle>
                    <CardDescription>Pilih bulan dan tahun untuk mengunduh rekap absensi lengkap dalam format Excel.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-end gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="export-month">Bulan</Label>
                        <Select value={exportMonth} onValueChange={setExportMonth}>
                            <SelectTrigger id="export-month" className="w-[180px]"><SelectValue /></SelectTrigger>
                            <SelectContent>{monthOptions.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="export-year">Tahun</Label>
                        <Select value={exportYear} onValueChange={setExportYear}>
                            <SelectTrigger id="export-year" className="w-[120px]"><SelectValue /></SelectTrigger>
                            <SelectContent>{yearOptions.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <Button onClick={handleExport} disabled={isExporting || exportIsLoading}>
                        {isExporting || exportIsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
                        {exportIsLoading ? 'Memuat Data...' : 'Download Excel'}
                    </Button>
                </CardContent>
            </Card>
            
             <Card className="no-print">
                <CardHeader>
                    <CardTitle>Rekap Foto Harian</CardTitle>
                </CardHeader>
                <CardContent>
                     <Popover>
                        <PopoverTrigger asChild>
                            <Button variant={'outline'} className={cn('w-[280px] justify-start text-left font-normal', !selectedDate && 'text-muted-foreground')}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {selectedDate ? format(selectedDate, 'PPP', {locale: idLocale}) : <span>Pilih tanggal</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus />
                        </PopoverContent>
                    </Popover>
                </CardContent>
            </Card>

            <div id="printable-area" className="bg-white p-4">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold">Laporan Absensi - {selectedDate ? format(selectedDate, 'dd MMMM yyyy', {locale: idLocale}) : ''}</h2>
                    <div className="flex gap-2 no-print">
                        <Button onClick={handleDownloadJpg} disabled={!attendances || attendances.length === 0}><Download className="mr-2 h-4 w-4" /> Download JPG</Button>
                        {(currentUserProfile?.role === 'admin' || currentUserProfile?.role === 'korlap') && (
                            <AlertDialog open={isDeleteAllDialogOpen} onOpenChange={setIsDeleteAllDialogOpen}>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" disabled={!attendances || attendances.length === 0 || isDeletingAll}><Trash2 className="mr-2 h-4 w-4" /> Hapus Semua</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Anda Yakin?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Tindakan ini akan menghapus semua <strong>({attendances?.length || 0})</strong> data absensi untuk tanggal <strong>{selectedDate ? format(selectedDate, 'dd MMM yyyy') : ''}</strong> secara permanen. Tindakan ini tidak dapat dibatalkan.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Batal</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDeleteAll} disabled={isDeletingAll} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                            {isDeletingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Ya, Hapus Semua'}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                    </div>
                </div>

                {pageIsLoading ? (
                     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {Array.from({length: 8}).map((_, i) => (
                           <Skeleton key={i} className="aspect-square w-full" />
                        ))}
                    </div>
                ) : attendances && attendances.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {attendances.map(att => (
                            <Card key={att.id} className="overflow-hidden break-inside-avoid group relative">
                                <div className="relative aspect-square w-full">
                                    <Image 
                                      src={att.checkInPhotoUrl} 
                                      alt={`Foto absen ${userMap.get(att.userId)}`} 
                                      fill 
                                      className="object-cover" 
                                      unoptimized
                                      crossOrigin="anonymous"
                                    />
                                </div>
                                <CardContent className="p-3 text-sm">
                                    <p className="font-semibold truncate">{userMap.get(att.userId) || 'Memuat...'}</p>
                                    <p className="text-muted-foreground">{att.checkInTime?.toDate ? format(att.checkInTime.toDate(), 'HH:mm:ss', {locale: idLocale}) : '...'}</p>
                                    <Link href={`https://www.google.com/maps/search/?api=1&query=${att.checkInCoordinates}`} target="_blank" rel="noopener noreferrer">
                                        <div className="text-blue-600 hover:underline flex items-center gap-1 mt-1">
                                            <MapPin className="h-3 w-3"/>
                                            <span>Lihat Lokasi</span>
                                        </div>
                                    </Link>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <p className="text-muted-foreground">Tidak ada data absensi untuk tanggal yang dipilih.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
    