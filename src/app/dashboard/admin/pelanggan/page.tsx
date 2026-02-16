
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Edit, PlusCircle, Trash2, MapPin, Loader2, Upload } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking, useDoc, useStorage } from '@/firebase';
import { collection, query, doc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import type { UserProfile, Pelanggan } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const serviceAreas = ['SA KUDUS', 'SA PATI', 'SA JEPARA', 'SA PURWODADI', 'SA BLORA', 'SA REMBANG'];

function PelangganForm({ pelanggan, onFormSubmit, isSaving }: { pelanggan?: Pelanggan | null, onFormSubmit: (data: Partial<Pelanggan>, file: File | null) => void, isSaving: boolean }) {
  const [namaPelanggan, setNamaPelanggan] = useState('');
  const [alamat, setAlamat] = useState('');
  const [nomorTelepon, setNomorTelepon] = useState('');
  const [koordinat, setKoordinat] = useState('');
  const [serviceArea, setServiceArea] = useState('');
  const [fotoCp, setFotoCp] = useState<File | null>(null);
  const [fotoCpPreview, setFotoCpPreview] = useState<string | null>(null);

  useEffect(() => {
    if (pelanggan) {
      setNamaPelanggan(pelanggan.namaPelanggan);
      setAlamat(pelanggan.alamat || '');
      setNomorTelepon(pelanggan.nomorTelepon || '');
      setKoordinat(pelanggan.koordinat);
      setServiceArea(pelanggan.serviceArea);
      setFotoCpPreview(pelanggan.fotoCpUrl || null);
      setFotoCp(null);
    } else {
      setNamaPelanggan('');
      setAlamat('');
      setNomorTelepon('');
      setKoordinat('');
      setServiceArea('');
      setFotoCpPreview(null);
      setFotoCp(null);
    }
  }, [pelanggan]);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        setFotoCp(file);
        setFotoCpPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaPelanggan || !koordinat || !serviceArea) return;
    const data: Partial<Pelanggan> = { namaPelanggan, alamat, nomorTelepon, koordinat, serviceArea };
    if (!pelanggan) { // Only add dateAdded on creation
        data.dateAdded = serverTimestamp();
    }
    onFormSubmit(data, fotoCp);
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 py-4">
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="namaPelanggan" className="text-right">Nama</Label>
        <Input id="namaPelanggan" value={namaPelanggan} onChange={(e) => setNamaPelanggan(e.target.value)} className="col-span-3" placeholder="Nama Pelanggan" required />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="alamat" className="text-right">Alamat</Label>
        <Textarea id="alamat" value={alamat} onChange={(e) => setAlamat(e.target.value)} className="col-span-3" placeholder="Alamat lengkap pelanggan" />
      </div>
       <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="nomorTelepon" className="text-right">No. Telepon</Label>
        <Input id="nomorTelepon" value={nomorTelepon} onChange={(e) => setNomorTelepon(e.target.value)} className="col-span-3" placeholder="0812..." />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="koordinat" className="text-right">Koordinat</Label>
        <Input id="koordinat" value={koordinat} onChange={(e) => setKoordinat(e.target.value)} className="col-span-3" placeholder="-7.123, 110.456" required />
      </div>
       <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="serviceArea" className="text-right">Service Area</Label>
         <Select value={serviceArea} onValueChange={setServiceArea} required>
            <SelectTrigger className="col-span-3">
              <SelectValue placeholder="Pilih Service Area" />
            </SelectTrigger>
            <SelectContent>
                {serviceAreas.map(sa => <SelectItem key={sa} value={sa}>{sa}</SelectItem>)}
            </SelectContent>
          </Select>
      </div>
      <div className="grid grid-cols-4 items-start gap-4">
        <Label htmlFor="fotoCp" className="text-right pt-2">Foto CP</Label>
        <div className="col-span-3 grid gap-2">
            <Input id="fotoCp" type="file" onChange={handleFileChange} accept="image/*" />
            {fotoCpPreview && (
                <div className="relative w-32 h-32">
                    <Image src={fotoCpPreview} alt="Preview Foto CP" fill className="rounded-md object-cover" />
                </div>
            )}
        </div>
      </div>
      <DialogFooter>
        <DialogClose asChild><Button type="button" variant="secondary">Batal</Button></DialogClose>
        <Button type="submit" disabled={isSaving}>
            {isSaving ? <Loader2 className="animate-spin" /> : 'Simpan'}
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function AdminPelangganPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();
  const router = useRouter();
  const { toast } = useToast();

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pelangganToEdit, setPelangganToEdit] = useState<Pelanggan | null>(null);
  const [pelangganToDelete, setPelangganToDelete] = useState<Pelanggan | null>(null);

  const { data: currentUserProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(
    useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore])
  );

  useEffect(() => {
    if (!isUserLoading && !isProfileLoading && (!user || currentUserProfile?.role !== 'admin')) {
        router.push('/dashboard');
    }
  }, [user, currentUserProfile, isUserLoading, isProfileLoading, router]);

  const pelangganQuery = useMemoFirebase(() => {
      if (currentUserProfile?.role === 'admin') {
          return query(collection(firestore, 'pelanggan'), doc('dateAdded', 'desc'));
      }
      return null;
  }, [firestore, currentUserProfile?.role]);

  const { data: pelangganList, isLoading: arePelangganLoading } = useCollection<Pelanggan>(pelangganQuery);

  const handleCreate = () => {
    setPelangganToEdit(null);
    setIsFormDialogOpen(true);
  };

  const handleEdit = (pelanggan: Pelanggan) => {
    setPelangganToEdit(pelanggan);
    setIsFormDialogOpen(true);
  };

  const handleDelete = (pelanggan: Pelanggan) => {
    setPelangganToDelete(pelanggan);
  };
  
  const confirmDelete = () => {
    if (!pelangganToDelete || !firestore) return;
    const pelangganDocRef = doc(firestore, 'pelanggan', pelangganToDelete.id);
    deleteDocumentNonBlocking(pelangganDocRef);
    if (pelangganToDelete.fotoCpUrl) {
        const photoRef = ref(storage, pelangganToDelete.fotoCpUrl);
        deleteObject(photoRef).catch(err => console.error("Failed to delete old photo:", err));
    }
    toast({
      title: 'Pelanggan Dihapus',
      description: `Data untuk "${pelangganToDelete.namaPelanggan}" telah dihapus.`,
    });
    setPelangganToDelete(null);
  }

  const handleFormSubmit = async (data: Partial<Pelanggan>, file: File | null) => {
    if (!firestore || !user) return;
    setIsSaving(true);
    try {
        let fotoCpUrl = pelangganToEdit?.fotoCpUrl || undefined;

        if (file) {
            const filePath = `pelanggan/${user.uid}/${Date.now()}-${file.name}`;
            const storageRef = ref(storage, filePath);
            await uploadBytes(storageRef, file);
            fotoCpUrl = await getDownloadURL(storageRef);
        }

        data.fotoCpUrl = fotoCpUrl;

        if (pelangganToEdit) {
            const pelangganDocRef = doc(firestore, 'pelanggan', pelangganToEdit.id);
            updateDocumentNonBlocking(pelangganDocRef, data);
            toast({ title: 'Pelanggan Diperbarui' });
        } else {
            const pelangganCollection = collection(firestore, 'pelanggan');
            addDocumentNonBlocking(pelangganCollection, data);
            toast({ title: 'Pelanggan Dibuat' });
        }
        setIsFormDialogOpen(false);
        setPelangganToEdit(null);
    } catch(error: any) {
        toast({ variant: 'destructive', title: 'Gagal Menyimpan', description: error.message });
    } finally {
        setIsSaving(false);
    }
  }

  const isLoading = isUserLoading || isProfileLoading || arePelangganLoading;

  if (isLoading && !pelangganList) {
      return (
          <div>
              <div className="flex items-center justify-between mb-8"><Skeleton className="h-8 w-64 mb-2" /><Skeleton className="h-10 w-32" /></div>
              <Card><CardHeader><Skeleton className="h-7 w-32" /></CardHeader><CardContent className="p-6"><Skeleton className="h-10 w-full mb-2" /><Skeleton className="h-10 w-full" /></CardContent></Card>
          </div>
      )
  }

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div><h1 className="text-3xl font-bold tracking-tight">Manajemen Pelanggan</h1><p className="text-muted-foreground mt-1">Kelola data pelanggan, lokasi, dan foto CP.</p></div>
        <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}><DialogTrigger asChild><Button onClick={handleCreate}><PlusCircle className="mr-2 h-4 w-4"/>Tambah Pelanggan</Button></DialogTrigger>
            <DialogContent className="sm:max-w-[500px]"><DialogHeader><DialogTitle>{pelangganToEdit ? 'Edit Pelanggan' : 'Tambah Pelanggan Baru'}</DialogTitle><DialogDescription>Isi detail pelanggan di bawah ini.</DialogDescription></DialogHeader>
                <PelangganForm pelanggan={pelangganToEdit} onFormSubmit={handleFormSubmit} isSaving={isSaving} />
            </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader><CardTitle>Daftar Pelanggan</CardTitle><CardDescription>Daftar semua pelanggan yang tersimpan di sistem.</CardDescription></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>Service Area</TableHead><TableHead>Alamat</TableHead><TableHead>Koordinat</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
            <TableBody>
              {arePelangganLoading && !pelangganList ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center">Memuat data...</TableCell></TableRow>
              ) : pelangganList && pelangganList.length > 0 ? (
                pelangganList.map(p => {
                    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${p.koordinat}`;
                    return (
                        <TableRow key={p.id}>
                            <TableCell className="font-medium">{p.namaPelanggan}</TableCell>
                            <TableCell>{p.serviceArea}</TableCell>
                            <TableCell>{p.alamat}</TableCell>
                            <TableCell>{p.koordinat}</TableCell>
                            <TableCell className="text-right">
                                <Button asChild variant="ghost" size="icon" title="Lihat di Google Maps"><Link href={googleMapsUrl} target="_blank" rel="noopener noreferrer"><MapPin className="h-4 w-4 text-blue-600" /></Link></Button>
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(p)}><Edit className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(p)}><Trash2 className="h-4 w-4" /></Button>
                            </TableCell>
                        </TableRow>
                    )
                })
              ) : (
                <TableRow><TableCell colSpan={5} className="h-24 text-center">Tidak ada data pelanggan. Klik "Tambah Pelanggan" untuk memulai.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
       <AlertDialog open={!!pelangganToDelete} onOpenChange={(open) => !open && setPelangganToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Anda yakin?</AlertDialogTitle><AlertDialogDescription>Tindakan ini akan menghapus data pelanggan "{pelangganToDelete?.namaPelanggan}" secara permanen.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Hapus</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
