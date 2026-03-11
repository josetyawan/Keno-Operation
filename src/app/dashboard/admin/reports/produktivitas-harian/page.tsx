
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { UserProfile, Schedule, RiwayatGangguan, OtherWork } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const units = ['B2C', 'B2B', 'MTC', 'Provisioning'];

type SummaryData = {
    name: string;
    productivity: number | 'L';
};

type DetailData = {
    userName: string;
    telegramUsername: string;
    tickets: {
        id: string;
        ticket: string;
        service: string;
        segment: string;
    }[];
};

export default function ProduktivitasHarianPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [selectedUnit, setSelectedUnit] = useState('B2C');
    const [isLoading, setIsLoading] = useState(false);
    const [summaryData, setSummaryData] = useState<SummaryData[]>([]);
    const [detailData, setDetailData] = useState<DetailData[]>([]);

    const fetchProductivityData = useCallback(async () => {
        if (!selectedUnit) return;
        setIsLoading(true);

        try {
            const today = new Date();
            const startOfToday = new Date(today.setHours(0, 0, 0, 0));
            const endOfToday = new Date(today.setHours(23, 59, 59, 999));

            // Generic fetch function
            async function fetchCollection<T>(collectionName: string, constraints: any[] = []): Promise<T[]> {
                const ref = collection(firestore, collectionName);
                const q = query(ref, ...constraints);
                const snapshot = await getDocs(q);
                return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
            }
            
            // 1. Fetch all necessary data in parallel
            const [unitUsers, schedules, riwayatList, otherWorks] = await Promise.all([
                fetchCollection<UserProfile>('users', [where('unit', '==', selectedUnit), where('registrationStatus', '==', 'approved')]),
                fetchCollection<Schedule>('schedules', [
                    where('date', '>=', Timestamp.fromDate(startOfToday)),
                    where('date', '<=', Timestamp.fromDate(endOfToday))
                ]),
                fetchCollection<RiwayatGangguan>('riwayat-gangguan', [
                    where('tanggalLapor', '>=', Timestamp.fromDate(startOfToday)),
                    where('tanggalLapor', '<=', Timestamp.fromDate(endOfToday))
                ]),
                fetchCollection<OtherWork>('other-works', [
                    where('tanggalPengerjaan', '>=', Timestamp.fromDate(startOfToday)),
                    where('tanggalPengerjaan', '<=', Timestamp.fromDate(endOfToday))
                ])
            ]);

            const scheduleMap = new Map(schedules.map(s => [s.userId, s.shiftType]));
            const productivityMap = new Map<string, number>();

            // 2. Calculate productivity
            riwayatList.forEach(item => {
                productivityMap.set(item.userId, (productivityMap.get(item.userId) || 0) + 1);
            });
            otherWorks.forEach(item => {
                productivityMap.set(item.userId, (productivityMap.get(item.userId) || 0) + 1);
            });

            // 3. Generate Summary Table
            const newSummaryData = unitUsers.map(user => {
                const userSchedule = scheduleMap.get(user.id);
                // Define what counts as 'Libur'
                const isLibur = userSchedule === 'l' || userSchedule === 'libur-dijadwalkan' || userSchedule === 'cuti' || userSchedule === 'ijin';
                const productivity = isLibur ? 'L' : (productivityMap.get(user.id) || 0);
                return {
                    name: (user.displayName || user.email).toUpperCase(),
                    productivity: productivity
                };
            }).sort((a,b) => a.name.localeCompare(b.name));
            
            setSummaryData(newSummaryData);
            
            // 4. Generate Detail Section
            const productiveUsers = unitUsers.filter(user => (productivityMap.get(user.id) || 0) > 0);
            
            const newDetailData = productiveUsers.map(user => {
                const userRiwayat = riwayatList.filter(r => r.userId === user.id);
                const userOtherWorks = otherWorks.filter(w => w.userId === user.id);
                
                const tickets = [
                    ...userRiwayat.map(r => ({ id: r.id, ticket: r.noTiket || '', service: r.noService || '', segment: r.jenisOrder })),
                    ...userOtherWorks.map(w => ({ id: w.id, ticket: w.namaPekerjaan || '', service: '', segment: w.jenisOrder }))
                ];

                return {
                    userName: user.displayName || user.email,
                    telegramUsername: user.telegramUsername ? `@${user.telegramUsername.replace('@', '')}` : '',
                    tickets: tickets
                };
            });

            setDetailData(newDetailData);

        } catch (error: any) {
            console.error('Error fetching productivity data:', error);
            toast({
                variant: "destructive",
                title: "Gagal Mengambil Data",
                description: error.message,
            });
        } finally {
            setIsLoading(false);
        }
    }, [firestore, selectedUnit, toast]);

    useEffect(() => {
        fetchProductivityData();
    }, [fetchProductivityData]);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Rekap Produktivitas Harian</h1>
            
            <Card>
                <CardHeader>
                    <CardTitle>Filter Unit</CardTitle>
                    <CardDescription>Pilih unit untuk melihat rekap produktivitas hari ini.</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-4">
                     <div className="grid gap-2 w-full max-w-sm">
                        <Label htmlFor="unit-select">Unit</Label>
                        <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                            <SelectTrigger id="unit-select"><SelectValue placeholder="Pilih Unit..." /></SelectTrigger>
                            <SelectContent>
                                {units.map(unit => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {isLoading ? (
                <div className="flex justify-center items-center p-8"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
            ) : (
                <div className="grid lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-1">
                        <CardHeader>
                            <CardTitle>Ringkasan Produktivitas</CardTitle>
                             <CardDescription>{selectedUnit} - {format(new Date(), 'dd MMMM yyyy', {locale: idLocale})}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <pre className="text-sm bg-muted p-4 rounded-md overflow-x-auto">
                                <code className="font-mono">
                                    {`NAMA TEKNISI | PRODUKTIVITAS\n`}
                                    {summaryData.map(item => `${item.name} | ${item.productivity}\n`).join('')}
                                </code>
                            </pre>
                        </CardContent>
                    </Card>
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle>Detail Produktivitas</CardTitle>
                        </CardHeader>
                        <CardContent>
                           <ScrollArea className="h-[60vh]">
                             <pre className="text-sm bg-muted p-4 rounded-md">
                                <code className="font-mono whitespace-pre-wrap">
                                    {detailData.length > 0
                                        ? detailData.map(user => (
                                            `\n${user.userName} ${user.telegramUsername}\n` +
                                            `TIKET | SERVICE | SEGMEN\n` +
                                            user.tickets.map(t => `${t.ticket} | ${t.service} | ${t.segment}`).join('\n')
                                        )).join('\n')
                                        : 'Tidak ada produktivitas tercatat untuk unit ini hari ini.'
                                    }
                                </code>
                            </pre>
                           </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
