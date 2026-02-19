'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, doc, where, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { FileSpreadsheet } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { AlkerChecklist, UserProfile } from '@/lib/types';
import * as XLSX from 'xlsx';
import { useRouter } from 'next/navigation';

const toolBenchmarks = [
    { name: "Splicer (Asuransi dan pajak, Maintenance Service, SUCA dan elektroda)", satuan: "Unit", tolokUkur: "Per-2 Teknisi" },
    { name: "Optical Power Meter", satuan: "Unit", tolokUkur: "Per-1 Teknisi" },
    { name: "VFL (Visible Fault Locator) 20km", satuan: "Unit", tolokUkur: "Per-2 Teknisi" },
    { name: "Optical Fiber Ranger", satuan: "Unit", tolokUkur: "Per-2 Teknisi" },
    { name: "One Click Cleanner (Fiber Cleaner)", satuan: "Set", tolokUkur: "Per-1 Teknisi" },
    { name: "Toolkit Fo (Fiber Stripper)", satuan: "Set", tolokUkur: "Per-1 Teknisi" },
    { name: "Tangga Dorong Aluminium (5.1 Meter)", satuan: "Unit", tolokUkur: "Per-1 Teknisi" },
    { name: "Powerbank Valins + Converter Type-C to RJ 45", satuan: "Unit", tolokUkur: "Per-1 Teknisi" },
    { name: "Testphone", satuan: "Unit", tolokUkur: "Per-1 Teknisi" },
    { name: "Tone Checker", satuan: "Unit", tolokUkur: "Per-2 Teknisi" },
    { name: "LAN Tester", satuan: "Unit", tolokUkur: "Per-1 Teknisi" },
    { name: "Toolkit Set", satuan: "Set", tolokUkur: "Per-1 Teknisi" },
    { name: "Crimping tool RJ 11/RJ 45", satuan: "Unit", tolokUkur: "Per-1 Teknisi" },
    { name: "Body Harness/ Working Belt, Helm pengaman dan Kaus tangan", satuan: "Set", tolokUkur: "Per-1 Teknisi" },
    { name: "Jas Hujan", satuan: "Unit", tolokUkur: "Per-1 Teknisi" },
    { name: "Tas Punggung", satuan: "Unit", tolokUkur: "Per-1 Teknisi" },
    { name: "KBM Roda 2", satuan: "Unit", tolokUkur: "Per-1 Teknisi" },
];

const getMonthOptions = () => {
    const options: string[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        options.push(format(date, 'yyyy-MM'));
    }
    return options;
};

