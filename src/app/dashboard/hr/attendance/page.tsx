'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useStorage, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, Timestamp, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Camera, Clock, MapPin, Loader2, VideoOff, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import Image from 'next/image';
import type { Schedule, Attendance } from '@/lib/types';

// Helper function to get the start of the day
const getStartOfDay = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
};

export default function AttendancePage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const storage = useStorage();
    const { toast } = useToast();

    const [todaySchedule, setTodaySchedule] = useState<Schedule | null>(null);
    const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isCheckingIn, setIsCheckingIn] = useState(false);
    
    // Camera state
    const [hasCameraPermission, setHasCameraPermission] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // --- Data Fetching ---
    const today = useMemo(() => getStartOfDay(), []);
    const scheduleQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(
            collection(firestore, 'schedules'),
            where('userId', '==', user.uid),
            where('date', '==', Timestamp.fromDate(today)),
            limit(1)
        );
    }, [user, firestore, today]);

    const { data: schedules, isLoading: isScheduleLoading } = useCollection<Schedule>(scheduleQuery);

    // This effect finds the schedule for today
    useEffect(() => {
        if (!isScheduleLoading) {
            if (schedules && schedules.length > 0) {
                setTodaySchedule(schedules[0]);
            } else {
                setTodaySchedule(null);
                setIsLoading(false); // No schedule, so we're done loading
            }
        }
    }, [schedules, isScheduleLoading]);

    const attendanceQuery = useMemoFirebase(() => {
        if (!todaySchedule) return null;
        return query(
            collection(firestore, 'attendances'),
            where('scheduleId', '==', todaySchedule.id),
            limit(1)
        );
    }, [firestore, todaySchedule]);

    const { data: attendances, isLoading: isAttendanceLoading } = useCollection<Attendance>(attendanceQuery);

    // This effect finds the attendance record if a schedule exists
    useEffect(() => {
        if (todaySchedule && !isAttendanceLoading) {
            if (attendances && attendances.length > 0) {
                setTodayAttendance(attendances[0]);
            } else {
                setTodayAttendance(null);
            }
            setIsLoading(false); // Schedule is loaded, attendance check is done
        }
    }, [attendances, isAttendanceLoading, todaySchedule]);
    
    // --- Camera Logic ---
    useEffect(() => {
        // Only request camera if there's a schedule and the user hasn't checked in yet
        if (todaySchedule && !todayAttendance) {
            const getCameraPermission = async () => {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    setHasCameraPermission(true);
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                } catch (error) {
                    console.error('Error accessing camera:', error);
                    setHasCameraPermission(false);
                    toast({
                        variant: 'destructive',
                        title: 'Akses Kamera Ditolak',
                        description: 'Silakan izinkan akses kamera di pengaturan browser Anda untuk melakukan absensi.',
                    });
                }
            };
            getCameraPermission();
            
            // Cleanup function to stop video stream
            return () => {
                if (videoRef.current && videoRef.current.srcObject) {
                    const stream = videoRef.current.srcObject as MediaStream;
                    stream.getTracks().forEach(track => track.stop());
                }
            };
        }
    }, [todaySchedule, todayAttendance, toast]);

    const handleCheckIn = async () => {
        if (!todaySchedule || !videoRef.current || !canvasRef.current || !user) {
            toast({ variant: 'destructive', title: 'Kesalahan Aplikasi', description: 'Komponen yang diperlukan tidak siap.' });
            return;
        }
        
        setIsCheckingIn(true);

        try {
            // 1. Get GPS Location
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0,
                });
            });
            const coordinates = `${position.coords.latitude}, ${position.coords.longitude}`;

            // 2. Capture Photo
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            if (!context) throw new Error('Could not get canvas context');
            context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            
            const photoBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
            if (!photoBlob) throw new Error('Gagal membuat file gambar.');

            // 3. Upload Photo to Storage
            const filePath = `hr_attendance/${user.uid}/${Date.now()}.jpg`;
            const storageRef = ref(storage, filePath);
            await uploadBytes(storageRef, photoBlob);
            const photoUrl = await getDownloadURL(storageRef);
            
            // 4. Save Attendance Document
            const newAttendance: Omit<Attendance, 'id'> = {
                userId: user.uid,
                scheduleId: todaySchedule.id,
                checkInTime: Timestamp.now(),
                checkInPhotoUrl: photoUrl,
                checkInCoordinates: coordinates,
                status: 'present',
            };
            
            addDocumentNonBlocking(collection(firestore, 'attendances'), newAttendance);

            toast({
                title: 'Absen Berhasil!',
                description: 'Kehadiran Anda telah dicatat.',
            });
            // The component will re-render with the new attendance data via the hook

        } catch (error: any) {
            console.error('Check-in failed:', error);
            let description = 'Terjadi kesalahan yang tidak diketahui.';
            if (error.code === 1) { // Geolocation error codes are numbers
                description = 'Gagal mendapatkan lokasi: Izin ditolak.';
            } else if (error.code === 2) {
                description = 'Gagal mendapatkan lokasi: Lokasi tidak tersedia.';
            } else if (error.code === 3) {
                description = 'Gagal mendapatkan lokasi: Waktu permintaan habis.';
            } else if (error.message) {
                 description = error.message;
            }
            toast({
                variant: 'destructive',
                title: 'Gagal Melakukan Absen',
                description: description,
            });
        } finally {
            setIsCheckingIn(false);
        }
    };
    
    const pageIsLoading = isUserLoading || isLoading;

    if (pageIsLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-64 mb-4" />
                <Card>
                    <CardHeader>
                        <Skeleton className="h-7 w-48" />
                        <Skeleton className="h-4 w-80" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-40 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    // --- Render Logic ---
    const renderContent = () => {
        if (!todaySchedule) {
            return (
                <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Tidak Ada Jadwal</AlertTitle>
                    <AlertDescription>
                        Anda tidak memiliki jadwal jaga yang aktif untuk hari ini.
                    </AlertDescription>
                </Alert>
            );
        }

        if (todayAttendance) {
            const checkInTime = safeToDate(todayAttendance.checkInTime);
            return (
                <div className="space-y-6">
                    <Alert variant="default" className="bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-200 [&>svg]:text-green-600">
                        <Camera className="h-4 w-4" />
                        <AlertTitle>Anda Sudah Absen Hari Ini</AlertTitle>
                        <AlertDescription>
                            Kehadiran Anda telah tercatat. Terima kasih.
                        </AlertDescription>
                    </Alert>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="relative aspect-square w-full max-w-md mx-auto rounded-lg overflow-hidden border">
                            <Image src={todayAttendance.checkInPhotoUrl} alt="Foto Absen" fill className="object-cover" />
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Clock className="h-5 w-5 text-muted-foreground" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Waktu Absen</p>
                                    <p className="font-semibold">{checkInTime ? format(checkInTime, 'dd MMMM yyyy, HH:mm:ss', { locale: idLocale }) : '-'}</p>
                                </div>
                            </div>
                             <div className="flex items-center gap-3">
                                <MapPin className="h-5 w-5 text-muted-foreground" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Lokasi Absen</p>
                                    <p className="font-semibold text-blue-600 hover:underline">
                                        <a href={`https://www.google.com/maps/search/?api=1&query=${todayAttendance.checkInCoordinates}`} target="_blank" rel="noopener noreferrer">
                                            {todayAttendance.checkInCoordinates}
                                        </a>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // Render Check-in UI
        return (
            <div className="space-y-4">
                 {!hasCameraPermission && todaySchedule && (
                    <Alert variant="destructive">
                        <VideoOff className="h-4 w-4" />
                        <AlertTitle>Kamera Tidak Aktif</AlertTitle>
                        <AlertDescription>
                            Aplikasi memerlukan akses ke kamera Anda untuk melanjutkan. Mohon izinkan akses kamera di browser Anda.
                        </AlertDescription>
                    </Alert>
                )}
                <div className="relative aspect-video w-full bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                    <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                    <canvas ref={canvasRef} className="hidden"></canvas>
                     {!videoRef.current?.srcObject && <VideoOff className="h-12 w-12 text-muted-foreground absolute" />}
                </div>
                <Button onClick={handleCheckIn} disabled={isCheckingIn || !hasCameraPermission} className="w-full" size="lg">
                    {isCheckingIn ? <Loader2 className="animate-spin" /> : <Camera className="mr-2" />}
                    {isCheckingIn ? 'Memproses...' : 'Ambil Foto & Check In Sekarang'}
                </Button>
            </div>
        );
    };

    return (
        <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Absensi Jaga</h1>
            <p className="text-muted-foreground mb-6">
                Lakukan absensi untuk jadwal jaga Anda hari ini: {format(today, 'eeee, dd MMMM yyyy', { locale: idLocale })}
            </p>
            <Card>
                <CardHeader>
                    <CardTitle>{!todaySchedule ? 'Tidak Ada Jadwal Hari Ini' : (todaySchedule.shiftType === 'weekend-duty' ? 'Jadwal Jaga Akhir Pekan' : 'Jadwal Jaga Libur Nasional')}</CardTitle>
                    {todaySchedule && <CardDescription>{todaySchedule.notes || 'Tidak ada catatan khusus untuk jadwal ini.'}</CardDescription>}
                </CardHeader>
                <CardContent>
                    {renderContent()}
                </CardContent>
            </Card>
        </div>
    );
}