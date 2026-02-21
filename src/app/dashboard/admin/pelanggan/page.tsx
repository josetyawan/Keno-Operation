
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
import { Badge } from '@/components/ui/badge';
import { Edit, PlusCircle, Trash2, MapPin, Loader2, Upload, Search, History } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking, useDoc, useStorage } from '@/firebase';
import { collection, query, doc, serverTimestamp, orderBy, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import type { UserProfile, Pelanggan, LaporanGangguan } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';

const serviceAreas = ['SA KUDUS', 'SA PATI', 'SA JEPARA', 'SA PURWODADI', 'SA BLORA', 'SA REMBANG'];

// --- FORM COMPONENTS ---

function PelangganForm({ pelanggan, onFormSubmit, isSaving }: { pelanggan?: Pelanggan | null, onFormSubmit: (data: Partial<Pelanggan>, file: File | null) => void, isSaving: boolean }) {
  const [noService, setNoService] = useState('');
  const [namaPelanggan, setNamaPelanggan] = useState('');
  const [alamat, setAlamat] = useState('');
  const [nomorTelepon, setNomorTelepon] = useState('');
  const [koordinat, setKoordinat] = useState('');
  const [serviceArea, setServiceArea] = useState('');
  const [fotoCp, setFotoCp] = useState<File | null>(null);
  const [fotoCpPreview, setFotoCpPreview] = useState<string | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (pelanggan) {
      setNoService(pelanggan.noService);
      setNamaPelanggan(pelanggan.namaPelanggan);
      setAlamat(pelanggan.alamat || '');
      setNomorTelepon(pelanggan.nomorTelepon || '');
      setKoordinat(pelanggan.koordinat);
      setServiceArea(pelanggan.serviceArea);
      setFotoCpPreview(pelanggan.fotoCpUrl || null);
      setFotoCp(null);
    } else {
      setNoService('');
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

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
        toast({ variant: 'destructive', title: 'Geolocation Tidak Didukung' });
        return;
    }
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            setKoordinat(`${latitude}, ${longitude}`);
            setIsGettingLocation(false);
            toast({ title: 'Lokasi Berhasil Diambil' });
        },
        (error) => {
            toast({ variant: 'destructive', title: 'Gagal Mendapatkan Lokasi', description: error.message });
            setIsGettingLocation(false);
        }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noService || !namaPelanggan || !koordinat || !serviceArea) return;
    const data: Partial<Pelanggan> = { noService, namaPelanggan, alamat, nomorTelepon, koordinat, serviceArea };
    if (!pelanggan) {
        data.dateAdded = serverTimestamp();
    }
    onFormSubmit(data, fotoCp);
  };

  return (
     <form onSubmit={handleSubmit} className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="noService">No. Service *</Label>
        <Input id="noService" value={noService} onChange={(e) => setNoService(e.target.value)} placeholder="Contoh: 1234567890" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="namaPelanggan">Nama Pelanggan *</Label>
        <Input id="namaPelanggan" value={namaPelanggan} onChange={(e) => setNamaPelanggan(e.target.value)} placeholder="Nama Pelanggan" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="alamat">Alamat</Label>
        <Textarea id="alamat" value={alamat} onChange={(e) => setAlamat(e.target.value)} placeholder="Alamat lengkap pelanggan" />
      </div>
       <div className="grid gap-2">
        <Label htmlFor="nomorTelepon">No. Telepon</Label>
        <Input id="nomorTelepon" value={nomorTelepon} onChange={(e) => setNomorTelepon(e.target.value)} placeholder="0812..." />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="koordinat">Koordinat *</Label>
        <div className="flex items-center gap-2">
            <Input id="koordinat" value={koordinat} onChange={(e) => setKoordinat(e.target.value)} className="flex-grow" placeholder="-7.123, 110.456" required />
            <Button type="button" variant="outline" size="icon" onClick={handleGetLocation} disabled={isGettingLocation} title="Ambil Lokasi Saat Ini">
                {isGettingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
            </Button>
        </div>
      </div>
       <div className="grid gap-2">
        <Label htmlFor="serviceArea">Service Area *</Label>
         <Select value={serviceArea} onValueChange={setServiceArea} required>
            <SelectTrigger><SelectValue placeholder="Pilih Service Area" /></SelectTrigger>
            <SelectContent>{serviceAreas.map(sa => <SelectItem key={sa} value={sa}>{sa}</SelectItem>)}</SelectContent>
          </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="fotoCp">Foto Lokasi Rumah/Kantor</Label>
        <Input id="fotoCp" type="file" onChange={handleFileChange} accept="image/*" />
        {fotoCpPreview && <div className="relative w-32 h-32 mt-2"><Image src={fotoCpPreview} alt="Preview Foto" fill className="rounded-md object-cover" /></div>}
      </div>
      <DialogFooter>
        <DialogClose asChild><Button type="button" variant="secondary">Batal</Button></DialogClose>
        <Button type="submit" disabled={isSaving}>{isSaving ? <Loader2 className="animate-spin" /> : 'Simpan'}</Button>
      </DialogFooter>
    </form>
  );
}

