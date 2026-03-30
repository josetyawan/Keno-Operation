
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, where, Timestamp, doc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { format, startOfDay, endOfDay } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { RiwayatGangguan, UserProfile, MaterialEvidence, Pelanggan } from '@/lib/types';
import { Calendar as CalendarIcon, Download, Loader2, Files, Printer } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';
import { useRouter } from 'next/navigation';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Image from 'next/image';
import { productivityWeights } from '@/lib/bobot-produktivitas';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const excelHeaders = [
    "NO", "WITEL", "NO TIKET", "HASIL CEK WEB", "ACTUAL SOLUTION", "ACTUAL SOLUTION vs LAPANGAN",
    "DESKRIPSI_CUST_CLOSE", "LAYANAN", "IS_GAMAS", "KET", "KATEGORI", "TANGGAL CLOSED",
    "NO INTERNET", "LOKASI", "STO", "DROPWIRE", "DROPCORE BARU", "DROPCORE REFURBISH",
    "ROSET", "PIGTAIL SC", "PATCHCORE 15", "PATCHCORE 2 MTR", "KELEBIHAN", "PATCHCORE 1 MTR",
    "SPLITER 1:2", "SPLITER 1:4", "SPLITER 1:8", "SPLITER 1:16", "PUAS",
    "Termovit (cm)", "Adapter SC", "RJ45", "Protection Sleeve", "Splice on Connector",
    "Penarikan Kabel UTP (Mtr)"
];

const getAssuranceCategory = (item: RiwayatGangguan): 'B2C' | 'B2B' | null => {
    const { jenisOrder, typeOrder } = item;

    const isInB2C = productivityWeights["ASSURANCE B2C"]?.some(w =>
        w.jenis_order_name === jenisOrder && (!w.order_type || w.order_type === typeOrder)
    );
    if (isInB2C) return 'B2C';

    const isInB2B = [
        ...productivityWeights["ASSURANCE B2B EXTERNAL"],
        ...productivityWeights["ASSURANCE B2B INTERNAL"]
    ].some(w =>
        w.jenis_order_name === jenisOrder && (!w.order_type || w.order_type === typeOrder)
    );
    if (isInB2B) return 'B2B';

    return null;
};


function ReportPreview({
    htmlContent,
    onClose,
  }: {
    htmlContent: string;
    onClose: () => void;
  }) {
    useEffect(() => {
      const handlePrint = () => {
        const iframe = document.getElementById('print-iframe') as HTMLIFrameElement;
        const iframeWindow = iframe?.contentWindow;
        if (iframeWindow) {
          iframeWindow.focus();
          iframeWindow.print();
        }
      };
  
      const printButton = document.getElementById('do-print-button');
      printButton?.addEventListener('click', handlePrint);
  
      return () => {
        printButton?.removeEventListener('click', handlePrint);
      };
    }, []);
  
    return (
      <div id="print-section-container" className="fixed inset-0 bg-black/80 z-50 flex justify-center items-center p-4">
        <Card className="w-full max-w-7xl h-[90vh] flex flex-col">
          <CardHeader className="print-hidden flex-row items-center justify-between flex-wrap gap-2">
            <CardTitle>Pratinjau Laporan Eviden</CardTitle>
            <div className="flex gap-2 flex-wrap justify-end">
              <Button variant="outline" onClick={onClose}>Tutup</Button>
              <Button id="do-print-button"><Files className="mr-2" /> Cetak / Simpan PDF</Button>
            </div>
          </CardHeader>
          <CardContent className="flex-grow overflow-auto bg-gray-200 p-4">
             <iframe id="print-iframe" srcDoc={`<html><head><style>
                body { font-family: Arial, sans-serif; margin: 0; } 
                .page-container { page-break-after: always; background: white; padding: 1cm; margin: 1rem auto; box-shadow: 0 0 0.5cm rgba(0,0,0,0.5); width: 210mm; min-height: 297mm; box-sizing: border-box; }
                h2 { font-size: 16pt; font-weight: bold; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10pt; }
                th, td { border: 1px solid black; padding: 5px; text-align: left; vertical-align: top; }
                thead { background-color: #FFFF00; font-weight: bold; }
                img { max-width: 100%; height: auto; object-fit: contain; }
                td.image-cell ul { list-style-type: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: 4px; }
                td.image-cell li { margin-bottom: 5px; }
                td.keterangan-cell ul { list-style-position: inside; padding-left: 0; margin: 0; }
                @media print { 
                    body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; } 
                    .page-container { margin: 0; box-shadow: none; border: none; }
                }
             </style></head><body>${htmlContent}</body></html>`} style={{ width: '100%', height: '100%', border: 'none' }} />
          </CardContent>
        </Card>
      </div>
    );
}

