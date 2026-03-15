
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileSpreadsheet } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isValid } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { RiwayatGangguan, OtherWork, ProvisioningRecord } from '@/lib/types';
import { productivityWeights } from '@/lib/bobot-produktivitas';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import * as XLSX from 'xlsx';

const workCategories = Object.keys(productivityWeights);

const orderToCategoryMap = new Map<string, string>();
Object.entries(productivityWeights).forEach(([category, items]) => {
  items.forEach(item => {
    const key = item.order_type ? `${item.jenis_order_name}#${item.order_type}` : item.jenis_order_name;
    orderToCategoryMap.set(key, category);
  });
});


const getWorkCategory = (item: RiwayatGangguan | OtherWork | ProvisioningRecord): string | null => {
    let jenisOrder: string;
    let orderType: string | undefined;

    if ('crmOrder' in item) { // ProvisioningRecord
        jenisOrder = item.crmOrder;
        orderType = item.description;
    } else { // RiwayatGangguan or OtherWork
        jenisOrder = item.jenisOrder;
        orderType = (item as RiwayatGangguan).typeOrder || (item as OtherWork).orderType;
    }
    
    if (!jenisOrder) return null;

    if (orderType) {
        const keyWithOrderType = `${jenisOrder}#${orderType}`;
        if (orderToCategoryMap.has(keyWithOrderType)) {
            return orderToCategoryMap.get(keyWithOrderType)!;
        }
    }
    
    if (orderToCategoryMap.has(jenisOrder)) {
        return orderToCategoryMap.get(jenisOrder)!;
    }

    return null;
};


