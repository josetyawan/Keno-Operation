'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, where, Timestamp, doc, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format, startOfDay, endOfDay } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { RiwayatGangguan, UserProfile } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { Calendar as CalendarIcon, FileSpreadsheet, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';
import * as XLSX from 'xlsx';

const safeToDate = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (timestamp.toDate) return timestamp.toDate();
    if (timestamp instanceof Date) return timestamp;
    const d = new Date(timestamp);
    return d instanceof Date && !isNaN(d.getTime()) ? d : null;
};


export default function AssuranceRekapPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [isExporting, setIsExporting] = useState(false);

    const { data: currentUserProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(
        useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore])
    );

    const riwayatQuery = useMemoFirebase(() => {
        if (!dateRange?.from || !dateRange?.to) return null;
        const start = startOfDay(dateRange.from);
        const end = endOfDay(dateRange.to);

        return query(
            collection(firestore, 'riwayat-gangguan'),
            where('tanggalLapor', '>=', Timestamp.fromDate(start)),
            where('tanggalLapor', '<=', Timestamp.fromDate(end)),
            orderBy('tanggalLapor', 'asc')
        );
    }, [firestore, dateRange]);

    const { data: riwayatList, isLoading: areRiwayatLoading } = useCollection<RiwayatGangguan>(riwayatQuery);

    const handleExport = () => {
        if (!riwayatList || riwayatList.length === 0) {
            toast({ variant: 'destructive', title: 'Tidak ada data untuk diekspor.' });
            return;
        }
        setIsExporting(true);

        const materialHeaders = [
            'DROPCORE BARU', 'DROPCORE REFURBISH', 'ROSET', 'PIGTAIL SC', 
            'PATCHCORE 15', 'PATCHCORE 2 MTR', 'PATCHCORE 1 MTR', 
            'SPLITER 1:2', 'SPLITER 1:4', 'SPLITER 1:8', 'SPLITER 1:16', 
            'Termovit (cm)', 'Adapter SC', 'RJ45', 'Protection Sleeve', 
            'Splice on Connector', 'Penarikan Kabel UTP (Mtr)'
        ];

        const dataToExport = riwayatList.map((riwayat, index) => {
            const ketLowerCase = riwayat.keterangan?.toLowerCase() || '';
            const dropcoreKeywords = ['dropcore', 'dc', 'gdc', 'sambul', 'sambung ulang', 'smuff', 'protective slevee', 'ikr'];
            const odpKeywords = ['odp', 'spliter', 'sc', 'pathcore', 'pigtail'];

            let actualSolution = '';
            if (dropcoreKeywords.some(kw => ketLowerCase.includes(kw))) {
                actualSolution = 'DROPCORE';
            } else if (odpKeywords.some(kw => ketLowerCase.includes(kw))) {
                actualSolution = 'ODP';
            }

            let actualSolutionVsLapangan = '';
            if (actualSolution === 'DROPCORE') {
                actualSolutionVsLapangan = 'Sambung DC';
            } else if (actualSolution === 'ODP') {
                actualSolutionVsLapangan = riwayat.materials?.filter(m => odpKeywords.some(kw => m.materialName.toLowerCase().includes(kw))).map(m => m.materialName).join(', ') || '';
            }
            
            const materialQuantities: Record<string, number | string> = {};
            materialHeaders.forEach(header => materialQuantities[header] = '');

            riwayat.materials?.forEach(material => {
                if (materialHeaders.includes(material.materialName)) {
                    materialQuantities[material.materialName] = material.quantity ?? '';
                }
            });

            return {
                'NO': index + 1,
                'NIK': riwayat.nik || '',
                'NAMA': riwayat.namaPetugas || '',
                'NO TIKET': riwayat.noTiket || '',
                'HASIL CEK WEB': '',
                'ACTUAL SOLUTION': actualSolution,
                'ACTUAL SOLUTION VS LAPANGAN': actualSolutionVsLapangan,
                'DESKRIPSI_CUST_CLOSE': riwayat.keterangan || '',
                'WITEL': 'SEMARANG',
                'TANGGAL CLOSE': riwayat.tanggalClose ? format(safeToDate(riwayat.tanggalClose)!, 'dd-MM-yyyy') : format(safeToDate(riwayat.tanggalLapor)!, 'dd-MM-yyyy'),
                'LAYANAN': riwayat.layanan?.join(', ') || '',
                ...materialQuantities
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Assurance');
        
        const dateString = format(new Date(), 'yyyy-MM-dd');
        XLSX.writeFile(workbook, `Rekap_Assurance_${dateString}.xlsx`);
        
        setIsExporting(false);
    };

    const isLoading = isUserLoading || isProfileLoading;

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Rekap Laporan Assurance</h1>
                <p className="text-muted-foreground">Pilih rentang tanggal laporan untuk membuat dokumen rekapitulasi.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Filter Periode Laporan</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-4">
                     <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                id="date"
                                variant={'outline'}
                                className={cn('w-full max-w-sm justify-start text-left font-normal', !dateRange && 'text-muted-foreground')}
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
                                    <span>Pilih rentang tanggal laporan</span>
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
                                captionLayout="dropdown-buttons"
                                fromYear={new Date().getFullYear() - 5}
                                toYear={new Date().getFullYear()}
                            />
                        </PopoverContent>
                    </Popover>
                    <Button onClick={handleExport} disabled={isExporting || areRiwayatLoading || !riwayatList || riwayatList.length === 0}>
                        {(isExporting || areRiwayatLoading) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
                        Export ke Excel
                    </Button>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Data Laporan Ditemukan</CardTitle>
                    <CardDescription>
                        Ditemukan {riwayatList?.length || 0} laporan untuk periode yang dipilih.
                    </CardDescription>
                </CardHeader>
            </Card>
        </div>
    );
}