// --- MAIN PAGE COMPONENT ---

export default function AdminPelangganPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();
  const router = useRouter();
  const { toast } = useToast();

  const [searchNoService, setSearchNoService] = useState('');
  const [searchedPelanggan, setSearchedPelanggan] = useState<Pelanggan | null>(null);
  const [gangguanHistory, setGangguanHistory] = useState<LaporanGangguan[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { data: currentUserProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(
    useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore])
  );

  useEffect(() => {
    if (!isUserLoading && !isProfileLoading) {
      const isApproved = currentUserProfile?.registrationStatus === 'approved';
      const hasAccess = currentUserProfile?.role === 'admin' || currentUserProfile?.role === 'korlap' || currentUserProfile?.appAccess === 'allpro' || currentUserProfile?.appAccess === 'all';
      if (!user || !isApproved || !hasAccess) {
        router.push('/dashboard');
      }
    }
  }, [user, currentUserProfile, isUserLoading, isProfileLoading, router]);
  
  useEffect(() => {
      const fetchHistory = async () => {
          if (!searchedPelanggan) {
              setGangguanHistory([]);
              return;
          };
          setIsHistoryLoading(true);
          const q = query(collection(firestore, 'laporan-gangguan'), where('pelangganId', '==', searchedPelanggan.id), orderBy('tanggalLapor', 'desc'));
          const querySnapshot = await getDocs(q);
          const history = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LaporanGangguan));
          setGangguanHistory(history);
          setIsHistoryLoading(false);
      }
      fetchHistory();
  }, [firestore, searchedPelanggan]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchNoService.trim()) return;

    setIsSearching(true);
    setSearchPerformed(true);
    setSearchedPelanggan(null);

    const q = query(collection(firestore, 'pelanggan'), where('noService', '==', searchNoService.trim()), limit(1));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        setSearchedPelanggan(null);
    } else {
        const pelangganData = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as Pelanggan;
        setSearchedPelanggan(pelangganData);
    }
    setIsSearching(false);
  };
  
  const handleFormSubmit = async (data: Partial<Pelanggan>, file: File | null) => {
    if (!firestore || !user || !storage) return;
    setIsSaving(true);
    try {
        let fotoCpUrl: string | undefined = undefined;

        if (file) {
            const filePath = `pelanggan/${user.uid}/${Date.now()}-${file.name}`;
            const storageRef = ref(storage, filePath);
            await uploadBytes(storageRef, file);
            fotoCpUrl = await getDownloadURL(storageRef);
        }

        const dataToSave: Partial<Pelanggan> = { ...data, fotoCpUrl };
        dataToSave.userId = user.uid;
        dataToSave.userEmail = user.email!;
        
        const pelangganCollection = collection(firestore, 'pelanggan');
        const newDocRef = await addDocumentNonBlocking(pelangganCollection, dataToSave);
        toast({ title: 'Pelanggan Dibuat' });
        
        setIsFormDialogOpen(false);
        setSearchedPelanggan({ ...dataToSave, id: newDocRef.id } as Pelanggan);

    } catch(error: any) {
        toast({ variant: 'destructive', title: 'Gagal Menyimpan', description: error.message });
    } finally {
        setIsSaving(false);
    }
  }

  const isLoading = isUserLoading || isProfileLoading;

  if (isLoading) {
      return <div><Skeleton className="h-48 w-full" /></div>;
  }

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div><h1 className="text-3xl font-bold tracking-tight">Data Pelanggan & Riwayat Gangguan</h1><p className="text-muted-foreground mt-1">Cari pelanggan berdasarkan No. Service untuk melihat riwayat atau menambah data.</p></div>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Search /> Cari Pelanggan</CardTitle>
        </CardHeader>
        <CardContent>
            <form onSubmit={handleSearch} className="flex items-end gap-4">
                <div className="grid gap-2 flex-grow">
                    <Label htmlFor="no-service-search">Nomor Service</Label>
                    <Input id="no-service-search" placeholder="Masukkan No. Service..." value={searchNoService} onChange={(e) => setSearchNoService(e.target.value)} />
                </div>
                <Button type="submit" disabled={isSearching}>{isSearching ? <Loader2 className="animate-spin" /> : 'Cari'}</Button>
            </form>
        </CardContent>
      </Card>
      
      {isSearching && <div className="flex justify-center items-center p-8"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>}

      {!isSearching && searchPerformed && !searchedPelanggan && (
          <Card>
              <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground mb-4">Pelanggan dengan No. Service "{searchNoService}" tidak ditemukan.</p>
                  <Button onClick={() => setIsFormDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4"/>Tambah Pelanggan Baru</Button>
              </CardContent>
          </Card>
      )}

      {searchedPelanggan && (
          <div className="space-y-6">
              <Card>
                  <CardHeader><CardTitle>Detail Pelanggan</CardTitle></CardHeader>
                  <CardContent className="grid md:grid-cols-3 gap-4 text-sm">
                      <div><p className="text-muted-foreground">No. Service</p><p className="font-bold text-base">{searchedPelanggan.noService}</p></div>
                      <div><p className="text-muted-foreground">Nama</p><p className="font-semibold">{searchedPelanggan.namaPelanggan}</p></div>
                      <div><p className="text-muted-foreground">Service Area</p><p>{searchedPelanggan.serviceArea}</p></div>
                      <div className="md:col-span-2"><p className="text-muted-foreground">Alamat</p><p>{searchedPelanggan.alamat || '-'}</p></div>
                      <div><p className="text-muted-foreground">No. Telepon</p><p>{searchedPelanggan.nomorTelepon || '-'}</p></div>
                      <div><p className="text-muted-foreground">Koordinat</p><Link href={`https://www.google.com/maps/search/?api=1&query=${searchedPelanggan.koordinat}`} target="_blank" className="text-blue-600 hover:underline flex items-center gap-1">{searchedPelanggan.koordinat} <MapPin className="h-4 w-4" /></Link></div>
                  </CardContent>
              </Card>

              <Card>
                  <CardHeader>
                      <div className="flex justify-between items-center">
                         <CardTitle className="flex items-center gap-2"><History /> Riwayat Gangguan</CardTitle>
                         {/* TODO: Add button to report new disruption */}
                      </div>
                  </CardHeader>
                  <CardContent>
                      {isHistoryLoading ? <Skeleton className="h-24" /> : (
                          <Table>
                              <TableHeader><TableRow><TableHead>Tanggal Lapor</TableHead><TableHead>No. Tiket</TableHead><TableHead>Keterangan</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                              <TableBody>
                                  {gangguanHistory.length > 0 ? gangguanHistory.map(g => (
                                      <TableRow key={g.id}>
                                          <TableCell>{format(g.tanggalLapor.toDate(), 'dd MMM yyyy')}</TableCell>
                                          <TableCell>{g.noTiket || '-'}</TableCell>
                                          <TableCell className="max-w-xs truncate">{g.keterangan}</TableCell>
                                          <TableCell><Badge variant={g.status === 'open' ? 'destructive' : 'secondary'}>{g.status}</Badge></TableCell>
                                      </TableRow>
                                  )) : <TableRow><TableCell colSpan={4} className="text-center h-24">Belum ada riwayat gangguan.</TableCell></TableRow>}
                              </TableBody>
                          </Table>
                      )}
                  </CardContent>
              </Card>
          </div>
      )}

      {/* --- Dialogs --- */}
      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent className="sm:max-w-[500px]"><DialogHeader><DialogTitle>Tambah Pelanggan Baru</DialogTitle><DialogDescription>Isi detail pelanggan di bawah ini.</DialogDescription></DialogHeader>
            <PelangganForm pelanggan={null} onFormSubmit={handleFormSubmit} isSaving={isSaving} />
        </DialogContent>
      </Dialog>
    </>
  );
}
