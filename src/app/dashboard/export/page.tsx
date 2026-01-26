'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import { ArrowLeft, Edit, Trash2, Filter, FileText, Printer, FileArchive, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { format, getMonth, getYear, isSameDay } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { Nota } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';
import { useToast } from '@/hooks/use-toast';
import { toWords } from '@/lib/number-to-words';
import Image from 'next/image';

// --- Report Generation Logic ---
const generateRekapitulasiReport = (notas: Nota[], month: string, year: string): string => {
    const groupedBySegmen = notas.reduce((acc, nota) => {
        const key = nota.segmen;
        if (!acc[key]) {
            acc[key] = { items: [], total: 0 };
        }
        acc[key].items.push(nota);
        acc[key].total += nota.nominal;
        return acc;
    }, {} as Record<string, { items: Nota[], total: number }>);

    let grandTotal = 0;
    const tableRows = Object.entries(groupedBySegmen).map(([segmen, data], index) => {
        grandTotal += data.total;
        return `
            <tr style="background-color: #fef9c3;">
                <td style="padding: 8px; border: 1px solid black; text-align: center;">${index + 1}</td>
                <td style="padding: 8px; border: 1px solid black;">${segmen}</td>
                <td style="padding: 8px; border: 1px solid black; text-align: right;">Rp ${data.total.toLocaleString('id-ID')}</td>
            </tr>
        `;
    }).join('');

    return `
    <div style="font-family: Arial, sans-serif; color: black; font-size: 11pt;">
        <h2 style="text-align: center; font-size: 14pt; margin: 0; text-decoration: underline;">REKAPITULASI</h2>
        <p style="text-align: center; margin:0; font-size: 12pt;">Bulan: ${month} ${year}</p>
        <br/>
        <table style="width: 100%; border-collapse: collapse; border: 2px solid black;">
            <thead>
                <tr>
                    <th style="padding: 8px; border: 1px solid black; width: 5%;">NO</th>
                    <th style="padding: 8px; border: 1px solid black;">URAIAN</th>
                    <th style="padding: 8px; border: 1px solid black; width: 25%;">JUMLAH (Rp)</th>
                </tr>
            </thead>
            <tbody>
                ${tableRows}
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="2" style="padding: 8px; border: 1px solid black; font-weight: bold; text-align: right;">TOTAL</td>
                    <td style="padding: 8px; border: 1px solid black; font-weight: bold; text-align: right;">Rp ${grandTotal.toLocaleString('id-ID')}</td>
                </tr>
            </tfoot>
        </table>
        <div style="margin-top: 20px;">
            <p style="margin: 0; font-style: italic; font-weight: bold;">Terbilang: ${toWords(grandTotal)} Rupiah</p>
        </div>
        <br/><br/>
        <table style="width: 100%; text-align: center;">
            <tr>
                <td style="width: 50%;">
                    <p>Disetujui,</p>
                    <br/><br/><br/><br/>
                    <p style="text-decoration: underline; font-weight: bold;">(___________________)</p>
                </td>
                <td style="width: 50%;">
                    <p>Yang Membuat</p>
                    <br/><br/><br/><br/>
                    <p style="text-decoration: underline; font-weight: bold;">(___________________)</p>
                </td>
            </tr>
        </table>
    </div>`;
};

