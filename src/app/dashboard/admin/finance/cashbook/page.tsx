
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc, addDoc } from '@/firebase';
import { collection, query, doc, orderBy, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { PlusCircle, ArrowUpCircle, ArrowDownCircle, CalendarIcon, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { format, isValid } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { CashTransaction, UserProfile } from '@/lib/types';
import { cn } from '@/lib/utils';
import Link from 'next/link';

function TransactionForm({ type, onFormSubmit, isSaving, userEmail }: { type: 'in' | 'out', onFormSubmit: (data: Omit<CashTransaction, 'id' | 'createdAt'>) => void, isSaving: boolean, userEmail: string }) {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState<Date | undefined>(new Date());

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

export default function AdminCashbookPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    const [isFormInOpen, setIsFormInOpen] = useState(false);
    const [isFormOutOpen, setIsFormOutOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

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
    
    const handleFormSubmit = async (data: Omit<CashTransaction, 'id' | 'createdAt'>) => {
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
    
    const isLoading = isUserLoading || isProfileLoading || areTransactionsLoading;

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
                        <DialogContent><DialogHeader><DialogTitle>Catat Pengeluaran Manual</DialogTitle></DialogHeader><TransactionForm type="out" onFormSubmit={handleFormSubmit} isSaving={isSaving} userEmail={user?.email || ''} /></DialogContent>
                    </Dialog>
                    <Dialog open={isFormInOpen} onOpenChange={setIsFormInOpen}>
                        <DialogTrigger asChild><Button><ArrowUpCircle className="mr-2"/>Tambah Pemasukan</Button></DialogTrigger>
                        <DialogContent><DialogHeader><DialogTitle>Catat Pemasukan Kas</DialogTitle></DialogHeader><TransactionForm type="in" onFormSubmit={handleFormSubmit} isSaving={isSaving} userEmail={user?.email || ''} /></DialogContent>
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
                                <TableHead>Tanggal</TableHead>
                                <TableHead>Keterangan</TableHead>
                                <TableHead className="text-right">Pemasukan (Rp)</TableHead>
                                <TableHead className="text-right">Pengeluaran (Rp)</TableHead>
                                <TableHead className="text-right">Saldo (Rp)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                             {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
                                ))
                            ) : transactionsWithBalance.length > 0 ? (
                                transactionsWithBalance.map(tx => (
                                    <TableRow key={tx.id}>
                                        <TableCell>{format(tx.date.toDate(), 'dd MMM yyyy', { locale: idLocale })}</TableCell>
                                        <TableCell>
                                            <p>{tx.description}</p>
                                            {tx.notaIds && tx.notaIds.length > 0 && (
                                                <p className="text-xs text-muted-foreground">
                                                    Terkait {tx.notaIds.length} nota.
                                                </p>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right font-medium text-green-600">
                                            {tx.type === 'in' ? tx.amount.toLocaleString('id-ID') : '-'}
                                        </TableCell>
                                        <TableCell className="text-right font-medium text-red-600">
                                            {tx.type === 'out' ? tx.amount.toLocaleString('id-ID') : '-'}
                                        </TableCell>
                                        <TableCell className="text-right font-bold">{tx.balance.toLocaleString('id-ID')}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">Belum ada transaksi.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}


    