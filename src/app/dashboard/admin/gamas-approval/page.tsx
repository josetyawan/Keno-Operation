
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, orderBy, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { format, isValid } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { GamasReport, UserProfile } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { CheckCircle, ShieldX, ChevronLeft, ChevronRight, Eye, Loader2 } from 'lucide-react';
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
} from "@/components/ui/alert-dialog"
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';

const safeToDate = (timestamp: any): Date | null => {
  if (!timestamp) return null;
  if (timestamp.toDate) return timestamp.toDate();
  if (timestamp instanceof Date && isValid(timestamp)) return timestamp;
  const d = new Date(timestamp);
  return isValid(d) ? d : null;
};

export default function GamasApprovalPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const [reportToApprove, setReportToApprove] = useState<GamasReport | null>(null);
  const [reportToReject, setReportToReject] = useState<GamasReport | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

  const { data: currentUserProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(
    useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore])
  );

  useEffect(() => {
    if (!isUserLoading && !isProfileLoading) {
      if (!user || (currentUserProfile?.role !== 'admin' && currentUserProfile?.role !== 'korlap')) {
        router.push('/dashboard');
      }
    }
  }, [user, currentUserProfile, isUserLoading, isProfileLoading, router]);

  const reportsQuery = useMemoFirebase(() => {
    if (isProfileLoading || !currentUserProfile) return null;

    const isAdminOrKorlap = currentUserProfile.role === 'admin' || currentUserProfile.role === 'korlap';
    if (!isAdminOrKorlap) return null;

    return query(collection(firestore, 'gamas-reports'), orderBy('createdAt', 'desc'));
  }, [firestore, currentUserProfile, isProfileLoading]);

  const { data: reports, isLoading: areReportsLoading } = useCollection<GamasReport>(reportsQuery);
  
  const pendingReports = useMemo(() => {
    if (!reports) return [];
    return reports.filter(r => r.status === 'pending');
  }, [reports]);

  const totalPages = Math.ceil(pendingReports.length / ITEMS_PER_PAGE);

  const paginatedReports = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return pendingReports.slice(startIndex, endIndex);
  }, [pendingReports, currentPage]);

  const handleApprove = async () => {
    if (!reportToApprove) return;
    setIsActionLoading(true);
    const reportRef = doc(firestore, 'gamas-reports', reportToApprove.id);
    try {
      await updateDoc(reportRef, { status: 'approved' });
      toast({ title: 'Laporan Disetujui' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Gagal Menyetujui' });
    }
    setIsActionLoading(false);
    setReportToApprove(null);
  };
  
  const handleReject = async () => {
    if (!reportToReject || !rejectionReason.trim()) {
       toast({ variant: 'destructive', title: 'Alasan Diperlukan', description: 'Silakan isi alasan penolakan.' });
       return;
    };
    setIsActionLoading(true);
    const reportRef = doc(firestore, 'gamas-reports', reportToReject.id);
    try {
      await updateDoc(reportRef, { status: 'rejected', rejectionReason: rejectionReason.trim() });
      toast({ title: 'Laporan Ditolak' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Gagal Menolak' });
    }
    setIsActionLoading(false);
    setReportToReject(null);
    setRejectionReason('');
  };
  
  const isLoading = isUserLoading || isProfileLoading || areReportsLoading;

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-40 w-full" /></div>;
  }

  return (
    <div className="space-y-6">
       <div>
            <h1 className="text-3xl font-bold tracking-tight">Persetujuan Laporan Gamas</h1>
            <p className="text-muted-foreground mt-1">Tinjau dan kelola laporan eviden gamas yang masuk.</p>
        </div>
        <Card>
            <CardHeader>
                <CardTitle>Laporan Menunggu Persetujuan</CardTitle>
                <CardDescription>Daftar laporan yang memerlukan tindakan Anda.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>No. Tiket</TableHead>
                            <TableHead>Teknisi</TableHead>
                            <TableHead>Designator</TableHead>
                            <TableHead>Tanggal</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={5}><Skeleton className="h-10" /></TableCell></TableRow>
                        ) : paginatedReports && paginatedReports.length > 0 ? (
                            paginatedReports.map(report => {
                                const designatorList = Array.isArray(report.designators) ? report.designators : ((report as any).designator ? [(report as any).designator] : []);
                                return (
                                <TableRow key={report.id}>
                                    <TableCell className="font-medium">{report.noTiket}</TableCell>
                                    <TableCell>{report.userName}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1 max-w-[250px]">
                                            {designatorList.map((d: string) => (
                                                <Badge key={d} variant="outline">{d}</Badge>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell>{safeToDate(report.createdAt) ? format(safeToDate(report.createdAt)!, 'dd MMM yyyy, HH:mm') : '-'}</TableCell>
                                    <TableCell className="text-right">
                                        <Button asChild variant="ghost" size="icon">
                                            <Link href={`/dashboard/gamas/${report.id}`}><Eye className="h-4 w-4" /></Link>
                                        </Button>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="outline" size="sm" className="ml-2" onClick={() => setReportToReject(report)}><ShieldX className="h-4 w-4" /></Button>
                                        </AlertDialogTrigger>
                                         <AlertDialogTrigger asChild>
                                            <Button variant="default" size="sm" className="ml-2" onClick={() => setReportToApprove(report)}><CheckCircle className="h-4 w-4" /></Button>
                                        </AlertDialogTrigger>
                                    </TableCell>
                                </TableRow>
                                )
                            })
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    Tidak ada laporan yang menunggu persetujuan.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
            {totalPages > 1 && (
                <CardFooter>
                     <div className="text-xs text-muted-foreground">
                        Halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong>
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /> Sebelumnya</Button>
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>Berikutnya <ChevronRight className="h-4 w-4" /></Button>
                    </div>
                </CardFooter>
            )}
        </Card>

        {/* Dialogs */}
        <AlertDialog open={!!reportToApprove} onOpenChange={(open) => !open && setReportToApprove(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Setujui Laporan Ini?</AlertDialogTitle>
                    <AlertDialogDescription>Laporan untuk tiket {reportToApprove?.noTiket} akan ditandai sebagai "Approved".</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={handleApprove} disabled={isActionLoading}>
                        {isActionLoading && <Loader2 className="mr-2 animate-spin"/>} Setujui
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!reportToReject} onOpenChange={(open) => !open && setReportToReject(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Tolak Laporan: {reportToReject?.noTiket}</AlertDialogTitle>
                    <AlertDialogDescription>Berikan alasan mengapa laporan ini ditolak. Alasan ini akan terlihat oleh teknisi.</AlertDialogDescription>
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
                    <AlertDialogAction onClick={handleReject} disabled={isActionLoading || !rejectionReason.trim()}>
                        {isActionLoading && <Loader2 className="mr-2 animate-spin"/>} Konfirmasi Penolakan
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

    </div>
  )
}
