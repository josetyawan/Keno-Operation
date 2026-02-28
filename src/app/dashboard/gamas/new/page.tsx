'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, Upload, X, FileWarning } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useFirestore, useUser, useStorage, useDoc, useMemoFirebase } from '@/firebase';
import { collection, serverTimestamp, doc, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { GamasReport, UserProfile } from '@/lib/types';
import Image from 'next/image';

const designatorList = [
    'DC-OF-SM-12D', 'M-DC-OF-SM-12D', 'J-DC-OF-SM-12D', 'DC-OF-SM-24D', 'M-DC-OF-SM-24D', 'J-DC-OF-SM-24D',
    'DC-OF-SM-48D', 'M-DC-OF-SM-48D', 'J-DC-OF-SM-48D', 'DC-OF-SM-96D', 'M-DC-OF-SM-96D', 'J-DC-OF-SM-96D',
    'DC-OF-SM-144D', 'M-DC-OF-SM-144D', 'J-DC-OF-SM-144D', 'DC-OF-SM-288D', 'M-DC-OF-SM-288D', 'J-DC-OF-SM-288D',
    'AC-OF-SM-12D', 'M-AC-OF-SM-12D', 'J-AC-OF-SM-12D', 'AC-OF-SM-24D', 'M-AC-OF-SM-24D', 'J-AC-OF-SM-24D',
    'AC-OF-SM-48D', 'M-AC-OF-SM-48D', 'J-AC-OF-SM-48D', 'AC-OF-SM-96D', 'M-AC-OF-SM-96D', 'J-AC-OF-SM-96D',
    'DC-OF-SM-12C', 'M-DC-OF-SM-12C', 'J-DC-OF-SM-12C', 'DC-OF-SM-24C', 'M-DC-OF-SM-24C', 'J-DC-OF-SM-24C',
    'DC-OF-SM-48C', 'M-DC-OF-SM-48C', 'J-DC-OF-SM-48C', 'DC-OF-SM-96C', 'M-DC-OF-SM-96C', 'J-DC-OF-SM-96C',
    'AC-OF-SM-12C', 'M-AC-OF-SM-12C', 'J-AC-OF-SM-12C', 'AC-OF-SM-24C', 'M-AC-OF-SM-24C', 'J-AC-OF-SM-24C',
    'AC-OF-SM-48C', 'M-AC-OF-SM-48C', 'J-AC-OF-SM-48C', 'AC-OF-SM-96C', 'M-AC-OF-SM-96C', 'J-AC-OF-SM-96C',
    'DC-OF-SM-12-SC', 'M-DC-OF-SM-12-SC', 'J-DC-OF-SM-12-SC', 'DC-OF-SM-24-SC', 'M-DC-OF-SM-24-SC', 'J-DC-OF-SM-24-SC',
    'AC-OF-SM-12-SC', 'M-AC-OF-SM-12-SC', 'J-AC-OF-SM-12-SC', 'AC-OF-SM-24-SC', 'M-AC-OF-SM-24-SC', 'J-AC-OF-SM-24-SC',
    'SC-OF-SM-24', 'M-SC-OF-SM-24', 'J-SC-OF-SM-24', 'SC-OF-SM-48', 'M-SC-OF-SM-48', 'J-SC-OF-SM-48',
    'SC-OF-SM-96', 'M-SC-OF-SM-96', 'J-SC-OF-SM-96', 'SC-OF-SM-144', 'M-SC-OF-SM-144', 'J-SC-OF-SM-144',
    'SC-OF-SM-288', 'M-SC-OF-SM-288', 'J-SC-OF-SM-288', 'OS-SM-1', 'J-OS-SM-1', 'AB-OF-SM-2D', 'M-AB-OF-SM-2D',
    'J-AB-OF-SM-2D', 'AB-OF-SM-4D', 'M-AB-OF-SM-4D', 'J-AB-OF-SM-4D', 'AB-OF-SM-8D', 'M-AB-OF-SM-8D', 'J-AB-OF-SM-8D',
    'AB-OF-SM-12D', 'M-AB-OF-SM-12D', 'J-AB-OF-SM-12D', 'AB-OF-SM-24D', 'M-AB-OF-SM-24D', 'J-AB-OF-SM-24D',
    'AB-OF-SM-48D', 'M-AB-OF-SM-48D', 'J-AB-OF-SM-48D', 'AB-OF-SM-72D', 'M-AB-OF-SM-72D', 'J-AB-OF-SM-72D',
    'AB-OF-SM-96D', 'M-AB-OF-SM-96D', 'J-AB-OF-SM-96D', 'AB-OF-SM-144D', 'M-AB-OF-SM-144D', 'J-AB-OF-SM-144D',
    'AB-OF-SM-288D', 'M-AB-OF-SM-288D', 'J-AB-OF-SM-288D', 'PC-APC-657-2', 'M-PC-APC-657-2', 'J-PC-APC-657-2',
    'PC-APC/UPC-657-A1', 'M-PC-APC/UPC-657-A1', 'J-PC-APC/UPC-657-A1', 'PC-UPC-657-2', 'M-PC-UPC-657-2',
    'J-PC-UPC-657-2', 'PC-APC-655-2', 'M-PC-APC-655-2', 'J-PC-APC-655-2', 'PC-APC/UPC-655-A1',
    'M-PC-APC/UPC-655-A1', 'J-PC-APC/UPC-655-A1', 'PC-UPC-655-2', 'M-PC-UPC-655-2', 'J-PC-UPC-655-2',
    'PC-APC-652-2', 'M-PC-APC-652-2', 'J-PC-APC-652-2', 'PC-APC/UPC-652-A1', 'M-PC-APC/UPC-652-A1',
    'J-PC-APC/UPC-652-A1', 'PC-UPC-652-2', 'M-PC-UPC-652-2', 'J-PC-UPC-652-2', 'ODC-C-48', 'M-ODC-C-48',
    'J-ODC-C-48', 'ODC-C-96', 'M-ODC-C-96', 'J-ODC-C-96', 'ODC-C-144', 'M-ODC-C-144', 'J-ODC-C-144',
    'ODC-C-288', 'M-ODC-C-288', 'J-ODC-C-288', 'ODC-C-576', 'M-ODC-C-576', 'J-ODC-C-576',
    'ODC-C-144-PKU', 'M-ODC-C-144-PKU', 'J-ODC-C-144-PKU', 'ODC-C-288-PKU', 'M-ODC-C-288-PKU', 'J-ODC-C-288-PKU',
    'ODC-C-144-PKT', 'M-ODC-C-144-PKT', 'J-ODC-C-144-PKT', 'ODC-C-288-PKT', 'M-ODC-C-288-PKT', 'J-ODC-C-288-PKT',
    'ODC-PROT-144', 'M-ODC-PROT-144', 'J-ODC-PROT-144', 'ODC-PROT-288', 'M-ODC-PROT-288', 'J-ODC-PROT-288',
    'Base Tray ODC', 'M-Base Tray ODC', 'J-Base Tray ODC', 'ODP-SOLID-PL-8', 'M-ODP-SOLID-PL-8', 'J-ODP-SOLID-PL-8',
    'ODP-SOLID-PL-16', 'M-ODP-SOLID-PL-16', 'J-ODP-SOLID-PL-16', 'TC-SM-12', 'M-TC-SM-12', 'J-TC-SM-12',
    'TC-SM-24', 'M-TC-SM-24', 'J-TC-SM-24', 'TC-SM-48', 'M-TC-SM-48', 'J-TC-SM-48', 'TC-SM-96', 'M-TC-SM-96',
    'J-TC-SM-96', 'PS-1-2-ODC', 'M-PS-1-2-ODC', 'J-PS-1-2-ODC', 'PS-1-4-ODC', 'M-PS-1-4-ODC', 'J-PS-1-4-ODC',
    'PS-1-8-ODX', 'M-PS-1-8-ODX', 'J-PS-1-8-ODX', 'PS-1-8-ODX-S', 'M-PS-1-8-ODX-S', 'J-PS-1-8-ODX-S',
    'PS-1-16-ODP', 'M-PS-1-16-ODP', 'J-PS-1-16-ODP', 'PS-1-16-ODP-S', 'M-PS-1-16-ODP-S', 'J-PS-1-16-ODP-S',
    'PS-2-2-ODC', 'M-PS-2-2-ODC', 'J-PS-2-2-ODC', 'PS-2-4-ODC', 'M-PS-2-4-ODC', 'J-PS-2-4-ODC',
    'PS-2-8-ODX', 'M-PS-2-8-ODX', 'J-PS-2-8-ODX', 'PS-1-32-ODX', 'M-PS-1-32-ODX', 'J-PS-1-32-ODX',
    'SITAC ODC', 'J-SITAC ODC', 'PU-S7.0-140', 'M-PU-S7.0-140', 'J-PU-S7.0-140', 'PU-S9.0-140',
    'M-PU-S9.0-140', 'J-PU-S9.0-140', 'GU-G', 'M-GU-G', 'J-GU-G', 'GB-G1', 'M-GB-G1', 'J-GB-G1', 'GB-G3',
    'M-GB-G3', 'J-GB-G3', 'GB-G-INTG', 'M-GB-G-INTG', 'J-GB-G-INTG', 'TC-02-ODC', 'M-TC-02-ODC', 'J-TC-02-ODC',
    'PP-OF-IN', 'M-PP-OF-IN', 'J-PP-OF-IN', 'DD-S3-1', 'M-DD-S3-1', 'J-DD-S3-1', 'DD-S3-2', 'M-DD-S3-2',
    'J-DD-S3-2', 'DD-S3-3', 'M-DD-S3-3', 'J-DD-S3-3', 'DD-V4-1', 'M-DD-V4-1', 'J-DD-V4-1', 'DD-V4-2', 'M-DD-V4-2',
    'J-DD-V4-2', 'DD-V5-1', 'M-DD-V5-1', 'J-DD-V5-1', 'DD-V5-2', 'M-DD-V5-2', 'J-DD-V5-2', 'DD-DA-S1',
    'M-DD-DA-S1', 'J-DD-DA-S1', 'DD-DA-S2', 'M-DD-DA-S2', 'J-DD-DA-S2', 'DD-DA-S4', 'M-DD-DA-S4', 'J-DD-DA-S4',
    'DD-BSS-S1', 'M-DD-BSS-S1', 'J-DD-BSS-S1', 'DD-BSS-S2', 'M-DD-BSS-S2', 'J-DD-BSS-S2', 'DD-BTS-S1',
    'M-DD-BTS-S1', 'J-DD-BTS-S1', 'DD-BTS-S2', 'M-DD-BTS-S2', 'J-DD-BTS-S2', 'DD-BTS-S4', 'M-DD-BTS-S4',
    'J-DD-BTS-S4', 'HB-PS-1', 'M-HB-PS-1', 'J-HB-PS-1', 'HB-PS-2', 'M-HB-PS-2', 'J-HB-PS-2', 'HB-PS-4', 'M-HB-PS-4',
    'J-HB-PS-4', 'DD-BMR-1', 'M-DD-BMR-1', 'J-DD-BMR-1', 'DD-BMR-2', 'M-DD-BMR-2', 'J-DD-BMR-2', 'DD-BMR-4',
    'M-DD-BMR-4', 'J-DD-BMR-4', 'DC-SD-28-1', 'M-DC-SD-28-1', 'J-DC-SD-28-1', 'DC-SD-28-3', 'M-DC-SD-28-3',
    'J-DC-SD-28-3', 'DC-SD-33-1', 'M-DC-SD-33-1', 'J-DC-SD-33-1', 'DC-SD-33-2', 'M-DC-SD-33-2', 'J-DC-SD-33-2',
    'DC-SD-43-1', 'M-DC-SD-43-1', 'J-DC-SD-43-1', 'DC-SD-43-2', 'M-DC-SD-43-2', 'J-DC-SD-43-2', 'DCD-PVC-1',
    'M-DCD-PVC-1', 'J-DCD-PVC-1', 'DD-BM-100-1', 'M-DD-BM-100-1', 'J-DD-BM-100-1', 'DD-BM-100-2', 'M-DD-BM-100-2',
    'J-DD-BM-100-2', 'DD-BM-50-1', 'M-DD-BM-50-1', 'J-DD-BM-50-1', 'DD-BM-50-2', 'M-DD-BM-50-2', 'J-DD-BM-50-2',
    'DD-BM-HDPE-40-1', 'J-DD-BM-HDPE-40-1', 'DD-BM-HDPE-50-1', 'J-DD-BM-HDPE-50-1', 'DD-HDPE-40-1', 'M-DD-HDPE-40-1',
    'J-DD-HDPE-40-1', 'DD-HDPE-40-2', 'M-DD-HDPE-40-2', 'J-DD-HDPE-40-2', 'DD-HDPE-50-1', 'M-DD-HDPE-50-1',
    'J-DD-HDPE-50-1', 'DD-HDPE-50-2', 'M-DD-HDPE-50-2', 'J-DD-HDPE-50-2', 'DD-HDPE-40-1C', 'M-DD-HDPE-40-1C',
    'J-DD-HDPE-40-1C', 'DD-HDPE-40-2C', 'M-DD-HDPE-40-2C', 'J-DD-HDPE-40-2C', 'DD-ROD', 'J-DD-ROD', 'DD-RV-1',
    'M-DD-RV-1', 'J-DD-RV-1', 'DD-RV-CONCRETE', 'M-DD-RV-CONCRETE', 'J-DD-RV-CONCRETE', 'DD-DS-S1', 'M-DD-DS-S1',
    'J-DD-DS-S1', 'DD-DS-COD1-M', 'M-DD-DS-COD1-M', 'J-DD-DS-COD1-M', 'Klem HDPE', 'M-Klem HDPE', 'J-Klem HDPE',
    'BC-TR-0.4', 'J-BC-TR-0.4', 'BC-TR-0.6', 'J-BC-TR-0.6', 'BC-TR-1', 'J-BC-TR-1', 'BC-TR-2', 'J-BC-TR-2',
    'BC-TR-3', 'J-BC-TR-3', 'BC-TR-4', 'J-BC-TR-4', 'BC-TR-5', 'J-BC-TR-5', 'BCTR-ROCK', 'J-BCTR-ROCK',
    'BC-MTR-0.4', 'J-BC-MTR-0.4', 'BD-SK', 'M-BD-SK', 'J-BD-SK', 'SMD-ABS-2A', 'M-SMD-ABS-2A', 'J-SMD-ABS-2A',
    'SMD-ABS-3A', 'M-SMD-ABS-3A', 'J-SMD-ABS-3A', 'SMD-ABS-4A', 'M-SMD-ABS-4A', 'J-SMD-ABS-4A', 'SMD-ABS-6A',
    'M-SMD-ABS-6A', 'J-SMD-ABS-6A', 'DD-MDSC-5/3.5', 'M-DD-MDSC-5/3.5', 'J-DD-MDSC-5/3.5', 'DD-MDSC-10/8',
    'M-DD-MDSC-10/8', 'J-DD-MDSC-10/8', 'DD-MDSC-12/10', 'M-DD-MDSC-12/10', 'J-DD-MDSC-12/10', 'DD-MDDI-1A',
    'M-DD-MDDI-1A', 'J-DD-MDDI-1A', 'DD-MDDI-2A', 'M-DD-MDDI-2A', 'J-DD-MDDI-2A', 'DD-MDDI-4A', 'M-DD-MDDI-4A',
    'J-DD-MDDI-4A', 'DD-MDDI-7A', 'M-DD-MDDI-7A', 'J-DD-MDDI-7A', 'DD-MDDI-12A', 'M-DD-MDDI-12A', 'J-DD-MDDI-12A',
    'DD-MDDI-19A', 'M-DD-MDDI-19A', 'J-DD-MDDI-19A', 'DD-MDDI-24A', 'M-DD-MDDI-24A', 'J-DD-MDDI-24A',
    'DD-MDDI-1B', 'M-DD-MDDI-1B', 'J-DD-MDDI-1B', 'DD-MDDI-2B', 'M-DD-MDDI-2B', 'J-DD-MDDI-2B', 'DD-MDDI-4B',
    'M-DD-MDDI-4B', 'J-DD-MDDI-4B', 'DD-MDDI-7B', 'M-DD-MDDI-7B', 'J-DD-MDDI-7B', 'DD-MDDI-1C', 'M-DD-MDDI-1C',
    'J-DD-MDDI-1C', 'DD-MDDI-2C', 'M-DD-MDDI-2C', 'J-DD-MDDI-2C', 'DD-MDDI-4C', 'M-DD-MDDI-4C', 'J-DD-MDDI-4C',
    'DD-MDDI-7C', 'M-DD-MDDI-7C', 'J-DD-MDDI-7C', 'DD-MDDI-1D', 'M-DD-MDDI-1D', 'J-DD-MDDI-1D', 'DD-MDDI-2D',
    'M-DD-MDDI-2D', 'J-DD-MDDI-2D', 'DD-MDDB-1A', 'M-DD-MDDB-1A', 'J-DD-MDDB-1A', 'DD-MDDB-2A', 'M-DD-MDDB-2A',
    'J-DD-MDDB-2A', 'DD-MDDB-4A', 'M-DD-MDDB-4A', 'J-DD-MDDB-4A', 'DD-MDDB-7A', 'M-DD-MDDB-7A', 'J-DD-MDDB-7A',
    'DD-MDDB-12A', 'M-DD-MDDB-12A', 'J-DD-MDDB-12A', 'DD-MDDB-19A', 'M-DD-MDDB-19A', 'J-DD-MDDB-19A',
    'DD-MDDB-24A', 'M-DD-MDDB-24A', 'J-DD-MDDB-24A', 'DD-MDDB-1B', 'M-DD-MDDB-1B', 'J-DD-MDDB-1B',
    'DD-MDDB-2B', 'M-DD-MDDB-2B', 'J-DD-MDDB-2B', 'DD-MDDB-4B', 'M-DD-MDDB-4B', 'J-DD-MDDB-4B',
    'DD-MDDB-7B', 'M-DD-MDDB-7B', 'J-DD-MDDB-7B', 'DD-MDDB-1C', 'M-DD-MDDB-1C', 'J-DD-MDDB-1C',
    'DD-MDDB-2C', 'M-DD-MDDB-2C', 'J-DD-MDDB-2C', 'DD-MDDB-4C', 'M-DD-MDDB-4C', 'J-DD-MDDB-4C',
    'DD-MDDB-7C', 'M-DD-MDDB-7C', 'J-DD-MDDB-7C', 'DD-MDEC-5/3.5', 'M-DD-MDEC-5/3.5', 'J-DD-MDEC-5/3.5',
    'DD-MDEC-10/8', 'M-DD-MDEC-10/8', 'J-DD-MDEC-10/8', 'DD-MDEC-12/10', 'M-DD-MDEC-12/10', 'J-DD-MDEC-12/10',
    'FID-28-1', 'M-FID-28-1', 'J-FID-28-1', 'FID-28-2', 'M-FID-28-2', 'J-FID-28-2', 'FID-28-3', 'M-FID-28-3',
    'J-FID-28-3', 'MH-HH1', 'M-MH-HH1', 'J-MH-HH1', 'MH-HH2', 'M-MH-HH2', 'J-MH-HH2', 'HH-PIT-P-HA',
    'M-HH-PIT-P-HA', 'J-HH-PIT-P-HA', 'HH-PIT-P-ODP', 'M-HH-PIT-P-ODP', 'J-HH-PIT-P-ODP', 'HH-PIT-P-ODC',
    'M-HH-PIT-P-ODC', 'J-HH-PIT-P-ODC', 'HH-PIT-80', 'M-HH-PIT-80', 'J-HH-PIT-80', 'Slack Support HH',
    'M-Slack Support HH', 'J-Slack Support HH', 'Slack Support Chamber', 'M-Slack Support Chamber',
    'J-Slack Support Chamber', 'MH-CA', 'M-MH-CA', 'J-MH-CA', 'CO-OF', 'J-CO-OF', 'Close Rack 12U',
    'M-Close Rack 12U', 'J-Close Rack 12U', 'DC-OF-SM-2A', 'M-DC-OF-SM-2A', 'J-DC-OF-SM-2A', 'FC-SC-DC',
    'M-FC-SC-DC', 'J-FC-SC-DC', 'Coring', 'J-Coring', 'Klem Galvanise', 'M-Klem Galvanise', 'J-Klem Galvanise',
    'Rak Pasif spliter 1:4', 'M-Rak Pasif spliter 1:4', 'J-Rak Pasif spliter 1:4', 'Label Kabel Distribusi (KU FO)',
    'M-Label Kabel Distribusi (KU FO)', 'J-Label Kabel Distribusi (KU FO)', 'Preliminary Project', 'J-Preliminary Project',
    'FTM-CR-19', 'M-FTM-CR-19', 'J-FTM-CR-19', 'TC-SM-144', 'M-TC-SM-144', 'J-TC-SM-144', 'GC-NYAF-16',
    'M-GC-NYAF-16', 'J-GC-NYAF-16', 'BR-HDPE', 'M-BR-HDPE', 'J-BR-HDPE', 'BC-TR-S-0.8', 'M-BC-TR-S-0.8',
    'J-BC-TR-S-0.8', 'BC-TR-S-1', 'J-BC-TR-S-1', 'BC-TR-S-2', 'J-BC-TR-S-2', 'BC-TR-S-3', 'J-BC-TR-S-3',
    'BC-TR-S-4', 'J-BC-TR-S-4', 'BC-TR-S-5', 'J-BC-TR-S-5', 'PU-G6.0-35kg', 'M-PU-G6.0-35kg', 'J-PU-G6.0-35kg',
    'HS-PS-Exist', 'M-HS-PS-Exist', 'J-HS-PS-Exist', 'PU-S7.0-400NM', 'M-PU-S7.0-400NM', 'J-PU-S7.0-400NM',
    'BC-TR-A-0.4', 'J-BC-TR-A-0.4', 'Tray-Mesh-PVC', 'M-Tray-Mesh-PVC', 'J-Tray-Mesh-PVC', 'BR-L-150-200mm',
    'M-BR-L-150-200mm', 'J-BR-L-150-200mm', 'PU-C7.0-150', 'M-PU-C7.0-150', 'J-PU-C7.0-150', 'PU-C9.0-150',
    'M-PU-C9.0-150', 'J-PU-C9.0-150', 'AC-OF-SM-ADSS-12D', 'M-AC-OF-SM-ADSS-12D', 'J-AC-OF-SM-ADSS-12D',
    'AC-OF-SM-ADSS-24D', 'M-AC-OF-SM-ADSS-24D', 'J-AC-OF-SM-ADSS-24D', 'AC-OF-SM-ADSS-48D', 'M-AC-OF-SM-ADSS-48D',
    'J-AC-OF-SM-ADSS-48D', 'AC-OF-SM-ADSS-96D', 'M-AC-OF-SM-ADSS-96D', 'J-AC-OF-SM-ADSS-96D', 'PU-AS-DE-50/70',
    'M-PU-AS-DE-50/70', 'J-PU-AS-DE-50/70', 'PU-AS-SC', 'M-PU-AS-SC', 'J-PU-AS-SC', 'PU-AS-HL', 'M-PU-AS-HL',
    'J-PU-AS-HL', 'AC-OF-SM-1-3SL', 'M-AC-OF-SM-1-3SL', 'J-AC-OF-SM-1-3SL', 'BKR-KU-FO-6-24', 'J-BKR-KU-FO-6-24',
    'BKR-KU-FO-48-96', 'J-BKR-KU-FO-48-96', 'RGL-KU-FO-6-24', 'J-RGL-KU-FO-6-24', 'RGL-KU-FO-48-96',
    'J-RGL-KU-FO-48-96', 'PROT-SLV', 'M-PROT-SLV', 'J-PROT-SLV', 'T-ROUTE-KABEL', 'M-T-ROUTE-KABEL', 'J-T-ROUTE-KABEL',
    'BC-MTR-GALV.2-3.6', 'M-BC-MTR-GALV.2-3.6', 'J-BC-MTR-GALV.2-3.6', 'HB-PC-2', 'M-HB-PC-2', 'J-HB-PC-2',
    'PT-TT-7', 'M-PT-TT-7', 'J-PT-TT-7', 'PC-TT-7/9', 'M-PC-TT-7/9', 'J-PC-TT-7/9', 'PU-G6-2,5', 'M-PU-G6-2,5',
    'J-PU-G6-2,5', 'PU-G6-3', 'M-PU-G6-3', 'J-PU-G6-3', 'RP-GJ-1,25', 'M-RP-GJ-1,25', 'J-RP-GJ-1,25',
    'RP-GJ-1,50', 'M-RP-GJ-1,50', 'J-RP-GJ-1,50', 'RP-GJ-2', 'M-RP-GJ-2', 'J-RP-GJ-2', 'S-CLAMP', 'M-S-CLAMP',
    'J-S-CLAMP', 'SUS-CAP', 'M-SUS-CAP', 'J-SUS-CAP', 'SLACK-SUPP', 'M-SLACK-SUPP', 'J-SLACK-SUPP',
    'ODP-KLEM-COOKER', 'M-ODP-KLEM-COOKER', 'J-ODP-KLEM-COOKER', 'ODP-KLEM-KU', 'M-ODP-KLEM-KU', 'J-ODP-KLEM-KU',
    'ODP-RISE', 'M-ODP-RISE', 'J-ODP-RISE', 'STAINLESS BELT', 'M-STAINLESS BELT', 'J-STAINLESS BELT', 'BUCKLE',
    'M-BUCKLE', 'J-BUCKLE', 'SUSPENSION AYUN', 'M-SUSPENSION AYUN', 'J-SUSPENSION AYUN', 'POLESTRAP SPIRAL',
    'M-POLESTRAP SPIRAL', 'J-POLESTRAP SPIRAL', 'ANCHORING', 'M-ANCHORING', 'J-ANCHORING',
    'CLAMP HOOK/BRACKET PELANGGAN SPIRAL', 'M-CLAMP HOOK/BRACKET PELANGGAN SPIRAL', 'J-CLAMP HOOK/BRACKET PELANGGAN SPIRAL',
    'TRIMBEL', 'M-TRIMBEL', 'J-TRIMBEL', 'SW-BG-3/8"', 'M-SW-BG-3/8"', 'J-SW-BG-3/8"', 'SW-BG-5/8"', 'M-SW-BG-5/8"',
    'J-SW-BG-5/8"', 'PG-2', 'M-PG-2', 'G-RING', 'M-G-RING', 'EC-4-10', 'M-EC-4-10', 'J-EC-4-10', 'PP-OF-OUT',
    'M-PP-OF-OUT', 'J-PP-OF-OUT', 'UTP-6', 'M-UTP-6', 'J-UTP-6', 'RJ45-CAT6', 'M-RJ45-CAT6', 'TC-IN', 'M-TC-IN',
    'J-TC-IN', 'HH-PIT-HA', 'M-HH-PIT-HA', 'J-HH-PIT-HA', 'HH-PIT-DP', 'M-HH-PIT-DP', 'J-HH-PIT-DP', 'TTP-MH',
    'M-TTP-MH', 'J-TTP-MH', 'LHR-MH', 'M-LHR-MH', 'J-LHR-MH', 'GT-J-HH1-TTP3', 'M-GT-J-HH1-TTP3', 'J-GT-J-HH1-TTP3',
    'GT-J-HH2-TTP2', 'M-GT-J-HH2-TTP2', 'J-GT-J-HH2-TTP2', 'NE-KEY', 'M-NE-KEY', 'J-NE-KEY', 'ODC-BELT',
    'M-ODC-BELT', 'J-ODC-BELT', 'ODC-CATKABIJ-NET', 'M-ODC-CATKABIJ-NET', 'J-ODC-CATKABIJ-NET',
    'ODC-CATDDKKAB', 'M-ODC-CATDDKKAB', 'J-ODC-CATDDKKAB', 'ODC-P-3-IN', 'M-ODC-P-3-IN', 'J-ODC-P-3-IN',
    'ODC-P-4-IN', 'M-ODC-P-4-IN', 'J-ODC-P-4-IN', 'ODC-ODP-ADAPT-STDR', 'M-ODC-ODP-ADAPT-STDR', 'J-ODC-ODP-ADAPT-STDR',
    'ODP-KEY', 'M-ODP-KEY', 'J-ODP-KEY', 'ODP-SBK', 'M-ODP-SBK', 'J-ODP-SBK', 'ODP-SOLID-PB-8', 'M-ODP-SOLID-PB-8',
    'J-ODP-SOLID-PB-8', 'ODP-SOLID-PB-16', 'M-ODP-SOLID-PB-16', 'J-ODP-SOLID-PB-16', 'ODP Solid-PB-8 AS',
    'M-ODP Solid-PB-8 AS', 'J-ODP Solid-PB-8 AS', 'ODP Solid-PB-16 AS', 'M-ODP Solid-PB-16 AS',
    'J-ODP Solid-PB-16 AS', 'DC-PROTEC', 'M-DC-PROTEC', 'J-DC-PROTEC', 'NE-MS-DUST', 'M-NE-MS-DUST',
    'J-NE-MS-DUST', 'NE-MS-REPL-BATT100', 'M-NE-MS-REPL-BATT100', 'J-NE-MS-REPL-BATT100', 'NE-MS-REPL-BATT60',
    'M-NE-MS-REPL-BATT60', 'J-NE-MS-REPL-BATT60', 'NE-MS-REPL-BATT-45', 'M-NE-MS-REPL-BATT-45',
    'J-NE-MS-REPL-BATT-45', 'PIGTAIL', 'M-PIGTAIL', 'J-PIGTAIL', 'TRAY-MESH-4', 'M-TRAY-MESH-4', 'J-TRAY-MESH-4',
    'DC-OF-SJ-655C', 'M-DC-OF-SJ-655C', 'J-DC-OF-SJ-655C', 'PL-RING', 'M-PL-RING', 'J-PL-RING', 'PL-TYPE-J',
    'M-PL-TYPE-J', 'J-PL-TYPE-J', 'CASSETTE-FO', 'M-CASSETTE-FO', 'J-CASSETTE-FO', 'CASSETTE-SPLITTER',
    'M-CASSETTE-SPLITTER', 'NYY- 3 X 2.5MM', 'M-NYY- 3 X 2.5MM', 'J-NYY- 3 X 2.5MM', 'TRAY-BUNDLED-OUT-30',
    'M-TRAY-BUNDLED-OUT-30', 'J-TRAY-BUNDLED-OUT-30', 'TRAY-FEEDER-30', 'M-TRAY-FEEDER-30', 'J-TRAY-FEEDER-30',
    'TRAY-MESH-2', 'M-TRAY-MESH-2', 'J-TRAY-MESH-2', 'TRAY-MESH-3', 'M-TRAY-MESH-3', 'J-TRAY-MESH-3',
    'VSS-90-2', 'M-VSS-90-2', 'J-VSS-90-2', 'PONDASI-TYPE-D500', 'M-PONDASI-TYPE-D500', 'J-PONDASI-TYPE-D500',
    'ADAPT-SPRING', 'M-ADAPT-SPRING', 'J-ADAPT-SPRING', 'OTP', 'M-OTP', 'J-OTP', 'H-CLAMP', 'M-H-CLAMP', 'J-H-CLAMP',
    'DC-SOC', 'M-DC-SOC', 'J-DC-SOC', 'PR-IN-RS', 'M-PR-IN-RS', 'J-PR-IN-RS', 'BKR-DC', 'J-BKR-DC', 'RGL-DC',
    'J-RGL-DC', 'BKR-RK', 'J-BKR-RK', 'P-PK-RK', 'J-P-PK-RK', 'P-KB', 'J-P-KB', 'PB-TT-7/9', 'J-PB-TT-7/9',
    'MTT-RL-7/9', 'J-MTT-RL-7/9', 'MTT-RS-7/9', 'J-MTT-RS-7/9', 'PT-TUNJANG', 'J-PT-TUNJANG', 'EC-26-52',
    'M-EC-26-52', 'J-EC-26-52', 'P-J-H1/H2', 'J-P-J-H1/H2', 'P-J-H3/H4', 'J-P-J-H3/H4', 'P-H-1', 'J-P-H-1',
    'P-H-2', 'J-P-H-2', 'RK-LY', 'J-RK-LY', 'RK-PATOK', 'J-RK-PATOK', 'RK-DUDUKKAB', 'J-RK-DUDUKKAB',
    'RK-GRD', 'J-RK-GRD', 'NE-KOORD', 'J-NE-KOORD', 'DP-CLEAN', 'J-DP-CLEAN', 'DP-GRD', 'J-DP-GRD', 'DP-LAB',
    'J-DP-LAB', 'DP-IDLE', 'J-DP-IDLE', 'DP-MOVING', 'J-DP-MOVING', 'DP-TIANG', 'J-DP-TIANG', 'DW-JOINT',
    'J-DW-JOINT', 'FTM-LY', 'J-FTM-LY', 'FTM-LAB', 'J-FTM-LAB', 'FTM-MSR-CORE', 'J-FTM-MSR-CORE', 'FTM-GRD',
    'J-FTM-GRD', 'NE-LOG', 'J-NE-LOG', 'FTM-PC', 'J-FTM-PC', 'FTM-CLEAN', 'J-FTM-CLEAN', 'FTM-VA-PORT',
    'J-FTM-VA-PORT', 'FTM-LABEL', 'J-FTM-LABEL', 'ODC-LY', 'J-ODC-LY', 'ODC-LAB', 'J-ODC-LAB', 'ODC-MSR-CORE',
    'J-ODC-MSR-CORE', 'ODC-GRD', 'J-ODC-GRD', 'ODC-SPLT', 'J-ODC-SPLT', 'ODC-PC', 'J-ODC-PC', 'ODC-REP',
    'J-ODC-REP', 'ODC-VA-PORT', 'J-ODC-VA-PORT', 'ODC-PP', 'J-ODC-PP', 'G-ODC-C-48', 'J-G-ODC-C-48',
    'G-ODC-C-144', 'J-G-ODC-C-144', 'G-ODC-C-288', 'J-G-ODC-C-288', 'ODP-CLEAN', 'J-ODP-CLEAN', 'ODP-GRD',
    'J-ODP-GRD', 'ODP-LAB', 'J-ODP-LAB', 'ODP-TERM', 'J-ODP-TERM', 'ODP-SPL', 'J-ODP-SPL', 'ODP-TIANG',
    'J-ODP-TIANG', 'ODP-LABEL', 'J-ODP-LABEL', 'ODP-VA-PORT', 'J-ODP-VA-PORT', 'ODP-LBL-CORE', 'J-ODP-LBL-CORE',
    'G-ODP-CA-8', 'J-G-ODP-CA-8', 'G-ODP-CA-16', 'J-G-ODP-CA-16', 'G-ODP-A-8', 'J-G-ODP-A-8', 'G-ODP-A-16',
    'J-G-ODP-A-16', 'G-ODP-PB-8', 'J-G-ODP-PB-8', 'G-ODP-PB-16', 'J-G-ODP-PB-16', 'G-ODP-SOLID-PB-8',
    'J-G-ODP-SOLID-PB-8', 'G-ODP-SOLID-PB-16', 'J-G-ODP-SOLID-PB-16', 'G-ODP-PL-8', 'J-G-ODP-PL-8',
    'G-ODP-PL-16', 'J-G-ODP-PL-16', 'DC-SBG', 'J-DC-SBG', 'NE-MS-LAB', 'J-NE-MS-LAB', 'NE-MS-GRD', 'J-NE-MS-GRD',
    'NE-MS-PC', 'J-NE-MS-PC', 'NE-MS-RECT', 'J-NE-MS-RECT', 'NE-MS-FAN', 'J-NE-MS-FAN', 'NE-MS-ALARM',
    'J-NE-MS-ALARM', 'NE-MS-TEMP', 'J-NE-MS-TEMP', 'NE-MS-BATT', 'J-NE-MS-BATT', 'NE-MS-CD', 'J-NE-MS-CD',
    'NE-MS-MODDELV', 'J-NE-MS-MODDELV', 'NE-MS-GENSET', 'J-NE-MS-GENSET', 'NE-MS-RECT-REP', 'J-NE-MS-RECT-REP',
    'NE-MS-ISNT', 'J-NE-MS-ISNT', 'NE-MS-BKR', 'J-NE-MS-BKR', 'DISMANTLING-MDU', 'J-DISMANTLING-MDU',
    'FAL-LOC', 'J-FAL-LOC', 'WSM-PHK3', 'J-WSM-PHK3', 'DIS-ODP', 'J-DIS-ODP', 'RENT-IBT', 'J-RENT-IBT',
    'RENT-BMN', 'J-RENT-BMN', 'PU-W7', 'M-PU-W7', 'J-PU-W7'
];


export default function NewGamasReportPage() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const storage = useStorage();
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [designator, setDesignator] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  
  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

  useEffect(() => {
    // Cleanup preview URLs to prevent memory leaks
    return () => {
      previews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previews]);

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      if (photos.length + newFiles.length > 10) {
        toast({
          variant: 'destructive',
          title: 'Maksimal 10 Foto',
          description: 'Anda hanya dapat mengunggah hingga 10 foto.',
        });
        return;
      }
      const newPhotos = [...photos, ...newFiles];
      setPhotos(newPhotos);
      
      const newPreviews = newFiles.map(file => URL.createObjectURL(file));
      setPreviews(prev => [...prev, ...newPreviews]);
    }
  };
  
  const removePhoto = (indexToRemove: number) => {
    setPhotos(prev => prev.filter((_, index) => index !== indexToRemove));
    setPreviews(prev => {
        const urlToRemove = prev[indexToRemove];
        URL.revokeObjectURL(urlToRemove); // Clean up memory
        return prev.filter((_, index) => index !== indexToRemove);
    });
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !userProfile) {
      toast({ variant: 'destructive', title: 'Error', description: 'Pengguna tidak ditemukan.' });
      return;
    }
    if (!designator) {
      toast({ variant: 'destructive', title: 'Data Tidak Lengkap', description: 'Silakan pilih designator.' });
      return;
    }
    if (photos.length < 4) {
      toast({ variant: 'destructive', title: 'Foto Kurang', description: 'Anda harus mengunggah minimal 4 foto.' });
      return;
    }
    
    setIsSaving(true);
    
    try {
        const uploadPromises = photos.map(async (file) => {
            const filePath = `gamas-photos/${user.uid}/${Date.now()}-${file.name}`;
            const storageRef = ref(storage, filePath);
            await uploadBytes(storageRef, file);
            return getDownloadURL(storageRef);
        });

        const photoUrls = await Promise.all(uploadPromises);

        const gamasCollection = collection(firestore, 'gamas-reports');
        
        const newReport: Omit<GamasReport, 'id'> = {
            userId: user.uid,
            userName: userProfile.displayName || user.email!,
            designator,
            photoUrls,
            notes,
            createdAt: serverTimestamp(),
        };

        await addDoc(gamasCollection, newReport);
        
        toast({ title: 'Laporan Berhasil Dibuat', description: 'Laporan eviden gamas Anda telah disimpan.' });
        router.push('/dashboard/gamas');

    } catch (error) {
        console.error("Error creating Gamas report:", error);
        toast({ variant: 'destructive', title: 'Gagal Menyimpan', description: 'Terjadi kesalahan saat menyimpan laporan.' });
    } finally {
        setIsSaving(false);
    }
  }


  return (
    <div className="mx-auto grid w-full flex-1 auto-rows-max gap-4">
        <form onSubmit={handleSubmit}>
            <div className="flex items-center gap-4 mb-4">
                <Button onClick={() => router.back()} variant="outline" size="icon" className="h-8 w-8" type="button">
                    <ArrowLeft className="h-5 w-5" /><span className="sr-only">Kembali</span>
                </Button>
                <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-bold tracking-tight sm:grow-0">
                    Laporan Eviden Gamas Baru
                </h1>
                <div className="hidden items-center gap-2 md:ml-auto md:flex">
                    <Button onClick={() => router.back()} variant="outline" type="button">Batal</Button>
                    <Button type="submit" disabled={isSaving}>
                        {isSaving ? <><Loader2 className="animate-spin mr-2" /> Menyimpan...</> : 'Simpan Laporan'}
                    </Button>
                </div>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><FileWarning /> Detail Laporan</CardTitle>
                    <CardDescription>Pilih designator dan unggah foto-foto eviden yang diperlukan.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6">
                    <div className="grid gap-3">
                        <Label htmlFor="designator">Designator *</Label>
                        <Select onValueChange={setDesignator} value={designator} required>
                            <SelectTrigger><SelectValue placeholder="Pilih designator..." /></SelectTrigger>
                            <SelectContent>
                                {designatorList.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-3">
                        <Label htmlFor="notes">Catatan</Label>
                        <Textarea id="notes" placeholder="Catatan tambahan (opsional)..." value={notes} onChange={(e) => setNotes(e.target.value)} />
                    </div>
                    <div className="grid gap-3">
                        <Label>Foto Eviden (min 4, max 10)</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {previews.map((previewUrl, index) => (
                                <div key={index} className="relative group aspect-square">
                                    <Image src={previewUrl} alt={`Preview ${index + 1}`} fill className="object-cover rounded-md border" />
                                    <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full z-10" onClick={() => removePhoto(index)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                             {photos.length < 10 && (
                                <div className="relative flex justify-center items-center aspect-square w-full rounded-md border-2 border-dashed border-muted-foreground/50">
                                    <input type="file" id="photo-upload" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handlePhotoChange} accept="image/*" multiple />
                                    <div className="text-center text-muted-foreground">
                                        <Upload className="mx-auto h-8 w-8" />
                                        <span className="text-sm">Tambah Foto</span>
                                    </div>
                                </div>
                            )}
                        </div>
                         {photos.length > 0 && <p className="text-sm text-muted-foreground">{photos.length} / 10 foto terpilih.</p>}
                    </div>
                </CardContent>
            </Card>

            <div className="flex items-center justify-end gap-2 mt-4 md:hidden">
                <Button onClick={() => router.back()} variant="outline" type="button">Batal</Button>
                <Button type="submit" disabled={isSaving}>
                    {isSaving ? <><Loader2 className="animate-spin mr-2" /> Menyimpan...</> : 'Simpan Laporan'}
                </Button>
            </div>
        </form>
    </div>
  );
}
