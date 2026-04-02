
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, orderBy, updateDoc, deleteDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format, isValid } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { GamasReport, UserProfile, DesignatorEvidence } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Eye, Trash2, ShieldX, FileSpreadsheet, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { gamasPriceData } from '@/lib/gamas-price-data';

const safeToDate = (timestamp: any): Date | null => {
  if (!timestamp) return null;
  if (timestamp.toDate) return timestamp.toDate();
  if (timestamp instanceof Date && isValid(timestamp)) return timestamp;
  const d = new Date(timestamp);
  return isValid(d) ? d : null;
};

export default function GamasApprovalListPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [isExporting, setIsExporting] = useState(false);

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

  const { data: allReports, isLoading: areReportsLoading } = useCollection<GamasReport>(reportsQuery);

  const reports = useMemo(() => {
      if (!allReports) return [];
      // Show pending reports first, then others
      return [...allReports].sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0);
      });
  }, [allReports]);
  
  const totalPages = reports ? Math.ceil(reports.length / ITEMS_PER_PAGE) : 0;

  const paginatedReports = useMemo(() => {
    if (!reports) return [];
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return reports.slice(startIndex, endIndex);
  }, [reports, currentPage]);

  const handleDeleteReport = async (reportToDelete: GamasReport) => {
    if (!reportToDelete) return;
    const docRef = doc(firestore, 'gamas-reports', reportToDelete.id);
    try {
      await deleteDoc(docRef);
      toast({ title: "Laporan Dihapus", description: `Laporan untuk tiket ${reportToDelete.noTiket} telah dihapus.` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Gagal Menghapus", description: e.message });
    }
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    const approvedReports = allReports?.filter(r => r.status === 'approved');

    if (!approvedReports || approvedReports.length === 0) {
      toast({ variant: 'destructive', title: 'Tidak ada data', description: 'Tidak ada laporan yang berstatus "approved" untuk diekspor.' });
      setIsExporting(false);
      return;
    }

    try {
        const XLSX = await import('xlsx');
        const priceMap = new Map(gamasPriceData.map(item => [item.code.trim().toUpperCase(), item]));

        const reportsByTicket = approvedReports.reduce((acc, report) => {
            const key = report.noTiket || 'TANPA_TIKET';
            if (!acc[key]) {
                acc[key] = { report: report, evidences: [] };
            }
            acc[key].evidences.push(...report.evidences);
            return acc;
        }, {} as Record<string, { report: GamasReport; evidences: DesignatorEvidence[] }>);


        const dataToExport: any[] = [];
        let itemCounter = 1;
        
        const grandTotals = {
            vol: 0,
            material: 0,
            jasa: 0,
            total: 0,
        };

        for (const ticketKey in reportsByTicket) {
            const { report, evidences } = reportsByTicket[ticketKey];
            if (evidences.length === 0) continue;

            const totalVolForTicket = evidences.reduce((sum, ev) => sum + (ev.quantity || 1), 0);
            grandTotals.vol += totalVolForTicket;

            let ticketSubtotals = { material: 0, jasa: 0 };
            let isFirstRowOfTicket = true;

            evidences.forEach(evidence => {
                const vol = evidence.quantity || 1;
                const cleanDesignator = evidence.designator.trim().toUpperCase();
                const priceInfo = priceMap.get(cleanDesignator);

                let materialPrice = priceInfo?.materialPrice || 0;
                let servicePrice = priceInfo?.servicePrice || 0;
                
                if (cleanDesignator.startsWith('J-')) {
                    materialPrice = 0;
                } else if (cleanDesignator.startsWith('M-')) {
                    servicePrice = 0;
                }

                const totalMaterial = materialPrice * vol;
                const totalService = servicePrice * vol;
                const totalHarga = totalMaterial + totalService;

                ticketSubtotals.material += totalMaterial;
                ticketSubtotals.jasa += totalService;

                dataToExport.push({
                    'NO': itemCounter++,
                    'DESIGNATOR': evidence.designator,
                    'URAIAN PEKERJAAN': priceInfo?.description || 'N/A',
                    'SATUAN': priceInfo?.unit || 'N/A',
                    'HARGA SATUAN MATERIAL': materialPrice,
                    'HARGA SATUAN JASA': servicePrice,
                    'VOL': isFirstRowOfTicket ? totalVolForTicket : vol,
                    'KUD (WORK DESC)': isFirstRowOfTicket ? (report.sto !== 'DMA' ? `KUD (${ticketKey})` : '') : '',
                    'DMA (WORK DESC)': isFirstRowOfTicket ? (report.sto === 'DMA' ? `DMA (${ticketKey})` : '') : '',
                    'TOTAL HARGA MATERIAL': totalMaterial,
                    'TOTAL HARGA JASA': totalService,
                    'TOTAL': totalHarga,
                });
                
                isFirstRowOfTicket = false;
            });

            const ticketTotal = ticketSubtotals.material + ticketSubtotals.jasa;
            dataToExport.push({ 'NO': '', 'DESIGNATOR': 'MATERIAL', 'TOTAL': ticketSubtotals.material });
            dataToExport.push({ 'NO': '', 'DESIGNATOR': 'JASA', 'TOTAL': ticketSubtotals.jasa });
            dataToExport.push({ 'NO': '', 'DESIGNATOR': 'TOTAL', 'TOTAL': ticketTotal });
            
            grandTotals.material += ticketSubtotals.material;
            grandTotals.jasa += ticketSubtotals.jasa;
            grandTotals.total += ticketTotal;
        }

        // Add Grand Total row
        dataToExport.push({
            'NO': '',
            'DESIGNATOR': 'GRAND TOTAL',
            'VOL': grandTotals.vol,
            'TOTAL HARGA MATERIAL': grandTotals.material,
            'TOTAL HARGA JASA': grandTotals.jasa,
            'TOTAL': grandTotals.total
        });
        
        const excelHeaders = [
            'NO', 'DESIGNATOR', 'URAIAN PEKERJAAN', 'SATUAN', 
            'HARGA SATUAN MATERIAL', 'HARGA SATUAN JASA', 'VOL', 'KUD (WORK DESC)', 'DMA (WORK DESC)',
            'TOTAL HARGA MATERIAL', 'TOTAL HARGA JASA', 'TOTAL'
        ];
        
        const worksheet = XLSX.utils.json_to_sheet(dataToExport, { header: excelHeaders });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Gamas Approved');
        
        // Auto-fit columns
        const colWidths = excelHeaders.map(header => {
            const maxLength = Math.max(
                header.length,
                ...dataToExport.map(row => String(row[header as keyof typeof row] ?? '').length)
            );
            return { width: Math.min(maxLength + 2, 60) };
        });
        worksheet['!cols'] = colWidths;

        const dateString = format(new Date(), 'yyyy-MM-dd');
        XLSX.writeFile(workbook, `Rekap_Gamas_Approved_${dateString}.xlsx`);
        
        toast({ title: 'Ekspor Berhasil', description: 'File rekap Excel telah diunduh.' });

    } catch (error: any) {
         toast({ variant: 'destructive', title: 'Gagal Mengekspor', description: error.message });
    } finally {
        setIsExporting(false);
    }
  };
  
  const isLoading = isUserLoading || isProfileLoading || areReportsLoading;

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-40 w-full" /></div>;
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Persetujuan Laporan Gamas</h1>
                <p className="text-muted-foreground mt-1">Tinjau dan kelola laporan eviden gamas yang masuk.</p>
              </div>
              <Button onClick={handleExportExcel} disabled={isExporting}>
                {isExporting ? <Loader2 className="mr-2 animate-spin" /> : <FileSpreadsheet className="mr-2" />}
                Download Rekap
              </Button>
          </div>
          <Card>
              <CardHeader>
                  <CardTitle>Semua Laporan</CardTitle>
                  <CardDescription>Daftar semua laporan yang memerlukan tindakan atau telah diproses.</CardDescription>
              </CardHeader>
              <CardContent>
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>No. Tiket</TableHead>
                              <TableHead>STO</TableHead>
                              <TableHead>Teknisi</TableHead>
                              <TableHead>Tanggal</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Aksi</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {isLoading ? (
                              <TableRow><TableCell colSpan={6}><Skeleton className="h-10" /></TableCell></TableRow>
                          ) : paginatedReports && paginatedReports.length > 0 ? (
                              paginatedReports.map(report => (
                                  <TableRow key={report.id}>
                                      <TableCell className="font-medium">{report.noTiket}</TableCell>
                                      <TableCell>{report.sto || '-'}</TableCell>
                                      <TableCell>{report.userName}</TableCell>
                                      <TableCell>{safeToDate(report.createdAt) ? format(safeToDate(report.createdAt)!, 'dd MMM yyyy, HH:mm') : '-'}</TableCell>
                                      <TableCell><Badge variant={report.status === 'approved' ? 'default' : report.status === 'rejected' ? 'destructive' : 'secondary'}>{report.status}</Badge></TableCell>
                                      <TableCell className="text-right">
                                          <Button asChild variant="outline" size="sm">
                                              <Link href={`/dashboard/admin/gamas-approval/${report.id}`}><Eye className="mr-2 h-4 w-4" />Tinjau</Link>
                                          </Button>
                                          <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                              <Button variant="ghost" size="icon" className="ml-2 text-destructive hover:text-destructive">
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                              <AlertDialogHeader>
                                                <AlertDialogTitle>Anda Yakin?</AlertDialogTitle>
                                                <AlertDialogDescription>Tindakan ini akan menghapus laporan untuk tiket <strong>{report.noTiket}</strong> secara permanen.</AlertDialogDescription>
                                              </AlertDialogHeader>
                                              <AlertDialogFooter>
                                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteReport(report)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Hapus</AlertDialogAction>
                                              </AlertDialogFooter>
                                            </AlertDialogContent>
                                          </AlertDialog>
                                      </TableCell>
                                  </TableRow>
                              ))
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
      </div>
    </>
  )
}
