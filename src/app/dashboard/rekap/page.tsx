'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
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
} from "@/components/ui/alert-dialog"
import { ArrowLeft, Calendar as CalendarIcon, Loader2, Bot, Wallet, CheckCircle } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, where, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { format, startOfDay, endOfDay, isValid } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { Nota, UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { sendTelegramReport } from '@/ai/flows/send-telegram-report';
import { sendLinkAjaPayment } from '@/ai/flows/send-linkaja-payment';
import { sendPaidNotice } from '@/ai/flows/send-paid-notice';
import type { DateRange } from 'react-day-picker';
import { useRouter } from 'next/navigation';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

type RekapDataItem = {
    phone: string;
    name: string;
    segmen: string;
    tanggal: string;
    nominal: number;
    userId: string;
    notaId?: string;
};

const safeToDate = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (timestamp.toDate) return timestamp.toDate();
    if (timestamp instanceof Date && isValid(timestamp)) return timestamp;
    const d = new Date(timestamp);
    return isValid(d) ? d : null;
};

export default function RekapPage() {
    const firestore = useFirestore();
    const router = useRouter();
    const { user, isUserLoading } = useUser();
    const { toast } = useToast();
    const [verificationDateRange, setVerificationDateRange] = useState<DateRange | undefined>();
    const [rekapData, setRekapData] = useState<RekapDataItem[]>([]);
    const [grandTotal, setGrandTotal] = useState(0);
    const [selectedNotaIds, setSelectedNotaIds] = useState<string[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [isPaying, setIsPaying] = useState(false);
    const [isMarkingAsPaid, setIsMarkingAsPaid] = useState(false);
    const [isManualPayDialogOpen, setIsManualPayDialogOpen] = useState(false);

    // --- Role-based access control ---
    const { data: currentUserProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(
        useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore])
    );

    useEffect(() => {
        if (!isUserLoading && !isProfileLoading) {
            if (!user || currentUserProfile?.role !== 'admin') {
                router.push('/dashboard');
            }
        }
    }, [user, currentUserProfile, isUserLoading, isProfileLoading, router]);
    // --- End role-based access control ---

    const notasQuery = useMemoFirebase(() => {
        if (!verificationDateRange?.from) return null; // Use only `from` for initial check
        const start = startOfDay(verificationDateRange.from);
        // Use `to` if it exists, otherwise use the end of the `from` day
        const end = endOfDay(verificationDateRange.to || verificationDateRange.from);
        return query(
            collection(firestore, 'notas'),
            where('tanggalVerifikasi', '>=', Timestamp.fromDate(start)),
            where('tanggalVerifikasi', '<=', Timestamp.fromDate(end))
        );
    }, [firestore, verificationDateRange]);

    const { data: notasFromQuery, isLoading: isNotasLoading } = useCollection<Nota>(notasQuery);

    const notas = useMemo(() => {
        if (!notasFromQuery) return [];
        // Also filter by status client-side to be safe, including the new TIF status
        return notasFromQuery.filter(nota => nota.status === 'verified' || nota.status === 'verified-tif');
    }, [notasFromQuery]);
    
    const usersCollection = useMemoFirebase(() => {
      if (!firestore) return null;
      return collection(firestore, 'users');
    }, [firestore]);
    const { data: users, isLoading: isUsersLoading } = useCollection<UserProfile>(usersCollection);

    const handleGenerateRekap = () => {
        if (!notas || !users) {
            setRekapData([]);
            setGrandTotal(0);
            return;
        }
        setIsGenerating(true);

        const userMap = new Map(users.map(u => [u.id, u]));

        // Group notas by user ID
        const groupedByUser = notas.reduce((acc, nota) => {
            const userId = nota.userId;
            if (!acc[userId]) {
                acc[userId] = [];
            }
            acc[userId].push(nota);
            return acc;
        }, {} as Record<string, Nota[]>);
        
        const finalRekapData: RekapDataItem[] = [];
        
        // Sort users by name for consistent order
        const sortedUserIds = Object.keys(groupedByUser).sort((a, b) => {
            const userA = userMap.get(a);
            const userB = userMap.get(b);
            const nameA = (userA?.displayName || 'Unknown').replace(/\s/g, '');
            const nameB = (userB?.displayName || 'Unknown').replace(/\s/g, '');
            return nameA.localeCompare(nameB);
        });

        for (const userId of sortedUserIds) {
            // Sort this user's notas by date
            const userNotas = groupedByUser[userId].sort((a,b) => (safeToDate(a.tanggal)?.getTime() ?? 0) - (safeToDate(b.tanggal)?.getTime() ?? 0));
            const user = userMap.get(userId);
            let userSubtotal = 0;
            const userName = (user?.displayName || 'Unknown').replace(/\s/g, '');

            const paymentNumber = user?.paymentInfo || (user as any)?.phone || 'No-Pembayaran';

            // Add individual nota items
            userNotas.forEach(nota => {
                const notaDate = safeToDate(nota.tanggal);
                finalRekapData.push({
                    phone: paymentNumber,
                    name: userName,
                    segmen: nota.segmen,
                    tanggal: notaDate ? format(notaDate, 'dd/MM/yy') : '??/??/??',
                    nominal: nota.nominal,
                    userId: userId,
                    notaId: nota.id,
                });
                userSubtotal += nota.nominal;
            });
            
            // Add user subtotal item if there are items for this user
            if (userNotas.length > 0) {
                finalRekapData.push({
                    phone: paymentNumber,
                    name: `TOTAL ${userName}`,
                    segmen: '', // Indicate this is a total row
                    tanggal: '', // Indicate this is a total row
                    nominal: userSubtotal,
                    userId: userId,
                });
            }
        }
        
        const total = notas.reduce((sum, item) => sum + item.nominal, 0);

        setRekapData(finalRekapData);
        setGrandTotal(total);
        setIsGenerating(false);
    };
    
    useEffect(() => {
        if(notas && users) {
           handleGenerateRekap();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [notas, users]);

    useEffect(() => {
        if (rekapData.length > 0) {
            const allNotaIds = rekapData.filter(item => !!item.notaId).map(item => item.notaId!);
            setSelectedNotaIds(allNotaIds);
        } else {
            setSelectedNotaIds([]);
        }
    }, [rekapData]);

    const selectedTotal = useMemo(() => {
        if (!notas || selectedNotaIds.length === 0) return 0;
        return notas.reduce((sum, nota) => {
            if (selectedNotaIds.includes(nota.id)) {
                return sum + nota.nominal;
            }
            return sum;
        }, 0);
    }, [notas, selectedNotaIds]);
    
    const rekapDateString = useMemo(() => {
        if (!verificationDateRange?.from) return '...';
        if (verificationDateRange.to) {
            return `${format(verificationDateRange.from, 'dd MMM yyyy', {locale: idLocale})} - ${format(verificationDateRange.to, 'dd MMM yyyy', {locale: idLocale})}`;
        }
        return format(verificationDateRange.from, 'dd MMMM yyyy', {locale: idLocale});
    }, [verificationDateRange]);

    const handleManualPayment = async () => {
        if (selectedNotaIds.length === 0) {
            toast({ variant: 'destructive', title: 'Tidak ada data untuk ditandai lunas', description: 'Pilih setidaknya satu laporan untuk ditandai lunas.' });
            return;
        }
        setIsMarkingAsPaid(true);
    
        try {
            const paymentDate = new Date();
    
            for (const notaId of selectedNotaIds) {
                const notaDocRef = doc(firestore, 'notas', notaId);
                updateDoc(notaDocRef, {
                    status: 'paid',
                    tanggalPembayaran: paymentDate
                });
            }
    
            const selectedNotas = notas.filter(n => selectedNotaIds.includes(n.id));
            const userMap = new Map(users.map(u => [u.id, u]));
    
            const groupedByUser = selectedNotas.reduce((acc, nota) => {
                const userId = nota.userId;
                if (!acc[userId]) acc[userId] = [];
                acc[userId].push(nota);
                return acc;
            }, {} as Record<string, Nota[]>);
            
            const paidNoticeData: RekapDataItem[] = [];
            const sortedUserIds = Object.keys(groupedByUser).sort((a, b) => (userMap.get(a)?.displayName || '').localeCompare(userMap.get(b)?.displayName || ''));
    
            for (const userId of sortedUserIds) {
                const userNotas = groupedByUser[userId].sort((a, b) => (safeToDate(a.tanggal)?.getTime() ?? 0) - (safeToDate(b.tanggal)?.getTime() ?? 0));
                const user = userMap.get(userId);
                let userSubtotal = 0;
                const userName = (user?.displayName || 'Unknown').replace(/\s/g, '');
                const paymentNumber = user?.paymentInfo || (user as any)?.phone || 'No-Pembayaran';
    
                userNotas.forEach(nota => {
                    paidNoticeData.push({
                        phone: paymentNumber,
                        name: userName,
                        segmen: nota.segmen,
                        tanggal: nota.tanggal?.toDate ? format(nota.tanggal.toDate(), 'dd/MM/yy') : '??/??/??',
                        nominal: nota.nominal,
                        userId: userId,
                    });
                    userSubtotal += nota.nominal;
                });
                if (userNotas.length > 0) {
                     paidNoticeData.push({
                        phone: paymentNumber,
                        name: `TOTAL ${userName}`,
                        segmen: '',
                        tanggal: '',
                        nominal: userSubtotal,
                        userId: userId,
                    });
                }
            }
    
            await sendPaidNotice({
                paidData: paidNoticeData,
                grandTotal: selectedTotal,
                paidDate: format(paymentDate, 'dd MMMM yyyy', { locale: idLocale }),
            });
    
            toast({ 
                title: 'Laporan Telah Ditandai Lunas', 
                description: `${selectedNotaIds.length} laporan telah diperbarui menjadi "paid" dan notifikasi telah dikirim.`,
                duration: 5000,
            });
            
            setIsManualPayDialogOpen(false);
    
        } catch (error: any) {
            console.error('Manual payment marking error:', error);
            toast({ variant: 'destructive', title: 'Gagal Memperbarui Status', description: error.message });
        } finally {
            setIsMarkingAsPaid(false);
        }
    };


    const handleLinkAjaPayment = async () => {
        if (selectedNotaIds.length === 0 || selectedTotal <= 0) {
            toast({ variant: 'destructive', title: 'Tidak ada data pembayaran', description: 'Pilih laporan dengan total lebih dari nol.' });
            return;
        }
        setIsPaying(true);
        try {
            const uniqueInvoiceId = `REKAP-${format(new Date(), 'yyyyMMdd-HHmmss')}`;

            const result = await sendLinkAjaPayment({ 
                amount: selectedTotal,
                description: `Pembayaran rekap untuk ${rekapDateString}`,
                invoiceId: uniqueInvoiceId,
            });

            if (result.success) {
                const paymentDate = new Date();

                toast({ 
                    title: 'Permintaan Pembayaran Diproses', 
                    description: result.redirectUrl ? 'Anda akan diarahkan untuk konfirmasi.' : (result.message || 'Berhasil. Memperbarui status laporan...'),
                    duration: 5000,
                });
                
                for (const notaId of selectedNotaIds) {
                    const notaDocRef = doc(firestore, 'notas', notaId);
                    updateDoc(notaDocRef, {
                        status: 'paid',
                        tanggalPembayaran: paymentDate
                    });
                }

                const selectedNotas = notas.filter(n => selectedNotaIds.includes(n.id));
                const userMap = new Map(users.map(u => [u.id, u]));

                const groupedByUser = selectedNotas.reduce((acc, nota) => {
                    const userId = nota.userId;
                    if (!acc[userId]) acc[userId] = [];
                    acc[userId].push(nota);
                    return acc;
                }, {} as Record<string, Nota[]>);
                
                const paidNoticeData: RekapDataItem[] = [];
                const sortedUserIds = Object.keys(groupedByUser).sort((a,b) => (userMap.get(a)?.displayName || '').localeCompare(userMap.get(b)?.displayName || ''));
        
                for (const userId of sortedUserIds) {
                    const userNotas = groupedByUser[userId].sort((a,b) => (safeToDate(a.tanggal)?.getTime() ?? 0) - (safeToDate(b.tanggal)?.getTime() ?? 0));
                    const user = userMap.get(userId);
                    let userSubtotal = 0;
                    const userName = (user?.displayName || 'Unknown').replace(/\s/g, '');
                    const paymentNumber = user?.paymentInfo || (user as any)?.phone || 'No-Pembayaran';
        
                    userNotas.forEach(nota => {
                        paidNoticeData.push({
                            phone: paymentNumber, name: userName, segmen: nota.segmen,
                            tanggal: nota.tanggal?.toDate ? format(nota.tanggal.toDate(), 'dd/MM/yy') : '??/??/??',
                            nominal: nota.nominal, userId: userId
                        });
                        userSubtotal += nota.nominal;
                    });
                    if (userNotas.length > 0) {
                         paidNoticeData.push({
                            phone: paymentNumber, name: `TOTAL ${userName}`, segmen: '',
                            tanggal: '', nominal: userSubtotal, userId: userId
                        });
                    }
                }
                
                sendPaidNotice({
                    paidData: paidNoticeData,
                    grandTotal: selectedTotal,
                    paidDate: format(paymentDate, 'dd MMMM yyyy', { locale: idLocale }),
                }).catch(err => {
                    console.error("Failed to send paid notification:", err);
                });
                
                if (result.redirectUrl) {
                    window.open(result.redirectUrl, '_blank');
                }
            } else {
                throw new Error(result.message || 'Pembayaran LinkAja/Finpay gagal karena alasan yang tidak diketahui.');
            }
        } catch (error: any) {
            console.error('LinkAja/Finpay payment error:', error);
            toast({ variant: 'destructive', title: 'Gagal Membayar', description: error.message });
        } finally {
            setIsPaying(false);
        }
    }

    const handleSendToTelegram = async () => {
        if (selectedNotaIds.length === 0) {
            toast({ variant: 'destructive', title: 'Tidak ada data', description: 'Pilih setidaknya satu laporan untuk dikirim.' });
            return;
        }
        setIsSending(true);
        try {
            const selectedNotas = notas.filter(n => selectedNotaIds.includes(n.id));
            const userMap = new Map(users.map(u => [u.id, u]));
    
            const groupedByUser = selectedNotas.reduce((acc, nota) => {
                const userId = nota.userId;
                if (!acc[userId]) acc[userId] = [];
                acc[userId].push(nota);
                return acc;
            }, {} as Record<string, Nota[]>);
            
            const telegramRekapData: RekapDataItem[] = [];
            const sortedUserIds = Object.keys(groupedByUser).sort((a,b) => (userMap.get(a)?.displayName || '').localeCompare(userMap.get(b)?.displayName || ''));
    
            for (const userId of sortedUserIds) {
                const userNotas = groupedByUser[userId].sort((a,b) => (safeToDate(a.tanggal)?.getTime() ?? 0) - (safeToDate(b.tanggal)?.getTime() ?? 0));
                const user = userMap.get(userId);
                let userSubtotal = 0;
                const userName = (user?.displayName || 'Unknown').replace(/\s/g, '');
                const paymentNumber = user?.paymentInfo || (user as any)?.phone || 'No-Pembayaran';
    
                userNotas.forEach(nota => {
                    telegramRekapData.push({
                        phone: paymentNumber, name: userName, segmen: nota.segmen,
                        tanggal: nota.tanggal?.toDate ? format(nota.tanggal.toDate(), 'dd/MM/yy') : '??/??/??',
                        nominal: nota.nominal, userId: userId
                    });
                    userSubtotal += nota.nominal;
                });
                if (userNotas.length > 0) {
                     telegramRekapData.push({
                        phone: paymentNumber, name: `TOTAL ${userName}`, segmen: '',
                        tanggal: '', nominal: userSubtotal, userId: userId
                    });
                }
            }

            const result = await sendTelegramReport({ 
                rekapData: telegramRekapData,
                grandTotal: selectedTotal,
                rekapDate: rekapDateString
             });
            if (result.success) {
                toast({ title: 'Terkirim!', description: 'Rekap item terpilih berhasil dikirim ke Telegram.' });
            } else {
                throw new Error(result.error || 'Unknown error');
            }
        } catch (error: any) {
            console.error('Telegram send error:', error);
            toast({ variant: 'destructive', title: 'Gagal Mengirim', description: error.message });
        } finally {
            setIsSending(false);
        }
    };
    
    const isLoading = isUserLoading || isProfileLoading || isNotasLoading || isUsersLoading;
    const isActionInProgress = isSending || isPaying || isMarkingAsPaid;


    if (isLoading || currentUserProfile?.role !== 'admin') {
        return (
            <div className="mx-auto grid w-full flex-1 auto-rows-max gap-6">
                 <div className="flex items-center gap-4">
                     <Skeleton className="h-8 w-8" />
                     <div>
                         <Skeleton className="h-6 w-72" />
                         <Skeleton className="h-4 w-96 mt-1" />
                     </div>
                 </div>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-7 w-64" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-10 w-96" />
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                         <Skeleton className="h-7 w-32" />
                         <Skeleton className="h-4 w-48" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-24 w-full" />
                    </CardContent>
                </Card>
            </div>
        )
    }


    return (
        <div className="mx-auto grid w-full flex-1 auto-rows-max gap-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard">
                    <Button variant="outline" size="icon" className="h-8 w-8">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Kembali</span>
                    </Button>
                </Link>
                <div>
                    <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-bold tracking-tight sm:grow-0">
                        Rekap Laporan Terverifikasi
                    </h1>
                     <p className="text-muted-foreground text-sm">
                        Buat rekap berdasarkan tanggal verifikasi dan kirim ke Telegram.
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Pilih Rentang Tanggal Verifikasi</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-4">
                     <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                id="verified-date-range"
                                variant={"outline"}
                                className={cn(
                                    "w-full max-w-sm justify-start text-left font-normal",
                                    !verificationDateRange && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {verificationDateRange?.from ? (
                                    verificationDateRange.to ? (
                                        <>
                                            {format(verificationDateRange.from, "dd LLL, yy", {locale: idLocale})} -{' '}
                                            {format(verificationDateRange.to, "dd LLL, yy", {locale: idLocale})}
                                        </>
                                    ) : (
                                        format(verificationDateRange.from, "dd LLL, yy", {locale: idLocale})
                                    )
                                ) : (
                                    <span>Pilih rentang tanggal</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={verificationDateRange?.from}
                                selected={verificationDateRange}
                                onSelect={setVerificationDateRange}
                                numberOfMonths={2}
                                captionLayout="dropdown-buttons"
                                fromYear={new Date().getFullYear() - 5}
                                toYear={new Date().getFullYear()}
                            />
                        </PopoverContent>
                    </Popover>
                    <Button onClick={handleGenerateRekap} disabled={isGenerating || isNotasLoading || !verificationDateRange?.from}>
                        {(isGenerating || isNotasLoading) && <Loader2 className="mr-2 animate-spin"/>}
                        Buat Ulang Rekap
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Hasil Rekap</CardTitle>
                    <CardDescription>
                        Laporan untuk {rekapDateString}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isNotasLoading ? (
                         <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-2/3" />
                         </div>
                    ) : (notas && notas.length > 0) ? (
                        <div className="space-y-2 text-sm font-mono bg-muted p-4 rounded-md overflow-x-auto">
                            {rekapData.map((item, index) => {
                                if (item.notaId) {
                                    return (
                                        <div key={`${item.notaId}-${index}`} className="flex items-center gap-3">
                                            <Checkbox
                                                id={item.notaId}
                                                checked={selectedNotaIds.includes(item.notaId)}
                                                onCheckedChange={(checked) => {
                                                    setSelectedNotaIds(prev =>
                                                        checked
                                                            ? [...prev, item.notaId!]
                                                            : prev.filter(id => id !== item.notaId)
                                                    );
                                                }}
                                            />
                                            <Label htmlFor={item.notaId} className="flex-1 cursor-pointer font-normal">
                                                {`${item.phone} ${item.name} ${item.segmen} ${item.tanggal} ${item.nominal.toLocaleString('id-ID')}`}
                                            </Label>
                                        </div>
                                    );
                                }
                                return (
                                    <p key={index} className="font-bold pt-2 mt-2 border-t border-dashed border-muted-foreground/30">
                                        {`${item.phone} ${item.name} ${item.nominal.toLocaleString('id-ID')}`}
                                    </p>
                                )
                            })}
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-center py-8">
                            {verificationDateRange?.from ? 'Tidak ada data terverifikasi untuk rentang tanggal yang dipilih.' : 'Silakan pilih rentang tanggal untuk melihat rekap.'}
                        </p>
                    )}
                </CardContent>
                {(notas && notas.length > 0 && rekapData.length > 0) && (
                     <CardFooter className="border-t pt-6 flex flex-col sm:flex-row gap-4 justify-between items-center">
                        <div className="text-lg font-bold">
                            Total Terpilih: Rp {selectedTotal.toLocaleString('id-ID')}
                            {selectedNotaIds.length !== (notas || []).length && (
                                <span className="text-sm font-normal text-muted-foreground ml-2">
                                    (dari total Rp {grandTotal.toLocaleString('id-ID')})
                                </span>
                            )}
                        </div>
                        <div className="flex flex-wrap justify-end gap-2">
                            <Button onClick={handleSendToTelegram} disabled={isActionInProgress}>
                                {isSending ? <Loader2 className="mr-2 animate-spin"/> : <Bot className="mr-2" />}
                                {isSending ? 'Mengirim...' : 'Kirim ke Telegram'}
                            </Button>
                            
                            <AlertDialog open={isManualPayDialogOpen} onOpenChange={setIsManualPayDialogOpen}>
                                <AlertDialogTrigger asChild>
                                    <Button variant="outline" disabled={isActionInProgress || selectedNotaIds.length === 0}>
                                        <CheckCircle className="mr-2" />
                                        Tandai Lunas (Manual)
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Konfirmasi Pembayaran Manual</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Anda akan menandai {selectedNotaIds.length} laporan dengan total Rp {selectedTotal.toLocaleString('id-ID')} sebagai "LUNAS". Notifikasi akan dikirim ke Telegram. Tindakan ini tidak dapat dibatalkan.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Batal</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleManualPayment} disabled={isMarkingAsPaid}>
                                            {isMarkingAsPaid && <Loader2 className="mr-2 animate-spin"/>}
                                            {isMarkingAsPaid ? 'Memproses...' : 'Ya, Tandai Lunas'}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>

                             <Button onClick={handleLinkAjaPayment} disabled={isActionInProgress || selectedNotaIds.length === 0} variant="destructive">
                                {isPaying ? <Loader2 className="mr-2 animate-spin"/> : <Wallet className="mr-2" />}
                                {isPaying ? 'Membayar...' : 'Bayar via Finpay'}
                            </Button>
                        </div>
                    </CardFooter>
                )}
            </Card>
        </div>
    );
}
