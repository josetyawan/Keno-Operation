
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Trash2, Upload, Search, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { useUser, useFirestore, useCollection, useMemoFirebase, deleteDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, doc, serverTimestamp, writeBatch, where, getDocs, limit } from 'firebase/firestore';
import type { UserProfile, NetworkAsset } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import * as XLSX from 'xlsx';


const assetTypes = ['OLT', 'ODC', 'ODP', 'FTM', 'Mini OLT'];
const serviceAreas = ['SA KUDUS', 'SA PATI', 'SA JEPARA', 'SA PURWODADI', 'SA BLORA', 'SA REMBANG'];


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
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const [searchName, setSearchName] = useState('');
  const [searchAssetType, setSearchAssetType] = useState('all');
  const [searchServiceArea, setSearchServiceArea] = useState('all');
  
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;


  const { data: currentUserProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(
    useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore])
  );

  useEffect(() => {
    if (!isUserLoading && !isProfileLoading && (!user || currentUserProfile?.role !== 'admin')) {
        router.push('/dashboard');
    }
  }, [user, currentUserProfile, isUserLoading, isProfileLoading, router]);

  // Fetch a limited & filtered set of assets for display. This is much more performant.
  const filteredAssetsQuery = useMemoFirebase(() => {
    if (isUserLoading || isProfileLoading || !user || currentUserProfile?.role !== 'admin') {
      return null;
    }
    const constraints: any[] = [];
    if (searchAssetType !== 'all' && searchAssetType !== 'Mini OLT') { // Mini OLT is not a real assetType
      constraints.push(where('assetType', '==', searchAssetType));
    }
    if (searchServiceArea !== 'all') {
      constraints.push(where('serviceArea', '==', searchServiceArea));
    }
    constraints.push(limit(500)); // Fetch a reasonable number to filter by name on the client.
    
    return query(collection(firestore, 'network-assets'), ...constraints);
  }, [firestore, currentUserProfile, user, isUserLoading, isProfileLoading, searchAssetType, searchServiceArea]);

  const { data: queriedAssets, isLoading: areAssetsLoading } = useCollection<NetworkAsset>(filteredAssetsQuery);

  const filteredAssetsByName = useMemo(() => {
    if (!queriedAssets) return [];
    const lowercasedSearchName = searchName.toLowerCase().trim();
    
    return queriedAssets.filter(asset => {
      return searchName ? asset.name.toLowerCase().includes(lowercasedSearchName) : true;
    });
  }, [queriedAssets, searchName]);

  const totalPages = Math.ceil(filteredAssetsByName.length / ITEMS_PER_PAGE);

  const paginatedAssets = useMemo(() => {
      const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE;
      return filteredAssetsByName.slice(startIndex, endIndex);
  }, [filteredAssetsByName, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
      setCurrentPage(1);
  }, [searchName, searchAssetType, searchServiceArea]);


  const handleDeleteAsset = (assetId: string, assetName: string) => {
    if (!firestore) return;
    const assetDocRef = doc(firestore, 'network-assets', assetId);
    deleteDocumentNonBlocking(assetDocRef);
    toast({
      title: 'Aset Dihapus',
      description: `Aset "${assetName}" telah dihapus.`,
    });
  };

  const confirmDeleteAll = async () => {
    if (!firestore) return;
    
    setIsDeletingAll(true);
    toast({
        title: 'Memulai Proses Penghapusan',
        description: `Mulai menghapus semua aset jaringan... Ini mungkin butuh waktu.`,
    });

    try {
        const assetsCollection = collection(firestore, 'network-assets');
        const batchSize = 400; // Firestore limit is 500
        let docsDeleted = 0;
        
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const q = query(assetsCollection, limit(batchSize));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.size === 0) {
                break; // No more documents to delete
            }

            const batch = writeBatch(firestore);
            querySnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            docsDeleted += querySnapshot.size;

            // Optional: brief pause to prevent overwhelming the browser's event loop or hitting rate limits
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        toast({
            title: 'Semua Aset Dihapus',
            description: `Semua ${docsDeleted} aset jaringan telah berhasil dihapus dari database.`,
        });
        setIsDeletingAll(false);
        setIsDeleteAllDialogOpen(false);

    } catch (error) {
        console.error("Failed to delete all assets: ", error);
        toast({ variant: "destructive", title: "Gagal Menghapus Aset", description: "Terjadi kesalahan saat proses penghapusan massal. Silakan coba lagi."});
        setIsDeletingAll(false);
    }
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
        toast({ variant: "destructive", title: "Database Error", description: "Koneksi database belum siap." });
        return;
    }

    setIsImporting(true);
    setProgress(0);
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = async (e) => {
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
            const avaiCol = findColumn(firstRowKeys, ['avai', 'availability', 'port avai']);
            const usedCol = findColumn(firstRowKeys, ['used', 'port used']);
            const rsvCol = findColumn(firstRowKeys, ['rsv', 'port rsv']);
            const rskCol = findColumn(firstRowKeys, ['rsk', 'port rsk']);

            if (!assetNameCol) {
                throw new Error(`Kolom nama aset (misalnya 'ODP NAME', 'Nama', 'Device Name') tidak ditemukan di sheet '${sheetName}'. Mohon periksa nama kolom di file Excel Anda.`);
            }
            
            if (importAssetType === 'Mini OLT') {
                const gponCol = findColumn(firstRowKeys, ['gpon', 'nama', 'name', 'device name', 'asset name']);

                if (!gponCol || !latCol || !longCol) {
                    throw new Error(`Kolom wajib (GPON, LAT, LONG) tidak ditemukan di sheet '${sheetName}'. Mohon periksa file Excel.`);
                }
                
                toast({ title: "Memuat data OLT...", description: "Mempersiapkan data OLT yang ada untuk diperbarui." });
                const oltQuery = query(collection(firestore, "network-assets"), where("assetType", "==", "OLT"));
                const oltSnapshot = await getDocs(oltQuery);
                const existingOltAssetsMap = new Map(oltSnapshot.docs.map(doc => [doc.data().name.trim(), doc.id]));
                
                let totalUpdated = 0;
                let notFoundCount = 0;

                const processMiniOltChunk = async () => {
                    try {
                        const end = Math.min(currentIndex + chunkSize, totalRows);
                        const batch = writeBatch(firestore);

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
                                batch.update(assetDocRef, assetDataToUpdate);
                                totalUpdated++;
                            } else {
                                notFoundCount++;
                            }
                        }
                        
                        await batch.commit();

                        currentIndex = end;
                        const currentProgress = (currentIndex / totalRows) * 100;
                        setProgress(currentProgress);

                        if (currentIndex < totalRows) {
                            setTimeout(processMiniOltChunk, 3000); // Slower delay for Mini-OLT update
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
            
            const assetsCollection = collection(firestore, 'network-assets');
            let totalCreated = 0;
            let totalUpdated = 0;
            
            const mapStoToServiceArea = (sto: string): NetworkAsset['serviceArea'] => {
                const upperSto = sto.toUpperCase().trim();
                // Based on user provided image and previous logic
                if (['BAN','BANGSRI'].includes(upperSto)) return 'SA JEPARA';
                if (['KEL','KELING'].includes(upperSto)) return 'SA JEPARA';
                if (['JPR','JEPARA'].includes(upperSto)) return 'SA JEPARA';
                if (['PEC','PECANGAAN'].includes(upperSto)) return 'SA JEPARA';
                
                if (['BLO','BLORA'].includes(upperSto)) return 'SA BLORA';
                if (['CEPU'].includes(upperSto)) return 'SA BLORA';
                if (['NGA','NGAWEN'].includes(upperSto)) return 'SA BLORA';
                if (['RDB','RANDUBLATUNG'].includes(upperSto)) return 'SA BLORA';

                if (['KUD','KUDUS'].includes(upperSto)) return 'SA KUDUS';
                if (['DMA','DEMAK'].includes(upperSto)) return 'SA KUDUS';

                if (['PAT','PATI'].includes(upperSto)) return 'SA PATI';
                if (['TAY'].includes(upperSto)) return 'SA PATI';
                if (['JWN'].includes(upperSto)) return 'SA PATI';

                if (['LSE','LASEM'].includes(upperSto)) return 'SA REMBANG';
                if (['RBN','REMBANG'].includes(upperSto)) return 'SA REMBANG';

                if (['WRO','WIROSARI'].includes(upperSto)) return 'SA PURWODADI';
                if (['TRO','TOROH'].includes(upperSto)) return 'SA PURWODADI';
                if (['GBU','GUBUNG'].includes(upperSto)) return 'SA PURWODADI';
                if (['GDO','GODONG'].includes(upperSto)) return 'SA PURWODADI';
                if (['PURWODADI'].includes(upperSto)) return 'SA PURWODADI';

                // Fallback for partial matches
                if (upperSto.includes('KUDUS')) return 'SA KUDUS';
                if (upperSto.includes('PATI')) return 'SA PATI';
                if (upperSto.includes('JEPARA')) return 'SA JEPARA';
                if (upperSto.includes('PURWODADI')) return 'SA PURWODADI';
                if (upperSto.includes('BLORA')) return 'SA BLORA';
                if (upperSto.includes('REMBANG')) return 'SA REMBANG';
                
                return 'SA KUDUS'; // Default fallback
            };

            const processChunk = async () => {
                try {
                    const end = Math.min(currentIndex + chunkSize, totalRows);
                    const chunkRows = jsonData.slice(currentIndex, end);
                    const assetNamesInChunk = chunkRows.map(row => row[assetNameCol]?.toString().trim()).filter(Boolean);

                    if (assetNamesInChunk.length === 0) {
                        currentIndex = end;
                        if (currentIndex < totalRows) { setTimeout(processChunk, 50); } else { /* finished */ }
                        return;
                    }

                    // Find existing assets in this chunk
                    const existingAssetsMap = new Map<string, { id: string }>();
                    const queryChunks: string[][] = [];
                    for (let i = 0; i < assetNamesInChunk.length; i += 30) {
                        queryChunks.push(assetNamesInChunk.slice(i, i + 30));
                    }

                    for (const nameChunk of queryChunks) {
                        if (nameChunk.length > 0) {
                            const q = query(assetsCollection, where('name', 'in', nameChunk));
                            const querySnapshot = await getDocs(q);
                            querySnapshot.forEach(doc => {
                                existingAssetsMap.set(doc.data().name.trim(), { id: doc.id });
                            });
                        }
                    }

                    const batch = writeBatch(firestore);

                    for (const row of chunkRows) {
                        const assetName = row[assetNameCol]?.toString().trim();
                        if (!assetName) continue;

                        let stoValue = stoCol ? row[stoCol]?.toString() : '';
                        let serviceAreaValue = serviceAreaCol ? row[serviceAreaCol]?.toString() : '';
                        
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
                            let kapasitasRawValue = kapasitasCol ? row[kapasitasCol]?.toString() : '';
                            if (kapasitasRawValue) assetData.kapasitas = kapasitasRawValue;
                            if (avaiCol && row[avaiCol] != null) assetData.portAvai = row[avaiCol].toString();
                            if (usedCol && row[usedCol] != null) assetData.portUsed = row[usedCol].toString();
                            if (rsvCol && row[rsvCol] != null) assetData.portRsv = row[rsvCol].toString();
                            if (rskCol && row[rskCol] != null) assetData.portRsk = row[rskCol].toString();
                            assetData.subType = 'N/A';
                        } else if (importAssetType === 'ODC') {
                            if (specCol && row[specCol] != null) assetData.spec = row[specCol].toString();
                            assetData.subType = 'N/A';
                        }

                        const existingAsset = existingAssetsMap.get(assetName);
                        if (existingAsset) {
                            const assetDocRef = doc(assetsCollection, existingAsset.id);
                            batch.update(assetDocRef, assetData);
                            totalUpdated++;
                        } else {
                            const newAssetDocRef = doc(assetsCollection);
                            const newAsset = { ...assetData, id: newAssetDocRef.id, dateAdded: serverTimestamp() };
                            batch.set(newAssetDocRef, newAsset);
                            totalCreated++;
                        }
                    }
                    
                    await batch.commit();
                    
                    currentIndex = end;
                    const currentProgress = (currentIndex / totalRows) * 100;
                    setProgress(currentProgress);

                    if (currentIndex < totalRows) {
                        const delay = importAssetType === 'ODP' ? 3000 : 1500;
                        setTimeout(processChunk, delay); 
                    } else {
                        toast({
                            title: 'Import Selesai',
                            description: `Berhasil membuat ${totalCreated} aset baru dan memperbarui ${totalUpdated} aset.`,
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

            processChunk();
           
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

  if (isLoading && !queriedAssets) {
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
          <h1 className="text-3xl font-bold tracking-tight">Manajemen Aset Jaringan</h1>
          <p className="text-muted-foreground mt-1">
            Impor massal dari Excel, cari, dan kelola aset jaringan.
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
                           Sistem ini akan memperbarui aset yang ada jika nama asetnya cocok, dan membuat aset baru jika tidak ditemukan. Ini tidak akan menghapus aset yang ada di database tetapi tidak ada di file Excel Anda.
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
                            Tindakan ini akan menghapus **SEMUA** aset jaringan secara permanen dari database. Tindakan ini tidak dapat dibatalkan. Pastikan Anda memiliki cadangan data di file Excel.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteAll} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" disabled={isDeletingAll}>
                            {isDeletingAll ? <Loader2 className="mr-2 animate-spin" /> : null}
                            {isDeletingAll ? 'Menghapus...' : 'Ya, hapus semua'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
      </div>

       <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Cari & Filter Aset
          </CardTitle>
          <CardDescription>
            Untuk performa terbaik, halaman ini hanya menampilkan sebagian data. Gunakan filter untuk menemukan aset spesifik.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="search-name">Nama Aset</Label>
            <Input id="search-name" placeholder="Cari nama aset..." value={searchName} onChange={(e) => setSearchName(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="search-type">Jenis Aset</Label>
            <Select value={searchAssetType} onValueChange={setSearchAssetType}>
              <SelectTrigger id="search-type"><SelectValue placeholder="Semua Jenis" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Jenis</SelectItem>
                {assetTypes.filter(t => t !== 'Mini OLT').map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="search-area">Service Area</Label>
            <Select value={searchServiceArea} onValueChange={setSearchServiceArea}>
              <SelectTrigger id="search-area"><SelectValue placeholder="Semua Area" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Area</SelectItem>
                {serviceAreas.map(sa => <SelectItem key={sa} value={sa}>{sa}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Aset</CardTitle>
          <CardDescription>
            Menampilkan {paginatedAssets.length} dari {filteredAssetsByName.length} aset yang cocok.
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
              {areAssetsLoading && paginatedAssets.length === 0 ? (
                 Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                        <TableCell colSpan={13}><Skeleton className="h-6 w-full" /></TableCell>
                    </TableRow>
                ))
              ) : paginatedAssets.length > 0 ? (
                paginatedAssets.map(a => (
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
                              <AlertDialogAction onClick={() => handleDeleteAsset(a.id, a.name)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
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
                    {(searchName || searchAssetType !== 'all' || searchServiceArea !== 'all') 
                        ? "Tidak ada aset yang cocok dengan filter Anda." 
                        : "Gunakan filter di atas untuk mencari atau impor data baru."
                    }
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
         <CardFooter>
            <div className="text-xs text-muted-foreground">
                Halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong>
            </div>
            <div className="flex items-center gap-2 ml-auto">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1 || totalPages === 0}
                >
                    <ChevronLeft className="h-4 w-4" />
                    Sebelumnya
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages || totalPages === 0}
                >
                    Berikutnya
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </CardFooter>
      </Card>
    </>
  );
}
