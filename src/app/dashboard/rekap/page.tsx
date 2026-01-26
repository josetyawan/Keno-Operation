'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter as UiTableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { ArrowLeft, CalendarIcon, Printer } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { toWords } from '@/lib/number-to-words';
import type { Nota } from '@/lib/types';

// Type for the original summary report
type RekapItem = {
  keterangan: string;
  jumlah: number;
};

// Type for the "Jasa" detail report
type JasaRekapItem = Nota & {
  dpp: number;
  pph: number;
};

// Type for the BBM detail report
type BbmRekapItem = Nota;

// Type for the new generic detail reports
type DetailRekapItem = Nota & {
  displayKeterangan: string;
};

const bbmReportTypes: Record<string, { title: string, segment: string }> = {
  'bbm-r2': { title: 'Perincian Nota BBM R2', segment: 'BBM R2' },
  'bbm-r4-harian': { title: 'Perincian Nota BBM R4 Harian', segment: 'BBM R4 Harian' },
  'bbm-r4-turlap': { title: 'Perincian Nota BBM R4 Turlap', segment: 'BBM R4 Turlap' },
  'bbm-r4-ut': { title: 'Perincian Nota BBM R4 UT', segment: 'BBM R4 UT' },
};

const detailReportTypes: Record<string, { title: string, segment: string, staticKeterangan?: string }> = {
    'material-sa': {
        title: 'Perincian Nota Material SA Kudus',
        segment: 'MATERIAL SA KUDUS',
        staticKeterangan: 'Material Area Kudus',
    },
    'material-sppg': {
        title: 'Perincian Nota Material SPPG SA Kudus',
        segment: 'MATERIAL SPPG SA KUDUS',
        staticKeterangan: 'Material SPPG SA Kudus',
    },
    'konsumsi-lembur': {
        title: 'Perincian Nota Konsumsi Lembur',
        segment: 'Konsumsi Lembur',
    },
    'konsumsi-ut': {
        title: 'Perincian Nota Konsumsi UT',
        segment: 'Konsumsi UT',
    },
    'konsumsi-turlap': {
        title: 'Perincian Nota Konsumsi Turlap',
        segment: 'Konsumsi Turlap',
    },
    'bbm-genset': {
        title: 'Perincian Nota BBM Genset',
        segment: 'BBM Genset',
    }
};