export default function AssuranceRekapPage() {
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    const { user, isUserLoading } = useUser();
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [isLoadingExcel, setIsLoadingExcel] = useState(false);
    const [previewHtml, setPreviewHtml] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState('all');

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

    const riwayatQuery = useMemoFirebase(() => {
        if (!dateRange?.from) return null;
        const start = startOfDay(dateRange.from);
        const end = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
        return query(
            collection(firestore, 'riwayat-gangguan'),
            where('tanggalLapor', '>=', Timestamp.fromDate(start)),
            where('tanggalLapor', '<=', Timestamp.fromDate(end))
        );
    }, [firestore, dateRange]);

    const { data: riwayatListFromQuery, isLoading: isRiwayatLoading } = useCollection<RiwayatGangguan>(riwayatQuery);
    
    // Fetch all customers to get their addresses
    const pelangganQuery = useMemoFirebase(() => {
        return query(collection(firestore, 'pelanggan'));
    }, [firestore]);
    const { data: allPelanggan, isLoading: arePelangganLoading } = useCollection<Pelanggan>(pelangganQuery);

    const pelangganMap = useMemo(() => {
        if (!allPelanggan) return new Map<string, string>();
        return new Map(allPelanggan.map(p => [p.noService, p.alamat || '']));
    }, [allPelanggan]);

    const riwayatList = useMemo(() => {
        if (!riwayatListFromQuery) return [];
        if (selectedCategory === 'all') return riwayatListFromQuery;

        return riwayatListFromQuery.filter(item => {
            const category = getAssuranceCategory(item);
            return category === selectedCategory;
        });
    }, [riwayatListFromQuery, selectedCategory]);


    const handleSelect = (id: string, checked: boolean) => {
        setSelectedIds(prev => checked ? [...prev, id] : prev.filter(i => i !== id));
    };

    const handleSelectAll = useCallback((checked: boolean) => {
        setSelectedIds(checked ? (riwayatList || []).map(r => r.id) : []);
    }, [riwayatList]);

    useEffect(() => {
        if (riwayatList) {
            handleSelectAll(true);
        }
    }, [riwayatList, handleSelectAll]);

    const handleExportExcel = async () => {
        const reportsToExport = riwayatList?.filter(r => selectedIds.includes(r.id)) || [];
        if (reportsToExport.length === 0) {
            toast({ variant: 'destructive', title: 'Tidak ada data dipilih untuk diekspor.' });
            return;
        }

        setIsLoadingExcel(true);

        try {
            const XLSX = await import('xlsx');
            const dataToExport = reportsToExport.map((riwayat, index) => {
                const row: { [key: string]: any } = {};
                
                row["NO"] = index + 1;
                row["WITEL"] = "SEMARANG";
                row["NO TIKET"] = riwayat.noTiket || '';
                row["HASIL CEK WEB"] = '';
                
                const keteranganLower = (riwayat.keterangan || '').toLowerCase();
                let actualSolution = '';
                if (/(dropcore|dc|gdc|sambul|sambung ulang|smuff|protective slevee|ikr)/.test(keteranganLower)) {
                    actualSolution = 'DROPCORE';
                } else if (/(odp|spliter|sc|pathcore|pigtail)/.test(keteranganLower)) {
                    actualSolution = 'ODP';
                }
                row["ACTUAL SOLUTION"] = actualSolution;
                
                let actualSolutionVsLapangan = '';
                if (actualSolution === 'DROPCORE') {
                    actualSolutionVsLapangan = 'Sambung DC';
                } else if (actualSolution === 'ODP') {
                    const odpMaterials = riwayat.materials?.map(m => m.materialName).filter(name => /spliter|adapter sc|splice on connector|patchcore/i.test(name));
                    actualSolutionVsLapangan = odpMaterials && odpMaterials.length > 0 ? odpMaterials.join(', ') : 'Perbaikan ODP';
                }
                row["ACTUAL SOLUTION vs LAPANGAN"] = actualSolutionVsLapangan;

                row["DESKRIPSI_CUST_CLOSE"] = riwayat.keterangan || '';
                row["LAYANAN"] = Array.isArray(riwayat.layanan) ? riwayat.layanan.join(', ') : '';
                row["IS_GAMAS"] = riwayat.jenisOrder === 'Tiket GAMAS' ? 'GAMAS' : 'NON GAMAS';
                row["KET"] = '';
                row["KATEGORI"] = '';
                row["TANGGAL CLOSED"] = riwayat.tanggalClose?.toDate ? format(riwayat.tanggalClose.toDate(), 'yyyy-MM-dd HH:mm:ss') : '';
                row["NO INTERNET"] = riwayat.noService || '';
                row["LOKASI"] = pelangganMap.get(riwayat.noService) || '';
                row["STO"] = riwayat.sto || '';
                row["PUAS"] = '';
                row["DROPWIRE"] = '';
                
                const materialsUsed = new Map<string, number>();
                (riwayat.materials || []).forEach(mat => {
                    materialsUsed.set(mat.materialName.toUpperCase().trim(), (materialsUsed.get(mat.materialName.toUpperCase().trim()) || 0) + (mat.quantity || 1));
                });
                
                const getMaterialQty = (name: string) => materialsUsed.get(name.toUpperCase().trim()) || '';
                
                row["DROPCORE BARU"] = getMaterialQty("DROPCORE BARU");
                row["DROPCORE REFURBISH"] = getMaterialQty("DROPCORE REFURBISH");
                row["ROSET"] = getMaterialQty("ROSET");
                row["PIGTAIL SC"] = getMaterialQty("PIGTAIL SC");
                row["PATCHCORE 15"] = getMaterialQty("PATCHCORE 15");
                row["PATCHCORE 2 MTR"] = getMaterialQty("PATCHCORE 2 MTR");

                const patchcore1MtrQty = (materialsUsed.get("PATCHCORE 1 MTR") || 0) as number;
                row["KELEBIHAN"] = patchcore1MtrQty > 1 ? patchcore1MtrQty - 1 : '';
                row["PATCHCORE 1 MTR"] = patchcore1MtrQty > 0 ? patchcore1MtrQty : '';
                
                row["SPLITER 1:2"] = getMaterialQty("SPLITER 1:2");
                row["SPLITER 1:4"] = getMaterialQty("SPLITER 1:4");
                row["SPLITER 1:8"] = getMaterialQty("SPLITER 1:8");
                row["SPLITER 1:16"] = getMaterialQty("SPLITER 1:16");

                const protectionSleeveQty = (materialsUsed.get("PROTECTION SLEEVE") || 0) as number;
                row["Termovit (cm)"] = protectionSleeveQty > 0 ? protectionSleeveQty * 15 : '';
                row["Adapter SC"] = getMaterialQty("ADAPTER SC");
                row["RJ45"] = getMaterialQty("RJ45");
                row["Protection Sleeve"] = getMaterialQty("PROTECTION SLEEVE");
                row["Splice on Connector"] = getMaterialQty("SPLICE ON CONNECTOR");
                row["Penarikan Kabel UTP (Mtr)"] = getMaterialQty("PENARIKAN KABEL UTP (MTR)");

                return row;
            });
            
            const worksheet = XLSX.utils.json_to_sheet(dataToExport, { header: excelHeaders });
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Assurance');
            
            const dateString = format(new Date(), 'yyyy-MM-dd');
            XLSX.writeFile(workbook, `Rekap_Assurance_${dateString}.xlsx`);
            
            toast({ title: 'Ekspor Berhasil', description: `${reportsToExport.length} baris data telah diekspor.` });

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Gagal Mengekspor', description: error.message });
        } finally {
            setIsLoadingExcel(false);
        }
    };
    
    const handleGeneratePreview = () => {
        const selectedRiwayat = riwayatList?.filter(r => selectedIds.includes(r.id)) || [];
        if (selectedRiwayat.length === 0) {
            toast({ variant: 'destructive', title: 'Tidak ada laporan dipilih.' });
            return;
        }
        
        toast({ title: 'Mempersiapkan pratinjau...', description: 'Mengumpulkan data dan gambar.' });

        const evidenceCategories: { title: string; type: 'scc' | 'material' | 'progres'; materialKeyword?: string }[] = [
            { title: 'EVIDENT SCC', type: 'scc' },
            { title: 'EVIDENT PROGRES', type: 'progres' },
            { title: 'EVIDENT DROPCORE BARU', type: 'material', materialKeyword: 'DROPCORE BARU' },
            { title: 'EVIDENT DROPCORE REFURBISH', type: 'material', materialKeyword: 'DROPCORE REFURBISH' },
            { title: 'EVIDENT ROSET', type: 'material', materialKeyword: 'ROSET' },
            { title: 'EVIDENT PIGTAIL SC', type: 'material', materialKeyword: 'PIGTAIL SC' },
            { title: 'EVIDENT PATCHCORE', type: 'material', materialKeyword: 'PATCHCORE' },
            { title: 'EVIDENT SPLITER', type: 'material', materialKeyword: 'SPLITER' },
            { title: 'EVIDENT ADAPTER SC', type: 'material', materialKeyword: 'ADAPTER SC' },
            { title: 'EVIDENT RJ45', type: 'material', materialKeyword: 'RJ45' },
            { title: 'EVIDENT SPLICE ON CONNECTOR', type: 'material', materialKeyword: 'SPLICE ON CONNECTOR' },
        ];
        
        let allPagesHtml = '';

        for (const category of evidenceCategories) {
            let tableRowsHtml = '';
            let hasContent = false;

            const reportsByTicket: Record<string, { photos: { url: string; keterangan: string }[] }> = {};

            for (const riwayat of selectedRiwayat) {
                const ticketKey = riwayat.noTiket || riwayat.noService;
                if (!reportsByTicket[ticketKey]) {
                    reportsByTicket[ticketKey] = { photos: [] };
                }

                if (category.type === 'scc' && riwayat.evidenSccUrl) {
                    reportsByTicket[ticketKey].photos.push({ url: riwayat.evidenSccUrl, keterangan: 'SCC DONE' });
                } else if (riwayat.materials) {
                     for (const material of riwayat.materials) {
                        if (!material.evidences) continue;
                        
                        if (category.type === 'progres') {
                            material.evidences.forEach(p => {
                                if (p.evidenceName.toLowerCase().includes('progres') || material.materialName.toUpperCase() === 'PROTECTION SLEEVE') {
                                    reportsByTicket[ticketKey].photos.push({ url: p.photoUrl, keterangan: `${material.materialName} - ${p.evidenceName}` });
                                }
                            });
                        } else if (category.type === 'material') {
                            if (material.materialName.toUpperCase().includes(category.materialKeyword!)) {
                                material.evidences.forEach(p => {
                                    // Exclude photos that are part of the 'progress' group
                                    if (!p.evidenceName.toLowerCase().includes('progres')) {
                                        reportsByTicket[ticketKey].photos.push({ url: p.photoUrl, keterangan: `${material.materialName} - ${p.evidenceName}` });
                                    }
                                });
                            }
                        }
                    }
                }
            }

            for (const ticketKey in reportsByTicket) {
                const { photos } = reportsByTicket[ticketKey];
                if (photos.length > 0) {
                    hasContent = true;

                    const imagesHtml = photos.map(p => 
                        `<li><img src="${p.url}" style="width: 120px; height: auto; object-fit: contain; border: 1px solid #eee; margin: 2px;" /></li>`
                    ).join('');
                    
                    const keteranganHtml = `<ul>${photos.map(p => `<li>${p.keterangan}</li>`).join('')}</ul>`;
                    
                    tableRowsHtml += `
                        <tr>
                            <td>${ticketKey}</td>
                            <td class="image-cell"><ul>${imagesHtml}</ul></td>
                            <td class="keterangan-cell">${keteranganHtml}</td>
                        </tr>
                    `;
                }
            }
            
            if (hasContent) {
                allPagesHtml += `
                    <div class="page-container">
                        <h2>${category.title}</h2>
                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 20%;">NO TIKET</th>
                                    <th style="width: 50%;">EVIDENT</th>
                                    <th style="width: 30%;">KETERANGAN</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${tableRowsHtml}
                            </tbody>
                        </table>
                    </div>
                `;
            }
        }
        
        if (!allPagesHtml.trim()) {
            toast({ variant: 'destructive', title: 'Tidak Ada Eviden', description: "Tidak ada foto eviden untuk diekspor dalam laporan yang dipilih." });
            setPreviewHtml(null);
        } else {
            setPreviewHtml(allPagesHtml);
        }
    };

    const handleGenerateBAPreview = () => {
        const selectedRiwayat = riwayatList?.filter(r => selectedIds.includes(r.id)) || [];
        if (selectedRiwayat.length === 0) {
            toast({ variant: 'destructive', title: 'Tidak ada laporan dipilih.' });
            return;
        }

        const splitterItems = selectedRiwayat.flatMap(report => 
            (report.materials || [])
                .filter(material => material.materialName && material.materialName.toUpperCase().includes('SPLITER'))
                .map(material => ({
                    ticket: report.noTiket || report.noService,
                    materialName: material.materialName,
                    quantity: material.quantity || 1,
                    keterangan: 'REGULER' // As per example
                }))
        );

        if (splitterItems.length === 0) {
            toast({ variant: 'destructive', title: 'Tidak Ditemukan', description: 'Tidak ada material splitter pada laporan yang dipilih.' });
            return;
        }
        
        toast({ title: 'Mempersiapkan Pratinjau BA...', description: 'Mengumpulkan data material splitter.' });

        const today = new Date();
        const dayName = format(today, 'eeee', { locale: idLocale });
        const day = format(today, 'd');
        const monthName = format(today, 'MMMM', { locale: idLocale });
        const year = format(today, 'yyyy');

        const userName = currentUserProfile?.displayName || 'N/A';
        const userNik = currentUserProfile?.nik || 'N/A';
        const userJabatan = currentUserProfile?.jabatan || 'N/A';
        
        const tableRowsHtml = splitterItems.map((item, index) => `
            <tr style="font-size: 11pt; text-align: center;">
                <td style="border: 1px solid black; padding: 4px;">${index + 1}</td>
                <td style="border: 1px solid black; padding: 4px; text-align: left;">${item.ticket}</td>
                <td style="border: 1px solid black; padding: 4px; text-align: left;">${item.materialName}</td>
                <td style="border: 1px solid black; padding: 4px;">${item.quantity} PCS</td>
                <td style="border: 1px solid black; padding: 4px;">${item.keterangan}</td>
            </tr>
        `).join('');

        const baHtml = `
            <div class="page-container" style="font-family: Arial, sans-serif; font-size: 12pt; color: black; background: white;">
                <div style="text-align: center; font-weight: bold; text-decoration: underline; font-size: 14pt; margin-bottom: 30px;">
                    BERITA ACARA PENYERAHAN MATERIAL MAGU
                </div>
                <p>Pada hari ini ${dayName}, tanggal ${day} bulan ${monthName}, tahun ${year}, saya yang bertanda tangan dibawah ini :</p>
                <table style="border-collapse: collapse; margin-left: 30px; margin-top: 15px; margin-bottom: 15px;">
                    <tr><td style="width: 100px; padding-bottom: 5px;">NAMA</td><td style="padding-bottom: 5px;">: ${userName}</td></tr>
                    <tr><td style="padding-bottom: 5px;">NIK</td><td style="padding-bottom: 5px;">: ${userNik}</td></tr>
                    <tr><td>JABATAN</td><td>: ${userJabatan}</td></tr>
                </table>
                <p>Menyerahkan material MAGU ke WH SO Kudus dengan rincian sebagai berikut :</p>
                <table style="width: 100%; border-collapse: collapse; border: 1px solid black; margin-top: 15px;">
                    <thead style="background-color: #E0E0E0; font-weight: bold;">
                        <tr>
                            <th style="border: 1px solid black; padding: 5px;">NO</th>
                            <th style="border: 1px solid black; padding: 5px;">NO. TICKET / INET</th>
                            <th style="border: 1px solid black; padding: 5px;">NAMA MATERIAL</th>
                            <th style="border: 1px solid black; padding: 5px;">JUMLAH</th>
                            <th style="border: 1px solid black; padding: 5px;">KETERANGAN</th>
                        </tr>
                    </thead>
                    <tbody>${tableRowsHtml}</tbody>
                </table>
                <div style="margin-top: 50px; display: flex; justify-content: space-around; text-align: center; page-break-inside: avoid;">
                    <div style="width: 45%;">
                        <p style="margin:0;">Yang menyerahkan,<br/>OSA KUDUS</p>
                        <div style="height: 80px; display: flex; align-items: center; justify-content: center;"></div>
                        <p style="text-decoration: underline; font-weight: bold; margin-bottom: 0;">${userName}</p>
                        <p style="margin-top: 0;">NIK. ${userNik}</p>
                    </div>
                    <div style="width: 45%;">
                        <p style="margin:0;">Yang menerima,<br/>STAFF WH SO KUDUS</p>
                        <div style="height: 80px; display: flex; align-items: center; justify-content: center;"></div>
                        <p style="text-decoration: underline; font-weight: bold; margin-bottom: 0;">YENI NOVITASARI</p>
                        <p style="margin-top: 0;">NIK. 19880038</p>
                    </div>
                </div>
            </div>`;
            
        setPreviewHtml(baHtml);
    };

    const isLoading = isUserLoading || isProfileLoading || isRiwayatLoading || arePelangganLoading;
    if (isLoading) return <div>Memuat...</div>

    return (
        <>
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Rekap Assurance & Eviden</h1>
            <p className="text-muted-foreground">Buat file Excel rekapitulasi data gangguan atau pratinjau dokumen untuk eviden.</p>

             <Card>
                <CardHeader>
                    <CardTitle>Filter Laporan</CardTitle>
                    <CardDescription>Pilih rentang tanggal dan kategori laporan gangguan untuk diekspor.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-end gap-4">
                     <div className="grid gap-2">
                        <Label>Rentang Tanggal Lapor</Label>
                         <Popover>
                            <PopoverTrigger asChild>
                                <Button id="date-range-picker" variant={"outline"} className={cn("w-[300px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange?.from ? (dateRange.to ? (<>{format(dateRange.from, "dd LLL, yy", {locale: idLocale})} - {format(dateRange.to, "dd LLL, yy", {locale: idLocale})}</>) : (format(dateRange.from, "dd LLL, yy", {locale: idLocale}))) : (<span>Pilih rentang tanggal</span>)}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="grid gap-2">
                        <Label>Kategori Assurance</Label>
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                            <SelectTrigger className="w-[280px]">
                                <SelectValue placeholder="Pilih kategori..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Kategori</SelectItem>
                                <SelectItem value="B2C">Assurance B2C</SelectItem>
                                <SelectItem value="B2B">Assurance B2B</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Daftar Laporan</CardTitle>
                    {riwayatList && (<CardDescription>Ditemukan {riwayatList.length} laporan. {selectedIds.length} laporan dipilih.</CardDescription>)}
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12"><Checkbox checked={(riwayatList?.length ?? 0) > 0 && selectedIds.length === riwayatList?.length} onCheckedChange={(checked) => handleSelectAll(!!checked)} aria-label="Pilih semua" /></TableHead>
                                    <TableHead>No Tiket</TableHead>
                                    <TableHead>No Service</TableHead>
                                    <TableHead>Petugas</TableHead>
                                    <TableHead>Jenis Order</TableHead>
                                    <TableHead>Keterangan</TableHead>
                                    <TableHead>Tanggal Lapor</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isRiwayatLoading ? (
                                    <TableRow><TableCell colSpan={7} className="text-center h-24">Memuat data...</TableCell></TableRow>
                                ) : riwayatList && riwayatList.length > 0 ? (
                                    riwayatList.map(item => (
                                        <TableRow key={item.id} data-state={selectedIds.includes(item.id) && "selected"}>
                                            <TableCell><Checkbox checked={selectedIds.includes(item.id)} onCheckedChange={(checked) => handleSelect(item.id, !!checked)} aria-label={`Pilih laporan ${item.noTiket}`} /></TableCell>
                                            <TableCell>{item.noTiket}</TableCell>
                                            <TableCell>{item.noService}</TableCell>
                                            <TableCell>{item.namaPetugas}</TableCell>
                                            <TableCell>{item.jenisOrder}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{item.keterangan || '-'}</TableCell>
                                            <TableCell>{item.tanggalLapor.toDate ? format(item.tanggalLapor.toDate(), 'dd MMM yyyy') : '-'}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                     <TableRow><TableCell colSpan={7} className="text-center h-24">{dateRange ? 'Tidak ada data untuk rentang tanggal yang dipilih.' : 'Pilih rentang tanggal untuk menampilkan data.'}</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
                <CardFooter>
                    <div className="flex gap-2">
                        <Button onClick={handleExportExcel} disabled={isLoadingExcel || isRiwayatLoading || selectedIds.length === 0}>
                            {(isLoadingExcel) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                            Export Excel
                        </Button>
                         <Button onClick={handleGeneratePreview} disabled={isRiwayatLoading || selectedIds.length === 0} variant="secondary">
                            <Files className="mr-2 h-4 w-4" />
                            Pratinjau Eviden
                        </Button>
                        <Button onClick={handleGenerateBAPreview} disabled={isRiwayatLoading || selectedIds.length === 0} variant="outline">
                            <Printer className="mr-2 h-4 w-4" />
                            Cetak BA Penyerahan
                        </Button>
                    </div>
                </CardFooter>
            </Card>
        </div>
        {previewHtml && (
            <ReportPreview htmlContent={previewHtml} onClose={() => setPreviewHtml(null)} />
        )}
        </>
    );
}
