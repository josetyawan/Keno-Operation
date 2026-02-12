

'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import { useCollection, useFirestore, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { format, getMonth, getYear, startOfDay, endOfDay, isValid } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { Nota, ProjectID } from '@/lib/types';
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
import * as XLSX from 'xlsx';


type ProjectType = 'B2B IOAN' | 'PROVISIONING' | 'SPPG' | 'BBM GENSET' | 'Lainnya' | 'WAREHOUSE';

const safeToDate = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (timestamp.toDate) return timestamp.toDate();
    if (timestamp instanceof Date && isValid(timestamp)) return timestamp;
    const d = new Date(timestamp);
    return isValid(d) ? d : null;
};


const getProjectType = (segmen: string): ProjectType => {
    if (segmen === 'BBM R4 Pengiriman Warehouse') return 'WAREHOUSE';
    if (segmen === 'BBM Genset') return 'BBM GENSET';
    if (segmen.includes('SPPG')) return 'SPPG';
    if (segmen.includes('B2B IOAN') || segmen === 'ISI PANTRY') return 'B2B IOAN';
    if (segmen.includes('PROVISIONING') || segmen === 'Perincian Nota ATK') return 'PROVISIONING';
    return 'Lainnya';
};

const getStatusVariant = (status: Nota['status']): VariantProps<typeof badgeVariants>['variant'] => {
    switch (status) {
        case 'verified':
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

// --- Report Generation Logic ---

const generateImprestFundCover = (notas: Nota[], serviceArea: string, projectType: ProjectType, pids: ProjectID[]): string => {
    const today = new Date();
    const firstNotaDate = (notas.length > 0) ? safeToDate(notas[0].tanggal) : null;
    const reportDate = firstNotaDate || today;

    const monthName = format(reportDate, 'MMM', { locale: idLocale });
    const formattedDate = format(reportDate, 'dd/MM/yyyy');
    
    const saShort = serviceArea.replace('SA ', '');
    const projectName = projectType === 'WAREHOUSE'
        ? `IF JATENG - SS SMG - Ops IAM Semarang (${monthName})`
        : `IF JATENG - SMG OPR - Ops SA ${saShort} (${monthName})`;
    
    const idProjectForSummary = pids.find(p => p.projectType.toLowerCase() === projectType.toLowerCase())?.pid || (projectType === 'BBM GENSET' ? 'Ditagihkan ke Unit Lain' : '-');

    const groupedBySegmen = notas.reduce((acc, nota) => {
        const key = nota.segmen;
        if (!acc[key]) {
            acc[key] = { total: 0 };
        }
        acc[key].total += nota.nominal;
        return acc;
    }, {} as Record<string, { total: number }>);

    let grandTotal = 0;
    const tableRows = Object.entries(groupedBySegmen).map(([segmen, data], index) => {
        grandTotal += data.total;
        
        const segmenNotas = notas.filter(n => n.segmen === segmen);
        const earliestDate = segmenNotas.reduce((earliest, current) => {
            const currentDate = safeToDate(current.tanggal);
            if (!currentDate) return earliest;
            return (earliest && earliest < currentDate) ? earliest : currentDate;
        }, null as Date | null);
        
        const nominalFormatted = data.total.toLocaleString('id-ID');
        
        const segmenProjectType = getProjectType(segmen);
        
        const idProjectForRow = segmen === 'BBM R4 Pengiriman Warehouse'
            ? pids?.find(p => p.projectType.toLowerCase() === 'warehouse')?.pid
            : pids.find(p => p.projectType.toLowerCase() === segmenProjectType.toLowerCase())?.pid || '-';

        return `
            <tr style="font-size: 8pt;">
                <td style="border: 1px solid black; padding: 2px 4px; text-align: center;">${index + 1}</td>
                <td style="border: 1px solid black; padding: 2px 4px; text-align: center;">${earliestDate ? format(earliestDate, 'dd/MM/yyyy') : '-'}</td>
                <td style="border: 1px solid black; padding: 2px 4px; text-align: center;">${index + 1}</td>
                <td style="border: 1px solid black; padding: 2px 4px;">${segmen}</td>
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
                    <thead style="background-color: #FED7AA; font-weight: bold; text-align: center; print-color-adjust: exact; -webkit-print-color-adjust: exact;">
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
                    <tfoot style="font-weight: bold;">
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
            <thead style="background-color: #FED7AA; font-weight: bold; text-align: center; print-color-adjust: exact; -webkit-print-color-adjust: exact;">
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
            <tfoot style="font-weight: bold;">
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
    const groupedBySegmen = notas.reduce((acc, nota) => {
        const key = nota.segmen;
        if (!acc[key]) {
            acc[key] = { items: [], total: 0 };
        }
        acc[key].items.push(nota);
        acc[key].total += nota.nominal;
        return acc;
    }, {} as Record<string, { items: Nota[], total: number }>);

    const isJasa = (segmen: string) => {
        const lowerSegmen = segmen.toLowerCase();
        return lowerSegmen.includes('jasa') || lowerSegmen.includes('pengiriman') || lowerSegmen.includes('ekspedisi');
    };

    let grandTotalJumlah = 0;
    let grandTotalDpp = 0;
    let grandTotalPph = 0;

    const tableRows = Object.entries(groupedBySegmen).map(([segmen, data], index) => {
        const totalJumlahForSegmen = data.total;
        let dpp = totalJumlahForSegmen;
        let pph = 0;

        if (isJasa(segmen)) {
            // Calculation based on: JUMLAH = DPP - (DPP * 2%) => JUMLAH = DPP * 0.98
            dpp = totalJumlahForSegmen / 0.98;
            pph = dpp - totalJumlahForSegmen;
        }
        
        grandTotalJumlah += totalJumlahForSegmen;
        grandTotalDpp += dpp;
        grandTotalPph += pph;

        return `
            <tr style="print-color-adjust: exact; -webkit-print-color-adjust: exact;">
                <td style="padding: 4px 8px; border: 1px solid black; text-align: center;">${index + 1}</td>
                <td style="padding: 4px 8px; border: 1px solid black;">${segmen}</td>
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
    
    const idProject = pids.find(p => p.projectType.toLowerCase() === projectType.toLowerCase())?.pid || (projectType === 'BBM GENSET' ? 'Ditagihkan ke Unit Lain' : '-');

    if (projectType === 'WAREHOUSE') {
        saShort = 'SS SMG';
        pekerjaan = 'SS SMG';
    } else if (projectType === 'B2B IOAN') {
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
    
    const areaTitle = projectType === 'WAREHOUSE'
        ? 'SS SMG'
        : (saShort ? `SERVICE AREA ${saShort.toUpperCase()}` : 'SEMUA');

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
            <thead style="background-color: #FED7AA; font-weight: bold; print-color-adjust: exact; -webkit-print-color-adjust: exact;">
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
                <tr style="background-color: #FED7AA; font-weight: bold; print-color-adjust: exact; -webkit-print-color-adjust: exact;">
                    <td colspan="2" style="padding: 4px 8px; border: 1px solid black; text-align: center;">TOTAL</td>
                    <td style="padding: 4px 8px; border: 1px solid black; text-align: right;">Rp ${Math.round(grandTotalDpp).toLocaleString('id-ID')}</td>
                    <td style="padding: 4px 8px; border: 1px solid black; text-align: right;">${grandTotalPph > 0 ? `Rp ${Math.round(grandTotalPph).toLocaleString('id-ID')}` : '-'}</td>
                    <td style="padding: 4px 8px; border: 1px solid black; text-align: right;">Rp ${grandTotalJumlah.toLocaleString('id-ID')}</td>
                </tr>
            </tfoot>
        </table>
        <div style="margin-top: 20px;">
            <p style="margin: 0;">Terbilang : (${terbilangText.charAt(0).toUpperCase() + terbilangText.slice(1)} Rupiah)</p>
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

const generateJasaReport = (notas: Nota[], title: string): string => {
    // Group notas by date
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
            const dpp = nota.nominal / 1.02;
            const pph = nota.nominal - dpp;
            dateSubtotal += nota.nominal;
            tableRows += `
            <tr style="print-color-adjust: exact; -webkit-print-color-adjust: exact;">
                <td style="padding: 4px; border: 1px solid black; text-align: center;">${itemNumber}</td>
                <td style="padding: 4px; border: 1px solid black;">${notaDate ? format(notaDate, 'dd/MM/yyyy') : '-'}</td>
                <td style="padding: 4px; border: 1px solid black; white-space: normal; word-break: break-all;">${nota.keterangan || nota.namaBarang || '-'}</td>
                <td style="padding: 4px; border: 1px solid black; text-align: right;">${dpp.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td style="padding: 4px; border: 1px solid black; text-align: right;">${pph.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td style="padding: 4px; border: 1px solid black; text-align: right;">${nota.nominal.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
            `;
            itemNumber++;
        }
        grandTotal += dateSubtotal;
         tableRows += `
            <tr style="font-weight: bold; print-color-adjust: exact; -webkit-print-color-adjust: exact;">
                <td colspan="5" style="padding: 4px; border: 1px solid black; text-align: right;">JUMLAH</td>
                <td style="padding: 4px; border: 1px solid black; text-align: right;">${dateSubtotal.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
        `;
    }

    const today = new Date();
    const formattedDate = format(today, 'dd MMMM yyyy', { locale: idLocale });

    return `
    <div style="font-family: Arial, sans-serif; color: black; font-size: 11pt; background-color: white; page-break-inside: avoid;">
        <div style="font-size: 12pt; margin: 0; font-weight: bold; text-align: left;">${title}</div>
        <br/>
        <table style="width: 100%; border-collapse: collapse; border: 2px solid black; font-size: 9pt;">
            <thead style="background-color: #FED7AA; font-weight: bold; text-align: center; print-color-adjust: exact; -webkit-print-color-adjust: exact;">
                <tr>
                    <th style="padding: 4px; border: 1px solid black; width: 5%;">NO</th>
                    <th style="padding: 4px; border: 1px solid black; width: 10%;">TANGGAL</th>
                    <th style="padding: 4px; border: 1px solid black;">KETERANGAN</th>
                    <th style="padding: 4px; border: 1px solid black; width: 15%;">DPP</th>
                    <th style="padding: 4px; border: 1px solid black; width: 15%;">PPH 2%</th>
                    <th style="padding: 4px; border: 1px solid black; width: 20%;">JUMLAH (Rp)</th>
                </tr>
            </thead>
            <tbody>${tableRows}</tbody>
            <tfoot style="print-color-adjust: exact; -webkit-print-color-adjust: exact;">
                <tr style="background-color: #FED7AA; font-weight: bold; print-color-adjust: exact; -webkit-print-color-adjust: exact;">
                    <td colspan="5" style="padding: 4px; border: 1px solid black; font-weight: bold; text-align: right;">TOTAL</td>
                    <td style="padding: 4px; border: 1px solid black; font-weight: bold; text-align: right;">Rp${grandTotal.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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


const generateBBMReport = (notas: Nota[], title: string): string => {
    // Group notas by date
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
            const staticKeterangan = nota.segmen;

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

        // Render subtotal row for the date
        tableRows += `
            <tr style="font-weight: bold; print-color-adjust: exact; -webkit-print-color-adjust: exact;">
                <td colspan="7" style="padding: 4px; border: 1px solid black; text-align: right;">JUMLAH</td>
                <td style="padding: 4px; border: 1px solid black; text-align: right;">Rp${dateSubtotal.toLocaleString('id-ID')}</td>
                <td style="padding: 4px; border: 1px solid black;"></td>
            </tr>
        `;
    }

    const today = new Date();
    const formattedDate = format(today, 'dd MMMM yyyy', { locale: idLocale });


    return `
    <div style="font-family: Arial, sans-serif; color: black; font-size: 11pt; background-color: white; page-break-inside: avoid;">
        <div style="font-size: 12pt; margin: 0; font-weight: bold; text-align: left;">${title}</div>
        <br/>
        <table style="width: 100%; border-collapse: collapse; border: 2px solid black; font-size: 9pt;">
            <thead style="background-color: #FED7AA; font-weight: bold; text-align: center; print-color-adjust: exact; -webkit-print-color-adjust: exact;">
                <tr>
                    <th style="padding: 4px; border: 1px solid black; width: 5%;">NO</th>
                    ${['TANGGAL', 'KETERANGAN', 'NO PLAT', 'KM AWAL', 'KM AKHIR', 'URAIAN PEKERJAAN', 'JUMLAH', 'NAMA'].map(h => `<th style="padding: 4px; border: 1px solid black;">${h}</th>`).join('')}
                </tr>
            </thead>
            <tbody>${tableRows}</tbody>
            <tfoot style="print-color-adjust: exact; -webkit-print-color-adjust: exact;">
                <tr style="background-color: #FED7AA; font-weight: bold; print-color-adjust: exact; -webkit-print-color-adjust: exact;">
                    <td colspan="8" style="padding: 4px; border: 1px solid black; font-weight: bold; text-align: right;">TOTAL</td>
                    <td style="padding: 4px; border: 1px solid black; font-weight: bold; text-align: right;">Rp${grandTotal.toLocaleString('id-ID')}</td>
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
            dateSubtotal += nota.nominal;
            tableRows += `
            <tr style="print-color-adjust: exact; -webkit-print-color-adjust: exact;">
                <td style="padding: 4px; border: 1px solid black; text-align: center;">${itemNumber}</td>
                <td style="padding: 4px; border: 1px solid black;">${notaDate ? format(notaDate, 'dd/MM/yyyy') : '-'}</td>
                <td style="padding: 4px; border: 1px solid black;">${nota.namaBarang || '-'}</td>
                <td style="padding: 4px; border: 1px solid black; white-space: normal; word-break: break-all;">${nota.keterangan || '-'}</td>
                <td style="padding: 4px; border: 1px solid black; text-align: right;">${nota.nominal.toLocaleString('id-ID')}</td>
            </tr>`;
            itemNumber++;
        }
        grandTotal += dateSubtotal;
        tableRows += `
            <tr style="font-weight: bold; print-color-adjust: exact; -webkit-print-color-adjust: exact;">
                <td colspan="4" style="padding: 4px; border: 1px solid black; text-align: right;">JUMLAH</td>
                <td style="padding: 4px; border: 1px solid black; text-align: right;">${dateSubtotal.toLocaleString('id-ID')}</td>
            </tr>
        `;
    }

    const today = new Date();
    const formattedDate = format(today, 'dd MMMM yyyy', { locale: idLocale });

    return `
    <div style="font-family: Arial, sans-serif; color: black; font-size: 11pt; background-color: white; page-break-inside: avoid;">
        <div style="font-size: 12pt; margin: 0; font-weight: bold; text-align: left;">${title}</div>
        <br/>
        <table style="width: 100%; border-collapse: collapse; border: 2px solid black; font-size: 9pt;">
            <thead style="background-color: #FED7AA; font-weight: bold; text-align: center; print-color-adjust: exact; -webkit-print-color-adjust: exact;">
                <tr>
                    <th style="padding: 4px; border: 1px solid black; width: 5%;">NO</th>
                    ${['TANGGAL', 'Nama Barang', 'Keterangan', 'Jumlah'].map(h => `<th style="padding: 4px; border: 1px solid black;">${h}</th>`).join('')}
                </tr>
            </thead>
            <tbody>${tableRows}</tbody>
            <tfoot style="print-color-adjust: exact; -webkit-print-color-adjust: exact;">
                <tr style="background-color: #FED7AA; font-weight: bold; print-color-adjust: exact; -webkit-print-color-adjust: exact;">
                    <td colspan="4" style="padding: 4px; border: 1px solid black; font-weight: bold; text-align: right;">TOTAL</td>
                    <td style="padding: 4px; border: 1px solid black; font-weight: bold; text-align: right;">Rp${grandTotal.toLocaleString('id-ID')}</td>
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

        const keperluanImagesHtml = keperluanImageUrls.map(url =>
            `<img src="${url}" style="width: 60px; height: auto; object-fit: contain; border: 1px solid #eee;"/>`
        ).join('');

        const renderImageCell = (url: string | undefined) => {
            if (!url) return '<div style="width: 60px; height: 60px;"></div>'; // Keep cell height consistent
            return `<img src="${url}" style="width: 60px; height: auto; object-fit: contain; margin: auto;"/>`;
        };
        
        const selisih = (nota.kmAkhir != null && nota.kmAwal != null && nota.kmAkhir > nota.kmAwal) ? (nota.kmAkhir - nota.kmAwal) : '';

        // Split by space and join with <br/> for multiline effect as in the image.
        const ketText = nota.segmen.replace(/ /g, '<br/>');

        return `
        <tr style="print-color-adjust: exact; -webkit-print-color-adjust: exact;">
            <td style="border: 1px solid black; padding: 4px; text-align: center; vertical-align: top;">${index + 1}</td>
            <td style="border: 1px solid black; padding: 4px; vertical-align: top; white-space: nowrap;">${notaDate ? format(notaDate, 'dd MMMM yyyy', { locale: idLocale }) : '-'}</td>
            <td style="border: 1px solid black; padding: 4px; background-color: #FFDDDD; vertical-align: top; text-align: center; print-color-adjust: exact; -webkit-print-color-adjust: exact;">${ketText}</td>
            <td style="border: 1px solid black; padding: 4px; vertical-align: top;">${nota.noPlatKendaraan || '-'}</td>
            <td style="border: 1px solid black; padding: 4px; text-align: center; vertical-align: top;">${selisih}</td>
            <td style="border: 1px solid black; padding: 4px; text-align: center; vertical-align: top;">${nota.kmAwal ?? '-'}</td>
            <td style="border: 1px solid black; padding: 4px; text-align: center; vertical-align: top;">${nota.kmAkhir ?? '-'}</td>
            <td style="border: 1px solid black; padding: 4px; vertical-align: top;"><div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">${keperluanImagesHtml}</div></td>
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
            <thead style="background-color: #FED7AA; font-weight: bold; text-align: center; print-color-adjust: exact; -webkit-print-color-adjust: exact;">
                <tr>
                    ${headers.map(h => `<th style="border: 1px solid black; padding: 4px; vertical-align: middle;">${h}</th>`).join('')}
                </tr>
            </thead>
            <tbody>${tableRows}</tbody>
        </table>
    </div>`;
};

const generateSimpleEvidenReport = (notas: Nota[], title: string): string => {
    const tableRows = notas.map((nota, index) => {
        const notaDate = safeToDate(nota.tanggal);
        // Filter out nulls before creating img tags
        const evidenImagesHtml = (nota.fotoEvidenUrls || []).filter((url): url is string => !!url).map(url => 
            `<img src="${url}" style="width: 60px; height: auto; object-fit: contain; border: 1px solid #eee;"/>`
        ).join('');
        
        // Use a grid to display multiple photos within the cell
        const evidenCellContent = `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; align-items: center; justify-content: start;">${evidenImagesHtml}</div>`;


        return `
        <tr style="print-color-adjust: exact; -webkit-print-color-adjust: exact;">
            <td style="border: 1px solid black; padding: 4px; text-align: center; vertical-align: top;">${index + 1}</td>
            <td style="border: 1px solid black; padding: 4px; vertical-align: top; white-space: nowrap;">${notaDate ? format(notaDate, 'dd MMMM yyyy', { locale: idLocale }) : '-'}</td>
            <td style="border: 1px solid black; padding: 4px; vertical-align: top;">${nota.namaBarang || nota.keterangan || '-'}</td>
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
            <thead style="background-color: #FED7AA; font-weight: bold; text-align: center; print-color-adjust: exact; -webkit-print-color-adjust: exact;">
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

const serviceAreas = ['SA KUDUS', 'SA PATI', 'SA JEPARA', 'SA PURWODADI', 'SA BLORA'];

export default function ExportPage() {
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    const notasQuery = useMemoFirebase(() => {
        return query(collection(firestore, 'notas'), orderBy('dateCreated', 'desc'));
    }, [firestore]);

    const { data: notas, isLoading: isLoadingNotas } = useCollection<Nota>(notasQuery);
    
    const pidsQuery = useMemoFirebase(() => {
        return query(collection(firestore, 'project-ids'));
    }, [firestore]);
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

    const isLoading = isLoadingNotas || isLoadingPids;

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

    const handleDeleteSelected = () => {
        if (selectedNotaIds.length === 0) return;

        setIsDeleting(true);
        selectedNotaIds.forEach(id => {
            const notaDocRef = doc(firestore, 'notas', id);
            deleteDocumentNonBlocking(notaDocRef);
        });

        toast({
            title: 'Penghapusan Dimulai',
            description: `${selectedNotaIds.length} laporan telah dijadwalkan untuk dihapus.`,
        });

        setSelectedNotaIds([]);
        setIsDeleting(false);
        setIsDeleteDialogOpen(false);
    };

    const handleExcelExport = () => {
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
            const selectedNotas = filteredNotas.filter(n => selectedNotaIds.includes(n.id)) || [];
            const sortedNotas = selectedNotas.sort((a,b) => (safeToDate(a.tanggal)?.getTime() ?? 0) - (safeToDate(b.tanggal)?.getTime() ?? 0));
    
            const wb = XLSX.utils.book_new();

            const fitCols = (ws: XLSX.WorkSheet) => {
                const objectMaxLength: any[] = [];
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
                data.forEach((row: any) => {
                    Object.keys(row).forEach((key) => {
                        const value = row[key as any];
                        if (typeof value === 'undefined' || value === null) return;
                        const len = typeof value === 'number' ? (value.toString().length + 2) : String(value).length;
                        objectMaxLength[key] = Math.max(objectMaxLength[key] || 0, len);
                    });
                });
                const headers = Object.keys(data[0] as any);
                headers.forEach((h, i) => {
                    objectMaxLength[i] = Math.max(objectMaxLength[i], h.length);
                });

                ws['!cols'] = objectMaxLength.map((w: number) => ({ width: w + 2 }));
            };
            
            // --- Helper data and groupings ---
            const bbmR2R4Segments = [
                'BBM R2 Harian B2B IOAN', 'BBM R2 Harian PROVISIONING',
                'BBM R4 Harian B2B IOAN', 'BBM R4 Harian PROVISIONING',
                'BBM R4 Turlap B2B IOAN', 'BBM R4 Turlap PROVISIONING',
                'BBM R4 UT B2B IOAN', 'BBM R4 UT PROVISIONING',
                'BBM R4 Pengiriman Warehouse',
            ];
            const jasaSegments = [
                'Jasa B2B IOAN', 'Jasa PROVISIONING',
                'Perincian Nota Pengiriman B2B IOAN', 'Perincian Nota Pengiriman PROVISIONING'
            ];
             const groupedByProject = sortedNotas.reduce((acc, nota) => {
                const pType = getProjectType(nota.segmen);
                if (!acc[pType]) acc[pType] = [];
                acc[pType].push(nota);
                return acc;
            }, {} as Record<ProjectType, Nota[]>);


            // --- Sheet 1: Imprest Fund Cover ---
            const coverData: any[] = [];
            for (const projectType in groupedByProject) {
                const notasInProject = groupedByProject[projectType as ProjectType];
                const groupedBySegmen = notasInProject.reduce((acc, nota) => {
                    if (!acc[nota.segmen]) acc[nota.segmen] = 0;
                    acc[nota.segmen] += nota.nominal;
                    return acc;
                }, {} as Record<string, number>);

                let segmenIndex = 1;
                for (const segmen in groupedBySegmen) {
                    const total = groupedBySegmen[segmen];
                    const earliestNota = notasInProject.find(n => n.segmen === segmen);
                    const segmenProjectType = getProjectType(segmen);
                    const idProjectForRow = pids?.find(p => p.projectType.toLowerCase() === segmenProjectType.toLowerCase())?.pid || '-';
                    
                    coverData.push({
                        'Project': projectType,
                        'No. Urut': segmenIndex++,
                        'Tanggal': earliestNota?.tanggal?.toDate ? format(earliestNota.tanggal.toDate(), 'dd/MM/yyyy') : '-',
                        'No. Kuitansi': segmenIndex - 1, // Replicating logic from PDF
                        'Uraian': segmen,
                        'ID Project': idProjectForRow,
                        'Nilai Pertanggungan': total,
                        'Bayar Ke Mitra': total
                    });
                }
            }
            if (coverData.length > 0) {
                const wsCover = XLSX.utils.json_to_sheet(coverData);
                XLSX.utils.book_append_sheet(wb, wsCover, '1. Rekap Cover');
                fitCols(wsCover);
            }

            // --- Sheet 2: Rekapitulasi Perincian ---
            const rekapData: any[] = [];
            const groupedBySegmenForRekap = sortedNotas.reduce((acc, nota) => {
                if (!acc[nota.segmen]) acc[nota.segmen] = 0;
                acc[nota.segmen] += nota.nominal;
                return acc;
            }, {} as Record<string, number>);

            let rekapIndex = 1;
            for (const segmen in groupedBySegmenForRekap) {
                rekapData.push({
                    'No': rekapIndex++,
                    'Keterangan': segmen,
                    'Jumlah': groupedBySegmenForRekap[segmen]
                });
            }
            if (rekapData.length > 0) {
                const wsRekap = XLSX.utils.json_to_sheet(rekapData);
                XLSX.utils.book_append_sheet(wb, wsRekap, '2. Rekap Rincian');
                fitCols(wsRekap);
            }

            // --- Sheet 3: Detail BBM ---
            const bbmNotas = sortedNotas.filter(n => bbmR2R4Segments.includes(n.segmen));
            if (bbmNotas.length > 0) {
                const bbmData = bbmNotas.map((nota, index) => ({
                    'No': index + 1,
                    'Tanggal': safeToDate(nota.tanggal) ? format(safeToDate(nota.tanggal)!, 'dd-MMM-yy', { locale: idLocale }) : '-',
                    'Keterangan Segmen': nota.segmen,
                    'No Plat': nota.noPlatKendaraan || '-',
                    'KM Awal': nota.kmAwal || '-',
                    'KM Akhir': nota.kmAkhir || '-',
                    'Uraian Pekerjaan': nota.keterangan || '-',
                    'Jumlah': nota.nominal,
                    'Nama PIC': nota.namaPic,
                }));
                const wsBBM = XLSX.utils.json_to_sheet(bbmData);
                XLSX.utils.book_append_sheet(wb, wsBBM, '3. Detail BBM');
                fitCols(wsBBM);
            }

            // --- Sheet 4: Detail Jasa ---
            const jasaNotas = sortedNotas.filter(n => jasaSegments.includes(n.segmen));
            if (jasaNotas.length > 0) {
                const jasaData = jasaNotas.map((nota, index) => ({
                    'No': index + 1,
                    'Tanggal': safeToDate(nota.tanggal) ? format(safeToDate(nota.tanggal)!, 'dd/MM/yyyy') : '-',
                    'Keterangan': nota.keterangan || nota.namaBarang || '-',
                    'DPP': nota.nominal / 1.02,
                    'PPH 2%': nota.nominal - (nota.nominal / 1.02),
                    'Jumlah': nota.nominal,
                }));
                 const wsJasa = XLSX.utils.json_to_sheet(jasaData);
                XLSX.utils.book_append_sheet(wb, wsJasa, '4. Detail Jasa');
                fitCols(wsJasa);
            }

            // --- Sheet 5: Detail Material & Lainnya ---
            const materialNotas = sortedNotas.filter(n => !bbmR2R4Segments.includes(n.segmen) && !jasaSegments.includes(n.segmen));
            if (materialNotas.length > 0) {
                const materialData = materialNotas.map((nota, index) => ({
                     'No': index + 1,
                    'Tanggal': safeToDate(nota.tanggal) ? format(safeToDate(nota.tanggal)!, 'dd/MM/yyyy') : '-',
                    'Nama Barang': nota.namaBarang || '-',
                    'Keterangan': nota.keterangan || '-',
                    'Jumlah': nota.nominal,
                }));
                const wsMaterial = XLSX.utils.json_to_sheet(materialData);
                XLSX.utils.book_append_sheet(wb, wsMaterial, '5. Detail Material');
                fitCols(wsMaterial);
            }

            // --- Sheet 6: Data Lengkap (Raw) ---
            const allData = sortedNotas.map(nota => {
                const pType = getProjectType(nota.segmen);
                const pidValue = pids?.find(p => p.projectType.toLowerCase() === pType.toLowerCase())?.pid || '-';
                const fotoUrls = nota.fotoEvidenUrls || [];
    
                return {
                    'ID Laporan': nota.id,
                    'Tanggal Laporan': safeToDate(nota.tanggal) ? format(safeToDate(nota.tanggal)!, 'yyyy-MM-dd') : '-',
                    'Service Area': nota.serviceArea,
                    'Segmen': nota.segmen,
                    'Jenis Proyek': pType,
                    'Project ID': pidValue,
                    'Nama PIC': nota.namaPic,
                    'Email PIC': nota.userEmail,
                    'Nominal (Rp)': nota.nominal,
                    'Status': nota.status,
                    'Tanggal Verifikasi': safeToDate(nota.tanggalVerifikasi) ? format(safeToDate(nota.tanggalVerifikasi)!, 'yyyy-MM-dd HH:mm') : '-',
                    'Tanggal Pembayaran': safeToDate(nota.tanggalPembayaran) ? format(safeToDate(nota.tanggalPembayaran)!, 'yyyy-MM-dd HH:mm') : '-',
                    'Alasan Penolakan': nota.rejectionReason || '-',
                    'No Plat Kendaraan': nota.noPlatKendaraan || '-',
                    'KM Awal': nota.kmAwal || '-',
                    'KM Akhir': nota.kmAkhir || '-',
                    'Nama Barang/Jasa': nota.namaBarang || '-',
                    'Keterangan': nota.keterangan || '-',
                    'Foto 1': fotoUrls[0] || '-',
                    'Foto 2': fotoUrls[1] || '-',
                    'Foto 3': fotoUrls[2] || '-',
                    'Foto 4': fotoUrls[3] || '-',
                    'Foto KM Awal Bulan': fotoUrls[4] || '-',
                    'Foto KM Awal': fotoUrls[5] || '-',
                    'Foto KM Akhir': fotoUrls[6] || '-',
                };
            });
            const wsAllData = XLSX.utils.json_to_sheet(allData);
            XLSX.utils.book_append_sheet(wb, wsAllData, '6. Semua Data Mentah');
            fitCols(wsAllData);
    
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
            toast({
                variant: "destructive",
                title: "Tidak ada laporan dipilih",
                description: "Silakan pilih setidaknya satu laporan untuk membuat rekap.",
            });
            return [];
        }
        
        if (isLoadingPids) {
            toast({
                variant: "destructive",
                title: "Data PID belum termuat",
                description: "Silakan tunggu sebentar dan coba lagi.",
            });
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
                
                // Landscape pages
                if (orientation === 'landscape' || orientation === 'all') {
                     // Only Imprest Fund Cover is landscape
                    if (projectType !== 'BBM GENSET') {
                        const coverHtml = generateImprestFundCover(notasForProject, reportSA, projectType, pids || []);
                        pages.push({ html: coverHtml, orientation: 'landscape' });
                    }
                }

                // Portrait pages
                if (orientation === 'portrait' || orientation === 'all') {
                    // Rekapitulasi
                    const rekapHtml = generateRekapitulasiReport(notasForProject, reportSA, projectType, pids || []);
                    pages.push({ html: rekapHtml, orientation: 'portrait' });
                    
                    // Perincian
                    const perincianGroupedBySegment = notasForProject.reduce((acc, nota) => {
                        const seg = nota.segmen;
                        if (!acc[seg]) acc[seg] = [];
                        acc[seg].push(nota);
                        return acc;
                    }, {} as Record<string, Nota[]>);
                    
                    for (const segment of Object.keys(perincianGroupedBySegment).sort()) {
                        const notasInSegment = perincianGroupedBySegment[segment];
                        if (notasInSegment.length === 0) continue;

                        let segmentHtml = '';
                        let title: string;
                        
                         const bbmR2R4Segments = [
                            'BBM R2 Harian B2B IOAN', 'BBM R2 Harian PROVISIONING',
                            'BBM R4 Harian B2B IOAN', 'BBM R4 Harian PROVISIONING',
                            'BBM R4 Turlap B2B IOAN', 'BBM R4 Turlap PROVISIONING',
                            'BBM R4 UT B2B IOAN', 'BBM R4 UT PROVISIONING',
                            'BBM R4 Pengiriman Warehouse',
                        ];
                        
                        const jasaSegments = [
                            'Jasa B2B IOAN', 'Jasa PROVISIONING',
                            'Perincian Nota Pengiriman B2B IOAN', 'Perincian Nota Pengiriman PROVISIONING'
                        ];

                        if (jasaSegments.includes(segment)) {
                            const saTitlePart = reportSA.replace(/^SA /, '') === 'SEMUA SA' ? 'SEMUA' : reportSA.replace(/^SA /, '');
                            title = `Perincian Nota ${segment} - SERVICE AREA ${saTitlePart}`;
                            segmentHtml = generateJasaReport(notasInSegment, title);
                        } else if (bbmR2R4Segments.includes(segment)) {
                             let saPart: string;
                            if (segment === 'BBM R4 Pengiriman Warehouse') {
                                saPart = 'SS SMG';
                            } else {
                                const saTitlePart = reportSA.replace(/^SA /, '') === 'SEMUA SA' ? 'SEMUA' : reportSA.replace(/^SA /, '');
                                saPart = `SERVICE AREA ${saTitlePart}`;
                            }
                            title = `Perincian Nota ${segment} - ${saPart}`;
                            segmentHtml = generateBBMReport(notasInSegment, title);
                        } else {
                             let saPart: string;
                             const segmenProjectType = getProjectType(segment);
                             if (segmenProjectType === 'WAREHOUSE') {
                                saPart = 'SS SMG';
                             } else {
                                const saTitlePart = reportSA.replace(/^SA /, '') === 'SEMUA SA' ? 'SEMUA' : reportSA.replace(/^SA /, '');
                                saPart = `SERVICE AREA ${saTitlePart}`;
                             }
                             title = `Perincian Nota ${segment} - ${saPart}`;
                             const modifiedNotas = notasInSegment.map(nota => {
                                 if (segment === 'BBM Genset') return { ...nota, keterangan: '' };
                                 return nota;
                             });
                            segmentHtml = generateMaterialReport(modifiedNotas, title);
                        }
                        pages.push({ html: segmentHtml, orientation: 'portrait' });
                    }

                    // Eviden Foto BBM
                    const bbmR2R4SegmentsWithWarehouse = [
                        'BBM R2 Harian B2B IOAN', 'BBM R2 Harian PROVISIONING',
                        'BBM R4 Harian B2B IOAN', 'BBM R4 Harian PROVISIONING',
                        'BBM R4 Turlap B2B IOAN', 'BBM R4 Turlap PROVISIONING',
                        'BBM R4 UT B2B IOAN', 'BBM R4 UT PROVISIONING',
                        'BBM R4 Pengiriman Warehouse',
                    ];
                    const bbmNotas = notasForProject.filter(n => bbmR2R4SegmentsWithWarehouse.includes(n.segmen));
                    const evidenGroupedBySegmentBBM = bbmNotas.reduce((acc, nota) => {
                        const seg = nota.segmen;
                        if (!acc[seg]) acc[seg] = [];
                        acc[seg].push(nota);
                        return acc;
                    }, {} as Record<string, Nota[]>);
                    
                    for (const segment of Object.keys(evidenGroupedBySegmentBBM).sort()) {
                        const notasInSegment = evidenGroupedBySegmentBBM[segment];
                        if (notasInSegment.length === 0) continue;
                        
                        let title: string;
                        if (segment === 'BBM R4 Pengiriman Warehouse') {
                            title = `Eviden Foto - Perincian Nota ${segment} - SS SMG`;
                        } else {
                            const saTitlePart = reportSA.replace(/^SA /, '') === 'SEMUA SA' ? 'SEMUA' : reportSA.replace(/^SA /, '');
                            title = `Eviden Foto - Perincian Nota ${segment} - SERVICE AREA ${saTitlePart}`;
                        }
                        
                        const segmentHtml = generateEvidenReport(notasInSegment, title);
                        pages.push({ html: segmentHtml, orientation: 'portrait' });
                    }


                    // Eviden (non-BBM)
                    const nonBbmNotas = notasForProject.filter(n => !bbmR2R4SegmentsWithWarehouse.includes(n.segmen));
                     const evidenGroupedBySegment = nonBbmNotas.reduce((acc, nota) => {
                        const seg = nota.segmen;
                        if (!acc[seg]) acc[seg] = [];
                        acc[seg].push(nota);
                        return acc;
                    }, {} as Record<string, Nota[]>);
                    
                    for (const segment of Object.keys(evidenGroupedBySegment).sort()) {
                        const notasInSegment = evidenGroupedBySegment[segment];
                        if (notasInSegment.length === 0) continue;
                        
                        let title: string;
                        const segmenProjectType = getProjectType(segment);

                        if (segmenProjectType === 'WAREHOUSE') {
                            title = `Eviden Foto - Perincian Nota ${segment} - SS SMG`;
                        } else {
                             const saTitlePart = reportSA.replace(/^SA /, '') === 'SEMUA SA' ? 'SEMUA' : reportSA.replace(/^SA /, '');
                             title = `Eviden Foto - Perincian Nota ${segment} - SERVICE AREA ${saTitlePart}`;
                        }
                        
                        const segmentHtml = generateSimpleEvidenReport(notasInSegment, title);
                        pages.push({ html: segmentHtml, orientation: 'portrait' });
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
        const imageLoadPromises = images.map(img => new Promise<void>(resolve => {
            if (img.complete) resolve();
            else {
                img.onload = () => resolve();
                img.onerror = () => { console.warn(`Could not load image: ${img.src}`); resolve(); };
            }
        }));

        Promise.all(imageLoadPromises).then(() => {
            try {
                printIframe.contentWindow?.focus();
                printIframe.contentWindow?.print();
            } catch (e) {
                console.error('Print failed:', e);
                toast({ variant: "destructive", title: "Gagal Mencetak" });
            } finally {
                setTimeout(() => {
                    if (document.body.contains(printIframe)) {
                        document.body.removeChild(printIframe);
                    }
                }, 1000);
            }
        });
    };
    
    const handleGenerateReport = (orientation: 'portrait' | 'landscape' | 'all') => {
        setIsGenerating(true);
        const generatedPages = generatePages(orientation);
        if (generatedPages.length > 0) {
            setReportPages(generatedPages);
        }
        setIsGenerating(false);
    };

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
                                                        <Badge variant={getStatusVariant(nota.status)} className="capitalize">{nota.status}</Badge>
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
                        <div className="max-w-4xl mx-auto flex justify-around items-center gap-4">
                             <Button variant="outline" size="lg" onClick={handleExcelExport} disabled={isGenerating || isExporting || selectedNotaIds.length === 0}>
                                {isExporting ? <Loader2 className="mr-2 animate-spin"/> : <FileSpreadsheet className="mr-2" />}
                                Export Excel
                            </Button>
                            <Button variant="default" size="lg" onClick={() => handleGenerateReport('all')} disabled={isGenerating || isExporting || selectedNotaIds.length === 0}>
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
