

'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ArrowLeft, Edit, Trash2, Filter, FileArchive, Printer, Calendar as CalendarIcon, Loader2, Files, FileSpreadsheet } from 'lucide-react';
import { useUser, useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { format, getMonth, getYear, startOfDay, endOfDay, isValid } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { Nota, ProjectID, UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge, badgeVariants } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';
import { useToast } from '@/hooks/use-toast';
import { toWords } from '@/lib/number-to-words';
import Image from 'next/image';
import type { VariantProps } from 'class-variance-authority';
import { useRouter } from 'next/navigation';
import { AlertDialogTrigger } from '@/components/ui/alert-dialog';


type ProjectType = 'B2B IOAN' | 'PROVISIONING' | 'SPPG' | 'BBM GENSET' | 'Lainnya' | 'WAREHOUSE';

const safeToDate = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (timestamp.toDate) return timestamp.toDate();
    if (timestamp instanceof Date && isValid(timestamp)) return timestamp;
    const d = new Date(timestamp);
    return isValid(d) ? d : null;
};


const getProjectType = (segmen: string): ProjectType => {
    if (segmen.includes('SPPG')) return 'SPPG';
    if (segmen.includes('B2B IOAN')) return 'B2B IOAN';
    if (segmen.includes('PROVISIONING')) return 'PROVISIONING';
    if (segmen === 'BBM Genset') return 'BBM GENSET';
    if (segmen === 'ISI PANTRY' || segmen === 'Perincian Nota ATK') return 'PROVISIONING';
    return 'Lainnya';
};