const generateJasaReport = (notas: Nota[], title: string): string => {
    let grandTotal = 0;
    const tableRows = notas.map((nota, index) => {
        const dpp = nota.nominal / 1.02;
        const pph = nota.nominal - dpp;
        grandTotal += nota.nominal;
        return `
        <tr>
            <td style="padding: 4px; border: 1px solid black; text-align: center;">${index + 1}</td>
            <td style="padding: 4px; border: 1px solid black;">${format(nota.tanggal.toDate(), 'dd/MM/yyyy')}</td>
            <td style="padding: 4px; border: 1px solid black;">${nota.keterangan || nota.namaBarang || '-'}</td>
            <td style="padding: 4px; border: 1px solid black; text-align: right;">${dpp.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td style="padding: 4px; border: 1px solid black; text-align: right;">${ph.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td style="padding: 4px; border: 1px solid black; text-align: right;">${nota.nominal.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
        `;
    }).join('');

    return `
    <div style="font-family: Arial, sans-serif; color: black; font-size: 11pt;">
        <h2 style="text-align: center; font-size: 14pt; margin: 0; text-decoration: underline;">${title.toUpperCase()}</h2>
        <br/>
        <table style="width: 100%; border-collapse: collapse; border: 2px solid black; font-size: 9pt;">
            <thead>
                <tr>
                    <th style="padding: 4px; border: 1px solid black; width: 5%;">NO</th>
                    <th style="padding: 4px; border: 1px solid black; width: 10%;">TANGGAL</th>
                    <th style="padding: 4px; border: 1px solid black;">KETERANGAN</th>
                    <th style="padding: 4px; border: 1px solid black; width: 15%;">DPP</th>
                    <th style="padding: 4px; border: 1px solid black; width: 15%;">PPH 2%</th>
                    <th style="padding: 4px; border: 1px solid black; width: 20%;">JUMLAH (Rp)</th>
                </tr>
            </thead>
            <tbody>${tableRows}</tbody>
            <tfoot>
                <tr>
                    <td colspan="5" style="padding: 4px; border: 1px solid black; font-weight: bold; text-align: right;">TOTAL</td>
                    <td style="padding: 4px; border: 1px solid black; font-weight: bold; text-align: right;">${grandTotal.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
            </tfoot>
        </table>
         <div style="margin-top: 20px;">
            <p style="margin: 0; font-style: italic; font-weight: bold;">Terbilang: ${toWords(Math.floor(grandTotal))} Rupiah</p>
        </div>
        <br/><br/>
        <table style="width: 100%; text-align: center;">
            <tr>
                <td style="width: 50%;"><p>Disetujui,</p><br/><br/><br/><br/><p style="text-decoration: underline; font-weight: bold;">(___________________)</p></td>
                <td style="width: 50%;"><p>Yang Membuat</p><br/><br/><br/><br/><p style="text-decoration: underline; font-weight: bold;">(___________________)</p></td>
            </tr>
        </table>
    </div>`;
};


const generateBBMReport = (notas: Nota[], title: string): string => {
    let grandTotal = 0;
    const tableRows = notas.map((nota, index) => {
        grandTotal += nota.nominal;
        return `
        <tr>
            <td style="padding: 4px; border: 1px solid black; text-align: center;">${index + 1}</td>
            <td style="padding: 4px; border: 1px solid black;">${format(nota.tanggal.toDate(), 'dd-MMM-yy', { locale: idLocale })}</td>
            <td style="padding: 4px; border: 1px solid black;">${nota.noPlatKendaraan || '-'}</td>
            <td style="padding: 4px; border: 1px solid black; text-align: center;">${nota.kmAwal || '-'}</td>
            <td style="padding: 4px; border: 1px solid black; text-align: center;">${nota.kmAkhir || '-'}</td>
            <td style="padding: 4px; border: 1px solid black;">${nota.keterangan || '-'}</td>
            <td style="padding: 4px; border: 1px solid black; text-align: right;">${nota.nominal.toLocaleString('id-ID')}</td>
            <td style="padding: 4px; border: 1px solid black;">${nota.namaPic}</td>
        </tr>
        <tr style="background-color: #fef9c3;">
            <td colspan="6" style="padding: 4px; border: 1px solid black; font-weight: bold; text-align: right;">JUMLAH</td>
            <td style="padding: 4px; border: 1px solid black; font-weight: bold; text-align: right;">${nota.nominal.toLocaleString('id-ID')}</td>
            <td style="padding: 4px; border: 1px solid black;"></td>
        </tr>`;
    }).join('');

    return `
    <div style="font-family: Arial, sans-serif; color: black; font-size: 11pt;">
        <h2 style="text-align: center; font-size: 14pt; margin: 0; text-decoration: underline;">${title.toUpperCase()}</h2>
        <br/>
        <table style="width: 100%; border-collapse: collapse; border: 2px solid black; font-size: 9pt;">
            <thead>
                <tr>
                    ${['NO', 'TANGGAL', 'NO PLAT', 'KM AWAL', 'KM AKHIR', 'URAIAN PEKERJAAN', 'JUMLAH', 'NAMA'].map(h => `<th style="padding: 4px; border: 1px solid black;">${h}</th>`).join('')}
                </tr>
            </thead>
            <tbody>${tableRows}</tbody>
            <tfoot>
                <tr>
                    <td colspan="6" style="padding: 4px; border: 1px solid black; font-weight: bold; text-align: right;">TOTAL</td>
                    <td style="padding: 4px; border: 1px solid black; font-weight: bold; text-align: right;">${grandTotal.toLocaleString('id-ID')}</td>
                    <td style="padding: 4px; border: 1px solid black;"></td>
                </tr>
            </tfoot>
        </table>
         <div style="margin-top: 20px;">
            <p style="margin: 0; font-style: italic; font-weight: bold;">Terbilang: ${toWords(grandTotal)} Rupiah</p>
        </div>
        <br/><br/>
        <table style="width: 100%; text-align: center;">
            <tr>
                <td style="width: 50%;"><p>Disetujui,</p><br/><br/><br/><br/><p style="text-decoration: underline; font-weight: bold;">(___________________)</p></td>
                <td style="width: 50%;"><p>Yang Membuat</p><br/><br/><br/><br/><p style="text-decoration: underline; font-weight: bold;">(___________________)</p></td>
            </tr>
        </table>
    </div>`;
};

