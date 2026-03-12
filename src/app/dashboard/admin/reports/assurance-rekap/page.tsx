'use client';

import { useState, useMemo, useEffect } from 'react';
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
import { Calendar as CalendarIcon, Download, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';
import * as XLSX from 'xlsx';
import { useRouter } from 'next/navigation';
import { Label } from '@/components/ui/label';

const excelHeaders = [
    "NO WITEL", "NO TIKET", "HASIL CEK WEB", "ACTUAL SOLUTION", "ACTUAL SOLUTION vs LAPANGAN", 
    "DESKRIPSI_CUST_CLOSE", "LAYANAN", "IS_GAMAS", "KET KATEGORI", "TANGGAL CLOSED", 
    "NO INTERNET", "LOKASI STO", "DROPWIRE", "DROPCORE BARU", "DROPCORE REFURBISH", 
    "ROSET", "PIGTAIL SC", "PATCHCORE 15", "PATCHCORE 2 MTR", "KELEBIHAN PATCHCORE 1 MTR", 
    "SPLITER 1:2", "SPLITER 1:4", "SPLITER 1:8", "SPLITER 1:16", "PUAS", 
    "Termovit (cm)", "Adapter SC", "RJ45", "Protection Sleeve", "Splice on Connector", 
    "Penarikan Kabel UTP (Mtr)"
];

const materialHeaderMapping: { [key: string]: string[] } = {
    "DROPWIRE": ["DROPWIRE"], // This might need adjustment if it's a sum
    "DROPCORE BARU": ["DROPCORE BARU"],
    "DROPCORE REFURBISH": ["DROPCORE REFURBISH"],
    "ROSET": ["ROSET"],
    "PIGTAIL SC": ["PIGTAIL SC"],
    "PATCHCORE 15": ["PATCHCORE 15"],
    "PATCHCORE 2 MTR": ["PATCHCORE 2 MTR"],
    "SPLITER 1:2": ["SPLITER 1:2"],
    "SPLITER 1:4": ["SPLITER 1:4"],
    "SPLITER 1:8": ["SPLITER 1:8"],
    "SPLITER 1:16": ["SPLITER 1:16"],
    "Adapter SC": ["Adapter SC"],
    "RJ45": ["RJ45"],
    "Splice on Connector": ["Splice on Connector"],
    "Penarikan Kabel UTP (Mtr)": ["Penarikan Kabel UTP (Mtr)"],
};

export default function AssuranceRekapPage() {
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    const { user, isUserLoading } = useUser();
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [isLoading, setIsLoading] = useState(false);

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
        if (!dateRange?.from || !dateRange.to) return null;
        const start = startOfDay(dateRange.from);
        const end = endOfDay(dateRange.to);
        return query(
            collection(firestore, 'riwayat-gangguan'),
            where('tanggalLapor', '>=', Timestamp.fromDate(start)),
            where('tanggalLapor', '<=', Timestamp.fromDate(end))
        );
    }, [firestore, dateRange]);

    const { data: riwayatList, isLoading: isRiwayatLoading } = useCollection<RiwayatGangguan>(riwayatQuery);

    const handleExport = () => {
        if (!riwayatList || riwayatList.length === 0) {
            toast({ variant: 'destructive', title: 'Tidak ada data untuk diekspor.' });
            return;
        }

        setIsLoading(true);

        try {
            const dataToExport = riwayatList.map(riwayat => {
                const row: { [key: string]: any } = {};
                
                // Static and directly mapped fields
                row["NO WITEL"] = "SEMARANG";
                row["NO TIKET"] = riwayat.noTiket || '';
                row["HASIL CEK WEB"] = ''; // Placeholder
                row["ACTUAL SOLUTION"] = ''; // Placeholder
                row["ACTUAL SOLUTION vs LAPANGAN"] = ''; // Placeholder
                row["DESKRIPSI_CUST_CLOSE"] = riwayat.keterangan || '';
                row["LAYANAN"] = Array.isArray(riwayat.layanan) ? riwayat.layanan.join(', ') : '';
                row["IS_GAMAS"] = riwayat.jenisOrder === 'Tiket GAMAS' ? 'GAMAS' : 'NON GAMAS';
                row["KET KATEGORI"] = ''; // Placeholder
                row["TANGGAL CLOSED"] = riwayat.tanggalClose?.toDate ? format(riwayat.tanggalClose.toDate(), 'yyyy-MM-dd HH:mm:ss') : '';
                row["NO INTERNET"] = riwayat.noService || '';
                row["LOKASI STO"] = riwayat.sto || '';
                row["PUAS"] = ''; // Placeholder

                // Material mapping logic
                const materialsUsed = new Map<string, number>();
                riwayat.materials?.forEach(mat => {
                    materialsUsed.set(mat.materialName, (materialsUsed.get(mat.materialName) || 0) + (mat.quantity || 1));
                });
                
                // Regular material mapping
                for(const header in materialHeaderMapping) {
                    const materialNames = materialHeaderMapping[header];
                    let totalQuantity = 0;
                    materialNames.forEach(name => {
                        if(materialsUsed.has(name)) {
                            totalQuantity += materialsUsed.get(name)!;
                        }
                    });
                    row[header] = totalQuantity > 0 ? totalQuantity : '';
                }

                // Special logic for Protection Sleeve and Termovit
                const protectionSleeveQty = materialsUsed.get("Protection Sleeve") || 0;
                row["Protection Sleeve"] = protectionSleeveQty > 0 ? protectionSleeveQty : '';
                row["Termovit (cm)"] = protectionSleeveQty > 0 ? protectionSleeveQty * 15 : '';

                // Special logic for 'KELEBIHAN PATCHCORE 1 MTR'
                const patchcore1MtrQty = materialsUsed.get("PATCHCORE 1 MTR") || 0;
                row["KELEBIHAN PATCHCORE 1 MTR"] = patchcore1MtrQty > 1 ? patchcore1MtrQty - 1 : '';


                return row;
            });
            
            const worksheet = XLSX.utils.json_to_sheet(dataToExport, { header: excelHeaders });
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Assurance');
            
            const dateString = format(new Date(), 'yyyy-MM-dd');
            XLSX.writeFile(workbook, `Rekap_Assurance_${dateString}.xlsx`);
            
            toast({ title: 'Ekspor Berhasil', description: `${riwayatList.length} baris data telah diekspor.` });

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Gagal Mengekspor', description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    const isPageLoading = isUserLoading || isProfileLoading;

    if (isPageLoading) {
        return <div>Memuat...</div>
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Rekap Assurance</h1>
            <p className="text-muted-foreground">Buat file Excel rekapitulasi data gangguan untuk tim Assurance.</p>

             <Card>
                <CardHeader>
                    <CardTitle>Filter Laporan</CardTitle>
                    <CardDescription>Pilih rentang tanggal laporan gangguan untuk diekspor.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-end gap-4">
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
                    <Button onClick={handleExport} disabled={isLoading || isRiwayatLoading || !riwayatList || riwayatList.length === 0}>
                        {(isLoading || isRiwayatLoading) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        Generate & Download Excel
                    </Button>
                </CardContent>
                {riwayatList && (
                    <CardFooter>
                        <p className="text-sm text-muted-foreground">
                            Ditemukan {riwayatList.length} laporan dalam rentang tanggal yang dipilih.
                        </p>
                    </CardFooter>
                )}
            </Card>
        </div>
    );
}