export default function RekapPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  
  // State for inputs
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [reportType, setReportType] = useState('summary');

  // State for generated report data
  const [summaryData, setSummaryData] = useState<RekapItem[] | null>(null);
  const [summaryTotal, setSummaryTotal] = useState<number>(0);
  const [jasaData, setJasaData] = useState<JasaRekapItem[] | null>(null);
  const [jasaTotal, setJasaTotal] = useState<number>(0);
  const [bbmData, setBbmData] = useState<BbmRekapItem[] | null>(null);
  const [bbmTotal, setBbmTotal] = useState<number>(0);
  const [bbmTitle, setBbmTitle] = useState<string>('');
  const [detailData, setDetailData] = useState<DetailRekapItem[] | null>(null);
  const [detailTotal, setDetailTotal] = useState<number>(0);
  const [detailTitle, setDetailTitle] = useState<string>('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);

  // Fetch all notas in the date range. Filtering by segment will be done on the client.
  const notasQuery = useMemoFirebase(() => {
    if (!startDate || !endDate) return null;
    return query(
      collection(firestore, 'notas'),
      where('tanggal', '>=', Timestamp.fromDate(startOfDay(startDate))),
      where('tanggal', '<=', Timestamp.fromDate(endOfDay(endDate)))
    );
  }, [firestore, startDate, endDate]);

  const { data: notas, isLoading: areNotasLoading } = useCollection<Nota>(notasQuery);

  const isBbmReport = Object.keys(bbmReportTypes).includes(reportType);
  const isDetailReport = Object.keys(detailReportTypes).includes(reportType);

  const handleGenerateRekap = () => {
    if (!startDate || !endDate) {
      toast({
        variant: 'destructive',
        title: 'Tanggal Belum Lengkap',
        description: 'Silakan pilih tanggal mulai dan tanggal akhir.',
      });
      return;
    }
    
    // Reset states before generating new report
    setIsGenerated(false);
    setSummaryData(null);
    setJasaData(null);
    setBbmData(null);
    setDetailData(null);
    setSummaryTotal(0);
    setJasaTotal(0);
    setBbmTotal(0);
    setBbmTitle('');
    setDetailTotal(0);
    setDetailTitle('');

    if (areNotasLoading) return;
    
    if (notas && reportType === 'summary') {
        const grouped = notas.reduce((acc, nota) => {
             const keterangan = (nota.segmen === 'MATERIAL SA KUDUS' || nota.segmen === 'MATERIAL SPPG SA KUDUS')
              ? nota.segmen
              : `${nota.segmen} SA Kudus`;
            if (!acc[keterangan]) {
                acc[keterangan] = 0;
            }
            acc[keterangan] += nota.nominal;
            return acc;
        }, {} as Record<string, number>);

        const rekapArray = Object.entries(grouped).map(([keterangan, jumlah]) => ({
            keterangan,
            jumlah,
        }));
        
        const totalAmount = rekapArray.reduce((sum, item) => sum + item.jumlah, 0);

        setSummaryData(rekapArray);
        setSummaryTotal(totalAmount);
        setIsGenerated(true);

        if (rekapArray.length === 0) {
            toast({
                title: 'Tidak Ada Data',
                description: 'Tidak ada laporan yang ditemukan pada rentang tanggal yang dipilih.',
            });
        }
    } else if (notas && reportType === 'jasa') {
        const filteredJasaNotas = notas.filter(nota => nota.segmen === 'jasa');
        
        const jasaRekapArray = filteredJasaNotas.map(nota => {
            const nominal = nota.nominal;
            const dpp = nominal / 0.98; 
            const pph = dpp * 0.02;     
            return {
                ...nota,
                dpp: Math.round(dpp),
                pph: Math.round(pph),
                nominal: nominal // Here nominal is 'Jumlah'
            };
        });
        
        const totalAmount = jasaRekapArray.reduce((sum, item) => sum + item.nominal, 0);

        setJasaData(jasaRekapArray);
        setJasaTotal(totalAmount);
        setIsGenerated(true);
        
        if (jasaRekapArray.length === 0) {
            toast({
                title: 'Tidak Ada Data',
                description: 'Tidak ada laporan "Jasa" yang ditemukan pada rentang tanggal yang dipilih.',
            });
        }
    } else if (notas && isBbmReport) {
        const config = bbmReportTypes[reportType];
        const filteredBbmNotas = notas.filter(nota => nota.segmen === config.segment);

        filteredBbmNotas.sort((a, b) => a.tanggal.toDate().getTime() - b.tanggal.toDate().getTime());
        
        const totalAmount = filteredBbmNotas.reduce((sum, item) => sum + item.nominal, 0);

        setBbmData(filteredBbmNotas);
        setBbmTotal(totalAmount);
        setBbmTitle(config.title);
        setIsGenerated(true);

        if (filteredBbmNotas.length === 0) {
            toast({
                title: 'Tidak Ada Data',
                description: `Tidak ada laporan "${config.segment}" yang ditemukan pada rentang tanggal yang dipilih.`,
            });
        }
    } else if (notas && isDetailReport) {
        const config = detailReportTypes[reportType];
        const filteredNotas = notas.filter(nota => nota.segmen === config.segment);

        filteredNotas.sort((a, b) => a.tanggal.toDate().getTime() - b.tanggal.toDate().getTime());
    
        const rekapArray = filteredNotas.map(nota => ({
            ...nota,
            displayKeterangan: config.staticKeterangan ?? nota.keterangan ?? '-',
        }));
        
        const totalAmount = rekapArray.reduce((sum, item) => sum + item.nominal, 0);

        setDetailData(rekapArray);
        setDetailTotal(totalAmount);
        setDetailTitle(config.title);
        setIsGenerated(true);

        if (rekapArray.length === 0) {
            toast({
                title: 'Tidak Ada Data',
                description: `Tidak ada laporan "${config.segment}" yang ditemukan.`,
            });
        }
    } else {
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

  // The content to be rendered, either a specific report or nothing
  let reportContent = null;
  if (isGenerated) {
      if (reportType === 'summary' && summaryData) {
          reportContent = (
            <div className="max-w-4xl mx-auto font-serif text-black">
                <div className="text-center mb-8">
                    <h1 className="font-bold text-lg tracking-wider">PERTANGGUNGAN OPERASIONAL</h1>
                    <h2 className="font-bold text-lg tracking-wider">SERVICE AREA KUDUS</h2>
                    <p className="font-bold">PEKERJAAN : SA KUDUS</p>
                    <p className="font-bold">ID PROJECT : -</p>
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
                        {(summaryData && summaryData.length > 0) ? (
                            summaryData.map((item, index) => (
                                <TableRow key={index} className="border-b border-black">
                                    <TableCell className="border-r-2 border-black text-center">{index + 1}</TableCell>
                                    <TableCell className="border-r-2 border-black">{item.keterangan}</TableCell>
                                    <TableCell className="text-right">Rp{item.jumlah.toLocaleString('id-ID')}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                             <TableRow className="border-b border-black">
                                <TableCell colSpan={3} className="text-center h-24">Tidak ada data untuk ditampilkan.</TableCell>
                             </TableRow>
                        )}
                    </TableBody>
                    <UiTableFooter>
                        <TableRow className="bg-yellow-300 border-t-2 border-black">
                            <TableCell colSpan={2} className="text-center font-bold text-black">TOTAL</TableCell>
                            <TableCell className="text-right font-bold text-black">Rp{summaryTotal.toLocaleString('id-ID')}</TableCell>
                        </TableRow>
                    </UiTableFooter>
                </Table>

                <div className="mb-16">
                    <p><span className="font-bold">Terbilang :</span> ({toWords(summaryTotal)} Rupiah)</p>
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
          );
      } else if (reportType === 'jasa' && jasaData) {
          reportContent = (
            <div className="max-w-4xl mx-auto font-serif text-black text-xs">
                <h1 className="font-bold text-base text-center mb-6">Perincian Nota Jasa</h1>
                <Table className="border-2 border-black mb-4">
                    <TableHeader>
                        <TableRow className="border-b-2 border-black bg-yellow-300">
                            <TableHead className="border-r-2 border-black w-[40px] text-black font-bold text-center">No</TableHead>
                            <TableHead className="border-r-2 border-black w-[120px] text-black font-bold text-center">Tanggal</TableHead>
                            <TableHead className="border-r-2 border-black text-black font-bold text-center">Nama Barang</TableHead>
                            <TableHead className="border-r-2 border-black text-black font-bold text-center">Keterangan</TableHead>
                            <TableHead className="border-r-2 border-black w-[110px] text-black font-bold text-center">DPP</TableHead>
                            <TableHead className="border-r-2 border-black w-[100px] text-black font-bold text-center">PPH</TableHead>
                            <TableHead className="w-[110px] text-black font-bold text-center">Jumlah</TableHead>
                        </TableRow>
                    </TableHeader>
                     <TableBody>
                        {(jasaData && jasaData.length > 0) ? (
                            jasaData.map((item, index) => (
                                <TableRow key={item.id} className="border-b border-black">
                                    <TableCell className="border-r-2 border-black text-center">{index + 1}</TableCell>
                                    <TableCell className="border-r-2 border-black text-center">{format(item.tanggal.toDate(), 'dd MMMM yyyy')}</TableCell>
                                    <TableCell className="border-r-2 border-black px-2">{item.namaBarang}</TableCell>
                                    <TableCell className="border-r-2 border-black px-2">{item.keterangan}</TableCell>
                                    <TableCell className="border-r-2 border-black text-right px-2">Rp{item.dpp.toLocaleString('id-ID')}</TableCell>
                                    <TableCell className="border-r-2 border-black text-right px-2">Rp{item.pph.toLocaleString('id-ID')}</TableCell>
                                    <TableCell className="text-right px-2">Rp{item.nominal.toLocaleString('id-ID')}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow className="border-b border-black">
                                <TableCell colSpan={7} className="text-center h-24">Tidak ada data untuk ditampilkan.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                    <UiTableFooter>
                       <TableRow className="bg-yellow-300 border-t-2 border-black">
                            <TableCell colSpan={6} className="text-center font-bold text-black">TOTAL</TableCell>
                            <TableCell className="text-right font-bold text-black px-2">Rp{jasaTotal.toLocaleString('id-ID')}</TableCell>
                        </TableRow>
                    </UiTableFooter>
                </Table>
                
                 <div className="flex justify-between mt-16">
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
          );
      } else if (isBbmReport && bbmData) {
          reportContent = (
            <div className="max-w-4xl mx-auto font-serif text-black text-xs">
                <h1 className="font-bold text-base text-center mb-6">{bbmTitle}</h1>
                <Table className="border-2 border-black mb-4">
                    <TableHeader>
                        <TableRow className="border-b-2 border-black bg-yellow-300">
                            <TableHead className="border-r-2 border-black w-[40px] text-black font-bold text-center">NO</TableHead>
                            <TableHead className="border-r-2 border-black w-[100px] text-black font-bold text-center">TANGGAL</TableHead>
                            <TableHead className="border-r-2 border-black text-black font-bold text-center">NO PLAT</TableHead>
                            <TableHead className="border-r-2 border-black w-[80px] text-black font-bold text-center">KM AWAL</TableHead>
                            <TableHead className="border-r-2 border-black w-[80px] text-black font-bold text-center">KM AKHIR</TableHead>
                            <TableHead className="border-r-2 border-black text-black font-bold text-center">URAIAN PEKERJAAN</TableHead>
                            <TableHead className="border-r-2 border-black w-[100px] text-black font-bold text-center">JUMLAH</TableHead>
                            <TableHead className="w-[120px] text-black font-bold text-center">NAMA</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(!bbmData || bbmData.length === 0) ? (
                            <TableRow className="border-b border-black">
                                <TableCell colSpan={8} className="text-center h-24">Tidak ada data untuk ditampilkan.</TableCell>
                            </TableRow>
                        ) : (
                            bbmData.flatMap((item, index) => [
                                <TableRow key={item.id} className="border-b-0">
                                    <TableCell className="border-r-2 border-black text-center align-top">{index + 1}</TableCell>
                                    <TableCell className="border-r-2 border-black text-center align-top">{format(item.tanggal.toDate(), 'dd/MM/yyyy')}</TableCell>
                                    <TableCell className="border-r-2 border-black px-2 align-top">{item.noPlatKendaraan}</TableCell>
                                    <TableCell className="border-r-2 border-black text-center align-top">{item.kmAwal}</TableCell>
                                    <TableCell className="border-r-2 border-black text-center align-top">{item.kmAkhir}</TableCell>
                                    <TableCell className="border-r-2 border-black px-2 align-top">{item.keterangan}</TableCell>
                                    <TableCell className="border-r-2 border-black text-right align-top px-2">Rp{item.nominal.toLocaleString('id-ID')}</TableCell>
                                    <TableCell className="px-2 align-top">{item.namaPic}</TableCell>
                                </TableRow>,
                                <TableRow key={`${item.id}-jumlah`} className="border-b-2 border-black">
                                    <TableCell colSpan={6} className="border-r-2 border-black text-center font-bold">JUMLAH</TableCell>
                                    <TableCell className="text-right font-bold px-2 border-r-2 border-black">Rp{item.nominal.toLocaleString('id-ID')}</TableCell>
                                    <TableCell></TableCell>
                                </TableRow>
                            ])
                        )}
                    </TableBody>
                    <UiTableFooter>
                       <TableRow className="bg-yellow-300 border-t-2 border-black">
                            <TableCell colSpan={6} className="text-center font-bold text-black">TOTAL</TableCell>
                            <TableCell className="text-right font-bold text-black px-2 border-r-2 border-black">Rp{bbmTotal.toLocaleString('id-ID')}</TableCell>
                            <TableCell></TableCell>
                        </TableRow>
                    </UiTableFooter>
                </Table>
                
                 <div className="flex justify-between mt-16">
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
          );
      } else if (isDetailReport && detailData) {
          reportContent = (
            <div className="max-w-4xl mx-auto font-serif text-black text-xs">
                <h1 className="font-bold text-base text-center mb-6">{detailTitle}</h1>
                <Table className="border-2 border-black mb-4">
                    <TableHeader>
                        <TableRow className="border-b-2 border-black bg-yellow-300">
                            <TableHead className="border-r-2 border-black w-[40px] text-black font-bold text-center">NO</TableHead>
                            <TableHead className="border-r-2 border-black w-[120px] text-black font-bold text-center">TANGGAL</TableHead>
                            <TableHead className="border-r-2 border-black text-black font-bold text-center">Nama Barang</TableHead>
                            <TableHead className="border-r-2 border-black text-black font-bold text-center">Keterangan</TableHead>
                            <TableHead className="w-[110px] text-black font-bold text-center">Jumlah</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(detailData && detailData.length > 0) ? (
                            detailData.map((item, index) => (
                                <TableRow key={item.id} className="border-b border-black">
                                    <TableCell className="border-r-2 border-black text-center">{index + 1}</TableCell>
                                    <TableCell className="border-r-2 border-black text-center">{format(item.tanggal.toDate(), 'dd MMMM yyyy')}</TableCell>
                                    <TableCell className="border-r-2 border-black px-2">{item.namaBarang}</TableCell>
                                    <TableCell className="border-r-2 border-black px-2">{item.displayKeterangan}</TableCell>
                                    <TableCell className="text-right px-2">Rp{item.nominal.toLocaleString('id-ID')}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow className="border-b border-black">
                                <TableCell colSpan={5} className="text-center h-24">Tidak ada data untuk ditampilkan.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                    <UiTableFooter>
                        <TableRow className="bg-yellow-300 border-t-2 border-black">
                            <TableCell colSpan={4} className="text-center font-bold text-black">TOTAL</TableCell>
                            <TableCell className="text-right font-bold text-black px-2">Rp{detailTotal.toLocaleString('id-ID')}</TableCell>
                        </TableRow>
                    </UiTableFooter>
                </Table>
                <div className="flex justify-between mt-16">
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
          );
      } else {
          reportContent = (
              <div className="text-center py-10">Tidak ada data untuk ditampilkan pada kriteria yang dipilih.</div>
          )
      }
  }


  return (
    <>
      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 20mm;
        }
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
            padding: 0;
            margin: 0;
          }
          .bg-yellow-300 {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background-color: #fde047 !important; /* Tailwind yellow-300 hex */
          }
          .bg-gray-100 {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background-color: #f3f4f6 !important; /* Tailwind gray-100 hex */
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
            <CardTitle>Pilih Filter Laporan</CardTitle>
            <CardDescription>
              Pilih jenis laporan dan rentang tanggal untuk membuat laporan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="grid gap-2">
                    <Label>Jenis Laporan</Label>
                    <Select value={reportType} onValueChange={setReportType}>
                        <SelectTrigger>
                            <SelectValue placeholder="Pilih jenis laporan" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="summary">Rekapitulasi (Ringkasan)</SelectItem>
                            <SelectItem value="jasa">Perincian Nota Jasa</SelectItem>
                            <SelectItem value="material-sa">Perincian Nota Material SA Kudus</SelectItem>
                            <SelectItem value="material-sppg">Perincian Nota Material SPPG SA Kudus</SelectItem>
                            <SelectItem value="konsumsi-lembur">Perincian Nota Konsumsi Lembur</SelectItem>
                            <SelectItem value="konsumsi-ut">Perincian Nota Konsumsi UT</SelectItem>
                            <SelectItem value="konsumsi-turlap">Perincian Nota Konsumsi Turlap</SelectItem>
                            <SelectItem value="bbm-genset">Perincian Nota BBM Genset</SelectItem>
                            <SelectItem value="bbm-r2">Perincian Nota BBM R2</SelectItem>
                            <SelectItem value="bbm-r4-harian">Perincian Nota BBM R4 Harian</SelectItem>
                            <SelectItem value="bbm-r4-turlap">Perincian Nota BBM R4 Turlap</SelectItem>
                            <SelectItem value="bbm-r4-ut">Perincian Nota BBM R4 UT</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
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
      </div>
      
      {isGenerated && (
          <Card className="mt-6 print:shadow-none print:border-none">
            <CardHeader className="print:hidden">
              <CardTitle>Pratinjau Laporan</CardTitle>
              <CardDescription>Ini adalah pratinjau dari laporan yang akan dicetak. Klik tombol cetak untuk hasil akhir.</CardDescription>
            </CardHeader>
            <CardContent id="printable-area" className="bg-white text-black p-8">
                {reportContent}
            </CardContent>
            <CardFooter className="print:hidden justify-end">
              <Button onClick={handlePrint} disabled={!reportContent || (reportType === 'jasa' && !jasaData?.length) || (reportType === 'summary' && !summaryData?.length) || (isBbmReport && (!bbmData || bbmData.length === 0)) || (isDetailReport && (!detailData || detailData.length === 0))}><Printer className="mr-2 h-4 w-4" /> Cetak Laporan</Button>
            </CardFooter>
          </Card>
      )}
    </>
  );
}
