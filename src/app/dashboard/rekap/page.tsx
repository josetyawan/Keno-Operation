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
import { ArrowLeft, Calendar as CalendarIcon, Loader2, Bot, Wallet } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { format, startOfDay, endOfDay } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { Nota, UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { sendTelegramReport } from '@/ai/flows/send-telegram-report';
import { sendLinkAjaPayment } from '@/ai/flows/send-linkaja-payment';

type RekapDataItem = {
    phone: string;
    name: string;
    segmen: string;
    tanggal: string;
    nominal: number;
    userId: string;
};

export default function RekapPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [verificationDate, setVerificationDate] = useState<Date | undefined>();
    const [rekapData, setRekapData] = useState<RekapDataItem[]>([]);
    const [grandTotal, setGrandTotal] = useState(0);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [isPaying, setIsPaying] = useState(false);

    useEffect(() => {
        // Set initial date on client-side to avoid hydration mismatch
        if (!verificationDate) {
            setVerificationDate(new Date());
        }
    }, [verificationDate]);

    const notasQuery = useMemoFirebase(() => {
        if (!verificationDate) return null;
        const start = startOfDay(verificationDate);
        const end = endOfDay(verificationDate);
        return query(
            collection(firestore, 'notas'),
            where('tanggalVerifikasi', '>=', Timestamp.fromDate(start)),
            where('tanggalVerifikasi', '<=', Timestamp.fromDate(end))
        );
    }, [firestore, verificationDate]);

    const { data: notasFromQuery, isLoading: isNotasLoading } = useCollection<Nota>(notasQuery);

    const notas = useMemo(() => {
        if (!notasFromQuery) return [];
        // Also filter by status client-side to be safe
        return notasFromQuery.filter(nota => nota.status === 'verified');
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
            return
        };
        setIsGenerating(true);

        const userMap = new Map(users.map(u => [u.id, u]));

        const formattedData: RekapDataItem[] = notas.map(nota => {
            const user = userMap.get(nota.userId);
            return {
                phone: user?.phone || 'No-Pembayaran',
                name: (nota.namaPic || '').replace(/\s/g, ''),
                segmen: (nota.segmen || '').replace(/\s/g, ''),
                tanggal: format(nota.tanggal.toDate(), 'dd/MM/yy'),
                nominal: nota.nominal,
                userId: nota.userId,
            };
        }).sort((a,b) => a.name.localeCompare(b.name));
        
        const total = notas.reduce((sum, item) => sum + item.nominal, 0);

        setRekapData(formattedData);
        setGrandTotal(total);
        setIsGenerating(false);
    };
    
    useEffect(() => {
        if(notas && users) {
           handleGenerateRekap();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [notas, users]);

    const handleLinkAjaPayment = async () => {
        if (rekapData.length === 0 || grandTotal <= 0) {
            toast({ variant: 'destructive', title: 'Tidak ada data pembayaran', description: 'Pastikan ada rekap dengan total lebih dari nol.' });
            return;
        }
        setIsPaying(true);
        try {
            // Logika saat ini adalah membuat satu pembayaran untuk total keseluruhan.
            // Anda mungkin perlu logika yang lebih kompleks untuk membayar setiap individu.
            const uniqueInvoiceId = `REKAP-${format(new Date(), 'yyyyMMdd-HHmmss')}`;

            const result = await sendLinkAjaPayment({ 
                amount: grandTotal,
                description: `Pembayaran rekap tanggal ${verificationDate ? format(verificationDate, 'dd/MM/yyyy') : 'N/A'}`,
                invoiceId: uniqueInvoiceId,
            });

            if (result.success) {
                toast({ title: 'Pembayaran Diproses', description: result.message });
                 if (result.redirectUrl) {
                    // Jika API mengembalikan URL, arahkan pengguna ke sana
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
        if (rekapData.length === 0) {
            toast({ variant: 'destructive', title: 'Tidak ada data', description: 'Buat rekap terlebih dahulu.' });
            return;
        }
        setIsSending(true);
        try {
            const result = await sendTelegramReport({ 
                rekapData: rekapData.map(({ phone, name, segmen, tanggal, nominal }) => ({ phone, name, segmen, tanggal, nominal })),
                grandTotal,
                rekapDate: verificationDate ? format(verificationDate, 'dd MMMM yyyy', {locale: idLocale}) : 'N/A'
             });
            if (result.success) {
                toast({ title: 'Terkirim!', description: 'Rekap berhasil dikirim ke Telegram.' });
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
    
    const isLoading = isNotasLoading || isUsersLoading;

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
                    <CardTitle>Pilih Tanggal Verifikasi</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-4">
                     <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            variant={'outline'}
                            className={cn(
                            'w-[280px] justify-start text-left font-normal',
                            !verificationDate && 'text-muted-foreground'
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {verificationDate ? format(verificationDate, 'PPP', {locale: idLocale}) : <span>Pilih tanggal verifikasi...</span>}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={verificationDate}
                            onSelect={setVerificationDate}
                            initialFocus
                        />
                        </PopoverContent>
                    </Popover>
                    <Button onClick={handleGenerateRekap} disabled={isGenerating || isLoading}>
                        {(isGenerating || isLoading) && <Loader2 className="mr-2 animate-spin"/>}
                        Buat Ulang Rekap
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Hasil Rekap</CardTitle>
                    <CardDescription>
                        Laporan untuk tanggal {verificationDate ? format(verificationDate, 'dd MMMM yyyy', {locale: idLocale}) : '...'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                         <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-2/3" />
                         </div>
                    ) : (notas && notas.length > 0) ? (
                        <div className="space-y-2 text-sm font-mono bg-muted p-4 rounded-md overflow-x-auto">
                            {rekapData.map((item, index) => (
                                <p key={index}>
                                    {`${item.phone} ${item.name} ${item.segmen} ${item.tanggal} ${item.nominal}`}
                                </p>
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-center py-8">Tidak ada data terverifikasi untuk tanggal yang dipilih.</p>
                    )}
                </CardContent>
                {(notas && notas.length > 0 && rekapData.length > 0) && (
                     <CardFooter className="border-t pt-6 flex flex-col sm:flex-row gap-4 justify-between items-center">
                        <div className="text-lg font-bold">
                            Total: Rp {grandTotal.toLocaleString('id-ID')}
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={handleSendToTelegram} disabled={isSending}>
                                {isSending ? <Loader2 className="mr-2 animate-spin"/> : <Bot className="mr-2" />}
                                {isSending ? 'Mengirim...' : 'Kirim ke Telegram'}
                            </Button>
                             <Button onClick={handleLinkAjaPayment} disabled={isPaying} variant="destructive">
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
