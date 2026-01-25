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
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, Edit, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDoc, useFirestore, useUser, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
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

export default function NotaDetailPage() {
  const params = useParams();
  const id = params.id as string;
  
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleVerify = () => {
    if (!isAdmin || !notaRef) return;
    updateDocumentNonBlocking(notaRef, { status: 'verified' });
    toast({
      title: 'Laporan Diverifikasi',
      description: 'Status laporan telah diperbarui menjadi "verified".',
    });
  };

  const handleDelete = () => {
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
    deleteDocumentNonBlocking(notaRef);
    
    toast({
      title: 'Laporan Dihapus',
      description: 'Laporan ini telah berhasil dihapus.',
    });
    
    setIsDeleteDialogOpen(false);
    router.push('/dashboard');
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
    // This will be caught by the not-found mechanism
    notFound();
  }

  const tanggalLaporan = nota.tanggal?.toDate ? nota.tanggal.toDate() : new Date();
  const isOwner = user?.uid === nota.userId;
  
  const notaContentForSummary = `
  Tanggal: ${format(tanggalLaporan, 'dd MMMM yyyy')}
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
    <div className="mx-auto grid max-w-4xl flex-1 auto-rows-max gap-6">
       <div className="flex items-center gap-4">
         <Link href="/dashboard">
          <Button variant="outline" size="icon" className="h-7 w-7">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
         </Link>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0 font-headline truncate">
          Detail Laporan
        </h1>
        <Badge 
          variant={nota.status === 'verified' ? 'default' : 'secondary'} 
          className="ml-auto sm:ml-0 capitalize"
        >
          {nota.status}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Laporan Segmen: {nota.segmen}</CardTitle>
            <CardDescription>
              Oleh {nota.userEmail} pada {format(tanggalLaporan, 'PPPPp')}
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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
                    {nota.fotoEvidenUrls.map((url, index) => (
                        <div key={index} className="relative aspect-square w-full rounded-md overflow-hidden border">
                            <Image src={url} alt={`Evidence ${index + 1}`} fill className="object-cover" />
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
                {isAdmin && nota.status === 'pending' && (
                    <Button onClick={handleVerify}>
                        <CheckCircle /> Verify Laporan
                    </Button>
                )}
            </div>
         </CardFooter>
      </Card>
    </div>
  );
}
