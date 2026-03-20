'use client';

import * as React from 'react';
import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc, orderBy, Timestamp, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogTrigger, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { PlusCircle, ArrowUpCircle, ArrowDownCircle, CalendarIcon, Loader2, Edit, Trash2, ChevronDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { format, isValid } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { CashTransaction, UserProfile, Nota } from '@/lib/types';
import { cn } from '@/lib/utils';
import Link from 'next/link';

function TransactionForm({ type, onFormSubmit, isSaving, userEmail }: { type: 'in' | 'out', onFormSubmit: (data: Omit<CashTransaction, 'id' | 'createdAt'>) => void, isSaving: boolean, userEmail: string }) {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState<Date | undefined>();

    useEffect(() => {
        setDate(new Date());
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !description || !date) return;
        onFormSubmit({
            type,
            amount: Number(amount),
            description,
            date: Timestamp.fromDate(date),
            createdBy: userEmail,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
            <div className="grid gap-2">
                <Label htmlFor="date">Tanggal Transaksi</Label>
                 <Popover>
                    <PopoverTrigger asChild>
                        <Button variant={'outline'} className={cn('w-full justify-start text-left font-normal', !date && 'text-muted-foreground')}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date ? format(date, 'PPP', {locale: idLocale}) : <span>Pilih tanggal</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                    </PopoverContent>
                </Popover>
            </div>
            <div className="grid gap-2">
                <Label htmlFor="amount">Jumlah (Rp)</Label>
                <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="description">Keterangan</Label>
                <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={type === 'in' ? "Contoh: Kas awal bulan" : "Contoh: Pembelian ATK darurat"} required />
            </div>
            <DialogFooter>
                <DialogClose asChild><Button type="button" variant="secondary">Batal</Button></DialogClose>
                <Button type="submit" disabled={isSaving}>
                    {isSaving ? <Loader2 className="animate-spin" /> : (type === 'in' ? 'Simpan Pemasukan' : 'Simpan Pengeluaran')}
                </Button>
            </DialogFooter>
        </form>
    );
}

function EditTransactionForm({ transaction, onFormSubmit, isSaving }: { transaction: CashTransaction, onFormSubmit: (data: Partial<CashTransaction>) => void, isSaving: boolean }) {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState<Date | undefined>();

    useEffect(() => {
        if (transaction) {
            setAmount(transaction.amount.toString());
            setDescription(transaction.description);
            setDate(transaction.date.toDate());
        }
    }, [transaction]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !description || !date) return;
        onFormSubmit({
            amount: Number(amount),
            description,
            date: Timestamp.fromDate(date),
        });
    };

    return (
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
            <div className="grid gap-2">
                <Label htmlFor="edit-date">Tanggal Transaksi</Label>
                 <Popover>
                    <PopoverTrigger asChild>
                        <Button variant={'outline'} className={cn('w-full justify-start text-left font-normal', !date && 'text-muted-foreground')}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date ? format(date, 'PPP', {locale: idLocale}) : <span>Pilih tanggal</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                    </PopoverContent>
                </Popover>
            </div>
            <div className="grid gap-2">
                <Label htmlFor="edit-amount">Jumlah (Rp)</Label>
                <Input id="edit-amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="edit-description">Keterangan</Label>
                <Input id="edit-description" value={description} onChange={(e) => setDescription(e.target.value)} required />
            </div>
            <DialogFooter>
                <DialogClose asChild><Button type="button" variant="secondary">Batal</Button></DialogClose>
                <Button type="submit" disabled={isSaving}>
                    {isSaving ? <Loader2 className="animate-spin" /> : 'Simpan Perubahan'}
                </Button>
            </DialogFooter>
        </form>
    );
}

export default function AdminCashbookPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    const [isFormInOpen, setIsFormInOpen] = useState(false);
    const [isFormOutOpen, setIsFormOutOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // State for individual dialogs
    const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
    const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null);

    // State for expandable rows
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const { data: currentUserProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(
        useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore])
    );

    useEffect(() => {
        if (!isUserLoading && !isProfileLoading && (!user || currentUserProfile?.role !== 'admin')) {
            router.push('/dashboard');
        }
    }, [user, currentUserProfile, isUserLoading, isProfileLoading, router]);

    const cashbookQuery = useMemoFirebase(() => {
        if (currentUserProfile?.role === 'admin') {
            return query(collection(firestore, 'cashbook'), orderBy('date', 'desc'));
        }
        return null;
    }, [firestore, currentUserProfile]);

    const { data: transactions, isLoading: areTransactionsLoading } = useCollection<CashTransaction>(cashbookQuery);

    const { data: allNotas, isLoading: areNotasLoading } = useCollection<Nota>(
        useMemoFirebase(() => query(collection(firestore, 'notas')), [firestore])
    );

    const notasMap = useMemo(() => {
        if (!allNotas) return new Map<string, Nota>();
        return new Map(allNotas.map(n => [n.id, n]));
    }, [allNotas]);

    const toggleRow = (rowId: string) => {
        setExpandedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(rowId)) {
                newSet.delete(rowId);
            } else {
                newSet.add(rowId);
            }
            return newSet;
        });
    };

    const { transactionsWithBalance, finalBalance } = useMemo(() => {
        if (!transactions) return { transactionsWithBalance: [], finalBalance: 0 };
        
        const sorted = [...transactions].sort((a,b) => a.date.toDate().getTime() - b.date.toDate().getTime());
        
        let runningBalance = 0;
        const transactionsWithBalance = sorted.map(tx => {
            if (tx.type === 'in') {
                runningBalance += tx.amount;
            } else {
                runningBalance -= tx.amount;
            }
            return { ...tx, balance: runningBalance };
        }).reverse(); // Reverse for display (newest first)

        return { transactionsWithBalance, finalBalance: runningBalance };

    }, [transactions]);
    
    const handleCreateSubmit = async (data: Omit<CashTransaction, 'id' | 'createdAt'>) => {
        setIsSaving(true);
        try {
            await addDoc(collection(firestore, 'cashbook'), { ...data, createdAt: Timestamp.now() });
            toast({ title: 'Transaksi Disimpan', description: `Transaksi ${data.type === 'in' ? 'pemasukan' : 'pengeluaran'} telah dicatat.` });
            setIsFormInOpen(false);
            setIsFormOutOpen(false);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Gagal Menyimpan', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleUpdateSubmit = async (data: Partial<CashTransaction>) => {
        if (!editingTransactionId) return;
        setIsSaving(true);
        try {
            const docRef = doc(firestore, 'cashbook', editingTransactionId);
            await updateDoc(docRef, data);
            toast({ title: 'Transaksi Diperbarui' });
            setEditingTransactionId(null);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Gagal Memperbarui', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };
    
    const confirmDelete = async () => {
        if (!deletingTransactionId) return;
        try {
            await deleteDoc(doc(firestore, 'cashbook', deletingTransactionId));
            toast({ title: 'Transaksi Dihapus' });
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Gagal Menghapus', description: error.message });
        } finally {
            setDeletingTransactionId(null);
        }
    };
    
    const isLoading = isUserLoading || isProfileLoading || areTransactionsLoading || areNotasLoading;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Buku Kas Operasional</h1>
                    <p className="text-muted-foreground mt-1">Catat dan lacak semua pemasukan dan pengeluaran kas.</p>
                </div>
                <div className="flex gap-2">
                    <Dialog open={isFormOutOpen} onOpenChange={setIsFormOutOpen}>
                        <DialogTrigger asChild><Button variant="destructive"><ArrowDownCircle className="mr-2"/>Tambah Pengeluaran</Button></DialogTrigger>
                        <DialogContent><DialogHeader><DialogTitle>Catat Pengeluaran Manual</DialogTitle></DialogHeader><TransactionForm type="out" onFormSubmit={handleCreateSubmit} isSaving={isSaving} userEmail={user?.email || ''} /></DialogContent>
                    </Dialog>
                    <Dialog open={isFormInOpen} onOpenChange={setIsFormInOpen}>
                        <DialogTrigger asChild><Button><ArrowUpCircle className="mr-2"/>Tambah Pemasukan</Button></DialogTrigger>
                        <DialogContent><DialogHeader><DialogTitle>Catat Pemasukan Kas</DialogTitle></DialogHeader><TransactionForm type="in" onFormSubmit={handleCreateSubmit} isSaving={isSaving} userEmail={user?.email || ''} /></DialogContent>
                    </Dialog>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Saldo Akhir</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? <Skeleton className="h-12 w-64" /> : <p className="text-4xl font-bold">Rp {finalBalance.toLocaleString('id-ID')}</p>}
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Riwayat Transaksi</CardTitle><CardDescription>Semua transaksi kas diurutkan dari yang terbaru.</CardDescription></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-28">Tanggal</TableHead>
                                <TableHead>Keterangan</TableHead>
                                <TableHead className="text-right">Pemasukan (Rp)</TableHead>
                                <TableHead className="text-right">Pengeluaran (Rp)</TableHead>
                                <TableHead className="text-right">Saldo (Rp)</TableHead>
                                <TableHead className="text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                             {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
                                ))
                            ) : transactionsWithBalance.length > 0 ? (
                                transactionsWithBalance.map(tx => {
                                    const isExpandable = tx.type === 'out' && tx.notaIds && tx.notaIds.length > 0;
                                    const isExpanded = expandedRows.has(tx.id);
                                    return (
                                        <React.Fragment key={tx.id}>
                                            <TableRow 
                                                className={cn(isExpandable && 'cursor-pointer hover:bg-muted/50')} 
                                                onClick={() => isExpandable && toggleRow(tx.id)}
                                            >
                                                <TableCell>{format(tx.date.toDate(), 'dd MMM yyyy', { locale: idLocale })}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        {isExpandable && <ChevronDown className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-180')} />}
                                                        <div>
                                                            <p>{tx.description}</p>
                                                            {isExpandable && (
                                                                <p className="text-xs text-muted-foreground">
                                                                    Terkait {tx.notaIds!.length} nota. Klik untuk melihat rincian.
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-medium text-green-600">
                                                    {tx.type === 'in' ? tx.amount.toLocaleString('id-ID') : '-'}
                                                </TableCell>
                                                <TableCell className="text-right font-medium text-red-600">
                                                    {tx.type === 'out' ? tx.amount.toLocaleString('id-ID') : '-'}
                                                </TableCell>
                                                <TableCell className="text-right font-bold">{tx.balance.toLocaleString('id-ID')}</TableCell>
                                                <TableCell className="text-right">
                                                    <Dialog open={editingTransactionId === tx.id} onOpenChange={(open) => !open && setEditingTransactionId(null)}>
                                                        <DialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setEditingTransactionId(tx.id); }}>
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent>
                                                            <DialogHeader><DialogTitle>Edit Transaksi</DialogTitle></DialogHeader>
                                                            <EditTransactionForm transaction={tx} onFormSubmit={handleUpdateSubmit} isSaving={isSaving} />
                                                        </DialogContent>
                                                    </Dialog>
                                                    <AlertDialog open={deletingTransactionId === tx.id} onOpenChange={(open) => !open && setDeletingTransactionId(null)}>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeletingTransactionId(tx.id); }}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader><AlertDialogTitle>Anda Yakin?</AlertDialogTitle><AlertDialogDescription>Tindakan ini akan menghapus transaksi "{tx.description}" secara permanen.</AlertDialogDescription></AlertDialogHeader>
                                                            <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Hapus</AlertDialogAction></AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </TableCell>
                                            </TableRow>
                                            {isExpandable && isExpanded && (
                                                <TableRow className="bg-muted/20">
                                                    <TableCell colSpan={6} className="p-0">
                                                        <div className="p-4">
                                                            <h4 className="font-semibold mb-2 ml-4">Rincian Nota Terkait</h4>
                                                            <Table>
                                                                <TableHeader>
                                                                    <TableRow>
                                                                        <TableHead>PIC</TableHead>
                                                                        <TableHead>Tgl. Nota</TableHead>
                                                                        <TableHead>Segmen</TableHead>
                                                                        <TableHead className="text-right">Nominal</TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {tx.notaIds?.map(notaId => {
                                                                        const nota = notasMap.get(notaId);
                                                                        return nota ? (
                                                                            <TableRow key={nota.id} className="hover:bg-muted/40">
                                                                                <TableCell>{nota.namaPic}</TableCell>
                                                                                <TableCell>{nota.tanggal?.toDate ? format(nota.tanggal.toDate(), 'dd MMM yyyy') : '-'}</TableCell>
                                                                                <TableCell><Link href={`/dashboard/notas/${nota.id}`} className="text-blue-600 hover:underline">{nota.segmen}</Link></TableCell>
                                                                                <TableCell className="text-right">Rp {nota.nominal.toLocaleString('id-ID')}</TableCell>
                                                                            </TableRow>
                                                                        ) : (
                                                                            <TableRow key={notaId}><TableCell colSpan={4}>Nota dengan ID {notaId} tidak ditemukan.</TableCell></TableRow>
                                                                        );
                                                                    })}
                                                                </TableBody>
                                                            </Table>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </React.Fragment>
                                    )
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">Belum ada transaksi.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
