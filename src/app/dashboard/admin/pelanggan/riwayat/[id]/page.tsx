
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { useStorage } from '@/firebase/provider';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { format, isValid } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, CheckCircle, Edit, Trash, X, ShieldX, Image as ImageIcon, AlertTriangle, Info, Trash2 } from 'lucide-react';
import type { RiwayatGangguan, UserProfile, MaterialEvidence } from '@/lib/types';
import { useMemo, useState } from 'react';
import Image from 'next/image';
import { Badge, badgeVariants } from '@/components/ui/badge';
import Link from 'next/link';
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
import { useToast } from '@/hooks/use-toast';
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

interface PhotoViewerProps {
  url?: string | null;
  label: string;
  onDelete?: () => void;
  canDelete?: boolean;
}

function PhotoViewer({ url, label, onDelete, canDelete }: PhotoViewerProps) {
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
      <div className="relative group">
        <button onClick={() => setIsZoomed(true)} className="relative aspect-square w-full rounded-md overflow-hidden border cursor-zoom-in group">
          <Image src={url} alt={label} fill className="object-cover transition-transform group-hover:scale-105" />
        </button>
        {canDelete && (
           <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 z-10">
                <Trash2 className="h-3 w-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Anda Yakin?</AlertDialogTitle>
                <AlertDialogDescription>Tindakan ini akan menghapus foto eviden secara permanen dan tidak dapat dibatalkan.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Hapus</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
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


const getStatusVariant = (status: RiwayatGangguan['status']): VariantProps<typeof badgeVariants>['variant'] => {
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


export default function RiwayatDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const [isDeletingPhoto, setIsDeletingPhoto] = useState(false);

  const riwayatRef = useMemoFirebase(() => doc(firestore, 'riwayat-gangguan', id), [firestore, id]);
  const { data: riwayat, isLoading } = useDoc<RiwayatGangguan>(riwayatRef);

  const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
  
  const canView = useMemo(() => {
    // If the data is loading, we can't determine access yet.
    if (!userProfile || !riwayat) return false;
    // The main layout already checks for 'approved' status.
    // The new Firestore security rule `allow get: if isApproved()` handles the permission.
    // Therefore, if we have the `riwayat` data, the user is authorized to view it.
    return true;
  }, [userProfile, riwayat]);

  const canModify = useMemo(() => {
    if (!userProfile || !riwayat) return false;
    if (userProfile.role === 'admin' || userProfile.role === 'korlap') return true;
    return riwayat.userId === user?.uid; // Only allow modification for original creator
  }, [userProfile, riwayat, user]);

  
  const handleDeletePhoto = async (photoUrl: string) => {
    if (!canModify || !riwayat) return;
    setIsDeletingPhoto(true);

    try {
        // 1. Delete from Storage
        const photoRef = ref(storage, photoUrl);
        await deleteObject(photoRef);

        // 2. Delete from Firestore
        let updatedData: Partial<RiwayatGangguan>;
        
        if (riwayat.evidenSccUrl === photoUrl) {
            updatedData = { evidenSccUrl: '' };
        } else {
            const newMaterials = riwayat.materials?.map(material => {
                if (!material.evidences) return material;
                return {
                    ...material,
                    evidences: material.evidences.filter(ev => ev.photoUrl !== photoUrl),
                };
            }) || [];
            updatedData = { materials: newMaterials };
        }
        
        await updateDoc(riwayatRef, updatedData);
        toast({ title: "Foto Dihapus" });
    } catch(error: any) {
        toast({ variant: 'destructive', title: "Gagal menghapus foto", description: error.message });
    } finally {
        setIsDeletingPhoto(false);
    }
  };

  if (isLoading) {
    return (
        <div className="mx-auto grid max-w-4xl flex-1 auto-rows-max gap-6">
            <div className="flex items-center gap-4"><Skeleton className="h-7 w-7 rounded-md" /><Skeleton className="h-7 w-48" /></div>
            <Skeleton className="h-[400px] w-full" />
        </div>
    );
  }

  if (!riwayat || !canView) {
    return (
      <div className="text-center py-10">
        <h2 className="text-xl font-semibold">Laporan Tidak Ditemukan</h2>
        <p className="text-muted-foreground mt-2">Laporan yang Anda cari tidak ada atau Anda tidak memiliki izin untuk melihatnya.</p>
        <Button onClick={() => router.back()} className="mt-4"><ArrowLeft className="mr-2" /> Kembali</Button>
      </div>
    );
  }

  const tanggalLapor = safeToDate(riwayat.tanggalLapor);
  const tanggalOpen = safeToDate(riwayat.tanggalOpen);
  const tanggalClose = safeToDate(riwayat.tanggalClose);

  return (
    <div className="mx-auto grid max-w-4xl flex-1 auto-rows-max gap-6">
       <div className="flex items-center gap-4">
        <Button onClick={() => router.back()} variant="outline" size="icon" className="h-8 w-8">
          <ArrowLeft className="h-5 w-5" /><span className="sr-only">Kembali</span>
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Detail Laporan Gangguan</h1>
          <p className="text-muted-foreground text-sm">No. Service: {riwayat.noService}</p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
            <CardTitle>Informasi Laporan</CardTitle>
        </CardHeader>
        <CardContent>
             <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <div className="flex flex-col"><dt className="text-muted-foreground">Petugas</dt><dd className="font-medium">{riwayat.namaPetugas}</dd></div>
                <div className="flex flex-col"><dt className="text-muted-foreground">NIK</dt><dd>{riwayat.nik || '-'}</dd></div>
                <div className="flex flex-col"><dt className="text-muted-foreground">Tanggal Lapor</dt><dd>{tanggalLapor ? format(tanggalLapor, 'eeee, dd MMMM yyyy, HH:mm', { locale: idLocale }) : '-'}</dd></div>
                <div className="flex flex-col"><dt className="text-muted-foreground">No. Tiket</dt><dd className="font-mono">{riwayat.noTiket || '-'}</dd></div>
                <div className="flex flex-col"><dt className="text-muted-foreground">Tanggal Open</dt><dd>{tanggalOpen ? format(tanggalOpen, 'dd MMM yyyy, HH:mm', { locale: idLocale }) : '-'}</dd></div>
                <div className="flex flex-col"><dt className="text-muted-foreground">Tanggal Close</dt><dd>{tanggalClose ? format(tanggalClose, 'dd MMM yyyy, HH:mm', { locale: idLocale }) : '-'}</dd></div>
                <div className="flex flex-col"><dt className="text-muted-foreground">Jenis Order</dt><dd><Badge variant="secondary">{riwayat.jenisOrder || '-'}</Badge></dd></div>
                <div className="flex flex-col"><dt className="text-muted-foreground">Type Order</dt><dd><Badge variant="outline">{riwayat.typeOrder || '-'}</Badge></dd></div>
                 <div className="flex flex-col md:col-span-2"><dt className="text-muted-foreground">Layanan Terdampak</dt>
                    <dd className="flex flex-wrap gap-2 mt-1">
                        {riwayat.layanan && riwayat.layanan.length > 0
                            ? riwayat.layanan.map(l => <Badge key={l} variant="default">{l}</Badge>)
                            : '-'}
                    </dd>
                </div>
                 <div className="flex flex-col md:col-span-2"><dt className="text-muted-foreground">Keterangan</dt><dd>{riwayat.keterangan || '-'}</dd></div>
            </dl>
        </CardContent>
      </Card>
      
      {(riwayat.evidenSccUrl || riwayat.dorongClose) && (
        <Card>
            <CardHeader>
                <CardTitle>Eviden Tambahan</CardTitle>
            </CardHeader>
            <CardContent>
                {riwayat.dorongClose && (
                    <Alert variant="default" className="mb-4 bg-yellow-50 border-yellow-200">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Dorong Close</AlertTitle>
                        <AlertDescription>Laporan ini ditandai untuk didorong close.</AlertDescription>
                    </Alert>
                )}
                {riwayat.evidenSccUrl ? (
                    <div>
                        <p className="text-sm text-muted-foreground mb-2">Foto Eviden SCC</p>
                        <div className="max-w-xs">
                          <PhotoViewer 
                            url={riwayat.evidenSccUrl} 
                            label="Eviden SCC" 
                            onDelete={() => handleDeletePhoto(riwayat.evidenSccUrl!)}
                            canDelete={canModify}
                          />
                        </div>
                    </div>
                ) : (
                    !riwayat.dorongClose && <p className="text-sm text-muted-foreground">Tidak ada eviden tambahan.</p>
                )}
            </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Material & Eviden yang Digunakan</CardTitle>
        </CardHeader>
        <CardContent>
          {riwayat.materials && riwayat.materials.length > 0 ? (
            <div className="space-y-6">
              {riwayat.materials.map((material, index) => (
                <div key={index} className="border-b pb-6 last:border-b-0 last:pb-0">
                    <h3 className="font-semibold mb-2">{material.materialName} {material.quantity ? `(${material.quantity})` : ''}</h3>
                    {material.details && Object.keys(material.details).length > 0 && (
                        <div className="mb-4 text-sm">
                            {Object.entries(material.details).map(([key, value]) => (
                                <p key={key}><strong>{key}:</strong> {value}</p>
                            ))}
                        </div>
                    )}
                    {material.evidences && material.evidences.length > 0 ? (
                         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {material.evidences.map((ev, photoIndex) => (
                                <div key={photoIndex}>
                                    <p className="text-xs text-muted-foreground capitalize mb-1">{ev.evidenceName}</p>
                                    <PhotoViewer 
                                        url={ev.photoUrl} 
                                        label={`${material.materialName} - ${ev.evidenceName}`}
                                        onDelete={() => handleDeletePhoto(ev.photoUrl)}
                                        canDelete={canModify}
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground">Tidak ada foto eviden untuk material ini.</p>
                    )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">Tidak ada material yang digunakan dalam laporan ini.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
