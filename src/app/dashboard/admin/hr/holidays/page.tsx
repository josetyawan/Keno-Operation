
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc, orderBy, Timestamp, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Edit, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { Holiday, UserProfile } from '@/lib/types';
import { cn } from '@/lib/utils';

function HolidayForm({ holiday, onFormSubmit }: { holiday?: Holiday | null, onFormSubmit: (data: Partial<Holiday>) => void }) {
    const [date, setDate] = useState<Date | undefined>();
    const [name, setName] = useState('');
    const [type, setType] = useState<'national-holiday' | 'collective-leave'>('national-holiday');

    useEffect(() => {
        if (holiday) {
            setDate(holiday.date.toDate());
            setName(holiday.name);
            setType(holiday.type);
        } else {
            setDate(undefined);
            setName('');
            setType('national-holiday');
        }
    }, [holiday]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!date || !name) return;
        onFormSubmit({ date: Timestamp.fromDate(date), name, type });
    };

    return (
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
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
                            fromYear={new Date().getFullYear() - 5}
                            toYear={new Date().getFullYear() + 5}
                        />
                    </PopoverContent>
                </Popover>
            </div>
            <div className="grid gap-2">
                <Label htmlFor="name">Nama Hari Libur</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Hari Kemerdekaan" required />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="type">Jenis Libur</Label>
                <Select value={type} onValueChange={(value) => setType(value as any)}>
                    <SelectTrigger><SelectValue placeholder="Pilih jenis" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="national-holiday">Libur Nasional</SelectItem>
                        <SelectItem value="collective-leave">Cuti Bersama</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <DialogFooter>
                <DialogClose asChild><Button type="button" variant="secondary">Batal</Button></DialogClose>
                <Button type="submit">Simpan</Button>
            </DialogFooter>
        </form>
    );
}

export default function AdminHolidaysPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
    const [holidayToEdit, setHolidayToEdit] = useState<Holiday | null>(null);
    const [holidayToDelete, setHolidayToDelete] = useState<Holiday | null>(null);

    const { data: currentUserProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(
        useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore])
    );

    useEffect(() => {
        if (!isUserLoading && !isProfileLoading && (!user || currentUserProfile?.role !== 'admin')) {
            router.push('/dashboard');
        }
    }, [user, currentUserProfile, isUserLoading, isProfileLoading, router]);

    const holidaysQuery = useMemoFirebase(() => {
        if (currentUserProfile?.role === 'admin') {
            return query(collection(firestore, 'holidays'), orderBy('date', 'desc'));
        }
        return null;
    }, [firestore, currentUserProfile]);

    const { data: holidays, isLoading: areHolidaysLoading } = useCollection<Holiday>(holidaysQuery);

    const handleCreate = () => {
        setHolidayToEdit(null);
        setIsFormDialogOpen(true);
    };

    const handleEdit = (holiday: Holiday) => {
        setHolidayToEdit(holiday);
        setIsFormDialogOpen(true);
    };

    const handleDelete = (holiday: Holiday) => {
        setHolidayToDelete(holiday);
    };

    const confirmDelete = async () => {
        if (!holidayToDelete || !firestore) return;
        const holidayDocRef = doc(firestore, 'holidays', holidayToDelete.id);
        try {
            await deleteDoc(holidayDocRef);
            toast({ title: 'Hari Libur Dihapus' });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Gagal Menghapus' });
        }
        setHolidayToDelete(null);
    };

    const handleFormSubmit = async (data: Partial<Holiday>) => {
        if (!firestore) return;
        try {
            if (holidayToEdit) {
                await updateDoc(doc(firestore, 'holidays', holidayToEdit.id), data);
                toast({ title: 'Hari Libur Diperbarui' });
            } else {
                await addDoc(collection(firestore, 'holidays'), data);
                toast({ title: 'Hari Libur Ditambahkan' });
            }
        } catch (e) {
            toast({ variant: 'destructive', title: 'Gagal Menyimpan' });
        }
        setIsFormDialogOpen(false);
    };
    
    const isLoading = isUserLoading || isProfileLoading || areHolidaysLoading;

    if (isLoading && !holidays) {
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
                    <h1 className="text-3xl font-bold tracking-tight">Manajemen Hari Libur</h1>
                    <p className="text-muted-foreground mt-1">Kelola tanggal merah nasional dan cuti bersama.</p>
                </div>
                <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen} modal={false}>
                    <DialogTrigger asChild><Button onClick={handleCreate}><PlusCircle className="mr-2 h-4 w-4" />Tambah Hari Libur</Button></DialogTrigger>
                    <DialogContent><DialogHeader><DialogTitle>{holidayToEdit ? 'Edit' : 'Tambah'} Hari Libur</DialogTitle></DialogHeader><HolidayForm holiday={holidayToEdit} onFormSubmit={handleFormSubmit} /></DialogContent>
                </Dialog>
            </div>
            <Card>
                <CardHeader><CardTitle>Daftar Hari Libur</CardTitle><CardDescription>Daftar tanggal libur yang tercatat di sistem.</CardDescription></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tanggal</TableHead>
                                <TableHead>Nama</TableHead>
                                <TableHead>Jenis</TableHead>
                                <TableHead className="text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {holidays && holidays.length > 0 ? (
                                holidays.map(holiday => (
                                    <TableRow key={holiday.id}>
                                        <TableCell className="font-medium">{format(holiday.date.toDate(), 'dd MMMM yyyy', { locale: idLocale })}</TableCell>
                                        <TableCell>{holiday.name}</TableCell>
                                        <TableCell className="capitalize">{holiday.type === 'national-holiday' ? 'Libur Nasional' : 'Cuti Bersama'}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(holiday)}><Edit className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(holiday)}><Trash2 className="h-4 w-4" /></Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={4} className="h-24 text-center">Belum ada data hari libur.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <AlertDialog open={!!holidayToDelete} onOpenChange={(open) => !open && setHolidayToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Anda yakin?</AlertDialogTitle><AlertDialogDescription>Tindakan ini akan menghapus hari libur "{holidayToDelete?.name}" secara permanen.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Hapus</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
