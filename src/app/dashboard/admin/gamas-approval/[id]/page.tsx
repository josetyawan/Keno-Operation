
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { format, isValid } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, CheckCircle, ShieldX, Check, X, FileWarning, Loader2, Download } from 'lucide-react';
import type { GamasReport, UserProfile, DesignatorEvidence } from '@/lib/types';
import { useMemo, useState } from 'react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { sendGamasReportNotice } from '@/ai/flows/send-gamas-report-notice';
import { sendGamasDesignatorNotice } from '@/ai/flows/send-gamas-designator-notice';

const safeToDate = (timestamp: any): Date | null => {
  if (!timestamp) return null;
  if (timestamp.toDate) return timestamp.toDate();
  if (timestamp instanceof Date && isValid(timestamp)) return timestamp;
  const d = new Date(timestamp);
  return isValid(d) ? d : null;
};

const getStatusVariant = (status: DesignatorEvidence['status']): "default" | "destructive" | "secondary" | "outline" => {
    switch (status) {
        case 'approved': return 'default';
        case 'rejected': return 'destructive';
        case 'pending':
        default: return 'secondary';
    }
};

interface PhotoViewerProps {
  url?: string | null;
  label: string;
}

function PhotoViewer({ url, label }: PhotoViewerProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  if (!url) {
    return (
      <div className="aspect-square w-full rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground">
        Tidak Ada Foto
      </div>
    );
  }

  return (
    <>
      <button onClick={() => setIsZoomed(true)} className="relative aspect-square w-full rounded-md overflow-hidden border cursor-zoom-in group">
        <Image src={url} alt={label} fill className="object-cover transition-transform group-hover:scale-105" />
      </button>
      {isZoomed && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex justify-center items-center p-4 cursor-zoom-out"
          onClick={() => setIsZoomed(false)}
        >
          <Image src={url} alt={label} width={1200} height={800} className="object-contain w-auto h-auto max-w-full max-h-[90vh]" />
        </div>
      )}
    </>
  );
}

