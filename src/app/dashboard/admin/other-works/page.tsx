
'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { UserProfile, OtherWork } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { FileSpreadsheet, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const safeToDate = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (timestamp.toDate) return timestamp.toDate();
    if (timestamp instanceof Date) return timestamp;
    const d = new Date(timestamp);
    return d instanceof Date && !isNaN(d.getTime()) ? d : null;
};

export default function OtherWorksPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    const worksQuery = useMemoFirebase(() => query(collection(firestore, 'other-works'), orderBy('createdAt', 'desc')), [firestore]);
    const { data: allWorks, isLoading: areWorksLoading } = useCollection<OtherWork>(worksQuery);

    const usersQuery = useMemoFirebase(() => query(collection(firestore, 'users')), [firestore]);
    const { data: allUsers, isLoading: areUsersLoading } = useCollection<UserProfile>(usersQuery);

    const userMap = useMemo(() => {
        if (!allUsers) return new Map<string, UserProfile>();
        return new Map(allUsers.map(u => [u.id, u]));
    }, [allUsers]);

    const filteredWorks = useMemo(() => {
        if (!allWorks) return [];
        if (!searchQuery) return allWorks;
        
        const lowercasedQuery = searchQuery.toLowerCase();
        return allWorks.filter(work => 
            work.userName.toLowerCase().includes(lowercasedQuery) ||
            work.jenisOrder.toLowerCase().includes(lowercasedQuery) ||
            (work.namaPekerjaan && work.namaPekerjaan.toLowerCase().includes(lowercasedQuery))
        );
    }, [allWorks, searchQuery]);

    const paginatedWorks = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        return filteredWorks.slice(startIndex, endIndex);
    }, [filteredWorks, currentPage]);

    const totalPages = Math.ceil(filteredWorks.length / ITEMS_PER_PAGE);

    const handleExport = async () => {
        if (filteredWorks.length === 0) {
            toast({ variant: 'destructive', title: 'Tidak ada data untuk diekspor' });
            return;
        }

        const XLSX = await import('xlsx');

        const dataToExport = filteredWorks.map((item, index) => ({
            'No': index + 1,
            'Nama Teknisi': item.userName,
            'NIK': item.nik || '-',
            'Nama Pekerjaan': item.namaPekerjaan || '-',
            'Jenis Order': item.jenisOrder,
            'Tipe Order (GAMAS)': item.orderType || '-',
            'Tanggal Pengerjaan': safeToDate(item.tanggalPengerjaan) ? format(safeToDate(item.tanggalPengerjaan)!, 'dd MMM yyyy, HH:mm', { locale: idLocale }) : '-',
            'Tanggal Selesai': safeToDate(item.tanggalSelesai) ? format(safeToDate(item.tanggalSelesai)!, 'dd MMM yyyy, HH:mm', { locale: idLocale }) : '-',
            'Keterangan': item.keterangan || '-',
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Pekerjaan Lain');
        
        XLSX.writeFile(workbook, `Rekap_Pekerjaan_Lain-lain_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);

        toast({ title: 'Ekspor Berhasil', description: 'File Excel telah diunduh.' });
    };

    const isLoading = areWorksLoading || areUsersLoading;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Rekap Pekerjaan Lain-lain</h1>
                    <p className="text-muted-foreground">Daftar pekerjaan non-no. service yang telah diinput.</p>
                </div>
                 <Button onClick={handleExport} disabled={!filteredWorks || filteredWorks.length === 0}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Download Excel
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Filter Laporan</CardTitle>
                    <div className="pt-2">
                         <Input 
                            placeholder="Cari nama teknisi, jenis order, atau nama pekerjaan..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="max-w-md"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Teknisi</TableHead>
                                <TableHead>Nama/Jenis Pekerjaan</TableHead>
                                <TableHead>Waktu Pengerjaan</TableHead>
                                <TableHead>Keterangan</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({length: 5}).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={4}><Skeleton className="h-6 w-full" /></TableCell>
                                    </TableRow>
                                ))
                            ) : paginatedWorks && paginatedWorks.length > 0 ? (
                                paginatedWorks.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <div className="font-medium">{item.userName}</div>
                                            <div className="text-xs text-muted-foreground">{item.nik}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{item.namaPekerjaan || item.jenisOrder}</div>
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <Badge variant="secondary">{item.jenisOrder}</Badge>
                                                {item.orderType && <Badge variant="outline">{item.orderType}</Badge>}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-xs">
                                                <p>Mulai: {safeToDate(item.tanggalPengerjaan) ? format(safeToDate(item.tanggalPengerjaan)!, 'dd MMM, HH:mm') : '-'}</p>
                                                <p>Selesai: {safeToDate(item.tanggalSelesai) ? format(safeToDate(item.tanggalSelesai)!, 'dd MMM, HH:mm') : '-'}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{item.keterangan || '-'}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        Tidak ada data pekerjaan yang ditemukan.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
                {totalPages > 1 && (
                     <CardFooter>
                        <div className="text-xs text-muted-foreground">
                            Halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong>
                        </div>
                        <div className="flex items-center gap-2 ml-auto">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Sebelumnya
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                            >
                                Berikutnya
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardFooter>
                )}
            </Card>
        </div>
    );
}

  