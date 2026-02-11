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
import { Edit, PlusCircle, Trash2 } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, doc, serverTimestamp } from 'firebase/firestore';
import type { UserProfile, NetworkAsset } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

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

  const isLoading = isUserLoading || isProfileLoading || areAssetsLoading;

  if (isLoading && (!assets || assets.length === 0)) {
      return (
          <div>
              <div className="flex items-center justify-between mb-8">
                  <Skeleton className="h-8 w-64 mb-2" />
                  <Skeleton className="h-10 w-32" />
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
    </>
  );
}
