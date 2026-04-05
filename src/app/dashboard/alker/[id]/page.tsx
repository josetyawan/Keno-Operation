
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { format, isValid } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Check, X, Wrench, Printer, FileSpreadsheet, Loader2 } from 'lucide-react';
import type { AlkerChecklist, UserProfile } from '@/lib/types';
import { useMemo, useState } from 'react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

const safeToDate = (timestamp: any): Date | null => {
  if (!timestamp) return null;
  if (timestamp.toDate) return timestamp.toDate();
  if (timestamp instanceof Date && isValid(timestamp)) return timestamp;
  const d = new Date(timestamp);
  return isValid(d) ? d : null;
};

function PhotoViewer({ url, label }: { url?: string; label: string }) {
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
        <Image src={url} alt={label} fill className="object-cover" />
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

export default function AlkerDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const checklistRef = useMemoFirebase(() => doc(firestore, 'tool-checklists', id), [firestore, id]);
  const { data: checklist, isLoading } = useDoc<AlkerChecklist>(checklistRef);

  const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  const canView = useMemo(() => {
    if (!userProfile || !checklist || !user) return false;
    if (userProfile.role === 'admin' || userProfile.role === 'korlap') return true;
    return checklist.userId === user?.uid;
  }, [userProfile, checklist, user]);

  const handlePrint = () => {
    window.print();
  };
  
  const dateSubmitted = safeToDate(checklist?.dateSubmitted);

  const handleExportExcel = async () => {
    if (!checklist || !dateSubmitted) {
        toast({
            variant: "destructive",
            title: "Data tidak tersedia",
            description: "Tidak ada data untuk diekspor.",
        });
        return;
    }

    setIsExporting(true);
    try {
        const XLSX = await import('xlsx');

        const headerInfo = [
            { A: 'Laporan Pengecekan Alat Kerja' },
            { A: '' },
            { A: 'Nama Teknisi', B: checklist.userName },
            { A: 'Jabatan', B: checklist.userJabatan },
            { A: 'Unit', B: checklist.userUnit || '-' },
            { A: 'Rekan Kerja', B: checklist.crewUserName || '-' },
            { A: 'Tanggal Laporan', B: format(dateSubmitted, 'dd MMMM yyyy, HH:mm', { locale: idLocale }) },
            { A: '' },
        ];

        const dataToExport = checklist.tools.map((tool, index) => ({
            'No': index + 1,
            'Nama Alat': tool.toolName,
            'Kondisi': tool.condition,
            'Merek/Tipe': tool.brand || '-',
            'Serial Number': tool.serialNumber || '-',
        }));

        const ws = XLSX.utils.json_to_sheet([]);
        XLSX.utils.sheet_add_json(ws, headerInfo, { skipHeader: true, origin: 'A1' });
        XLSX.utils.sheet_add_json(ws, dataToExport, { origin: `A${headerInfo.length + 1}` });

        const colWidths = [
            { wch: 5 }, // No
            { wch: 60 }, // Nama Alat
            { wch: 15 }, // Kondisi
            { wch: 25 }, // Merek/Tipe
            { wch: 25 }, // Serial Number
        ];
        ws['!cols'] = colWidths;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Pengecekan Alker');
        
        const fileName = `Alker_${checklist.userName.replace(/ /g, '_')}_${format(dateSubmitted, 'yyyyMMdd')}.xlsx`;
        XLSX.writeFile(wb, fileName);
        
        toast({
            title: "Ekspor Berhasil",
            description: "Laporan pengecekan alker telah diunduh sebagai file Excel.",
        });

    } catch (error) {
        console.error("Failed to export Excel:", error);
        toast({
            variant: "destructive",
            title: "Gagal Mengekspor",
            description: "Terjadi kesalahan saat membuat file Excel.",
        });
    } finally {
        setIsExporting(false);
    }
  };

  if (isLoading) {
    return <div className="mx-auto grid max-w-4xl flex-1 auto-rows-max gap-6"><Skeleton className="h-10 w-full" /><Skeleton className="h-[500px] w-full" /></div>;
  }

  if (!checklist || !canView) {
    return (
      <div className="text-center py-10">
        <h2 className="text-xl font-semibold">Laporan Tidak Ditemukan</h2>
        <p className="text-muted-foreground mt-2">Laporan yang Anda cari tidak ada atau Anda tidak memiliki izin untuk melihatnya.</p>
        <Button onClick={() => router.back()} className="mt-4"><ArrowLeft className="mr-2" /> Kembali</Button>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          body > #main-dashboard-layout > div:first-child,
          body > #main-dashboard-layout > div:last-child > header,
          .no-print {
            display: none !important;
          }
          body > #main-dashboard-layout > div:last-child > main {
            padding: 0 !important;
            margin: 0 !important;
          }
          @page {
            margin: 0.5in;
          }
        }
      `}</style>
      <div className="mx-auto grid max-w-5xl flex-1 auto-rows-max gap-6" id="printable-area">
        <div className="flex items-center gap-4 no-print">
          <Button onClick={() => router.back()} variant="outline" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Kembali</span>
          </Button>
          <div>
            <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-bold tracking-tight sm:grow-0">
              Detail Pengecekan Alker
            </h1>
            <p className="text-muted-foreground text-sm">
              Dikirim oleh {checklist.userName} pada {dateSubmitted ? format(dateSubmitted, 'dd MMMM yyyy, HH:mm', { locale: idLocale }) : ''}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button onClick={handleExportExcel} disabled={isExporting} variant="outline">
              {isExporting ? <Loader2 className="mr-2 animate-spin" /> : <FileSpreadsheet className="mr-2" />}
              Download Excel
            </Button>
            <Button onClick={handlePrint} variant="outline">
              <Printer className="mr-2" />
              Cetak
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informasi Teknisi</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-4 gap-4 text-sm">
            <div><p className="text-muted-foreground">Teknisi Utama</p><p className="font-medium">{checklist.userName}</p></div>
            <div><p className="text-muted-foreground">Jabatan</p><p><Badge variant="secondary">{checklist.userJabatan}</Badge></p></div>
            <div><p className="text-muted-foreground">Unit</p><p>{checklist.userUnit || '-'}</p></div>
            <div><p className="text-muted-foreground">Rekan Kerja (Crew)</p><p className="font-medium">{checklist.crewUserName || '-'}</p></div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
              <CardTitle className="flex items-center gap-2"><Wrench /> Detail Alat Kerja</CardTitle>
              <CardDescription>Daftar alat kerja yang diperiksa dalam laporan ini.</CardDescription>
          </CardHeader>
          <CardContent>
              <div className="space-y-4">
              {checklist.tools.map((tool, index) => (
                  <Card key={index} className="overflow-hidden print-break-inside-avoid">
                      <CardHeader className="flex flex-row items-center justify-between bg-muted/50 p-4">
                          <CardTitle className="text-base">{tool.toolName}</CardTitle>
                          {tool.condition === 'baik' ? 
                              <Badge variant="outline" className="text-green-600 border-green-600"><Check className="mr-1 h-3 w-3"/> Baik</Badge> : 
                              tool.condition === 'rusak' ?
                              <Badge variant="destructive"><X className="mr-1 h-3 w-3"/> Rusak</Badge> :
                              <Badge variant="secondary">Tidak Punya</Badge>
                          }
                      </CardHeader>
                      <CardContent className="p-4 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="text-sm">
                              <p className="text-muted-foreground">Merek / Tipe</p>
                              <p>{tool.brand || '-'}</p>
                          </div>
                           <div className="text-sm">
                              <p className="text-muted-foreground">Serial Number</p>
                              <p>{tool.serialNumber || '-'}</p>
                          </div>
                          <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                               <div>
                                  <p className="text-muted-foreground text-sm mb-1">Foto Alat</p>
                                  <PhotoViewer url={tool.photoUrl1} label={`Foto ${tool.toolName}`} />
                              </div>
                              {tool.photoUrl2 && (
                                  <div>
                                      <p className="text-muted-foreground text-sm mb-1">Foto S/N</p>
                                      <PhotoViewer url={tool.photoUrl2} label={`Foto SN ${tool.toolName}`} />
                                  </div>
                              )}
                          </div>
                      </CardContent>
                  </Card>
              ))}
              </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
