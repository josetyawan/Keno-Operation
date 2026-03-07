
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, Timestamp, doc, orderBy, writeBatch } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import Image from 'next/image';
import type { UserProfile, Attendance } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { Calendar as CalendarIcon, Download, MapPin, Trash2, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
    const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false);
    const [isDeletingAll, setIsDeletingAll] = useState(false);

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
        
        // Firestore 'in' query is limited to 30 items. If more, we need to chunk the queries.
        if (userIds.length === 0) return null;

        const chunks: string[][] = [];
        for (let i = 0; i < userIds.length; i += 30) {
            chunks.push(userIds.slice(i, i + 30));
        }
        
        // This component doesn't combine results from multiple queries, so we'll just query the first chunk.
        // For a fully scalable solution, a backend function or more complex client-side logic would be needed.
        if(chunks.length > 1) {
             toast({variant: 'destructive', title: 'Terlalu Banyak Pengguna', description: `Hanya nama untuk 30 dari ${userIds.length} pengguna pertama yang dapat ditampilkan.`})
        }
        
        return query(collection(firestore, 'users'), where('id', 'in', chunks[0]));
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
            description: 'Memuat semua gambar sebelum membuat kolase.',
        });

        // Get all images within the printable area
        const images = Array.from(printableArea.getElementsByTagName('img'));
        const imageLoadPromises = images.map(img => {
            // If the image is already loaded and has valid dimensions, resolve immediately.
            if (img.complete && img.naturalHeight !== 0) {
                return Promise.resolve();
            }
            // Otherwise, wait for it to load or fail.
            return new Promise<void>((resolve) => {
                img.onload = () => resolve();
                // On error, we still resolve so that one broken image doesn't prevent the download.
                img.onerror = () => {
                    console.warn(`Could not load image for download: ${img.src}`);
                    resolve(); 
                };
            });
        });

        try {
            await Promise.all(imageLoadPromises);
            
            toast({
                title: 'Membuat kolase...',
                description: 'Semua gambar telah dimuat, proses pembuatan file JPG dimulai.',
            });

            const filter = (node: HTMLElement) => {
                if (
                    node.tagName === 'LINK' &&
                    node.hasAttribute('href') &&
                    (node.getAttribute('href') || '').includes('fonts.googleapis.com')
                ) {
                    return false;
                }
                return true;
            };

            const dataUrl = await toJpeg(printableArea, { 
                quality: 0.95,
                backgroundColor: '#ffffff',
                pixelRatio: 2,
                filter: filter,
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

    const handleDeleteAll = async () => {
        if (!attendances || attendances.length === 0) {
            toast({ variant: "destructive", title: "Tidak ada data untuk dihapus" });
            return;
        }
        setIsDeletingAll(true);
        try {
            const batch = writeBatch(firestore);
            attendances.forEach(att => {
                const docRef = doc(firestore, 'attendances', att.id);
                batch.delete(docRef);
            });
            await batch.commit();
            toast({
                title: "Semua Absensi Dihapus",
                description: `${attendances.length} data absensi untuk tanggal ini telah berhasil dihapus.`,
            });
            setIsDeleteAllDialogOpen(false);
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Gagal Menghapus",
                description: error.message,
            });
        } finally {
            setIsDeletingAll(false);
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
                    <div className="flex gap-2 no-print">
                        <Button onClick={handleDownloadJpg} disabled={!attendances || attendances.length === 0}><Download className="mr-2 h-4 w-4" /> Download JPG</Button>
                        {(currentUserProfile?.role === 'admin' || currentUserProfile?.role === 'korlap') && (
                            <AlertDialog open={isDeleteAllDialogOpen} onOpenChange={setIsDeleteAllDialogOpen}>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" disabled={!attendances || attendances.length === 0 || isDeletingAll}><Trash2 className="mr-2 h-4 w-4" /> Hapus Semua</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Anda Yakin?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Tindakan ini akan menghapus semua <strong>({attendances?.length || 0})</strong> data absensi untuk tanggal <strong>{selectedDate ? format(selectedDate, 'dd MMM yyyy') : ''}</strong> secara permanen. Tindakan ini tidak dapat dibatalkan.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Batal</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDeleteAll} disabled={isDeletingAll} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                            {isDeletingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Ya, Hapus Semua'}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                    </div>
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
                            <Card key={att.id} className="overflow-hidden break-inside-avoid group relative">
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
    

    