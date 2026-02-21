
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useStorage, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, Timestamp, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Camera, Clock, MapPin, Loader2, VideoOff, AlertTriangle, Coffee, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { format, set, add, sub } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import Image from 'next/image';
import type { Schedule, Attendance } from '@/lib/types';

// Helper function to get the start of the day
const getStartOfDay = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
};

// Shift Type Labels
const shiftTypeLabels: Record<string, string> = {
  'piket-demak': 'Piket Demak (PDM)',
  'siang-malam': 'Piket Siang-Malam (SM)',
  'malam': 'Piket Malam (M)',
  'ijin': 'Izin (i)',
  'cuti': 'Cuti (C)',
  'weekend-duty': 'Jaga Akhir Pekan',
  'holiday-duty': 'Jaga Hari Libur',
};

// Check-in windows
const getCheckInWindow = (shiftType: Schedule['shiftType']): { start: Date, end: Date, target: Date } | null => {
    const now = new Date();
    let targetHour: number;

    switch (shiftType) {
        case 'piket-demak':
        case 'weekend-duty':
        case 'holiday-duty':
            targetHour = 8;
            break;
        case 'siang-malam':
            targetHour = 14;
            break;
        case 'malam':
            targetHour = 22;
            break;
        default:
            return null; // No check-in for ijin, cuti, etc.
    }

    const targetTime = set(now, { hours: targetHour, minutes: 0, seconds: 0, milliseconds: 0 });
    // Window: 1 hour before, 4 hours after
    const startTime = sub(targetTime, { hours: 1 });
    const endTime = add(targetTime, { hours: 4 });

    return { start: startTime, end: endTime, target: targetTime };
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
    
    // Time and check-in window state
    const [currentTime, setCurrentTime] = useState(new Date());
    const checkInWindow = useMemo(() => todaySchedule ? getCheckInWindow(todaySchedule.shiftType) : null, [todaySchedule]);
    const isWithinCheckInWindow = useMemo(() => {
        if (!checkInWindow) return false;
        return currentTime >= checkInWindow.start && currentTime <= checkInWindow.end;
    }, [currentTime, checkInWindow]);

    const hasCheckInPassed = useMemo(() => {
        if (!checkInWindow) return false;
        return currentTime > checkInWindow.end;
    }, [currentTime, checkInWindow]);
    
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

    useEffect(() => {
        if (!isScheduleLoading) {
            if (schedules && schedules.length > 0) {
                setTodaySchedule(schedules[0]);
            } else {
                setTodaySchedule(null);
                setIsLoading(false);
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

    useEffect(() => {
        if (todaySchedule && !isAttendanceLoading) {
            if (attendances && attendances.length > 0) {
                setTodayAttendance(attendances[0]);
            } else {
                setTodayAttendance(null);
            }
            setIsLoading(false);
        } else if (!todaySchedule && !isScheduleLoading) {
            // If there's no schedule, we are done loading
            setIsLoading(false);
        }
    }, [attendances, isAttendanceLoading, todaySchedule, isScheduleLoading]);
    
    // --- Clock and Camera Logic ---
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000 * 30); // Update every 30 seconds

        const needsCamera = todaySchedule && !todayAttendance && checkInWindow;
        let stream: MediaStream | null = null;

        const setupCamera = async () => {
             if (needsCamera) {
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ video: true });
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
            }
        }
        setupCamera();
            
        return () => {
            clearInterval(timer);
            stream?.getTracks().forEach(track => track.stop());
        };
    }, [todaySchedule, todayAttendance, toast, checkInWindow]);

    const handleCheckIn = async () => {
        if (!todaySchedule || !videoRef.current || !canvasRef.current || !user) {
            toast({ variant: 'destructive', title: 'Kesalahan Aplikasi', description: 'Komponen yang diperlukan tidak siap.' });
            return;
        }
        
        setIsCheckingIn(true);

        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true, timeout: 10000, maximumAge: 0,
                });
            });
            const coordinates = `${position.coords.latitude}, ${position.coords.longitude}`;

            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            if (!context) throw new Error('Could not get canvas context');
            context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            
            const photoBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
            if (!photoBlob) throw new Error('Gagal membuat file gambar.');

            const filePath = `hr_attendance/${user.uid}/${Date.now()}.jpg`;
            const storageRef = ref(storage, filePath);
            await uploadBytes(storageRef, photoBlob);
            const photoUrl = await getDownloadURL(storageRef);
            
            const newAttendance: Omit<Attendance, 'id'> = {
                userId: user.uid,
                scheduleId: todaySchedule.id,
                checkInTime: Timestamp.now(),
                checkInPhotoUrl: photoUrl,
                checkInCoordinates: coordinates,
                status: 'present',
            };
            
            addDocumentNonBlocking(collection(firestore, 'attendances'), newAttendance);

            toast({ title: 'Absen Berhasil!', description: 'Kehadiran Anda telah dicatat.' });

        } catch (error: any) {
            console.error('Check-in failed:', error);
            let description = 'Terjadi kesalahan yang tidak diketahui.';
            if (error.code === 1) description = 'Gagal mendapatkan lokasi: Izin ditolak.';
            else if (error.code === 2) description = 'Gagal mendapatkan lokasi: Lokasi tidak tersedia.';
            else if (error.code === 3) description = 'Gagal mendapatkan lokasi: Waktu permintaan habis.';
            else if (error.message) description = error.message;
            toast({ variant: 'destructive', title: 'Gagal Melakukan Absen', description });
        } finally {
            setIsCheckingIn(false);
        }
    };
    
    const pageIsLoading = isUserLoading || isLoading;

    if (pageIsLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-64 mb-4" />
                <Card><CardHeader><Skeleton className="h-7 w-48" /><Skeleton className="h-4 w-80" /></CardHeader>
                    <CardContent><Skeleton className="h-40 w-full" /></CardContent>
                </Card>
            </div>
        );
    }
    
    const renderContent = () => {
        if (!todaySchedule) {
            return (
                <Alert><AlertTriangle className="h-4 w-4" /><AlertTitle>Tidak Ada Jadwal</AlertTitle>
                    <AlertDescription>Anda tidak memiliki jadwal yang tercatat untuk hari ini.</AlertDescription>
                </Alert>
            );
        }

        if (todayAttendance) {
            const checkInTime = todayAttendance.checkInTime.toDate();
            return (
                <div className="space-y-6">
                    <Alert variant="default" className="bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-200 [&>svg]:text-green-600">
                        <Camera className="h-4 w-4" /><AlertTitle>Anda Sudah Absen Hari Ini</AlertTitle>
                        <AlertDescription>Kehadiran Anda telah tercatat. Terima kasih.</AlertDescription>
                    </Alert>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="relative aspect-square w-full max-w-md mx-auto rounded-lg overflow-hidden border">
                            <Image src={todayAttendance.checkInPhotoUrl} alt="Foto Absen" fill className="object-cover" />
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3"><Clock className="h-5 w-5 text-muted-foreground" />
                                <div><p className="text-sm text-muted-foreground">Waktu Absen</p>
                                    <p className="font-semibold">{format(checkInTime, 'dd MMMM yyyy, HH:mm:ss', { locale: idLocale })}</p>
                                </div>
                            </div>
                             <div className="flex items-center gap-3"><MapPin className="h-5 w-5 text-muted-foreground" />
                                <div><p className="text-sm text-muted-foreground">Lokasi Absen</p>
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

        if (!checkInWindow) { // This means it's an 'ijin' or 'cuti' day
            return (
                <Alert><Coffee className="h-4 w-4" /><AlertTitle>Status Hari Ini: {shiftTypeLabels[todaySchedule.shiftType]}</AlertTitle>
                    <AlertDescription>Anda tidak perlu melakukan absen hari ini. Selamat beristirahat.</AlertDescription>
                </Alert>
            );
        }

        // Render Check-in UI
        return (
            <div className="space-y-4">
                 {hasCheckInPassed && (
                    <Alert variant="destructive"><AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Waktu Absen Sudah Lewat</AlertTitle>
                        <AlertDescription>
                            Waktu absen untuk shift ini telah berakhir pada pukul {format(checkInWindow.end, 'HH:mm')}. Silakan hubungi atasan Anda.
                        </AlertDescription>
                    </Alert>
                 )}
                 {!isWithinCheckInWindow && !hasCheckInPassed && (
                     <Alert variant="default"><Info className="h-4 w-4" />
                        <AlertTitle>Belum Waktunya Absen</AlertTitle>
                        <AlertDescription>
                            Waktu absen untuk shift Anda dimulai pukul {format(checkInWindow.start, 'HH:mm')} hingga {format(checkInWindow.end, 'HH:mm')}.
                        </AlertDescription>
                    </Alert>
                 )}
                 {isWithinCheckInWindow && (
                      <Alert variant="default" className="bg-blue-50 border-blue-200 text-blue-800">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Peringatan: Anda Belum Absen!</AlertTitle>
                        <AlertDescription>
                            Silakan lakukan absensi sebelum pukul {format(checkInWindow.end, 'HH:mm')}.
                        </AlertDescription>
                    </Alert>
                 )}

                <div className="relative aspect-video w-full bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                    <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                    <canvas ref={canvasRef} className="hidden"></canvas>
                    {!hasCameraPermission && <VideoOff className="h-12 w-12 text-muted-foreground absolute" />}
                </div>
                <Button onClick={handleCheckIn} disabled={isCheckingIn || !hasCameraPermission || !isWithinCheckInWindow} className="w-full" size="lg">
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
                Lakukan absensi untuk jadwal Anda hari ini: {format(today, 'eeee, dd MMMM yyyy', { locale: idLocale })}
            </p>
            <Card>
                <CardHeader>
                    <CardTitle>{!todaySchedule ? 'Tidak Ada Jadwal Hari Ini' : shiftTypeLabels[todaySchedule.shiftType]}</CardTitle>
                    {todaySchedule && <CardDescription>{todaySchedule.notes || 'Tidak ada catatan khusus untuk jadwal ini.'}</CardDescription>}
                </CardHeader>
                <CardContent>
                    {renderContent()}
                </CardContent>
            </Card>
        </div>
    );
}

