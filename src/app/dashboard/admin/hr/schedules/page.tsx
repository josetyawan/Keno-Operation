
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, doc, orderBy, Timestamp } from 'firebase/firestore';
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
import { PlusCircle, Edit, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { Schedule, UserProfile } from '@/lib/types';
import { cn } from '@/lib/utils';

type ValidShiftType = 'piket-hari' | 'piket-demak' | 'siang-malam' | 'malam' | 'ijin' | 'cuti';

function ScheduleForm({ schedule, users, onFormSubmit }: { schedule?: Schedule | null, users: UserProfile[], onFormSubmit: (data: Partial<Schedule>) => void }) {
    const [userId, setUserId] = useState('');
    const [date, setDate] = useState<Date | undefined>();
    const [shiftType, setShiftType] = useState<ValidShiftType>('piket-hari');
    const [notes, setNotes] = useState('');
    
    const validShiftTypes: ValidShiftType[] = ['piket-hari', 'piket-demak', 'siang-malam', 'malam', 'ijin', 'cuti'];

    useEffect(() => {
        if (schedule) {
            setUserId(schedule.userId);
            setDate(schedule.date.toDate());
            if (validShiftTypes.includes(schedule.shiftType as any)) {
                setShiftType(schedule.shiftType as ValidShiftType);
            } else {
                setShiftType('piket-hari'); // Default for old data
            }
            setNotes(schedule.notes || '');
        } else {
            setUserId('');
            setDate(undefined);
            setShiftType('piket-hari');
            setNotes('');
        }
    }, [schedule, validShiftTypes]);

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
                        <SelectItem value="piket-hari">Piket Hari (P)</SelectItem>
                        <SelectItem value="piket-demak">Piket Demak (PDM)</SelectItem>
                        <SelectItem value="siang-malam">Piket Siang-Malam (SM)</SelectItem>
                        <SelectItem value="malam">Piket Malam (M)</SelectItem>
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

    const shiftTypeLabels: Record<Schedule['shiftType'], string> = {
        'piket-hari': 'Piket Hari (P)',
        'piket-demak': 'Piket Demak (PDM)',
        'siang-malam': 'Piket Siang-Malam (SM)',
        'malam': 'Piket Malam (M)',
        'ijin': 'Ijin (i)',
        'cuti': 'Cuti (C)',
        'weekend-duty': 'Jaga Akhir Pekan (Lama)',
        'holiday-duty': 'Jaga Hari Libur (Lama)',
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
    
    const isLoading = isUserLoading || isProfileLoading || areSchedulesLoading || areUsersLoading;
    const activeUsers = useMemo(() => users?.filter(u => u.registrationStatus === 'approved') || [], [users]);

    if (isLoading && !schedules) {
        return (
            <div>
                <div className="flex items-center justify-between mb-8"><Skeleton className="h-8 w-64" /><Skeleton className="h-10 w-32" /></div>
                <Card><CardHeader><Skeleton className="h-7 w-48" /></CardHeader><CardContent><Skeleton className="h-24 w-full" /></CardContent></Card>
            </div>
        );
    }

    return (
        <>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Manajemen Jadwal & Status</h1>
                    <p className="text-muted-foreground mt-1">Buat, edit, dan hapus jadwal jaga, ijin, atau cuti untuk teknisi.</p>
                </div>
                <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
                    <DialogTrigger asChild><Button onClick={handleCreate} disabled={activeUsers.length === 0}><PlusCircle className="mr-2 h-4 w-4" />Buat Jadwal</Button></DialogTrigger>
                    <DialogContent><DialogHeader><DialogTitle>{scheduleToEdit ? 'Edit' : 'Buat'} Jadwal atau Status</DialogTitle></DialogHeader><ScheduleForm schedule={scheduleToEdit} users={activeUsers} onFormSubmit={handleFormSubmit} /></DialogContent>
                </Dialog>
            </div>
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
                    <AlertDialogHeader><AlertDialogTitle>Anda yakin?</AlertDialogTitle><AlertDialogDescription>Tindakan ini akan menghapus jadwal untuk {scheduleToDelete?.userEmail} pada {scheduleToDelete?.date ? format(scheduleToDelete.date.toDate(), 'dd MMM') : ''}.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Hapus</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
