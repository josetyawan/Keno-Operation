
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, Timestamp, doc, orderBy, documentId } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import Image from 'next/image';
import type { UserProfile, Attendance } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { Calendar as CalendarIcon, Printer, MapPin, Download } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { toJpeg } from 'html-to-image';


export default function AttendanceRekapPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

    const { data: currentUserProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(
        useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore])
    );

    useEffect(() => {
        if (!isUserLoading && !isProfileLoading) {
            if (!user || (currentUserProfile?.role !== 'admin' && currentUserProfile?.role !== 'korlap')) {
                router.push('/dashboard');
            }
        }
    }, [user, currentUserProfile, isUserLoading, isProfileLoading, router]);

    const attendancesQuery = useMemoFirebase(() => {
        if (!selectedDate) return null;
        const start = new Date(selectedDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(selectedDate);
        end.setHours(23, 59, 59, 999);

        return query(
            collection(firestore, 'attendances'),
            where('checkInTime', '>=', Timestamp.fromDate(start)),
            where('checkInTime', '<=', Timestamp.fromDate(end)),
            orderBy('checkInTime', 'asc')
        );
    }, [firestore, selectedDate]);

    const { data: attendances, isLoading: areAttendancesLoading } = useCollection<Attendance>(attendancesQuery);
    
    const usersQuery = useMemoFirebase(() => {
        if (!attendances || attendances.length === 0) return null;
        const userIds = [...new Set(attendances.map(a => a.userId))];
        if (userIds.length === 0) return null;
        // Firestore 'in' query is limited to 30 items per query.
        if (userIds.length > 30) {
            toast({variant: 'destructive', title: 'Terlalu Banyak Pengguna', description: 'Tidak dapat memuat semua nama pengguna untuk lebih dari 30 absensi sekaligus.'})
            return query(collection(firestore, 'users'), where(documentId(), 'in', userIds.slice(0, 30)));
        }
        return query(collection(firestore, 'users'), where(documentId(), 'in', userIds));
    }, [firestore, attendances, toast]);
    
    const { data: users, isLoading: areUsersLoading } = useCollection<UserProfile>(usersQuery);

    const userMap = useMemo(() => {
        if (!users) return new Map();
        return new Map(users.map(u => [u.id, u.displayName || u.email]));
    }, [users]);
    
    const handleDownloadJpg = async () => {
        const printableArea = document.getElementById('printable-area');
        if (!printableArea) {
            toast({
                variant: 'destructive',
                title: 'Elemen tidak ditemukan',
                description: 'Tidak dapat menemukan area untuk diunduh.',
            });
            return;
        }

        toast({
            title: 'Mempersiapkan unduhan...',
            description: 'Kolase sedang dibuat, ini mungkin butuh beberapa saat.',
        });

        try {
            // Give browser time to render images before capturing
            await new Promise(resolve => setTimeout(resolve, 500));

            const dataUrl = await toJpeg(printableArea, { 
                quality: 0.95,
                backgroundColor: '#ffffff',
                pixelRatio: 2, // Increase resolution for better quality
             });
            const link = document.createElement('a');
            const dateString = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : 'rekap';
            link.download = `rekap-absensi-${dateString}.jpg`;
            link.href = dataUrl;
            link.click();
            link.remove();
        } catch (error) {
            console.error('Gagal membuat gambar:', error);
            toast({
                variant: 'destructive',
                title: 'Gagal Mengunduh',
                description: 'Terjadi kesalahan saat membuat file JPG.',
            });
        }
    };
    
    const isLoading = isUserLoading || isProfileLoading || areAttendancesLoading || areUsersLoading;

    return (
        <div id="rekap-page" className="space-y-6">
            <style>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #printable-area, #printable-area * {
                        visibility: visible;
                    }
                    #printable-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                    .no-print {
                        display: none;
                    }
                }
            `}</style>
            
            <div className="flex items-center justify-between no-print">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Rekap Absensi Jaga</h1>
                    <p className="text-muted-foreground">Lihat foto absensi teknisi berdasarkan tanggal.</p>
                </div>
            </div>
            
             <Card className="no-print">
                <CardHeader>
                    <CardTitle>Pilih Tanggal</CardTitle>
                </CardHeader>
                <CardContent>
                     <Popover>
                        <PopoverTrigger asChild>
                            <Button variant={'outline'} className={cn('w-[280px] justify-start text-left font-normal', !selectedDate && 'text-muted-foreground')}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {selectedDate ? format(selectedDate, 'PPP', {locale: idLocale}) : <span>Pilih tanggal</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus />
                        </PopoverContent>
                    </Popover>
                </CardContent>
            </Card>

            <div id="printable-area" className="bg-white p-4">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold">Laporan Absensi - {selectedDate ? format(selectedDate, 'dd MMMM yyyy', {locale: idLocale}) : ''}</h2>
                    <Button onClick={handleDownloadJpg} className="no-print"><Download className="mr-2 h-4 w-4" /> Download JPG</Button>
                </div>

                {isLoading ? (
                     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {Array.from({length: 8}).map((_, i) => (
                           <Skeleton key={i} className="aspect-square w-full" />
                        ))}
                    </div>
                ) : attendances && attendances.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {attendances.map(att => (
                            <Card key={att.id} className="overflow-hidden break-inside-avoid">
                                <div className="relative aspect-square w-full">
                                    <Image src={att.checkInPhotoUrl} alt={`Foto absen ${userMap.get(att.userId)}`} fill className="object-cover" />
                                </div>
                                <CardContent className="p-3 text-sm">
                                    <p className="font-semibold truncate">{userMap.get(att.userId) || 'Memuat...'}</p>
                                    <p className="text-muted-foreground">{format(att.checkInTime.toDate(), 'HH:mm:ss', {locale: idLocale})}</p>
                                    <Link href={`https://www.google.com/maps/search/?api=1&query=${att.checkInCoordinates}`} target="_blank" rel="noopener noreferrer">
                                        <div className="text-blue-600 hover:underline flex items-center gap-1 mt-1">
                                            <MapPin className="h-3 w-3"/>
                                            <span>Lihat Lokasi</span>
                                        </div>
                                    </Link>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <p className="text-muted-foreground">Tidak ada data absensi untuk tanggal yang dipilih.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
