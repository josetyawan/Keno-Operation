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
import { ArrowLeft, Edit, Trash2, Image as ImageIcon, AlertTriangle, Info, Link as LinkIcon, Download, FileUp, Check, X } from 'lucide-react';
import type { GamasReport, UserProfile, DesignatorEvidence } from '@/lib/types';
import { useMemo, useState, useEffect } from 'react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
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
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

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

const getStatusVariant = (status: DesignatorEvidence['status']): "default" | "destructive" | "secondary" | "outline" => {
    switch (status) {
        case 'approved': return 'default';
        case 'rejected': return 'destructive';
        case 'pending':
        default: return 'secondary';
    }
};

const getStatusIcon = (status: DesignatorEvidence['status']) => {
    switch (status) {
        case 'approved': return <Check className="h-4 w-4 mr-1" />;
        case 'rejected': return <X className="h-4 w-4 mr-1" />;
        default: return null;
    }
};

export default function GamasDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();

  const reportRef = useMemoFirebase(() => doc(firestore, 'gamas-reports', id), [firestore, id]);
  const { data: report, isLoading } = useDoc<GamasReport>(reportRef);

  const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    if (user && report) {
      const isOwner = user.uid === report.userId;
      const isReportRejected = report.status === 'rejected';
      const hasRejectedEvidence = report.evidences.some(e => e.status === 'rejected');
      setCanEdit(isOwner && (isReportRejected || hasRejectedEvidence));
    } else {
      setCanEdit(false);
    }
  }, [user, report]);

  const canView = useMemo(() => {
    if (!userProfile || !report) return false;
    if (userProfile.role === 'admin' || userProfile.role === 'korlap') return true;
    return report.userId === user?.uid;
  }, [userProfile, report, user]);

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

  const handleDownloadKmlFiles = () => {
    if (!report?.kmlEvidences || report.kmlEvidences.length === 0) {
        toast({
            variant: "destructive",
            title: "Tidak Ada File",
            description: "Tidak ada file KML/ABD/SS KML untuk diunduh.",
        });
        return;
    }

    const downloadWithAnchor = (url: string, filename: string) => {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    report.kmlEvidences.forEach((file, index) => {
        if (file.url && file.fileName) {
            // Use a timeout to prevent browser from blocking multiple downloads
            setTimeout(() => {
                downloadWithAnchor(file.url, file.fileName!);
            }, index * 300);
        }
    });
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
        <div className="ml-auto flex flex-wrap gap-2">
            {canEdit && (
                <Link href={`/dashboard/gamas/${report.id}/edit`}>
                    <Button><Edit className="mr-2"/>Edit & Kirim Ulang Laporan</Button>
                </Link>
            )}
            {report.kmlEvidences && report.kmlEvidences.length > 0 && (
                <Button onClick={handleDownloadKmlFiles} variant="outline" size="sm">
                    <FileUp className="mr-2 h-4 w-4" /> Download KML
                </Button>
            )}
            <Button onClick={handleDownloadAll} variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" /> Download Foto
            </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileWarning /> No. Tiket: {report.noTiket}
            {report.sto && <Badge variant="outline" className="ml-2">{report.sto}</Badge>}
          </CardTitle>
          <CardDescription>Status Laporan Keseluruhan: <Badge variant={report.status === 'approved' ? 'default' : report.status === 'rejected' ? 'destructive' : 'secondary'}>{report.status}</Badge></CardDescription>
        </CardHeader>
        {report.rejectionReason && (
            <CardContent>
                <div className="text-sm p-3 bg-destructive/10 text-destructive rounded-md border border-destructive/20">
                    <p className="font-semibold">Alasan Penolakan Tiket:</p>
                    <p>{report.rejectionReason}</p>
                </div>
            </CardContent>
        )}
      </Card>
      
      {report.kmlEvidences && report.kmlEvidences.length > 0 && (
          <Card>
              <CardHeader>
                  <CardTitle>File KML/ABD/SS KML</CardTitle>
              </CardHeader>
              <CardContent>
                  <ul className="space-y-3">
                      {report.kmlEvidences.map((evidence, index) => (
                          <li key={index} className="flex items-start gap-4 p-3 border rounded-md">
                              <LinkIcon className="h-5 w-5 text-muted-foreground mt-1" />
                              <div className="flex-grow">
                                  <a href={evidence.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">{evidence.fileName}</a>
                                  <p className="text-sm text-muted-foreground">{evidence.keterangan}</p>
                              </div>
                          </li>
                      ))}
                  </ul>
              </CardContent>
          </Card>
      )}

      <div className="space-y-6">
        {report.evidences.map((evidence, index) => (
            <Card key={index}>
                <CardHeader className="flex flex-row items-start justify-between">
                    <div>
                        <CardTitle>{evidence.designator} (VOL: {evidence.quantity || 1})</CardTitle>
                        {evidence.notes && <CardDescription>{evidence.notes}</CardDescription>}
                    </div>
                    <Badge variant={getStatusVariant(evidence.status)} className="capitalize">
                        {getStatusIcon(evidence.status)}
                        {evidence.status}
                    </Badge>
                </CardHeader>
                <CardContent>
                    {evidence.status === 'rejected' && evidence.rejectionReason && (
                        <div className="mb-4 text-sm p-3 bg-destructive/10 text-destructive rounded-md border border-destructive/20">
                            <p className="font-semibold flex items-center gap-1"><Info className="h-4 w-4"/>Alasan Penolakan Designator:</p>
                            <p>{evidence.rejectionReason}</p>
                            {canEdit && (
                                <Link href={`/dashboard/gamas/${report.id}/edit`} className="mt-2 inline-block font-semibold underline hover:no-underline">
                                    Klik di sini untuk memperbaiki
                                </Link>
                            )}
                        </div>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {evidence.photoUrls.map((url, photoIndex) => (
                             <PhotoViewer key={photoIndex} url={url} label={`Eviden ${evidence.designator} ${photoIndex + 1}`} />
                        ))}
                         {evidence.photoUrls.length === 0 && (
                            <div className="col-span-full text-center text-muted-foreground py-4">
                                Tidak ada foto untuk designator ini.
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        ))}
      </div>
    </div>
    </>
  );
}
