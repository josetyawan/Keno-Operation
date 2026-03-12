
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
import { generateDocxAction } from '@/app/dashboard/export/actions';

const excelHeaders = [
    "NO WITEL", "NO TIKET", "HASIL CEK WEB", "ACTUAL SOLUTION", "ACTUAL SOLUTION vs LAPANGAN", 
    "DESKRIPSI_CUST_CLOSE", "LAYANAN", "IS_GAMAS", "KET KATEGORI", "TANGGAL CLOSED", 
    "NO INTERNET", "LOKASI STO", "DROPWIRE", "DROPCORE BARU", "DROPCORE REFURBISH", 
    "ROSET", "PIGTAIL SC", "PATCHCORE 15", "PATCHCORE 2 MTR", "KELEBIHAN PATCHCORE 1 MTR", 
    "SPLITER 1:2", "SPLITER 1:4", "SPLITER 1:8", "SPLITER 1:16", "PUAS", 
    "Termovit (cm)", "Adapter SC", "RJ45", "Protection Sleeve", "Splice on Connector", 
    "Penarikan Kabel UTP (Mtr)"
];

export default function AssuranceRekapPage() {
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    const { user, isUserLoading } = useUser();
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [isLoadingExcel, setIsLoadingExcel] = useState(false);
    const [isGeneratingDocx, setIsGeneratingDocx] = useState(false);
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

    const handleExport = () => {
        const reportsToExport = riwayatList?.filter(r => selectedIds.includes(r.id)) || [];
        if (reportsToExport.length === 0) {
            toast({ variant: 'destructive', title: 'Tidak ada data dipilih untuk diekspor.' });
            return;
        }

        setIsLoadingExcel(true);

        try {
            const dataToExport = reportsToExport.map(riwayat => {
                const row: { [key: string]: any } = {};
                
                row["NO WITEL"] = "SEMARANG";
                row["NO TIKET"] = riwayat.noTiket || '';
                row["HASIL CEK WEB"] = ''; 
                row["DESKRIPSI_CUST_CLOSE"] = riwayat.keterangan || '';
                row["LAYANAN"] = Array.isArray(riwayat.layanan) ? riwayat.layanan.join(', ') : '';
                row["IS_GAMAS"] = riwayat.jenisOrder === 'Tiket GAMAS' ? 'GAMAS' : 'NON GAMAS';
                row["KET KATEGORI"] = '';
                row["TANGGAL CLOSED"] = riwayat.tanggalClose?.toDate ? format(riwayat.tanggalClose.toDate(), 'yyyy-MM-dd HH:mm:ss') : '';
                row["NO INTERNET"] = riwayat.noService || '';
                row["LOKASI STO"] = riwayat.sto || '';
                row["PUAS"] = '';

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
                    const odpMaterials = riwayat.materials
                        ?.map(m => m.materialName)
                        .filter(name => /spliter|adapter sc|splice on connector|patchcore/i.test(name));
                    actualSolutionVsLapangan = odpMaterials && odpMaterials.length > 0 ? odpMaterials.join(', ') : 'Perbaikan ODP';
                }
                row["ACTUAL SOLUTION vs LAPANGAN"] = actualSolutionVsLapangan;

                const materialsUsed = new Map<string, number>();
                (riwayat.materials || []).forEach(mat => {
                    materialsUsed.set(mat.materialName, (materialsUsed.get(mat.materialName) || 0) + (mat.quantity || 1));
                });
                
                excelHeaders.forEach(header => {
                    if (row[header] === undefined) {
                         const materialQty = materialsUsed.get(header);
                         row[header] = materialQty || '';
                    }
                });
                
                const protectionSleeveQty = materialsUsed.get("Protection Sleeve") || 0;
                row["Termovit (cm)"] = protectionSleeveQty > 0 ? protectionSleeveQty * 15 : '';

                const patchcore1MtrQty = materialsUsed.get("PATCHCORE 1 MTR") || 0;
                row["KELEBIHAN PATCHCORE 1 MTR"] = patchcore1MtrQty > 1 ? patchcore1MtrQty - 1 : '';


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
    
    const handleGenerateDocx = async () => {
        if (selectedIds.length === 0) {
            toast({ variant: 'destructive', title: 'Tidak ada laporan dipilih.' });
            return;
        }
        setIsGeneratingDocx(true);
        toast({ title: 'Mempersiapkan dokumen...', description: 'Mengumpulkan data dan gambar, ini mungkin memakan waktu.' });

        try {
            const selectedRiwayat = riwayatList?.filter(r => selectedIds.includes(r.id)) || [];

            let htmlString = ``;

            for (const riwayat of selectedRiwayat) {
                const tanggalLapor = riwayat.tanggalLapor?.toDate ? format(riwayat.tanggalLapor.toDate(), 'dd MMMM yyyy, HH:mm', { locale: idLocale }) : 'N/A';
                
                htmlString += `
                    <div style="page-break-after: always; font-family: Arial, sans-serif; font-size: 11pt;">
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
                        <img src="${riwayat.evidenSccUrl}" style="max-width: 400px; height: auto; border: 1px solid #ccc; margin-top: 0.5em;" />
                        <br />
                    `;
                }

                if (riwayat.materials && riwayat.materials.length > 0) {
                    for (const material of riwayat.materials) {
                        if (material.evidences && material.evidences.length > 0) {
                             htmlString += `<h3 style="font-size: 12pt; font-weight: bold; margin-top: 1em;">Material: ${material.materialName} (Jumlah: ${material.quantity || 1})</h3>`;
                             
                             htmlString += '<table style="border-collapse: collapse; width: 100%; margin-top: 0.5em;">';
                             let cells = '';
                             material.evidences.forEach((ev, index) => {
                                 if (index % 2 === 0) cells += '<tr>';
                                 cells += `
                                    <td style="padding: 5px; border: 1px solid #ddd; text-align: center; width: 50%;">
                                        <p style="font-size: 10pt; margin: 0 0 5px 0; font-weight: bold; text-transform: capitalize;">${ev.evidenceName}</p>
                                        <img src="${ev.photoUrl}" style="max-width: 100%; height: auto; display: block; margin: 0 auto;" />
                                    </td>
                                 `;
                                 if (index % 2 !== 0 || index === material.evidences!.length - 1) {
                                     if(index % 2 === 0 && index === material.evidences!.length - 1) {
                                         cells += '<td></td>';
                                     }
                                     cells += '</tr>';
                                 }
                             });
                             htmlString += `<tbody>${cells}</tbody></table><br />`;
                        }
                    }
                }
                htmlString += `</div>`;
            }

            if (!htmlString.trim()) {
                throw new Error("Tidak ada data eviden untuk diekspor dalam laporan yang dipilih.");
            }

            const base64 = await generateDocxAction(htmlString, { orientation: 'portrait' });
            
            const link = document.createElement('a');
            link.href = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${base64}`;
            const dateString = format(new Date(), 'yyyy-MM-dd');
            link.download = `Rekap_Eviden_Gangguan_${dateString}.docx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast({ title: 'Ekspor DOCX Berhasil', description: 'File dokumen telah diunduh.' });

        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Gagal Membuat Dokumen', description: error.message });
        } finally {
            setIsGeneratingDocx(false);
        }
    };

    const isPageLoading = isUserLoading || isProfileLoading;

    if (isPageLoading) {
        return <div>Memuat...</div>
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Rekap Assurance & Eviden</h1>
            <p className="text-muted-foreground">Buat file Excel rekapitulasi data gangguan untuk tim Assurance atau dokumen Word untuk eviden.</p>

             <Card>
                <CardHeader>
                    <CardTitle>Filter Laporan</CardTitle>
                    <CardDescription>Pilih rentang tanggal laporan gangguan untuk diekspor.</CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="grid gap-2">
                        <Label>Rentang Tanggal Lapor</Label>
                         <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    id="date-range-picker"
                                    variant={"outline"}
                                    className={cn("w-[300px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange?.from ? (
                                        dateRange.to ? (
                                            <>{format(dateRange.from, "dd LLL, yy", {locale: idLocale})} - {format(dateRange.to, "dd LLL, yy", {locale: idLocale})}</>
                                        ) : (format(dateRange.from, "dd LLL, yy", {locale: idLocale}))
                                    ) : (<span>Pilih rentang tanggal</span>)}
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
                    {riwayatList && (
                        <CardDescription>
                            Ditemukan {riwayatList.length} laporan. {selectedIds.length} laporan dipilih.
                        </CardDescription>
                    )}
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12">
                                        <Checkbox
                                            checked={(riwayatList?.length ?? 0) > 0 && selectedIds.length === riwayatList?.length}
                                            onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                            aria-label="Pilih semua"
                                        />
                                    </TableHead>
                                    <TableHead>No Tiket</TableHead>
                                    <TableHead>No Service</TableHead>
                                    <TableHead>Petugas</TableHead>
                                    <TableHead>Jenis Order</TableHead>
                                    <TableHead>Tanggal Lapor</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isRiwayatLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center h-24">Memuat data...</TableCell>
                                    </TableRow>
                                ) : riwayatList && riwayatList.length > 0 ? (
                                    riwayatList.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedIds.includes(item.id)}
                                                    onCheckedChange={(checked) => handleSelect(item.id, !!checked)}
                                                    aria-label={`Pilih laporan ${item.noTiket}`}
                                                />
                                            </TableCell>
                                            <TableCell>{item.noTiket}</TableCell>
                                            <TableCell>{item.noService}</TableCell>
                                            <TableCell>{item.namaPetugas}</TableCell>
                                            <TableCell>{item.jenisOrder}</TableCell>
                                            <TableCell>{format(item.tanggalLapor.toDate(), 'dd MMM yyyy')}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                     <TableRow>
                                        <TableCell colSpan={6} className="text-center h-24">
                                            {dateRange ? 'Tidak ada data untuk rentang tanggal yang dipilih.' : 'Pilih rentang tanggal untuk menampilkan data.'}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
                <CardFooter>
                    <div className="flex gap-2">
                        <Button onClick={handleExport} disabled={isLoadingExcel || isRiwayatLoading || selectedIds.length === 0}>
                            {(isLoadingExcel) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                            Export Excel
                        </Button>
                         <Button onClick={handleGenerateDocx} disabled={isGeneratingDocx || isRiwayatLoading || selectedIds.length === 0} variant="secondary">
                            {(isGeneratingDocx) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Files className="mr-2 h-4 w-4" />}
                            Export Eviden (DOCX)
                        </Button>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}

