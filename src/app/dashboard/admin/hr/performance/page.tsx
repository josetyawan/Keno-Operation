
'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { useRouter } from 'next/navigation';
import { collection, query, doc, setDoc, Timestamp } from 'firebase/firestore';
import type { UserProfile, Performance } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

export default function AdminPerformancePage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    
    const [isImporting, setIsImporting] = useState(false);
    const [importProgress, setImportProgress] = useState(0);

    const { data: currentUserProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(
        useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore])
    );
    
    const usersQuery = useMemoFirebase(() => query(collection(firestore, 'users')), [firestore]);
    const { data: allUsers, isLoading: areUsersLoading } = useCollection<UserProfile>(usersQuery);
    
    const userMapByNik = useMemo(() => {
        if (!allUsers) return new Map<string, UserProfile>();
        const map = new Map<string, UserProfile>();
        allUsers.forEach(u => {
            if (u.nik) map.set(u.nik, u);
        });
        return map;
    }, [allUsers]);

    const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            toast({ variant: 'destructive', title: 'Tidak ada file dipilih.' });
            return;
        }

        if (areUsersLoading || userMapByNik.size === 0) {
            toast({ variant: 'destructive', title: 'Data Pengguna Belum Siap', description: 'Tunggu beberapa saat dan coba lagi.' });
            return;
        }

        setIsImporting(true);
        setImportProgress(0);
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const data = e.target?.result;
                if (!data) throw new Error("Gagal membaca file.");
                
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                if (!sheetName) throw new Error("File Excel tidak memiliki sheet.");

                const worksheet = workbook.Sheets[sheetName];
                const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                // Find header row dynamically
                let headerRowIndex = -1;
                let headers: string[] = [];
                for(let i=0; i < jsonData.length; i++) {
                    const row = jsonData[i] as string[];
                    if (row.some(cell => typeof cell === 'string' && cell.toLowerCase().trim() === 'nik')) {
                        headerRowIndex = i;
                        headers = row.map(cell => String(cell).trim());
                        break;
                    }
                }
                
                if (headerRowIndex === -1) {
                    throw new Error("Header 'NIK' tidak ditemukan di file Excel.");
                }

                const dataRows = jsonData.slice(headerRowIndex + 1);
                
                const nikIndex = headers.findIndex(h => h.toLowerCase() === 'nik');
                const nameIndex = headers.findIndex(h => h.toLowerCase() === 'nama');
                const serviceIndex = headers.findIndex(h => h.toLowerCase() === 'service');
                const bulanIndex = headers.findIndex(h => h.toLowerCase() === 'bulan');
                const tahunIndex = headers.findIndex(h => h.toLowerCase() === 'tahun');
                const nilaiKuIndex = headers.findIndex(h => h.toLowerCase() === 'nilai ku');
                const nilaiKoIndex = headers.findIndex(h => h.toLowerCase() === 'nilai ko');
                const nilaiKdIndex = headers.findIndex(h => h.toLowerCase() === 'nilai kd');
                const perform1Index = headers.findIndex(h => h.toLowerCase() === 'perforn');
                const perform2Index = headers.findIndex(h => h.toLowerCase().startsWith('perforn') && headers.indexOf('Perforn') !== headers.lastIndexOf('Perforn'));
                const totalPerformIndex = headers.findIndex(h => h.toLowerCase().startsWith('total performar'));

                let createdCount = 0;
                let skippedCount = 0;
                let skippedNiks = new Set<string>();

                for(let i = 0; i < dataRows.length; i++) {
                    const row = dataRows[i] as any[];
                    const nik = String(row[nikIndex] || '').trim();
                    if (!nik) continue;

                    const user = userMapByNik.get(nik);
                    if (!user) {
                        skippedCount++;
                        skippedNiks.add(nik);
                        continue;
                    }

                    const tahun = Number(row[tahunIndex]);
                    const bulan = Number(row[bulanIndex]);

                    const performanceId = `${nik}-${tahun}-${bulan}`;
                    const performanceDocRef = doc(firestore, 'performance', performanceId);
                    
                    const performanceData: Performance = {
                        id: performanceId,
                        nik: nik,
                        userId: user.id,
                        nama: String(row[nameIndex] || ''),
                        service: String(row[serviceIndex] || ''),
                        bulan: bulan,
                        tahun: tahun,
                        date: Timestamp.fromDate(new Date(tahun, bulan - 1, 1)),
                        nilaiKualitas: String(row[nilaiKuIndex] || '0%'),
                        nilaiKontribusi: String(row[nilaiKoIndex] || '0%'),
                        nilaiKedisiplinan: String(row[nilaiKdIndex] || '0%'),
                        performance1: String(row[perform1Index] || '0%'),
                        performance2: String(row[perform2Index] || '0%'),
                        totalPerformance: String(row[totalPerformIndex] || '0%')
                    };

                    await setDoc(performanceDocRef, performanceData, { merge: true });
                    createdCount++;
                    setImportProgress(((i + 1) / dataRows.length) * 100);
                }

                let toastDescription = `${createdCount} data performa berhasil diimpor/diperbarui.`;
                if(skippedCount > 0) {
                    toastDescription += ` ${skippedCount} baris dilewati karena NIK tidak terdaftar: ${Array.from(skippedNiks).slice(0,3).join(', ')}...`
                }
                toast({ title: 'Impor Selesai', description: toastDescription, duration: 9000 });

            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Impor Gagal', description: error.message });
            } finally {
                setIsImporting(false);
            }
        };

        reader.readAsArrayBuffer(file);
    };

    if (isUserLoading || isProfileLoading) {
        return <div>Memuat...</div>;
    }
    
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Impor Performa Teknisi</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Unggah File Excel</CardTitle>
                    <CardDescription>Pilih file Excel yang berisi data performa teknisi untuk diimpor ke sistem.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-2 max-w-lg">
                        <Label htmlFor="performance-file">File Excel Performa</Label>
                        <Input id="performance-file" type="file" accept=".xlsx, .xls" onChange={handleFileImport} disabled={isImporting} />
                    </div>
                     {isImporting && (
                        <div className="space-y-2">
                            <Progress value={importProgress} />
                            <p className="text-sm text-muted-foreground">Mengimpor {Math.round(importProgress)}%...</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
