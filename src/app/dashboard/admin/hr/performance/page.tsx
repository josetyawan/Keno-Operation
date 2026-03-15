
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { useRouter } from 'next/navigation';
import { collection, query, doc, setDoc, Timestamp, orderBy, getDocs, writeBatch, type DocumentReference, where } from 'firebase/firestore';
import type { UserProfile, Performance, RiwayatGangguan, OtherWork, ProvisioningRecord } from '@/lib/types';
import { productivityWeights } from '@/lib/bobot-produktivitas';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, Loader2, ChevronLeft, ChevronRight, RefreshCw, BarChart } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const parseBobot = (bobot: number | string | undefined): number => {
    if (typeof bobot === 'number') return bobot;
    if (typeof bobot === 'string') {
        const parsed = parseFloat(bobot.replace(',', '.'));
        return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
};

export default function AdminPerformancePage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    
    const [isImporting, setIsImporting] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 5;
    
    const [manualPeriod, setManualPeriod] = useState<string | undefined>();
    const [manualSearchQuery, setManualSearchQuery] = useState('');
    const [manualCurrentPage, setManualCurrentPage] = useState(1);

    const { data: currentUserProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(
        useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore])
    );
    
    const usersQuery = useMemoFirebase(() => query(collection(firestore, 'users')), [firestore]);
    const { data: allUsers, isLoading: areUsersLoading } = useCollection<UserProfile>(usersQuery);

    const performanceQuery = useMemoFirebase(() => query(collection(firestore, 'performance'), orderBy('date', 'desc')), [firestore]);
    const { data: performanceRecords, isLoading: areRecordsLoading } = useCollection<Performance>(performanceQuery);
    
    const manualPeriodDateRange = useMemo(() => {
        if (!manualPeriod) return null;
        const [year, month] = manualPeriod.split('-').map(Number);
        const startDate = startOfMonth(new Date(year, month - 1));
        const endDate = endOfMonth(startDate);
        return { startDate, endDate };
    }, [manualPeriod]);

    const riwayatQuery = useMemoFirebase(() => (
        manualPeriodDateRange ? query(
            collection(firestore, 'riwayat-gangguan'),
            where('tanggalLapor', '>=', Timestamp.fromDate(manualPeriodDateRange.startDate)),
            where('tanggalLapor', '<=', Timestamp.fromDate(manualPeriodDateRange.endDate))
        ) : null
    ), [firestore, manualPeriodDateRange]);

    const otherWorksQuery = useMemoFirebase(() => (
         manualPeriodDateRange ? query(
            collection(firestore, 'other-works'),
            where('tanggalPengerjaan', '>=', Timestamp.fromDate(manualPeriodDateRange.startDate)),
            where('tanggalPengerjaan', '<=', Timestamp.fromDate(manualPeriodDateRange.endDate))
        ) : null
    ), [firestore, manualPeriodDateRange]);

    const provisioningQuery = useMemoFirebase(() => (
         manualPeriodDateRange ? query(
            collection(firestore, 'provisioning-records'),
            where('completedAt', '>=', Timestamp.fromDate(manualPeriodDateRange.startDate)),
            where('completedAt', '<=', Timestamp.fromDate(manualPeriodDateRange.endDate))
        ) : null
    ), [firestore, manualPeriodDateRange]);

    const { data: riwayatList, isLoading: isRiwayatLoading } = useCollection<RiwayatGangguan>(riwayatQuery);
    const { data: otherWorksList, isLoading: isOtherWorksLoading } = useCollection<OtherWork>(otherWorksQuery);
    const { data: provisioningList, isLoading: isProvisioningLoading } = useCollection<ProvisioningRecord>(provisioningQuery);

    const userMapByNik = useMemo(() => {
        if (!allUsers) return new Map<string, UserProfile>();
        const map = new Map<string, UserProfile>();
        allUsers.forEach(u => {
            if (u.nik) map.set(u.nik, u);
        });
        return map;
    }, [allUsers]);

    const filteredRecords = useMemo(() => {
        if (!performanceRecords) return [];
        if (!searchQuery) return performanceRecords;
        
        const lowercasedQuery = searchQuery.toLowerCase();
        return performanceRecords.filter(record => 
            record.nik.toLowerCase().includes(lowercasedQuery) ||
            record.nama.toLowerCase().includes(lowercasedQuery)
        );
    }, [performanceRecords, searchQuery]);

    const paginatedRecords = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        return filteredRecords.slice(startIndex, endIndex);
    }, [filteredRecords, currentPage]);

    const totalPages = Math.ceil(filteredRecords.length / ITEMS_PER_PAGE);

    const availableManualPeriods = useMemo(() => {
        const periods = new Set<string>();
        const now = new Date();
        for (let i = 0; i < 12; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            periods.add(format(date, 'yyyy-MM'));
        }
        return Array.from(periods);
    }, []);
    
    useEffect(() => {
        if (availableManualPeriods.length > 0 && !manualPeriod) {
            setManualPeriod(availableManualPeriods[0]);
        }
    }, [availableManualPeriods, manualPeriod]);

    const manualPerformanceData = useMemo(() => {
        if (!manualPeriod || !allUsers || !riwayatList || !otherWorksList || !provisioningList) return [];

        const JAM_KERJA_SEBULAN = 8 * 22; // 8 jam/hari, 22 hari/bulan

        const workItems: (RiwayatGangguan | OtherWork | ProvisioningRecord)[] = [
            ...riwayatList,
            ...otherWorksList,
            ...provisioningList,
        ];
        
        const bobotByUser = new Map<string, number>();

        workItems.forEach(item => {
            let userId: string | undefined;
            if ('assignedTo_userId' in item) { // ProvisioningRecord
                userId = item.assignedTo_userId;
            } else { // RiwayatGangguan or OtherWork
                userId = item.userId;
            }
            if (!userId) return;

            let bobot = 0;
            const allWeights = Object.values(productivityWeights).flat();
            
            let jenisOrder: string;
            let orderType: string | undefined;

            if ('crmOrder' in item) { // ProvisioningRecord
                jenisOrder = item.crmOrder;
                orderType = item.description;
            } else { // RiwayatGangguan or OtherWork
                jenisOrder = item.jenisOrder;
                orderType = (item as RiwayatGangguan).typeOrder || (item as OtherWork).orderType;
            }
            
            const weightItem = allWeights.find(w => {
                const isJenisMatch = w.jenis_order_name === jenisOrder;
                const isOrderTypeMatch = !w.order_type || w.order_type === orderType;
                return isJenisMatch && isOrderTypeMatch;
            });

            if (weightItem) {
                bobot = parseBobot(weightItem.bobot);
            }
            
            bobotByUser.set(userId, (bobotByUser.get(userId) || 0) + bobot);
        });

        const activeTeknisi = allUsers.filter(u => u.role === 'teknisi' && u.registrationStatus === 'approved');

        const performanceData = activeTeknisi.map(user => {
            const totalBobot = bobotByUser.get(user.id) || 0;
            const productivity = (totalBobot / JAM_KERJA_SEBULAN) * 100;
            return {
                userId: user.id,
                userName: user.displayName || 'Unknown',
                nik: user.nik || '-',
                totalBobot,
                productivity,
            };
        });

        return performanceData.sort((a,b) => b.productivity - a.productivity);

    }, [manualPeriod, riwayatList, otherWorksList, provisioningList, allUsers]);

    const filteredManualPerformance = useMemo(() => {
        if (!manualSearchQuery) return manualPerformanceData;
        const lowerQuery = manualSearchQuery.toLowerCase();
        return manualPerformanceData.filter(p => 
            p.userName.toLowerCase().includes(lowerQuery) ||
            p.nik.toLowerCase().includes(lowerQuery)
        );
    }, [manualPerformanceData, manualSearchQuery]);

    const totalManualPages = Math.ceil(filteredManualPerformance.length / ITEMS_PER_PAGE);

    const paginatedManualPerformance = useMemo(() => {
        const startIndex = (manualCurrentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        return filteredManualPerformance.slice(startIndex, endIndex);
    }, [filteredManualPerformance, manualCurrentPage]);


    const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            toast({ variant: 'destructive', title: 'Tidak ada file dipilih.' });
            return;
        }

        if (areUsersLoading || userMapByNik.size === 0) {
            toast({ variant: 'destructive', title: 'Data Pengguna Belum Siap', description: 'Tunggu beberapa saat dan coba lagi.' });
            return;
        }

        setIsImporting(true);
        setImportProgress(0);
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const XLSX = await import('xlsx');
                const data = e.target?.result;
                if (!data) throw new Error("Gagal membaca file.");
                
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                if (!sheetName) throw new Error("File Excel tidak memiliki sheet.");

                const worksheet = workbook.Sheets[sheetName];
                const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                let headerRowIndex = -1;
                let headers: string[] = [];
                for(let i=0; i < jsonData.length; i++) {
                    const row = jsonData[i] as any[];
                    if (row && row.some(cell => typeof cell === 'string' && cell.toLowerCase().trim() === 'nik')) {
                        headerRowIndex = i;
                        headers = row.map(cell => String(cell || '').trim());
                        break;
                    }
                }
                
                if (headerRowIndex === -1) {
                    throw new Error("Header 'NIK' tidak ditemukan di file Excel.");
                }

                const dataRows = jsonData.slice(headerRowIndex + 1);
                
                const findHeaderIndex = (aliases: string[]) => {
                    const lowerAliases = aliases.map(a => a.toLowerCase().trim());
                    return headers.findIndex(h => h && lowerAliases.includes(h.toLowerCase().trim()));
                };
                
                const nikIndex = findHeaderIndex(['nik']);
                const nameIndex = findHeaderIndex(['nama']);
                const serviceIndex = findHeaderIndex(['service', 'service area']);
                const bulanIndex = findHeaderIndex(['bulan']);
                const tahunIndex = findHeaderIndex(['tahun']);
                const nilaiKuIndex = findHeaderIndex(['nilai kuantitas']);
                const nilaiKoIndex = findHeaderIndex(['nilai kualitas']);
                const nilaiKdIndex = findHeaderIndex(['nilai kecukupan']);
                const totalPerformIndex = findHeaderIndex(['total performansi']);

                let perform1Index = findHeaderIndex(['performansi unit']);
                let perform2Index = findHeaderIndex(['performansi individu']);

                if (perform1Index === -1 || perform2Index === -1) {
                    const performaIndexes = headers.reduce((acc, h, i) => {
                        if (h && h.toLowerCase().trim() === 'performa') {
                            acc.push(i);
                        }
                        return acc;
                    }, [] as number[]);

                    if (performaIndexes.length >= 2) {
                        perform1Index = performaIndexes[0];
                        perform2Index = performaIndexes[1];
                    }
                }

                if ([nikIndex, nameIndex, bulanIndex, tahunIndex, nilaiKuIndex, nilaiKoIndex, nilaiKdIndex, perform1Index, perform2Index, totalPerformIndex].some(index => index === -1)) {
                     throw new Error("Satu atau lebih kolom yang diperlukan tidak ditemukan. Pastikan file Excel Anda memiliki header seperti: NIK, Nama, Bulan, Tahun, Nilai Kuantitas, Nilai Kualitas, Nilai Kecukupan, Performansi Unit, dan Performansi Individu.");
                }

                let createdCount = 0;
                let skippedCount = 0;
                let skippedNiks = new Set<string>();

                for(let i = 0; i < dataRows.length; i++) {
                    const row = dataRows[i] as any[];
                    if (!row || row.length === 0) continue;

                    const nik = String(row[nikIndex] || '').trim();
                    if (!nik) continue;

                    const user = userMapByNik.get(nik);
                    if (!user) {
                        skippedCount++;
                        skippedNiks.add(nik);
                        continue;
                    }

                    const tahun = Number(row[tahunIndex]);
                    const bulan = Number(row[bulanIndex]);

                    const performanceId = `${nik}-${tahun}-${bulan}`;
                    const performanceDocRef = doc(firestore, 'performance', performanceId);
                    
                    const performanceData: Performance = {
                        id: performanceId,
                        nik: nik,
                        userId: user.id,
                        nama: String(row[nameIndex] || ''),
                        service: serviceIndex !== -1 ? String(row[serviceIndex] || '') : '',
                        bulan: bulan,
                        tahun: tahun,
                        date: Timestamp.fromDate(new Date(tahun, bulan - 1, 1)),
                        nilaiKualitas: String(row[nilaiKuIndex] || '0%'),
                        nilaiKontribusi: String(row[nilaiKoIndex] || '0%'),
                        nilaiKedisiplinan: String(row[nilaiKdIndex] || '0%'),
                        performance1: String(row[perform1Index] || '0%'),
                        performance2: String(row[perform2Index] || '0%'),
                        totalPerformance: String(row[totalPerformIndex] || '0%')
                    };

                    await setDoc(performanceDocRef, performanceData, { merge: true });
                    createdCount++;
                    setImportProgress(((i + 1) / dataRows.length) * 100);
                }

                let toastDescription = `${createdCount} data performa berhasil diimpor/diperbarui.`;
                if(skippedCount > 0) {
                    toastDescription += ` ${skippedCount} baris dilewati karena NIK tidak terdaftar: ${Array.from(skippedNiks).slice(0,3).join(', ')}...`
                }
                toast({ title: 'Impor Selesai', description: toastDescription, duration: 9000 });

            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Impor Gagal', description: error.message });
            } finally {
                setIsImporting(false);
            }
        };

        reader.readAsArrayBuffer(file);
    };

    const handleSyncUserIds = async () => {
        if (!firestore) return;
        setIsSyncing(true);
        toast({ title: 'Memulai Sinkronisasi...', description: 'Mencari data performa yang perlu diperbarui.' });
    
        try {
            const usersQueryRef = query(collection(firestore, 'users'));
            const performanceQueryRef = query(collection(firestore, 'performance'));
    
            const [usersSnapshot, performanceSnapshot] = await Promise.all([
                getDocs(usersQueryRef),
                getDocs(performanceQueryRef)
            ]);
    
            const userMapByNik = new Map<string, string>();
            usersSnapshot.forEach(doc => {
                const u = doc.data() as UserProfile;
                if (u.nik) {
                    userMapByNik.set(u.nik.trim(), u.id);
                }
            });
    
            let docsToUpdate: {ref: DocumentReference, data: Partial<Performance>}[] = [];
    
            performanceSnapshot.forEach(perfDoc => {
                const perfData = perfDoc.data() as Performance;
                if (perfData.nik) {
                    const expectedUserId = userMapByNik.get(perfData.nik.trim());
                    if (expectedUserId && perfData.userId !== expectedUserId) {
                        docsToUpdate.push({
                            ref: perfDoc.ref,
                            data: { userId: expectedUserId }
                        });
                    }
                }
            });
            
            if (docsToUpdate.length === 0) {
                toast({ title: 'Sinkronisasi Selesai', description: 'Semua data performa sudah memiliki ID pengguna yang sesuai.' });
                setIsSyncing(false);
                return;
            }
    
            const batchSize = 400;
            let updatedCount = 0;
            for (let i = 0; i < docsToUpdate.length; i += batchSize) {
                const batch = writeBatch(firestore);
                const chunk = docsToUpdate.slice(i, i + batchSize);
                chunk.forEach(update => {
                    batch.update(update.ref, update.data);
                });
                await batch.commit();
                updatedCount += chunk.length;
            }
    
            toast({
                title: 'Sinkronisasi Berhasil!',
                description: `${updatedCount} data performa telah berhasil disinkronkan dengan ID pengguna.`,
            });
    
        } catch (error: any) {
            console.error("Error syncing user IDs:", error);
            toast({ variant: 'destructive', title: 'Sinkronisasi Gagal', description: error.message });
        } finally {
            setIsSyncing(false);
        }
    };


    const isLoadingInitial = isUserLoading || isProfileLoading || areUsersLoading || areRecordsLoading;
    const isLoadingManual = isRiwayatLoading || isOtherWorksLoading || isProvisioningLoading;

    if (isLoadingInitial && !performanceRecords) {
        return (
             <div className="space-y-6">
                <Skeleton className="h-8 w-64" />
                <Card>
                    <CardHeader><Skeleton className="h-24 w-full" /></CardHeader>
                    <CardContent><Skeleton className="h-40 w-full" /></CardContent>
                </Card>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Impor & Sinkronisasi Performa</h1>
            <div className="grid md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Unggah File Excel Performa</CardTitle>
                        <CardDescription>Pilih file Excel yang berisi data performa teknisi untuk diimpor ke sistem.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="performance-file">File Excel Performa</Label>
                            <Input id="performance-file" type="file" accept=".xlsx, .xls" onChange={handleFileImport} disabled={isImporting} />
                        </div>
                        {isImporting && (
                            <div className="space-y-2">
                                <Progress value={importProgress} />
                                <p className="text-sm text-muted-foreground">Mengimpor {Math.round(importProgress)}%...</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Sinkronkan Data</CardTitle>
                        <CardDescription>Jika data performa teknisi tidak muncul di halaman mereka, jalankan sinkronisasi ini untuk memperbaiki tautan data.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={handleSyncUserIds} disabled={isSyncing} className="w-full">
                            {isSyncing ? <Loader2 className="mr-2 animate-spin" /> : <RefreshCw className="mr-2" />}
                            {isSyncing ? 'Menyinkronkan...' : 'Sinkronkan ID Pengguna'}
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Data Performa (HO)</CardTitle>
                    <CardDescription>Menampilkan semua data performa dari HO yang ada di database.</CardDescription>
                    <div className="pt-4">
                        <Input 
                            placeholder="Cari berdasarkan NIK atau Nama..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="max-w-sm"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>NIK</TableHead>
                                    <TableHead>Nama</TableHead>
                                    <TableHead>Periode</TableHead>
                                    <TableHead className="text-right">Kuantitas</TableHead>
                                    <TableHead className="text-right">Kualitas</TableHead>
                                    <TableHead className="text-right">Kecukupan</TableHead>
                                    <TableHead className="text-right">Perf. Unit</TableHead>
                                    <TableHead className="text-right">Perf. Individu</TableHead>
                                    <TableHead className="text-right">Total Performa</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingInitial ? (
                                    Array.from({length: 5}).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell colSpan={9}><Skeleton className="h-5 w-full"/></TableCell>
                                        </TableRow>
                                    ))
                                ) : paginatedRecords.length > 0 ? (
                                    paginatedRecords.map(record => (
                                        <TableRow key={record.id}>
                                            <TableCell className="font-mono">{record.nik}</TableCell>
                                            <TableCell className="font-medium">{record.nama}</TableCell>
                                            <TableCell>{format(record.date.toDate(), 'MMMM yyyy', {locale: idLocale})}</TableCell>
                                            <TableCell className="text-right">{record.nilaiKualitas}</TableCell>
                                            <TableCell className="text-right">{record.nilaiKontribusi}</TableCell>
                                            <TableCell className="text-right">{record.nilaiKedisiplinan}</TableCell>
                                            <TableCell className="text-right">
                                                {(() => {
                                                    const value = record.performance1;
                                                    if (typeof value !== 'string' || !value.trim()) return '-';
                                                    if (value.trim().endsWith('%')) return value;
                                                    const num = parseFloat(value);
                                                    if (isNaN(num)) return value;
                                                    return `${(num * 100).toFixed(2)}%`;
                                                })()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {(() => {
                                                    const value = record.performance2;
                                                    if (typeof value !== 'string' || !value.trim()) return '-';
                                                    if (value.trim().endsWith('%')) return value;
                                                    const num = parseFloat(value);
                                                    if (isNaN(num)) return value;
                                                    return `${(num * 100).toFixed(2)}%`;
                                                })()}
                                            </TableCell>
                                            <TableCell className="text-right font-bold">
                                                {(() => {
                                                    const value = record.totalPerformance;
                                                    if (typeof value !== 'string' || !value.trim()) return '-';
                                                    if (value.trim().endsWith('%')) return value;
                                                    const num = parseFloat(value);
                                                    if (isNaN(num)) return value;
                                                    return `${(num * 100).toFixed(2)}%`;
                                                })()}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={9} className="h-24 text-center">
                                            {searchQuery ? 'Tidak ada data yang cocok.' : 'Belum ada data performa.'}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
                 <CardFooter>
                    <div className="text-xs text-muted-foreground">
                        Halaman <strong>{totalPages > 0 ? currentPage : 0}</strong> dari <strong>{totalPages}</strong>
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1 || totalPages === 0}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Sebelumnya
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages || totalPages === 0}
                        >
                            Berikutnya
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BarChart/> Performa Produktivitas (Manual)</CardTitle>
                    <CardDescription>Performa dihitung berdasarkan bobot pekerjaan yang diselesaikan. Asumsi: 8 jam kerja/hari, 22 hari kerja/bulan.</CardDescription>
                    <div className="grid md:grid-cols-2 gap-4 pt-4">
                        <div className="grid gap-2">
                             <Label htmlFor="manual-period">Pilih Periode</Label>
                            <Select value={manualPeriod} onValueChange={setManualPeriod}>
                                <SelectTrigger id="manual-period" className="w-[280px]">
                                    <SelectValue placeholder="Pilih periode..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableManualPeriods.map(period => (
                                        <SelectItem key={period} value={period}>
                                            {format(new Date(Number(period.split('-')[0]), Number(period.split('-')[1]) - 1), 'MMMM yyyy', { locale: idLocale })}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                             <Label htmlFor="manual-search">Cari Teknisi</Label>
                            <Input
                                id="manual-search"
                                placeholder="Cari nama atau NIK..."
                                value={manualSearchQuery}
                                onChange={e => setManualSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nama Teknisi</TableHead>
                                <TableHead>NIK</TableHead>
                                <TableHead className="text-right">Total Bobot</TableHead>
                                <TableHead className="text-right">Produktivitas (%)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoadingManual ? (
                                Array.from({length: 5}).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={4}><Skeleton className="h-5 w-full"/></TableCell>
                                    </TableRow>
                                ))
                            ) : paginatedManualPerformance.length > 0 ? (
                                paginatedManualPerformance.map(p => (
                                    <TableRow key={p.userId}>
                                        <TableCell className="font-medium">{p.userName}</TableCell>
                                        <TableCell>{p.nik}</TableCell>
                                        <TableCell className="text-right">{p.totalBobot.toFixed(2)}</TableCell>
                                        <TableCell className="text-right font-bold">{p.productivity.toFixed(2)}%</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        Tidak ada data produktivitas untuk periode ini.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
                <CardFooter>
                    <div className="text-xs text-muted-foreground">
                        Halaman <strong>{totalManualPages > 0 ? manualCurrentPage : 0}</strong> dari <strong>{totalManualPages}</strong>
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setManualCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={manualCurrentPage === 1 || totalManualPages === 0}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Sebelumnya
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setManualCurrentPage(prev => Math.min(prev + 1, totalManualPages))}
                            disabled={manualCurrentPage === totalManualPages || totalManualPages === 0}
                        >
                            Berikutnya
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
