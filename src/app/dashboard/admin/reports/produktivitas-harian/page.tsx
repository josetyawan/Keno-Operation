
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useFirestore } from '@/firebase';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { format, isSameDay } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { UserProfile, Schedule, RiwayatGangguan, OtherWork } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calendar as CalendarIcon, Send } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';
import { triggerB2cRekapAction } from '@/app/actions/triggerB2cRekapAction';

const units = ['B2C', 'B2B', 'MTC', 'Provisioning'];

type SummaryData = {
    name: string;
    productivity: number | 'L'; // Keep 'L' for single day view
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
    const [isSending, setIsSending] = useState(false);
    const [summaryData, setSummaryData] = useState<SummaryData[]>([]);
    const [detailData, setDetailData] = useState<DetailData[]>([]);
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: new Date(),
        to: new Date(),
    });

    const fetchProductivityData = useCallback(async () => {
        if (!selectedUnit || !dateRange?.from) return;
        setIsLoading(true);

        try {
            const startDate = new Date(dateRange.from.setHours(0, 0, 0, 0));
            const endDate = new Date((dateRange.to || dateRange.from).setHours(23, 59, 59, 999));
            
            const isSingleDay = isSameDay(startDate, endDate);

            // Generic fetch function
            async function fetchCollection<T>(collectionName: string, constraints: any[] = []): Promise<T[]> {
                const ref = collection(firestore, collectionName);
                const q = query(ref, ...constraints);
                const snapshot = await getDocs(q);
                return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
            }
            
            let schedules: Schedule[] = [];
            if (isSingleDay) {
                schedules = await fetchCollection<Schedule>('schedules', [
                    where('date', '>=', Timestamp.fromDate(startDate)),
                    where('date', '<=', Timestamp.fromDate(endDate))
                ]);
            }
            
            const [unitUsers, riwayatList, otherWorks] = await Promise.all([
                fetchCollection<UserProfile>('users', [where('unit', '==', selectedUnit), where('registrationStatus', '==', 'approved')]),
                fetchCollection<RiwayatGangguan>('riwayat-gangguan', [
                    where('tanggalLapor', '>=', Timestamp.fromDate(startDate)),
                    where('tanggalLapor', '<=', Timestamp.fromDate(endDate))
                ]),
                fetchCollection<OtherWork>('other-works', [
                    where('tanggalPengerjaan', '>=', Timestamp.fromDate(startDate)),
                    where('tanggalPengerjaan', '<=', Timestamp.fromDate(endDate))
                ])
            ]);

            const scheduleMap = new Map(schedules.map(s => [s.userId, s.shiftType]));
            const productivityMap = new Map<string, number>();

            // Calculate productivity, but only for users in the selected unit
            riwayatList.forEach(item => {
                const user = unitUsers.find(u => u.id === item.userId);
                if (user) {
                    productivityMap.set(item.userId, (productivityMap.get(item.userId) || 0) + 1);
                }
            });
            otherWorks.forEach(item => {
                const user = unitUsers.find(u => u.id === item.userId);
                if (user) {
                    productivityMap.set(item.userId, (productivityMap.get(item.userId) || 0) + 1);
                }
            });

            // Generate Summary Table
            const newSummaryData = unitUsers.map(user => {
                let productivity: number | 'L' = productivityMap.get(user.id) || 0;
                
                if (isSingleDay) {
                    const userSchedule = scheduleMap.get(user.id);
                    const isLibur = userSchedule === 'l' || userSchedule === 'libur-dijadwalkan' || userSchedule === 'cuti' || userSchedule === 'ijin';
                    if (isLibur) {
                        productivity = 'L';
                    }
                }

                return {
                    name: (user.displayName || user.email).toUpperCase(),
                    productivity: productivity
                };
            }).sort((a,b) => a.name.localeCompare(b.name));
            
            setSummaryData(newSummaryData);
            
            // Generate Detail Section
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
    }, [firestore, selectedUnit, dateRange, toast]);

    useEffect(() => {
        fetchProductivityData();
    }, [fetchProductivityData]);
    
    const dateHeader = useMemo(() => {
        if (!dateRange?.from) return 'Pilih tanggal';
        if (dateRange.to) {
            return `${format(dateRange.from, 'dd/MM/yyyy')} - ${format(dateRange.to, 'dd/MM/yyyy')}`;
        }
        return format(dateRange.from, 'dd MMMM yyyy', {locale: idLocale});
    }, [dateRange]);

    const handleManualSend = async () => {
        if ((summaryData.length === 0 && detailData.length === 0) || !selectedUnit) {
            toast({
                variant: "destructive",
                title: "Tidak Ada Data",
                description: "Tidak ada data produktivitas untuk dikirim.",
            });
            return;
        }
        setIsSending(true);
        
        const summaryMessage = `📆 REKAP TEKNISI ${selectedUnit.toUpperCase()} SEKTOR KUDUS (${dateHeader})\n\n` +
                             'NAMA TEKNISI | PRODUKTIVITAS\n' +
                             summaryData.map(item => `${item.name} | ${item.productivity}`).join('\n');
        
        const detailMessage = `📌 DETAIL PRODUKTIVITAS TEKNISI ${selectedUnit.toUpperCase()}\n\n` +
            (detailData.length > 0
                ? detailData.map(user => 
                    `${user.userName} ${user.telegramUsername}\n` +
                    'TIKET | SERVICE | SEGMEN\n' +
                    user.tickets.map(t => `${t.ticket || '-'} | ${t.service || '-'} | ${t.segment}`).join('\n')
                ).join('\n\n')
                : 'Tidak ada produktivitas tercatat untuk periode ini.');

        try {
            const result = await triggerB2cRekapAction({
                unit: selectedUnit,
                summaryMessage: summaryMessage,
                detailMessage: detailMessage,
            });

            if (result.success) {
                toast({
                    title: "Sukses",
                    description: result.message,
                });
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Gagal Mengirim",
                description: error.message || "Terjadi kesalahan saat mengirim laporan.",
            });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Rekap Produktivitas Teknisi</h1>
                    <p className="text-muted-foreground">Analisis produktivitas. Laporan otomatis dikirim setiap 2 jam.</p>
                </div>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Filter Data</CardTitle>
                    <CardDescription>Pilih unit dan rentang tanggal untuk melihat rekap produktivitas.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-end gap-4">
                     <div className="grid gap-2">
                        <Label htmlFor="unit-select">Unit</Label>
                        <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                            <SelectTrigger id="unit-select" className="w-[180px]"><SelectValue placeholder="Pilih Unit..." /></SelectTrigger>
                            <SelectContent>
                                {units.map(unit => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="date-range-picker">Rentang Tanggal</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    id="date-range-picker"
                                    variant={"outline"}
                                    className={cn("w-[300px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange?.from ? (
                                        dateRange.to ? (
                                            <>{format(dateRange.from, "dd LLL, yy", {locale: idLocale})} - {format(dateRange.to, "dd LLL, yy", {locale: idLocale})}</>
                                        ) : (
                                            format(dateRange.from, "dd LLL, yy", {locale: idLocale})
                                        )
                                    ) : (
                                        <span>Pilih rentang tanggal</span>
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
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <Button onClick={handleManualSend} disabled={isLoading || isSending} className="ml-auto">
                        {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        Kirim ke Telegram
                    </Button>
                </CardContent>
            </Card>

            {isLoading ? (
                <div className="flex justify-center items-center p-8"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
            ) : (
                <div className="grid lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-1">
                        <CardHeader>
                            <CardTitle>Ringkasan Produktivitas</CardTitle>
                             <CardDescription>{selectedUnit} - {dateHeader}</CardDescription>
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
                                        )).join('\n\n')
                                        : 'Tidak ada produktivitas tercatat untuk unit ini pada rentang tanggal yang dipilih.'
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
