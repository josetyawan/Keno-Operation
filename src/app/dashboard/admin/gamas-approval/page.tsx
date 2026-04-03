
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
import type { GamasReport, UserProfile, DesignatorEvidence, GamasPriceItem } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Eye, Trash2, ShieldX, FileSpreadsheet, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { gamasPriceData as gamasPriceDataMitra } from '@/lib/gamas-price-data';
import { gamasPriceDataTelkom } from '@/lib/gamas-price-data-telkom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


const safeToDate = (timestamp: any): Date | null => {
  if (!timestamp) return null;
  if (timestamp.toDate) return timestamp.toDate();
  if (timestamp instanceof Date && isValid(timestamp)) return timestamp;
  const d = new Date(timestamp);
  return isValid(d) ? d : null;
};

// Helper function to normalize designator codes for reliable matching
const normalizeCode = (code: string): string => {
  if (!code) return '';
  // Removes all non-alphanumeric characters and converts to uppercase
  return code.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
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
  
  const handleExportBoQ = async (report: GamasReport, priceSource: 'telkom' | 'mitra') => {
    if (report.status !== 'approved') {
        toast({
            variant: "destructive",
            title: "Laporan Belum Disetujui",
            description: "Hanya laporan yang berstatus 'approved' yang dapat diekspor sebagai BoQ.",
        });
        return;
    }
    setIsExporting(true);

    try {
        const XLSX = await import('xlsx');
        const priceData = priceSource === 'telkom' ? gamasPriceDataTelkom : gamasPriceDataMitra;
        
        if (!priceData || priceData.length === 0) {
            throw new Error(`Sumber data harga untuk "${priceSource}" tidak ditemukan atau kosong.`);
        }

        const priceMap = new Map<string, GamasPriceItem>();
        priceData.forEach(p => {
          if (p.code) {
            priceMap.set(normalizeCode(p.code), p);
          }
        });

        const pivotedData: Record<string, any> = {};
        const sto = report.sto || 'KUD';
        const ticketHeader = `${sto} (${report.noTiket || 'TANPA_TIKET'})`;

        (report.evidences || []).forEach(evidence => {
            const cleanEvidenceDesignator = normalizeCode(evidence.designator);
            
            if (!pivotedData[cleanEvidenceDesignator]) {
                const priceInfo = priceMap.get(cleanEvidenceDesignator);
                pivotedData[cleanEvidenceDesignator] = {
                    designator: evidence.designator,
                    uraian: priceInfo?.description || 'N/A',
                    satuan: priceInfo?.unit || 'N/A',
                    hargaMaterial: priceInfo?.materialPrice || 0,
                    hargaJasa: priceInfo?.servicePrice || 0,
                    totalVol: 0,
                    ticketVols: {}
                };
            }
            
            const vol = evidence.quantity || 1;
            pivotedData[cleanEvidenceDesignator].totalVol += vol;
            pivotedData[cleanEvidenceDesignator].ticketVols[ticketHeader] = (pivotedData[cleanEvidenceDesignator].ticketVols[ticketHeader] || 0) + vol;
        });

        const staticHeaders = [
            'NO', 'DESIGNATOR', 'URAIAN PEKERJAAN', 'SATUAN',
            'HARGA SATUAN MATERIAL', 'HARGA SATUAN JASA', 'VOL'
        ];
        const finalHeaders = [
            'TOTAL HARGA MATERIAL', 'TOTAL HARGA JASA', 'TOTAL'
        ];
        const excelHeaders = [...staticHeaders, ticketHeader, ...finalHeaders];

        const dataToExport: any[] = [];
        let itemCounter = 1;
        const sortedDesignators = Object.keys(pivotedData).sort();

        sortedDesignators.forEach(designatorCode => {
            const item = pivotedData[designatorCode];
            const totalHargaMaterial = item.hargaMaterial * item.totalVol;
            const totalHargaJasa = item.hargaJasa * item.totalVol;
            const total = totalHargaMaterial + totalHargaJasa;

            const row: any = {
                'NO': itemCounter++,
                'DESIGNATOR': item.designator,
                'URAIAN PEKERJAAN': item.uraian,
                'SATUAN': item.satuan,
                'HARGA SATUAN MATERIAL': item.hargaMaterial,
                'HARGA SATUAN JASA': item.hargaJasa,
                'VOL': item.totalVol,
                'TOTAL HARGA MATERIAL': totalHargaMaterial,
                'TOTAL HARGA JASA': totalHargaJasa,
                'TOTAL': total,
                [ticketHeader]: item.ticketVols[ticketHeader] || '',
            };

            dataToExport.push(row);
        });

        const grandTotals = {
            vol: dataToExport.reduce((acc, row) => acc + (row['VOL'] || 0), 0),
            material: dataToExport.reduce((acc, row) => acc + (row['TOTAL HARGA MATERIAL'] || 0), 0),
            jasa: dataToExport.reduce((acc, row) => acc + (row['TOTAL HARGA JASA'] || 0), 0),
            total: dataToExport.reduce((acc, row) => acc + (row['TOTAL'] || 0), 0),
        };
        
        dataToExport.push({}); // Spacer row
        dataToExport.push({ 'NO': '', 'DESIGNATOR': 'MATERIAL', 'TOTAL HARGA MATERIAL': grandTotals.material });
        dataToExport.push({ 'NO': '', 'DESIGNATOR': 'JASA', 'TOTAL HARGA JASA': grandTotals.jasa });
        dataToExport.push({ 'NO': '', 'DESIGNATOR': 'TOTAL', 'TOTAL': grandTotals.total });
        
        const grandTotalRow: any = {
            'NO': '',
            'DESIGNATOR': 'GRAND TOTAL',
            'VOL': grandTotals.vol,
            'TOTAL HARGA MATERIAL': grandTotals.material,
            'TOTAL HARGA JASA': grandTotals.jasa,
            'TOTAL': grandTotals.total
        };
        dataToExport.push(grandTotalRow);
        
        const worksheet = XLSX.utils.json_to_sheet(dataToExport, { header: excelHeaders });
        
        const colWidths = excelHeaders.map(header => ({
            width: Math.max(header.length, ...dataToExport.map(row => String(row[header] ?? '').length)) + 2
        }));
        worksheet['!cols'] = colWidths;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, `BoQ ${report.noTiket}`);
        
        XLSX.writeFile(workbook, `BoQ_${report.noTiket}_(${priceSource}).xlsx`);
        
        toast({ title: 'Ekspor BoQ Berhasil', description: `File BoQ untuk tiket ${report.noTiket} telah diunduh.` });

    } catch (error: any) {
         toast({ variant: 'destructive', title: 'Gagal Mengekspor BoQ', description: error.message });
    } finally {
        setIsExporting(false);
    }
  };


  const handleExportExcel = async (priceSource: 'telkom' | 'mitra') => {
    setIsExporting(true);
    const approvedReports = allReports?.filter(r => r.status === 'approved');

    if (!approvedReports || approvedReports.length === 0) {
      toast({ variant: 'destructive', title: 'Tidak ada data', description: 'Tidak ada laporan yang berstatus "approved" untuk diekspor.' });
      setIsExporting(false);
      return;
    }

    try {
        const XLSX = await import('xlsx');
        const priceData = priceSource === 'telkom' ? gamasPriceDataTelkom : gamasPriceDataMitra;

        if (!priceData || priceData.length === 0) {
            throw new Error(`Sumber data harga untuk "${priceSource}" tidak ditemukan atau kosong.`);
        }
        
        const priceMap = new Map<string, GamasPriceItem>();
        priceData.forEach(p => {
          if (p.code) {
            priceMap.set(normalizeCode(p.code), p);
          }
        });
        
        const pivotedData: Record<string, any> = {};
        const ticketColumns = new Set<string>();

        approvedReports.forEach(report => {
            const sto = report.sto || 'KUD';
            const ticketHeader = `${sto} (${report.noTiket || 'TANPA_TIKET'})`;
            ticketColumns.add(ticketHeader);

            (report.evidences || []).forEach(evidence => {
                const cleanEvidenceDesignator = normalizeCode(evidence.designator);
                
                if (!pivotedData[cleanEvidenceDesignator]) {
                    const priceInfo = priceMap.get(cleanEvidenceDesignator);
                    pivotedData[cleanEvidenceDesignator] = {
                        designator: evidence.designator,
                        uraian: priceInfo?.description || 'N/A',
                        satuan: priceInfo?.unit || 'N/A',
                        hargaMaterial: priceInfo?.materialPrice || 0,
                        hargaJasa: priceInfo?.servicePrice || 0,
                        totalVol: 0,
                        ticketVols: {}
                    };
                }
                
                const vol = evidence.quantity || 1;
                pivotedData[cleanEvidenceDesignator].totalVol += vol;
                pivotedData[cleanEvidenceDesignator].ticketVols[ticketHeader] = (pivotedData[cleanEvidenceDesignator].ticketVols[ticketHeader] || 0) + vol;
            });
        });

        const sortedTicketColumns = Array.from(ticketColumns).sort();
        const staticHeaders = [
            'NO', 'DESIGNATOR', 'URAIAN PEKERJAAN', 'SATUAN',
            'HARGA SATUAN MATERIAL', 'HARGA SATUAN JASA', 'VOL'
        ];
        const finalHeaders = [
            'TOTAL HARGA MATERIAL', 'TOTAL HARGA JASA', 'TOTAL'
        ];
        const excelHeaders = [...staticHeaders, ...sortedTicketColumns, ...finalHeaders];

        const dataToExport: any[] = [];
        let itemCounter = 1;
        const sortedDesignators = Object.keys(pivotedData).sort();

        sortedDesignators.forEach(designatorCode => {
            const item = pivotedData[designatorCode];
            const totalHargaMaterial = item.hargaMaterial * item.totalVol;
            const totalHargaJasa = item.hargaJasa * item.totalVol;
            const total = totalHargaMaterial + totalHargaJasa;

            const row: any = {
                'NO': itemCounter++,
                'DESIGNATOR': item.designator,
                'URAIAN PEKERJAAN': item.uraian,
                'SATUAN': item.satuan,
                'HARGA SATUAN MATERIAL': item.hargaMaterial,
                'HARGA SATUAN JASA': item.hargaJasa,
                'VOL': item.totalVol,
                'TOTAL HARGA MATERIAL': totalHargaMaterial,
                'TOTAL HARGA JASA': totalHargaJasa,
                'TOTAL': total,
            };

            sortedTicketColumns.forEach(ticketHeader => {
                row[ticketHeader] = item.ticketVols[ticketHeader] || '';
            });

            dataToExport.push(row);
        });

        const grandTotals = {
            vol: dataToExport.reduce((acc, row) => acc + (row['VOL'] || 0), 0),
            material: dataToExport.reduce((acc, row) => acc + (row['TOTAL HARGA MATERIAL'] || 0), 0),
            jasa: dataToExport.reduce((acc, row) => acc + (row['TOTAL HARGA JASA'] || 0), 0),
            total: dataToExport.reduce((acc, row) => acc + (row['TOTAL'] || 0), 0),
        };
        
        dataToExport.push({}); // Spacer row
        dataToExport.push({ 'NO': '', 'DESIGNATOR': 'MATERIAL', 'TOTAL HARGA MATERIAL': grandTotals.material });
        dataToExport.push({ 'NO': '', 'DESIGNATOR': 'JASA', 'TOTAL HARGA JASA': grandTotals.jasa });
        dataToExport.push({ 'NO': '', 'DESIGNATOR': 'TOTAL', 'TOTAL': grandTotals.total });
        
        const grandTotalRow: any = {
            'NO': '',
            'DESIGNATOR': 'GRAND TOTAL',
            'VOL': grandTotals.vol,
            'TOTAL HARGA MATERIAL': grandTotals.material,
            'TOTAL HARGA JASA': grandTotals.jasa,
            'TOTAL': grandTotals.total
        };
        dataToExport.push(grandTotalRow);
        
        const worksheet = XLSX.utils.json_to_sheet(dataToExport, { header: excelHeaders });
        
        const colWidths = excelHeaders.map(header => ({
            width: Math.max(header.length, ...dataToExport.map(row => String(row[header] ?? '').length)) + 2
        }));
        worksheet['!cols'] = colWidths;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Gamas Approved');
        
        const dateString = format(new Date(), 'yyyy-MM-dd');
        XLSX.writeFile(workbook, `Rekap_Gamas_Approved_(${priceSource})_${dateString}.xlsx`);
        
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button disabled={isExporting}>
                        {isExporting ? <Loader2 className="mr-2 animate-spin" /> : <FileSpreadsheet className="mr-2" />}
                        Download Rekap
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuLabel>Pilih Sumber Harga</DropdownMenuLabel>
                    <DropdownMenuItem onSelect={() => handleExportExcel('telkom')}>Telkom - TA</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleExportExcel('mitra')}>TA - Mitra</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" size="sm" className="mr-2" disabled={isExporting || report.status !== 'approved'}>
                                                    Download BoQ
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuLabel>Pilih Sumber Harga</DropdownMenuLabel>
                                                <DropdownMenuItem onSelect={() => handleExportBoQ(report, 'telkom')}>Telkom - TA</DropdownMenuItem>
                                                <DropdownMenuItem onSelect={() => handleExportBoQ(report, 'mitra')}>TA - Mitra</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                          
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
