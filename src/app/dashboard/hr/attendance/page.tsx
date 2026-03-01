'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useStorage, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, Timestamp, limit, doc, setDoc, addDoc, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Camera, Clock, MapPin, Loader2, VideoOff, AlertTriangle, Coffee, Info, FileWarning, Upload, Calendar as CalendarIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { format, set, add, sub } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import Image from 'next/image';
import type { Schedule, Attendance, UserProfile } from '@/lib/types';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { sendAttendanceNotice } from '@/ai/flows/send-attendance-notification';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';


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
  'ijin': 'Izin',
  'cuti': 'Cuti',
  'weekend-duty': 'Jaga Akhir Pekan',
  'holiday-duty': 'Jaga Hari Libur',
};

const attendanceStatusLabels: Record<string, string> = {
    'present': 'Hadir Tepat Waktu',
    'late': 'Izin Terlambat',
    'remote-progress': 'Izin Langsung Progres',
}

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
    const endTime = add(targetTime, { hours: 6 });

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
        const attendanceStatus = attendanceStatusLabels[todayAttendance.status] || 'Absen';
        return (
            <div className="space-y-6">
                <Alert variant="default" className="bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-200 [&>svg]:text-green-600">
                    <Camera className="h-4 w-4" /><AlertTitle>Anda Sudah Absen Hari Ini ({attendanceStatus})</AlertTitle>
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
                        {todayAttendance.reason && (
                             <div className="flex items-start gap-3"><Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
                                <div><p className="text-sm text-muted-foreground">Alasan</p>
                                    <p className="font-medium text-sm whitespace-pre-wrap">{todayAttendance.reason}</p>
                                </div>
                            </div>
                        )}
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
           {!hasCameraPermission && isWithinCheckInWindow && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Izin Kamera Diperlukan</AlertTitle>
                    <AlertDescription>
                        Anda harus mengizinkan akses kamera untuk melakukan absensi. Silakan periksa pengaturan browser atau perangkat Anda.
                    </AlertDescription>
                </Alert>
            )}
           <Button onClick={handleCheckIn} disabled={isCheckingIn || !hasCameraPermission || !isWithinCheckInWindow} className="w-full" size="lg">
               {isCheckingIn ? <Loader2 className="animate-spin" /> : <Camera className="mr-2" />}
               {isCheckingIn ? 'Memproses...' : 'Ambil Foto & Check In Sekarang'}
           </Button>
        </div>
    );
}

