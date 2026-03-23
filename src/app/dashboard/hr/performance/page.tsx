
'use client';

import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, Timestamp } from 'firebase/firestore';
import type { UserProfile, Performance, RiwayatGangguan, OtherWork, ProvisioningRecord } from '@/lib/types';
import { productivityWeights } from '@/lib/bobot-produktivitas';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useMemo, useEffect } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Adsense } from '@/components/adsense';

// Helper to safely parse bobot which might be a string with a comma
const parseBobot = (bobot: number | string | undefined): number => {
    if (typeof bobot === 'number') return bobot;
    if (typeof bobot === 'string') {
        const parsed = parseFloat(bobot.replace(',', '.'));
        return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
};


export default function UserPerformancePage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();

    const [selectedPeriod, setSelectedPeriod] = useState<string | undefined>();
    
    const performanceQuery = useMemoFirebase(() => {
        if (!user?.uid) return null;
        return query(collection(firestore, 'performance'), where('userId', '==', user.uid));
    }, [firestore, user?.uid]);

    const { data: performanceRecords, isLoading: isPerformanceLoading } = useCollection<Performance>(performanceQuery);
    
    const sortedPerformanceRecords = useMemo(() => {
        if (!performanceRecords) return [];
        return [...performanceRecords].sort((a, b) => {
            const dateA = a.date?.toDate ? a.date.toDate().getTime() : 0;
            const dateB = b.date?.toDate ? b.date.toDate().getTime() : 0;
            return dateB - dateA; // Descending sort
        });
    }, [performanceRecords]);
    
    // --- Logic for Manual Performance ---
    const riwayatQuery = useMemoFirebase(() => {
        if (!user?.uid) return null;
        return query(
            collection(firestore, 'riwayat-gangguan'),
            where('userId', '==', user.uid)
        );
    }, [firestore, user?.uid]);

    const otherWorksQuery = useMemoFirebase(() => {
        if (!user?.uid) return null;
        return query(
            collection(firestore, 'other-works'),
            where('userId', '==', user.uid)
        );
    }, [firestore, user?.uid]);
    
    const provisioningQuery = useMemoFirebase(() => {
        if (!user?.uid) return null;
        return query(
            collection(firestore, 'provisioning-records'),
            where('assignedTo_userId', '==', user.uid)
        );
    }, [firestore, user?.uid]);

    const { data: riwayatList, isLoading: isRiwayatLoading } = useCollection<RiwayatGangguan>(riwayatQuery);
    const { data: otherWorksList, isLoading: isOtherWorksLoading } = useCollection<OtherWork>(otherWorksQuery);
    const { data: provisioningList, isLoading: isProvisioningLoading } = useCollection<ProvisioningRecord>(provisioningQuery);

    const availablePeriods = useMemo(() => {
        const periods = new Set<string>();
        
        if (sortedPerformanceRecords) {
            sortedPerformanceRecords.forEach(p => {
                periods.add(`${p.tahun}-${String(p.bulan).padStart(2, '0')}`);
            });
        }
        
        if (riwayatList) {
            riwayatList.forEach(item => {
                const itemDate = item.tanggalLapor?.toDate();
                if (itemDate) periods.add(format(itemDate, 'yyyy-MM'));
            });
        }
        
        if (otherWorksList) {
            otherWorksList.forEach(item => {
                const itemDate = item.tanggalPengerjaan?.toDate();
                if (itemDate) periods.add(format(itemDate, 'yyyy-MM'));
            });
        }
        
        if (provisioningList) {
            provisioningList.forEach(item => {
                const itemDate = item.completedAt?.toDate();
                if (itemDate) periods.add(format(itemDate, 'yyyy-MM'));
            });
        }
        
        return Array.from(periods).sort().reverse();
    }, [sortedPerformanceRecords, riwayatList, otherWorksList, provisioningList]);
    
    useEffect(() => {
        if (availablePeriods.length > 0 && !selectedPeriod) {
            setSelectedPeriod(availablePeriods[0]);
        }
    }, [availablePeriods, selectedPeriod]);

    const displayedRecord = useMemo(() => {
        if (!selectedPeriod || !sortedPerformanceRecords) return null;
        return sortedPerformanceRecords.find(p => `${p.tahun}-${String(p.bulan).padStart(2, '0')}` === selectedPeriod);
    }, [sortedPerformanceRecords, selectedPeriod]);


    const selectedDateRange = useMemo(() => {
        if (!selectedPeriod) return null;
        const [year, month] = selectedPeriod.split('-').map(Number);
        const startDate = startOfMonth(new Date(year, month - 1));
        const endDate = endOfMonth(startDate);
        return { startDate, endDate };
    }, [selectedPeriod]);

    const manualPerformanceData = useMemo(() => {
        if (isRiwayatLoading || isOtherWorksLoading || isProvisioningLoading || !riwayatList || !otherWorksList || !provisioningList || !selectedDateRange) return null;

        const { startDate, endDate } = selectedDateRange;

        const filteredRiwayat = riwayatList.filter(item => {
            const itemDate = item.tanggalLapor?.toDate();
            return itemDate && itemDate >= startDate && itemDate <= endDate;
        });

        const filteredOtherWorks = otherWorksList.filter(item => {
            const itemDate = item.tanggalPengerjaan?.toDate();
            return itemDate && itemDate >= startDate && itemDate <= endDate;
        });
        
        const filteredProvisioning = provisioningList.filter(item => {
            const itemDate = item.completedAt?.toDate();
            return itemDate && itemDate >= startDate && itemDate <= endDate;
        });

        const JAM_KERJA_SEBULAN = 8 * 22;

        const workItems = [
            ...filteredRiwayat,
            ...filteredOtherWorks,
            ...filteredProvisioning
        ];

        let totalBobot = 0;
        const allWeights = Object.values(productivityWeights).flat();

        workItems.forEach(item => {
            let bobot = 0;
            let jenisOrder: string;
            let orderType: string | undefined;

            if ('crmOrder' in item) { // ProvisioningRecord
                jenisOrder = item.crmOrder;
                orderType = item.description;
            } else { // RiwayatGangguan or OtherWork
                jenisOrder = item.jenisOrder;
                orderType = (item as RiwayatGangguan).typeOrder || (item as OtherWork).orderType;
            }
            
            if (!jenisOrder) return;

            const weightItem = allWeights.find(w => {
                const isJenisMatch = w.jenis_order_name === jenisOrder;
                const isOrderTypeMatch = !w.order_type || w.order_type === orderType;
                return isJenisMatch && isOrderTypeMatch;
            });

            if (weightItem) {
                bobot = parseBobot(weightItem.bobot);
            }
            totalBobot += bobot;
        });

        const productivity = (totalBobot / JAM_KERJA_SEBULAN) * 100;
        return {
            totalBobot,
            productivity,
        };
    }, [riwayatList, otherWorksList, provisioningList, isRiwayatLoading, isOtherWorksLoading, isProvisioningLoading, selectedDateRange]);
    
    // --- End of New Logic ---

    const isLoading = isUserLoading || isPerformanceLoading || isRiwayatLoading || isOtherWorksLoading || isProvisioningLoading;

    const formatAsPercent = (value: string) => {
        if (typeof value !== 'string' || !value.trim()) return '-';
        if (value.trim().endsWith('%')) return value;
        const num = parseFloat(value);
        if (isNaN(num)) return value;
        return `${(num * 100).toFixed(2)}%`;
    };

    if (isUserLoading || isPerformanceLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-96" />
                <Card>
                    <CardHeader><Skeleton className="h-24 w-full" /></CardHeader>
                    <CardContent><Skeleton className="h-40 w-full" /></CardContent>
                </Card>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button onClick={() => router.push('/dashboard/hr/performance/goodbye')} variant="outline" size="icon" className="h-8 w-8">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Performa Anda</h1>
                    <p className="text-muted-foreground">Analisis performa bulanan Anda sebagai teknisi.</p>
                </div>
            </div>

            {(availablePeriods && availablePeriods.length > 0) ? (
                <>
                <Card>
                    <CardHeader>
                        <CardTitle>Pilih Periode</CardTitle>
                        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                            <SelectTrigger className="w-[280px]">
                                <SelectValue placeholder="Pilih periode performa..." />
                            </SelectTrigger>
                            <SelectContent>
                                {availablePeriods.map(period => {
                                    const [year, month] = period.split('-');
                                    const date = new Date(Number(year), Number(month) - 1);
                                    return (
                                        <SelectItem key={period} value={period}>
                                            {format(date, 'MMMM yyyy', { locale: idLocale })}
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </CardHeader>
                </Card>
                
                <div className="grid md:grid-cols-2 gap-6">
                    {displayedRecord ? (
                        <div className="space-y-6">
                            <Card className="bg-primary text-primary-foreground text-center">
                                <CardHeader>
                                    <CardDescription className="text-primary-foreground/80">Total Performa (HO) - {format(displayedRecord.date.toDate(), 'MMMM yyyy', {locale: idLocale})}</CardDescription>
                                    <CardTitle className="text-6xl font-bold tracking-tighter">
                                        {formatAsPercent(displayedRecord.totalPerformance)}
                                    </CardTitle>
                                </CardHeader>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Rincian Nilai (HO)</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell className="font-medium">Nilai Kualitas</TableCell>
                                                <TableCell className="text-right">{displayedRecord.nilaiKualitas}</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="font-medium">Nilai Kontribusi</TableCell>
                                                <TableCell className="text-right">{displayedRecord.nilaiKontribusi}</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="font-medium">Nilai Kedisiplinan</TableCell>
                                                <TableCell className="text-right">{displayedRecord.nilaiKedisiplinan}</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="font-medium">Performansi Unit</TableCell>
                                                <TableCell className="text-right">{formatAsPercent(displayedRecord.performance1)}</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="font-medium">Performansi Individu</TableCell>
                                                <TableCell className="text-right">{formatAsPercent(displayedRecord.performance2)}</TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>
                    ) : <Card><CardContent className="py-10 text-center text-muted-foreground">Tidak ada data performa resmi dari HO untuk periode ini.</CardContent></Card>}
                    
                    {isLoading ? (
                        <Card>
                            <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
                            <CardContent><Skeleton className="h-20 w-full" /></CardContent>
                        </Card>
                    ) : manualPerformanceData !== null ? (
                        <Card>
                            <CardHeader>
                                <CardTitle>Performa Produktivitas (Manual)</CardTitle>
                                <CardDescription>Dihitung dari laporan yang Anda input di aplikasi pada periode yang dipilih.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell className="font-medium">Total Bobot</TableCell>
                                            <TableCell className="text-right">{manualPerformanceData.totalBobot.toFixed(2)}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-medium">Produktivitas</TableCell>
                                            <TableCell className="text-right font-bold">{manualPerformanceData.productivity.toFixed(2)}%</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    ) : <Card><CardContent className="py-10 text-center text-muted-foreground">Tidak ada pekerjaan yang tercatat untuk periode ini.</CardContent></Card>}
                </div>

                </>
            ) : (
                <Card>
                    <CardContent className="py-16 text-center">
                        <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-semibold">Data Performa Belum Tersedia</h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Data performa untuk akun Anda belum ditemukan. Hubungi admin untuk menjalankan sinkronisasi data.
                        </p>
                    </CardContent>
                </Card>
            )}
             <div className="mt-8 w-full overflow-hidden">
                <Adsense
                data-ad-client="ca-pub-6478281232505590"
                data-ad-slot="YOUR_AD_SLOT_ID_PERFORMANCE_BANNER"
                data-ad-format="auto"
                className="block"
                data-full-width-responsive="true"
                />
            </div>
        </div>
    );
}
