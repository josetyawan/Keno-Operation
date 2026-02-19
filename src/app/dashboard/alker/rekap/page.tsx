
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { FileSpreadsheet } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { AlkerChecklist, UserProfile } from '@/lib/types';
import * as XLSX from 'xlsx';

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

const getMonthYearOptions = (checklists: AlkerChecklist[] | null) => {
    if (!checklists) return [];
    const monthYears = new Set<string>();
    checklists.forEach(c => {
        const date = c.dateSubmitted?.toDate();
        if (date) {
            monthYears.add(format(date, 'yyyy-MM'));
        }
    });
    return Array.from(monthYears).sort().reverse();
};

export default function AlkerRekapPage() {
    const firestore = useFirestore();

    const [selectedJabatan, setSelectedJabatan] = useState('all');
    const [selectedMonth, setSelectedMonth] = useState('');

    const usersQuery = useMemoFirebase(() => query(collection(firestore, 'users')), [firestore]);
    const { data: allUsers, isLoading: usersLoading } = useCollection<UserProfile>(usersQuery);

    const checklistsQuery = useMemoFirebase(() => {
        // More robust sequential loading: only query for checklists if the user data has actually been loaded.
        if (!allUsers) {
            return null;
        }
        return query(collection(firestore, 'tool-checklists'));
    }, [firestore, allUsers]); // Depends on the actual user data, not just the loading flag.
    const { data: allChecklists, isLoading: checklistsLoading } = useCollection<AlkerChecklist>(checklistsQuery);

    const jabatans = useMemo(() => {
        if (!allUsers) return [];
        const jabatanSet = new Set(allUsers.map(u => u.jabatan).filter(Boolean));
        return Array.from(jabatanSet).sort();
    }, [allUsers]);

    const monthOptions = useMemo(() => getMonthYearOptions(allChecklists), [allChecklists]);

    useEffect(() => {
        if (monthOptions.length > 0 && !selectedMonth) {
            setSelectedMonth(monthOptions[0]);
        }
    }, [monthOptions, selectedMonth]);

    const { filteredUsers, filteredChecklists, numTeknisi } = useMemo(() => {
        if (!allUsers || !allChecklists) {
            return { filteredUsers: [], filteredChecklists: [], numTeknisi: 0 };
        }

        const usersByJabatan = selectedJabatan === 'all'
            ? allUsers.filter(u => u.role === 'teknisi')
            : allUsers.filter(u => u.jabatan === selectedJabatan);
        
        const userIds = new Set(usersByJabatan.map(u => u.id));
        const count = userIds.size;

        const checklistsInMonth = selectedMonth
            ? allChecklists.filter(c => {
                const date = c.dateSubmitted?.toDate();
                return date && format(date, 'yyyy-MM') === selectedMonth && userIds.has(c.userId);
              })
            : allChecklists.filter(c => userIds.has(c.userId));

        return { filteredUsers: usersByJabatan, filteredChecklists: checklistsInMonth, numTeknisi: count };
    }, [allUsers, allChecklists, selectedJabatan, selectedMonth]);

    const summaryData = useMemo(() => {
        if (numTeknisi === 0) return [];

        return toolBenchmarks.map(tool => {
            const target = tool.tolokUkur === 'Per-1 Teknisi' ? numTeknisi : Math.ceil(numTeknisi / 2);
            
            const relevantTools = filteredChecklists.flatMap(c => c.tools).filter(t => t.toolName === tool.name && t.condition === 'baik');
            const pemenuhan = relevantTools.length;
            const gap = pemenuhan - target;
            
            const ketMerk = relevantTools.map(t => `${t.brand || ''} ${t.serialNumber || ''}`.trim()).filter(Boolean).join('; ');

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
            'Ket Merk/Type': item.ketMerk,
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
        
        // Add summary row
        XLSX.utils.sheet_add_aoa(worksheet, [
            ["", "Nilai Kelengkapan (%)", "", "", "", "", "", "", `${nilaiKelengkapan.toFixed(2)}%`]
        ], { origin: -1 });

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Alker');

        XLSX.writeFile(workbook, `Rekap_Alker_${selectedJabatan}_${selectedMonth || 'Semua'}.xlsx`);
    };
    
    // The page is loading if either the users haven't loaded, or the users have loaded but the checklists haven't.
    const isLoading = usersLoading || (allUsers && checklistsLoading);

    if (isLoading) {
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
                        <Label htmlFor="jabatan-filter">Jabatan Teknisi</Label>
                        <Select value={selectedJabatan} onValueChange={setSelectedJabatan}>
                            <SelectTrigger id="jabatan-filter"><SelectValue placeholder="Pilih jabatan..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Teknisi</SelectItem>
                                {jabatans.map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
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
                        Menampilkan rekap untuk <strong>{numTeknisi}</strong> teknisi
                        {selectedJabatan !== 'all' && ` dengan jabatan "${selectedJabatan}"`}
                        {selectedMonth && ` pada bulan ${format(new Date(selectedMonth + '-02'), 'MMMM yyyy', {locale: idLocale})}`}.
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
                                    <TableHead className="min-w-[200px]">Ket Merk/Type</TableHead>
                                    <TableHead>Keterangan</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {summaryData.length > 0 ? (
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
                                            Tidak ada data laporan ditemukan untuk filter yang dipilih.
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
