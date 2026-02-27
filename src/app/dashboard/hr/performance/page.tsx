
'use client';

import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { doc } from 'firebase/firestore';
import type { UserProfile, Performance } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function UserPerformancePage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();

    const [selectedPeriod, setSelectedPeriod] = useState<string | undefined>();
    
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(
        useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore])
    );
    
    const performanceQuery = useMemoFirebase(() => {
        if (!userProfile?.nik) return null;
        return query(collection(firestore, 'performance'), where('nik', '==', userProfile.nik), orderBy('date', 'desc'));
    }, [firestore, userProfile?.nik]);

    const { data: performanceRecords, isLoading: isPerformanceLoading } = useCollection<Performance>(performanceQuery);
    
    const availablePeriods = useMemo(() => {
        if (!performanceRecords) return [];
        const periods = performanceRecords.map(p => `${p.tahun}-${String(p.bulan).padStart(2, '0')}`);
        return [...new Set(periods)]; // Unique periods
    }, [performanceRecords]);
    
    useEffect(() => {
        if (availablePeriods.length > 0 && !selectedPeriod) {
            setSelectedPeriod(availablePeriods[0]);
        }
    }, [availablePeriods, selectedPeriod]);

    const displayedRecord = useMemo(() => {
        if (!selectedPeriod || !performanceRecords) return null;
        return performanceRecords.find(p => `${p.tahun}-${String(p.bulan).padStart(2, '0')}` === selectedPeriod);
    }, [performanceRecords, selectedPeriod]);

    const isLoading = isUserLoading || isProfileLoading || isPerformanceLoading;

    const formatAsPercent = (value: string) => {
        if (typeof value !== 'string' || !value.trim()) return '-';
        if (value.trim().endsWith('%')) return value;
        const num = parseFloat(value);
        if (isNaN(num)) return value;
        return `${(num * 100).toFixed(2)}%`;
    };

    if (isLoading) {
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

            {performanceRecords && performanceRecords.length > 0 ? (
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

                {displayedRecord && (
                    <div className="grid gap-6">
                        <Card className="bg-primary text-primary-foreground text-center">
                             <CardHeader>
                                <CardDescription className="text-primary-foreground/80">Total Performa - {format(displayedRecord.date.toDate(), 'MMMM yyyy', {locale: idLocale})}</CardDescription>
                                <CardTitle className="text-6xl font-bold tracking-tighter">
                                    {formatAsPercent(displayedRecord.totalPerformance)}
                                </CardTitle>
                            </CardHeader>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Rincian Nilai</CardTitle>
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
                )}
                </>
            ) : (
                <Card>
                    <CardContent className="py-16 text-center">
                        <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-semibold">Data Performa Belum Tersedia</h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Saat ini belum ada data performa yang diimpor untuk akun Anda.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
