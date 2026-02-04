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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { ArrowLeft, Edit, Trash2, Filter, FileText, Printer, FileArchive, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { format, getMonth, getYear, startOfDay, endOfDay } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { Nota } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge, badgeVariants } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';
import { useToast } from '@/hooks/use-toast';
import { toWords } from '@/lib/number-to-words';
import Image from 'next/image';
import type { VariantProps } from 'class-variance-authority';
import { useRouter } from 'next/navigation';

type ProjectType = 'B2B IOAN' | 'PROVISIONING' | 'SPPG' | 'BBM GENSET' | 'Lainnya';

const getProjectType = (segmen: string): ProjectType => {
    if (segmen === 'BBM Genset') return 'BBM GENSET';
    if (segmen.includes('SPPG')) return 'SPPG';
    if (segmen.includes('B2B IOAN')) return 'B2B IOAN';
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

const generateImprestFundCover = (notas: Nota[], serviceArea: string, projectType: ProjectType): string => {
    const today = new Date();
    const formattedDate = format(today, 'dd/MM/yyyy');
    const formattedDateLong = format(today, 'dd MMMM yyyy', { locale: idLocale });
    let grandTotal = 0;

    const saShort = serviceArea.replace('SA ', '');

    const tableRows = notas.map((nota, index) => {
        grandTotal += nota.nominal;
        let idProject = '-';
        if (projectType === 'B2B IOAN') idProject = 'TIF-215/2026';
        else if (projectType === 'PROVISIONING') idProject = 'TIF-32/2026';
        else if (projectType === 'SPPG') idProject = 'PPR-38/2025';

        return `
            <tr>
                <td style="border: 1px solid black; padding: 2px 4px; text-align: center;">${index + 1}</td>
                <td style="border: 1px solid black; padding: 2px 4px; text-align: center;">${format(nota.tanggal.toDate(), 'dd/MM/yyyy')}</td>
                <td style="border: 1px solid black; padding: 2px 4px; text-align: center;">${index + 1}</td>
                <td style="border: 1px solid black; padding: 2px 4px;">${nota.segmen}</td>
                <td style="border: 1px solid black; padding: 2px 4px; text-align: center;">${idProject}</td>
                <td style="border: 1px solid black; padding: 2px 4px; text-align: center;">-</td>
                <td style="border: 1px solid black; padding: 2px 4px; text-align: right;">${nota.nominal.toLocaleString('id-ID')}</td>
                <td style="border: 1px solid black; padding: 2px 4px; text-align: center;">-</td>
                <td style="border: 1px solid black; padding: 2px 4px; text-align: right;">${nota.nominal.toLocaleString('id-ID')}</td>
                <td style="border: 1px solid black; padding: 2px 4px; text-align: center;">-</td>
                <td style="border: 1px solid black; padding: 2px 4px; text-align: right;">-</td>
                <td style="border: 1px solid black; padding: 2px 4px; text-align: right;">${nota.nominal.toLocaleString('id-ID')}</td>
            </tr>
        `;
    }).join('');

    let projectName = `IF SEMARANG - SMG OPR - Ops ${projectType} Service Area ${saShort}`;
    if (projectType === 'SPPG') {
        projectName = `IF SEMARANG - SMG OPR - Ops SPPG Service Area ${saShort}`;
    }

    const idProjectDisplay = projectType === 'B2B IOAN' ? 'TIF-215/2026' : (projectType === 'PROVISIONING' ? 'TIF-32/2026' : (projectType === 'SPPG' ? 'PPR-38/2025' : '-'));

    return `
    <div style="font-family: Arial, sans-serif; color: black; font-size: 10pt; padding: 1.5cm; width: 297mm; min-height: 210mm; background-color: white; box-sizing: border-box; display: flex; flex-direction: column;">
        <div style="text-align: left;">
            <p style="margin: 0; font-size: 11pt;">PT. TELKOM AKSES</p>
            <p style="margin: 0; font-size: 11pt;">FINANCE REGIONAL III</p>
        </div>

        <div style="text-align: center; font-weight: bold; line-height: 1.2; margin-top: -2.5em; margin-bottom: 1rem;">
            <p style="margin: 0; font-size: 11pt; text-decoration: underline;">REKAP PERTANGGUNGAN IMPREST FUND / PANJAR KERJA *)</p>
        </div>

        <table style="font-size: 10pt; margin-bottom: 1rem;">
            <tr><td style="padding-right: 8px;">Unit Kerja</td><td>: Direktorat Operation</td></tr>
            <tr><td style="padding-right: 8px;">Cost Center</td><td>: TA03J08 - Semarang</td></tr>
            <tr><td style="padding-right: 8px;">Nama Project</td><td>: ${projectName}</td></tr>
        </table>

        <table style="width: 100%; border-collapse: collapse; font-size: 9pt; margin-bottom: 0.5rem;">
            <thead style="background-color: #DDEBF7; font-weight: bold; text-align: center;">
                <tr>
                    <th rowspan="2" style="border: 1px solid black; padding: 4px; vertical-align: middle;">No. Urut</th>
                    <th rowspan="2" style="border: 1px solid black; padding: 4px; vertical-align: middle;">TANGGAL</th>
                    <th rowspan="2" style="border: 1px solid black; padding: 4px; vertical-align: middle;">No. Kuitansi</th>
                    <th rowspan="2" style="border: 1px solid black; padding: 4px; width: 20%; vertical-align: middle;">URAIAN</th>
                    <th rowspan="2" style="border: 1px solid black; padding: 4px; vertical-align: middle;">ID PROJECT</th>
                    <th rowspan="2" style="border: 1px solid black; padding: 4px; vertical-align: middle;">No. Akun</th>
                    <th rowspan="2" style="border: 1px solid black; padding: 4px; vertical-align: middle;">NILAI PERTANGGUNGAN</th>
                    <th rowspan="2" style="border: 1px solid black; padding: 4px; vertical-align: middle;">PPN (Disetor Mitra)</th>
                    <th rowspan="2" style="border: 1px solid black; padding: 4px; vertical-align: middle;">NILAI KUITANSI</th>
                    <th colspan="2" style="border: 1px solid black; padding: 4px;">PPh 21, 23</th>
                    <th rowspan="2" style="border: 1px solid black; padding: 4px; vertical-align: middle;">BAYAR KE MITRA</th>
                </tr>
                <tr>
                    <th style="border: 1px solid black; padding: 4px; font-weight: normal;">PPh 4(2) *)</th>
                    <th style="border: 1px solid black; padding: 4px;"></th>
                </tr>
            </thead>
            <tbody>
                ${tableRows}
            </tbody>
            <tfoot>
                <tr style="font-weight: bold;">
                    <td colspan="6" style="border: 1px solid black; padding: 2px 4px; text-align: center;">JUMLAH</td>
                    <td style="border: 1px solid black; padding: 2px 4px; text-align: right;">${grandTotal.toLocaleString('id-ID')}</td>
                    <td style="border: 1px solid black; padding: 2px 4px; text-align: center;">-</td>
                    <td style="border: 1px solid black; padding: 2px 4px; text-align: right;">${grandTotal.toLocaleString('id-ID')}</td>
                    <td style="border: 1px solid black; padding: 2px 4px; text-align: center;">-</td>
                    <td style="border: 1px solid black; padding: 2px 4px; text-align: right;">-</td>
                    <td style="border: 1px solid black; padding: 2px 4px; text-align: right;">${grandTotal.toLocaleString('id-ID')}</td>
                </tr>
            </tfoot>
        </table>

        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-top: 1rem; flex-grow: 1;">
            <div style="width: 50%;">
                <table style="font-size: 10pt;">
                    <tr><td style="padding-right: 8px;">No. Dokumen</td><td>:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/KU/TA-0203/SMG/02-2026</td></tr>
                    <tr><td style="padding-right: 8px;">Berkas diterima tanggal</td><td>: ${formattedDate}</td></tr>
                    <tr><td style="padding-right: 8px;">Berkas lengkap tanggal</td><td>: ${formattedDate}</td></tr>
                </table>
            </div>
            <div style="width: 45%;">
                 <table style="width: 100%; border-collapse: collapse; font-size: 9pt;">
                    <thead style="background-color: #DDEBF7;">
                        <tr>
                            <th colspan="8" style="border: 1px solid black; padding: 2px 4px; text-align: left;">REKAP:</th>
                        </tr>
                        <tr>
                            <th style="border: 1px solid black; padding: 2px 4px; font-weight: bold;">No.</th>
                            <th style="border: 1px solid black; padding: 2px 4px; font-weight: bold;">ID PROJECT</th>
                            <th style="border: 1px solid black; padding: 2px 4px; font-weight: bold;">AKUN</th>
                            <th style="border: 1px solid black; padding: 2px 4px; font-weight: bold;">JUMLAH</th>
                            <th style="border: 1px solid black; padding: 2px 4px; font-weight: bold;">PPN</th>
                            <th style="border: 1px solid black; padding: 2px 4px; font-weight: bold;">NILAI KUITANSI</th>
                            <th style="border: 1px solid black; padding: 2px 4px; font-weight: bold;">PPh</th>
                            <th style="border: 1px solid black; padding: 2px 4px; font-weight: bold;">BAYAR KE MITRA</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="border: 1px solid black; padding: 2px 4px; text-align: center;">1</td>
                            <td style="border: 1px solid black; padding: 2px 4px; text-align: center;">${idProjectDisplay}</td>
                            <td style="border: 1px solid black; padding: 2px 4px;"></td>
                            <td style="border: 1px solid black; padding: 2px 4px; text-align: right;">${grandTotal.toLocaleString('id-ID')}</td>
                            <td style="border: 1px solid black; padding: 2px 4px; text-align: center;">-</td>
                            <td style="border: 1px solid black; padding: 2px 4px; text-align: right;">${grandTotal.toLocaleString('id-ID')}</td>
                            <td style="border: 1px solid black; padding: 2px 4px; text-align: center;">-</td>
                            <td style="border: 1px solid black; padding: 2px 4px; text-align: right;">${grandTotal.toLocaleString('id-ID')}</td>
                        </tr>
                         <tr style="font-weight: bold;">
                            <td colspan="3" style="border: 1px solid black; padding: 2px 4px;">JUMLAH</td>
                            <td style="border: 1px solid black; padding: 2px 4px; text-align: right;">${grandTotal.toLocaleString('id-ID')}</td>
                            <td style="border: 1px solid black; padding: 2px 4px; text-align: center;">-</td>
                            <td style="border: 1px solid black; padding: 2px 4px; text-align: right;">${grandTotal.toLocaleString('id-ID')}</td>
                            <td style="border: 1px solid black; padding: 2px 4px; text-align: center;">-</td>
                            <td style="border: 1px solid black; padding: 2px 4px; text-align: right;">${grandTotal.toLocaleString('id-ID')}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
        
        <table style="width: 100%; text-align: center; font-size: 10pt; margin-top: 1rem;">
             <tr>
                <td style="width: 33.3%; vertical-align: top;">Mengetahui<br/>Pemilik Anggaran,</td>
                <td style="width: 33.3%; vertical-align: top;">Mengetahui<br/>Pengelola IF / Panjar,</td>
                <td style="width: 33.3%; vertical-align: top;">Semarang, ${formattedDateLong}<br/>Dibuat/Diajukan oleh,</td>
            </tr>
            <tr><td colspan="3" style="height: 4rem;">&nbsp;</td></tr>
            <tr style="font-weight: bold;">
                <td style="text-decoration: underline;">GALIH AJI KUSUMAH</td>
                <td style="text-decoration: underline;">MUHAMMAD IKSAN</td>
                <td style="text-decoration: underline;">DESSY WAHYUNINGTIAS</td>
            </tr>
            <tr>
                <td>MGR BRANCH SEMARANG</td>
                <td>MGR SHARED SERVICE REGIONAL JAWA TENGAH & DIY</td>
                <td>OFF3 BUSINESS SUPPORT SEMARANG</td>
            </tr>
            <tr><td colspan="3" style="height: 1.5rem;">&nbsp;</td></tr>
            <tr>
                <td>Menyetujui,<br/>Penanggung Jawab IF</td>
                <td></td>
                <td>Mengetahui<br/>Pengelola IF</td>
            </tr>
            <tr><td colspan="3" style="height: 4rem;">&nbsp;</td></tr>
            <tr style="font-weight: bold;">
                <td style="text-decoration: underline;">HENRY SOEDIDARMA</td>
                <td></td>
                <td style="text-decoration: underline;">ARIZA ARBAATUS SOLIHA</td>
            </tr>
             <tr>
                <td>GM REGIONAL JAWA TENGAH DIY</td>
                <td></td>
                <td>MGR BUSINESS SUPPORT AREA JAWA BALI</td>
            </tr>
        </table>
        
        <div style="border: 2px solid black; padding: 4px; width: 150px; margin-top: auto;">
            DOC ID :
        </div>
    </div>
    `;
};


const generateRekapitulasiReport = (notas: Nota[], serviceArea: string, projectType: ProjectType): string => {
    const groupedBySegmen = notas.reduce((acc, nota) => {
        const key = nota.segmen;
        if (!acc[key]) {
            acc[key] = { items: [], total: 0 };
        }
        acc[key].items.push(nota);
        acc[key].total += nota.nominal;
        return acc;
    }, {} as Record<string, { items: Nota[], total: number }>);

    let grandTotal = 0;
    const tableRows = Object.entries(groupedBySegmen).map(([segmen, data], index) => {
        grandTotal += data.total;
        return `
            <tr style="print-color-adjust: exact; -webkit-print-color-adjust: exact;">
                <td style="padding: 4px 8px; border: 1px solid black; text-align: center;">${index + 1}</td>
                <td style="padding: 4px 8px; border: 1px solid black;">${segmen}</td>
                <td style="padding: 4px 8px; border: 1px solid black; text-align: left;">Rp${data.total.toLocaleString('id-ID')}</td>
            </tr>
        `;
    }).join('');

    const today = new Date();
    const formattedDate = format(today, 'dd MMMM yyyy', { locale: idLocale });
    const terbilangText = toWords(grandTotal);

    const saShort = serviceArea.replace('SA ', '');
    let pekerjaan = `SA ${saShort}`;
    let idProject = '-';

    if (projectType === 'B2B IOAN') {
        pekerjaan = `B2B IOAN SA ${saShort}`;
        idProject = 'TIF-215/2026';
    } else if (projectType === 'PROVISIONING') {
        pekerjaan = `PROVISIONING SA ${saShort}`;
        idProject = 'TIF-32/2026';
    } else if (projectType === 'SPPG') {
        pekerjaan = `SPPG SA ${saShort}`;
        idProject = 'PPR-38/2025';
    } else if (projectType === 'BBM GENSET') {
        pekerjaan = `BBM GENSET SA ${saShort}`;
        idProject = 'Ditagihkan ke Unit Lain';
    } else if (serviceArea === 'all') {
        pekerjaan = 'SEMUA SA';
    }

    return `
    <div style="font-family: Arial, sans-serif; color: black; font-size: 11pt; padding: 1cm; width: 210mm; min-height: 297mm; background-color: white; box-shadow: 0 0 5px rgba(0,0,0,0.1);">
        <div style="text-align: center; font-weight: bold; line-height: 1.2;">
            <p style="margin: 0; font-size: 12pt; text-decoration: underline;">PERTANGGUNGAN OPERASIONAL</p>
            <p style="margin: 0; font-size: 12pt;">SERVICE AREA ${saShort.toUpperCase()}</p>
            <p style="margin: 0; font-size: 12pt;">PEKERJAAN : ${pekerjaan.toUpperCase()}</p>
            <p style="margin: 0; font-size: 12pt;">ID PROJECT : ${idProject}</p>
        </div>
        <br/>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid black;">
            <thead style="background-color: #FED7AA; font-weight: bold; print-color-adjust: exact; -webkit-print-color-adjust: exact;">
                <tr>
                    <th style="padding: 4px 8px; border: 1px solid black; width: 5%;">NO</th>
                    <th style="padding: 4px 8px; border: 1px solid black;">KETERANGAN</th>
                    <th style="padding: 4px 8px; border: 1px solid black; width: 25%;">JUMLAH</th>
                </tr>
            </thead>
            <tbody>
                ${tableRows}
            </tbody>
            <tfoot style="print-color-adjust: exact; -webkit-print-color-adjust: exact;">
                <tr style="background-color: #FED7AA; font-weight: bold; print-color-adjust: exact; -webkit-print-color-adjust: exact;">
                    <td colspan="2" style="padding: 4px 8px; border: 1px solid black; text-align: center;">TOTAL</td>
                    <td style="padding: 4px 8px; border: 1px solid black; text-align: left;">Rp${grandTotal.toLocaleString('id-ID')}</td>
                </tr>
            </tfoot>
        </table>
        <div style="margin-top: 20px;">
            <p style="margin: 0;">Terbilang : (${terbilangText.charAt(0).toUpperCase() + terbilangText.slice(1)} Rupiah)</p>
        </div>
        <br/><br/>
        <table style="width: 100%; text-align: center; font-size: 11pt;">
            <tr>
                <td style="width: 50%; vertical-align: top;">
                    <p style="margin: 0;">&nbsp;</p>
                    <p style="margin: 0;">Menyetujui,</p>
                    <br/><br/><br/><br/>
                    <p style="text-decoration: underline; font-weight: bold; margin: 0;">GALIH AJI KUSUMAH</p>
                    <p style="margin: 0;">MGR BRANCH SEMARANG</p>
                </td>
                <td style="width: 50%; vertical-align: top;">
                    <p style="margin: 0;">Kudus, ${formattedDate}</p>
                    <p style="margin: 0;">Pembuat Rincian</p>
                    <br/><br/><br/><br/>
                    <p style="text-decoration: underline; font-weight: bold; margin: 0;">J. WAHYU SETYAWAN</p>
                    <p style="margin: 0;">Officer 3 Service Area Kudus</p>
                    <p style="margin: 0;">876858</p>
                </td>
            </tr>
        </table>
    </div>`;
};

const generateJasaReport = (notas: Nota[], title: string): string => {
    let grandTotal = 0;
    const tableRows = notas.map((nota, index) => {
        const dpp = nota.nominal / 1.02;
        const pph = nota.nominal - dpp;
        grandTotal += nota.nominal;
        return `
        <tr style="print-color-adjust: exact; -webkit-print-color-adjust: exact;">
            <td style="padding: 4px; border: 1px solid black; text-align: center;">${index + 1}</td>
            <td style="padding: 4px; border: 1px solid black;">${format(nota.tanggal.toDate(), 'dd/MM/yyyy')}</td>
            <td style="padding: 4px; border: 1px solid black;">${nota.keterangan || nota.namaBarang || '-'}</td>
            <td style="padding: 4px; border: 1px solid black; text-align: right;">${dpp.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td style="padding: 4px; border: 1px solid black; text-align: right;">${pph.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td style="padding: 4px; border: 1px solid black; text-align: right;">${nota.nominal.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
        `;
    }).join('');

    const today = new Date();
    const formattedDate = format(today, 'dd MMMM yyyy', { locale: idLocale });

    return `
    <div style="font-family: Arial, sans-serif; color: black; font-size: 11pt; padding: 1cm; width: 210mm; min-height: 297mm; background-color: white; box-shadow: 0 0 5px rgba(0,0,0,0.1);">
        <h2 style="font-size: 14pt; margin: 0; font-weight: bold; text-align: left; print-color-adjust: exact; -webkit-print-color-adjust: exact;">${title}</h2>
        <br/>
        <table style="width: 100%; border-collapse: collapse; border: 2px solid black; font-size: 9pt;">
            <thead style="background-color: #FED7AA; font-weight: bold; print-color-adjust: exact; -webkit-print-color-adjust: exact;">
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
                    <td style="padding: 4px; border: 1px solid black; font-weight: bold; text-align: right;">${grandTotal.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
            </tfoot>
        </table>
        <br/><br/>
        <table style="width: 100%; text-align: center; font-size: 11pt;">
            <tr>
                <td style="width: 50%; vertical-align: top;">
                    <p style="margin: 0;">&nbsp;</p>
                    <p style="margin: 0;">Menyetujui,</p>
                    <br/><br/><br/><br/>
                    <p style="text-decoration: underline; font-weight: bold; margin: 0;">GALIH AJI KUSUMAH</p>
                    <p style="margin: 0;">MGR BRANCH SEMARANG</p>
                </td>
                <td style="width: 50%; vertical-align: top;">
                    <p style="margin: 0;">Kudus, ${formattedDate}</p>
                    <p style="margin: 0;">Pembuat Rincian</p>
                    <br/><br/><br/><br/>
                    <p style="text-decoration: underline; font-weight: bold; margin: 0;">J. WAHYU SETYAWAN</p>
                    <p style="margin: 0;">Officer 3 Service Area Kudus</p>
                    <p style="margin: 0;">876858</p>
                </td>
            </tr>
        </table>
    </div>`;
};


const generateBBMReport = (notas: Nota[], title: string): string => {
    // Group notas by date
    const groupedByDate = notas.reduce((acc, nota) => {
        const dateKey = format(nota.tanggal.toDate(), 'yyyy-MM-dd');
        if (!acc[dateKey]) {
            acc[dateKey] = [];
        }
        acc[dateKey].push(nota);
        return acc;
    }, {} as Record<string, Nota[]>);
    
    const sortedDates = Object.keys(groupedByDate).sort();
    
    let grandTotal = 0;
    let tableRows = '';
    let overallIndex = 0;

    for (const dateKey of sortedDates) {
        const notasOnDate = groupedByDate[dateKey];
        let dateSubtotal = 0;

        for (const nota of notasOnDate) {
            overallIndex++;
            grandTotal += nota.nominal;
            dateSubtotal += nota.nominal;
            const staticKeterangan = nota.segmen;

            tableRows += `
                <tr style="print-color-adjust: exact; -webkit-print-color-adjust: exact;">
                    <td style="padding: 4px; border: 1px solid black; text-align: center;">${overallIndex}</td>
                    <td style="padding: 4px; border: 1px solid black;">${format(nota.tanggal.toDate(), 'dd-MMM-yy', { locale: idLocale })}</td>
                    <td style="padding: 4px; border: 1px solid black;">${staticKeterangan}</td>
                    <td style="padding: 4px; border: 1px solid black;">${nota.noPlatKendaraan || '-'}</td>
                    <td style="padding: 4px; border: 1px solid black; text-align: center;">${nota.kmAwal || '-'}</td>
                    <td style="padding: 4px; border: 1px solid black; text-align: center;">${nota.kmAkhir || '-'}</td>
                    <td style="padding: 4px; border: 1px solid black; white-space: normal; word-break: break-all;">${nota.keterangan || '-'}</td>
                    <td style="padding: 4px; border: 1px solid black; text-align: right;">Rp${nota.nominal.toLocaleString('id-ID')}</td>
                    <td style="padding: 4px; border: 1px solid black;">${nota.namaPic}</td>
                </tr>
            `;
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
    <div style="font-family: Arial, sans-serif; color: black; font-size: 11pt; padding: 1cm; width: 210mm; min-height: 297mm; background-color: white; box-shadow: 0 0 5px rgba(0,0,0,0.1);">
        <h2 style="font-size: 14pt; margin: 0; font-weight: bold; text-align: left; print-color-adjust: exact; -webkit-print-color-adjust: exact;">${title}</h2>
        <br/>
        <table style="width: 100%; border-collapse: collapse; border: 2px solid black; font-size: 9pt;">
            <thead style="background-color: #FED7AA; font-weight: bold; print-color-adjust: exact; -webkit-print-color-adjust: exact;">
                <tr>
                    ${['NO', 'TANGGAL', 'KETERANGAN', 'NO PLAT', 'KM AWAL', 'KM AKHIR', 'URAIAN PEKERJAAN', 'JUMLAH', 'NAMA'].map(h => `<th style="padding: 4px; border: 1px solid black;">${h}</th>`).join('')}
                </tr>
            </thead>
            <tbody>${tableRows}</tbody>
            <tfoot style="print-color-adjust: exact; -webkit-print-color-adjust: exact;">
                <tr style="background-color: #FED7AA; font-weight: bold; print-color-adjust: exact; -webkit-print-color-adjust: exact;">
                    <td colspan="7" style="padding: 4px; border: 1px solid black; font-weight: bold; text-align: right;">TOTAL</td>
                    <td style="padding: 4px; border: 1px solid black; font-weight: bold; text-align: right;">Rp${grandTotal.toLocaleString('id-ID')}</td>
                    <td style="padding: 4px; border: 1px solid black;"></td>
                </tr>
            </tfoot>
        </table>
        <br/><br/>
        <table style="width: 100%; text-align: center; font-size: 11pt;">
            <tr>
                <td style="width: 50%; vertical-align: top;">
                    <p style="margin: 0;">&nbsp;</p>
                    <p style="margin: 0;">Menyetujui,</p>
                    <br/><br/><br/><br/>
                    <p style="text-decoration: underline; font-weight: bold; margin: 0;">GALIH AJI KUSUMAH</p>
                    <p style="margin: 0;">MGR BRANCH SEMARANG</p>
                </td>
                <td style="width: 50%; vertical-align: top;">
                    <p style="margin: 0;">Kudus, ${formattedDate}</p>
                    <p style="margin: 0;">Pembuat Rincian</p>
                    <br/><br/><br/><br/>
                    <p style="text-decoration: underline; font-weight: bold; margin: 0;">J. WAHYU SETYAWAN</p>
                    <p style="margin: 0;">Officer 3 Service Area Kudus</p>
                    <p style="margin: 0;">876858</p>
                </td>
            </tr>
        </table>
    </div>`;
};

const generateMaterialReport = (notas: Nota[], title: string): string => {
    let grandTotal = 0;
    const tableRows = notas.map((nota, index) => {
        grandTotal += nota.nominal;
        return `
        <tr style="print-color-adjust: exact; -webkit-print-color-adjust: exact;">
            <td style="padding: 4px; border: 1px solid black; text-align: center;">${index + 1}</td>
            <td style="padding: 4px; border: 1px solid black;">${format(nota.tanggal.toDate(), 'dd/MM/yyyy')}</td>
            <td style="padding: 4px; border: 1px solid black;">${nota.namaBarang || '-'}</td>
            <td style="padding: 4px; border: 1px solid black;">${nota.keterangan || '-'}</td>
            <td style="padding: 4px; border: 1px solid black; text-align: right;">${nota.nominal.toLocaleString('id-ID')}</td>
        </tr>`;
    }).join('');

    const today = new Date();
    const formattedDate = format(today, 'dd MMMM yyyy', { locale: idLocale });

    return `
    <div style="font-family: Arial, sans-serif; color: black; font-size: 11pt; padding: 1cm; width: 210mm; min-height: 297mm; background-color: white; box-shadow: 0 0 5px rgba(0,0,0,0.1);">
        <h2 style="font-size: 14pt; margin: 0; font-weight: bold; text-align: left; print-color-adjust: exact; -webkit-print-color-adjust: exact;">${title}</h2>
        <br/>
        <table style="width: 100%; border-collapse: collapse; border: 2px solid black; font-size: 9pt;">
            <thead style="background-color: #FED7AA; font-weight: bold; print-color-adjust: exact; -webkit-print-color-adjust: exact;">
                <tr>
                    ${['NO', 'TANGGAL', 'Nama Barang', 'Keterangan', 'Jumlah'].map(h => `<th style="padding: 4px; border: 1px solid black;">${h}</th>`).join('')}
                </tr>
            </thead>
            <tbody>${tableRows}</tbody>
            <tfoot style="print-color-adjust: exact; -webkit-print-color-adjust: exact;">
                <tr style="background-color: #FED7AA; font-weight: bold; print-color-adjust: exact; -webkit-print-color-adjust: exact;">
                    <td colspan="4" style="padding: 4px; border: 1px solid black; font-weight: bold; text-align: right;">TOTAL</td>
                    <td style="padding: 4px; border: 1px solid black; font-weight: bold; text-align: right;">${grandTotal.toLocaleString('id-ID')}</td>
                </tr>
            </tfoot>
        </table>
        <br/><br/>
        <table style="width: 100%; text-align: center; font-size: 11pt;">
            <tr>
                <td style="width: 50%; vertical-align: top;">
                    <p style="margin: 0;">&nbsp;</p>
                    <p style="margin: 0;">Menyetujui,</p>
                    <br/><br/><br/><br/>
                    <p style="text-decoration: underline; font-weight: bold; margin: 0;">GALIH AJI KUSUMAH</p>
                    <p style="margin: 0;">MGR BRANCH SEMARANG</p>
                </td>
                <td style="width: 50%; vertical-align: top;">
                    <p style="margin: 0;">Kudus, ${formattedDate}</p>
                    <p style="margin: 0;">Pembuat Rincian</p>
                    <br/><br/><br/><br/>
                    <p style="text-decoration: underline; font-weight: bold; margin: 0;">J. WAHYU SETYAWAN</p>
                    <p style="margin: 0;">Officer 3 Service Area Kudus</p>
                    <p style="margin: 0;">876858</p>
                </td>
            </tr>
        </table>
    </div>`;
};

const generateEvidenReport = (notas: Nota[], title: string): string => {
    const tableRows = notas.map((nota, index) => {
        // Form supports 4 images for Keperluan, 3 for KM readings.
        const keperluanImageUrls = (nota.fotoEvidenUrls || []).slice(0, 4);
        const evidenKmUrl = nota.fotoEvidenUrls?.[4]; // Corresponds to KM Awal Bulan
        const evidenKmAwalUrl = nota.fotoEvidenUrls?.[5];
        const evidenKmAkhirUrl = nota.fotoEvidenUrls?.[6];

        const keperluanImagesHtml = keperluanImageUrls.map(url =>
            `<img src="${url}" style="width: 60px; height: auto; object-fit: contain; border: 1px solid #eee;"/>`
        ).join('');

        const renderImageCell = (url: string | undefined) => {
            if (!url) return '<div style="width: 60px; height: 60px;"></div>'; // Keep cell height consistent
            return `<img src="${url}" style="width: 60px; height: auto; object-fit: contain; margin: auto;"/>`;
        };
        
        const selisih = (nota.kmAkhir != null && nota.kmAwal != null && nota.kmAkhir > nota.kmAwal) ? (nota.kmAkhir - nota.kmAwal) : '';

        // Split by space and join with <br/> for multiline effect as in the image.
        const ketText = nota.segmen.replace(' ', '<br/>');

        return `
        <tr style="print-color-adjust: exact; -webkit-print-color-adjust: exact;">
            <td style="border: 1px solid black; padding: 4px; text-align: center; vertical-align: top;">${index + 1}</td>
            <td style="border: 1px solid black; padding: 4px; vertical-align: top; white-space: nowrap;">${format(nota.tanggal.toDate(), 'dd MMMM yyyy', { locale: idLocale })}</td>
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

    const headers = ['No', 'TANGGAL', 'KET', 'NO PLAT', 'SELISIH', 'KM AWAL', 'KM AKHIR', 'KEPERLUAN', 'Eviden KM', 'Eviden KM Awal', 'Eviden KM Akhir', 'PIC', 'Nilai'];

    return `
    <div style="font-family: Arial, sans-serif; color: black; font-size: 9pt; padding: 1cm; width: 210mm; min-height: 297mm; background-color: white; box-shadow: 0 0 5px rgba(0,0,0,0.1);">
        <h2 style="text-align: left; font-size: 14pt; margin: 0; font-weight: bold; text-decoration: underline; print-color-adjust: exact; -webkit-print-color-adjust: exact;">${title}</h2>
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
        const evidenImagesHtml = (nota.fotoEvidenUrls || []).map(url => 
            `<img src="${url}" style="width: 60px; height: auto; object-fit: contain; border: 1px solid #eee;"/>`
        ).join('');
        
        // Use a grid to display multiple photos within the cell
        const evidenCellContent = `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; align-items: center; justify-content: start;">${evidenImagesHtml}</div>`;


        return `
        <tr style="print-color-adjust: exact; -webkit-print-color-adjust: exact;">
            <td style="border: 1px solid black; padding: 4px; text-align: center; vertical-align: top;">${index + 1}</td>
            <td style="border: 1px solid black; padding: 4px; vertical-align: top; white-space: nowrap;">${format(nota.tanggal.toDate(), 'dd MMMM yyyy', { locale: idLocale })}</td>
            <td style="border: 1px solid black; padding: 4px; vertical-align: top;">${nota.namaBarang || nota.keterangan || '-'}</td>
            <td style="border: 1px solid black; padding: 4px; vertical-align: top;">${evidenCellContent}</td>
            <td style="border: 1px solid black; padding: 4px; vertical-align: top;">${nota.namaPic}</td>
            <td style="border: 1px solid black; padding: 4px; text-align: right; vertical-align: top;">Rp${nota.nominal.toLocaleString('id-ID')}</td>
        </tr>`;
    }).join('');

    const headers = ['No', 'Tanggal', 'Keterangan', 'Eviden', 'PIC', 'Nilai'];

    return `
    <div style="font-family: Arial, sans-serif; color: black; font-size: 11pt; padding: 1cm; width: 210mm; min-height: 297mm; background-color: white; box-shadow: 0 0 5px rgba(0,0,0,0.1);">
        <h2 style="font-size: 14pt; margin: 0; font-weight: bold; text-align: left; print-color-adjust: exact; -webkit-print-color-adjust: exact;">${title}</h2>
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
}: {
  pages: string[];
  onClose: () => void;
}) {

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
        <style>
            {`
            @media print {
                body * {
                    visibility: hidden;
                }
                #print-section, #print-section * {
                    visibility: visible;
                }
                #print-section {
                    position: static;
                }
                .report-page-container:not(:first-child) {
                    break-before: page;
                }
                @page {
                    size: A4 landscape;
                    margin: 0;
                }
            }
            `}
        </style>
      
      {/* On-screen modal, hidden on print */}
      <div className="fixed inset-0 bg-black/80 z-50 flex justify-center items-center p-4 print:hidden">
        <Card className="w-full max-w-7xl h-[90vh] flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Pratinjau Laporan</CardTitle>
            <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>Tutup</Button>
                <Button onClick={handlePrint}><Printer className="mr-2" /> Cetak</Button>
            </div>
            </CardHeader>
            <CardContent className="flex-grow overflow-auto bg-gray-200 p-4">
                <div className="mx-auto flex flex-col items-center gap-y-4">
                    {pages.map((pageHtml, index) => (
                        <div
                            key={index}
                            className="bg-white shadow-lg"
                            style={{width: '297mm', minHeight: '210mm'}}
                            dangerouslySetInnerHTML={{ __html: pageHtml }}
                        />
                    ))}
                </div>
            </CardContent>
        </Card>
      </div>


      {/* Content for printing, hidden on screen */}
      <div id="print-section" className="hidden print:block">
          {pages.map((pageHtml, index) => (
              <div
                  key={index}
                  className="report-page-container bg-white"
                  dangerouslySetInnerHTML={{ __html: pageHtml }}
              />
          ))}
      </div>
    </>
  );
}


const getMonthYearOptions = (notas: Nota[]) => {
    const monthYears = new Set<string>();
    notas.forEach(nota => {
        let date: Date | null = null;
        if (nota.tanggal?.toDate) {
            // Firestore Timestamp
            date = nota.tanggal.toDate();
        } else if (typeof nota.tanggal === 'string' && new Date(nota.tanggal).toString() !== 'Invalid Date') {
            // ISO string
            date = new Date(nota.tanggal);
        } else if (nota.tanggal instanceof Date) {
            // JavaScript Date object
            date = nota.tanggal;
        }

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

    const { data: notas, isLoading } = useCollection<Nota>(notasQuery);

    const [filterType, setFilterType] = useState('monthly');
    const [selectedMonth, setSelectedMonth] = useState<string>('');
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [verifiedDateRange, setVerifiedDateRange] = useState<DateRange | undefined>(undefined);
    const [selectedSA, setSelectedSA] = useState<string>('all');
    const [selectedStatus, setSelectedStatus] = useState<string>('all');

    const [selectedNotaIds, setSelectedNotaIds] = useState<string[]>([]);

    const [reportPages, setReportPages] = useState<string[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [reportTypeBeingGenerated, setReportTypeBeingGenerated] = useState('');
    
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);


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
                let date: Date | null = null;
                if (nota.tanggal?.toDate) { date = nota.tanggal.toDate(); } 
                else if (nota.tanggal instanceof Date) { date = nota.tanggal; }
                if (!date) return false;

                return getYear(date) === year && getMonth(date) === month - 1;
            });
        } else if (filterType === 'range') {
            if (!dateRange?.from || !dateRange?.to) return [];
            const fromDate = startOfDay(dateRange.from);
            const toDate = endOfDay(dateRange.to);
            result = notas.filter(nota => {
                if (!nota.tanggal?.toDate) return false;
                const date = nota.tanggal.toDate();
                return date >= fromDate && date <= toDate;
            });
        } else if (filterType === 'verified') {
            if (!verifiedDateRange?.from || !verifiedDateRange?.to) return [];
             const fromDate = startOfDay(verifiedDateRange.from);
             const toDate = endOfDay(verifiedDateRange.to);
             result = notas.filter(nota => {
                if (nota.status !== 'verified' || !nota.tanggalVerifikasi?.toDate) return false;
                const date = nota.tanggalVerifikasi.toDate();
                return date >= fromDate && date <= toDate;
            });
        }
        
        if (selectedStatus !== 'all') {
            result = result.filter(nota => nota.status === selectedStatus);
        }

        if (selectedSA !== 'all') {
            result = result.filter(nota => nota.serviceArea === selectedSA);
        }

        return result.sort((a,b) => a.tanggal.toDate().getTime() - b.tanggal.toDate().getTime());
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


    const handleGenerateReport = async (reportType: string) => {
        if (selectedNotaIds.length === 0) {
            toast({
                variant: "destructive",
                title: "Tidak ada laporan dipilih",
                description: "Silakan pilih setidaknya satu laporan untuk membuat rekap.",
            });
            return;
        }
        
        setIsGenerating(true);
        setReportTypeBeingGenerated(reportType);
        const selectedNotas = filteredNotas.filter(n => selectedNotaIds.includes(n.id)) || [];
        const sortedNotas = selectedNotas.sort((a,b) => a.tanggal.toDate().getTime() - b.tanggal.toDate().getTime());
        const pages: string[] = [];

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
                const saShortForTitle = reportSA.replace(/^SA /, '');
                
                // --- 0. Imprest Fund Cover Page ---
                if ((reportType === 'all' || reportType === 'rekap') && projectType !== 'BBM GENSET') {
                    const coverHtml = generateImprestFundCover(notasForProject, reportSA, projectType);
                    pages.push(coverHtml);
                }


                // --- 1. Rekapitulasi ---
                if (reportType === 'all' || reportType === 'rekap') {
                    const rekapHtml = generateRekapitulasiReport(notasForProject, reportSA, projectType);
                    pages.push(rekapHtml);
                }

                // --- 2. Perincian ---
                if (reportType === 'all' || reportType === 'perincian') {
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
                        const projectTitlePart = projectType === 'Lainnya' ? '' : projectType + ' - ';
                        const saTitlePart = saShortForTitle === 'SEMUA SA' ? 'SEMUA' : saShortForTitle;
                        const title = `Perincian Nota ${segment} - ${projectTitlePart}${saTitlePart}`;
                        
                        const bbmR2R4Segments = [
                            'BBM R2 Harian B2B IOAN', 'BBM R2 Harian PROVISIONING',
                            'BBM R4 Harian B2B IOAN', 'BBM R4 Harian PROVISIONING',
                            'BBM R4 Turlap B2B IOAN', 'BBM R4 Turlap PROVISIONING',
                            'BBM R4 UT B2B IOAN', 'BBM R4 UT PROVISIONING',
                        ];

                        if (segment.startsWith('jasa') || segment.startsWith('Perincian Nota Pengiriman')) {
                            segmentHtml = generateJasaReport(notasInSegment, title);
                        } else if (bbmR2R4Segments.includes(segment)) {
                            segmentHtml = generateBBMReport(notasInSegment, title);
                        } else {
                             const modifiedNotas = notasInSegment.map(nota => {
                                 if (segment === 'BBM Genset') return { ...nota, keterangan: '' };
                                 return nota;
                             });
                            segmentHtml = generateMaterialReport(modifiedNotas, title);
                        }
                        pages.push(segmentHtml);
                    }
                }
                
                // --- 3. Eviden ---
                if (reportType === 'all' || reportType === 'eviden') {
                    const evidenGroupedBySegment = notasForProject.reduce((acc, nota) => {
                        const seg = nota.segmen;
                        if (!acc[seg]) acc[seg] = [];
                        acc[seg].push(nota);
                        return acc;
                    }, {} as Record<string, Nota[]>);

                    const bbmR2R4Segments = [
                        'BBM R2 Harian B2B IOAN', 'BBM R2 Harian PROVISIONING',
                        'BBM R4 Harian B2B IOAN', 'BBM R4 Harian PROVISIONING',
                        'BBM R4 Turlap B2B IOAN', 'BBM R4 Turlap PROVISIONING',
                        'BBM R4 UT B2B IOAN', 'BBM R4 UT PROVISIONING',
                    ];

                    for (const segment of Object.keys(evidenGroupedBySegment).sort()) {
                        const notasInSegment = evidenGroupedBySegment[segment];
                        if (notasInSegment.length === 0) continue;

                        let segmentHtml = '';
                        const projectTitlePart = projectType === 'Lainnya' ? '' : projectType + ' - ';
                        const saTitlePart = saShortForTitle === 'SEMUA SA' ? 'SEMUA' : saShortForTitle;
                        const title = `Eviden Foto - Perincian Nota ${segment} - ${projectTitlePart}${saTitlePart}`;


                        if (bbmR2R4Segments.includes(segment)) {
                            segmentHtml = generateEvidenReport(notasInSegment, title);
                        } else {
                            segmentHtml = generateSimpleEvidenReport(notasInSegment, title);
                        }
                        pages.push(segmentHtml);
                    }
                }
            }


            if (pages.length > 0) {
                setReportPages(pages);
            } else {
                 toast({ variant: "destructive", title: "Tidak ada data untuk laporan ini" });
            }
        } catch (error) {
            console.error("Error generating report:", error);
            toast({ variant: "destructive", title: "Gagal Membuat Laporan", description: "Terjadi kesalahan."});
        } finally {
            setIsGenerating(false);
            setReportTypeBeingGenerated('');
        }
    };

    return (
        <>
            <div className="print:hidden">
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
                                                        format(verifiedDateRange.from, "dd LLL, yy")
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
                                                    {nota.tanggal?.toDate ? format(nota.tanggal.toDate(), 'dd MMM yyyy', { locale: idLocale }) : 'Invalid Date'}
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
                        <div className="max-w-4xl mx-auto flex justify-around items-center">
                            <Button variant="outline" size="lg" onClick={() => handleGenerateReport('all')} disabled={isGenerating || selectedNotaIds.length === 0}>
                               {isGenerating && reportTypeBeingGenerated === 'all' ? <Loader2 className="mr-2 animate-spin"/> : <FileArchive className="mr-2" />} Semua (1 File)
                            </Button>
                            <Button variant="outline" size="lg" onClick={() => handleGenerateReport('rekap')} disabled={isGenerating || selectedNotaIds.length === 0}>
                                {isGenerating && reportTypeBeingGenerated === 'rekap' ? <Loader2 className="mr-2 animate-spin"/> : <FileText className="mr-2" />} Rekap
                            </Button>
                            <Button variant="outline" size="lg" onClick={() => handleGenerateReport('perincian')} disabled={isGenerating || selectedNotaIds.length === 0}>
                                {isGenerating && reportTypeBeingGenerated === 'perincian' ? <Loader2 className="mr-2 animate-spin"/> : <Printer className="mr-2" />} Perincian
                            </Button>
                            <Button size="lg" onClick={() => handleGenerateReport('eviden')} disabled={isGenerating || selectedNotaIds.length === 0}>
                                {isGenerating && reportTypeBeingGenerated === 'eviden' ? <Loader2 className="mr-2 animate-spin"/> : <FileText className="mr-2" />} Eviden
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
            {reportPages.length > 0 && <ReportPreview pages={reportPages} onClose={() => setReportPages([])} />}
        </>
    );
}
