
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, doc, orderBy, Timestamp, writeBatch } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, PlusCircle, Edit, Trash2, Calendar as CalendarIcon, Loader2, Download } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { format, isValid, getDaysInMonth } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { Schedule, UserProfile } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import * as XLSX from 'xlsx';


type ValidShiftType = 'piket-demak' | 'siang-malam' | 'malam' | 'ijin' | 'cuti' | 'weekend-duty' | 'holiday-duty' ;

function ScheduleForm({ schedule, users, onFormSubmit }: { schedule?: Schedule | null, users: UserProfile[], onFormSubmit: (data: Partial<Schedule>) => void }) {
    const [userId, setUserId] = useState('');
    const [date, setDate] = useState<Date | undefined>();
    const [shiftType, setShiftType] = useState<ValidShiftType>('piket-demak');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (schedule) {
            setUserId(schedule.userId);
            setDate(schedule.date.toDate());
            const validTypes: ValidShiftType[] = ['piket-demak', 'siang-malam', 'malam', 'ijin', 'cuti', 'weekend-duty', 'holiday-duty'];
            if (validTypes.includes(schedule.shiftType as any)) {
                setShiftType(schedule.shiftType as ValidShiftType);
            } else {
                setShiftType('piket-demak');
            }
            setNotes(schedule.notes || '');
        } else {
            setUserId('');
            setDate(undefined);
            setShiftType('piket-demak');
            setNotes('');
        }
    }, [schedule]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!date || !userId) return;
        const selectedUser = users.find(u => u.id === userId);
        if (!selectedUser) return;

        onFormSubmit({ 
            date: Timestamp.fromDate(date), 
            userId, 
            userEmail: selectedUser.email,
            shiftType,
            notes 
        });
    };

    return (
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
            <div className="grid gap-2">
                <Label htmlFor="user">Teknisi</Label>
                <Select value={userId} onValueChange={setUserId} required>
                    <SelectTrigger><SelectValue placeholder="Pilih teknisi..." /></SelectTrigger>
                    <SelectContent>
                        {users.map(u => <SelectItem key={u.id} value={u.id}>{u.displayName || u.email}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="grid gap-2">
                <Label htmlFor="date">Tanggal</Label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant={'outline'}
                            className={cn('w-full justify-start text-left font-normal', !date && 'text-muted-foreground')}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date ? format(date, 'dd MMMM yyyy') : <span>Pilih tanggal</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar 
                            mode="single" 
                            selected={date} 
                            onSelect={setDate} 
                            initialFocus 
                            captionLayout="dropdown-buttons"
                            fromYear={new Date().getFullYear() -1}
                            toYear={new Date().getFullYear() + 1}
                        />
                    </PopoverContent>
                </Popover>
            </div>
            <div className="grid gap-2">
                <Label htmlFor="shiftType">Jenis Jadwal/Status</Label>
                <Select value={shiftType} onValueChange={(value) => setShiftType(value as any)}>
                    <SelectTrigger><SelectValue placeholder="Pilih jenis" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="piket-demak">Piket Demak (PDM)</SelectItem>
                        <SelectItem value="siang-malam">Piket Siang-Malam (SM)</SelectItem>
                        <SelectItem value="malam">Piket Malam (M)</SelectItem>
                        <SelectItem value="weekend-duty">Jaga Akhir Pekan</SelectItem>
                        <SelectItem value="holiday-duty">Jaga Hari Libur</SelectItem>
                        <SelectItem value="ijin">Ijin (i)</SelectItem>
                        <SelectItem value="cuti">Cuti (C)</SelectItem>
                    </SelectContent>
                </Select>
            </div>
             <div className="grid gap-2">
                <Label htmlFor="notes">Catatan</Label>
                <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Catatan tambahan (opsional)..." />
            </div>
            <DialogFooter>
                <DialogClose asChild><Button type="button" variant="secondary">Batal</Button></DialogClose>
                <Button type="submit">Simpan Jadwal</Button>
            </DialogFooter>
        </form>
    );
}

export default function AdminSchedulesPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
    const [scheduleToEdit, setScheduleToEdit] = useState<Schedule | null>(null);
    const [scheduleToDelete, setScheduleToDelete] = useState<Schedule | null>(null);
    
    const [isImporting, setIsImporting] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth()));
    const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));

    const shiftTypeLabels: Record<string, string> = {
        'piket-demak': 'Piket Demak (PDM)',
        'siang-malam': 'Piket Siang-Malam (SM)',
        'malam': 'Piket Malam (M)',
        'ijin': 'Ijin (i)',
        'cuti': 'Cuti (C)',
        'weekend-duty': 'Jaga Akhir Pekan',
        'holiday-duty': 'Jaga Hari Libur',
        'H': 'Masuk',
        'L': 'Libur',
    };

    const { data: currentUserProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(
        useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore])
    );

    useEffect(() => {
        if (!isUserLoading && !isProfileLoading && (!user || (currentUserProfile?.role !== 'admin' && currentUserProfile?.role !== 'korlap'))) {
            router.push('/dashboard');
        }
    }, [user, currentUserProfile, isUserLoading, isProfileLoading, router]);

    const usersQuery = useMemoFirebase(() => {
        if (currentUserProfile?.role === 'admin' || currentUserProfile?.role === 'korlap') {
            return query(collection(firestore, 'users'), orderBy('displayName'));
        }
        return null;
    }, [firestore, currentUserProfile]);
    const { data: users, isLoading: areUsersLoading } = useCollection<UserProfile>(usersQuery);
    const activeUsers = useMemo(() => users?.filter(u => u.registrationStatus === 'approved') || [], [users]);


    const schedulesQuery = useMemoFirebase(() => {
        if (currentUserProfile?.role === 'admin' || currentUserProfile?.role === 'korlap') {
            return query(collection(firestore, 'schedules'), orderBy('date', 'desc'));
        }
        return null;
    }, [firestore, currentUserProfile]);
    const { data: schedules, isLoading: areSchedulesLoading } = useCollection<Schedule>(schedulesQuery);

    const handleCreate = () => {
        setScheduleToEdit(null);
        setIsFormDialogOpen(true);
    };

    const handleEdit = (schedule: Schedule) => {
        setScheduleToEdit(schedule);
        setIsFormDialogOpen(true);
    };

    const handleDelete = (schedule: Schedule) => {
        setScheduleToDelete(schedule);
    };

    const confirmDelete = () => {
        if (!scheduleToDelete || !firestore) return;
        deleteDocumentNonBlocking(doc(firestore, 'schedules', scheduleToDelete.id));
        toast({ title: 'Jadwal Dihapus' });
        setScheduleToDelete(null);
    };

    const handleFormSubmit = (data: Partial<Schedule>) => {
        if (!firestore) return;
        if (scheduleToEdit) {
            updateDocumentNonBlocking(doc(firestore, 'schedules', scheduleToEdit.id), data);
            toast({ title: 'Jadwal Diperbarui' });
        } else {
            addDocumentNonBlocking(collection(firestore, 'schedules'), { ...data, createdAt: Timestamp.now() });
            toast({ title: 'Jadwal Ditambahkan' });
        }
        setIsFormDialogOpen(false);
    };

    const handleExportTemplate = () => {
        const year = parseInt(selectedYear);
        const monthIndex = parseInt(selectedMonth);
        const daysInSelectedMonth = getDaysInMonth(new Date(year, monthIndex));
        
        const headers = ["NIK"];
        for(let i = 1; i <= daysInSelectedMonth; i++) {
            headers.push(String(i));
        }

        const dataToExport = activeUsers.map(user => {
            const row: Record<string, string> = {
                "NIK": user.nik || ''
            };
            return row;
        });

        const worksheet = XLSX.utils.json_to_sheet(dataToExport, { header: headers });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, `Jadwal ${format(new Date(year, monthIndex), 'MMMM yyyy')}`);

        // Auto-fit columns
        const colWidths = headers.map((header, i) => {
            const dataLength = Math.max(...dataToExport.map(row => row[header]?.length || 0), header.length);
            return { wch: i < 1 ? dataLength + 5 : 5 }; // Wider for NIK, narrow for dates
        });
        worksheet['!cols'] = colWidths;
        
        XLSX.writeFile(workbook, `Template_Jadwal_${selectedYear}-${String(monthIndex + 1).padStart(2, '0')}.xlsx`);

        toast({
            title: "Template Diunduh",
            description: "Silakan isi file Excel dan unggah kembali.",
        });
    };
    
    const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const fileInput = event.target as HTMLInputElement;

        if (!event.target.files || event.target.files.length === 0) {
          toast({ variant: "destructive", title: "Tidak ada file dipilih." });
          return;
        }

        if (!firestore || !activeUsers || activeUsers.length === 0) {
            toast({ variant: "destructive", title: "Data Pengguna Belum Siap", description: "Data pengguna sedang dimuat. Silakan tunggu beberapa saat dan coba lagi." });
            if (fileInput) fileInput.value = ''; // Reset file input
            return;
        }

        if (!selectedMonth || !selectedYear) {
            toast({ variant: "destructive", title: "Bulan & Tahun Diperlukan", description: "Silakan pilih bulan dan tahun jadwal sebelum mengunggah file." });
            if (fileInput) fileInput.value = '';
            return;
        }
    
        setIsImporting(true);
        setImportProgress(0);
        const file = event.target.files[0];
        const reader = new FileReader();
    
        reader.onload = async (e) => {
          try {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { raw: false });
    
            if (jsonData.length === 0) {
                throw new Error("Sheet Excel kosong.");
            }
            
            const findColumn = (keys: string[], aliases: string[]): string | undefined => {
                const lowerCaseAliases = aliases.map(a => a.toLowerCase().trim());
                for (const key of keys) {
                    if (lowerCaseAliases.includes(key.toLowerCase().trim())) {
                        return key;
                    }
                }
                return undefined;
            };
    
            const userMapByNik = new Map(activeUsers.filter(u => u.nik).map(u => [u.nik!.trim(), u]));
            const shiftCodeMap: Record<string, ValidShiftType> = {
                'smc': 'siang-malam', 's/mc': 'siang-malam', 'sm': 'siang-malam',
                'm': 'malam',
                'pt/bd': 'piket-demak', 'pdm': 'piket-demak', 'ptm': 'piket-demak', 'pu': 'piket-demak', 'pb': 'piket-demak',
                'i': 'ijin',
                'c': 'cuti',
            };
            
            let processedRows = 0;
            let createdCount = 0;
            let errorCount = 0;
            let skippedUsers = new Set<string>();
            const chunkSize = 200;
            let batch = writeBatch(firestore);

            const firstRow = jsonData[0];
            const firstRowKeys = Object.keys(firstRow);
            const dateColumns = firstRowKeys.filter(key => !isNaN(parseInt(key, 10)) && parseInt(key, 10) >= 1 && parseInt(key, 10) <= 31);
            const nikHeader = findColumn(firstRowKeys, ['nik', 'nomor induk karyawan', 'nomor induk']);

            if (!nikHeader) {
                throw new Error("Kolom NIK tidak ditemukan. Pastikan file Excel Anda memiliki kolom dengan nama 'NIK'.");
            }
    
            for (const row of jsonData) {
                const nik = row[nikHeader]?.toString().trim();
                if (!nik) {
                    continue;
                }
    
                const user = userMapByNik.get(nik);
                if (!user) {
                    errorCount++;
                    skippedUsers.add(nik);
                    continue;
                }

                for (const day of dateColumns) {
                    const shiftCode = row[day]?.toString().trim().toLowerCase();
                    const mappedShift = shiftCodeMap[shiftCode];

                    if (mappedShift) {
                        const date = new Date(parseInt(selectedYear), parseInt(selectedMonth), parseInt(day));
                        if (!isValid(date)) continue;

                        const scheduleId = `${user.id}_${format(date, 'yyyy-MM-dd')}`;
                        const scheduleDocRef = doc(firestore, "schedules", scheduleId);
        
                        const scheduleData: Omit<Schedule, 'id'> = {
                            userId: user.id,
                            userEmail: user.email,
                            date: Timestamp.fromDate(date),
                            shiftType: mappedShift,
                            notes: '',
                            createdAt: Timestamp.now(),
                        };
        
                        batch.set(scheduleDocRef, scheduleData, { merge: true });
                        createdCount++;

                         if (createdCount > 0 && createdCount % chunkSize === 0) {
                            await batch.commit();
                            batch = writeBatch(firestore);
                        }
                    }
                }
                
                processedRows++;
                setImportProgress((processedRows / jsonData.length) * 100);
            }
    
            if (createdCount > 0 && createdCount % chunkSize !== 0) {
              await batch.commit();
            }
            
            let description = `Impor berhasil! ${createdCount} data jadwal telah disimpan/diperbarui.`;
            if (errorCount > 0) {
                const skippedNikList = Array.from(skippedUsers).slice(0, 3).join(', ');
                description += ` ${errorCount} baris dilewati karena NIK tidak terdaftar atau belum disetujui (contoh NIK: ${skippedNikList}${skippedUsers.size > 3 ? '...' : ''}).`;
            }
    
            toast({
                title: "Impor Selesai",
                description: description,
                duration: 9000,
            });
    
          } catch (error: any) {
            toast({ variant: "destructive", title: "Impor Gagal", description: error.message });
          } finally {
            setIsImporting(false);
            if (fileInput) fileInput.value = '';
          }
        };
        reader.readAsBinaryString(file);
    };

    const isLoading = isUserLoading || isProfileLoading || areSchedulesLoading || areUsersLoading;

    if (isLoading && !schedules) {
        return (
            <div>
                <div className="flex items-center justify-between mb-8"><Skeleton className="h-8 w-64" /><Skeleton className="h-10 w-32" /></div>
                <Card><CardHeader><Skeleton className="h-7 w-48" /></CardHeader><CardContent><Skeleton className="h-24 w-full" /></CardContent></Card>
            </div>
        );
    }
    
    const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);
    const monthOptions = Array.from({ length: 12 }, (_, i) => ({ value: String(i), label: format(new Date(2000, i), 'MMMM', { locale: idLocale }) }));

    return (
        <>
            <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Manajemen Jadwal & Status</h1>
                    <p className="text-muted-foreground mt-1">Buat, edit, dan hapus jadwal jaga, ijin, atau cuti untuk teknisi.</p>
                </div>
                 <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={handleCreate} disabled={activeUsers.length === 0}>
                            <PlusCircle className="mr-2 h-4 w-4" />Buat Jadwal Manual
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{scheduleToEdit ? 'Edit' : 'Buat'} Jadwal atau Status</DialogTitle>
                        </DialogHeader>
                        <ScheduleForm schedule={scheduleToEdit} users={activeUsers} onFormSubmit={handleFormSubmit} />
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" /> Impor Jadwal Massal</CardTitle>
                    <CardDescription>Unduh template, isi, lalu unggah untuk membuat jadwal secara massal.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label className="font-semibold">1. Pilih Periode Jadwal</Label>
                        <div className="grid grid-cols-2 gap-4 max-w-sm">
                            <Select value={selectedMonth} onValueChange={setSelectedMonth} disabled={areUsersLoading}>
                                <SelectTrigger id="import-month"><SelectValue placeholder="Pilih Bulan..." /></SelectTrigger>
                                <SelectContent>
                                    {monthOptions.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Select value={selectedYear} onValueChange={setSelectedYear} disabled={areUsersLoading}>
                                <SelectTrigger id="import-year"><SelectValue placeholder="Pilih Tahun..." /></SelectTrigger>
                                <SelectContent>
                                    {yearOptions.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label className="font-semibold">2. Unduh dan Isi Template</Label>
                        <Button onClick={handleExportTemplate} variant="secondary" className="w-full max-w-sm" disabled={areUsersLoading || !selectedMonth || !selectedYear}>
                            <Download className="mr-2 h-4 w-4" /> Download Template
                        </Button>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="excel-file-schedules" className="font-semibold">3. Unggah File yang Sudah Diisi</Label>
                        <Input id="excel-file-schedules" type="file" accept=".xlsx, .xls, .csv" onChange={handleFileImport} disabled={areUsersLoading || isImporting || !selectedMonth || !selectedYear} className="max-w-sm" />
                        {isImporting && (
                            <div className="flex flex-col gap-2 text-sm text-muted-foreground max-w-sm">
                                <p>Mengimpor {importProgress.toFixed(0)}%...</p>
                                <Progress value={importProgress} className="w-full" />
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Daftar Jadwal</CardTitle><CardDescription>Semua jadwal & status yang telah dibuat.</CardDescription></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Teknisi</TableHead>
                                <TableHead>Tanggal</TableHead>
                                <TableHead>Jenis</TableHead>
                                <TableHead>Catatan</TableHead>
                                <TableHead className="text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {schedules && schedules.length > 0 ? (
                                schedules.map(schedule => (
                                    <TableRow key={schedule.id}>
                                        <TableCell className="font-medium">{schedule.userEmail}</TableCell>
                                        <TableCell>{format(schedule.date.toDate(), 'eeee, dd MMMM yyyy', { locale: idLocale })}</TableCell>
                                        <TableCell>{shiftTypeLabels[schedule.shiftType] ?? schedule.shiftType}</TableCell>
                                        <TableCell>{schedule.notes || '-'}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(schedule)}><Edit className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(schedule)}><Trash2 className="h-4 w-4" /></Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={5} className="h-24 text-center">Belum ada jadwal yang dibuat.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <AlertDialog open={!!scheduleToDelete} onOpenChange={(open) => !open && setScheduleToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Anda yakin?</AlertDialogTitle><AlertDialogDescription>Tindakan ini akan menghapus jadwal untuk {scheduleToDelete?.userEmail} pada {scheduleToDelete?.date ? format(scheduleToDelete.date.toDate(), 'dd MMM yyyy', {locale: idLocale}) : ''}.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Hapus</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

    
