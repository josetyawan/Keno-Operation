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
import { ArrowLeft, Edit, Trash2, Filter, FileArchive, Printer, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
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
    const saShort = serviceArea.replace('SA ', '');
    const projectName = `IF SEMARANG - SMG OPR - Ops ${projectType} Service Area ${saShort}`;

    let grandTotal = 0;
    const tableRows = notas.map((nota, index) => {
        grandTotal += nota.nominal;
        return `
            <tr>
                <td style="border: 1px solid black; padding: 2px 4px; text-align: center;">${index + 1}</td>
                <td style="border: 1px solid black; padding: 2px 4px; text-align: center;">${format(nota.tanggal.toDate(), 'dd/MM/yyyy')}</td>
                <td style="border: 1px solid black; padding: 2px 4px; text-align: center;">${index + 1}</td>
                <td style="border: 1px solid black; padding: 2px 4px;">${nota.segmen}</td>
                <td style="border: 1px solid black; padding: 2px 4px; text-align: right;">-</td>
                <td style="border: 1px solid black; padding: 2px 4px; text-align: right;">-</td>
                <td style="border: 1px solid black; padding: 2px 4px; text-align: right;">${nota.nominal.toLocaleString('id-ID')}</td>
            </tr>
        `;
    }).join('');
    
    const signatureTable = `
    <div style="font-size: 8pt; width: 100%; page-break-inside: avoid; margin-top: 1.5rem;">
        <table style="width: 100%; text-align: center; border-collapse: collapse;">
            <tbody>
                <tr>
                    <td style="width: 25%;">Mengetahui<br/>Pemilik Anggaran,</td>
                    <td style="width: 25%;">Mengetahui<br/>Pengelola IF / Panjar,</td>
                    <td style="width: 25%;"></td>
                    <td style="width: 25%;">Semarang, ${formattedDate}<br/>Dibuat/Diajukan oleh,</td>
                </tr>
                <tr>
                    <td style="height: 60px;"></td>
                    <td></td>
                    <td></td>
                    <td></td>
                </tr>
                <tr>
                    <td style="text-decoration: underline; font-weight: bold;">GALIH AJI KUSUMAH</td>
                    <td style="text-decoration: underline; font-weight: bold;">MUHAMMAD IKSAN</td>
                    <td></td>
                    <td style="text-decoration: underline; font-weight: bold;">DESSY WAHYUNINGTIAS</td>
                </tr>
                <tr>
                    <td>MGR BRANCH SEMARANG</td>
                    <td>MGR SHARED SERVICE REGIONAL JAWA TENGAH & DIY</td>
                    <td></td>
                    <td>OFF3 BUSINESS SUPPORT SEMARANG</td>
                </tr>
                <tr>
                    <td colspan="4" style="height: 20px;"></td>
                </tr>
                <tr>
                    <td></td>
                    <td>Menyetujui,<br/>Penanggung Jawab IF</td>
                    <td>Mengetahui<br/>Pengelola IF</td>
                    <td></td>
                </tr>
                <tr>
                    <td style="height: 60px;"></td>
                    <td></td>
                    <td></td>
                    <td></td>
                </tr>
                <tr>
                    <td></td>
                    <td style="text-decoration: underline; font-weight: bold;">HENRY SOEDIDARMA</td>
                    <td style="text-decoration: underline; font-weight: bold;">ARIZA ARBAATUS SOLIHA</td>
                    <td></td>
                </tr>
                 <tr>
                    <td></td>
                    <td>GM REGIONAL JAWA TENGAH DIY</td>
                    <td>MGR BUSINESS SUPPORT AREA JAWA BALI</td>
                    <td></td>
                </tr>
            </tbody>
        </table>
        <div style="border: 1px solid black; padding: 8px; font-weight: bold; width: 150px; text-align: left; margin-top: 1.5rem;">
            DOC ID :
        </div>
    </div>
    `;

    return `
    <div style="font-family: Arial, sans-serif; color: black; font-size: 9pt; width: 100%; height: 100%; box-sizing: border-box; page-break-inside: avoid; display: flex; flex-direction: column;">
        <div style="text-align: left; font-size: 11pt; font-weight: bold;">
            PT. TELKOM AKSES<br/>
            FINANCE REGIONAL III
        </div>
        <div style="text-align: center; font-size: 11pt; font-weight: bold; text-decoration: underline; margin-top: 1rem; margin-bottom: 1rem;">
            REKAP PERTANGGUNGAN IMPREST FUND / PANJAR KERJA *)
        </div>
        
        <table style="font-size: 10pt; margin-bottom: 1rem; width: 100%;">
            <tr><td style="width: 15%;">Unit Kerja</td><td>: Direktorat Operation</td></tr>
            <tr><td>Cost Center</td><td>: TA03J08 - Semarang</td></tr>
            <tr><td>Nama Project</td><td>: ${projectName}</td></tr>
        </table>

        <div style="flex-grow: 1;">
            <table style="width: 100%; border-collapse: collapse; font-size: 8pt;">
                <thead style="background-color: #DDEBF7; font-weight: bold; text-align: center; print-color-adjust: exact; -webkit-print-color-adjust: exact;">
                    <tr>
                        <th style="border: 1px solid black; padding: 4px; vertical-align: middle;">No. Urut</th>
                        <th style="border: 1px solid black; padding: 4px; vertical-align: middle;">TANGGAL</th>
                        <th style="border: 1px solid black; padding: 4px; vertical-align: middle;">No. Kuitansi</th>
                        <th style="border: 1px solid black; padding: 4px; width: 35%; vertical-align: middle;">URAIAN</th>
                        <th style="border: 1px solid black; padding: 4px;">PPN (Disetor Mitra)</th>
                        <th style="border: 1px solid black; padding: 4px;">DPP</th>
                        <th style="border: 1px solid black; padding: 4px;">NILAI KUITANSI</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
                <tfoot>
                    <tr style="font-weight: bold;">
                        <td colspan="4" style="border: 1px solid black; padding: 2px 4px; text-align: center;">JUMLAH</td>
                        <td style="border: 1px solid black; padding: 2px 4px; text-align: right;">-</td>
                        <td style="border: 1px solid black; padding: 2px 4px; text-align: right;">-</td>
                        <td style="border: 1px solid black; padding: 2px 4px; text-align: right;">${grandTotal.toLocaleString('id-ID')}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
        
        <div style="margin-top: auto;">${signatureTable}</div>
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
                <td style="padding: 4px 8px; border: 1px solid black; text-align: left;">Rp ${data.total.toLocaleString('id-ID')}</td>
            </tr>
        `;
    }).join('');

    const today = new Date();
    const formattedDate = format(today, 'dd MMMM yyyy', { locale: idLocale });
    const terbilangText = toWords(grandTotal);

    let saShort = serviceArea.replace('SA ', '');
    let pekerjaan = saShort;
    let idProject = '-';

    if (projectType === 'B2B IOAN') {
        pekerjaan = `B2B IOAN ${saShort}`;
        idProject = 'TIF-215/2026';
    } else if (projectType === 'PROVISIONING') {
        pekerjaan = `PROVISIONING ${saShort}`;
        idProject = 'TIF-32/2026';
    } else if (projectType === 'SPPG') {
        pekerjaan = `SPPG ${saShort}`;
        idProject = 'PPR-38/2025';
    } else if (projectType === 'BBM GENSET') {
        pekerjaan = `BBM GENSET ${saShort}`;
        idProject = 'Ditagihkan ke Unit Lain';
    } else if (serviceArea === 'all') {
        pekerjaan = 'SEMUA';
        saShort = '';
    }

    return `
    <div style="font-family: Arial, sans-serif; color: black; font-size: 11pt; background-color: white; page-break-inside: avoid;">
        <div style="text-align: center; font-weight: bold; line-height: 1.2;">
            <p style="margin: 0; font-size: 12pt; text-decoration: underline;">PERTANGGUNGAN OPERASIONAL</p>
            <p style="margin: 0; font-size: 12pt;">${saShort.toUpperCase()}</p>
            <p style="margin: 0; font-size: 12pt;">PEKERJAAN: ${pekerjaan.toUpperCase()}</p>
            <p style="margin: 0; font-size: 12pt;">ID PROJECT: ${idProject}</p>
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
                    <td style="padding: 4px 8px; border: 1px solid black; text-align: left;">Rp ${grandTotal.toLocaleString('id-ID')}</td>
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
    <div style="font-family: Arial, sans-serif; color: black; font-size: 11pt; background-color: white; page-break-inside: avoid;">
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
    <div style="font-family: Arial, sans-serif; color: black; font-size: 11pt; background-color: white; page-break-inside: avoid;">
        <h2 style="font-size: 14pt; margin: 0; font-weight: bold; text-align: left; print-color-adjust: exact; -webkit-print-color-adjust: exact;">${title}</h2>
        <br/>
        <table style="width: 100%; border-collapse: collapse; border: 2px solid black; font-size: 9pt;">
            <thead style="background-color: #FED7AA; font-weight: bold; text-align: center; print-color-adjust: exact; -webkit-print-color-adjust: exact;">
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
    <div style="font-family: Arial, sans-serif; color: black; font-size: 11pt; background-color: white; page-break-inside: avoid;">
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
    <div style="font-family: Arial, sans-serif; color: black; font-size: 9pt; background-color: white; page-break-inside: avoid;">
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
    <div style="font-family: Arial, sans-serif; color: black; font-size: 11pt; background-color: white; page-break-inside: avoid;">
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
  pages: {html: string, orientation: 'portrait' | 'landscape'}[];
  onClose: () => void;
}) {

  const handlePrint = () => {
    // All pages in the `pages` prop will have the same orientation because
    // the user clicked either "Cetak Potret" or "Cetak Lanskap".
    const orientation = pages.length > 0 ? pages[0].orientation : 'portrait';

    const printIframe = document.createElement('iframe');
    printIframe.style.display = 'none';
    document.body.appendChild(printIframe);

    const iframeDoc = printIframe.contentWindow?.document;
    if (!iframeDoc) {
      document.body.removeChild(printIframe);
      return;
    }

    const allPagesHtml = pages.map(page =>
        // Add a div to enforce page breaks after each report page
        '<div style="page-break-after: always;">' + page.html + '</div>'
    ).join('');

    const printStyles =
        '@page { size: A4 ' + orientation + '; margin: 1cm; }' +
        'body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }';

    const htmlContent = '<html><head><title>Cetak Laporan</title><style>' +
                        printStyles +
                        '</style></head><body>' +
                        allPagesHtml +
                        '</body></html>';

    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();

    // Use a timeout to ensure all content (especially images from URLs) is loaded
    setTimeout(() => {
      try {
        printIframe.contentWindow?.focus();
        printIframe.contentWindow?.print();
      } catch (e) {
        console.error('Print failed:', e);
      } finally {
        // Clean up the iframe from the DOM
        if (document.body.contains(printIframe)) {
            document.body.removeChild(printIframe);
        }
      }
    }, 500); // 500ms delay for rendering
  };


  return (
    <div id="print-section-container" className="fixed inset-0 bg-black/80 z-50 flex justify-center items-center p-4">
      <Card className="w-full max-w-7xl h-[90vh] flex flex-col">
        <CardHeader className="print-hidden flex flex-row items-center justify-between">
          <CardTitle>Pratinjau Laporan</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Tutup</Button>
            <Button onClick={handlePrint}>
              <Printer className="mr-2" />
              Cetak
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

    const [reportPages, setReportPages] = useState<{html: string, orientation: 'portrait' | 'landscape'}[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    
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

        return result.sort((a, b) => {
          const toTime = (date: any): number => {
            if (!date) return 0;
            if (date.toDate) { // Firestore Timestamp
                const d = date.toDate();
                return !isNaN(d.getTime()) ? d.getTime() : 0;
            }
            if (date instanceof Date) { // JavaScript Date
                return !isNaN(date.getTime()) ? date.getTime() : 0;
            }
            const d = new Date(date); // String date
            return isNaN(d.getTime()) ? 0 : d.getTime();
          };
          return toTime(a.tanggal) - toTime(b.tanggal);
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


    const generatePages = (orientation: 'portrait' | 'landscape') => {
        if (selectedNotaIds.length === 0) {
            toast({
                variant: "destructive",
                title: "Tidak ada laporan dipilih",
                description: "Silakan pilih setidaknya satu laporan untuk membuat rekap.",
            });
            return [];
        }

        const selectedNotas = filteredNotas.filter(n => selectedNotaIds.includes(n.id)) || [];
        const sortedNotas = selectedNotas.sort((a,b) => a.tanggal.toDate().getTime() - b.tanggal.toDate().getTime());
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
                if (orientation === 'landscape') {
                    // Cover
                    if (projectType !== 'BBM GENSET') {
                        const coverHtml = generateImprestFundCover(notasForProject, reportSA, projectType);
                        pages.push({ html: coverHtml, orientation: 'landscape' });
                    }
                }

                // Portrait pages
                if (orientation === 'portrait') {
                    // Rekapitulasi
                    const rekapHtml = generateRekapitulasiReport(notasForProject, reportSA, projectType);
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
                        const projectTitlePart = projectType === 'Lainnya' ? '' : projectType + ' - ';
                        const saTitlePart = reportSA.replace(/^SA /, '') === 'SEMUA SA' ? 'SEMUA' : reportSA.replace(/^SA /, '');
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
                        pages.push({ html: segmentHtml, orientation: 'portrait' });
                    }

                    // Eviden Foto BBM (now in portrait)
                    const bbmR2R4Segments = [
                        'BBM R2 Harian B2B IOAN', 'BBM R2 Harian PROVISIONING',
                        'BBM R4 Harian B2B IOAN', 'BBM R4 Harian PROVISIONING',
                        'BBM R4 Turlap B2B IOAN', 'BBM R4 Turlap PROVISIONING',
                        'BBM R4 UT B2B IOAN', 'BBM R4 UT PROVISIONING',
                    ];
                    const bbmNotas = notasForProject.filter(n => bbmR2R4Segments.includes(n.segmen));
                    const evidenGroupedBySegmentBBM = bbmNotas.reduce((acc, nota) => {
                        const seg = nota.segmen;
                        if (!acc[seg]) acc[seg] = [];
                        acc[seg].push(nota);
                        return acc;
                    }, {} as Record<string, Nota[]>);
                    
                    for (const segment of Object.keys(evidenGroupedBySegmentBBM).sort()) {
                        const notasInSegment = evidenGroupedBySegmentBBM[segment];
                        if (notasInSegment.length === 0) continue;
                        
                        const projectTitlePart = projectType === 'Lainnya' ? '' : projectType + ' - ';
                        const saTitlePart = reportSA.replace(/^SA /, '') === 'SEMUA SA' ? 'SEMUA' : reportSA.replace(/^SA /, '');
                        const title = `Eviden Foto - Perincian Nota ${segment} - ${projectTitlePart}${saTitlePart}`;
                        
                        const segmentHtml = generateEvidenReport(notasInSegment, title);
                        pages.push({ html: segmentHtml, orientation: 'portrait' });
                    }


                    // Eviden (non-BBM)
                    const nonBbmNotas = notasForProject.filter(n => !bbmR2R4Segments.includes(n.segmen));
                     const evidenGroupedBySegment = nonBbmNotas.reduce((acc, nota) => {
                        const seg = nota.segmen;
                        if (!acc[seg]) acc[seg] = [];
                        acc[seg].push(nota);
                        return acc;
                    }, {} as Record<string, Nota[]>);
                    
                    for (const segment of Object.keys(evidenGroupedBySegment).sort()) {
                        const notasInSegment = evidenGroupedBySegment[segment];
                        if (notasInSegment.length === 0) continue;
                        
                        const projectTitlePart = projectType === 'Lainnya' ? '' : projectType + ' - ';
                        const saTitlePart = reportSA.replace(/^SA /, '') === 'SEMUA SA' ? 'SEMUA' : reportSA.replace(/^SA /, '');
                        const title = `Eviden Foto - Perincian Nota ${segment} - ${projectTitlePart}${saTitlePart}`;
                        
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
    
    const handleGenerateReport = (orientation: 'portrait' | 'landscape') => {
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
                        <div className="max-w-4xl mx-auto flex justify-around items-center gap-4">
                            <Button variant="outline" size="lg" onClick={() => handleGenerateReport('landscape')} disabled={isGenerating || selectedNotaIds.length === 0}>
                                {isGenerating ? <Loader2 className="mr-2 animate-spin"/> : <FileArchive className="mr-2" />}
                                Cetak Cover (Lanskap)
                            </Button>
                            <Button size="lg" onClick={() => handleGenerateReport('portrait')} disabled={isGenerating || selectedNotaIds.length === 0}>
                                {isGenerating ? <Loader2 className="mr-2 animate-spin"/> : <Printer className="mr-2" />}
                                Cetak Rincian (Potret)
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
            {reportPages.length > 0 && <ReportPreview pages={reportPages} onClose={() => setReportPages([])} />}
        </>
    );
}
