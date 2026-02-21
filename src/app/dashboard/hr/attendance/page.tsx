
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useStorage, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { collection, query, where, Timestamp, limit, doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Camera, Clock, MapPin, Loader2, VideoOff, AlertTriangle, Coffee, Info, FileWarning } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { format, set, add, sub } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import Image from 'next/image';
import type { Schedule, Attendance } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

// --- Helper Functions ---

const getStartOfDay = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
};

const shiftTypeLabels: Record<string, string> = {
  'piket-demak': 'Piket Demak (PDM)',
  'siang-malam': 'Piket Siang-Malam (SM)',
  'malam': 'Piket Malam (M)',
  'ijin': 'Izin (i)',
  'cuti': 'Cuti (C)',
  'weekend-duty': 'Jaga Akhir Pekan',
  'holiday-duty': 'Jaga Hari Libur',
};

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
            return null;
    }

    const targetTime = set(now, { hours: targetHour, minutes: 0, seconds: 0, milliseconds: 0 });
    const startTime = sub(targetTime, { hours: 1 });
    const endTime = add(targetTime, { hours: 4 });

    return { start: startTime, end: endTime, target: targetTime };
};

// --- Child Component for Check-in UI ---

function CheckInUI({
    isLoading,
    todaySchedule,
    todayAttendance,
    isCheckingIn,
    hasCameraPermission,
    videoRef,
    canvasRef,
    handleCheckIn
}: {
    isLoading: boolean;
    todaySchedule: Schedule | null;
    todayAttendance: Attendance | null;
    isCheckingIn: boolean;
    hasCameraPermission: boolean;
    videoRef: React.RefObject<HTMLVideoElement>;
    canvasRef: React.RefObject<HTMLCanvasElement>;
    handleCheckIn: () => void;
}) {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000 * 30);
        return () => clearInterval(timer);
    }, []);

    const checkInWindow = useMemo(() => todaySchedule ? getCheckInWindow(todaySchedule.shiftType) : null, [todaySchedule]);
    const isWithinCheckInWindow = useMemo(() => {
        if (!checkInWindow) return false;
        return currentTime >= checkInWindow.start && currentTime <= checkInWindow.end;
    }, [currentTime, checkInWindow]);

    const hasCheckInPassed = useMemo(() => {
        if (!checkInWindow) return false;
        return currentTime > checkInWindow.end;
    }, [currentTime, checkInWindow]);

    if (isLoading) {
        return <Skeleton className="h-40 w-full" />;
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
    
    if (!todaySchedule) {
        return (
             <Alert><AlertTriangle className="h-4 w-4" /><AlertTitle>Tidak Ada Jadwal</AlertTitle>
                <AlertDescription>Anda tidak memiliki jadwal kerja yang tercatat untuk hari ini.</AlertDescription>
            </Alert>
        );
    }

    if (!checkInWindow) {
        return (
            <Alert><Coffee className="h-4 w-4" /><AlertTitle>Status Hari Ini: {shiftTypeLabels[todaySchedule.shiftType]}</AlertTitle>
                <AlertDescription>Anda tidak perlu melakukan absen hari ini. {todaySchedule.notes && `Catatan: ${todaySchedule.notes}`}</AlertDescription>
            </Alert>
        );
    }

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
}