export default function AlkerRekapPage() {
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();
    const router = useRouter();

    const [selectedMonth, setSelectedMonth] = useState('');

    const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

    useEffect(() => {
        if (!isUserLoading && !isProfileLoading) {
            if (!userProfile || (userProfile.role !== 'admin' && userProfile.role !== 'korlap')) {
                router.push('/dashboard');
            }
        }
    }, [userProfile, isUserLoading, isProfileLoading, router]);

    const monthOptions = useMemo(() => getMonthOptions(), []);

    const checklistsQuery = useMemoFirebase(() => {
        if (!userProfile || (userProfile.role !== 'admin' && userProfile.role !== 'korlap') || !selectedMonth) {
            return null; // Don't query if no month is selected
        }
        
        const year = parseInt(selectedMonth.split('-')[0]);
        const monthIndex = parseInt(selectedMonth.split('-')[1]) - 1;
        const startDate = startOfMonth(new Date(year, monthIndex));
        const endDate = endOfMonth(new Date(year, monthIndex));

        return query(
            collection(firestore, 'tool-checklists'),
            where('dateSubmitted', '>=', Timestamp.fromDate(startDate)),
            where('dateSubmitted', '<=', Timestamp.fromDate(endDate))
        );
    }, [firestore, userProfile, selectedMonth]);

    const { data: checklistsInMonth, isLoading: checklistsLoading } = useCollection<AlkerChecklist>(checklistsQuery);
    
    useEffect(() => {
        if (monthOptions.length > 0 && !selectedMonth) {
            setSelectedMonth(monthOptions[0]);
        }
    }, [monthOptions, selectedMonth]);

    const { filteredChecklists, numTeknisi } = useMemo(() => {
        if (!checklistsInMonth) {
            return { filteredChecklists: [], numTeknisi: 0 };
        }
        
        const uniqueUserIds = new Set(checklistsInMonth.map(c => c.userId));
        const count = uniqueUserIds.size;
        
        return { filteredChecklists: checklistsInMonth, numTeknisi: count };
    }, [checklistsInMonth]);

    const summaryData = useMemo(() => {
        if (numTeknisi === 0) return [];

        return toolBenchmarks.map(tool => {
            const target = tool.tolokUkur === 'Per-1 Teknisi' ? numTeknisi : Math.ceil(numTeknisi / 2);
            
            const relevantTools = filteredChecklists.flatMap(c => c.tools).filter(t => t.toolName === tool.name && t.condition === 'baik');
            const pemenuhan = relevantTools.length;
            const gap = pemenuhan - target;
            
            const toolsByUser = relevantTools.reduce((acc, t) => {
                const checklist = filteredChecklists.find(c => c.tools.some(toolInChecklist => toolInChecklist === t));
                 if (checklist) {
                    const userName = checklist.userName || 'Unknown';
                    if (!acc[userName]) {
                        acc[userName] = [];
                    }
                    acc[userName].push(`${t.brand || ''} ${t.serialNumber || ''}`.trim());
                 }
                return acc;
            }, {} as Record<string, string[]>);
            
            const ketMerk = Object.entries(toolsByUser)
                .map(([userName, details]) => `${userName}: ${details.filter(Boolean).join(', ')}`)
                .join('; ');

            let keterangan;
            if (gap >= 0) {
                keterangan = 'Lengkap';
            } else if (pemenuhan === 0) {
                keterangan = `Blm Dapat (Butuh ${target})`;
            } else {
                keterangan = `Kurang ${Math.abs(gap)}`;
            }

            return {
                uraian: tool.name,
                satuan: tool.satuan,
                tolokUkur: tool.tolokUkur,
                target,
                pemenuhan,
                gap,
                ketMerk: ketMerk || '-',
                keterangan,
            };
        });
    }, [numTeknisi, filteredChecklists]);
    
    const totalTarget = useMemo(() => summaryData.reduce((acc, item) => acc + item.target, 0), [summaryData]);
    const totalPemenuhan = useMemo(() => summaryData.reduce((acc, item) => acc + item.pemenuhan, 0), [summaryData]);
    const nilaiKelengkapan = totalTarget > 0 ? (totalPemenuhan / totalTarget) * 100 : 0;


    const handleExport = () => {
        const dataToExport = summaryData.map((item, index) => ({
            'No': index + 1,
            'Uraian': item.uraian,
            'Satuan': item.satuan,
            'Tolok Ukur': item.tolokUkur,
            'Target': item.target,
            'Pemenuhan': item.pemenuhan,
            'GAP': item.gap,
            'Ket Merk/Type/PIC': item.ketMerk,
            'KETERANGAN': item.keterangan,
        }));
        
        const headerInfo = [
            { A: 'ALL INFRASTRUKTUR ACCESS' },
            { A: 'PAKET PEKERJAAN', B: ': ASSURANCE' },
            { A: 'REG / WITEL / SEKTOR', B: ': 3 / KUDUS / PATI' },
            { A: 'BULAN PEKERJAAN', B: `: ${selectedMonth ? format(new Date(selectedMonth + '-02'), 'MMMM yyyy', {locale: idLocale}).toUpperCase() : 'SEMUA'}` },
            { A: 'JUMLAH TEKNISI', B: `: ${numTeknisi}` },
            {}, // Empty row
        ];

        const worksheet = XLSX.utils.json_to_sheet(dataToExport, { skipHeader: true });
        XLSX.utils.sheet_add_aoa(worksheet, [Object.keys(dataToExport[0])], { origin: 'A7' });
        XLSX.utils.sheet_add_json(worksheet, headerInfo, { skipHeader: true, origin: 'A1' });
        
        XLSX.utils.sheet_add_aoa(worksheet, [
            ["", "Nilai Kelengkapan (%)", "", "", "", "", "", "", `${nilaiKelengkapan.toFixed(2)}%`]
        ], { origin: -1 });

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Alker');

        XLSX.writeFile(workbook, `Rekap_Alker_Bulan_${selectedMonth || 'Semua'}.xlsx`);
    };
    
    const isLoading = isUserLoading || isProfileLoading || checklistsLoading;

    if (isUserLoading || isProfileLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-64 mb-4" />
                <Card><CardHeader><Skeleton className="h-24 w-full" /></CardHeader>
                <CardContent><Skeleton className="h-40 w-full" /></CardContent></Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Rekapitulasi Alat Kerja</h1>
                    <p className="text-muted-foreground">Analisis kelengkapan alat kerja teknisi.</p>
                </div>
                <Button onClick={handleExport} disabled={summaryData.length === 0}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Export ke Excel
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Filter Data</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="month-filter">Bulan Pekerjaan</Label>
                         <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                            <SelectTrigger id="month-filter"><SelectValue placeholder="Pilih bulan..." /></SelectTrigger>
                            <SelectContent>
                                {monthOptions.map(m => (
                                    <SelectItem key={m} value={m}>
                                        {format(new Date(m + '-02'), 'MMMM yyyy', {locale: idLocale})}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle>Tabel Rekapitulasi</CardTitle>
                    <CardDescription>
                        {selectedMonth ? 
                         `Menampilkan rekap untuk ${numTeknisi} teknisi yang mengirim laporan pada bulan ${format(new Date(selectedMonth + '-02'), 'MMMM yyyy', {locale: idLocale})}.`
                         : 'Pilih bulan untuk melihat data.'
                        }
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>No</TableHead>
                                    <TableHead className="min-w-[300px]">Uraian</TableHead>
                                    <TableHead>Satuan</TableHead>
                                    <TableHead>Tolok Ukur</TableHead>
                                    <TableHead>Target</TableHead>
                                    <TableHead>Pemenuhan</TableHead>
                                    <TableHead>GAP</TableHead>
                                    <TableHead className="min-w-[200px]">Ket Merk/Type/PIC</TableHead>
                                    <TableHead>Keterangan</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading && selectedMonth ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="h-24 text-center">Memuat data...</TableCell>
                                    </TableRow>
                                ) : summaryData.length > 0 ? (
                                    summaryData.map((item, index) => (
                                        <TableRow key={index}>
                                            <TableCell>{index + 1}</TableCell>
                                            <TableCell>{item.uraian}</TableCell>
                                            <TableCell>{item.satuan}</TableCell>
                                            <TableCell>{item.tolokUkur}</TableCell>
                                            <TableCell>{item.target}</TableCell>
                                            <TableCell>{item.pemenuhan}</TableCell>
                                            <TableCell className={item.gap < 0 ? 'text-destructive font-bold' : ''}>{item.gap}</TableCell>
                                            <TableCell>{item.ketMerk}</TableCell>
                                            <TableCell className="font-semibold">{item.keterangan}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={9} className="h-24 text-center">
                                            {selectedMonth ? 'Tidak ada data laporan ditemukan untuk bulan yang dipilih.' : 'Silakan pilih bulan untuk memulai.'}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                            {summaryData.length > 0 && (
                                <TableFooter>
                                    <TableRow>
                                        <TableCell colSpan={2} className="font-bold text-lg">Nilai Kelengkapan (%)</TableCell>
                                        <TableCell colSpan={7} className="text-right font-bold text-lg">{nilaiKelengkapan.toFixed(2)}%</TableCell>
                                    </TableRow>
                                </TableFooter>
                            )}
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
