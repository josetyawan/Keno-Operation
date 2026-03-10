'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, orderBy, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import type { UserProfile, OtherWork } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { FileSpreadsheet, ChevronLeft, ChevronRight, Edit, Trash2, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

const safeToDate = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (timestamp.toDate) return timestamp.toDate();
    if (timestamp instanceof Date) return timestamp;
    const d = new Date(timestamp);
    return d instanceof Date && !isNaN(d.getTime()) ? d : null;
};

const jenisOrderOptions = [
  "Validasi Data EBIS", "Validasi Data WIFI", "Dismantling DC Infracare",
  "IXSA FTM", "IXSA ODC", "IXSA OLT", "Patroli Akses",
  "Tiket GAMAS", "Tangible ODP", "Validasi Tiang", "Valins FTM", "Valins ODC",
  "Valins Regular", "Preventive FIberisasi", "PT2 Simple", "UNLOCK ODP", "EXPAND ODP",
].sort();

const typeOrderOptions: Record<string, string[]> = {
    'Tiket GAMAS': ['DISTRIBUSI', 'FEEDER', 'ODC', 'ODP'],
};

function EditWorkForm({ work, onSave, onCancel, isSaving }: { work: OtherWork, onSave: (data: Partial<OtherWork>) => void, onCancel: () => void, isSaving: boolean }) {
    const [namaPekerjaan, setNamaPekerjaan] = useState(work.namaPekerjaan || '');
    const [jenisOrder, setJenisOrder] = useState(work.jenisOrder || '');
    const [orderType, setOrderType] = useState(work.orderType || '');
    const [tanggalPengerjaan, setTanggalPengerjaan] = useState(work.tanggalPengerjaan?.toDate ? format(work.tanggalPengerjaan.toDate(), "yyyy-MM-dd'T'HH:mm") : '');
    const [tanggalSelesai, setTanggalSelesai] = useState(work.tanggalSelesai?.toDate ? format(work.tanggalSelesai.toDate(), "yyyy-MM-dd'T'HH:mm") : '');
    const [keterangan, setKeterangan] = useState(work.keterangan || '');
    
    const showOrderType = useMemo(() => jenisOrder === 'Tiket GAMAS', [jenisOrder]);
    
    useEffect(() => {
        if (!showOrderType) setOrderType('');
    }, [showOrderType]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const updatedData: Partial<OtherWork> = {};
        
        if (namaPekerjaan) updatedData.namaPekerjaan = namaPekerjaan;
        if (jenisOrder) updatedData.jenisOrder = jenisOrder;
        if (tanggalPengerjaan) updatedData.tanggalPengerjaan = new Date(tanggalPengerjaan);
        if (keterangan) updatedData.keterangan = keterangan;
        if (showOrderType && orderType) updatedData.orderType = orderType;
        if (tanggalSelesai) updatedData.tanggalSelesai = new Date(tanggalSelesai);
        
        onSave(updatedData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="grid gap-2">
                <Label htmlFor="edit-nama-pekerjaan">Nama Pekerjaan / WO</Label>
                <Input id="edit-nama-pekerjaan" value={namaPekerjaan} onChange={(e) => setNamaPekerjaan(e.target.value)} />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="edit-jenis-order">Jenis Order *</Label>
                    <Select value={jenisOrder} onValueChange={setJenisOrder} required>
                        <SelectTrigger id="edit-jenis-order"><SelectValue placeholder="Pilih Jenis Order..." /></SelectTrigger>
                        <SelectContent><ScrollArea className="h-72">{jenisOrderOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</ScrollArea></SelectContent>
                    </Select>
                </div>
                {showOrderType && (
                    <div className="grid gap-2">
                        <Label htmlFor="edit-order-type">Order Type (GAMAS) *</Label>
                        <Select value={orderType} onValueChange={setOrderType} required>
                            <SelectTrigger id="edit-order-type"><SelectValue placeholder="Pilih Tipe Order GAMAS..." /></SelectTrigger>
                            <SelectContent>{typeOrderOptions['Tiket GAMAS'].map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="edit-tanggal-pengerjaan">Tanggal & Jam Pengerjaan *</Label>
                    <Input id="edit-tanggal-pengerjaan" type="datetime-local" value={tanggalPengerjaan} onChange={e => setTanggalPengerjaan(e.target.value)} required />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="edit-tanggal-selesai">Tanggal & Jam Selesai</Label>
                    <Input id="edit-tanggal-selesai" type="datetime-local" value={tanggalSelesai} onChange={e => setTanggalSelesai(e.target.value)} />
                </div>
            </div>
            <div className="grid gap-2">
                <Label htmlFor="edit-keterangan">Keterangan</Label>
                <Textarea id="edit-keterangan" value={keterangan} onChange={e => setKeterangan(e.target.value)} />
            </div>
            <DialogFooter>
                <Button type="button" variant="ghost" onClick={onCancel}>Batal</Button>
                <Button type="submit" disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 animate-spin" />}
                    Simpan Perubahan
                </Button>
            </DialogFooter>
        </form>
    )
}

export default function OtherWorksPage() {
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    const { user, isUserLoading } = useUser();
    
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;
    
    const [workToEdit, setWorkToEdit] = useState<OtherWork | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<OtherWork | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    
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

    const worksQuery = useMemoFirebase(() => query(collection(firestore, 'other-works'), orderBy('createdAt', 'desc')), [firestore]);
    const { data: allWorks, isLoading: areWorksLoading } = useCollection<OtherWork>(worksQuery);

    const usersQuery = useMemoFirebase(() => query(collection(firestore, 'users')), [firestore]);
    const { data: allUsers, isLoading: areUsersLoading } = useCollection<UserProfile>(usersQuery);

    const userMap = useMemo(() => {
        if (!allUsers) return new Map<string, UserProfile>();
        return new Map(allUsers.map(u => [u.id, u]));
    }, [allUsers]);

    const filteredWorks = useMemo(() => {
        if (!allWorks) return [];
        if (!searchQuery) return allWorks;
        
        const lowercasedQuery = searchQuery.toLowerCase();
        return allWorks.filter(work => 
            work.userName.toLowerCase().includes(lowercasedQuery) ||
            work.jenisOrder.toLowerCase().includes(lowercasedQuery) ||
            (work.namaPekerjaan && work.namaPekerjaan.toLowerCase().includes(lowercasedQuery))
        );
    }, [allWorks, searchQuery]);

    const paginatedWorks = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        return filteredWorks.slice(startIndex, endIndex);
    }, [filteredWorks, currentPage]);

    const totalPages = Math.ceil(filteredWorks.length / ITEMS_PER_PAGE);

    const handleExport = async () => {
        if (filteredWorks.length === 0) {
            toast({ variant: 'destructive', title: 'Tidak ada data untuk diekspor' });
            return;
        }

        const XLSX = await import('xlsx');

        const dataToExport = filteredWorks.map((item, index) => ({
            'No': index + 1,
            'Nama Teknisi': item.userName,
            'NIK': item.nik || '-',
            'Nama Pekerjaan': item.namaPekerjaan || '-',
            'Jenis Order': item.jenisOrder,
            'Tipe Order (GAMAS)': item.orderType || '-',
            'Tanggal Pengerjaan': safeToDate(item.tanggalPengerjaan) ? format(safeToDate(item.tanggalPengerjaan)!, 'dd MMM yyyy, HH:mm', { locale: idLocale }) : '-',
            'Tanggal Selesai': safeToDate(item.tanggalSelesai) ? format(safeToDate(item.tanggalSelesai)!, 'dd MMM yyyy, HH:mm', { locale: idLocale }) : '-',
            'Keterangan': item.keterangan || '-',
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Pekerjaan Lain');
        
        XLSX.writeFile(workbook, `Rekap_Pekerjaan_Lain-lain_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);

        toast({ title: 'Ekspor Berhasil', description: 'File Excel telah diunduh.' });
    };

    const handleEdit = (work: OtherWork) => {
        setWorkToEdit(work);
    };

    const handleUpdate = async (data: Partial<OtherWork>) => {
        if (!workToEdit) return;
        setIsSaving(true);
        const docRef = doc(firestore, 'other-works', workToEdit.id);
        try {
            await updateDoc(docRef, data);
            toast({ title: "Pekerjaan Diperbarui" });
            setWorkToEdit(null);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Gagal Memperbarui', description: e.message });
        } finally {
            setIsSaving(false);
        }
    };
    
    const confirmDelete = async () => {
        if (!itemToDelete) return;
        setIsDeleting(true);
        const docRef = doc(firestore, 'other-works', itemToDelete.id);
        try {
            await deleteDoc(docRef);
            toast({ title: 'Pekerjaan Dihapus' });
            setItemToDelete(null);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Gagal Menghapus', description: e.message });
        } finally {
            setIsDeleting(false);
        }
    };

    const isLoading = areWorksLoading || areUsersLoading || isUserLoading || isProfileLoading;

    return (
        <>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Rekap Pekerjaan Lain-lain</h1>
                        <p className="text-muted-foreground">Daftar pekerjaan non-no. service yang telah diinput.</p>
                    </div>
                     <Button onClick={handleExport} disabled={!filteredWorks || filteredWorks.length === 0}>
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        Download Excel
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Filter Laporan</CardTitle>
                        <div className="pt-2">
                             <Input 
                                placeholder="Cari nama teknisi, jenis order, atau nama pekerjaan..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="max-w-md"
                            />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Teknisi</TableHead>
                                    <TableHead>Nama/Jenis Pekerjaan</TableHead>
                                    <TableHead>Waktu Pengerjaan</TableHead>
                                    <TableHead>Keterangan</TableHead>
                                    <TableHead className="text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    Array.from({length: 5}).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell colSpan={5}><Skeleton className="h-6 w-full" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : paginatedWorks && paginatedWorks.length > 0 ? (
                                    paginatedWorks.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <div className="font-medium">{item.userName}</div>
                                                <div className="text-xs text-muted-foreground">{item.nik}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium">{item.namaPekerjaan || item.jenisOrder}</div>
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Badge variant="secondary">{item.jenisOrder}</Badge>
                                                    {item.orderType && <Badge variant="outline">{item.orderType}</Badge>}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-xs">
                                                    <p>Mulai: {safeToDate(item.tanggalPengerjaan) ? format(safeToDate(item.tanggalPengerjaan)!, 'dd MMM, HH:mm') : '-'}</p>
                                                    <p>Selesai: {safeToDate(item.tanggalSelesai) ? format(safeToDate(item.tanggalSelesai)!, 'dd MMM, HH:mm') : '-'}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{item.keterangan || '-'}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <AlertDialog open={itemToDelete?.id === item.id} onOpenChange={(open) => !open && setItemToDelete(null)}>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setItemToDelete(item)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Anda Yakin?</AlertDialogTitle>
                                                            <AlertDialogDescription>Tindakan ini akan menghapus laporan pekerjaan ini secara permanen.</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Batal</AlertDialogCancel>
                                                            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                                                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Ya, Hapus'}
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            Tidak ada data pekerjaan yang ditemukan.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                    {totalPages > 1 && (
                         <CardFooter>
                            <div className="text-xs text-muted-foreground">
                                Halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong>
                            </div>
                            <div className="flex items-center gap-2 ml-auto">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    Sebelumnya
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                >
                                    Berikutnya
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardFooter>
                    )}
                </Card>
            </div>
            {workToEdit && (
                 <Dialog open={!!workToEdit} onOpenChange={(open) => !open && setWorkToEdit(null)}>
                    <DialogContent className="max-w-xl">
                        <DialogHeader>
                            <DialogTitle>Edit Pekerjaan</DialogTitle>
                        </DialogHeader>
                        <EditWorkForm work={workToEdit} onSave={handleUpdate} onCancel={() => setWorkToEdit(null)} isSaving={isSaving} />
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}
