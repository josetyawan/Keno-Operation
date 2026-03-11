
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, where, Timestamp, doc, orderBy, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format, startOfDay, endOfDay } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { RiwayatGangguan, UserProfile, Pelanggan } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { Calendar as CalendarIcon, FileSpreadsheet, Loader2, Files } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';
import * as XLSX from 'xlsx';
import Link from 'next/link';

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
    const [pelangganData, setPelangganData] = useState<Pelanggan[]>([]);
    const [arePelangganLoading, setArePelangganLoading] = useState(false);

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

    useEffect(() => {
        const fetchPelanggan = async () => {
            if (!riwayatList || riwayatList.length === 0) {
                setPelangganData([]);
                return;
            }
            setArePelangganLoading(true);
    
            const serviceNumbers = [...new Set(riwayatList.map(r => r.noService).filter(Boolean))];
            if (serviceNumbers.length === 0) {
                setPelangganData([]);
                setArePelangganLoading(false);
                return;
            }
    
            const pelangganCollection = collection(firestore, 'pelanggan');
            const allFetchedPelanggan: Pelanggan[] = [];
    
            // Chunking the query for 'in' operator
            for (let i = 0; i < serviceNumbers.length; i += 30) {
                const chunk = serviceNumbers.slice(i, i + 30);
                const q = query(pelangganCollection, where('noService', 'in', chunk));
                const querySnapshot = await getDocs(q);
                querySnapshot.forEach(doc => {
                    allFetchedPelanggan.push({ id: doc.id, ...doc.data() } as Pelanggan);
                });
            }
            
            setPelangganData(allFetchedPelanggan);
            setArePelangganLoading(false);
        };
    
        fetchPelanggan();
    }, [riwayatList, firestore]);

    const handleExport = () => {
        if (!riwayatList || riwayatList.length === 0) {
            toast({ variant: 'destructive', title: 'Tidak ada data untuk diekspor.' });
            return;
        }
        setIsExporting(true);

        const pelangganMap = new Map(pelangganData.map(p => [p.noService, p]));

        const materialHeaders = [
            'DROPWIRE', 'DROPCORE BARU', 'DROPCORE REFURBISH', 'ROSET', 'PIGTAIL SC',
            'PATCHCORE 15', 'PATCHCORE 2 MTR', 'KELEBIHAN PATCHCORE 1 MTR',
            'SPLITER 1:2', 'SPLITER 1:4', 'SPLITER 1:8', 'SPLITER 1:16',
            'Termovit (cm)', 'Adapter SC', 'RJ45', 'Protection Sleeve',
            'Splice on Connector', 'Penarikan Kabel UTP (Mtr)'
        ];
        
        const headers = [ 'NO', 'WITEL', 'NO TIKET', 'HASIL CEK WEB', 'ACTUAL SOLUTION', 'ACTUAL SOLUTION vs LAPANGAN', 'DESKRIPSI_CUST_CLOSE', 'LAYANAN', 'IS_GAMAS', 'KET', 'KATEGORI', 'TANGGAL CLOSED', 'NO INTERNET', 'LOKASI', 'STO', ...materialHeaders, 'PUAS'];

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

            // Auto-calculate Termovit based on Protection Sleeve for export
            const protectionSleeveQty = materialQuantities['Protection Sleeve'];
            if (protectionSleeveQty && typeof protectionSleeveQty === 'number' && protectionSleeveQty > 0) {
                materialQuantities['Termovit (cm)'] = protectionSleeveQty * 15;
            }
            
            const pelanggan = pelangganMap.get(riwayat.noService);

            return {
                'NO': index + 1,
                'WITEL': 'SEMARANG',
                'NO TIKET': riwayat.noTiket || '',
                'HASIL CEK WEB': '',
                'ACTUAL SOLUTION': actualSolution,
                'ACTUAL SOLUTION vs LAPANGAN': actualSolutionVsLapangan,
                'DESKRIPSI_CUST_CLOSE': riwayat.keterangan || '',
                'LAYANAN': riwayat.layanan?.join(', ') || '',
                'IS_GAMAS': riwayat.jenisOrder?.toUpperCase().includes('GAMAS') ? 'GAMAS' : '',
                'KET': '',
                'KATEGORI': '',
                'TANGGAL CLOSED': riwayat.tanggalClose ? format(safeToDate(riwayat.tanggalClose)!, 'dd-MM-yyyy') : format(safeToDate(riwayat.tanggalLapor)!, 'dd-MM-yyyy'),
                'NO INTERNET': riwayat.noService || '',
                'LOKASI': pelanggan?.alamat || '',
                'STO': riwayat.sto || '',
                ...materialQuantities,
                'PUAS': ''
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(dataToExport, {header: headers});
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Assurance');
        
        const dateString = format(new Date(), 'yyyy-MM-dd');
        XLSX.writeFile(workbook, `Rekap_Assurance_${dateString}.xlsx`);
        
        setIsExporting(false);
    };

    const isLoading = isUserLoading || isProfileLoading || arePelangganLoading;

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
                <CardContent className="flex flex-wrap items-center gap-4">
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
                    <div className="flex flex-wrap gap-2">
                        <Button onClick={handleExport} disabled={isExporting || areRiwayatLoading || !riwayatList || riwayatList.length === 0}>
                            {(isExporting || areRiwayatLoading) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
                            Export ke Excel
                        </Button>
                        <Button asChild variant="secondary">
                            <Link href="/dashboard/export/gangguan">
                                <Files className="mr-2 h-4 w-4" />
                                Buat Rekap Eviden (DOCX)
                            </Link>
                        </Button>
                    </div>
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