const generateMaterialReport = (notas: Nota[], title: string): string => {
    let grandTotal = 0;
    const tableRows = notas.map((nota, index) => {
        grandTotal += nota.nominal;
        return `
        <tr>
            <td style="padding: 4px; border: 1px solid black; text-align: center;">${index + 1}</td>
            <td style="padding: 4px; border: 1px solid black;">${format(nota.tanggal.toDate(), 'dd/MM/yyyy')}</td>
            <td style="padding: 4px; border: 1px solid black;">${nota.namaBarang || '-'}</td>
            <td style="padding: 4px; border: 1px solid black;">${nota.keterangan || '-'}</td>
            <td style="padding: 4px; border: 1px solid black; text-align: right;">${nota.nominal.toLocaleString('id-ID')}</td>
        </tr>`;
    }).join('');

    return `
    <div style="font-family: Arial, sans-serif; color: black; font-size: 11pt;">
        <h2 style="text-align: center; font-size: 14pt; margin: 0; text-decoration: underline;">${title.toUpperCase()}</h2>
        <br/>
        <table style="width: 100%; border-collapse: collapse; border: 2px solid black; font-size: 9pt;">
            <thead>
                <tr>
                    ${['NO', 'TANGGAL', 'Nama Barang', 'Keterangan', 'Jumlah'].map(h => `<th style="padding: 4px; border: 1px solid black;">${h}</th>`).join('')}
                </tr>
            </thead>
            <tbody>${tableRows}</tbody>
            <tfoot>
                <tr>
                    <td colspan="4" style="padding: 4px; border: 1px solid black; font-weight: bold; text-align: right;">TOTAL</td>
                    <td style="padding: 4px; border: 1px solid black; font-weight: bold; text-align: right;">${grandTotal.toLocaleString('id-ID')}</td>
                </tr>
            </tfoot>
        </table>
         <div style="margin-top: 20px;">
            <p style="margin: 0; font-style: italic; font-weight: bold;">Terbilang: ${toWords(grandTotal)} Rupiah</p>
        </div>
        <br/><br/>
        <table style="width: 100%; text-align: center;">
            <tr>
                <td style="width: 50%;"><p>Disetujui,</p><br/><br/><br/><br/><p style="text-decoration: underline; font-weight: bold;">(___________________)</p></td>
                <td style="width: 50%;"><p>Yang Membuat</p><br/><br/><br/><br/><p style="text-decoration: underline; font-weight: bold;">(___________________)</p></td>
            </tr>
        </table>
    </div>`;
};