export default function WorkCategoryRekapPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [isLoading, setIsLoading] = useState(false);

    const monthOptions = useMemo(() => {
        const options = [];
        const now = new Date();
        for (let i = 0; i < 12; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            options.push({
                value: format(date, 'yyyy-MM'),
                label: format(date, 'MMMM yyyy', { locale: idLocale }),
            });
        }
        return options;
    }, []);

    const dateRange = useMemo(() => {
        if (!selectedMonth) return null;
        const [year, month] = selectedMonth.split('-').map(Number);
        const startDate = startOfMonth(new Date(year, month - 1));
        const endDate = endOfMonth(startDate);
        return { startDate, endDate };
    }, [selectedMonth]);

    const riwayatQuery = useMemoFirebase(() => {
        if (!dateRange) return null;
        return query(
            collection(firestore, 'riwayat-gangguan'),
            where('tanggalLapor', '>=', Timestamp.fromDate(dateRange.startDate)),
            where('tanggalLapor', '<=', Timestamp.fromDate(dateRange.endDate))
        );
    }, [firestore, dateRange]);

    const otherWorksQuery = useMemoFirebase(() => {
        if (!dateRange) return null;
        return query(
            collection(firestore, 'other-works'),
            where('tanggalPengerjaan', '>=', Timestamp.fromDate(dateRange.startDate)),
            where('tanggalPengerjaan', '<=', Timestamp.fromDate(dateRange.endDate))
        );
    }, [firestore, dateRange]);

    const provisioningQuery = useMemoFirebase(() => {
        if (!dateRange) return null;
        return query(
            collection(firestore, 'provisioning-records'),
            where('completedAt', '>=', Timestamp.fromDate(dateRange.startDate)),
            where('completedAt', '<=', Timestamp.fromDate(dateRange.endDate))
        );
    }, [firestore, dateRange]);

    const { data: riwayatList, isLoading: isRiwayatLoading } = useCollection<RiwayatGangguan>(riwayatQuery);
    const { data: otherWorksList, isLoading: isOtherWorksLoading } = useCollection<OtherWork>(otherWorksQuery);
    const { data: provisioningList, isLoading: isProvisioningLoading } = useCollection<ProvisioningRecord>(provisioningQuery);

    const filteredData = useMemo(() => {
        if (!riwayatList || !otherWorksList || !provisioningList) return [];

        const allWorkItems: (RiwayatGangguan | OtherWork | ProvisioningRecord)[] = [...riwayatList, ...otherWorksList, ...provisioningList];
        
        if (selectedCategory === 'all') {
            return allWorkItems;
        }

        return allWorkItems.filter(item => {
            const category = getWorkCategory(item);
            return category === selectedCategory;
        });

    }, [riwayatList, otherWorksList, provisioningList, selectedCategory]);

    const handleExportExcel = () => {
        if (filteredData.length === 0) {
            toast({ variant: 'destructive', title: 'Tidak ada data untuk diekspor.' });
            return;
        }

        setIsLoading(true);

        const dataToExport = filteredData.map((item, index) => {
            const isProvisioning = 'crmOrder' in item;
            const isRiwayat = 'noService' in item && !isProvisioning;

            let createDate, closeDate, chief, jenisOrder, orderType, woNumber = '';

            if (isProvisioning) {
                const record = item as ProvisioningRecord;
                createDate = record.assignedAt;
                closeDate = record.completedAt;
                chief = record.assignedTo_userName || '';
                jenisOrder = record.crmOrder;
                orderType = record.description || '';
                woNumber = record.workorder;
            } else if (isRiwayat) {
                const record = item as RiwayatGangguan;
                createDate = record.tanggalOpen;
                closeDate = record.tanggalClose;
                chief = record.nik || '';
                jenisOrder = record.jenisOrder;
                orderType = record.typeOrder || '';
            } else { // OtherWork
                const record = item as OtherWork;
                createDate = record.tanggalPengerjaan;
                closeDate = record.tanggalSelesai;
                chief = record.nik || '';
                jenisOrder = record.jenisOrder;
                orderType = record.orderType || '';
                woNumber = record.namaPekerjaan || '';
            }

            const category = getWorkCategory(item);
             if (category && category.toUpperCase().includes('PROVISIONING')) {
                if ('workorder' in item) woNumber = item.workorder;
            } else if (jenisOrder.toLowerCase().includes('spbu')) {
                if ('noService' in item) woNumber = item.noService;
            }

            return {
                'Service Number': isRiwayat ? (item as RiwayatGangguan).noService : (isProvisioning ? (item as ProvisioningRecord).serviceNo : '-'),
                'WO Number': woNumber,
                'Ticket Id': (item as RiwayatGangguan).noTiket || '',
                'Chief': chief,
                'GAUL': 0,
                'Guarantee Status': '',
                'Jenis Order': jenisOrder,
                'Order Type': orderType || '',
                'Create Date(YYYY-MM-DD HH:MM:SS)': createDate?.toDate ? format(createDate.toDate(), 'yyyy-MM-dd HH:mm:ss') : '-',
                'Closed Date(YYYY-MM-DD HH:MM:SS)': closeDate?.toDate ? format(closeDate.toDate(), 'yyyy-MM-dd HH:mm:ss') : '-',
                'AREA': 'JAWA BALI',
                'BRANCH': 'BRANCH SEMARANG',
                'SERVICE AREA': 'SERVICE AREA KUDUS'
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Kategori PBS');

        const monthLabel = monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth;
        XLSX.writeFile(workbook, `Rekap_PBS_${selectedCategory}_-_${monthLabel}.xlsx`);

        setIsLoading(false);
    };
    
    const pageIsLoading = isRiwayatLoading || isOtherWorksLoading || isProvisioningLoading;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Rekap Kategori Pekerjaan</h1>
            <p className="text-muted-foreground">Kelompokkan pekerjaan berdasarkan kategori dan unduh sebagai laporan Excel.</p>

            <Card>
                <CardHeader>
                    <CardTitle>Filter Laporan</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap items-end gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="month-select">Bulan</Label>
                        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                            <SelectTrigger id="month-select" className="w-[180px]">
                                <SelectValue placeholder="Pilih Bulan..." />
                            </SelectTrigger>
                            <SelectContent>
                                {monthOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="category-select">Kategori Pekerjaan</Label>
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                            <SelectTrigger id="category-select" className="w-[280px]">
                                <SelectValue placeholder="Pilih Kategori..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Kategori</SelectItem>
                                {workCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                     <Button onClick={handleExportExcel} disabled={isLoading || pageIsLoading || filteredData.length === 0}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
                        Download Excel
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Daftar Pekerjaan</CardTitle>
                    <CardDescription>Menampilkan {filteredData.length} pekerjaan yang cocok dengan filter.</CardDescription>
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Petugas</TableHead>
                                <TableHead>No Tiket/Pekerjaan</TableHead>
                                <TableHead>Jenis Order</TableHead>
                                <TableHead>Kategori</TableHead>
                                <TableHead>Tanggal</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(pageIsLoading) ? (
                                <TableRow><TableCell colSpan={5} className="h-24 text-center">Memuat data...</TableCell></TableRow>
                            ) : filteredData.length > 0 ? (
                                filteredData.slice(0, 20).map((item: any) => {
                                    const isProvisioning = 'crmOrder' in item;
                                    const tanggal = isProvisioning ? item.completedAt : ('tanggalLapor' in item ? item.tanggalLapor : item.tanggalPengerjaan);
                                    return (
                                    <TableRow key={item.id}>
                                        <TableCell>{isProvisioning ? item.assignedTo_userName : item.namaPetugas}</TableCell>
                                        <TableCell>{item.noTiket || item.namaPekerjaan || item.workorder || item.serviceNo || '-'}</TableCell>
                                        <TableCell>{isProvisioning ? item.crmOrder : item.jenisOrder}</TableCell>
                                        <TableCell>{getWorkCategory(item)}</TableCell>
                                        <TableCell>{tanggal?.toDate ? format(tanggal.toDate(), 'dd MMM yyyy') : '-'}</TableCell>
                                    </TableRow>
                                )})
                            ) : (
                                <TableRow><TableCell colSpan={5} className="h-24 text-center">Tidak ada data untuk filter yang dipilih.</TableCell></TableRow>
                            )}
                        </TableBody>
                     </Table>
                     {filteredData.length > 20 && <p className="text-sm text-muted-foreground mt-4 text-center">Dan {filteredData.length - 20} item lainnya...</p>}
                </CardContent>
            </Card>
        </div>
    );
}
