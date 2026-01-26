
'use client';

import { useState, useMemo } from 'react';
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
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import { ArrowLeft, Edit, Trash2, Filter, FileText, Printer, FileArchive } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { format, getMonth, getYear } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { Nota } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';


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
    const notasQuery = useMemoFirebase(() => {
        return query(collection(firestore, 'notas'), orderBy('tanggal', 'desc'));
    }, [firestore]);

    const { data: notas, isLoading } = useCollection<Nota>(notasQuery);

    const [filterType, setFilterType] = useState('monthly');
    const [selectedMonth, setSelectedMonth] = useState<string>('');
    const [selectedNotaIds, setSelectedNotaIds] = useState<string[]>([]);
    
    const monthOptions = useMemo(() => {
        return getMonthYearOptions(notas || []);
    }, [notas]);

    // Set default month to the latest one
    useState(() => {
        if (monthOptions.length > 0 && !selectedMonth) {
            setSelectedMonth(monthOptions[0]);
        }
    });
    
    const filteredNotas = useMemo(() => {
        if (!notas) return [];
        if (filterType === 'monthly') {
            const currentMonth = selectedMonth || (monthOptions.length > 0 ? monthOptions[0] : '');
            if (!currentMonth) return notas;
            
            const [year, month] = currentMonth.split('-').map(Number);
            return notas.filter(nota => {
                if (!nota.tanggal?.toDate) return false;
                const date = nota.tanggal.toDate();
                return getYear(date) === year && getMonth(date) === month - 1;
            });
        }
        // Placeholder for other filters
        return notas;
    }, [notas, filterType, selectedMonth, monthOptions]);

    const handleSelectNota = (id: string, checked: boolean) => {
        setSelectedNotaIds(prev =>
            checked ? [...prev, id] : prev.filter(notaId => notaId !== id)
        );
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedNotaIds(filteredNotas.map(nota => nota.id));
        } else {
            setSelectedNotaIds([]);
        }
    };
    
    const isAllSelected = filteredNotas.length > 0 && selectedNotaIds.length === filteredNotas.length;

    const selectionSummary = useMemo(() => {
        const selectedCount = selectedNotaIds.length;
        if (selectedCount === 0) {
            return { count: 0, total: 0 };
        }
        const total = (notas || []).reduce((acc, nota) => {
            if (selectedNotaIds.includes(nota.id)) {
                return acc + nota.nominal;
            }
            return acc;
        }, 0);
        return { count: selectedCount, total };
    }, [selectedNotaIds, notas]);


    return (
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
                            <TabsTrigger value="range" disabled>Rentang Tanggal</TabsTrigger>
                            <TabsTrigger value="manual" disabled>Manual</TabsTrigger>
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
                    </Tabs>
                </CardContent>
            </Card>

            <div>
                <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                        <Checkbox id="select-all" onCheckedChange={handleSelectAll} checked={isAllSelected} />
                        <Label htmlFor="select-all">Pilih Semua</Label>
                    </div>
                     <Button variant="outline" size="sm" onClick={() => setSelectedNotaIds([])}>
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
                                        <Badge variant={nota.segmen.includes('BBM') ? 'default' : 'secondary'}>{nota.segmen}</Badge>
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
            
             <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm py-3 mt-auto border-t -mx-6 px-6">
                 <div className="max-w-4xl mx-auto flex justify-around items-center">
                    <Button variant="outline" size="lg" disabled>
                        <FileArchive className="mr-2" /> Semua (1 File)
                    </Button>
                     <Button variant="outline" size="lg" disabled>
                        <FileText className="mr-2" /> Rekap
                    </Button>
                     <Button variant="outline" size="lg" disabled>
                        <Printer className="mr-2" /> Perincian
                    </Button>
                     <Button variant="outline" size="lg" disabled>
                        <FileText className="mr-2" /> Eviden
                    </Button>
                </div>
            </div>
        </div>
    );
}