const generateEvidenReport = (notas: Nota[], title: string): string => {
    const tableRows = notas.map((nota, index) => {
        const keperluanImages = (nota.fotoEvidenUrls || []).slice(0, 4).map(url =>
            `<div style="width: 100px; height: 100px; overflow: hidden; border: 1px solid #ccc; background-image: url(${url}); background-size: cover; background-position: center;"></div>`
        ).join('');

        return `
        <tr>
            <td style="border: 1px solid black; padding: 4px; text-align: center;">${index + 1}</td>
            <td style="border: 1px solid black; padding: 4px;">${format(nota.tanggal.toDate(), 'dd-MMM-yy')}</td>
            <td style="border: 1px solid black; padding: 4px;">${nota.keterangan || '-'}</td>
            <td style="border: 1px solid black; padding: 4px;">${nota.noPlatKendaraan || '-'}</td>
            <td style="border: 1px solid black; padding: 4px; text-align: center;">${(nota.kmAkhir || 0) - (nota.kmAwal || 0)}</td>
            <td style="border: 1px solid black; padding: 4px; text-align: center;">${nota.kmAwal || '-'}</td>
            <td style="border: 1px solid black; padding: 4px; text-align: center;">${nota.kmAkhir || '-'}</td>
            <td style="border: 1px solid black; padding: 4px;"><div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">${keperluanImages}</div></td>
            <td style="border: 1px solid black; padding: 4px; text-align: center;">${nota.fotoEvidenUrls?.[4] ? `<div style="width: 100px; height: 100px; overflow: hidden; margin: auto; border: 1px solid #ccc; background-image: url(${nota.fotoEvidenUrls[4]}); background-size: cover; background-position: center;"></div>` : ''}</td>
            <td style="border: 1px solid black; padding: 4px; text-align: center;">${nota.fotoEvidenUrls?.[5] ? `<div style="width: 100px; height: 100px; overflow: hidden; margin: auto; border: 1px solid #ccc; background-image: url(${nota.fotoEvidenUrls[5]}); background-size: cover; background-position: center;"></div>` : ''}</td>
            <td style="border: 1px solid black; padding: 4px; text-align: center;">${nota.fotoEvidenUrls?.[6] ? `<div style="width: 100px; height: 100px; overflow: hidden; margin: auto; border: 1px solid #ccc; background-image: url(${nota.fotoEvidenUrls[6]}); background-size: cover; background-position: center;"></div>` : ''}</td>
            <td style="border: 1px solid black; padding: 4px;">${nota.namaPic}</td>
            <td style="border: 1px solid black; padding: 4px; text-align: right;">${nota.nominal.toLocaleString('id-ID')}</td>
        </tr>`;
    }).join('');

     return `
    <div style="font-family: Arial, sans-serif; color: black; font-size: 9pt;">
        <h2 style="text-align: center; font-size: 14pt; margin: 0; text-decoration: underline;">${title.toUpperCase()}</h2>
        <br/>
        <table style="width: 100%; border-collapse: collapse; border: 2px solid black;">
            <thead>
                <tr>
                    ${['No', 'Tanggal', 'Ket', 'No Plat', 'Selisih', 'KM Awal', 'KM Akhir', 'Keperluan (1-4)', 'Eviden KM Awal Bln', 'Eviden KM Awal', 'Eviden KM Akhir', 'PIC', 'Nilai'].map(h => `<th style="border: 1px solid black; padding: 4px; font-size: 8pt;">${h}</th>`).join('')}
                </tr>
            </thead>
            <tbody>${tableRows}</tbody>
        </table>
    </div>`;
};

// --- Preview Component ---
function ReportPreview({
  htmlContent,
  onClose,
}: {
  htmlContent: string;
  onClose: () => void;
}) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex justify-center items-center p-4 print:p-0 print:bg-white">
        <style>
            {`
            @media print {
                body * {
                    visibility: hidden;
                }
                #print-section, #print-section * {
                    visibility: visible;
                }
                #print-section {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                }
                @page {
                    size: A4 portrait;
                    margin: 1cm;
                }
                .no-print {
                    display: none !important;
                }
            }
            `}
        </style>
      <Card className="w-full max-w-5xl h-[90vh] flex flex-col no-print">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Pratinjau Laporan</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Tutup</Button>
            <Button onClick={handlePrint}><Printer className="mr-2" /> Cetak</Button>
          </div>
        </CardHeader>
        <CardContent className="flex-grow overflow-auto bg-gray-200 p-4">
            <div id="print-section" ref={printRef} className="bg-white shadow-lg p-8 mx-auto" style={{width: '210mm', minHeight: '297mm'}} dangerouslySetInnerHTML={{ __html: htmlContent }} />
        </CardContent>
      </Card>
    </div>
  );
}