// --- Dialog Component for Leave/Late/Remote ---
function LeaveRequestDialog({ todaySchedule, today, onFinished, userProfile, canListUsers, allUsers }: { todaySchedule: Schedule | null; today: Date; onFinished: () => void; userProfile: UserProfile | null; canListUsers: boolean; allUsers: UserProfile[] }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const storage = useStorage();
    const { toast } = useToast();
    const router = useRouter();
    
    const [leaveType, setLeaveType] = useState<'sick-leave' | 'cuti' | 'late' | 'remote-progress' | 'tukar-jaga'>('sick-leave');
    const [reason, setReason] = useState('');
    const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [swapTargetUserId, setSwapTargetUserId] = useState('');
    const [manualSwapName, setManualSwapName] = useState('');
    const [swapDate, setSwapDate] = useState<Date | undefined>(today);


    const otherTeknisi = useMemo(() => {
        if (!allUsers || !user) return [];
        return allUsers.filter(u => u.role === 'teknisi' && u.registrationStatus === 'approved' && u.id !== user.uid);
    }, [allUsers, user]);

    // Camera State
    const dialogVideoRef = useRef<HTMLVideoElement>(null);
    const dialogCanvasRef = useRef<HTMLCanvasElement>(null);
    const [dialogStream, setDialogStream] = useState<MediaStream | null>(null);
    const [dialogHasCamera, setDialogHasCamera] = useState(false);
    const [selfie, setSelfie] = useState<string | null>(null);

    const needsCamera = leaveType === 'late' || leaveType === 'remote-progress';

    useEffect(() => {
        async function setupCamera() {
            if (needsCamera) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    setDialogStream(stream);
                    if (dialogVideoRef.current) {
                        dialogVideoRef.current.srcObject = stream;
                    }
                    setDialogHasCamera(true);
                } catch {
                    setDialogHasCamera(false);
                    toast({ variant: 'destructive', title: 'Kamera Gagal', description: 'Gagal mengakses kamera. Mohon izinkan akses kamera di browser Anda.' });
                }
            }
        }

        setupCamera();

        return () => {
            dialogStream?.getTracks().forEach(track => track.stop());
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [leaveType]);

    const handleTakePhoto = () => {
        if (!dialogVideoRef.current || !dialogCanvasRef.current) return;
        const video = dialogVideoRef.current;
        const canvas = dialogCanvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        setSelfie(canvas.toDataURL('image/jpeg'));
    };

    const handleSubmit = async () => {
        if (!user || !user.email || !userProfile) return;
        setIsSubmitting(true);
        
        try {
            if (leaveType === 'tukar-jaga') {
                const isManualInput = !canListUsers;
                if (!reason.trim() || !swapDate || (isManualInput && !manualSwapName.trim()) || (!isManualInput && !swapTargetUserId)) {
                    toast({ variant: 'destructive', title: 'Data Tidak Lengkap', description: 'Mohon pilih tanggal, isi nama/pilih teknisi pengganti, dan isi alasan.' });
                    setIsSubmitting(false);
                    return;
                }
                
                let targetUser: UserProfile | undefined;
                if (!isManualInput) {
                    targetUser = allUsers.find(u => u.id === swapTargetUserId);
                    if (!targetUser) {
                        toast({ variant: 'destructive', title: 'User Tidak Ditemukan' });
                        setIsSubmitting(false);
                        return;
                    }
                }
        
                const scheduleId = `${user.uid}_${format(swapDate, 'yyyy-MM-dd')}`;
                const scheduleDocRef = doc(firestore, "schedules", scheduleId);
                const scheduleData = {
                    id: scheduleId,
                    userId: user.uid, userEmail: user.email,
                    date: Timestamp.fromDate(swapDate),
                    shiftType: 'tukar-jaga',
                    notes: reason,
                    swapTargetUserId: targetUser?.id || '',
                    swapTargetUserName: targetUser?.displayName || manualSwapName.trim(),
                    createdAt: todaySchedule?.createdAt || Timestamp.now(),
                };
                await setDoc(scheduleDocRef, scheduleData, { merge: true });

                const swapTargetName = targetUser?.displayName || manualSwapName.trim();
                const notificationReason = `Ingin tukar jadwal tanggal ${format(swapDate, 'dd MMM yyyy', {locale: idLocale})} dengan: ${swapTargetName}.\nAlasan: ${reason}`;
                
                sendAttendanceNotice({
                    userName: userProfile.displayName || user.email,
                    status: 'Request Tukar Jaga',
                    reason: notificationReason,
                }).catch(err => console.error("Telegram notification failed:", err));

                toast({ title: 'Pengajuan Terkirim', description: 'Permintaan tukar jaga Anda telah dikirim untuk persetujuan atasan.' });
                onFinished();

            } else if (leaveType === 'sick-leave' || leaveType === 'cuti') {
                if (!reason.trim() || !evidenceFile) {
                    toast({ variant: 'destructive', title: 'Data Tidak Lengkap', description: 'Mohon isi alasan dan unggah foto bukti.' });
                    setIsSubmitting(false);
                    return;
                }
                const filePath = `hr_evidence/${user.uid}/${Date.now()}-${evidenceFile.name}`;
                const storageRef = ref(storage, filePath);
                await uploadBytes(storageRef, evidenceFile);
                const evidenceUrl = await getDownloadURL(storageRef);
                
                const scheduleId = `${user.uid}_${format(today, 'yyyy-MM-dd')}`;
                const scheduleDocRef = doc(firestore, "schedules", scheduleId);
                const scheduleData = {
                    id: scheduleId,
                    userId: user.uid, userEmail: user.email,
                    date: Timestamp.fromDate(today),
                    shiftType: leaveType === 'sick-leave' ? 'ijin' : 'cuti',
                    notes: reason, evidenceUrl,
                    createdAt: todaySchedule?.createdAt || Timestamp.now(),
                };
                await setDoc(scheduleDocRef, scheduleData, { merge: true });

                sendAttendanceNotice({
                    userName: userProfile.displayName || user.email,
                    status: leaveType === 'sick-leave' ? 'Izin Sakit/Mendesak' : 'Cuti',
                    reason: reason,
                    photoUrl: evidenceUrl,
                }).catch(err => console.error("Telegram notification failed:", err));

                toast({ title: 'Pengajuan Terkirim', description: 'Status jadwal Anda telah diperbarui.' });
                onFinished();

            } else if (leaveType === 'late' || leaveType === 'remote-progress') {
                if (!reason.trim() || !selfie) {
                    toast({ variant: 'destructive', title: 'Data Tidak Lengkap', description: 'Mohon isi alasan dan ambil swafoto.' });
                    setIsSubmitting(false);
                    return;
                }

                let coordinates = 'N/A';
                if (leaveType === 'remote-progress') {
                    const position = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true }));
                    coordinates = `${position.coords.latitude}, ${position.coords.longitude}`;
                }
                
                // Convert data URL to blob and upload
                const res = await fetch(selfie);
                const blob = await res.blob();
                const filePath = `hr_attendance/${user.uid}/${Date.now()}-izin.jpg`;
                const storageRef = ref(storage, filePath);
                await uploadBytes(storageRef, blob);
                const photoUrl = await getDownloadURL(storageRef);

                const attendanceData = {
                    userId: user.uid,
                    scheduleId: todaySchedule?.id || `${user.uid}_${format(today, 'yyyy-MM-dd')}`,
                    checkInTime: Timestamp.now(),
                    checkInPhotoUrl: photoUrl,
                    checkInCoordinates: coordinates,
                    status: leaveType === 'late' ? 'late' : 'remote-progress',
                    reason: reason,
                };
                await addDoc(collection(firestore, 'attendances'), attendanceData);

                sendAttendanceNotice({
                    userName: userProfile.displayName || user.email,
                    status: leaveType === 'late' ? 'Izin Terlambat' : 'Izin Langsung Progres',
                    reason: reason,
                    photoUrl: photoUrl,
                    coordinates: coordinates,
                }).catch(err => console.error("Telegram notification failed:", err));

                router.push('/dashboard/hr/attendance/goodbye');
            }
        } catch (error: any) {
            console.error("Failed to submit leave request:", error);
            toast({ variant: 'destructive', title: 'Gagal Mengajukan', description: error.message || 'Terjadi kesalahan.' });
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <DialogContent className="max-w-md">
            <DialogHeader>
                <DialogTitle>Pengajuan Izin / Lapor Keterlambatan</DialogTitle>
                <DialogDescription>
                    Pilih jenis pengajuan Anda dan lengkapi data yang diperlukan.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                    <Label htmlFor="leave-type">Jenis Pengajuan</Label>
                    <Select value={leaveType} onValueChange={(v: any) => { setLeaveType(v); setSelfie(null); }}>
                        <SelectTrigger id="leave-type"><SelectValue placeholder="Pilih jenis..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="sick-leave">Izin Sakit / Keperluan Mendesak</SelectItem>
                            <SelectItem value="cuti">Cuti</SelectItem>
                            <SelectItem value="tukar-jaga">Request Tukar Jaga</SelectItem>
                            <SelectItem value="late">Izin Datang Terlambat</SelectItem>
                            <SelectItem value="remote-progress">Izin Langsung Progres</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {leaveType === 'tukar-jaga' && (
                    <>
                        <div className="grid gap-2">
                            <Label htmlFor="swap-date">Tanggal Tukar Jaga</Label>
                             <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant={'outline'} className={cn('w-full justify-start text-left font-normal', !swapDate && 'text-muted-foreground')}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {swapDate ? format(swapDate, 'dd MMMM yyyy', { locale: idLocale }) : <span>Pilih tanggal</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={swapDate}
                                        onSelect={setSwapDate}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="swap-target">Tukar Dengan</Label>
                            {canListUsers ? (
                                <Select value={swapTargetUserId} onValueChange={setSwapTargetUserId}>
                                    <SelectTrigger id="swap-target"><SelectValue placeholder="Pilih teknisi pengganti..." /></SelectTrigger>
                                    <SelectContent>
                                        {otherTeknisi.map(t => (
                                            <SelectItem key={t.id} value={t.id}>{t.displayName}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <Input 
                                    id="swap-target-manual"
                                    placeholder="Ketik nama teknisi pengganti..."
                                    value={manualSwapName}
                                    onChange={(e) => setManualSwapName(e.target.value)}
                                />
                            )}
                        </div>
                    </>
                )}

                <div className="grid gap-2">
                    <Label htmlFor="reason">Alasan (Wajib Diisi)</Label>
                    <Textarea id="reason" placeholder="Jelaskan alasan Anda..." value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
                </div>
                
                {(leaveType === 'sick-leave' || leaveType === 'cuti') && (
                    <div className="grid gap-2">
                         <Label htmlFor="evidence">Foto Bukti (Surat Dokter, dll)</Label>
                         <Input id="evidence" type="file" accept="image/*" onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)} />
                    </div>
                )}
                
                {needsCamera && (
                    <div className="grid gap-2">
                        <Label>Swafoto (Selfie)</Label>
                        <div className="relative aspect-video w-full bg-muted rounded-md overflow-hidden flex items-center justify-center">
                            {selfie ? (
                                <Image src={selfie} alt="Selfie Preview" fill className="object-cover"/>
                            ) : (
                                <>
                                    <video ref={dialogVideoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                                    {!dialogHasCamera && <VideoOff className="h-10 w-10 text-muted-foreground absolute" />}
                                </>
                            )}
                            <canvas ref={dialogCanvasRef} className="hidden"></canvas>
                        </div>
                        {!dialogHasCamera && (
                            <Alert variant="destructive" className="mt-2">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Kamera Tidak Tersedia</AlertTitle>
                                <AlertDescription>Mohon izinkan akses kamera untuk melanjutkan.</AlertDescription>
                            </Alert>
                        )}
                        <Button type="button" onClick={selfie ? () => setSelfie(null) : handleTakePhoto} variant="secondary" disabled={!dialogHasCamera}>
                            {selfie ? 'Ambil Ulang' : 'Ambil Foto'}
                        </Button>
                    </div>
                )}
            </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="ghost">Batal</Button></DialogClose>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Kirim Pengajuan
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}

// --- Main Page Component ---
export default function AttendancePage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const storage = useStorage();
    const { toast } = useToast();
    const router = useRouter();

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

    // --- Data Fetching ---
    const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

    const canListUsers = useMemo(() => userProfile?.role === 'admin' || userProfile?.role === 'korlap', [userProfile]);

    const usersQuery = useMemoFirebase(() => {
        if (!canListUsers) return null;
        return query(collection(firestore, 'users'), orderBy('displayName'));
    }, [firestore, canListUsers]);

    const { data: allUsers, isLoading: areUsersLoading } = useCollection<UserProfile>(usersQuery);

    const today = useMemo(() => getStartOfDay(), []);
    
    const scheduleQuery = useMemoFirebase(() => {
        if (!user) return null;
        const startOfToday = today;
        return query(
            collection(firestore, 'schedules'),
            where('userId', '==', user.uid),
            where('date', '==', Timestamp.fromDate(startOfToday))
        );
    }, [user, firestore, today]);

    const { data: schedules, isLoading: isScheduleLoading } = useCollection<Schedule>(scheduleQuery);
    
    const attendanceQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(
            collection(firestore, 'attendances'),
            where('userId', '==', user.uid)
        );
    }, [user, firestore]);
    
    const { data: allUserAttendances, isLoading: isAttendanceLoading } = useCollection<Attendance>(attendanceQuery);

    const clientSideTodayAttendance = useMemo(() => {
        if (!allUserAttendances) return null;
        const startOfToday = today;
        const endOfToday = add(startOfToday, { days: 1 });
        return allUserAttendances.find(att => {
            if (!att.checkInTime?.toDate) return false;
            const checkIn = att.checkInTime.toDate();
            return checkIn >= startOfToday && checkIn < endOfToday;
        }) || null;
    }, [allUserAttendances, today]);
    
    useEffect(() => {
        if (isUserLoading || isProfileLoading || isScheduleLoading || isAttendanceLoading || (canListUsers && areUsersLoading)) {
            setIsLoading(true);
            return;
        }

        setTodaySchedule(schedules?.[0] || null);
        setTodayAttendance(clientSideTodayAttendance);

        setIsLoading(false);
    }, [
        schedules, clientSideTodayAttendance, isUserLoading, isProfileLoading, 
        isScheduleLoading, isAttendanceLoading, canListUsers, areUsersLoading
    ]);
    
    // --- Camera Logic for Main Check-in ---
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
                    console.error("Camera access error:", error);
                    setHasCameraPermission(false);
                    toast({
                        variant: 'destructive',
                        title: 'Izin Kamera Ditolak',
                        description: 'Aplikasi memerlukan izin untuk menggunakan kamera Anda. Mohon aktifkan izin kamera di pengaturan browser atau perangkat Anda.',
                        duration: 9000,
                    });
                }
            }
        }
        setupCamera();
            
        return () => {
            stream?.getTracks().forEach(track => track.stop());
        };
    }, [todaySchedule, todayAttendance, toast]);
    

    const handleCheckIn = async () => {
        if (!todaySchedule || !videoRef.current || !canvasRef.current || !user || !userProfile) return;
        
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
            
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
            if (!blob) throw new Error('Gagal membuat file gambar dari canvas.');

            const filePath = `hr_attendance/${user.uid}/${Date.now()}.jpg`;
            const storageRef = ref(storage, filePath);
            await uploadBytes(storageRef, blob);
            const photoUrl = await getDownloadURL(storageRef);

            const newAttendance: Omit<Attendance, 'id'> = {
                userId: user.uid,
                scheduleId: todaySchedule.id,
                checkInTime: Timestamp.now(),
                checkInPhotoUrl: photoUrl,
                checkInCoordinates: coordinates,
                status: 'present',
            };
            
            await addDoc(collection(firestore, 'attendances'), newAttendance);

            sendAttendanceNotice({
                userName: userProfile.displayName || user.email!,
                status: 'Hadir Tepat Waktu',
                photoUrl: photoUrl,
                coordinates: coordinates,
            }).catch(err => console.error("Telegram notification failed:", err));

            router.push('/dashboard/hr/attendance/goodbye');

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
                        <Dialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen} modal={false}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="w-full">
                                    <FileWarning className="mr-2 h-4 w-4" /> Tidak Bisa Hadir / Terlambat?
                                </Button>
                            </DialogTrigger>
                            <LeaveRequestDialog 
                                todaySchedule={todaySchedule}
                                today={today}
                                onFinished={() => setIsLeaveDialogOpen(false)}
                                userProfile={userProfile}
                                canListUsers={canListUsers}
                                allUsers={allUsers || []}
                            />
                        </Dialog>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