// --- Main Page Component ---

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
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [hasCameraPermission, setHasCameraPermission] = useState(false);
    
    // Leave request state
    const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
    const [leaveType, setLeaveType] = useState<'ijin' | 'cuti'>('ijin');
    const [leaveReason, setLeaveReason] = useState('');
    const [isRequestingLeave, setIsRequestingLeave] = useState(false);

    // --- Data Fetching ---
    const today = useMemo(() => getStartOfDay(), []);
    const scheduleQuery = useMemoFirebase(() => {
        if (!user) return null;
        const scheduleId = `${user.uid}_${format(today, 'yyyy-MM-dd')}`;
        return query(
            collection(firestore, 'schedules'),
            where('__name__', '==', scheduleId),
            limit(1)
        );
    }, [user, firestore, today]);

    const { data: schedules, isLoading: isScheduleLoading } = useCollection<Schedule>(scheduleQuery);
    
    useEffect(() => {
        if (!isScheduleLoading) {
            setTodaySchedule(schedules?.[0] || null);
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
            setTodayAttendance(attendances?.[0] || null);
            setIsLoading(false);
        } else if (!todaySchedule && !isScheduleLoading) {
            setTodayAttendance(null);
            setIsLoading(false);
        }
    }, [attendances, isAttendanceLoading, todaySchedule, isScheduleLoading]);
    
    // --- Camera Logic ---
    useEffect(() => {
        const checkInWindow = todaySchedule ? getCheckInWindow(todaySchedule.shiftType) : null;
        const needsCamera = todaySchedule && !todayAttendance && checkInWindow;
        let stream: MediaStream | null = null;

        const setupCamera = async () => {
             if (needsCamera) {
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    setHasCameraPermission(true);
                    if (videoRef.current) videoRef.current.srcObject = stream;
                } catch (error) {
                    setHasCameraPermission(false);
                }
            }
        }
        setupCamera();
            
        return () => {
            stream?.getTracks().forEach(track => track.stop());
        };
    }, [todaySchedule, todayAttendance]);
    
    const handleLeaveRequest = async () => {
        if (!leaveReason.trim()) {
            toast({ variant: 'destructive', title: 'Alasan Diperlukan', description: 'Silakan isi alasan pengajuan Anda.' });
            return;
        }
        if (!user || !user.email) {
            toast({ variant: 'destructive', title: 'Error', description: 'User tidak ditemukan.' });
            return;
        }

        setIsRequestingLeave(true);
        try {
            const scheduleId = `${user.uid}_${format(today, 'yyyy-MM-dd')}`;
            const scheduleDocRef = doc(firestore, "schedules", scheduleId);
            
            const scheduleData = {
                userId: user.uid,
                userEmail: user.email,
                date: Timestamp.fromDate(today),
                shiftType: leaveType,
                notes: leaveReason,
                createdAt: todaySchedule?.createdAt || Timestamp.now(),
            };
    
            await setDoc(scheduleDocRef, scheduleData, { merge: true });
    
            toast({ title: 'Pengajuan Terkirim', description: `Status Anda untuk hari ini telah diatur sebagai ${leaveType === 'ijin' ? 'Izin' : 'Cuti'}.` });
            setIsLeaveDialogOpen(false);
            setLeaveReason('');
        } catch (error: any) {
            console.error('Failed to submit leave request:', error);
            toast({ variant: 'destructive', title: 'Gagal Mengajukan Izin', description: 'Terjadi kesalahan saat menyimpan data. Pastikan Anda memiliki izin.' });
        } finally {
            setIsRequestingLeave(false);
        }
    };

    const handleCheckIn = async () => {
        if (!todaySchedule || !videoRef.current || !canvasRef.current || !user) return;
        
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
    
    return (
        <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Absensi Jaga</h1>
            <p className="text-muted-foreground mb-6">
                Lakukan absensi untuk jadwal Anda hari ini: {format(today, 'eeee, dd MMMM yyyy', { locale: idLocale })}
            </p>
            <Card>
                <CardHeader>
                    <CardTitle>{!todaySchedule ? 'Absensi & Pengajuan Izin' : shiftTypeLabels[todaySchedule.shiftType] || 'Jadwal Hari Ini'}</CardTitle>
                    <CardDescription>{!todaySchedule ? 'Anda tidak memiliki jadwal kerja. Anda bisa langsung mengajukan izin/cuti jika diperlukan.' : (todaySchedule.notes || 'Tidak ada catatan khusus untuk jadwal ini.')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <CheckInUI 
                        isLoading={pageIsLoading}
                        todaySchedule={todaySchedule}
                        todayAttendance={todayAttendance}
                        isCheckingIn={isCheckingIn}
                        hasCameraPermission={hasCameraPermission}
                        videoRef={videoRef}
                        canvasRef={canvasRef}
                        handleCheckIn={handleCheckIn}
                    />
                    <div className="mt-6 border-t pt-6">
                        <Dialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="w-full">
                                    <FileWarning className="mr-2 h-4 w-4" /> Tidak Bisa Hadir? (Ajukan Izin/Cuti)
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Pengajuan Izin/Cuti</DialogTitle>
                                    <DialogDescription>
                                        Pilih jenis pengajuan dan berikan alasan. Jika Anda memiliki jadwal, statusnya akan diperbarui. Jika tidak, jadwal izin/cuti baru akan dibuat untuk hari ini.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="leave-type">Jenis Pengajuan</Label>
                                        <Select value={leaveType} onValueChange={(v: 'ijin' | 'cuti') => setLeaveType(v)}>
                                            <SelectTrigger id="leave-type"><SelectValue placeholder="Pilih jenis..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ijin">Izin Sakit / Keperluan Mendesak</SelectItem>
                                                <SelectItem value="cuti">Cuti</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="leave-reason">Alasan (Wajib Diisi)</Label>
                                        <Textarea
                                            id="leave-reason"
                                            placeholder="Contoh: Sakit demam, perlu istirahat."
                                            value={leaveReason}
                                            onChange={(e) => setLeaveReason(e.target.value)}
                                            rows={4}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <DialogClose asChild><Button variant="ghost">Batal</Button></DialogClose>
                                    <Button onClick={handleLeaveRequest} disabled={isRequestingLeave || !leaveReason.trim()}>
                                        {isRequestingLeave && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Kirim Pengajuan
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