const getMonthYearOptions = (notas: Nota[]) => {
    const monthYears = new Set<string>();
    notas.forEach(nota => {
        if (nota.tanggal?.toDate) {
            const date = nota.tanggal.toDate();
            monthYears.add(format(date, 'yyyy-MM'));
        }
    });
    return Array.from(monthYears).sort().reverse();
};

export default function ExportPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const notasQuery = useMemoFirebase(() => {
        return query(collection(firestore, 'notas'), orderBy('tanggal', 'desc'));
    }, [firestore]);

    const { data: notas, isLoading } = useCollection<Nota>(notasQuery);

    const [filterType, setFilterType] = useState('monthly');
    const [selectedMonth, setSelectedMonth] = useState<string>('');
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [verifiedDate, setVerifiedDate] = useState<Date | undefined>(undefined);

    const [selectedNotaIds, setSelectedNotaIds] = useState<string[]>([]);
    
    const [reportContent, setReportContent] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const monthOptions = useMemo(() => getMonthYearOptions(notas || []), [notas]);

    useEffect(() => {
        if (monthOptions.length > 0 && !selectedMonth) {
            setSelectedMonth(monthOptions[0]);
        }
    }, [monthOptions, selectedMonth]);
    
    const filteredNotas = useMemo(() => {
        if (!notas) return [];
        if (filterType === 'monthly') {
            const currentMonth = selectedMonth || (monthOptions.length > 0 ? monthOptions[0] : '');
            if (!currentMonth) return [];
            
            const [year, month] = currentMonth.split('-').map(Number);
            return notas.filter(nota => {
                if (!nota.tanggal?.toDate) return false;
                const date = nota.tanggal.toDate();
                return getYear(date) === year && getMonth(date) === month - 1;
            });
        }
        if (filterType === 'range') {
            if (!dateRange?.from || !dateRange?.to) return [];
            return notas.filter(nota => {
                if (!nota.tanggal?.toDate) return false;
                const date = nota.tanggal.toDate();
                return date >= dateRange.from! && date <= dateRange.to!;
            });
        }
        if (filterType === 'verified') {
            if (!verifiedDate) return [];
             return notas.filter(nota => {
                if (nota.status !== 'verified' || !nota.tanggalVerifikasi?.toDate) return false;
                const date = nota.tanggalVerifikasi.toDate();
                return isSameDay(date, verifiedDate);
            });
        }
        return [];
    }, [notas, filterType, selectedMonth, monthOptions, dateRange, verifiedDate]);

    const handleSelectNota = (id: string, checked: boolean) => {
        setSelectedNotaIds(prev =>
            checked ? [...prev, id] : prev.filter(notaId => notaId !== id)
        );
    };

    const handleSelectAll = (checked: boolean) => {
        setSelectedNotaIds(checked ? filteredNotas.map(nota => nota.id) : []);
    };
    
    const isAllSelected = filteredNotas.length > 0 && selectedNotaIds.length === filteredNotas.length;

    const selectionSummary = useMemo(() => {
        const selectedCount = selectedNotaIds.length;
        if (selectedCount === 0) return { count: 0, total: 0 };
        const total = (notas || []).reduce((acc, nota) => {
            return selectedNotaIds.includes(nota.id) ? acc + nota.nominal : acc;
        }, 0);
        return { count: selectedCount, total };
    }, [selectedNotaIds, notas]);

    const handleGenerateReport = async (reportType: string, subType: string = '') => {
        setIsGenerating(true);
        const selectedNotas = notas?.filter(n => selectedNotaIds.includes(n.id)) || [];
        if (selectedNotas.length === 0) {
            toast({
                variant: "destructive",
                title: "Tidak ada laporan dipilih",
                description: "Silakan pilih setidaknya satu laporan untuk membuat rekap.",
            });
            setIsGenerating(false);
            return;
        }

        let html = '';
        const title = `Perincian Nota ${subType}`;

        try {
            if (reportType === 'rekap') {
                const [year, monthNum] = selectedMonth.split('-');
                const monthName = format(new Date(Number(year), Number(monthNum)-1, 1), 'MMMM', {locale: idLocale});
                html = generateRekapitulasiReport(selectedNotas, monthName, year);
            } else if (reportType === 'perincian') {
                 if (subType === 'jasa') {
                    html = generateJasaReport(selectedNotas.filter(n => n.segmen === 'jasa'), title);
                } else if (subType.startsWith('BBM')) {
                    html = generateBBMReport(selectedNotas.filter(n => n.segmen === subType), title);
                } else {
                    html = generateMaterialReport(selectedNotas.filter(n => n.segmen === subType), title);
                }
            } else if (reportType === 'eviden') {
                html = generateEvidenReport(selectedNotas.filter(n => n.segmen === subType), `Eviden Foto - ${subType}`);
            } else {
                 toast({ variant: "destructive", title: "Tipe Laporan Tidak Didukung" });
            }
            setReportContent(html);
        } catch (error) {
            console.error("Error generating report:", error);
            toast({ variant: "destructive", title: "Gagal Membuat Laporan", description: "Terjadi kesalahan."});
        } finally {
            setIsGenerating(false);
        }
    };
    
    // --- Report Menus ---
    const perincianSegments = [...new Set(filteredNotas.filter(n=>selectedNotaIds.includes(n.id)).map(n => n.segmen))];
    const evidenSegments = perincianSegments.filter(s => s.startsWith('BBM'));


    return (
        <>
        <div className="mx-auto grid w-full flex-1 auto-rows-max gap-6">
            <div className="flex items-center gap-4 sticky top-0 bg-background py-4 z-10 border-b -mx-6 px-6">
                <Link href="/dashboard">
                    <Button variant="outline" size="icon" className="h-8 w-8">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Kembali</span>
                    </Button>
                </Link>
                <div>
                    <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-bold tracking-tight sm:grow-0">
                        Pilih Data Rekap
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Pilih laporan yang akan diexport
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Filter className="h-5 w-5"/>
                        <CardTitle>Filter Data</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <Tabs value={filterType} onValueChange={setFilterType} className="w-full">
                        <TabsList className="grid w-full grid-cols-3 mb-4">
                            <TabsTrigger value="monthly">Per Bulan</TabsTrigger>
                            <TabsTrigger value="range">Rentang Tanggal</TabsTrigger>
                            <TabsTrigger value="verified">Terverifikasi</TabsTrigger>
                        </TabsList>
                        <TabsContent value="monthly">
                             <Select onValueChange={setSelectedMonth} value={selectedMonth || (monthOptions.length > 0 ? monthOptions[0] : '')}>
                                <SelectTrigger>
                                <SelectValue placeholder="Pilih bulan..." />
                                </SelectTrigger>
                                <SelectContent>
                                {monthOptions.map(month => (
                                    <SelectItem key={month} value={month}>
                                        {format(new Date(`${month}-02`), 'MMMM yyyy', { locale: idLocale })}
                                    </SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                        </TabsContent>
                        <TabsContent value="range">
                             <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        id="date"
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !dateRange && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dateRange?.from ? (
                                            dateRange.to ? (
                                                <>
                                                    {format(dateRange.from, "dd LLL, yy", {locale: idLocale})} -{' '}
                                                    {format(dateRange.to, "dd LLL, yy", {locale: idLocale})}
                                                </>
                                            ) : (
                                                format(dateRange.from, "dd LLL, yy")
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
                                        defaultMonth={dateRange?.from}
                                        selected={dateRange}
                                        onSelect={setDateRange}
                                        numberOfMonths={2}
                                    />
                                </PopoverContent>
                            </Popover>
                        </TabsContent>
                         <TabsContent value="verified">
                            <Popover>
                                <PopoverTrigger asChild>
                                <Button
                                    variant={'outline'}
                                    className={cn(
                                    'w-full justify-start text-left font-normal',
                                    !verifiedDate && 'text-muted-foreground'
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {verifiedDate ? format(verifiedDate, 'PPP', {locale: idLocale}) : <span>Pilih tanggal verifikasi</span>}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={verifiedDate}
                                    onSelect={setVerifiedDate}
                                    initialFocus
                                />
                                </PopoverContent>
                            </Popover>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            <div>
                <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                        <Checkbox id="select-all" onCheckedChange={handleSelectAll} checked={isAllSelected} />
                        <Label htmlFor="select-all">Pilih Semua</Label>
                    </div>
                     <Button variant="outline" size="sm" onClick={() => setSelectedNotaIds([])} disabled={selectedNotaIds.length === 0}>
                        Hapus Pilihan
                    </Button>
                    <div className="ml-auto text-sm text-muted-foreground">
                        {selectionSummary.count} dipilih | Total: Rp {selectionSummary.total.toLocaleString('id-ID')}
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Data Laporan ({filteredNotas.length} laporan)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {isLoading && Array.from({length: 5}).map((_, i) => (
                            <Skeleton key={i} className="h-20 w-full" />
                        ))}
                        {!isLoading && filteredNotas.length > 0 ? (
                           filteredNotas.map(nota => (
                            <Card key={nota.id} className="p-3 flex items-center gap-4 hover:bg-muted/50 transition-colors">
                                 <Checkbox 
                                     checked={selectedNotaIds.includes(nota.id)}
                                     onCheckedChange={(checked) => handleSelectNota(nota.id, !!checked)}
                                 />
                                 <div className="flex-grow">
                                     <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium">{nota.tanggal?.toDate ? format(nota.tanggal.toDate(), 'dd MMM yyyy', { locale: idLocale }) : 'Invalid Date'}</span>
                                        <Badge variant={nota.status === 'verified' ? 'default' : 'secondary'}>{nota.status}</Badge>
                                        <Badge variant={nota.segmen.includes('BBM') ? 'destructive' : 'secondary'}>{nota.segmen}</Badge>
                                     </div>
                                     <p className="text-sm text-muted-foreground truncate">{nota.keterangan || nota.namaBarang || 'Tanpa keterangan'}</p>
                                 </div>
                                 <div className="font-semibold text-base whitespace-nowrap">
                                     Rp {nota.nominal.toLocaleString('id-ID')}
                                 </div>
                                  <div className="flex items-center">
                                    <Link href={`/dashboard/notas/${nota.id}/edit`}>
                                        <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                                    </Link>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                  </div>
                            </Card>
                           ))
                        ) : (
                            <div className="text-center py-10 text-muted-foreground">
                                Tidak ada laporan ditemukan untuk filter yang dipilih.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
            
             <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm py-3 mt-auto border-t -mx-6 px-6 no-print">
                 <div className="max-w-4xl mx-auto flex justify-around items-center">
                    <Button variant="outline" size="lg" disabled>
                        <FileArchive className="mr-2" /> Semua (1 File)
                    </Button>
                     <Button variant="outline" size="lg" onClick={() => handleGenerateReport('rekap')} disabled={isGenerating || selectedNotaIds.length === 0 || filterType !== 'monthly'}>
                        {isGenerating ? <Loader2 className="mr-2 animate-spin"/> : <FileText className="mr-2" />} Rekap
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="lg" disabled={isGenerating || perincianSegments.length === 0}>
                           {isGenerating ? <Loader2 className="mr-2 animate-spin"/> : <Printer className="mr-2" />} Perincian
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {perincianSegments.map(seg => (
                           <DropdownMenuItem key={seg} onClick={() => handleGenerateReport('perincian', seg)}>
                                {seg}
                           </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                     <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="lg" disabled={isGenerating || evidenSegments.length === 0}>
                            {isGenerating ? <Loader2 className="mr-2 animate-spin"/> : <FileText className="mr-2" />} Eviden
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {evidenSegments.map(seg => (
                           <DropdownMenuItem key={seg} onClick={() => handleGenerateReport('eviden', seg)}>
                                {seg}
                           </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </div>
        {reportContent && <ReportPreview htmlContent={reportContent} onClose={() => setReportContent(null)} />}
        </>
    );
}
