

'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc, orderBy, Timestamp, writeBatch, setDoc, getDocs, limit, updateDoc, deleteDoc, type DocumentReference } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, PlusCircle, Edit, Trash2, Calendar as CalendarIcon, Loader2, Download, ChevronLeft, ChevronRight, Check, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { format, isValid, getDaysInMonth } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { Schedule, UserProfile } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { sendSwapApprovalNotice } from '@/ai/flows/send-swap-approval-notice';

const safeToDate = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (timestamp.toDate) return timestamp.toDate();
    if (timestamp instanceof Date && isValid(timestamp)) return timestamp;
    const d = new Date(timestamp);
    return isValid(d) ? d : null;
};

type ValidShiftType = 'piket-demak' | 'siang-malam' | 'malam' | 'ijin' | 'cuti' | 'weekend-duty' | 'holiday-duty' | 'tukar-jaga' | 'libur-dijadwalkan' | 'h' | 'pu' | 'pb' | 'ptm' | 'pt/bd' | 'l';

function ScheduleForm({ schedule, users, onFormSubmit }: { schedule?: Partial<Schedule> | null, users: UserProfile[], onFormSubmit: (data: Partial<Schedule>) => void }) {
    const [userId, setUserId] = useState('');
    const [date, setDate] = useState<Date | undefined>();
    const [shiftType, setShiftType] = useState<ValidShiftType>('h');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (schedule) {
            setUserId(schedule.userId || '');
            const newDate = schedule.date ? safeToDate(schedule.date) : undefined;
            setDate(newDate === null ? undefined : newDate);
            const validTypes: ValidShiftType[] = ['piket-demak', 'siang-malam', 'malam', 'ijin', 'cuti', 'weekend-duty', 'holiday-duty', 'tukar-jaga', 'libur-dijadwalkan', 'h', 'pu', 'pb', 'ptm', 'pt/bd', 'l'];
            if (schedule.shiftType && validTypes.includes(schedule.shiftType as any)) {
                setShiftType(schedule.shiftType as ValidShiftType);
            } else {
                setShiftType('h');
            }
            setNotes(schedule.notes || '');
        } else {
            setUserId('');
            setDate(undefined);
            setShiftType('h');
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
                            captionLayout="dropdown"
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
                        <SelectItem value="h">Hadir (H)</SelectItem>
                        <SelectItem value="pu">Hadir - Area Utara (PU)</SelectItem>
                        <SelectItem value="pb">Hadir - Area Barat (PB)</SelectItem>
                        <SelectItem value="ptm">Hadir - Area Timur (PTM)</SelectItem>
                        <SelectItem value="pt/bd">Hadir - Demak FAC, FN, FM (PT/BD)</SelectItem>
                        <SelectItem value="piket-demak">Piket Demak (PDM)</SelectItem>
                        <SelectItem value="siang-malam">Piket Siang-Malam (S/MC)</SelectItem>
                        <SelectItem value="malam">Piket Malam (M)</SelectItem>
                        <SelectItem value="weekend-duty">Jaga Akhir Pekan</SelectItem>
                        <SelectItem value="holiday-duty">Jaga Hari Libur</SelectItem>
                        <SelectItem value="ijin">Ijin (i)</SelectItem>
                        <SelectItem value="cuti">Cuti (C)</SelectItem>
                        <SelectItem value="tukar-jaga">Request Tukar Jaga</SelectItem>
                        <SelectItem value="libur-dijadwalkan">Libur (L)</SelectItem>
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
    const [scheduleToEdit, setScheduleToEdit] = useState<Partial<Schedule> | null>(null);
    const [scheduleToDelete, setScheduleToDelete] = useState<Schedule | null>(null);
    
    const [scheduleToApprove, setScheduleToApprove] = useState<Schedule | null>(null);
    const [swapSourceSchedule, setSwapSourceSchedule] = useState<Schedule | null>(null);
    const [scheduleToReject, setScheduleToReject] = useState<Schedule | null>(null);
    const [isActionLoading, setIsActionLoading] = useState(false);

    const [isImporting, setIsImporting] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth()));
    const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));

    const [isDeletingAll, setIsDeletingAll] = useState(false);
    const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 5;

    const shiftTypeLabels: Record<string, string> = {
        'piket-demak': 'Piket Demak (PDM)',
        'siang-malam': 'Piket Siang-Malam (S/MC)',
        'malam': 'Piket Malam (M)',
        'ijin': 'Ijin (i)',
        'cuti': 'Cuti (C)',
        'weekend-duty': 'Jaga Akhir Pekan',
        'holiday-duty': 'Jaga Hari Libur',
        'tukar-jaga': 'Request Tukar Jaga',
        'libur-dijadwalkan': 'Libur (L)',
        'h': 'Hadir (H)',
        'pu': 'Hadir - Area Utara (PU)',
        'pb': 'Hadir - Area Barat (PB)',
        'ptm': 'Hadir - Area Timur (PTM)',
        'pt/bd': 'Hadir - Demak (PT/BD)',
        'l': 'Libur (L)',
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
            return query(collection(firestore, 'schedules'));
        }
        return null;
    }, [firestore, currentUserProfile]);
    const { data: schedules, isLoading: areSchedulesLoading } = useCollection<Schedule>(schedulesQuery);

    const userMap = useMemo(() => {
        if (!users) return new Map<string, string>();
        return new Map(users.map(u => [u.id, u.displayName || u.email]));
    }, [users]);
    
    const filteredAndSortedSchedules = useMemo(() => {
        if (!schedules) return [];

        const filtered = searchQuery
            ? schedules.filter(s => {
                const userName = userMap.get(s.userId) || s.userEmail;
                return userName.toLowerCase().includes(searchQuery.toLowerCase());
            })
            : schedules;

        return [...filtered].sort((a, b) => {
            const isARequest = a.shiftType === 'tukar-jaga';
            const isBRequest = b.shiftType === 'tukar-jaga';

            // Prioritize requests
            if (isARequest && !isBRequest) return -1;
            if (!isARequest && isBRequest) return 1;

            // For items of the same priority (both requests or both not), sort by date descending
            const dateA = safeToDate(a.date)?.getTime() ?? 0;
            const dateB = safeToDate(b.date)?.getTime() ?? 0;
            if (dateB !== dateA) {
                return dateB - dateA;
            }

            // If dates are the same, sort by user name
            const nameA = userMap.get(a.userId) || a.userEmail;
            const nameB = userMap.get(b.userId) || b.userEmail;
            return nameA.localeCompare(nameB);
        });
    }, [schedules, userMap, searchQuery]);

    const totalPages = Math.ceil(filteredAndSortedSchedules.length / ITEMS_PER_PAGE);

    const paginatedSchedules = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        return filteredAndSortedSchedules.slice(startIndex, endIndex);
    }, [filteredAndSortedSchedules, currentPage]);
    
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);


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

    const confirmDelete = async () => {
        if (!scheduleToDelete || !firestore) return;
        await deleteDoc(doc(firestore, 'schedules', scheduleToDelete.id));
        toast({ title: 'Jadwal Dihapus' });
        setScheduleToDelete(null);
    };
    
    const handleApprove = () => {
        if (!scheduleToApprove) return;

        // Directly set state to open the form dialog, pre-filling what we can.
        // Let the admin choose the user from the dropdown in the form.
        setScheduleToEdit({
            userId: '', // Clear this so the admin has to select
            userEmail: '',
            date: scheduleToApprove.date,
            shiftType: 'piket-demak', // A sensible default for a replacement shift
            notes: `Menggantikan ${userMap.get(scheduleToApprove.userId) || scheduleToApprove.userEmail}. Alasan: ${scheduleToApprove.notes || 'Tidak ada'}`,
        });

        // Keep track of the original request so we can delete it after the form is submitted.
        setSwapSourceSchedule(scheduleToApprove);
        
        // Open the form dialog.
        setIsFormDialogOpen(true);
        
        // Close the confirmation alert dialog.
        setScheduleToApprove(null);
    };

    const handleReject = async () => {
        if (!scheduleToReject || !firestore) return;
        setIsActionLoading(true);
        const scheduleDocRef = doc(firestore, 'schedules', scheduleToReject.id);
        try {
            await deleteDoc(scheduleDocRef);
            toast({ 
                title: 'Request Ditolak & Dihapus',
                description: `Jadwal tukar jaga untuk ${userMap.get(scheduleToReject.userId)} telah dihapus. Teknisi tersebut kini tidak memiliki jadwal pada hari itu.`,
                duration: 9000,
            });
        } catch (e) {
             toast({ variant: 'destructive', title: 'Gagal Menolak' });
        }
        setIsActionLoading(false);
        setScheduleToReject(null);
    };

    const confirmDeleteAll = async () => {
        if (!firestore) return;
        setIsDeletingAll(true);
        toast({ title: "Menghapus Semua Jadwal...", description: "Ini mungkin butuh beberapa saat." });

        try {
            const schedulesCollection = collection(firestore, 'schedules');
            const batchSize = 400; // Firestore write batch limit is 500
            let schedulesDeleted = 0;

            // eslint-disable-next-line no-constant-condition
            while (true) {
                const q = query(schedulesCollection, limit(batchSize));
                const querySnapshot = await getDocs(q);

                if (querySnapshot.size === 0) {
                    break; // No more documents to delete
                }

                const batch = writeBatch(firestore);
                querySnapshot.docs.forEach(doc => {
                    batch.delete(doc.ref);
                });
                await batch.commit();
                schedulesDeleted += querySnapshot.size;

                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            toast({
                title: 'Semua Jadwal Dihapus',
                description: `Total ${schedulesDeleted} data jadwal telah berhasil dihapus.`,
            });

        } catch (error) {
            console.error("Failed to delete all schedules:", error);
            toast({ variant: "destructive", title: "Gagal Menghapus", description: "Terjadi kesalahan saat proses penghapusan massal." });
        } finally {
            setIsDeletingAll(false);
            setIsDeleteAllDialogOpen(false);
        }
    };

    const handleFormSubmit = async (data: Partial<Schedule>) => {
        if (!firestore || !data.userId || !data.date) {
            toast({ variant: 'destructive', title: 'Data tidak lengkap' });
            return;
        }
    
        const scheduleDate = data.date.toDate();
        const scheduleId = `${data.userId}_${format(scheduleDate, 'yyyy-MM-dd')}`;
        const scheduleDocRef = doc(firestore, 'schedules', scheduleId);
    
        const writePromise = (() => {
            if (swapSourceSchedule) {
                const batch = writeBatch(firestore);
                // Create new schedule for replacement
                batch.set(scheduleDocRef, { ...data, id: scheduleId, createdAt: Timestamp.now() }, { merge: true });
                // Update original requester's schedule to 'libur'
                const originalRequestRef = doc(firestore, 'schedules', swapSourceSchedule.id);
                const replacementUser = activeUsers.find(u => u.id === data.userId);
                batch.update(originalRequestRef, {
                    shiftType: 'libur-dijadwalkan',
                    notes: `Tukar jaga disetujui, digantikan oleh ${replacementUser?.displayName || data.userEmail}`
                });
                return batch.commit();
            } else {
                let docToDeleteRef: DocumentReference | null = null;
                if (scheduleToEdit?.id && scheduleToEdit.id !== scheduleId) {
                    docToDeleteRef = doc(firestore, 'schedules', scheduleToEdit.id);
                }
    
                if (docToDeleteRef) {
                    const batch = writeBatch(firestore);
                    batch.delete(docToDeleteRef);
                    batch.set(scheduleDocRef, { ...data, id: scheduleId, createdAt: Timestamp.now() }, { merge: true });
                    return batch.commit();
                } else {
                    return setDoc(scheduleDocRef, { ...data, id: scheduleId, createdAt: Timestamp.now() }, { merge: true });
                }
            }
        })();

        try {
            await writePromise;
    
            let toastTitle = 'Jadwal Ditambahkan';
            let toastDescription = '';
    
            if (swapSourceSchedule) {
                const replacementUser = activeUsers.find(u => u.id === data.userId);
                const requesterName = userMap.get(swapSourceSchedule.userId!) || swapSourceSchedule.userEmail;
    
                toastTitle = 'Tukar Jaga Berhasil Disetujui';
                toastDescription = `Jadwal baru untuk ${replacementUser?.displayName} telah dibuat. Jadwal ${requesterName} telah diubah menjadi libur.`;
    
                // SEND NOTIFICATION
                try {
                    await sendSwapApprovalNotice({
                        requesterName: requesterName || 'N/A',
                        replacementName: replacementUser?.displayName || 'N/A',
                        swapDate: format(scheduleDate, 'eeee, dd MMMM yyyy', { locale: idLocale }),
                    });
                } catch (err: any) {
                    console.error("Telegram notification for swap approval failed:", err);
                    toast({
                      variant: 'destructive',
                      title: 'Notifikasi Gagal Terkirim',
                      description: `Persetujuan berhasil, tapi notifikasi ke Telegram gagal. Error: ${err.message}`
                    });
                }
    
            } else if (scheduleToEdit?.id) {
                toastTitle = 'Jadwal Diperbarui';
            }
    
            toast({ title: toastTitle, description: toastDescription, duration: 7000 });
    
            // Reset states after successful operation
            setIsFormDialogOpen(false);
            setScheduleToEdit(null);
            setSwapSourceSchedule(null);
        } catch (error) {
            console.error("Failed to save schedule:", error);
            toast({ variant: 'destructive', title: 'Gagal Menyimpan' });
        }
    };
    

    const handleExportTemplate = async () => {
        const XLSX = await import('xlsx');
        const year = parseInt(selectedYear);
        const monthIndex = parseInt(selectedMonth);
        const daysInSelectedMonth = getDaysInMonth(new Date(year, monthIndex));
        
        const headers = ["NIK"];
        for(let i = 1; i <= daysInSelectedMonth; i++) {
            headers.push(String(i));
        }

        const dataToExport = activeUsers.map(user => {
            const row: Record<string, string> = { "NIK": user.nik || '' };
            return row;
        });

        const worksheet = XLSX.utils.json_to_sheet(dataToExport, { header: headers });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, `Jadwal ${format(new Date(year, monthIndex), 'MMMM yyyy')}`);

        const colWidths = headers.map((header, i) => {
            const dataLength = Math.max(...dataToExport.map(row => row[header]?.length || 0), header.length);
            return { wch: i < 1 ? dataLength + 5 : 5 };
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

        if (!fileInput.files || fileInput.files.length === 0) {
          toast({ variant: "destructive", title: "Tidak ada file dipilih." });
          return;
        }

        if (areUsersLoading || !activeUsers || activeUsers.length === 0) {
            toast({ variant: "destructive", title: "Data Pengguna Belum Siap", description: "Data pengguna sedang dimuat. Silakan tunggu beberapa saat dan coba lagi." });
            if (fileInput) fileInput.value = '';
            return;
        }

        if (!selectedMonth || !selectedYear) {
            toast({ variant: "destructive", title: "Bulan & Tahun Diperlukan", description: "Silakan pilih bulan dan tahun jadwal sebelum mengunggah file." });
            if (fileInput) fileInput.value = '';
            return;
        }
    
        setIsImporting(true);
        setImportProgress(0);
        const file = fileInput.files[0];
        const reader = new FileReader();
    
        reader.onload = async (e) => {
          try {
            const XLSX = await import('xlsx');
            const arrayBuffer = e.target?.result;
            if (!arrayBuffer) {
                throw new Error("Gagal membaca file. File kosong atau rusak.");
            }
            const data = new Uint8Array(arrayBuffer as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            
            const sheetName = workbook.SheetNames[0];
            if (!sheetName) {
                throw new Error("File Excel tidak memiliki sheet yang dapat dibaca.");
            }
            const worksheet = workbook.Sheets[sheetName];

            const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: null, raw: false });
    
            if (jsonData.length === 0) {
                throw new Error("Sheet Excel kosong.");
            }
            
            const headerKeys = Object.keys(jsonData[0] || {});
            const nikHeader = headerKeys.find(key => ['nik', 'nik karyawan', 'nomor induk'].includes(key.trim().toLowerCase()));

            if (!nikHeader) {
                throw new Error("Kolom 'NIK' tidak ditemukan. Pastikan file Excel Anda memiliki kolom dengan nama 'NIK'.");
            }
            
            const userMapByNik = new Map<string, UserProfile>();
            activeUsers.forEach(u => {
                const cleanNik = String(u.nik || '').trim();
                if (cleanNik) {
                    userMapByNik.set(cleanNik, u);
                }
            });

             const shiftCodeMap: Record<string, ValidShiftType> = {
                'pdm': 'piket-demak',
                'smc': 'siang-malam', 's/mc': 'siang-malam', 'sm': 'siang-malam',
                'm': 'malam',
                'i': 'ijin',
                'c': 'cuti',
                'h': 'h',
                'pu': 'pu',
                'pb': 'pb',
                'ptm': 'ptm',
                'pt/bd': 'pt/bd',
                'l': 'libur-dijadwalkan',
                'tj': 'tukar-jaga',
            };
            
            let processedRows = 0;
            let createdCount = 0;
            let errorCount = 0;
            let skippedUsers = new Set<string>();
            const chunkSize = 200;
            let batch = writeBatch(firestore);
            
            const dateColumns = headerKeys.filter((key: string) => {
                const dayNum = parseInt(key, 10);
                return !isNaN(dayNum) && dayNum >= 1 && dayNum <= 31;
            });
    
            for (const row of jsonData) {
                const nikFromExcel = String(row[nikHeader] || '').trim();
                if (!nikFromExcel) continue;
    
                const user = userMapByNik.get(nikFromExcel);
                if (!user) {
                    errorCount++;
                    skippedUsers.add(nikFromExcel);
                    continue;
                }

                for (const dayStr of dateColumns) {
                    const day = parseInt(dayStr, 10);
                    const shiftCode = String(row[dayStr] || '').trim().toLowerCase();
                    const mappedShift = shiftCodeMap[shiftCode];

                    if (mappedShift) {
                        const date = new Date(parseInt(selectedYear), parseInt(selectedMonth), day);
                        if (!isValid(date)) continue;

                        const scheduleId = `${user.id}_${format(date, 'yyyy-MM-dd')}`;
                        const scheduleDocRef = doc(firestore, "schedules", scheduleId);
        
                        const scheduleData: Omit<Schedule, 'id'> = {
                            userId: user.id, userEmail: user.email,
                            date: Timestamp.fromDate(date), shiftType: mappedShift,
                            notes: '', createdAt: Timestamp.now(),
                        };
        
                        batch.set(scheduleDocRef, { ...scheduleData, id: scheduleId }, { merge: true });
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
                const skippedNikList = Array.from(skippedUsers).slice(0, 5).join(', ');
                description += ` ${errorCount} baris dilewati karena NIK tidak terdaftar atau belum disetujui (contoh NIK: ${skippedNikList}${skippedUsers.size > 5 ? '...' : ''}). Periksa apakah NIK ini ada di halaman 'Manajemen User' dan telah disetujui.`;
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
        reader.readAsArrayBuffer(file);
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
                 <div className="flex gap-2">
                    <AlertDialog open={isDeleteAllDialogOpen} onOpenChange={setIsDeleteAllDialogOpen}>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive"><Trash2 className="mr-2 h-4 w-4" /> Hapus Semua Jadwal</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Anda yakin?</AlertDialogTitle><AlertDialogDescription>Tindakan ini akan menghapus semua jadwal secara permanen dari database. Ini tidak dapat dibatalkan.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction onClick={confirmDeleteAll} disabled={isDeletingAll} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                    {isDeletingAll ? <Loader2 className="mr-2 animate-spin" /> : null}
                                    {isDeletingAll ? 'Menghapus...' : 'Ya, Hapus Semua'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen} modal={true}>
                        <DialogTrigger asChild>
                            <Button onClick={handleCreate} disabled={activeUsers.length === 0}>
                                <PlusCircle className="mr-2 h-4 w-4" />Buat Jadwal Manual
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{scheduleToEdit?.id ? 'Edit' : 'Buat'} Jadwal atau Status</DialogTitle>
                            </DialogHeader>
                            <ScheduleForm schedule={scheduleToEdit} users={activeUsers} onFormSubmit={handleFormSubmit} />
                        </DialogContent>
                    </Dialog>
                </div>
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
                            <Download className="mr-2 h-4 w-4" /> Download Template (Hanya NIK)
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
                <CardHeader>
                    <CardTitle>Daftar Jadwal</CardTitle>
                    <CardDescription>Semua jadwal & status yang telah dibuat, diurutkan berdasarkan prioritas dan tanggal.</CardDescription>
                    <div className="pt-4">
                        <Input
                            placeholder="Cari nama teknisi..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="max-w-sm"
                        />
                    </div>
                </CardHeader>
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
                            {paginatedSchedules && paginatedSchedules.length > 0 ? (
                                paginatedSchedules.map(schedule => (
                                    <TableRow key={schedule.id}>
                                        <TableCell className="font-medium">{userMap.get(schedule.userId) || schedule.userEmail}</TableCell>
                                        <TableCell>{format(safeToDate(schedule.date)!, 'eeee, dd MMMM yyyy', { locale: idLocale })}</TableCell>
                                        <TableCell>{shiftTypeLabels[schedule.shiftType] ?? schedule.shiftType}</TableCell>
                                        <TableCell>
                                            {schedule.shiftType === 'tukar-jaga' ? (
                                                <>
                                                    <span className="font-semibold text-orange-600">Request Tukar &gt; {schedule.swapTargetUserName}</span>
                                                    <br />
                                                    {schedule.notes}
                                                </>
                                            ) : (
                                                schedule.notes || '-'
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {schedule.shiftType === 'tukar-jaga' ? (
                                                <div className="flex justify-end items-center gap-1">
                                                     <AlertDialog open={scheduleToApprove?.id === schedule.id} onOpenChange={(open) => !open && setScheduleToApprove(null)}>
                                                        <AlertDialogTrigger asChild>
                                                            <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => setScheduleToApprove(schedule)}>
                                                                <Check className="h-4 w-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Setujui Tukar Jaga?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Formulir jadwal akan terbuka. Silakan pilih teknisi pengganti ("{scheduleToApprove?.swapTargetUserName || 'N/A'}") dan simpan jadwal baru. Request lama akan otomatis diubah menjadi libur.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                                                <AlertDialogAction onClick={handleApprove}>
                                                                    Lanjutkan
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                    <Button size="sm" variant="destructive" className="h-8 px-2" onClick={() => setScheduleToReject(schedule)}>
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <>
                                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(schedule)}><Edit className="h-4 w-4" /></Button>
                                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(schedule)}><Trash2 className="h-4 w-4" /></Button>
                                                </>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={5} className="h-24 text-center">Belum ada jadwal yang dibuat.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
                <CardFooter>
                    <div className="text-xs text-muted-foreground">
                        Halaman <strong>{totalPages > 0 ? currentPage : 0}</strong> dari <strong>{totalPages}</strong>
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1 || totalPages === 0}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Sebelumnya
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages || totalPages === 0}
                        >
                            Berikutnya
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </CardFooter>
            </Card>
            
            <AlertDialog open={!!scheduleToReject} onOpenChange={(open) => !open && setScheduleToReject(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Tolak & Hapus Request?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tindakan ini akan menghapus request tukar jaga ini. Teknisi <strong>{userMap.get(scheduleToReject?.userId || '')}</strong> menjadi tidak terjadwal pada hari tersebut.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={handleReject} disabled={isActionLoading} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                            {isActionLoading && <Loader2 className="mr-2 animate-spin" />}
                            Ya, Tolak & Hapus
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!scheduleToDelete} onOpenChange={(open) => !open && setScheduleToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Anda yakin?</AlertDialogTitle><AlertDialogDescription>Tindakan ini akan menghapus jadwal untuk {userMap.get(scheduleToDelete?.userId || '')} pada {scheduleToDelete?.date ? format(safeToDate(scheduleToDelete.date)!, 'dd MMM yyyy', {locale: idLocale}) : ''}.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Hapus</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
