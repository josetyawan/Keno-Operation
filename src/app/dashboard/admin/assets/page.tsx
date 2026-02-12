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
  
  const isOlt = assetType === 'OLT';
  const isFtm = assetType === 'FTM';

  useEffect(() => {
    if (asset) {
      setName(asset.name);
      setAssetType(asset.assetType);
      setSubType(asset.subType);
      setServiceArea(asset.serviceArea);
    } else {
      setName('');
      setAssetType('');
      setSubType('');
      setServiceArea('');
    }
  }, [asset]);
  
  const handleAssetTypeChange = (value: string) => {
      setAssetType(value);
      setSubType(''); // Reset sub-type when main type changes
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !assetType || !serviceArea || ((isOlt || isFtm) && !subType) ) {
        alert('Please fill all required fields.');
        return;
    }
    
    let finalSubType = 'N/A';
    if(isOlt || isFtm) {
        finalSubType = subType;
    }

    onFormSubmit({ name, assetType, subType: finalSubType, serviceArea });
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
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="serviceArea" className="text-right">Service Area</Label>
         <Select onValueChange={setServiceArea} value={serviceArea}>
            <SelectTrigger className="col-span-3"><SelectValue placeholder="Select service area" /></SelectTrigger>
            <SelectContent>
                {serviceAreas.map(sa => <SelectItem key={sa} value={sa}>{sa}</SelectItem>)}
            </SelectContent>
        </Select>
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
  const [assetToDelete, setAssetToDelete] = useState<NetworkAsset | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Redirect if user is not an admin
  const { data: currentUserProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(
    useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore])
  );

  useEffect(() => {
    if (!isUserLoading && !isProfileLoading) {
      if (!user || currentUserProfile?.role !== 'admin') {
        router.push('/dashboard');
      }
    }
  }, [user, currentUserProfile, isUserLoading, isProfileLoading, router]);

  // Fetch all assets
  const assetsQuery = useMemoFirebase(() => {
      if (currentUserProfile?.role === 'admin') {
          return query(collection(firestore, 'network-assets'));
      }
      return null;
  }, [firestore, currentUserProfile]);

  const { data: assets, isLoading: areAssetsLoading } = useCollection<NetworkAsset>(assetsQuery);

  const handleCreate = () => {
    setAssetToEdit(null);
    setIsFormDialogOpen(true);
  };

  const handleEdit = (asset: NetworkAsset) => {
    setAssetToEdit(asset);
    setIsFormDialogOpen(true);
  };

  const handleDelete = (asset: NetworkAsset) => {
    setAssetToDelete(asset);
  };
  
  const confirmDelete = () => {
    if (!assetToDelete) return;
    const assetDocRef = doc(firestore, 'network-assets', assetToDelete.id);
    deleteDocumentNonBlocking(assetDocRef);
    toast({
      title: 'Asset Deleted',
      description: `The asset "${assetToDelete.name}" has been deleted.`,
    });
    setAssetToDelete(null);
  }

  const handleFormSubmit = (data: Partial<NetworkAsset>) => {
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
    if (!event.target.files || event.target.files.length === 0) {
        toast({ variant: "destructive", title: "No file selected." });
        return;
    }
    
    setIsImporting(true);
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = async (e) => {
        try {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'binary' });

            const assetsCollection = collection(firestore, 'network-assets');
            let totalImported = 0;
            let skippedSheets: string[] = [];

            // Helper to find a column name from a list of aliases
            const findColumn = (keys: string[], aliases: string[]): string | undefined => {
                const lowerCaseAliases = aliases.map(a => a.toLowerCase());
                for (const key of keys) {
                    if (lowerCaseAliases.includes(key.toLowerCase())) {
                        return key;
                    }
                }
                return undefined;
            };
            
            // Helper to normalize Service Area names
            const normalizeServiceArea = (input: string): string | null => {
                if (!input) return null;
                const upperInput = input.toUpperCase().trim();
                const serviceAreasList = ['SA KUDUS', 'SA PATI', 'SA JEPARA', 'SA PURWODADI', 'SA BLORA', 'SA REMBANG'];
                
                if (serviceAreasList.includes(upperInput)) return upperInput;

                const mapping: { [key: string]: string } = {
                    'KUDUS': 'SA KUDUS', 'KUD': 'SA KUDUS',
                    'PATI': 'SA PATI', 'PTI': 'SA PATI',
                    'JEPARA': 'SA JEPARA', 'JPR': 'SA JEPARA',
                    'PURWODADI': 'SA PURWODADI', 'PWD': 'SA PURWODADI',
                    'BLORA': 'SA BLORA', 'BLA': 'SA BLORA',
                    'REMBANG': 'SA REMBANG', 'RBG': 'SA REMBANG',
                };
                
                for (const key in mapping) {
                   if (upperInput.includes(key)) return mapping[key];
                }
                
                return null;
            };

            for (const sheetName of workbook.SheetNames) {
                const lowerSheetName = sheetName.toLowerCase();
                const worksheet = workbook.Sheets[sheetName];
                const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

                if (jsonData.length === 0) continue;

                // Determine assetType and potentially subType from sheet name
                let assetType: NetworkAsset['assetType'] | null = null;
                let subTypeFromSheet: NetworkAsset['subType'] | null = null;
                
                if (lowerSheetName.includes('olt')) assetType = 'OLT';
                if (lowerSheetName.includes('odc')) assetType = 'ODC';
                if (lowerSheetName.includes('odp')) assetType = 'ODP';
                if (lowerSheetName.includes('ftm')) assetType = 'FTM';
                
                if (lowerSheetName === 'olt') subTypeFromSheet = 'OLT';
                if (lowerSheetName === 'mini-olt') {
                    assetType = 'OLT'; // Ensure assetType is correct
                    subTypeFromSheet = 'Mini OLT';
                }

                if (!assetType) {
                    skippedSheets.push(sheetName);
                    continue;
                }

                const firstRowKeys = Object.keys(jsonData[0]);
                
                // Flexible column identification
                const assetNameCol = findColumn(firstRowKeys, [assetType, 'gpon', 'nama', `nama ${assetType}`]);
                const serviceAreaCol = findColumn(firstRowKeys, ['service area', 'service ar', 'witel', 'sto']);
                const keteranganCol = findColumn(firstRowKeys, ['keterangan', 'jenis', 'type', 'sub type']);
                
                if (!assetNameCol || !serviceAreaCol) {
                    skippedSheets.push(sheetName);
                    continue; // Skip if essential columns are missing
                }

                for (const row of jsonData) {
                    const assetName = row[assetNameCol];
                    const serviceAreaValue = row[serviceAreaCol];

                    if (!assetName || !serviceAreaValue) continue;

                    const serviceArea = normalizeServiceArea(serviceAreaValue.toString());
                    if (!serviceArea) continue; 

                    let subType: NetworkAsset['subType'] = subTypeFromSheet || 'N/A';
                    
                    if (keteranganCol && row[keteranganCol]) {
                        const keterangan = row[keteranganCol].toString().toLowerCase();
                        if (assetType === 'FTM') {
                            if (keterangan.includes('ea')) subType = 'EA';
                            else if (keterangan.includes('oa')) subType = 'OA';
                        }
                         if (assetType === 'OLT') {
                            if (keterangan.includes('mini')) subType = 'Mini OLT';
                            else if (keterangan.includes('olt')) subType = 'OLT';
                        }
                    }

                    const newAsset: Omit<NetworkAsset, 'id'> = {
                        name: assetName.toString(),
                        assetType: assetType,
                        subType: subType,
                        serviceArea: serviceArea,
                        dateAdded: serverTimestamp(),
                    };
                    
                    addDocumentNonBlocking(assetsCollection, newAsset);
                    totalImported++;
                }
            }

            if (totalImported > 0) {
                toast({
                    title: 'Import Successful',
                    description: `Successfully processed ${totalImported} assets. The data will appear shortly.`,
                });
                if (skippedSheets.length > 0) {
                    toast({
                        variant: 'default',
                        title: 'Some sheets were skipped',
                        description: `Skipped: ${skippedSheets.join(', ')}. Check names (olt, odc, etc.) and format.`,
                        duration: 8000
                    });
                }
            } else {
                 toast({
                    variant: "destructive",
                    title: 'Import Failed',
                    description: 'No assets could be imported. Please check file format, column headers, and sheet names.',
                });
            }

        } catch (error) {
            console.error("Failed to import Excel file:", error);
            toast({
                variant: "destructive",
                title: 'Import Failed',
                description: 'There was an error reading the file. Ensure it is a valid Excel file.',
            });
        } finally {
            setIsImporting(false);
            setIsImportDialogOpen(false);
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manajemen Aset Jaringan</h1>
          <p className="text-muted-foreground mt-1">
            Tambah, edit, atau hapus data aset jaringan di sini.
          </p>
        </div>
        <div className="flex gap-2">
            <Button onClick={() => setIsImportDialogOpen(true)} variant="outline">
                <Upload className="mr-2 h-4 w-4"/>
                Import dari Excel
            </Button>
            <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
                <DialogTrigger asChild>
                    <Button onClick={handleCreate}>
                        <PlusCircle className="mr-2 h-4 w-4"/>
                        Tambah Aset Baru
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
                    <TableCell className="text-right">
                       <Button variant="ghost" size="icon" onClick={() => handleEdit(a)}>
                           <Edit className="h-4 w-4" />
                       </Button>
                       <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(a)}>
                           <Trash2 className="h-4 w-4" />
                       </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Tidak ada aset jaringan ditemukan.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
       <AlertDialog open={!!assetToDelete} onOpenChange={(open) => !open && setAssetToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the asset.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Import Aset dari Excel</DialogTitle>
                <DialogDescription>
                    Pilih file Excel (.xlsx, .xls) dengan sheet bernama 'olt', 'mini-olt', 'odc', 'odp', 'ftm'. Data akan ditambahkan ke aset yang sudah ada.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 grid gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="excel-file">Pilih File</Label>
                    <Input id="excel-file" type="file" accept=".xlsx, .xls, .csv" onChange={handleFileImport} disabled={isImporting} />
                </div>
                {isImporting && (
                    <div className="flex items-center text-sm text-muted-foreground">
                        <p>Mengimpor... Ini mungkin memakan waktu sejenak.</p>
                    </div>
                )}
            </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
