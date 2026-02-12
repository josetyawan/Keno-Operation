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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
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
import { Edit, PlusCircle, Trash2, Upload } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, doc, serverTimestamp } from 'firebase/firestore';
import type { UserProfile, NetworkAsset } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';


const serviceAreas = ['SA KUDUS', 'SA PATI', 'SA JEPARA', 'SA PURWODADI', 'SA BLORA', 'SA REMBANG'];
const assetTypes = ['OLT', 'ODC', 'ODP', 'FTM'];
const oltSubTypes = ['Mini OLT', 'OLT'];
const ftmSubTypes = ['EA', 'OA'];


function AssetForm({ asset, onFormSubmit }: { asset?: NetworkAsset | null, onFormSubmit: (data: Partial<NetworkAsset>) => void }) {
  const [name, setName] = useState('');
  const [assetType, setAssetType] = useState('');
  const [subType, setSubType] = useState('');
  const [serviceArea, setServiceArea] = useState('');
  const [sto, setSto] = useState('');
  const [coordinates, setCoordinates] = useState('');
  const [kapasitas, setKapasitas] = useState('');
  const [spec, setSpec] = useState('');
  const { toast } = useToast();


  useEffect(() => {
    if (asset) {
      setName(asset.name || '');
      setAssetType(asset.assetType || '');
      setSubType(asset.subType || '');
      setServiceArea(asset.serviceArea || '');
      setSto(asset.sto || '');
      setCoordinates(asset.coordinates || '');
      setKapasitas(asset.kapasitas || '');
      setSpec(asset.spec || '');
    } else {
      setName('');
      setAssetType('');
      setSubType('');
      setServiceArea('');
      setSto('');
      setCoordinates('');
      setKapasitas('');
      setSpec('');
    }
  }, [asset]);

  const isOlt = assetType === 'OLT';
  const isFtm = assetType === 'FTM';
  const isOdp = assetType === 'ODP';
  const isOdc = assetType === 'ODC';

  const handleAssetTypeChange = (value: string) => {
      setAssetType(value);
      setSubType(''); // Reset sub-type when main type changes
      setKapasitas('');
      setSpec('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !assetType || !serviceArea || !sto) {
        toast({ variant: 'destructive', title: 'Data Tidak Lengkap', description: 'Mohon isi semua kolom yang wajib diisi (Name, Asset Type, Service Area, STO).' });
        return;
    }
    
    const assetData: Partial<NetworkAsset> = {
        name,
        assetType,
        serviceArea,
        sto,
        coordinates,
    };
    
    if (isOlt || isFtm) {
        if (!subType) {
            toast({ variant: 'destructive', title: 'Data Tidak Lengkap', description: 'Mohon pilih Sub-Type untuk OLT atau FTM.' });
            return;
        }
        assetData.subType = subType;
    } else {
        assetData.subType = 'N/A';
    }

    if (isOdp) {
      if (kapasitas) assetData.kapasitas = kapasitas;
      else delete assetData.kapasitas;
    }
    if (isOdc) {
      if (spec) assetData.spec = spec;
      else delete assetData.spec;
    }
    
    onFormSubmit(assetData);
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 py-4">
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="name" className="text-right">Name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" placeholder="e.g. OLT-KDS-01" required />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="assetType" className="text-right">Asset Type</Label>
        <Select onValueChange={handleAssetTypeChange} value={assetType}>
            <SelectTrigger className="col-span-3"><SelectValue placeholder="Select asset type" /></SelectTrigger>
            <SelectContent>
                {assetTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
        </Select>
      </div>
       {(isOlt || isFtm) && (
        <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="subType" className="text-right">Sub-Type</Label>
            <Select onValueChange={setSubType} value={subType}>
                <SelectTrigger className="col-span-3"><SelectValue placeholder="Select sub-type" /></SelectTrigger>
                <SelectContent>
                    { isOlt && oltSubTypes.map(st => <SelectItem key={st} value={st}>{st}</SelectItem>) }
                    { isFtm && ftmSubTypes.map(st => <SelectItem key={st} value={st}>{st}</SelectItem>) }
                </SelectContent>
            </Select>
        </div>
      )}
      {isOdp && (
        <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="kapasitas" className="text-right">Kapasitas</Label>
            <Input id="kapasitas" value={kapasitas} onChange={(e) => setKapasitas(e.target.value)} className="col-span-3" placeholder="e.g. 8, 16" />
        </div>
      )}
      {isOdc && (
        <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="spec" className="text-right">Spesifikasi</Label>
            <Input id="spec" value={spec} onChange={(e) => setSpec(e.target.value)} className="col-span-3" placeholder="e.g. ODC-K-288" />
        </div>
      )}
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="serviceArea" className="text-right">Service Area</Label>
         <Select onValueChange={setServiceArea} value={serviceArea}>
            <SelectTrigger className="col-span-3"><SelectValue placeholder="Select service area" /></SelectTrigger>
            <SelectContent>
                {serviceAreas.map(sa => <SelectItem key={sa} value={sa}>{sa}</SelectItem>)}
            </SelectContent>
        </Select>
      </div>
        <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="sto" className="text-right">STO</Label>
        <Input id="sto" value={sto} onChange={(e) => setSto(e.target.value)} className="col-span-3" placeholder="e.g. KDS, BLO" required />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="coordinates" className="text-right">Coordinates</Label>
        <Input id="coordinates" value={coordinates} onChange={(e) => setCoordinates(e.target.value)} className="col-span-3" placeholder="e.g. -6.80, 110.84" />
      </div>
      <DialogFooter>
        <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
        <Button type="submit">Save changes</Button>
      </DialogFooter>
    </form>
  );
}


export default function AdminAssetsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [assetToEdit, setAssetToEdit] = useState<NetworkAsset | null>(null);
  
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

  const handleCreate = () => {
    setAssetToEdit(null);
    setIsFormDialogOpen(true);
  };

  const handleEdit = (asset: NetworkAsset) => {
    setAssetToEdit(asset);
    setIsFormDialogOpen(true);
  };

  const handleDeleteAsset = (asset: NetworkAsset) => {
    if (!firestore) return;
    const assetDocRef = doc(firestore, 'network-assets', asset.id);
    deleteDocumentNonBlocking(assetDocRef);
    toast({
      title: 'Asset Deleted',
      description: `The asset "${asset.name}" has been deleted.`,
    });
  };

  const confirmDeleteAll = () => {
      if (!assets || !firestore) {
        toast({ variant: 'destructive', title: 'No assets to delete.' });
        return;
      }
      toast({
          title: 'Deletion Started',
          description: `Starting to remove all ${assets.length} assets...`,
      });
      assets.forEach(asset => {
          const assetDocRef = doc(firestore, 'network-assets', asset.id);
          deleteDocumentNonBlocking(assetDocRef);
      });
      toast({
          title: 'All Assets Deleted',
          description: 'All network assets have been scheduled for deletion.',
      });
      setIsDeleteAllDialogOpen(false);
  };


  const handleFormSubmit = (data: Partial<NetworkAsset>) => {
    if (!firestore) return;
    if (assetToEdit) {
      // Update existing asset
      const assetDocRef = doc(firestore, 'network-assets', assetToEdit.id);
      updateDocumentNonBlocking(assetDocRef, data);
      toast({
        title: 'Asset Updated',
        description: `Asset "${data.name}" has been updated.`,
      });
    } else {
      // Create new asset
      const assetsCollection = collection(firestore, 'network-assets');
      addDocumentNonBlocking(assetsCollection, { ...data, dateAdded: serverTimestamp() });
      toast({
        title: 'Asset Created',
        description: `New asset "${data.name}" has been created.`,
      });
    }
    setIsFormDialogOpen(false);
    setAssetToEdit(null);
  }

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

            const assetsCollection = collection(firestore, 'network-assets');
            const existingAssetsMap = new Map(assets?.map(asset => [asset.name, asset.id]));

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

            const assetNameCol = findColumn(firstRowKeys, ['olt', 'odc', 'odp', 'ftm', 'gpon', 'nama', 'name', `nama ${importAssetType.toLowerCase()}`, 'device name', 'asset name', 'nama aset', 'nama perangkat', 'odp name']);
            const serviceAreaCol = findColumn(firstRowKeys, ['service area', 'service ar', 'witel', 'sa', 'area']);
            const stoCol = findColumn(firstRowKeys, ['sto', 'lokasi sto', 'telkom sto']);
            const coordinatesCol = findColumn(firstRowKeys, ['koordinat', 'coordinate', 'location', 'lokasi', 'gps']);
            const latCol = findColumn(firstRowKeys, ['lat', 'latitude']);
            const longCol = findColumn(firstRowKeys, ['long', 'longitude']);
            const kapasitasCol = findColumn(firstRowKeys, ['kapasitas', 'capacity', 'port', 'core', 'kap', 'is total']);
            const specCol = findColumn(firstRowKeys, ['spec', 'spesifikasi', 'spec odc', 'jenis odc', 'tipe', 'spec_odc']);
            
            if (!assetNameCol) {
                throw new Error(`Kolom nama aset (misalnya 'ODP NAME', 'Nama', 'Device Name') tidak ditemukan di sheet '${sheetName}'. Mohon periksa nama kolom di file Excel Anda.`);
            }
            
            const mapStoToServiceArea = (sto: string): NetworkAsset['serviceArea'] => {
                const upperSto = sto.toUpperCase().trim();
                if (upperSto.includes('KUDUS') || upperSto === 'KDS' || upperSto === 'KUD') return 'SA KUDUS';
                if (upperSto.includes('PATI') || upperSto === 'PT' || upperSto === 'PAT') return 'SA PATI';
                if (upperSto.includes('JEPARA') || upperSto === 'JPR' || upperSto === 'JEP') return 'SA JEPARA';
                if (upperSto.includes('PURWODADI') || upperSto === 'PWD' || upperSto === 'PWO') return 'SA PURWODADI';
                if (upperSto.includes('BLORA') || upperSto === 'BLA' || upperSto === 'BLO') return 'SA BLORA';
                if (upperSto.includes('REMBANG') || upperSto === 'RBG' || upperSto === 'REM') return 'SA REMBANG';
                return 'SA KUDUS'; // Fallback
            };

            // ---- Chunk processing logic ----
            const totalRows = jsonData.length;
            const chunkSize = 200;
            let currentIndex = 0;
            let totalImported = 0;
            let totalUpdated = 0;

            const processChunk = () => {
                const end = Math.min(currentIndex + chunkSize, totalRows);
                for (let i = currentIndex; i < end; i++) {
                    const row = jsonData[i];
                    const assetName = row[assetNameCol];
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
                    
                    if (!stoValue && !serviceAreaValue) {
                        console.warn(`Skipping asset "${assetName}" due to missing STO and Service Area.`);
                        continue;
                    }
                    
                    if (!serviceAreaValue && stoValue) {
                        serviceAreaValue = mapStoToServiceArea(stoValue);
                    }

                    const assetData: Partial<NetworkAsset> = {
                        name: assetName.toString(),
                        assetType: importAssetType as NetworkAsset['assetType'],
                        serviceArea: (serviceAreaValue?.toUpperCase() || mapStoToServiceArea(stoValue)) as NetworkAsset['serviceArea'],
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
                        if (parsedKapasitas) assetData.kapasitas = parsedKapasitas; else delete assetData.kapasitas;
                        assetData.subType = 'N/A';
                    } else if (importAssetType === 'ODC') {
                        if (specCol && row[specCol] != null) assetData.spec = row[specCol].toString(); else delete assetData.spec;
                        assetData.subType = 'N/A';
                    }
                    
                    const existingAssetId = existingAssetsMap.get(assetData.name!);

                    if (existingAssetId) {
                        const assetDocRef = doc(firestore, 'network-assets', existingAssetId);
                        updateDocumentNonBlocking(assetDocRef, assetData);
                        totalUpdated++;
                    } else {
                        const newAsset = { ...assetData, dateAdded: serverTimestamp() };
                        addDocumentNonBlocking(assetsCollection, newAsset);
                        totalImported++;
                    }
                }
                
                currentIndex = end;
                const currentProgress = (currentIndex / totalRows) * 100;
                setProgress(currentProgress);

                if (currentIndex < totalRows) {
                    setTimeout(processChunk, 50); // Process next chunk after a short delay
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
          <h1 className="text-3xl font-bold tracking-tight">Manajemen Aset Jaringan</h1>
          <p className="text-muted-foreground mt-1">
            Tambah, edit, atau hapus data aset jaringan di sini.
          </p>
        </div>
        <div className="flex gap-2">
            <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline">
                        <Upload className="mr-2 h-4 w-4"/>
                        Import
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
            <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
                <DialogTrigger asChild>
                    <Button onClick={handleCreate}>
                        <PlusCircle className="mr-2 h-4 w-4"/>
                        Tambah Aset
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>{assetToEdit ? 'Edit Aset' : 'Buat Aset Baru'}</DialogTitle>
                        <DialogDescription>
                            {assetToEdit ? 'Perbarui detail untuk aset ini.' : 'Tambahkan aset jaringan baru ke dalam sistem.'}
                        </DialogDescription>
                    </DialogHeader>
                    <AssetForm asset={assetToEdit} onFormSubmit={handleFormSubmit} />
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
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete all network assets in the database. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteAll} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                            Yes, delete all
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
            Daftar semua aset yang tersimpan di sistem.
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
                    <TableCell className="text-right">
                       <Button variant="ghost" size="icon" onClick={() => handleEdit(a)}>
                           <Edit className="h-4 w-4" />
                       </Button>
                       <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete the asset "{a.name}".
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteAsset(a)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center">
                    Tidak ada aset jaringan ditemukan.
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
