
'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { ArrowLeft, CalendarIcon, Printer } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { toWords } from '@/lib/number-to-words';
import type { Nota } from '@/lib/types';
import { Logo } from '@/components/logo';

type RekapItem = {
  keterangan: string;
  jumlah: number;
};

export default function RekapPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [rekapData, setRekapData] = useState<RekapItem[] | null>(null);
  const [total, setTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);

  const notasQuery = useMemoFirebase(() => {
    if (!startDate || !endDate) return null;
    return query(
      collection(firestore, 'notas'),
      where('tanggal', '>=', Timestamp.fromDate(startOfDay(startDate))),
      where('tanggal', '<=', Timestamp.fromDate(endOfDay(endDate)))
    );
  }, [firestore, startDate, endDate]);

  const { data: notas, isLoading: areNotasLoading } = useCollection<Nota>(
    notasQuery
  );

  const handleGenerateRekap = () => {
    if (!startDate || !endDate) {
      toast({
        variant: 'destructive',
        title: 'Tanggal Belum Lengkap',
        description: 'Silakan pilih tanggal mulai dan tanggal akhir.',
      });
      return;
    }

    if (notas) {
      const grouped = notas.reduce((acc, nota) => {
        const segmen = nota.segmen || 'Lain-lain';
        if (!acc[segmen]) {
          acc[segmen] = 0;
        }
        acc[segmen] += nota.nominal;
        return acc;
      }, {} as Record<string, number>);

      const rekapArray = Object.entries(grouped).map(([keterangan, jumlah]) => ({
        keterangan,
        jumlah,
      }));

      const totalAmount = rekapArray.reduce((sum, item) => sum + item.jumlah, 0);

      setRekapData(rekapArray);
      setTotal(totalAmount);
      setIsGenerated(true);
    } else if (!areNotasLoading) {
      // Handle case where there are no notas in the date range
      setRekapData([]);
      setTotal(0);
      setIsGenerated(true);
      toast({
        title: 'Tidak Ada Data',
        description: 'Tidak ada laporan yang ditemukan pada rentang tanggal yang dipilih.',
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };
  
  const today = new Date();

  return (
    <>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-area,
          #printable-area * {
            visibility: visible;
          }
          #printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
          }
        }
      `}</style>
      <div className="mx-auto grid w-full flex-1 auto-rows-max gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Kembali</span>
            </Button>
          </Link>
          <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-bold tracking-tight sm:grow-0">
            Buat Laporan Rekapitulasi
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pilih Rentang Tanggal</CardTitle>
            <CardDescription>
              Pilih tanggal mulai dan akhir untuk membuat laporan rekapitulasi.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="grid gap-2">
                <Label>Tanggal Mulai</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant={'outline'} className="justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, 'dd MMMM yyyy') : 'Pilih tanggal'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-2">
                <Label>Tanggal Akhir</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant={'outline'} className="justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, 'dd MMMM yyyy') : 'Pilih tanggal'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <Button onClick={handleGenerateRekap} disabled={areNotasLoading}>
              {areNotasLoading ? 'Memuat...' : 'Buat Laporan'}
            </Button>
          </CardContent>
        </Card>
        
        {isGenerated && (
          <div className="flex justify-end">
            <Button onClick={handlePrint}><Printer className="mr-2 h-4 w-4" /> Cetak Laporan</Button>
          </div>
        )}
      </div>

      {isGenerated && rekapData && (
        <div id="printable-area" className="w-full bg-white text-black p-8 hidden print:block">
            <div className="max-w-4xl mx-auto font-serif">
                <div className="text-center mb-8">
                    <h1 className="font-bold text-lg">PERTANGGUNGAN OPERASIONAL</h1>
                    <h2 className="font-bold text-lg">SERVICE AREA KUDUS</h2>
                    <p className="font-bold">PEKERJAAN: SA KUDUS</p>
                    <p className="font-bold">ID PROJECT: -</p>
                </div>

                <Table className="border-2 border-black mb-4">
                    <TableHeader>
                        <TableRow className="border-b-2 border-black bg-yellow-300">
                            <TableHead className="border-r-2 border-black w-[50px] text-black font-bold text-center">NO</TableHead>
                            <TableHead className="border-r-2 border-black text-black font-bold text-center">KETERANGAN</TableHead>
                            <TableHead className="text-black font-bold text-center">JUMLAH</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rekapData.map((item, index) => (
                            <TableRow key={index} className="border-b border-black">
                                <TableCell className="border-r-2 border-black text-center">{index + 1}</TableCell>
                                <TableCell className="border-r-2 border-black">{item.keterangan}</TableCell>
                                <TableCell className="text-right">Rp{item.jumlah.toLocaleString('id-ID')}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                    <TableFooter>
                        <TableRow className="bg-yellow-300">
                            <TableCell colSpan={2} className="text-center font-bold">TOTAL</TableCell>
                            <TableCell className="text-right font-bold">Rp{total.toLocaleString('id-ID')}</TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>

                <div className="mb-16">
                    <p>Terbilang : ({toWords(total)} Rupiah)</p>
                </div>

                <div className="flex justify-between">
                    <div className="text-center">
                        <p>Menyetujui,</p>
                        <div className="h-20"></div>
                        <p className="underline">Lutfi Akhmad</p>
                        <p>HSA Kudus</p>
                    </div>
                    <div className="text-center">
                        <p>Kudus, {format(today, 'dd MMMM yyyy')}</p>
                        <p>Pembuat Rincian</p>
                        <div className="h-20"></div>
                        <p className="underline">Joko Wahyu Setyawan</p>
                        <p>Officer Kudus</p>
                    </div>
                </div>
            </div>
        </div>
      )}
    </>
  );
}
