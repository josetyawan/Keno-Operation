
'use client';

import { notFound, useRouter, useParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { format, isValid } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Badge, badgeVariants } from '@/components/ui/badge';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, Edit, Trash, X, ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import type { Nota, UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { useState } from 'react';
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
import { SummarizeButton } from './summarize-button';
import { Calendar } from '@/components/ui/calendar';
import type { VariantProps } from 'class-variance-authority';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { sendRejectionNotice } from '@/ai/flows/send-rejection-notice';

const safeToDate = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (timestamp.toDate) return timestamp.toDate();
    if (timestamp instanceof Date && isValid(timestamp)) return timestamp;
    const d = new Date(timestamp);
    return isValid(d) ? d : null;
};


const getStatusVariant = (status: Nota['status']): VariantProps<typeof badgeVariants>['variant'] => {
    switch (status) {
        case 'verified':
        case 'verified-tif':
            return 'outline';
        case 'rejected':
            return 'destructive';
        case 'paid':
            return 'default';
        case 'pending':
        default:
            return 'secondary';
    }
};

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  verified: 'Verified',
  'verified-tif': 'Verified (TIF)',
  rejected: 'Rejected',
  paid: 'Paid',
};


export default function NotaDetailPage() {
  const params = useParams();
  const id = params.id as string;
  
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<string | null>(null);
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);
  
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);
  const [verificationDate, setVerificationDate] = useState<Date | undefined>(new Date());

  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);
  const isAdmin = userProfile?.role === 'admin';

  const notaRef = useMemoFirebase(() => {
    return doc(firestore, 'notas', id);
  }, [firestore, id]);

  const { data: nota, isLoading, error } = useDoc<Nota>(notaRef);
  const isOwner = user?.uid === nota?.userId;

  const handleConfirmVerify = async () => {
    if (!isAdmin || !notaRef || !verificationDate) return;
    
    const isBbmGenset = nota?.segmen === 'BBM Genset';
    const newStatus = isBbmGenset ? 'verified-tif' : 'verified';
    const descriptionText = isBbmGenset 
        ? 'Status laporan telah diperbarui menjadi "verified-tif" untuk pengajuan ke TIF.'
        : 'Status laporan telah diperbarui menjadi "verified".';

    try {
        await updateDoc(notaRef, { 
            status: newStatus,
            tanggalVerifikasi: verificationDate
        });
        toast({
          title: 'Laporan Diverifikasi',
          description: descriptionText,
        });
    } catch(e) {
        toast({ variant: 'destructive', title: 'Gagal Memverifikasi' });
    }
    setIsVerifyDialogOpen(false);
  };
  
  const handleConfirmReject = async () => {
    if (!isAdmin || !notaRef || !rejectionReason.trim()) {
        toast({
            variant: 'destructive',
            title: 'Alasan Diperlukan',
            description: 'Silakan isi alasan penolakan.',
        });
        return;
    }
    
    const notaDate = safeToDate(nota?.tanggal);
    if (!nota || !notaDate) {
      toast({
        variant: "destructive",
        title: "Data Laporan Tidak Lengkap",
        description: "Tidak dapat mengirim notifikasi karena data tanggal tidak valid.",
      });
      return;
    }

    const reason = rejectionReason.trim();
    try {
        await updateDoc(notaRef, {
            status: 'rejected',
            rejectionReason: reason,
            tanggalVerifikasi: null, // Clear verification date on rejection
        });
        toast({
          title: 'Laporan Ditolak',
          description: 'Status laporan telah diperbarui menjadi "rejected".',
        });

        // Send Telegram Notification
        sendRejectionNotice({
          picName: nota.namaPic,
          notaDate: format(notaDate, 'dd MMM yyyy', { locale: idLocale }),
          segment: nota.segmen,
          reason: reason,
        }).catch(err => {
            console.error("Failed to send rejection notification:", err);
            toast({
                variant: 'destructive',
                title: 'Notifikasi Gagal Terkirim',
                description: 'Gagal mengirim notifikasi penolakan ke Telegram.',
            });
        });
    } catch(e) {
        toast({ variant: 'destructive', title: 'Gagal Menolak' });
    }

    setIsRejectDialogOpen(false);
    setRejectionReason('');
  }

  const handleDelete = async () => {
    if (!notaRef) return;
    if (!isOwner && !isAdmin) {
      toast({
        variant: 'destructive',
        title: 'Unauthorized',
        description: "You don't have permission to delete this report.",
      });
      return;
    }
    
    setIsDeleting(true);
    try {
        await deleteDoc(notaRef);
        toast({
          title: 'Laporan Dihapus',
          description: 'Laporan ini telah berhasil dihapus.',
        });
        router.push('/dashboard');
    } catch(e) {
        toast({ variant: 'destructive', title: 'Gagal Menghapus' });
    }
    
    setIsDeleting(false);
    setIsDeleteDialogOpen(false);
  };

  const handleDeletePhoto = async () => {
    if (!photoToDelete || !notaRef || !nota) return;
    if (!isOwner && !isAdmin) {
      toast({
        variant: 'destructive',
        title: 'Unauthorized',
        description: "You don't have permission to modify this report.",
      });
      setPhotoToDelete(null);
      return;
    }

    const newUrls = nota.fotoEvidenUrls?.filter(url => url !== photoToDelete) || [];
    
    try {
        await updateDoc(notaRef, { fotoEvidenUrls: newUrls });
        toast({
          title: 'Photo Removed',
          description: 'The evidence photo has been removed from this report.',
        });
    } catch(e) {
        toast({ variant: 'destructive', title: 'Gagal Menghapus Foto' });
    }

    setPhotoToDelete(null); // Close the dialog
  };


  if (isLoading) {
      return (
         <div className="mx-auto grid max-w-4xl flex-1 auto-rows-max gap-6">
             <div className="flex items-center gap-4">
                <Skeleton className="h-7 w-7 rounded-md" />
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-6 w-16 ml-auto rounded-full" />
             </div>
             <Skeleton className="h-96 w-full" />
         </div>
      )
  }

  if (error || !nota) {
    notFound();
  }

  const tanggalLaporan = safeToDate(nota.tanggal) || new Date();
  const tanggalVerifikasi = safeToDate(nota.tanggalVerifikasi);
  const tanggalPembayaran = safeToDate(nota.tanggalPembayaran);
  const isBbmGenset = nota.segmen === 'BBM Genset';
  
  const notaContentForSummary = `
  Tanggal: ${format(tanggalLaporan, 'dd MMMM yyyy')}
  Service Area: ${nota.serviceArea}
  Segmen: ${nota.segmen}
  PIC: ${nota.namaPic}
  Nominal: Rp ${nota.nominal.toLocaleString('id-ID')}
  ${nota.noPlatKendaraan ? `No. Plat: ${nota.noPlatKendaraan}` : ''}
  ${(nota.kmAwal && nota.kmAkhir) ? `KM: ${nota.kmAwal} - ${nota.kmAkhir}` : ''}
  ${nota.namaBarang ? `Barang/Jasa: ${nota.namaBarang}` : ''}
  Keterangan: ${nota.keterangan || '-'}
  Status: ${nota.status}
  `.trim();

  return (
    <>
      <div className="mx-auto grid max-w-4xl flex-1 auto-rows-max gap-6">
        <div className="flex items-center gap-4">
          <Button onClick={() => router.back()} variant="outline" size="icon" className="h-7 w-7">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
          <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0 font-headline truncate">
            Detail Laporan
          </h1>
          <Badge 
            variant={getStatusVariant(nota.status)}
            className="ml-auto sm:ml-0 capitalize"
          >
            {statusLabels[nota.status] || nota.status}
          </Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Laporan Segmen: {nota.segmen}</CardTitle>
              <CardDescription>
                Oleh {nota.userEmail} di <strong>{nota.serviceArea}</strong> pada {format(tanggalLaporan, 'PPPPp')}
                {nota.status === 'verified' && tanggalVerifikasi && (
                      ` | Diverifikasi pada: ${format(tanggalVerifikasi, 'dd MMM yyyy')}`
                  )}
                 {(nota.status === 'verified-tif' && tanggalVerifikasi) && (
                      ` | Diajukan ke TIF pada: ${format(tanggalVerifikasi, 'dd MMM yyyy')}`
                  )}
                {nota.status === 'paid' && tanggalPembayaran && (
                        ` | Dibayar pada: ${format(tanggalPembayaran, 'dd MMMM yyyy')}`
                    )}
              </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
             {nota.status === 'rejected' && nota.rejectionReason && (
                <Alert variant="destructive">
                  <ShieldX className="h-4 w-4" />
                  <AlertTitle>Laporan Ditolak</AlertTitle>
                  <AlertDescription>{nota.rejectionReason}</AlertDescription>
                </Alert>
              )}
            <div className="grid grid-cols-2 gap-x-4 gap-y-6 text-sm">
              <div>
                <p className="text-muted-foreground">Nama PIC</p>
                <p className="font-medium">{nota.namaPic}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Nominal</p>
                <p className="font-medium">Rp {nota.nominal.toLocaleString('id-ID')}</p>
              </div>
              {nota.noPlatKendaraan && (
                  <div>
                    <p className="text-muted-foreground">No Plat Kendaraan</p>
                    <p className="font-medium">{nota.noPlatKendaraan}</p>
                  </div>
              )}
              {(nota.kmAwal !== undefined && nota.kmAkhir !== undefined && nota.kmAwal > 0) && (
                  <div>
                      <p className="text-muted-foreground">KM Awal / Akhir</p>
                      <p className="font-medium">{nota.kmAwal} / {nota.kmAkhir}</p>
                  </div>
              )}
              {nota.namaBarang && (
                  <div className="col-span-2">
                      <p className="text-muted-foreground">{nota.segmen === 'jasa' ? 'Nama Jasa' : 'Nama Barang'}</p>
                      <p className="font-medium">{nota.namaBarang}</p>
                  </div>
              )}
            </div>
            {nota.keterangan && (
              <div>
                  <p className="text-muted-foreground text-sm">Keterangan</p>
                  <div className="text-foreground whitespace-pre-wrap text-sm border p-3 rounded-md bg-muted/50">
                      {nota.keterangan}
                  </div>
              </div>
            )}

            {(nota.fotoEvidenUrls && nota.fotoEvidenUrls.length > 0) && (
              <div>
                  <p className="text-muted-foreground text-sm mb-2">Foto Bukti</p>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {nota.fotoEvidenUrls.filter((url): url is string => !!url).map((url, index) => (
                          <div key={index} className="relative group aspect-square w-full rounded-md overflow-hidden border">
                              <button type="button" className="absolute inset-0 z-20 cursor-zoom-in" onClick={() => setZoomedImageUrl(url)}>
                                  <span className="sr-only">Perbesar gambar {index + 1}</span>
                              </button>
                              <Image src={url} alt={`Evidence ${index + 1}`} fill className="object-cover" />
                              {(isOwner || isAdmin) && (
                                  <Button
                                      variant="destructive"
                                      size="icon"
                                      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                      onClick={() => setPhotoToDelete(url)}
                                  >
                                      <X className="h-4 w-4" />
                                      <span className="sr-only">Delete Photo</span>
                                  </Button>
                              )}
                          </div>
                      ))}
                  </div>
              </div>
            )}
            
          </CardContent>
          <CardFooter className="border-t pt-6 flex-col sm:flex-row gap-2">
              <div className="flex-grow text-xs text-muted-foreground">
                  Laporan ID: {nota.id}
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                  <SummarizeButton notaContent={notaContentForSummary} />
                  {(isOwner || isAdmin) && (
                      <>
                          <Link href={`/dashboard/notas/${id}/edit`}>
                              <Button variant="outline">
                                  <Edit /> Edit
                              </Button>
                          </Link>
                          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                              <AlertDialogTrigger asChild>
                                  <Button variant="destructive">
                                      <Trash /> Hapus
                                  </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                  <AlertDialogHeader>
                                  <AlertDialogTitle>Anda yakin ingin menghapus?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                      Tindakan ini tidak dapat dibatalkan. Laporan ini akan dihapus secara permanen.
                                  </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                      <AlertDialogCancel>Batal</AlertDialogCancel>
                                      <AlertDialogAction
                                          onClick={handleDelete}
                                          disabled={isDeleting}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                          {isDeleting ? 'Menghapus...' : 'Hapus'}
                                      </AlertDialogAction>
                                  </AlertDialogFooter>
                              </AlertDialogContent>
                          </AlertDialog>
                      </>
                  )}
                  {isAdmin && (nota.status === 'pending' || nota.status === 'verified' || nota.status === 'verified-tif') && (
                    <div className="flex gap-2">
                      <AlertDialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
                        <AlertDialogTrigger asChild>
                           <Button variant="destructive">
                              <ShieldX /> Tolak
                           </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Tolak Laporan</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Berikan alasan mengapa laporan ini ditolak. Alasan ini akan terlihat oleh pengguna.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="py-4">
                                <Label htmlFor="rejection-reason" className="sr-only">Alasan Penolakan</Label>
                                <Textarea
                                    id="rejection-reason"
                                    placeholder="Contoh: Foto eviden tidak jelas, nominal tidak sesuai..."
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                />
                            </div>
                            <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setRejectionReason('')}>Batal</AlertDialogCancel>
                                <AlertDialogAction onClick={handleConfirmReject} disabled={!rejectionReason.trim()}>Konfirmasi Penolakan</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      
                      {nota.status === 'pending' && (
                        <AlertDialog open={isVerifyDialogOpen} onOpenChange={setIsVerifyDialogOpen}>
                            <AlertDialogTrigger asChild>
                                <Button>
                                    <CheckCircle /> {isBbmGenset ? 'Verifikasi (Pengajuan TIF)' : 'Verifikasi'}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>{isBbmGenset ? 'Verifikasi Pengajuan TIF' : 'Pilih Tanggal Verifikasi'}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        {isBbmGenset
                                            ? 'Pilih tanggal verifikasi untuk pengajuan ke TIF. Status akan diubah menjadi "verified-tif".'
                                            : 'Pilih tanggal kapan laporan ini dianggap telah diverifikasi. Tanggal ini akan digunakan untuk filter laporan terverifikasi.'}
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="flex justify-center py-4">
                                    <Calendar
                                        mode="single"
                                        selected={verificationDate}
                                        onSelect={setVerificationDate}
                                        initialFocus
                                        captionLayout="dropdown"
                                        fromYear={new Date().getFullYear() - 1}
                                        toYear={new Date().getFullYear()}
                                    />
                                </div>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Batal</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleConfirmVerify} disabled={!verificationDate}>
                                        Konfirmasi Verifikasi
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  )}
              </div>
          </CardFooter>
        </Card>
      </div>
      <AlertDialog open={!!photoToDelete} onOpenChange={(open) => !open && setPhotoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this photo?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove the photo from this report.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeletePhoto}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {zoomedImageUrl && (
        <div 
            className="fixed inset-0 bg-black/80 z-50 flex justify-center items-center p-4 cursor-zoom-out"
            onClick={() => setZoomedImageUrl(null)}
        >
            <div className="relative max-w-4xl max-h-full">
                <Image 
                    src={zoomedImageUrl} 
                    alt="Bukti yang diperbesar" 
                    width={1200}
                    height={800}
                    className="object-contain w-auto h-auto max-w-full max-h-[90vh] cursor-default"
                    onClick={(e) => e.stopPropagation()}
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-8 w-8 z-10 rounded-full"
                  onClick={() => setZoomedImageUrl(null)}
                >
                  <X className="h-5 w-5" />
                  <span className="sr-only">Tutup Zoom</span>
                </Button>
            </div>
        </div>
      )}
    </>
  );
}