export default function GamasApprovalDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const reportRef = useMemoFirebase(() => doc(firestore, 'gamas-reports', id), [firestore, id]);
  const { data: report, isLoading } = useDoc<GamasReport>(reportRef);

  const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  const [designatorToReject, setDesignatorToReject] = useState<DesignatorEvidence | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isActionLoading, setIsActionLoading] = useState<string | boolean>(false);
  const [isTicketRejectDialogOpen, setIsTicketRejectDialogOpen] = useState(false);
  const [ticketRejectionReason, setTicketRejectionReason] = useState('');


  const canApprove = useMemo(() => {
    if (!userProfile) return false;
    return userProfile.role === 'admin' || userProfile.role === 'korlap';
  }, [userProfile]);

  const canApproveTicket = useMemo(() => {
    return report?.evidences.every(e => e.status === 'approved') ?? false;
  }, [report]);

  const handleUpdateDesignatorStatus = async (designatorCode: string, newStatus: 'approved' | 'rejected', reason?: string) => {
    if (!report || !canApprove) return;
    setIsActionLoading(designatorCode);

    const newEvidences = report.evidences.map(ev => {
      if (ev.designator === designatorCode) {
        return { ...ev, status: newStatus, rejectionReason: reason || '' };
      }
      return ev;
    });

    try {
      await updateDoc(reportRef, { evidences: newEvidences });
      toast({ title: `Designator ${designatorCode} ${newStatus === 'approved' ? 'Disetujui' : 'Ditolak'}` });
      
      if (newStatus === 'rejected' && reason) {
        try {
            await sendGamasDesignatorNotice({
              userName: report.userName,
              noTiket: report.noTiket,
              designator: designatorCode,
              rejectionReason: reason,
            });
        } catch (err: any) {
             toast({
                variant: 'destructive',
                title: 'Gagal Mengirim Notifikasi',
                description: `Status berhasil diubah, tetapi notifikasi ke Telegram gagal dikirim. Error: ${err.message}`
              });
        }
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Gagal Memperbarui', description: e.message });
    } finally {
      setIsActionLoading(false);
      setDesignatorToReject(null);
      setRejectionReason('');
    }
  };
  
  const handleApproveTicket = async () => {
    if (!report || !canApproveTicket) return;
    setIsActionLoading(true);
    try {
        await updateDoc(reportRef, { status: 'approved' });
        
        try {
            await sendGamasReportNotice({
                userName: report.userName,
                noTiket: report.noTiket,
                status: 'Disetujui',
            });
        } catch (err: any) {
            console.error("Telegram notification for approval failed:", err);
            // Non-blocking error, just log and maybe show a silent toast
             toast({
                variant: 'destructive',
                title: 'Notifikasi Gagal Terkirim',
                description: `Laporan berhasil disetujui, tapi notifikasi ke Telegram gagal. Error: ${err.message}`
            });
        }

        toast({ title: 'Laporan Disetujui', description: 'Keseluruhan laporan telah ditandai sebagai disetujui.' });
        router.push('/dashboard/admin/gamas-approval');
    } catch (e: any) {
         toast({ variant: 'destructive', title: 'Gagal Menyetujui Laporan', description: e.message });
    } finally {
        setIsActionLoading(false);
    }
  };

  const handleRejectTicket = async () => {
    if (!report || !ticketRejectionReason.trim()) {
        toast({ variant: 'destructive', title: 'Alasan Diperlukan', description: 'Mohon isi alasan penolakan tiket.' });
        return;
    }
    setIsActionLoading(true);
    const reason = ticketRejectionReason.trim();
    try {
        await updateDoc(reportRef, { status: 'rejected', rejectionReason: reason });
        
        try {
            await sendGamasReportNotice({
                userName: report.userName,
                noTiket: report.noTiket,
                status: 'Ditolak',
                rejectionReason: reason,
            });
        } catch(err: any) {
            console.error("Telegram notification for rejection failed:", err);
             toast({
                variant: 'destructive',
                title: 'Notifikasi Gagal Terkirim',
                description: `Laporan berhasil ditolak, tapi notifikasi ke Telegram gagal. Error: ${err.message}`
            });
        }

        toast({ title: 'Laporan Ditolak', description: 'Keseluruhan laporan telah ditandai sebagai ditolak.' });
        router.push('/dashboard/admin/gamas-approval');
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Gagal Menolak Laporan', description: e.message });
    } finally {
        setIsActionLoading(false);
        setIsTicketRejectDialogOpen(false);
        setTicketRejectionReason('');
    }
  };

  const handleDownloadAll = () => {
    if (!report?.evidences) return;

    const downloadWithAnchor = (url: string, filename: string) => {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    let photoIndex = 0;
    report.evidences.forEach(evidence => {
        (evidence.photoUrls || []).forEach(url => {
            if (url) {
                const filename = `${report.noTiket}_${evidence.designator}_${photoIndex + 1}.jpeg`;
                // Use a timeout to prevent browser from blocking multiple downloads
                setTimeout(() => {
                    downloadWithAnchor(url, filename);
                }, photoIndex * 300);
                photoIndex++;
            }
        });
    });
  };

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-96 w-full" /></div>;
  }

  if (!report || !canApprove) {
    return (
      <div className="text-center py-10">
        <h2 className="text-xl font-semibold">Laporan Tidak Ditemukan</h2>
        <p className="text-muted-foreground mt-2">Laporan yang Anda cari tidak ada atau Anda tidak memiliki izin untuk melihatnya.</p>
        <Button onClick={() => router.back()} className="mt-4"><ArrowLeft className="mr-2" /> Kembali</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-4xl flex-1 auto-rows-max gap-6">
      <div className="flex items-center gap-4">
        <Button onClick={() => router.push('/dashboard/admin/gamas-approval')} variant="outline" size="icon" className="h-8 w-8">
          <ArrowLeft className="h-5 w-5" /><span className="sr-only">Kembali</span>
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Tinjau Laporan Gamas: {report.noTiket}</h1>
          <p className="text-muted-foreground text-sm">Oleh: {report.userName}</p>
        </div>
         <div className="ml-auto flex items-center gap-2">
            <Button onClick={handleDownloadAll} variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Download Foto
            </Button>
            <Button variant="destructive" onClick={() => setIsTicketRejectDialogOpen(true)} disabled={!!isActionLoading}>
                <ShieldX className="mr-2"/> Tolak Tiket
            </Button>
            <Button onClick={handleApproveTicket} disabled={!canApproveTicket || !!isActionLoading}>
                {isActionLoading === true ? <Loader2 className="animate-spin" /> : <CheckCircle className="mr-2"/>}
                Approve Tiket
            </Button>
        </div>
      </div>
      
      {report.evidences.map((evidence, index) => (
        <Card key={index}>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                    <CardTitle>{evidence.designator}</CardTitle>
                    {evidence.notes && <CardDescription>{evidence.notes}</CardDescription>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant={getStatusVariant(evidence.status)}>{evidence.status}</Badge>
                    {evidence.status !== 'approved' && (
                        <Button size="sm" onClick={() => handleUpdateDesignatorStatus(evidence.designator, 'approved')} disabled={isActionLoading === evidence.designator}>
                            {isActionLoading === evidence.designator ? <Loader2 className="animate-spin" /> : <Check />}
                        </Button>
                    )}
                    {evidence.status !== 'rejected' && (
                        <Button size="sm" variant="destructive" onClick={() => setDesignatorToReject(evidence)} disabled={isActionLoading === evidence.designator}>
                            {isActionLoading === evidence.designator ? <Loader2 className="animate-spin" /> : <X />}
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {evidence.status === 'rejected' && evidence.rejectionReason && (
                    <div className="mb-4 text-sm p-3 bg-destructive/10 text-destructive rounded-md border border-destructive/20">
                        <p className="font-semibold">Alasan Penolakan:</p>
                        <p>{evidence.rejectionReason}</p>
                    </div>
                )}
                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {evidence.photoUrls.map((url, photoIndex) => (
                        <PhotoViewer key={photoIndex} url={url} label={`Eviden ${evidence.designator} ${photoIndex + 1}`} />
                    ))}
                </div>
            </CardContent>
        </Card>
      ))}

      <AlertDialog open={!!designatorToReject} onOpenChange={(open) => !open && setDesignatorToReject(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Tolak Eviden: {designatorToReject?.designator}</AlertDialogTitle>
                <AlertDialogDescription>Berikan alasan mengapa eviden ini ditolak.</AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
                <Label htmlFor="rejection-reason" className="sr-only">Alasan Penolakan</Label>
                <Textarea
                    id="rejection-reason"
                    placeholder="Contoh: Foto eviden tidak lengkap atau tidak jelas..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                />
            </div>
            <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleUpdateDesignatorStatus(designatorToReject!.designator, 'rejected', rejectionReason)} disabled={!rejectionReason.trim()}>
                    Konfirmasi Penolakan
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isTicketRejectDialogOpen} onOpenChange={setIsTicketRejectDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Tolak Seluruh Tiket: {report.noTiket}?</AlertDialogTitle>
                <AlertDialogDescription>Berikan alasan mengapa seluruh laporan tiket ini ditolak. Notifikasi akan dikirimkan.</AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
                <Label htmlFor="ticket-rejection-reason" className="sr-only">Alasan Penolakan</Label>
                <Textarea
                    id="ticket-rejection-reason"
                    placeholder="Contoh: Laporan tidak sesuai standar, bukti tidak lengkap..."
                    value={ticketRejectionReason}
                    onChange={(e) => setTicketRejectionReason(e.target.value)}
                />
            </div>
            <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction onClick={handleRejectTicket} disabled={!ticketRejectionReason.trim() || isActionLoading === true}>
                    {isActionLoading === true && <Loader2 className="mr-2 animate-spin" />}
                    Konfirmasi Penolakan
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
