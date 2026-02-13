
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Upload } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import type { UserProfile, NetworkAsset } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';


const assetTypes = ['OLT', 'ODC', 'ODP', 'FTM', 'Mini OLT'];


export default function AdminAssetsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importAssetType, setImportAssetType] = useState('');
  const [progress, setProgress] = useState(0);

  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false);

  const { data: currentUserProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(
    useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore])
  );

  useEffect(() => {
    if (!isUserLoading && !isProfileLoading && (!user || currentUserProfile?.role !== 'admin')) {
        router.push('/dashboard');
    }
  }, [user, currentUserProfile, isUserLoading, isProfileLoading, router]);

  const assetsQuery = useMemoFirebase(() => {
      if (isUserLoading || isProfileLoading || !user || !currentUserProfile || currentUserProfile.role !== 'admin') {
          return null;
      }
      return query(collection(firestore, 'network-assets'));
  }, [firestore, currentUserProfile, user, isUserLoading, isProfileLoading]);

  const { data: assets, isLoading: areAssetsLoading } = useCollection<NetworkAsset>(assetsQuery);

  const handleDeleteAsset = (asset: NetworkAsset) => {
    if (!firestore) return;
    const assetDocRef = doc(firestore, 'network-assets', asset.id);
    deleteDocumentNonBlocking(assetDocRef);
    toast({
      title: 'Aset Dihapus',
      description: `Aset "${asset.name}" telah dihapus.`,
    });
  };

  const confirmDeleteAll = () => {
      if (!assets || !firestore) {
        toast({ variant: 'destructive', title: 'Tidak ada aset untuk dihapus.' });
        return;
      }
      toast({
          title: 'Penghapusan Dimulai',
          description: `Mulai menghapus semua ${assets.length} aset...`,
      });
      assets.forEach(asset => {
          const assetDocRef = doc(firestore, 'network-assets', asset.id);
          deleteDocumentNonBlocking(assetDocRef);
      });
      toast({
          title: 'Semua Aset Dihapus',
          description: 'Semua aset jaringan telah dijadwalkan untuk dihapus.',
      });
      setIsDeleteAllDialogOpen(false);
  };


  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!importAssetType) {
        toast({ variant: "destructive", title: "Pilih Jenis Aset", description: "Anda harus memilih jenis aset sebelum mengunggah file." });
        return;
    }
    if (!event.target.files || event.target.files.length === 0) {
        toast({ variant: "destructive", title: "Tidak ada file dipilih." });
        return;
    }
    if (!firestore) {
        toast({ variant: "destructive", title: "Database Error", description: "Koneksi database tidak tersedia." });
        return;
    }

    setIsImporting(true);
    setProgress(0);
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'binary' });

            let sheetName = workbook.SheetNames.find(
                name => name.toLowerCase().trim() === importAssetType.toLowerCase().trim()
            );
            
            if (!sheetName) {
                sheetName = workbook.SheetNames[0];
                 toast({
                    title: "Sheet Tidak Sesuai",
                    description: `Tidak ditemukan sheet untuk "${importAssetType}". Membaca sheet pertama: "${sheetName}".`,
                    duration: 7000
                });
            }

            if (!sheetName) {
                throw new Error("File Excel tidak memiliki sheet.");
            }
            const worksheet = workbook.Sheets[sheetName];
            const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

            if (jsonData.length === 0) {
                 throw new Error(`Sheet "${sheetName}" di file Excel kosong.`);
            }

            const findColumn = (keys: string[], aliases: string[]): string | undefined => {
                const lowerCaseAliases = aliases.map(a => a.toLowerCase().trim());
                for (const key of keys) {
                    if (lowerCaseAliases.includes(key.toLowerCase().trim())) {
                        return key;
                    }
                }
                return undefined;
            };

            const firstRowKeys = Object.keys(jsonData[0] || {});
            const totalRows = jsonData.length;
            const chunkSize = 200;
            let currentIndex = 0;
            
            const assetNameCol = findColumn(firstRowKeys, ['olt', 'odc', 'odp', 'ftm', 'gpon', 'nama', 'name', `nama ${importAssetType.toLowerCase()}`, 'device name', 'asset name', 'nama aset', 'nama perangkat', 'odp name']);
            const serviceAreaCol = findColumn(firstRowKeys, ['service area', 'service ar', 'witel', 'sa', 'area']);
            const stoCol = findColumn(firstRowKeys, ['sto', 'lokasi sto', 'telkom sto', 'telkom sto odc 2']);
            const coordinatesCol = findColumn(firstRowKeys, ['koordinat', 'coordinate', 'location', 'lokasi', 'gps']);
            const latCol = findColumn(firstRowKeys, ['lat', 'latitude']);
            const longCol = findColumn(firstRowKeys, ['long', 'longitude', 'longitud']);
            const kapasitasCol = findColumn(firstRowKeys, ['kapasitas', 'capacity', 'port', 'core', 'kap', 'is total']);
            const specCol = findColumn(firstRowKeys, ['spec', 'spesifikasi', 'spec odc', 'jenis odc', 'tipe', 'spec_odc']);
            const avaiCol = findColumn(firstRowKeys, ['avai', 'availability']);
            const usedCol = findColumn(firstRowKeys, ['used']);
            const rsvCol = findColumn(firstRowKeys, ['rsv']);
            const rskCol = findColumn(firstRowKeys, ['rsk']);

            if (!assetNameCol) {
                throw new Error(`Kolom nama aset (misalnya 'ODP NAME', 'Nama', 'Device Name') tidak ditemukan di sheet '${sheetName}'. Mohon periksa nama kolom di file Excel Anda.`);
            }

            // ============================================
            // SPECIAL LOGIC FOR MINI OLT ENRICHMENT
            // ============================================
            if (importAssetType === 'Mini OLT') {
                const gponCol = findColumn(firstRowKeys, ['gpon', 'nama', 'name', 'device name', 'asset name']);

                if (!gponCol || !latCol || !longCol) {
                    throw new Error(`Kolom wajib (GPON, LAT, LONG) tidak ditemukan di sheet '${sheetName}'. Mohon periksa file Excel.`);
                }
                
                const existingOltAssetsMap = new Map(assets?.filter(a => a.assetType === 'OLT').map(asset => [asset.name.trim(), asset.id]));
                let totalUpdated = 0;
                let notFoundCount = 0;

                const processMiniOltChunk = () => {
                    try {
                        const end = Math.min(currentIndex + chunkSize, totalRows);
                        for (let i = currentIndex; i < end; i++) {
                            const row = jsonData[i];
                            const gponName = row[gponCol]?.toString().trim();
                            if (!gponName) continue;

                            const existingAssetId = existingOltAssetsMap.get(gponName);

                            if (existingAssetId) {
                                const latValue = row[latCol]?.toString().replace(',', '.');
                                const longValue = row[longCol]?.toString().replace(',', '.');
                                
                                const assetDataToUpdate: Partial<NetworkAsset> = {
                                    subType: 'Mini OLT',
                                    coordinates: `${latValue}, ${longValue}`,
                                };

                                const assetDocRef = doc(firestore, 'network-assets', existingAssetId);
                                updateDocumentNonBlocking(assetDocRef, assetDataToUpdate);
                                totalUpdated++;
                            } else {
                                notFoundCount++;
                            }
                        }

                        currentIndex = end;
                        const currentProgress = (currentIndex / totalRows) * 100;
                        setProgress(currentProgress);

                        if (currentIndex < totalRows) {
                            setTimeout(processMiniOltChunk, 50);
                        } else {
                            toast({
                                title: 'Impor Selesai',
                                description: `Berhasil memperbarui ${totalUpdated} Mini OLT dengan koordinat. ${notFoundCount > 0 ? `${notFoundCount} nama GPON tidak ditemukan.` : ''}`,
                                duration: 9000
                            });
                            setIsImporting(false);
                            setIsImportDialogOpen(false);
                            setImportAssetType('');
                            setProgress(0);
                            const fileInput = document.getElementById('excel-file') as HTMLInputElement;
                            if (fileInput) fileInput.value = '';
                        }
                    } catch (chunkError: any) {
                        console.error("Failed to process Mini OLT data chunk:", chunkError);
                        toast({
                            variant: "destructive",
                            title: 'Proses Impor Mini OLT Gagal',
                            description: `Error pada baris sekitar ${currentIndex}: ${chunkError.message}`,
                        });
                        setIsImporting(false);
                        setProgress(0);
                    }
                };
                
                processMiniOltChunk();
                return;
            }

            // ============================================
            // GENERIC ASSET IMPORT LOGIC
            // ============================================
            
            const assetsCollection = collection(firestore, 'network-assets');
            const existingAssetsMap = new Map(assets?.map(asset => [asset.name.trim(), asset.id]));
            let totalImported = 0;
            let totalUpdated = 0;
            
            const mapStoToServiceArea = (sto: string): NetworkAsset['serviceArea'] => {
                const upperSto = sto.toUpperCase().trim();
                switch (upperSto) {
                    case 'BAN': case 'BANGSRI': return 'SA JEPARA';
                    case 'KEL': case 'KELING': return 'SA JEPARA';
                    case 'JPR': case 'JEPARA': return 'SA JEPARA';
                    case 'PEC': case 'PECANGAAN': return 'SA JEPARA';
                    case 'BLO': case 'BLORA': return 'SA BLORA';
                    case 'CEPU': return 'SA BLORA';
                    case 'NGA': case 'NGAWEN': return 'SA BLORA';
                    case 'RDB': case 'RANDUBLATUNG': return 'SA BLORA';
                    case 'KUD': case 'KUDUS': return 'SA KUDUS';
                    case 'DMA': case 'DEMAK': return 'SA KUDUS';
                    case 'PAT': case 'PATI': return 'SA PATI';
                    case 'TAY': return 'SA PATI';
                    case 'JWN': return 'SA PATI';
                    case 'LSE': case 'LASEM': return 'SA REMBANG';
                    case 'RBN': case 'REMBANG': return 'SA REMBANG';
                    case 'WRO': case 'WIROSARI': return 'SA PURWODADI';
                    case 'TRO': case 'TOROH': return 'SA PURWODADI';
                    case 'GBU': case 'GUBUNG': return 'SA PURWODADI';
                    case 'GDO': case 'GODONG': return 'SA PURWODADI';
                    case 'PURWODADI': return 'SA PURWODADI';
                    default:
                        if (upperSto.includes('KUDUS')) return 'SA KUDUS';
                        if (upperSto.includes('PATI')) return 'SA PATI';
                        if (upperSto.includes('JEPARA')) return 'SA JEPARA';
                        if (upperSto.includes('PURWODADI')) return 'SA PURWODADI';
                        if (upperSto.includes('BLORA')) return 'SA BLORA';
                        if (upperSto.includes('REMBANG')) return 'SA REMBANG';
                        return 'SA KUDUS';
                }
            };

            const processChunk = async () => {
                try {
                    const end = Math.min(currentIndex + chunkSize, totalRows);
                    const batch = writeBatch(firestore);

                    for (let i = currentIndex; i < end; i++) {
                        const row = jsonData[i];
                        const assetName = row[assetNameCol]?.toString().trim();
                        if (!assetName) continue;

                        let stoValue = stoCol ? row[stoCol]?.toString() : '';
                        let serviceAreaValue = serviceAreaCol ? row[serviceAreaCol]?.toString() : '';
                        let kapasitasRawValue = kapasitasCol ? row[kapasitasCol]?.toString() : '';
                        let parsedKapasitas: string | undefined = undefined;

                        if (kapasitasRawValue && isNaN(Number(kapasitasRawValue))) {
                            const parts = kapasitasRawValue.split(' ').filter(Boolean);
                            const potentialKapasitas = parseInt(parts[0], 10);
                            if (!isNaN(potentialKapasitas)) {
                                parsedKapasitas = String(potentialKapasitas);
                                if (!stoValue && parts.length > 1) {
                                    stoValue = parts.slice(1).join(' ');
                                }
                            }
                        } else if (kapasitasRawValue) {
                            parsedKapasitas = kapasitasRawValue;
                        }
                        
                        if (!serviceAreaValue && stoValue) {
                            serviceAreaValue = mapStoToServiceArea(stoValue);
                        }

                        const assetData: Partial<NetworkAsset> = {
                            name: assetName,
                            assetType: importAssetType as NetworkAsset['assetType'],
                            serviceArea: (serviceAreaValue?.toUpperCase() || mapStoToServiceArea(stoValue || '')) as NetworkAsset['serviceArea'],
                            sto: stoValue || 'N/A',
                        };
                        
                        const latValue = latCol ? row[latCol] : null;
                        const longValue = longCol ? row[longCol] : null;

                        if (latValue && longValue) {
                             assetData.coordinates = `${latValue.toString().replace(',', '.')}, ${longValue.toString().replace(',', '.')}`;
                        } else if (coordinatesCol && row[coordinatesCol]) {
                             assetData.coordinates = row[coordinatesCol].toString();
                        } else {
                            assetData.coordinates = '';
                        }
                        
                        if (importAssetType === 'OLT' || importAssetType === 'FTM') {
                            const keteranganCol = findColumn(firstRowKeys, ['keterangan', 'jenis', 'type', 'sub type', 'description', 'keterangan_sto', 'subtype']);
                            let subType: NetworkAsset['subType'] = 'N/A';
                             if (keteranganCol && row[keteranganCol]) {
                                const keterangan = row[keteranganCol].toString().toLowerCase();
                                if (importAssetType === 'FTM') {
                                    if (keterangan.includes('ea')) subType = 'EA';
                                    else if (keterangan.includes('oa')) subType = 'OA';
                                }
                                 if (importAssetType === 'OLT') {
                                    if (keterangan.includes('mini')) subType = 'Mini OLT';
                                    else if (keterangan.includes('olt')) subType = 'OLT';
                                }
                            }
                            assetData.subType = subType;
                        } else if (importAssetType === 'ODP') {
                            if (parsedKapasitas) assetData.kapasitas = parsedKapasitas;
                            if (avaiCol && row[avaiCol] != null) assetData.portAvai = row[avaiCol].toString();
                            if (usedCol && row[usedCol] != null) assetData.portUsed = row[usedCol].toString();
                            if (rsvCol && row[rsvCol] != null) assetData.portRsv = row[rsvCol].toString();
                            if (rskCol && row[rskCol] != null) assetData.portRsk = row[rskCol].toString();
                            assetData.subType = 'N/A';
                        } else if (importAssetType === 'ODC') {
                            if (specCol && row[specCol] != null) assetData.spec = row[specCol].toString();
                            assetData.subType = 'N/A';
                        }
                        
                        const existingAssetId = existingAssetsMap.get(assetData.name!);

                        if (existingAssetId) {
                            const assetDocRef = doc(firestore, 'network-assets', existingAssetId);
                            batch.update(assetDocRef, assetData);
                            totalUpdated++;
                        } else {
                            const newAssetDocRef = doc(assetsCollection);
                            const newAsset = { ...assetData, dateAdded: serverTimestamp() };
                            batch.set(newAssetDocRef, newAsset);
                            totalImported++;
                        }
                    }
                    
                    await batch.commit();
                    
                    currentIndex = end;
                    const currentProgress = (currentIndex / totalRows) * 100;
                    setProgress(currentProgress);

                    if (currentIndex < totalRows) {
                        setTimeout(processChunk, 20); // Process next chunk
                    } else {
                        toast({
                            title: 'Import Selesai',
                            description: `Membuat ${totalImported} aset baru dan memperbarui ${totalUpdated} aset yang sudah ada. Data akan segera muncul.`,
                            duration: 7000
                        });
                        setIsImporting(false);
                        setIsImportDialogOpen(false);
                        setImportAssetType('');
                        setProgress(0);
                        const fileInput = document.getElementById('excel-file') as HTMLInputElement;
                        if (fileInput) fileInput.value = '';
                    }
                } catch (chunkError: any) {
                    console.error("Failed to process data chunk:", chunkError);
                    toast({
                        variant: "destructive",
                        title: 'Proses Impor Gagal',
                        description: `Error pada baris sekitar ${currentIndex}: ${chunkError.message}`,
                        duration: 9000,
                    });
                    setIsImporting(false);
                    setProgress(0);
                }
            }

            processChunk(); // Start the first chunk
           
        } catch (error: any) {
            console.error("Failed to import Excel file:", error);
            toast({
                variant: "destructive",
                title: 'Import Gagal',
                description: error.message || 'Terjadi kesalahan saat membaca file. Pastikan formatnya benar.',
            });
            setIsImporting(false);
            setProgress(0);
        }
    };
    reader.readAsBinaryString(file);
};


  const isLoading = isUserLoading || isProfileLoading || areAssetsLoading;

  if (isLoading && (!assets || assets.length === 0)) {
      return (
          <div>
              <div className="flex items-center justify-between mb-8">
                  <Skeleton className="h-8 w-64 mb-2" />
                  <div className="flex gap-2">
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-10 w-32" />
                  </div>
              </div>
              <Card>
                  <CardHeader>
                        <Skeleton className="h-7 w-32" />
                  </CardHeader>
                  <CardContent className="p-6">
                      <Skeleton className="h-10 w-full mb-2" />
                      <Skeleton className="h-10 w-full" />
                  </CardContent>
              </Card>
          </div>
      )
  }

  return (
    <>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manajemen Aset via Spreadsheet</h1>
          <p className="text-muted-foreground mt-1">
            Kelola semua aset dengan mengimpor dari file spreadsheet.
          </p>
        </div>
        <div className="flex gap-2">
            <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                <DialogTrigger asChild>
                    <Button>
                        <Upload className="mr-2 h-4 w-4"/>
                        Import dari Excel
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Import Aset dari Excel</DialogTitle>
                        <DialogDescription>
                           Pilih jenis aset, lalu unggah file Excel (.xlsx, .xls). Sistem akan memproses data secara bertahap.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 grid gap-4">
                        <div className="grid gap-2">
                           <Label htmlFor="import-asset-type">Jenis Aset</Label>
                           <Select value={importAssetType} onValueChange={(value) => setImportAssetType(value as any)}>
                               <SelectTrigger id="import-asset-type">
                                   <SelectValue placeholder="Pilih jenis aset..." />
                               </SelectTrigger>
                               <SelectContent>
                                   {assetTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                               </SelectContent>
                           </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="excel-file">Pilih File</Label>
                            <Input id="excel-file" type="file" accept=".xlsx, .xls, .csv" onChange={(e) => handleFileImport(e)} disabled={isImporting || !importAssetType} />
                        </div>
                        {isImporting && (
                            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                                <p>Mengimpor {progress.toFixed(0)}%... Ini mungkin memakan waktu sejenak untuk file besar.</p>
                                <Progress value={progress} className="w-full" />
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
            <AlertDialog open={isDeleteAllDialogOpen} onOpenChange={setIsDeleteAllDialogOpen}>
                <AlertDialogTrigger asChild>
                     <Button variant="destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Hapus Semua
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Anda yakin?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tindakan ini akan menghapus semua aset jaringan secara permanen dari database. Tindakan ini tidak dapat dibatalkan.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteAll} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                            Ya, hapus semua
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Semua Aset Jaringan</CardTitle>
          <CardDescription>
            Daftar semua aset yang tersimpan di sistem. Gunakan tombol import untuk menambah atau memperbarui data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Sub-Type</TableHead>
                <TableHead>Service Area</TableHead>
                <TableHead>STO</TableHead>
                <TableHead>Coordinates</TableHead>
                <TableHead>Kapasitas</TableHead>
                <TableHead>Spesifikasi</TableHead>
                <TableHead>Avail</TableHead>
                <TableHead>Used</TableHead>
                <TableHead>Rsv</TableHead>
                <TableHead>Rsk</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets && assets.length > 0 ? (
                assets.map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell>{a.assetType}</TableCell>
                    <TableCell>{a.subType}</TableCell>
                    <TableCell>{a.serviceArea}</TableCell>
                    <TableCell>{a.sto}</TableCell>
                    <TableCell>{a.coordinates || '-'}</TableCell>
                    <TableCell>{a.kapasitas || '-'}</TableCell>
                    <TableCell>{a.spec || '-'}</TableCell>
                    <TableCell>{a.portAvai || '-'}</TableCell>
                    <TableCell>{a.portUsed || '-'}</TableCell>
                    <TableCell>{a.portRsv || '-'}</TableCell>
                    <TableCell>{a.portRsk || '-'}</TableCell>
                    <TableCell className="text-right">
                       <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Anda yakin?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Ini akan menghapus aset "{a.name}" secara permanen.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteAsset(a)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                Hapus
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={13} className="h-24 text-center">
                    Tidak ada aset jaringan ditemukan. Silakan import dari file Excel.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

    
 