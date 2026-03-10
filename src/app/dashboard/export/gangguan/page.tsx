'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ArrowLeft, Calendar as CalendarIcon, Loader2, Files } from 'lucide-react';
import { useUser, useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, where, Timestamp } from 'firebase/firestore';
import { format, startOfDay, endOfDay, isValid } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { RiwayatGangguan, UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';
import { useToast } from '@/hooks/use-toast';
import { generateDocxAction } from '@/app/dashboard/export/actions';

const safeToDate = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (timestamp.toDate) return timestamp.toDate();
    if (timestamp instanceof Date && isValid(timestamp)) return timestamp;
    const d = new Date(timestamp);
    return isValid(d) ? d : null;
};

function ReportPreview({
  html,
  onClose,
  onPrint,
}: {
  html: string;
  onClose: () => void;
  onPrint: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex justify-center items-center p-4">
      <Card className="w-full max-w-7xl h-[90vh] flex flex-col">
        <CardHeader className="print-hidden flex flex-row items-center justify-between">
          <CardTitle>Pratinjau Dokumen Eviden</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Tutup</Button>
            <Button onClick={onPrint}>Cetak Dokumen</Button>
          </div>
        </CardHeader>
        <CardContent id="print-section" className="flex-grow overflow-auto bg-gray-200 p-4">
          <div className="mx-auto flex flex-col items-center gap-y-4">
            <div
                className="printable-page bg-white shadow-lg page-is-portrait"
                style={{
                  width: '210mm',
                  minHeight: '297mm',
                  padding: '1.5cm',
                  boxSizing: 'border-box'
                }}
                dangerouslySetInnerHTML={{ __html: html }}
              />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


export default function ExportGangguanPage() {
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();
    const router = useRouter();
    const { toast } = useToast();

    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [selectedReportIds, setSelectedReportIds] = useState<string[]>([]);
    const [reportHtml, setReportHtml] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(false);
    
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(
        useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore])
    );
    const isAdminOrKorlap = userProfile?.role === 'admin' || userProfile?.role === 'korlap';

    const reportsQuery = useMemoFirebase(() => {
        if (!dateRange?.from || !dateRange.to) return null;
        if (!isAdminOrKorlap) return null;
        
        const start = startOfDay(dateRange.from);
        const end = endOfDay(dateRange.to);
        
        return query(
            collection(firestore, 'riwayat-gangguan'),
            where('tanggalLapor', '>=', Timestamp.fromDate(start)),
            where('tanggalLapor', '<=', Timestamp.fromDate(end)),
            orderBy('tanggalLapor', 'desc')
        );
    }, [firestore, dateRange, isAdminOrKorlap]);
    
    const { data: reports, isLoading: isLoadingReports } = useCollection<RiwayatGangguan>(reportsQuery);

    const isLoading = isUserLoading || isProfileLoading || isLoadingReports;

    const handleSelectReport = (id: string, checked: boolean) => {
        setSelectedReportIds(prev =>
            checked ? [...prev, id] : prev.filter(reportId => reportId !== id)
        );
    };

    const handleSelectAll = (checked: boolean) => {
        setSelectedReportIds(checked && reports ? reports.map(report => report.id) : []);
    };
    
    const isAllSelected = reports && reports.length > 0 && selectedReportIds.length === reports.length;

    const generateReport = async () => {
        if (selectedReportIds.length === 0) {
            toast({ variant: "destructive", title: "Tidak ada laporan dipilih" });
            return;
        }
        setIsGenerating(true);

        const selectedReports = reports?.filter(r => selectedReportIds.includes(r.id)) || [];
        
        const evidenceByCategory: Record<string, {noTiket: string, url: string, keterangan: string}[]> = {};

        selectedReports.forEach(report => {
            // Eviden SCC
            if (report.evidenSccUrl) {
                if (!evidenceByCategory['EVIDENT SCC']) evidenceByCategory['EVIDENT SCC'] = [];
                evidenceByCategory['EVIDENT SCC'].push({
                    noTiket: report.noTiket || report.noService,
                    url: report.evidenSccUrl,
                    keterangan: 'SCC DONE'
                });
            }

            // Material Evidences
            report.materials?.forEach(material => {
                material.evidences?.forEach(eviden => {
                    const categoryName = `EVIDENT ${material.materialName} - ${eviden.evidenceName}`.toUpperCase();
                    if (!evidenceByCategory[categoryName]) evidenceByCategory[categoryName] = [];
                    evidenceByCategory[categoryName].push({
                        noTiket: report.noTiket || report.noService,
                        url: eviden.photoUrl,
                        keterangan: material.materialName
                    });
                });
            });
        });

        let fullHtml = '';

        for (const category in evidenceByCategory) {
            const items = evidenceByCategory[category];
            fullHtml += `<h2 style="font-size: 16pt; font-weight: bold; text-align: center; margin-top: 20px; page-break-before: always;">REKAP ${category}</h2>`;
            fullHtml += `
                <table style="width: 100%; border-collapse: collapse; font-size: 10pt; margin-top: 10px;">
                    <thead style="background-color: #FFFF00; font-weight: bold; text-align: center;">
                        <tr>
                            <th style="border: 1px solid black; padding: 5px;">NO TIKET</th>
                            <th style="border: 1px solid black; padding: 5px;">EVIDENT</th>
                            <th style="border: 1px solid black; padding: 5px;">KETERANGAN</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            items.forEach(item => {
                fullHtml += `
                    <tr>
                        <td style="border: 1px solid black; padding: 5px; vertical-align: top; text-align: center;">${item.noTiket}</td>
                        <td style="border: 1px solid black; padding: 5px; text-align: center;">
                            <img src="${item.url}" style="max-width: 250px; height: auto; margin: auto;" />
                        </td>
                        <td style="border: 1px solid black; padding: 5px; vertical-align: top; text-align: center;">${item.keterangan}</td>
                    </tr>
                `;
            });
            fullHtml += '</tbody></table>';
        }
        
        setReportHtml(fullHtml);
        setIsGenerating(false);
    };

    const handlePrint = async () => {
        try {
            const base64 = await generateDocxAction(reportHtml, { orientation: 'portrait' });
            const byteCharacters = atob(base64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            const dateString = format(new Date(), 'yyyy-MM-dd');
            link.download = `Rekap_Eviden_Gangguan_${dateString}.docx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            toast({ title: 'Dokumen Berhasil Dibuat', description: 'File Word telah diunduh.' });
            
        } catch (error) {
            console.error('Error creating document', error);
            toast({ variant: 'destructive', title: 'Gagal Membuat Dokumen' });
        }
    };

    return (
      <>
        <div className="mx-auto grid w-full flex-1 auto-rows-max gap-6">
          <div className="flex items-center gap-4">
              <Button onClick={() => router.back()} variant="outline" size="icon" className="h-8 w-8">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="sr-only">Kembali</span>
              </Button>
              <div>
                  <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-bold tracking-tight sm:grow-0">
                      Rekap Eviden Laporan Gangguan
                  </h1>
                  <p className="text-muted-foreground text-sm">
                      Pilih laporan gangguan untuk membuat rekapitulasi eviden.
                  </p>
              </div>
          </div>

          <Card>
              <CardHeader>
                  <CardTitle>Filter Laporan</CardTitle>
              </CardHeader>
              <CardContent>
                  <Popover>
                      <PopoverTrigger asChild>
                          <Button id="date" variant={"outline"} className={cn("w-full max-w-sm justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {dateRange?.from ? (
                                  dateRange.to ? (
                                      <>{format(dateRange.from, "dd LLL, yy", {locale: idLocale})} - {format(dateRange.to, "dd LLL, yy", {locale: idLocale})}</>
                                  ) : (format(dateRange.from, "dd LLL, yy"))
                              ) : (<span>Pilih rentang tanggal</span>)}
                          </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                          <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} />
                      </PopoverContent>
                  </Popover>
              </CardContent>
          </Card>

          <div>
              <div className="flex items-center gap-4 mb-4">
                  <Checkbox id="select-all" onCheckedChange={handleSelectAll} checked={isAllSelected} />
                  <Label htmlFor="select-all">Pilih Semua ({reports?.length || 0} laporan)</Label>
                  <Button variant="outline" size="sm" onClick={() => setSelectedReportIds([])} disabled={selectedReportIds.length === 0}>
                      Hapus Pilihan
                  </Button>
                  <div className="ml-auto text-sm text-muted-foreground">
                      {selectedReportIds.length} dipilih
                  </div>
              </div>
              <Card>
                  <CardHeader>
                      <CardTitle>Data Laporan</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                      {isLoading && Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                      {!isLoading && reports && reports.length > 0 ? (
                          reports.map(report => (
                              <Card key={report.id} className="p-3 hover:bg-muted/50 transition-colors">
                                  <div className="flex items-center gap-4">
                                      <Checkbox
                                          checked={selectedReportIds.includes(report.id)}
                                          onCheckedChange={(checked) => handleSelectReport(report.id, !!checked)}
                                      />
                                      <div className="flex-grow min-w-0">
                                          <p className="font-medium truncate">{report.noTiket || report.noService}</p>
                                          <p className="text-sm text-muted-foreground">
                                              {report.namaPetugas} - {safeToDate(report.tanggalLapor) ? format(safeToDate(report.tanggalLapor)!, 'dd MMM yyyy', { locale: idLocale }) : '-'}
                                          </p>
                                      </div>
                                  </div>
                              </Card>
                          ))
                      ) : (
                          <div className="text-center py-10 text-muted-foreground">
                              {!dateRange?.from ? 'Pilih rentang tanggal untuk menampilkan laporan.' : 'Tidak ada laporan ditemukan.'}
                          </div>
                      )}
                  </CardContent>
              </Card>
          </div>

          <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm py-3 mt-auto border-t -mx-6 px-6">
              <div className="max-w-5xl mx-auto flex justify-center items-center gap-4">
                  <Button size="lg" onClick={generateReport} disabled={isGenerating || selectedReportIds.length === 0}>
                      {isGenerating ? <Loader2 className="mr-2 animate-spin"/> : <Files className="mr-2" />}
                      Buat Dokumen Eviden
                  </Button>
              </div>
          </div>
        </div>
        {reportHtml && (
            <ReportPreview 
                html={reportHtml} 
                onClose={() => setReportHtml('')} 
                onPrint={handlePrint}
            />
        )}
      </>
    );
}