const getGeneralReportName = (segmen: string): string => {
    const cleanedSegmen = segmen.toLowerCase();

    if (cleanedSegmen.includes('bbm r2')) return 'BBM R2 Operasional';
    if (cleanedSegmen.includes('bbm r4')) return 'BBM R4 Operasional';
    if (cleanedSegmen.includes('pengiriman')) return 'Jasa Ekspedisi (POS/JNE/J&T dll)';
    if (cleanedSegmen.includes('jasa')) return 'Perincian Jasa Lain-lain';
    if (cleanedSegmen.includes('konsumsi')) return 'Perincian Nota Konsumsi';
    if (cleanedSegmen.includes('material non stok')) return 'Perincian Nota Material Non Stok';
    if (cleanedSegmen.includes('atk')) return 'Perincian Nota ATK';
    if (cleanedSegmen.includes('pantry')) return 'Perincian Nota Isi Pantry';
    if (cleanedSegmen.includes('genset')) return 'Perincian BBM Genset';
    if (cleanedSegmen.includes('sppg')) return 'Perincian Material SPPG';
    
    return segmen; // Fallback to the original segment name
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


const bbmR2R4Segments = [
    'BBM R2 Harian B2B IOAN', 'BBM R2 Harian PROVISIONING',
    'BBM R4 Harian B2B IOAN', 'BBM R4 Harian PROVISIONING',
    'BBM R4 Turlap B2B IOAN', 'BBM R4 Turlap PROVISIONING',
    'BBM R4 UT B2B IOAN', 'BBM R4 UT PROVISIONING',
    'BBM R4 Pengiriman Warehouse',
];
const jasaSegments = ['Jasa B2B IOAN', 'Jasa PROVISIONING', 'Perincian Nota Pengiriman B2B IOAN', 'Perincian Nota Pengiriman PROVISIONING'];

// --- Report Generation Logic ---

const generateImprestFundCover = (notas: Nota[], serviceArea: string, projectType: ProjectType, pids: ProjectID[]): string => {
    const today = new Date();
    const firstNotaDate = (notas.length > 0) ? safeToDate(notas[0].tanggal) : null;
    
    const formattedDate = format(today, 'dd/MM/yyyy');
    
    const periodDate = firstNotaDate || today;
    const monthName = format(periodDate, 'MMM', { locale: idLocale });
    
    const saShort = serviceArea.replace('SA ', '');
    const projectName = `IF JATENG - SMG OPR - Ops SA ${saShort} (${monthName})`;
    
    const idProjectForSummary = pids.find(p => p.projectType.toLowerCase() === projectType.toLowerCase())?.pid || (projectType === 'BBM GENSET' ? 'Ditagihkan ke Unit Lain' : '-');

    const groupedByKeterangan = notas.reduce((acc, nota) => {
        const key = getGeneralReportName(nota.segmen);
        if (!acc[key]) {
            acc[key] = { total: 0, firstNota: nota };
        }
        acc[key].total += nota.nominal;
        if ((safeToDate(nota.tanggal)?.getTime() ?? Infinity) < (safeToDate(acc[key].firstNota.tanggal)?.getTime() ?? Infinity)) {
            acc[key].firstNota = nota;
        }
        return acc;
    }, {} as Record<string, { total: number, firstNota: Nota }>);


    let grandTotal = 0;
    const tableRows = Object.entries(groupedByKeterangan).map(([keterangan, data], index) => {
        grandTotal += data.total;
        
        const earliestDate = safeToDate(data.firstNota.tanggal);
        const nominalFormatted = data.total.toLocaleString('id-ID');
        
        const segmenProjectType = getProjectType(data.firstNota.segmen);
        
        const idProjectForRow = pids.find(p => p.projectType.toLowerCase() === segmenProjectType.toLowerCase())?.pid || '-';

        return `
            <tr style="font-size: 8pt;">
                <td style="border: 1px solid black; padding: 2px 4px; text-align: center;">${index + 1}</td>
                <td style="border: 1px solid black; padding: 2px 4px; text-align: center;">${earliestDate ? format(earliestDate, 'dd/MM/yyyy') : '-'}</td>
                <td style="border: 1px solid black; padding: 2px 4px; text-align: center;">${index + 1}</td>
                <td style="border: 1px solid black; padding: 2px 4px;">${keterangan}</td>
                <td style="border: 1px solid black; padding: 2px 4px; text-align: center;">${idProjectForRow}</td>
                <td style="border: 1px solid black; padding: 2px 4px; text-align: center;">-</td>
                <td style="border: 1px solid black; padding: 2px 4px; text-align: right;">${nominalFormatted}</td>
                <td style="border: 1px solid black; padding: 2px 4px; text-align: center;">-</td>
                <td style="border: 1px solid black; padding: 2px 4px; text-align: right;">${nominalFormatted}</td>
                <td style="border: 1px solid black; padding: 2px 4px; text-align: center;">-</td>
                <td style="border: 1px solid black; padding: 2px 4px; text-align: right;">${nominalFormatted}</td>
            </tr>
        `;
    }).join('');

    const docInfoBlock = `
    <table style="width: 100%; font-size: 8pt; margin-top: 20px;">
        <tr>
            <td style="width: 50%; vertical-align: top;">
                <table style="font-size: 8pt;">
                    <tr><td style="white-space: nowrap;">No. Dokumen</td><td>:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/KU/TA-0203/SMG/02-2026</td></tr>
                    <tr><td style="white-space: nowrap;">Berkas diterima tanggal</td><td>: ${formattedDate}</td></tr>
                    <tr><td style="white-space: nowrap;">Berkas lengkap tanggal</td><td>: ${formattedDate}</td></tr>
                </table>
            </td>
            <td style="width: 50%; vertical-align: top;">
                <table style="width: 100%; font-size: 8pt; border-collapse: collapse; border: 1px solid black;">
                    <thead style="background-color: #DDEEFF; font-weight: bold; text-align: center; print-color-adjust: exact; -webkit-print-color-adjust: exact;">
                        <tr>
                            <th style="border: 1px solid black; padding: 2px;">No.</th>
                            <th style="border: 1px solid black; padding: 2px;">ID PROJECT</th>
                            <th style="border: 1px solid black; padding: 2px;">AKUN</th>
                            <th style="border: 1px solid black; padding: 2px;">JUMLAH</th>
                            <th style="border: 1px solid black; padding: 2px;">PPN</th>
                            <th style="border: 1px solid black; padding: 2px;">NILAI KUITANSI</th>
                            <th style="border: 1px solid black; padding: 2px;">PPh</th>
                            <th style="border: 1px solid black; padding: 2px;">BAYAR KE MITRA</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="border: 1px solid black; padding: 2px; text-align: center;">1</td>
                            <td style="border: 1px solid black; padding: 2px; text-align: center;">${idProjectForSummary}</td>
                            <td style="border: 1px solid black; padding: 2px; text-align: center;">-</td>
                            <td style="border: 1px solid black; padding: 2px; text-align: right;">${grandTotal.toLocaleString('id-ID')}</td>
                            <td style="border: 1px solid black; padding: 2px; text-align: center;">-</td>
                            <td style="border: 1px solid black; padding: 2px; text-align: right;">${grandTotal.toLocaleString('id-ID')}</td>
                            <td style="border: 1px solid black; padding: 2px; text-align: center;">-</td>
                            <td style="border: 1px solid black; padding: 2px; text-align: right;">${grandTotal.toLocaleString('id-ID')}</td>
                        </tr>
                    </tbody>
                    <tfoot style="font-weight: bold; background-color: #DDEEFF; print-color-adjust: exact; -webkit-print-color-adjust: exact;">
                         <tr>
                            <td colspan="3" style="border: 1px solid black; padding: 2px; text-align: center;">JUMLAH</td>
                            <td style="border: 1px solid black; padding: 2px; text-align: right;">${grandTotal.toLocaleString('id-ID')}</td>
                            <td style="border: 1px solid black; padding: 2px; text-align: center;">-</td>
                            <td style="border: 1px solid black; padding: 2px; text-align: right;">${grandTotal.toLocaleString('id-ID')}</td>
                            <td style="border: 1px solid black; padding: 2px; text-align: center;">-</td>
                            <td style="border: 1px solid black; padding: 2px; text-align: right;">${grandTotal.toLocaleString('id-ID')}</td>
                        </tr>
                    </tfoot>
                </table>
            </td>
        </tr>
    </table>
    `;

    const signatureBlock = `
    <table style="width: 100%; font-size: 8pt; text-align: center; margin-top: 20px; border-collapse: collapse;">
        <tbody>
            <!-- Top row of signatories -->
            <tr>
                <td style="width: 33.3%;">Mengetahui<br/>Pemilik Anggaran,</td>
                <td style="width: 33.3%;">Mengetahui<br/>Pengelola IF / Panjar,</td>
                <td style="width: 33.3%;">Semarang, ${formattedDate}<br/>Dibuat/Diajukan oleh,</td>
            </tr>
            <tr>
                <td style="height: 60px;"></td>
                <td style="height: 60px;"></td>
                <td style="height: 60px;"></td>
            </tr>
            <tr>
                <td style="font-weight: bold; text-decoration: underline;">GALIH AJI KUSUMAH</td>
                <td style="font-weight: bold; text-decoration: underline;">MUHAMMAD IKSAN</td>
                <td style="font-weight: bold; text-decoration: underline;">DESSY WAHYUNINGTIAS</td>
            </tr>
            <tr>
                <td>MGR BRANCH SEMARANG</td>
                <td>MGR SHARED SERVICE REGIONAL JAWA TENGAH & DIY</td>
                <td>OFF3 BUSINESS SUPPORT SEMARANG</td>
            </tr>
            <tr><td colspan="3" style="height: 20px;"></td></tr>

            <!-- Bottom row of signatories -->
            <tr>
                <td>Menyetujui,<br/>Penanggung Jawab IF</td>
                <td></td>
                <td>Mengetahui<br/>Pengelola IF</td>
            </tr>
            <tr>
                <td style="height: 60px;"></td>
                <td></td>
                <td style="height: 60px;"></td>
            </tr>
            <tr>
                <td style="font-weight: bold; text-decoration: underline;">HENRY SOEDIDARMA</td>
                <td></td>
                <td style="font-weight: bold; text-decoration: underline;">ARIZA ARBAATUS SOLIHA</td>
            </tr>
            <tr>
                <td>GM REGIONAL JAWA TENGAH DIY</td>
                <td></td>
                <td>MGR BUSINESS SUPPORT AREA JAWA BALI</td>
            </tr>
            <tr>
                <td style="vertical-align: bottom; text-align: left; padding-top: 20px;">
                     <div style="border: 1px solid black; padding: 5px 40px 20px 10px; font-size: 8pt; display: inline-block;">
                        DOC ID :
                    </div>
                </td>
                <td></td>
                <td></td>
            </tr>
        </tbody>
    </table>
    `;

    return `
    <div style="font-family: Arial, sans-serif; color: black; font-size: 9pt; width: 100%; height: 100%; box-sizing: border-box; page-break-inside: avoid;">
        <div style="text-align: left; font-size: 11pt; font-weight: bold;">
            PT. TELKOM AKSES<br/>
            FINANCE REGIONAL JAWA BALI
        </div>
        <div style="text-align: center; font-size: 11pt; font-weight: bold; margin-top: 1rem; margin-bottom: 1rem;">
            REKAP PERTANGGUNGAN IMPREST FUND <span style="text-decoration: line-through;">/ PANJAR KERJA</span> *)
        </div>
        
        <table style="font-size: 8pt; margin-bottom: 1rem; width: 100%;">
            <tr><td style="width: 10%;">Unit Kerja</td><td>: Direktorat Operation</td></tr>
            <tr><td>Cost Center</td><td>: TA03J08 - Semarang</td></tr>
            <tr><td>Nama Project</td><td>: ${projectName}</td></tr>
        </table>

        <table style="width: 100%; border-collapse: collapse; font-size: 7pt;">
            <thead style="background-color: #DDEEFF; font-weight: bold; text-align: center; print-color-adjust: exact; -webkit-print-color-adjust: exact;">
                 <tr>
                    <th rowspan="2" style="border: 1px solid black; padding: 2px; vertical-align: middle;">No. Urut</th>
                    <th rowspan="2" style="border: 1px solid black; padding: 2px; vertical-align: middle;">TANGGAL</th>
                    <th rowspan="2" style="border: 1px solid black; padding: 2px; vertical-align: middle;">No. Kuitansi</th>
                    <th rowspan="2" style="border: 1px solid black; padding: 2px; vertical-align: middle; width: 20%;">URAIAN</th>
                    <th rowspan="2" style="border: 1px solid black; padding: 2px; vertical-align: middle;">ID PROJECT</th>
                    <th rowspan="2" style="border: 1px solid black; padding: 2px; vertical-align: middle;">No. Akun</th>
                    <th rowspan="2" style="border: 1px solid black; padding: 2px; vertical-align: middle;">NILAI PERTANGGUNGAN</th>
                    <th rowspan="2" style="border: 1px solid black; padding: 2px; vertical-align: middle;">PPN (Disetor Mitra)</th>
                    <th rowspan="2" style="border: 1px solid black; padding: 2px; vertical-align: middle;">NILAI KUITANSI</th>
                    <th style="border: 1px solid black; padding: 2px;">PPh<br/><span style="font-weight: normal;">PPh 21, 23, 4(2) *)</span></th>
                    <th rowspan="2" style="border: 1px solid black; padding: 2px; vertical-align: middle;">BAYAR KE MITRA</th>
                </tr>
            </thead>
            <tbody>
                ${tableRows}
            </tbody>
            <tfoot style="font-weight: bold; background-color: #DDEEFF; print-color-adjust: exact; -webkit-print-color-adjust: exact;">
                <tr style="font-size: 8pt;">
                    <td colspan="6" style="border: 1px solid black; padding: 2px 4px; text-align: center;">JUMLAH</td>
                    <td style="border: 1px solid black; padding: 2px 4px; text-align: right;">${grandTotal.toLocaleString('id-ID')}</td>
                    <td style="border: 1px solid black; padding: 2px 4px; text-align: center;">-</td>
                    <td style="border: 1px solid black; padding: 2px 4px; text-align: right;">${grandTotal.toLocaleString('id-ID')}</td>
                    <td style="border: 1px solid black; padding: 2px 4px; text-align: center;">-</td>
                    <td style="border: 1px solid black; padding: 2px 4px; text-align: right;">${grandTotal.toLocaleString('id-ID')}</td>
                </tr>
            </tfoot>
        </table>
        
        ${docInfoBlock}
        ${signatureBlock}
    </div>
    `;
};


const generateRekapitulasiReport = (notas: Nota[], serviceArea: string, projectType: ProjectType, pids: ProjectID[]): string => {
    const groupedByKeterangan = notas.reduce((acc, nota) => {
        const key = getGeneralReportName(nota.segmen);
        if (!acc[key]) {
            acc[key] = { items: [], total: 0 };
        }
        acc[key].items.push(nota);
        acc[key].total += nota.nominal;
        return acc;
    }, {} as Record<string, { items: Nota[], total: number }>);


    let grandTotalJumlah = 0;
    let grandTotalDpp = 0;
    let grandTotalPph = 0;

    const tableRows = Object.entries(groupedByKeterangan).map(([keterangan, data], index) => {
        const totalJumlahForSegmen = data.total;
        let dpp = totalJumlahForSegmen;
        let pph = 0;

        const isGroupJasa = keterangan === 'Perincian Jasa Lain-lain' || keterangan === 'Jasa Ekspedisi (POS/JNE/J&T dll)';

        if (isGroupJasa) {
            dpp = totalJumlahForSegmen / 1.02; // Reverse calculation from service charge
            pph = dpp * 0.02;
        }
        
        grandTotalJumlah += totalJumlahForSegmen;
        grandTotalDpp += dpp;
        grandTotalPph += pph;

        return `
            <tr style="print-color-adjust: exact; -webkit-print-color-adjust: exact;">
                <td style="padding: 4px 8px; border: 1px solid black; text-align: center;">${index + 1}</td>
                <td style="padding: 4px 8px; border: 1px solid black;">${keterangan}</td>
                <td style="padding: 4px 8px; border: 1px solid black; text-align: right;">Rp ${Math.round(dpp).toLocaleString('id-ID')}</td>
                <td style="padding: 4px 8px; border: 1px solid black; text-align: right;">${pph > 0 ? `Rp ${Math.round(pph).toLocaleString('id-ID')}` : '-'}</td>
                <td style="padding: 4px 8px; border: 1px solid black; text-align: right;">Rp ${totalJumlahForSegmen.toLocaleString('id-ID')}</td>
            </tr>
        `;
    }).join('');

    const today = new Date();
    const formattedDate = format(today, 'dd MMMM yyyy', { locale: idLocale });
    const terbilangText = toWords(grandTotalJumlah);

    let saShort = serviceArea.replace('SA ', '');
    let pekerjaan = saShort;
    
    let idProject = pids.find(p => p.projectType.toLowerCase() === projectType.toLowerCase())?.pid || (projectType === 'BBM GENSET' ? 'Ditagihkan ke Unit Lain' : '-');

    if (projectType === 'B2B IOAN') {
        pekerjaan = `B2B IOAN ${saShort}`;
    } else if (projectType === 'PROVISIONING') {
        pekerjaan = `PROVISIONING ${saShort}`;
    } else if (projectType === 'SPPG') {
        pekerjaan = `SPPG ${saShort}`;
    } else if (projectType === 'BBM GENSET') {
        pekerjaan = `BBM GENSET ${saShort}`;
    } else if (serviceArea === 'all') {
        pekerjaan = 'SEMUA';
        saShort = '';
    }
    
    const areaTitle = saShort ? `SERVICE AREA ${saShort.toUpperCase()}` : 'SEMUA';

    return `
    <div style="font-family: Arial, sans-serif; color: black; font-size: 11pt; background-color: white; page-break-inside: avoid;">
        <div style="text-align: center; font-weight: bold; line-height: 1.2;">
            <div style="margin: 0; font-size: 12pt;">PERTANGGUNGAN OPERASIONAL</div>
            <div style="margin: 0; font-size: 12pt;">${areaTitle}</div>
            <div style="margin: 0; font-size: 12pt;">PEKERJAAN: ${pekerjaan.toUpperCase()}</div>
            <div style="margin: 0; font-size: 12pt;">ID PROJECT: ${idProject}</div>
        </div>
        <br/>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid black;">
            <thead style="background-color: #DDEEFF; font-weight: bold; print-color-adjust: exact; -webkit-print-color-adjust: exact;">
                <tr>
                    <th style="padding: 4px 8px; border: 1px solid black; width: 5%;">NO</th>
                    <th style="padding: 4px 8px; border: 1px solid black;">KETERANGAN</th>
                    <th style="padding: 4px 8px; border: 1px solid black; width: 20%;">DPP</th>
                    <th style="padding: 4px 8px; border: 1px solid black; width: 15%;">PPH</th>
                    <th style="padding: 4px 8px; border: 1px solid black; width: 20%;">JUMLAH</th>
                </tr>
            </thead>
            <tbody>
                ${tableRows}
            </tbody>
            <tfoot style="print-color-adjust: exact; -webkit-print-color-adjust: exact;">
                <tr style="background-color: #DDEEFF; font-weight: bold; print-color-adjust: exact; -webkit-print-color-adjust: exact;">
                    <td colspan="2" style="padding: 4px 8px; border: 1px solid black; text-align: center;">TOTAL</td>
                    <td style="padding: 4px 8px; border: 1px solid black; text-align: right;">Rp ${Math.round(grandTotalDpp).toLocaleString('id-ID')}</td>
                    <td style="padding: 4px 8px; border: 1px solid black; text-align: right;">${grandTotalPph > 0 ? `Rp ${Math.round(grandTotalPph).toLocaleString('id-ID')}` : '-'}</td>
                    <td style="padding: 4px 8px; border: 1px solid black; text-align: right;">Rp ${grandTotalJumlah.toLocaleString('id-ID')}</td>
                </tr>
            </tfoot>
        </table>
        <div style="margin-top: 20px;">
            <p style="margin: 0;">Terbilang : (${toWords(grandTotalJumlah).charAt(0).toUpperCase() + toWords(grandTotalJumlah).slice(1)} Rupiah)</p>
        </div>
        <br/><br/>
        <div style="width: 100%; text-align: center; font-size: 11pt; page-break-inside: avoid;">
            <table style="width: 100%; text-align: center; font-size: 11pt;">
                <tr>
                    <td style="width: 50%; vertical-align: top;">
                        <p style="margin: 0;">&nbsp;</p>
                        <p style="margin: 0;">Menyetujui,</p>
                        <br/><br/><br/><br/>
                        <p style="font-weight: bold; margin: 0; text-decoration: underline;">GALIH AJI KUSUMAH</p>
                        <p style="margin: 0;">MGR BRANCH SEMARANG</p>
                    </td>
                    <td style="width: 50%; vertical-align: top;">
                        <p style="margin: 0;">Kudus, ${formattedDate}</p>
                        <p style="margin: 0;">Pembuat Rincian</p>
                        <br/><br/><br/><br/>
                        <p style="font-weight: bold; margin: 0; text-decoration: underline;">J. WAHYU SETYAWAN</p>
                        <p style="margin: 0;">Officer 3 Service Area Kudus</p>
                        <p style="margin: 0;">876858</p>
                    </td>
                </tr>
            </table>
        </div>
    </div>`;
};

const generateBBMReport = (notas: Nota[], title: string): string => {
    const groupedByDate = notas.reduce((acc, nota) => {
        const notaDate = safeToDate(nota.tanggal);
        const dateKey = notaDate ? format(notaDate, 'yyyy-MM-dd') : 'invalid-date';
        if (!acc[dateKey]) {
            acc[dateKey] = [];
        }
        acc[dateKey].push(nota);
        return acc;
    }, {} as Record<string, Nota[]>);
    
    const sortedDates = Object.keys(groupedByDate).sort();
    
    let grandTotal = 0;
    let tableRows = '';
    let itemNumber = 1;

    for (const dateKey of sortedDates) {
        if(dateKey === 'invalid-date') continue;
        const notasOnDate = groupedByDate[dateKey];
        let dateSubtotal = 0;

        for (const nota of notasOnDate) {
            const notaDate = safeToDate(nota.tanggal);
            grandTotal += nota.nominal;
            dateSubtotal += nota.nominal;
            const staticKeterangan = 'PERTAMINA';

            tableRows += `
                <tr style="print-color-adjust: exact; -webkit-print-color-adjust: exact;">
                    <td style="padding: 4px; border: 1px solid black; text-align: center;">${itemNumber}</td>
                    <td style="padding: 4px; border: 1px solid black;">${notaDate ? format(notaDate, 'dd-MMM-yy', { locale: idLocale }) : '-'}</td>
                    <td style="padding: 4px; border: 1px solid black;">${staticKeterangan}</td>
                    <td style="padding: 4px; border: 1px solid black;">${nota.noPlatKendaraan || '-'}</td>
                    <td style="padding: 4px; border: 1px solid black; text-align: center;">${nota.kmAwal || '-'}</td>
                    <td style="padding: 4px; border: 1px solid black; text-align: center;">${nota.kmAkhir || '-'}</td>
                    <td style="padding: 4px; border: 1px solid black; white-space: normal; word-break: break-all;">${nota.keterangan || '-'}</td>
                    <td style="padding: 4px; border: 1px solid black; text-align: right;">Rp${nota.nominal.toLocaleString('id-ID')}</td>
                    <td style="padding: 4px; border: 1px solid black;">${nota.namaPic}</td>
                </tr>
            `;
            itemNumber++;
        }

        tableRows += `
            <tr style="font-weight: bold; background-color: #FFFF00; print-color-adjust: exact; -webkit-print-color-adjust: exact;">
                <td colspan="7" style="padding: 4px; border: 1px solid black; text-align: right;">TOTAL</td>
                <td style="padding: 4px; border: 1px solid black; text-align: right;">Rp${dateSubtotal.toLocaleString('id-ID')}</td>
                <td style="padding: 4px; border: 1px solid black;"></td>
            </tr>
        `;
    }

    const today = new Date();
    const formattedDate = format(today, 'dd MMMM yyyy', { locale: idLocale });


    return `
    <div style="font-family: Arial, sans-serif; color: black; font-size: 11pt; background-color: white; page-break-inside: avoid;">
        <div style="font-size: 12pt; margin: 0; font-weight: bold; text-align: left; line-height: 1.2;">${title}</div>
        <br/>
        <table style="width: 100%; border-collapse: collapse; border: 2px solid black; font-size: 9pt;">
            <thead style="background-color: #DDEEFF; font-weight: bold; text-align: center; print-color-adjust: exact; -webkit-print-color-adjust: exact;">
                <tr>
                    <th style="padding: 4px; border: 1px solid black; width: 5%;">NO</th>
                    ${['TANGGAL', 'KETERANGAN', 'NO PLAT', 'KM AWAL', 'KM AKHIR', 'URAIAN PEKERJAAN', 'JUMLAH', 'NAMA'].map(h => `<th style="padding: 4px; border: 1px solid black;">${h}</th>`).join('')}
                </tr>
            </thead>
            <tbody>${tableRows}</tbody>
            <tfoot style="print-color-adjust: exact; -webkit-print-color-adjust: exact;">
                <tr style="background-color: #DDEEFF; font-weight: bold; print-color-adjust: exact; -webkit-print-color-adjust: exact;">
                    <td colspan="7" style="padding: 4px; border: 1px solid black; font-weight: bold; text-align: right;">GRAND TOTAL</td>
                    <td style="padding: 4px; border: 1px solid black; font-weight: bold; text-align: right;">Rp${grandTotal.toLocaleString('id-ID')}</td>
                    <td style="padding: 4px; border: 1px solid black;"></td>
                </tr>
            </tfoot>
        </table>
        <br/><br/>
        <div style="width: 100%; text-align: center; font-size: 11pt; page-break-inside: avoid;">
            <table style="width: 100%; text-align: center; font-size: 11pt;">
                <tr>
                    <td style="width: 50%; vertical-align: top;">
                        <p style="margin: 0;">&nbsp;</p>
                        <p style="margin: 0;">Menyetujui,</p>
                        <br/><br/><br/><br/>
                        <p style="font-weight: bold; margin: 0; text-decoration: underline;">GALIH AJI KUSUMAH</p>
                        <p style="margin: 0;">MGR BRANCH SEMARANG</p>
                    </td>
                    <td style="width: 50%; vertical-align: top;">
                        <p style="margin: 0;">Kudus, ${formattedDate}</p>
                        <p style="margin: 0;">Pembuat Rincian</p>
                        <br/><br/><br/><br/>
                        <p style="font-weight: bold; margin: 0; text-decoration: underline;">J. WAHYU SETYAWAN</p>
                        <p style="margin: 0;">Officer 3 Service Area Kudus</p>
                        <p style="margin: 0;">876858</p>
                    </td>
                </tr>
            </table>
        </div>
    </div>`;
};

const generateEvidenReport = (notas: Nota[], title: string): string => {
    const tableRows = notas.map((nota, index) => {
        const notaDate = safeToDate(nota.tanggal);
        const keperluanImageUrls = (nota.fotoEvidenUrls || []).slice(0, 4).filter((url): url is string => !!url);
        const evidenKmUrl = nota.fotoEvidenUrls?.[4] || undefined;
        const evidenKmAwalUrl = nota.fotoEvidenUrls?.[5] || undefined;
        const evidenKmAkhirUrl = nota.fotoEvidenUrls?.[6] || undefined;

        let keperluanCellHtml = '';
        if (keperluanImageUrls.length === 1) {
            keperluanCellHtml = `
                <div style="display: flex; justify-content: center; align-items: center; min-height: 80px;">
                    <img src="${keperluanImageUrls[0]}" style="width: 120px; height: auto; object-fit: contain; border: 1px solid #eee;" />
                </div>
            `;
        } else if (keperluanImageUrls.length > 1) {
            const imagesHtml = keperluanImageUrls.map(url =>
                `<img src="${url}" style="width: 80px; height: auto; object-fit: contain; border: 1px solid #eee;"/>`
            ).join('');
            keperluanCellHtml = `<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; align-items: start;">${imagesHtml}</div>`;
        }


        const renderImageCell = (url: string | undefined) => {
            if (!url) return '<div style="width: 80px; height: 80px;"></div>'; // Keep cell height consistent
            return `<img src="${url}" style="width: 80px; height: auto; object-fit: contain; margin: auto;"/>`;
        };
        
        const selisih = (nota.kmAkhir != null && nota.kmAwal != null && nota.kmAkhir > nota.kmAwal) ? (nota.kmAkhir - nota.kmAwal) : '';
        
        const ketText = getGeneralReportName(nota.segmen).replace(/ /g, '<br/>');

        return `
        <tr style="print-color-adjust: exact; -webkit-print-color-adjust: exact;">
            <td style="border: 1px solid black; padding: 4px; text-align: center; vertical-align: top;">${index + 1}</td>
            <td style="border: 1px solid black; padding: 4px; vertical-align: top; white-space: nowrap;">${notaDate ? format(notaDate, 'dd MMMM yyyy', { locale: idLocale }) : '-'}</td>
            <td style="border: 1px solid black; padding: 4px; background-color: #DDEEFF; vertical-align: top; text-align: center; print-color-adjust: exact; -webkit-print-color-adjust: exact;">${ketText}</td>
            <td style="border: 1px solid black; padding: 4px; vertical-align: top;">${nota.noPlatKendaraan || '-'}</td>
            <td style="border: 1px solid black; padding: 4px; text-align: center; vertical-align: top;">${selisih}</td>
            <td style="border: 1px solid black; padding: 4px; text-align: center; vertical-align: top;">${nota.kmAwal ?? '-'}</td>
            <td style="border: 1px solid black; padding: 4px; text-align: center; vertical-align: top;">${nota.kmAkhir ?? '-'}</td>
            <td style="border: 1px solid black; padding: 4px; vertical-align: top;">${keperluanCellHtml}</td>
            <td style="border: 1px solid black; padding: 4px; text-align: center; vertical-align: top;">${renderImageCell(evidenKmUrl)}</td>
            <td style="border: 1px solid black; padding: 4px; text-align: center; vertical-align: top;">${renderImageCell(evidenKmAwalUrl)}</td>
            <td style="border: 1px solid black; padding: 4px; text-align: center; vertical-align: top;">${renderImageCell(evidenKmAkhirUrl)}</td>
            <td style="border: 1px solid black; padding: 4px; vertical-align: top;">${nota.namaPic}</td>
            <td style="border: 1px solid black; padding: 4px; text-align: right; vertical-align: top;">Rp${nota.nominal.toLocaleString('id-ID')}</td>
        </tr>`;
    }).join('');

    const headers = ['NO', 'TANGGAL', 'KET', 'NO PLAT', 'SELISIH', 'KM AWAL', 'KM AKHIR', 'KEPERLUAN', 'Eviden KM', 'Eviden KM Awal', 'Eviden KM Akhir', 'PIC', 'Nilai'];

    return `
    <div style="font-family: Arial, sans-serif; color: black; font-size: 9pt; background-color: white; page-break-inside: avoid;">
        <div style="font-size: 12pt; margin: 0; font-weight: bold; text-align: left;">${title}</div>
        <br/>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid black; font-size: 8pt;">
            <thead style="background-color: #DDEEFF; font-weight: bold; text-align: center; print-color-adjust: exact; -webkit-print-color-adjust: exact;">
                <tr>
                    ${headers.map(h => `<th style="border: 1px solid black; padding: 4px; vertical-align: middle;">${h}</th>`).join('')}
                </tr>
            </thead>
            <tbody>${tableRows}</tbody>
        </table>
    </div>`;
};

const generateJasaReport = (notas: Nota[], title: string): string => {
    const groupedByDate = notas.reduce((acc, nota) => {
        const notaDate = safeToDate(nota.tanggal);
        const dateKey = notaDate ? format(notaDate, 'yyyy-MM-dd') : 'invalid-date';
        if (!acc[dateKey]) {
            acc[dateKey] = [];
        }
        acc[dateKey].push(nota);
        return acc;
    }, {} as Record<string, Nota[]>);
    
    const sortedDates = Object.keys(groupedByDate).sort();
    
    let grandTotalJumlah = 0;
    let grandTotalDpp = 0;
    let grandTotalPph = 0;
    let tableRows = '';
    let itemNumber = 1;

    for (const dateKey of sortedDates) {
        if(dateKey === 'invalid-date') continue;
        const notasOnDate = groupedByDate[dateKey];
        let dateSubtotalJumlah = 0;
        let dateSubtotalDpp = 0;
        let dateSubtotalPph = 0;

        for (const nota of notasOnDate) {
            const notaDate = safeToDate(nota.tanggal);
            const jumlah = nota.nominal;
            const dpp = jumlah / 1.02;
            const pph = dpp * 0.02;
            
            dateSubtotalJumlah += jumlah;
            dateSubtotalDpp += dpp;
            dateSubtotalPph += pph;

            tableRows += `
                <tr style="print-color-adjust: exact; -webkit-print-color-adjust: exact;">
                    <td style="padding: 4px; border: 1px solid black; text-align: center;">${itemNumber}</td>
                    <td style="padding: 4px; border: 1px solid black;">${notaDate ? format(notaDate, 'dd-MMM-yy', { locale: idLocale }) : '-'}</td>
                    <td style="padding: 4px; border: 1px solid black; white-space: normal; word-break: break-all;">${nota.namaBarang || '-'}</td>
                    <td style="padding: 4px; border: 1px solid black; text-align: right;">Rp${Math.round(dpp).toLocaleString('id-ID')}</td>
                    <td style="padding: 4px; border: 1px solid black; text-align: right;">Rp${Math.round(pph).toLocaleString('id-ID')}</td>
                    <td style="padding: 4px; border: 1px solid black; text-align: right;">Rp${jumlah.toLocaleString('id-ID')}</td>
                    <td style="padding: 4px; border: 1px solid black; white-space: normal; word-break: break-all;">${nota.keterangan || '-'}</td>
                    <td style="padding: 4px; border: 1px solid black;">${nota.namaPic}</td>
                </tr>
            `;
            itemNumber++;
        }
        
        grandTotalJumlah += dateSubtotalJumlah;
        grandTotalDpp += dateSubtotalDpp;
        grandTotalPph += dateSubtotalPph;

        tableRows += `
            <tr style="font-weight: bold; background-color: #FFFF00; print-color-adjust: exact; -webkit-print-color-adjust: exact;">
                <td colspan="3" style="padding: 4px; border: 1px solid black; text-align: right;">TOTAL</td>
                <td style="padding: 4px; border: 1px solid black; text-align: right;">Rp${Math.round(dateSubtotalDpp).toLocaleString('id-ID')}</td>
                <td style="padding: 4px; border: 1px solid black; text-align: right;">Rp${Math.round(dateSubtotalPph).toLocaleString('id-ID')}</td>
                <td style="padding: 4px; border: 1px solid black; text-align: right;">Rp${dateSubtotalJumlah.toLocaleString('id-ID')}</td>
                <td colspan="2" style="padding: 4px; border: 1px solid black;"></td>
            </tr>
        `;
    }

    const today = new Date();
    const formattedDate = format(today, 'dd MMMM yyyy', { locale: idLocale });


    return `
    <div style="font-family: Arial, sans-serif; color: black; font-size: 11pt; background-color: white; page-break-inside: avoid;">
        <div style="font-size: 12pt; margin: 0; font-weight: bold; text-align: left; line-height: 1.2;">${title}</div>
        <br/>
        <table style="width: 100%; border-collapse: collapse; border: 2px solid black; font-size: 9pt;">
            <thead style="background-color: #DDEEFF; font-weight: bold; text-align: center; print-color-adjust: exact; -webkit-print-color-adjust: exact;">
                <tr>
                    ${['NO', 'TANGGAL', 'URAIAN', 'DPP', 'PPH', 'JUMLAH', 'KETERANGAN', 'NAMA'].map(h => `<th style="padding: 4px; border: 1px solid black;">${h}</th>`).join('')}
                </tr>
            </thead>
            <tbody>${tableRows}</tbody>
            <tfoot style="print-color-adjust: exact; -webkit-print-color-adjust: exact;">
                <tr style="background-color: #DDEEFF; font-weight: bold; print-color-adjust: exact; -webkit-print-color-adjust: exact;">
                    <td colspan="3" style="padding: 4px; border: 1px solid black; font-weight: bold; text-align: right;">GRAND TOTAL</td>
                    <td style="padding: 4px; border: 1px solid black; font-weight: bold; text-align: right;">Rp${Math.round(grandTotalDpp).toLocaleString('id-ID')}</td>
                    <td style="padding: 4px; border: 1px solid black; font-weight: bold; text-align: right;">Rp${Math.round(grandTotalPph).toLocaleString('id-ID')}</td>
                    <td style="padding: 4px; border: 1px solid black; font-weight: bold; text-align: right;">Rp${grandTotalJumlah.toLocaleString('id-ID')}</td>
                    <td colspan="2" style="padding: 4px; border: 1px solid black;"></td>
                </tr>
            </tfoot>
        </table>
        <br/><br/>
        <div style="width: 100%; text-align: center; font-size: 11pt; page-break-inside: avoid;">
            <table style="width: 100%; text-align: center; font-size: 11pt;">
                <tr>
                    <td style="width: 50%; vertical-align: top;">
                        <p style="margin: 0;">&nbsp;</p>
                        <p style="margin: 0;">Menyetujui,</p>
                        <br/><br/><br/><br/>
                        <p style="font-weight: bold; margin: 0; text-decoration: underline;">GALIH AJI KUSUMAH</p>
                        <p style="margin: 0;">MGR BRANCH SEMARANG</p>
                    </td>
                    <td style="width: 50%; vertical-align: top;">
                        <p style="margin: 0;">Kudus, ${formattedDate}</p>
                        <p style="margin: 0;">Pembuat Rincian</p>
                        <br/><br/><br/><br/>
                        <p style="font-weight: bold; margin: 0; text-decoration: underline;">J. WAHYU SETYAWAN</p>
                        <p style="margin: 0;">Officer 3 Service Area Kudus</p>
                        <p style="margin: 0;">876858</p>
                    </td>
                </tr>
            </table>
        </div>
    </div>`;
};

const generateMaterialReport = (notas: Nota[], title: string): string => {
    const groupedByDate = notas.reduce((acc, nota) => {
        const notaDate = safeToDate(nota.tanggal);
        const dateKey = notaDate ? format(notaDate, 'yyyy-MM-dd') : 'invalid-date';
        if (!acc[dateKey]) {
            acc[dateKey] = [];
        }
        acc[dateKey].push(nota);
        return acc;
    }, {} as Record<string, Nota[]>);
    
    const sortedDates = Object.keys(groupedByDate).sort();
    
    let grandTotal = 0;
    let tableRows = '';
    let itemNumber = 1;

    for (const dateKey of sortedDates) {
        if(dateKey === 'invalid-date') continue;
        const notasOnDate = groupedByDate[dateKey];
        let dateSubtotal = 0;

        for (const nota of notasOnDate) {
            const notaDate = safeToDate(nota.tanggal);
            grandTotal += nota.nominal;
            dateSubtotal += nota.nominal;

            tableRows += `
                <tr style="print-color-adjust: exact; -webkit-print-color-adjust: exact;">
                    <td style="padding: 4px; border: 1px solid black; text-align: center;">${itemNumber}</td>
                    <td style="padding: 4px; border: 1px solid black;">${notaDate ? format(notaDate, 'dd-MMM-yy', { locale: idLocale }) : '-'}</td>
                    <td style="padding: 4px; border: 1px solid black; white-space: normal; word-break: break-all;">${nota.namaBarang || '-'}</td>
                    <td style="padding: 4px; border: 1px solid black; white-space: normal; word-break: break-all;">${nota.keterangan || '-'}</td>
                    <td style="padding: 4px; border: 1px solid black; text-align: right;">Rp${nota.nominal.toLocaleString('id-ID')}</td>
                    <td style="padding: 4px; border: 1px solid black;">${nota.namaPic}</td>
                </tr>
            `;
            itemNumber++;
        }

        tableRows += `
            <tr style="font-weight: bold; background-color: #FFFF00; print-color-adjust: exact; -webkit-print-color-adjust: exact;">
                <td colspan="4" style="padding: 4px; border: 1px solid black; text-align: right;">TOTAL</td>
                <td style="padding: 4px; border: 1px solid black; text-align: right;">Rp${dateSubtotal.toLocaleString('id-ID')}</td>
                <td style="padding: 4px; border: 1px solid black;"></td>
            </tr>
        `;
    }

    const today = new Date();
    const formattedDate = format(today, 'dd MMMM yyyy', { locale: idLocale });


    return `
    <div style="font-family: Arial, sans-serif; color: black; font-size: 11pt; background-color: white; page-break-inside: avoid;">
        <div style="font-size: 12pt; margin: 0; font-weight: bold; text-align: left; line-height: 1.2;">${title}</div>
        <br/>
        <table style="width: 100%; border-collapse: collapse; border: 2px solid black; font-size: 9pt;">
            <thead style="background-color: #DDEEFF; font-weight: bold; text-align: center; print-color-adjust: exact; -webkit-print-color-adjust: exact;">
                <tr>
                    ${['NO', 'TANGGAL', 'URAIAN', 'KETERANGAN', 'JUMLAH', 'NAMA'].map(h => `<th style="padding: 4px; border: 1px solid black;">${h}</th>`).join('')}
                </tr>
            </thead>
            <tbody>${tableRows}</tbody>
            <tfoot style="print-color-adjust: exact; -webkit-print-color-adjust: exact;">
                <tr style="background-color: #DDEEFF; font-weight: bold; print-color-adjust: exact; -webkit-print-color-adjust: exact;">
                    <td colspan="4" style="padding: 4px; border: 1px solid black; font-weight: bold; text-align: right;">GRAND TOTAL</td>
                    <td style="padding: 4px; border: 1px solid black; font-weight: bold; text-align: right;">Rp${grandTotal.toLocaleString('id-ID')}</td>
                    <td style="padding: 4px; border: 1px solid black;"></td>
                </tr>
            </tfoot>
        </table>
        <br/><br/>
        <div style="width: 100%; text-align: center; font-size: 11pt; page-break-inside: avoid;">
            <table style="width: 100%; text-align: center; font-size: 11pt;">
                <tr>
                    <td style="width: 50%; vertical-align: top;">
                        <p style="margin: 0;">&nbsp;</p>
                        <p style="margin: 0;">Menyetujui,</p>
                        <br/><br/><br/><br/>
                        <p style="font-weight: bold; margin: 0; text-decoration: underline;">GALIH AJI KUSUMAH</p>
                        <p style="margin: 0;">MGR BRANCH SEMARANG</p>
                    </td>
                    <td style="width: 50%; vertical-align: top;">
                        <p style="margin: 0;">Kudus, ${formattedDate}</p>
                        <p style="margin: 0;">Pembuat Rincian</p>
                        <br/><br/><br/><br/>
                        <p style="font-weight: bold; margin: 0; text-decoration: underline;">J. WAHYU SETYAWAN</p>
                        <p style="margin: 0;">Officer 3 Service Area Kudus</p>
                        <p style="margin: 0;">876858</p>
                    </td>
                </tr>
            </table>
        </div>
    </div>`;
};


const generateSimpleEvidenReport = (notas: Nota[], title: string): string => {
    const tableRows = notas.map((nota, index) => {
        const notaDate = safeToDate(nota.tanggal);
        const evidenImagesHtml = (nota.fotoEvidenUrls || []).filter((url): url is string => !!url).map(url => 
             `<div style="display: flex; flex-wrap: wrap; align-items: flex-start;">
                <img src="${url}" style="width: 100px; height: auto; object-fit: contain; border: 1px solid #eee; border-radius: 4px; margin: 2px;"/>
              </div>`
        ).join('');
        
        const evidenCellContent = `<div style="display: flex; flex-wrap: wrap; align-items: flex-start;">${evidenImagesHtml}</div>`;

        return `
        <tr style="print-color-adjust: exact; -webkit-print-color-adjust: exact;">
            <td style="border: 1px solid black; padding: 4px; text-align: center; vertical-align: top;">${index + 1}</td>
            <td style="border: 1px solid black; padding: 4px; vertical-align: top; white-space: nowrap;">${notaDate ? format(notaDate, 'dd MMMM yyyy', { locale: idLocale }) : '-'}</td>
            <td style="border: 1px solid black; padding: 4px; vertical-align: top;">${nota.keterangan || '-'}</td>
            <td style="border: 1px solid black; padding: 4px; vertical-align: top;">${evidenCellContent}</td>
            <td style="border: 1px solid black; padding: 4px; vertical-align: top;">${nota.namaPic}</td>
            <td style="border: 1px solid black; padding: 4px; text-align: right; vertical-align: top;">Rp${nota.nominal.toLocaleString('id-ID')}</td>
        </tr>`;
    }).join('');

    const headers = ['NO', 'Tanggal', 'Keterangan', 'Eviden', 'PIC', 'Nilai'];

    return `
    <div style="font-family: Arial, sans-serif; color: black; font-size: 11pt; background-color: white; page-break-inside: avoid;">
        <div style="font-size: 12pt; margin: 0; font-weight: bold; text-align: left;">${title}</div>
        <br/>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid black; font-size: 10pt;">
            <thead style="background-color: #DDEEFF; font-weight: bold; text-align: center; print-color-adjust: exact; -webkit-print-color-adjust: exact;">
                <tr>
                    ${headers.map(h => `<th style="border: 1px solid black; padding: 4px; vertical-align: middle;">${h}</th>`).join('')}
                </tr>
            </thead>
            <tbody>${tableRows}</tbody>
        </table>
    </div>`;
};

// --- Preview Component ---
function ReportPreview({
  pages,
  onClose,
  onPrint,
}: {
  pages: {html: string, orientation: 'portrait' | 'landscape'}[];
  onClose: () => void;
  onPrint: (orientation: 'portrait' | 'landscape' | 'all') => void;
}) {

  return (
    <div id="print-section-container" className="fixed inset-0 bg-black/80 z-50 flex justify-center items-center p-4">
      <Card className="w-full max-w-7xl h-[90vh] flex flex-col">
        <CardHeader className="print-hidden flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle>Pratinjau Laporan</CardTitle>
          <div className="flex gap-2 flex-wrap justify-end">
            <Button variant="outline" onClick={onClose}>Tutup</Button>
            <Button onClick={() => onPrint('all')}>
              <Files className="mr-2" />
              Cetak Semua
            </Button>
            <Button onClick={() => onPrint('landscape')}>
              <FileArchive className="mr-2" />
              Cetak Cover (Lanskap)
            </Button>
             <Button onClick={() => onPrint('portrait')}>
              <Printer className="mr-2" />
              Cetak Rincian (Potret)
            </Button>
          </div>
        </CardHeader>
        <CardContent id="print-section" className="flex-grow overflow-auto bg-gray-200 p-4">
          <div className="mx-auto flex flex-col items-center gap-y-4">
            {pages.map((page, index) => (
              <div
                key={index}
                className={cn(
                  "printable-page bg-white shadow-lg",
                  page.orientation === 'landscape' ? 'page-is-landscape' : 'page-is-portrait'
                )}
                style={{
                  width: page.orientation === 'landscape' ? '297mm' : '210mm',
                  minHeight: page.orientation === 'landscape' ? '210mm' : '297mm',
                  padding: '1cm',
                  boxSizing: 'border-box'
                }}
                dangerouslySetInnerHTML={{ __html: page.html }}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


const getMonthYearOptions = (notas: Nota[]) => {
    const monthYears = new Set<string>();
    notas.forEach(nota => {
        const date = safeToDate(nota.tanggal);
        if (date) {
            monthYears.add(format(date, 'yyyy-MM'));
        }
    });
    return Array.from(monthYears).sort().reverse();
};

const serviceAreas = ['SA KUDUS', 'SA PATI', 'SA JEPARA', 'SA PURWODADI', 'SA BLORA', 'SA REMBANG'];

export default function ExportPage() {
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();
    const router = useRouter();
    const { toast } = useToast();

    const userDocRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

    const notasQuery = useMemoFirebase(() => {
        if (isUserLoading || isProfileLoading || !userProfile?.id) return null;
        return query(collection(firestore, 'notas'), orderBy('dateCreated', 'desc'));
    }, [firestore, isUserLoading, isProfileLoading, userProfile]);

    const { data: notas, isLoading: isLoadingNotas } = useCollection<Nota>(notasQuery);
    
    const pidsQuery = useMemoFirebase(() => {
        if (isUserLoading || isProfileLoading || !userProfile?.id) return null;
        return query(collection(firestore, 'project-ids'));
    }, [firestore, isUserLoading, isProfileLoading, userProfile]);
    const { data: pids, isLoading: isLoadingPids } = useCollection<ProjectID>(pidsQuery);

    const [filterType, setFilterType] = useState('monthly');
    const [selectedMonth, setSelectedMonth] = useState<string>('');
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [verifiedDateRange, setVerifiedDateRange] = useState<DateRange | undefined>(undefined);
    const [selectedSA, setSelectedSA] = useState<string>('all');
    const [selectedStatus, setSelectedStatus] = useState<string>('all');

    const [selectedNotaIds, setSelectedNotaIds] = useState<string[]>([]);

    const [reportPages, setReportPages] = useState<{html: string, orientation: 'portrait' | 'landscape'}[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const isLoading = isUserLoading || isProfileLoading || isLoadingNotas || isLoadingPids;

    const monthOptions = useMemo(() => getMonthYearOptions(notas || []), [notas]);

    useEffect(() => {
        if (monthOptions.length > 0) {
            // If there's no selection or the current selection is invalid, set to the first option.
            if (!selectedMonth || !monthOptions.includes(selectedMonth)) {
                setSelectedMonth(monthOptions[0]);
            }
        } else {
            // No options, clear selection
            setSelectedMonth('');
        }
    }, [monthOptions, selectedMonth]);


    const filteredNotas = useMemo(() => {
        if (!notas) return [];
        let result: Nota[] = [];

        if (filterType === 'monthly') {
            const currentMonth = selectedMonth || (monthOptions.length > 0 ? monthOptions[0] : '');
            if (!currentMonth) return [];

            const [year, month] = currentMonth.split('-').map(Number);
            result = notas.filter(nota => {
                const date = safeToDate(nota.tanggal);
                if (!date) return false;
                return getYear(date) === year && getMonth(date) === month - 1;
            });
        } else if (filterType === 'range') {
            if (!dateRange?.from || !dateRange?.to) return [];
            const fromDate = startOfDay(dateRange.from);
            const toDate = endOfDay(dateRange.to);
            result = notas.filter(nota => {
                const date = safeToDate(nota.tanggal);
                if (!date) return false;
                return date >= fromDate && date <= toDate;
            });
        } else if (filterType === 'verified') {
            if (!verifiedDateRange?.from || !verifiedDateRange?.to) return [];
             const fromDate = startOfDay(verifiedDateRange.from);
             const toDate = endOfDay(verifiedDateRange.to);
             result = notas.filter(nota => {
                const verifiedDate = safeToDate(nota.tanggalVerifikasi);
                if (nota.status !== 'verified' || !verifiedDate) return false;
                return verifiedDate >= fromDate && verifiedDate <= toDate;
            });
        }
        
        if (selectedStatus !== 'all') {
            result = result.filter(nota => nota.status === selectedStatus);
        }

        if (selectedSA !== 'all') {
            result = result.filter(nota => nota.serviceArea === selectedSA);
        }

        return result.sort((a, b) => {
            const timeA = safeToDate(a.tanggal)?.getTime() ?? 0;
            const timeB = safeToDate(b.tanggal)?.getTime() ?? 0;
            return timeA - timeB;
        });
    }, [notas, filterType, selectedMonth, monthOptions, dateRange, verifiedDateRange, selectedSA, selectedStatus]);

    const handleSelectNota = (id: string, checked: boolean) => {
        setSelectedNotaIds(prev =>
            checked ? [...prev, id] : prev.filter(notaId => notaId !== id)
        );
    };

    const handleSelectAll = (checked: boolean) => {
        setSelectedNotaIds(checked ? filteredNotas.map(nota => nota.id) : []);
    };

    const isAllSelected = filteredNotas.length > 0 && selectedNotaIds.length === filteredNotas.length;

    const selectionSummary = useMemo(() => {
        const selectedCount = selectedNotaIds.length;
        if (selectedCount === 0) return { count: 0, total: 0 };
        const total = (notas || []).reduce((acc, nota) => {
            return selectedNotaIds.includes(nota.id) ? acc + nota.nominal : acc;
        }, 0);
        return { count: selectedCount, total };
    }, [selectedNotaIds, notas]);

    const handleDeleteSelected = async () => {
        if (selectedNotaIds.length === 0) return;

        setIsDeleting(true);
        for (const id of selectedNotaIds) {
            const notaDocRef = doc(firestore, 'notas', id);
            await deleteDoc(notaDocRef);
        }

        toast({
            title: 'Penghapusan Berhasil',
            description: `${selectedNotaIds.length} laporan telah dihapus.`,
        });

        setSelectedNotaIds([]);
        setIsDeleting(false);
        setIsDeleteDialogOpen(false);
    };

    const handleExcelExport = async () => {
        if (selectedNotaIds.length === 0) {
            toast({
                variant: "destructive",
                title: "Tidak ada laporan dipilih",
                description: "Silakan pilih setidaknya satu laporan untuk diekspor.",
            });
            return;
        }
        
        if (isLoadingPids) {
            toast({
                variant: "destructive",
                title: "Data PID belum termuat",
                description: "Silakan tunggu sebentar dan coba lagi.",
            });
            return;
        }
    
        setIsExporting(true);
        toast({
            title: "Memulai Ekspor",
            description: "Mempersiapkan data Anda untuk file Excel...",
        });
    
        try {
            const XLSX = await import('xlsx');
            const selectedNotas = filteredNotas.filter(n => selectedNotaIds.includes(n.id)) || [];
            const sortedNotas = selectedNotas.sort((a,b) => (safeToDate(a.tanggal)?.getTime() ?? 0) - (safeToDate(b.tanggal)?.getTime() ?? 0));
    
            const wb = XLSX.utils.book_new();

            // --- Common Info for Titles ---
            let dateFilterString = '';
            if (filterType === 'monthly' && selectedMonth) {
                dateFilterString = `Bulan: ${format(new Date(selectedMonth + '-02'), 'MMMM yyyy', { locale: idLocale })}`;
            } else if (filterType === 'range' && dateRange?.from) {
                dateFilterString = `Rentang Tanggal: ${format(dateRange.from, 'dd MMM yyyy')} - ${dateRange.to ? format(dateRange.to, 'dd MMM yyyy') : format(dateRange.from, 'dd MMM yyyy')}`;
            } else if (filterType === 'verified' && verifiedDateRange?.from) {
                dateFilterString = `Tanggal Verifikasi: ${format(verifiedDateRange.from, 'dd MMM yyyy')} - ${verifiedDateRange.to ? format(verifiedDateRange.to, 'dd MMM yyyy') : format(verifiedDateRange.from, 'dd MMM yyyy')}`;
            }

            // --- Sheet 1: Rekapitulasi Rincian ---
            const groupedBySegmenForRekap = sortedNotas.reduce((acc, nota) => {
                const reportName = getGeneralReportName(nota.segmen);
                if (!acc[reportName]) acc[reportName] = 0;
                acc[reportName] += nota.nominal;
                return acc;
            }, {} as Record<string, number>);

            const rekapDataRows = Object.entries(groupedBySegmenForRekap).map(([keterangan, jumlah], index) => [
                index + 1,
                keterangan,
                jumlah
            ]);

            if (rekapDataRows.length > 0) {
                const totalRekap = rekapDataRows.reduce((sum, item) => sum + (item[2] as number), 0);

                const rekapSheetData = [
                    ['REKAPITULASI RINCIAN NOTA'],
                    [dateFilterString],
                    [`Service Area: ${selectedSA === 'all' ? 'Semua' : selectedSA}`],
                    [`Status: ${selectedStatus === 'all' ? 'Semua' : statusLabels[selectedStatus] || 'Semua'}`],
                    [], // empty row
                    ['No', 'Keterangan', 'Jumlah'],
                    ...rekapDataRows,
                    [], // empty row
                    ['', 'GRAND TOTAL', totalRekap]
                ];

                const wsRekap = XLSX.utils.aoa_to_sheet(rekapSheetData);
                wsRekap['!cols'] = [{ wch: 5 }, { wch: 50 }, { wch: 15 }];
                
                // Apply number format for currency
                rekapDataRows.forEach((_, index) => {
                    const cellRef = XLSX.utils.encode_cell({c: 2, r: 6 + index});
                    if (wsRekap[cellRef]) wsRekap[cellRef].z = '#,##0';
                });
                const totalCellRef = XLSX.utils.encode_cell({c: 2, r: 6 + rekapDataRows.length + 2});
                if(wsRekap[totalCellRef]) wsRekap[totalCellRef].z = '#,##0';

                XLSX.utils.book_append_sheet(wb, wsRekap, 'Rekapitulasi');
            }

            // --- Sheet 2: Data Mentah (Raw Data) ---
            const rawHeaders = [
                'ID Laporan', 'Tanggal Laporan', 'Service Area', 'Segmen', 'Jenis Proyek',
                'Project ID', 'Nama PIC', 'Email PIC', 'Nominal (Rp)', 'Status',
                'Tanggal Verifikasi', 'Tanggal Pembayaran', 'Alasan Penolakan',
                'No Plat Kendaraan', 'KM Awal', 'KM Akhir', 'Nama Toko/Warung (Uraian)',
                'Keterangan (Nama Barang)', 'Foto 1', 'Foto 2', 'Foto 3', 'Foto 4',
                'Foto KM Awal Bulan', 'Foto KM Awal', 'Foto KM Akhir'
            ];
            
            const rawDataRows = sortedNotas.map(nota => {
                const pType = getProjectType(nota.segmen);
                const pidValue = pids?.find(p => p.projectType.toLowerCase() === pType.toLowerCase())?.pid || '-';
                const fotoUrls = nota.fotoEvidenUrls || [];

                return [
                    nota.id,
                    safeToDate(nota.tanggal) ? format(safeToDate(nota.tanggal)!, 'yyyy-MM-dd') : '-',
                    nota.serviceArea, nota.segmen, pType, pidValue, nota.namaPic, nota.userEmail,
                    nota.nominal, nota.status,
                    safeToDate(nota.tanggalVerifikasi) ? format(safeToDate(nota.tanggalVerifikasi)!, 'yyyy-MM-dd HH:mm') : '-',
                    safeToDate(nota.tanggalPembayaran) ? format(safeToDate(nota.tanggalPembayaran)!, 'yyyy-MM-dd HH:mm') : '-',
                    nota.rejectionReason || '-', nota.noPlatKendaraan || '-', nota.kmAwal || '-', nota.kmAkhir || '-',
                    nota.namaBarang || '-', nota.keterangan || '-',
                    fotoUrls[0] || '-', fotoUrls[1] || '-', fotoUrls[2] || '-', fotoUrls[3] || '-',
                    fotoUrls[4] || '-', fotoUrls[5] || '-', fotoUrls[6] || '-'
                ];
            });

            const rawSheetData = [
                ['DATA MENTAH LAPORAN NOTA'],
                [dateFilterString],
                [`Service Area: ${selectedSA === 'all' ? 'Semua' : selectedSA}`],
                [`Status: ${selectedStatus === 'all' ? 'Semua' : statusLabels[selectedStatus] || 'Semua'}`],
                [],
                rawHeaders,
                ...rawDataRows
            ];

            const wsAllData = XLSX.utils.aoa_to_sheet(rawSheetData);
            
            const objectMaxLength: any[] = rawHeaders.map(h => ({wch: h.length > 20 ? 30 : h.length + 5}));
            wsAllData['!cols'] = objectMaxLength;

            // Apply number format for currency
            rawDataRows.forEach((_, index) => {
                const cellRef = XLSX.utils.encode_cell({c: 8, r: 5 + index});
                if (wsAllData[cellRef]) wsAllData[cellRef].z = '#,##0';
            });
            
            XLSX.utils.book_append_sheet(wb, wsAllData, 'Data Mentah');
    
            XLSX.writeFile(wb, `Laporan Nota - ${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    
            toast({
                title: 'Ekspor Berhasil!',
                description: 'File Excel Anda telah diunduh.',
            });
    
        } catch (error) {
            console.error("Failed to export Excel:", error);
            toast({
                variant: "destructive",
                title: 'Ekspor Gagal',
                description: 'Terjadi kesalahan saat membuat file Excel.',
            });
        } finally {
            setIsExporting(false);
        }
    };
    
    const generatePages = (orientation: 'portrait' | 'landscape' | 'all') => {
        if (selectedNotaIds.length === 0) {
            toast({ variant: "destructive", title: "Tidak ada laporan dipilih", description: "Silakan pilih setidaknya satu laporan untuk membuat rekap." });
            return [];
        }
        
        if (isLoadingPids) {
            toast({ variant: "destructive", title: "Data PID belum termuat", description: "Silakan tunggu sebentar dan coba lagi." });
            return [];
        }

        const selectedNotas = filteredNotas.filter(n => selectedNotaIds.includes(n.id)) || [];
        const sortedNotas = selectedNotas.sort((a,b) => (safeToDate(a.tanggal)?.getTime() ?? 0) - (safeToDate(b.tanggal)?.getTime() ?? 0));
        const pages: {html: string, orientation: 'portrait' | 'landscape'}[] = [];
        
        try {
            const groupedByProject = sortedNotas.reduce((acc, nota) => {
                const pType = getProjectType(nota.segmen);
                if (!acc[pType]) acc[pType] = [];
                acc[pType].push(nota);
                return acc;
            }, {} as Record<ProjectType, Nota[]>);
            
            const projectTypes = Object.keys(groupedByProject).sort() as ProjectType[];
            
            for (const projectType of projectTypes) {
                const notasForProject = groupedByProject[projectType];
                const reportSA = selectedSA === 'all' ? 'SEMUA SA' : selectedSA;
                const saTitlePart = reportSA === 'SEMUA SA' ? 'SEMUA SA' : `SA ${reportSA.replace('SA ', '')}`;
                
                // --- Cover (Landscape) ---
                if ((orientation === 'landscape' || orientation === 'all') && projectType !== 'BBM GENSET') {
                    const coverHtml = generateImprestFundCover(notasForProject, reportSA, projectType, pids || []);
                    pages.push({ html: coverHtml, orientation: 'landscape' });
                }

                // --- Details (Portrait) ---
                if (orientation === 'portrait' || orientation === 'all') {
                    const rekapHtml = generateRekapitulasiReport(notasForProject, reportSA, projectType, pids || []);
                    pages.push({ html: rekapHtml, orientation: 'portrait' });
                    
                    const groupedByReportName = notasForProject.reduce((acc, nota) => {
                        const name = getGeneralReportName(nota.segmen);
                        if (!acc[name]) acc[name] = [];
                        acc[name].push(nota);
                        return acc;
                    }, {} as Record<string, Nota[]>);

                    for (const reportName in groupedByReportName) {
                        const notasInSegment = groupedByReportName[reportName];
                        if (notasInSegment.length === 0) continue;

                        const title = `${reportName}<br/>Pekerjaan : Operasional ${saTitlePart}`;
                        const evidenTitle = `EVIDEN ${reportName}<br/>Pekerjaan : Operasional ${saTitlePart}`;
                        
                        if (reportName.includes('BBM R2') || reportName.includes('BBM R4')) {
                            pages.push({ html: generateBBMReport(notasInSegment, title), orientation: 'portrait' });
                            pages.push({ html: generateEvidenReport(notasInSegment, evidenTitle), orientation: 'portrait' });
                        } else if (reportName.includes('Jasa')) {
                            pages.push({ html: generateJasaReport(notasInSegment, title), orientation: 'portrait' });
                            pages.push({ html: generateSimpleEvidenReport(notasInSegment, evidenTitle), orientation: 'portrait' });
                        } else {
                            pages.push({ html: generateMaterialReport(notasInSegment, title), orientation: 'portrait' });
                            pages.push({ html: generateSimpleEvidenReport(notasInSegment, evidenTitle), orientation: 'portrait' });
                        }
                    }
                }
            }

            if (pages.length > 0) {
                return pages;
            } else {
                 toast({ variant: "destructive", title: "Tidak ada data untuk laporan ini" });
                 return [];
            }
        } catch (error) {
            console.error("Error generating report:", error);
            toast({ variant: "destructive", title: "Gagal Membuat Laporan", description: "Terjadi kesalahan."});
            return [];
        }
    };

    const handlePrint = (orientation: 'portrait' | 'landscape' | 'all') => {
        const pagesToPrint = reportPages.filter(p => orientation === 'all' || p.orientation === orientation);

        if (pagesToPrint.length === 0) {
            toast({ variant: 'destructive', title: 'Tidak Ada Laporan', description: `Tidak ada laporan dengan orientasi ${orientation} untuk dicetak.` });
            return;
        }

        const printIframe = document.createElement('iframe');
        printIframe.style.position = 'absolute';
        printIframe.style.width = '0px';
        printIframe.style.height = '0px';
        printIframe.style.left = '-9999px';
        document.body.appendChild(printIframe);
        
        const iframeDoc = printIframe.contentWindow?.document;
        if (!iframeDoc) {
          console.error('Could not access iframe document.');
          document.body.removeChild(printIframe);
          toast({ variant: 'destructive', title: 'Gagal Mempersiapkan Cetak' });
          return;
        }
        
        const allPagesHtml = pagesToPrint.map(page =>
            `<div style="page-break-after: always; -webkit-print-color-adjust: exact; print-color-adjust: exact;">${page.html}</div>`
        ).join('');

        const printStyles = `
            @page {
              size: A4 ${orientation === 'landscape' ? 'landscape' : 'portrait'};
              margin: 1cm;
            }
            body { margin: 0; }
        `;

        const htmlContent = `<html><head><title>Cetak Laporan</title><style>${printStyles}</style></head><body>${allPagesHtml}</body></html>`;
        
        iframeDoc.open();
        iframeDoc.write(htmlContent);
        iframeDoc.close();

        const images = Array.from(iframeDoc.getElementsByTagName('img'));
        const imageLoadPromises = images.map(img => {
            return new Promise<void>((resolve) => {
                if (img.complete && img.naturalHeight !== 0) {
                    resolve();
                    return;
                }
                img.onload = () => resolve();
                img.onerror = () => {
                    console.warn(`Gagal memuat gambar untuk dicetak: ${img.src}`);
                    resolve();
                };
            });
        });

        const triggerPrint = () => {
             try {
                const iw = printIframe.contentWindow;
                if (!iw) throw new Error("Iframe window not found");
                
                iw.focus();
                setTimeout(() => {
                    iw.print();
                     setTimeout(() => {
                        if (document.body.contains(printIframe)) {
                            document.body.removeChild(printIframe);
                        }
                    }, 2000);
                }, 250);

            } catch (e) {
                console.error('Gagal memulai proses cetak:', e);
                toast({ variant: "destructive", title: "Gagal Mencetak" });
                 if (document.body.contains(printIframe)) {
                    document.body.removeChild(printIframe);
                 }
            }
        };

        Promise.all(imageLoadPromises).then(triggerPrint);
    };
    
    const handleGenerateReport = (orientation: 'portrait' | 'landscape' | 'all') => {
        setIsGenerating(true);
        const generatedPages = generatePages(orientation);
        if (generatedPages.length > 0) {
            setReportPages(generatedPages);
        }
        setIsGenerating(false);
    };
    
    const isActionInProgress = isGenerating || isExporting || isDeleting;

    return (
        <>
            <div>
                <div className="mx-auto grid w-full flex-1 auto-rows-max gap-6">
                    <div className="flex items-center gap-4 sticky top-0 bg-background py-4 z-10 border-b -mx-6 px-6">
                        <Button onClick={() => router.back()} variant="outline" size="icon" className="h-8 w-8">
                            <ArrowLeft className="h-4 w-4" />
                            <span className="sr-only">Kembali</span>
                        </Button>
                        <div>
                            <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-bold tracking-tight sm:grow-0">
                                Pilih Data Rekap
                            </h1>
                            <p className="text-muted-foreground text-sm">
                                Pilih laporan yang akan diexport
                            </p>
                        </div>
                    </div>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Filter className="h-5 w-5"/>
                                <CardTitle>Filter Data</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <Tabs value={filterType} onValueChange={setFilterType} className="w-full">
                                <TabsList className="grid w-full grid-cols-3 mb-4">
                                    <TabsTrigger value="monthly">Per Bulan</TabsTrigger>
                                    <TabsTrigger value="range">Rentang Tanggal</TabsTrigger>
                                    <TabsTrigger value="verified">Tanggal Verifikasi</TabsTrigger>
                                </TabsList>
                                <TabsContent value="monthly">
                                    <Select onValueChange={setSelectedMonth} value={selectedMonth}>
                                        <SelectTrigger>
                                        <SelectValue placeholder="Pilih bulan..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                        {monthOptions.map(month => (
                                            <SelectItem key={month} value={month}>
                                                {format(new Date(`${month}-02`), 'MMMM yyyy', { locale: idLocale })}
                                            </SelectItem>
                                        ))}
                                        </SelectContent>
                                    </Select>
                                </TabsContent>
                                <TabsContent value="range">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                id="date"
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full justify-start text-left font-normal",
                                                    !dateRange && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {dateRange?.from ? (
                                                    dateRange.to ? (
                                                        <>
                                                            {format(dateRange.from, "dd LLL, yy", {locale: idLocale})} -{' '}
                                                            {format(dateRange.to, "dd LLL, yy", {locale: idLocale})}
                                                        </>
                                                    ) : (
                                                        format(dateRange.from, "dd LLL, yy")
                                                    )
                                                ) : (
                                                    <span>Pilih rentang tanggal</span>
                                                )}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                initialFocus
                                                mode="range"
                                                defaultMonth={dateRange?.from}
                                                selected={dateRange}
                                                onSelect={setDateRange}
                                                numberOfMonths={2}
                                                captionLayout="dropdown"
                                                fromYear={new Date().getFullYear() - 5}
                                                toYear={new Date().getFullYear()}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </TabsContent>
                                <TabsContent value="verified">
                                     <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                id="verified-date-range"
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full justify-start text-left font-normal",
                                                    !verifiedDateRange && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {verifiedDateRange?.from ? (
                                                    verifiedDateRange.to ? (
                                                        <>
                                                            {format(verifiedDateRange.from, "dd LLL, yy", {locale: idLocale})} -{' '}
                                                            {format(verifiedDateRange.to, "dd LLL, yy", {locale: idLocale})}
                                                        </>
                                                    ) : (
                                                        format(verifiedDateRange.from, "dd LLL, yy", {locale: idLocale})
                                                    )
                                                ) : (
                                                    <span>Pilih rentang tanggal verifikasi</span>
                                                )}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                initialFocus
                                                mode="range"
                                                defaultMonth={verifiedDateRange?.from}
                                                selected={verifiedDateRange}
                                                onSelect={setVerifiedDateRange}
                                                numberOfMonths={2}
                                                captionLayout="dropdown"
                                                fromYear={new Date().getFullYear() - 5}
                                                toYear={new Date().getFullYear()}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </TabsContent>
                            </Tabs>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Service Area</Label>
                                    <Select value={selectedSA} onValueChange={setSelectedSA}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih Service Area..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Semua Service Area</SelectItem>
                                            {serviceAreas.map(sa => <SelectItem key={sa} value={sa}>{sa}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Status</Label>
                                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih Status..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Semua Status</SelectItem>
                                            <SelectItem value="pending">Pending</SelectItem>
                                            <SelectItem value="verified">Verified</SelectItem>
                                            <SelectItem value="verified-tif">Verified (TIF)</SelectItem>
                                            <SelectItem value="rejected">Rejected</SelectItem>
                                            <SelectItem value="paid">Paid</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                             </div>
                        </CardContent>
                    </Card>

                    <div>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="flex items-center gap-2">
                                <Checkbox id="select-all" onCheckedChange={handleSelectAll} checked={isAllSelected} />
                                <Label htmlFor="select-all">Pilih Semua</Label>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => setSelectedNotaIds([])} disabled={selectedNotaIds.length === 0}>
                                Hapus Pilihan
                            </Button>
                            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm" disabled={selectedNotaIds.length === 0}>
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Hapus Terpilih
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Anda benar-benar yakin?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Tindakan ini akan menghapus {selectedNotaIds.length} laporan yang dipilih secara permanen. Tindakan ini tidak dapat dibatalkan.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Batal</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleDeleteSelected}
                                        disabled={isDeleting}
                                        className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                    >
                                        {isDeleting ? 'Menghapus...' : `Ya, Hapus (${selectedNotaIds.length})`}
                                    </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                            <div className="ml-auto text-sm text-muted-foreground">
                                {selectionSummary.count} dipilih | Total: Rp {selectionSummary.total.toLocaleString('id-ID')}
                            </div>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Data Laporan ({filteredNotas.length} laporan)</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {isLoading && Array.from({length: 5}).map((_, i) => (
                                    <Skeleton key={i} className="h-20 w-full" />
                                ))}
                                {!isLoading && filteredNotas.length > 0 ? (
                                filteredNotas.map(nota => (
                                    <Card key={nota.id} className="p-3 hover:bg-muted/50 transition-colors">
                                        <div className="flex items-start gap-4">
                                            <Checkbox
                                                checked={selectedNotaIds.includes(nota.id)}
                                                onCheckedChange={(checked) => handleSelectNota(nota.id, !!checked)}
                                                className="mt-1"
                                            />
                                            <div className="flex-grow min-w-0">
                                                <div className="flex justify-between items-start flex-wrap gap-x-4 gap-y-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-medium">{nota.namaPic}</span>
                                                        <Badge variant={getStatusVariant(nota.status)} className="capitalize">{statusLabels[nota.status] || nota.status}</Badge>
                                                        <Badge variant={nota.segmen.includes('BBM') ? 'destructive' : 'secondary'}>{nota.segmen}</Badge>
                                                    </div>
                                                    <div className="font-semibold text-base whitespace-nowrap">
                                                        Rp {nota.nominal.toLocaleString('id-ID')}
                                                    </div>
                                                </div>
                                                <p className="text-sm text-muted-foreground truncate mt-1">
                                                    {safeToDate(nota.tanggal) ? format(safeToDate(nota.tanggal)!, 'dd MMM yyyy', { locale: idLocale }) : 'Invalid Date'}
                                                </p>
                                            </div>
                                            <div className="flex items-center">
                                                <Link href={`/dashboard/notas/${nota.id}/edit`}>
                                                    <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                                                </Link>
                                            </div>
                                        </div>
                                    </Card>
                                ))
                                ) : (
                                    <div className="text-center py-10 text-muted-foreground">
                                        Tidak ada laporan ditemukan untuk filter yang dipilih.
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm py-3 mt-auto border-t -mx-6 px-6">
                        <div className="max-w-5xl mx-auto flex justify-around items-center gap-4">
                             <Button variant="outline" size="lg" onClick={handleExcelExport} disabled={isActionInProgress || selectedNotaIds.length === 0}>
                                {isExporting ? <Loader2 className="mr-2 animate-spin"/> : <FileSpreadsheet className="mr-2" />}
                                Export Excel
                            </Button>
                            <Button variant="default" size="lg" onClick={() => handleGenerateReport('all')} disabled={isActionInProgress || selectedNotaIds.length === 0}>
                                {isGenerating ? <Loader2 className="mr-2 animate-spin"/> : <Files className="mr-2" />}
                                Cetak Semua
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
            {reportPages.length > 0 && <ReportPreview pages={reportPages} onClose={() => setReportPages([])} onPrint={handlePrint} />}
        </>
    );
}
