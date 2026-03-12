
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
import type { RiwayatGangguan, UserProfile } from '@/lib/types';
import { Calendar as CalendarIcon, Download, Loader2, Files } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';
import * as XLSX from 'xlsx';
import { useRouter } from 'next/navigation';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Image from 'next/image';

const excelHeaders = [
    "NO", "WITEL", "NO TIKET", "HASIL CEK WEB", "ACTUAL SOLUTION", "ACTUAL SOLUTION vs LAPANGAN",
    "DESKRIPSI_CUST_CLOSE", "LAYANAN", "IS_GAMAS", "KET", "KATEGORI", "TANGGAL CLOSED",
    "NO INTERNET", "LOKASI", "STO", "DROPWIRE", "DROPCORE BARU", "DROPCORE REFURBISH",
    "ROSET", "PIGTAIL SC", "PATCHCORE 15", "PATCHCORE 2 MTR", "KELEBIHAN", "PATCHCORE 1 MTR",
    "SPLITER 1:2", "SPLITER 1:4", "SPLITER 1:8", "SPLITER 1:16", "PUAS",
    "Termovit (cm)", "Adapter SC", "RJ45", "Protection Sleeve", "Splice on Connector",
    "Penarikan Kabel UTP (Mtr)"
];

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
                .page-container { page-break-after: always; background: white; padding: 1.5cm; margin: 1rem auto; box-shadow: 0 0 0.5cm rgba(0,0,0,0.5); width: 210mm; min-height: 297mm; box-sizing: border-box; }
                .image-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 1rem; }
                .image-container { text-align: center; }
                .image-container img { max-width: 100%; height: auto; border: 1px solid #ddd; }
                .image-container p { margin-top: 0; font-size: 10pt; font-weight: bold; }
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

    const { data: riwayatList, isLoading: isRiwayatLoading } = useCollection<RiwayatGangguan>(riwayatQuery);

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

    const handleExportExcel = () => {
        const reportsToExport = riwayatList?.filter(r => selectedIds.includes(r.id)) || [];
        if (reportsToExport.length === 0) {
            toast({ variant: 'destructive', title: 'Tidak ada data dipilih untuk diekspor.' });
            return;
        }

        setIsLoadingExcel(true);

        try {
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
                row["LOKASI"] = '';
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

                const patchcore1MtrQty = materialsUsed.get("PATCHCORE 1 MTR") || 0;
                row["KELEBIHAN"] = patchcore1MtrQty > 1 ? patchcore1MtrQty - 1 : '';
                row["PATCHCORE 1 MTR"] = patchcore1MtrQty > 0 ? patchcore1MtrQty : '';
                
                row["SPLITER 1:2"] = getMaterialQty("SPLITER 1:2");
                row["SPLITER 1:4"] = getMaterialQty("SPLITER 1:4");
                row["SPLITER 1:8"] = getMaterialQty("SPLITER 1:8");
                row["SPLITER 1:16"] = getMaterialQty("SPLITER 1:16");

                const protectionSleeveQty = materialsUsed.get("PROTECTION SLEEVE") || 0;
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
        if (selectedIds.length === 0) {
            toast({ variant: 'destructive', title: 'Tidak ada laporan dipilih.' });
            return;
        }
        
        toast({ title: 'Mempersiapkan pratinjau...', description: 'Mengumpulkan data dan gambar.' });

        const selectedRiwayat = riwayatList?.filter(r => selectedIds.includes(r.id)) || [];
        let htmlString = ``;

        for (const riwayat of selectedRiwayat) {
            const tanggalLapor = riwayat.tanggalLapor?.toDate ? format(riwayat.tanggalLapor.toDate(), 'dd MMMM yyyy, HH:mm', { locale: idLocale }) : 'N/A';
            
            htmlString += `
                <div class="page-container">
                    <h2 style="font-size: 14pt; font-weight: bold;">Laporan Eviden Gangguan: ${riwayat.noTiket || riwayat.noService}</h2>
                    <p><strong>Teknisi:</strong> ${riwayat.namaPetugas}</p>
                    <p><strong>Tanggal Lapor:</strong> ${tanggalLapor}</p>
                    <p><strong>Jenis Order:</strong> ${riwayat.jenisOrder || '-'}</p>
                    <p><strong>Keterangan:</strong> ${riwayat.keterangan || '-'}</p>
                    <hr />
            `;

            if (riwayat.evidenSccUrl) {
                htmlString += `
                    <h3 style="font-size: 12pt; font-weight: bold; margin-top: 1em;">Eviden SCC</h3>
                    <div class="image-grid">
                        <div class="image-container">
                             <img src="${riwayat.evidenSccUrl}" />
                        </div>
                    </div>
                    <br />
                `;
            }

            if (riwayat.materials && riwayat.materials.length > 0) {
                for (const material of riwayat.materials) {
                    if (material.evidences && material.evidences.length > 0) {
                         htmlString += `<h3 style="font-size: 12pt; font-weight: bold; margin-top: 1em;">Material: ${material.materialName} (Jumlah: ${material.quantity || 1})</h3>`;
                         
                         htmlString += '<div class="image-grid">';
                         material.evidences.forEach((ev) => {
                             htmlString += `
                                <div class="image-container">
                                    <p style="text-transform: capitalize;">${ev.evidenceName}</p>
                                    <img src="${ev.photoUrl}" />
                                </div>
                             `;
                         });
                         htmlString += '</div><br />';
                    }
                }
            }
            htmlString += `</div>`;
        }

        if (!htmlString.trim()) {
            toast({ variant: 'destructive', title: 'Tidak Ada Eviden', description: "Tidak ada foto eviden untuk diekspor dalam laporan yang dipilih." });
            setPreviewHtml(null);
        } else {
             setPreviewHtml(htmlString);
        }
    };
    
    const isPageLoading = isUserLoading || isProfileLoading;
    if (isPageLoading) return <div>Memuat...</div>

    return (
        <>
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Rekap Assurance & Eviden</h1>
            <p className="text-muted-foreground">Buat file Excel rekapitulasi data gangguan atau pratinjau dokumen untuk eviden.</p>

             <Card>
                <CardHeader><CardTitle>Filter Laporan</CardTitle><CardDescription>Pilih rentang tanggal laporan gangguan untuk diekspor.</CardDescription></CardHeader>
                <CardContent>
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
                                    <TableHead>Tanggal Lapor</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isRiwayatLoading ? (
                                    <TableRow><TableCell colSpan={6} className="text-center h-24">Memuat data...</TableCell></TableRow>
                                ) : riwayatList && riwayatList.length > 0 ? (
                                    riwayatList.map(item => (
                                        <TableRow key={item.id} data-state={selectedIds.includes(item.id) && "selected"}>
                                            <TableCell><Checkbox checked={selectedIds.includes(item.id)} onCheckedChange={(checked) => handleSelect(item.id, !!checked)} aria-label={`Pilih laporan ${item.noTiket}`} /></TableCell>
                                            <TableCell>{item.noTiket}</TableCell>
                                            <TableCell>{item.noService}</TableCell>
                                            <TableCell>{item.namaPetugas}</TableCell>
                                            <TableCell>{item.jenisOrder}</TableCell>
                                            <TableCell>{format(item.tanggalLapor.toDate(), 'dd MMM yyyy')}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                     <TableRow><TableCell colSpan={6} className="text-center h-24">{dateRange ? 'Tidak ada data untuk rentang tanggal yang dipilih.' : 'Pilih rentang tanggal untuk menampilkan data.'}</TableCell></TableRow>
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
