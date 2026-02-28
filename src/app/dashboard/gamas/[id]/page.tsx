
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { format, isValid } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, FileWarning, Download } from 'lucide-react';
import type { GamasReport, UserProfile } from '@/lib/types';
import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

const safeToDate = (timestamp: any): Date | null => {
  if (!timestamp) return null;
  if (timestamp.toDate) return timestamp.toDate();
  if (timestamp instanceof Date && isValid(timestamp)) return timestamp;
  const d = new Date(timestamp);
  return isValid(d) ? d : null;
};

export default function GamasDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);

  const reportRef = useMemoFirebase(() => doc(firestore, 'gamas-reports', id), [firestore, id]);
  const { data: report, isLoading } = useDoc<GamasReport>(reportRef);

  const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  const canView = useMemo(() => {
    if (!userProfile || !report) return false;
    if (userProfile.role === 'admin' || userProfile.role === 'korlap') return true;
    return report.userId === user.uid;
  }, [userProfile, report, user]);

  const handleDownloadAll = () => {
    if (report?.photoUrls) {
      report.photoUrls.forEach((url, index) => {
        // Use a small delay to avoid browser pop-up blockers
        setTimeout(() => {
          window.open(url, `_blank_photo_${index}`);
        }, index * 200);
      });
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto grid max-w-4xl flex-1 auto-rows-max gap-6">
        <div className="flex items-center gap-4"><Skeleton className="h-7 w-7 rounded-md" /><Skeleton className="h-7 w-48" /></div>
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  if (!report || !canView) {
    return (
      <div className="text-center py-10">
        <h2 className="text-xl font-semibold">Laporan Tidak Ditemukan</h2>
        <p className="text-muted-foreground mt-2">Laporan yang Anda cari tidak ada atau Anda tidak memiliki izin untuk melihatnya.</p>
        <Button onClick={() => router.back()} className="mt-4"><ArrowLeft className="mr-2" /> Kembali</Button>
      </div>
    );
  }

  const dateCreated = safeToDate(report.createdAt);

  return (
    <>
    <div className="mx-auto grid max-w-5xl flex-1 auto-rows-max gap-6">
      <div className="flex items-center gap-4">
        <Button onClick={() => router.back()} variant="outline" size="icon" className="h-8 w-8">
          <ArrowLeft className="h-5 w-5" /><span className="sr-only">Kembali</span>
        </Button>
        <div>
          <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-bold tracking-tight sm:grow-0">
            Detail Laporan Gamas
          </h1>
          <p className="text-muted-foreground text-sm">
            Dikirim oleh {report.userName} pada {dateCreated ? format(dateCreated, 'dd MMMM yyyy, HH:mm') : ''}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileWarning /> Designator: {report.designator}</CardTitle>
          {report.notes && <CardDescription>Catatan: {report.notes}</CardDescription>}
        </CardHeader>
        <CardContent>
          <h3 className="font-semibold mb-4">Eviden Foto ({report.photoUrls.length})</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {report.photoUrls.map((url, index) => (
                <button key={index} onClick={() => setZoomedImageUrl(url)} className="relative aspect-square w-full rounded-md overflow-hidden border cursor-zoom-in group">
                    <Image src={url} alt={`Eviden ${index + 1}`} fill className="object-cover transition-transform group-hover:scale-105" />
                </button>
            ))}
          </div>
        </CardContent>
        <CardFooter className="border-t pt-4">
            <Button onClick={handleDownloadAll}><Download className="mr-2"/>Download Semua Foto</Button>
        </CardFooter>
      </Card>
    </div>

    {zoomedImageUrl && (
        <div 
            className="fixed inset-0 bg-black/80 z-50 flex justify-center items-center p-4 cursor-zoom-out"
            onClick={() => setZoomedImageUrl(null)}
        >
            <div className="relative max-w-4xl max-h-full">
                <Image src={zoomedImageUrl} alt="Eviden yang diperbesar" width={1200} height={800} className="object-contain w-auto h-auto max-w-full max-h-[90vh] cursor-default" onClick={(e) => e.stopPropagation()} />
                <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-8 w-8 z-10 rounded-full" onClick={() => setZoomedImageUrl(null)}>
                    <X className="h-5 w-5" /><span className="sr-only">Tutup Zoom</span>
                </Button>
            </div>
        </div>
      )}
    </>
  );
}

    