
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
import { Bot, PlusCircle, MapPin, Loader2, Upload, Search, History, Phone, Pencil, Wrench, QrCode, FileSpreadsheet } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, useDoc, useStorage } from '@/firebase';
import { collection, query, doc, serverTimestamp, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { UserProfile, Pelanggan } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

const serviceAreas = ['SA KUDUS', 'SA PATI', 'SA JEPARA', 'SA PURWODADI', 'SA BLORA', 'SA REMBANG'];

// --- Helper & Sub-components ---

const formatWaNumber = (phone: string) => {
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
        cleanPhone = '62' + cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith('62')) {
        cleanPhone = '62' + cleanPhone;
    }
    return `https://wa.me/${cleanPhone}`;
};

function NewPelangganDialog({ isOpen, onOpenChange, onFinished }: { isOpen: boolean, onOpenChange: (open: boolean) => void, onFinished: (pelanggan: Pelanggan) => void }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const storage = useStorage();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    
    // Form state
    const [noService, setNoService] = useState('');
    const [namaPelanggan, setNamaPelanggan] = useState('');
    const [alamat, setAlamat] = useState('');
    const [nomorTelepon, setNomorTelepon] = useState('');
    const [koordinat, setKoordinat] = useState('');
    const [serviceArea, setServiceArea] = useState('');
    const [odpName, setOdpName] = useState('');
    const [odpPort, setOdpPort] = useState('');
    const [odpQRCodeUrl, setOdpQRCodeUrl] = useState('');
    const [fotoCp, setFotoCp] = useState<File | null>(null);
    const [fotoCpPreview, setFotoCpPreview] = useState<string | null>(null);
    const [isGettingLocation, setIsGettingLocation] = useState(false);

    const handleGetLocation = () => {
        setIsGettingLocation(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setKoordinat(`${position.coords.latitude}, ${position.coords.longitude}`);
                setIsGettingLocation(false);
            },
            () => {
                toast({ variant: 'destructive', title: 'Gagal Mendapatkan Lokasi' });
                setIsGettingLocation(false);
            }
        );
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setFotoCp(file);
            setFotoCpPreview(URL.createObjectURL(file));
        }
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !user.email || !noService || !namaPelanggan || !koordinat || !serviceArea) {
            toast({ variant: 'destructive', title: 'Data tidak lengkap' });
            return;
        }
        setIsSaving(true);
        try {
            let fotoCpUrl: string | undefined = undefined;
            if (fotoCp) {
                const filePath = `pelanggan/${user.uid}/${Date.now()}-${fotoCp.name}`;
                const storageRef = ref(storage, filePath);
                await uploadBytes(storageRef, fotoCp);
                fotoCpUrl = await getDownloadURL(storageRef);
            }

            const newPelangganData: Omit<Pelanggan, 'id'> = {
                userId: user.uid,
                userEmail: user.email,
                noService,
                namaPelanggan,
                alamat,
                nomorTelepon: nomorTelepon ? [nomorTelepon] : [],
                koordinat,
                serviceArea,
                odpName: odpName.trim(),
                odpPort: odpPort.trim(),
                odpQRCodeUrl: odpQRCodeUrl.trim(),
                fotoCpUrl,
                dateAdded: serverTimestamp(),
            };
            const docRef = await addDocumentNonBlocking(collection(firestore, 'pelanggan'), newPelangganData);
            toast({ title: 'Pelanggan berhasil dibuat' });
            onFinished({ ...newPelangganData, id: docRef.id } as Pelanggan);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Gagal menyimpan', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Tambah Pelanggan Baru</DialogTitle>
                    <DialogDescription>Isi detail pelanggan di bawah ini.</DialogDescription>
                </DialogHeader>
                 <form onSubmit={handleSubmit} className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                  <div className="grid gap-2">
                    <Label htmlFor="new-noService">No. Service *</Label>
                    <Input id="new-noService" value={noService} onChange={(e) => setNoService(e.target.value)} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="new-namaPelanggan">Nama Pelanggan *</Label>
                    <Input id="new-namaPelanggan" value={namaPelanggan} onChange={(e) => setNamaPelanggan(e.target.value)} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="new-alamat">Alamat</Label>
                    <Textarea id="new-alamat" value={alamat} onChange={(e) => setAlamat(e.target.value)} />
                  </div>
                   <div className="grid gap-2">
                    <Label htmlFor="new-nomorTelepon">No. Telepon</Label>
                    <Input id="new-nomorTelepon" value={nomorTelepon} onChange={(e) => setNomorTelepon(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="new-koordinat">Koordinat *</Label>
                    <div className="flex items-center gap-2">
                        <Input id="new-koordinat" value={koordinat} onChange={(e) => setKoordinat(e.target.value)} required />
                        <Button type="button" variant="outline" size="icon" onClick={handleGetLocation} disabled={isGettingLocation}>
                            {isGettingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                        </Button>
                    </div>
                  </div>
                   <div className="grid gap-2">
                    <Label htmlFor="new-serviceArea">Service Area *</Label>
                     <Select value={serviceArea} onValueChange={setServiceArea} required>
                        <SelectTrigger><SelectValue placeholder="Pilih Service Area" /></SelectTrigger>
                        <SelectContent>{serviceAreas.map(sa => <SelectItem key={sa} value={sa}>{sa}</SelectItem>)}</SelectContent>
                      </Select>
                  </div>
                   <div className="grid gap-2">
                    <Label htmlFor="new-odpName">Nama ODP</Label>
                    <Input id="new-odpName" value={odpName} onChange={(e) => setOdpName(e.target.value)} placeholder="Contoh: ODP-KDS-FA/001" />
                  </div>
                   <div className="grid gap-2">
                    <Label htmlFor="new-odpPort">Port ODP</Label>
                    <Input id="new-odpPort" value={odpPort} onChange={(e) => setOdpPort(e.target.value)} placeholder="Contoh: 5" />
                  </div>
                   <div className="grid gap-2">
                    <Label htmlFor="new-odpQRCodeUrl">URL QR Code ODP</Label>
                    <Input id="new-odpQRCodeUrl" value={odpQRCodeUrl} onChange={(e) => setOdpQRCodeUrl(e.target.value)} placeholder="https://..." />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="new-fotoCp">Foto Lokasi</Label>
                    <Input id="new-fotoCp" type="file" onChange={handleFileChange} accept="image/*" />
                    {fotoCpPreview && <div className="relative w-32 h-32 mt-2"><Image src={fotoCpPreview} alt="Preview Foto" fill className="rounded-md object-cover" /></div>}
                  </div>
                  <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="secondary">Batal</Button></DialogClose>
                    <Button type="submit" disabled={isSaving}>{isSaving ? <Loader2 className="animate-spin" /> : 'Simpan'}</Button>
                  </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function AddContactDialog({ pelanggan, isOpen, onOpenChange, onFinished }: { pelanggan: Pelanggan, isOpen: boolean, onOpenChange: (open: boolean) => void, onFinished: (data: Partial<Pelanggan>) => void }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [newPhone, setNewPhone] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPhone.trim()) {
            toast({ variant: 'destructive', title: 'Nomor telepon diperlukan' });
            return;
        }
        setIsSaving(true);
        try {
            const currentPhones = Array.isArray(pelanggan.nomorTelepon) ? pelanggan.nomorTelepon : (pelanggan.nomorTelepon ? [pelanggan.nomorTelepon] : []);
            const updatedPhones = [...currentPhones, newPhone.trim()];
            const updatedData = { nomorTelepon: updatedPhones };

            const docRef = doc(firestore, 'pelanggan', pelanggan.id);
            updateDocumentNonBlocking(docRef, updatedData);
            
            toast({ title: 'Kontak berhasil ditambahkan' });
            onFinished(updatedData);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Gagal menyimpan', description: error.message });
        } finally {
            setIsSaving(false);
            setNewPhone('');
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Tambah Nomor Kontak</DialogTitle>
                    <DialogDescription>Tambahkan nomor telepon baru untuk {pelanggan.namaPelanggan}.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="new-phone">Nomor Telepon Baru</Label>
                        <Input id="new-phone" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="0812..." required/>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="secondary">Batal</Button></DialogClose>
                        <Button type="submit" disabled={isSaving}>{isSaving ? 'Menyimpan...' : 'Tambah'}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function UpdateLocationDialog({ pelanggan, isOpen, onOpenChange, onFinished }: { pelanggan: Pelanggan, isOpen: boolean, onOpenChange: (open: boolean) => void, onFinished: (data: Partial<Pelanggan>) => void }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [alamat, setAlamat] = useState(pelanggan.alamat || '');
    const [koordinat, setKoordinat] = useState(pelanggan.koordinat || '');
    const [isSaving, setIsSaving] = useState(false);
    const [isGettingLocation, setIsGettingLocation] = useState(false);

     const handleGetLocation = () => {
        setIsGettingLocation(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setKoordinat(`${position.coords.latitude}, ${position.coords.longitude}`);
                setIsGettingLocation(false);
            },
            () => {
                toast({ variant: 'destructive', title: 'Gagal Mendapatkan Lokasi' });
                setIsGettingLocation(false);
            }
        );
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const updatedData = { alamat, koordinat };
            const docRef = doc(firestore, 'pelanggan', pelanggan.id);
            updateDocumentNonBlocking(docRef, updatedData);
            toast({ title: 'Lokasi berhasil diperbarui' });
            onFinished(updatedData);
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Gagal menyimpan', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    return (
         <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Ubah Lokasi Pelanggan</DialogTitle>
                </DialogHeader>
                 <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="update-alamat">Alamat Baru</Label>
                        <Textarea id="update-alamat" value={alamat} onChange={(e) => setAlamat(e.target.value)} />
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="update-koordinat">Koordinat Baru</Label>
                        <div className="flex items-center gap-2">
                            <Input id="update-koordinat" value={koordinat} onChange={(e) => setKoordinat(e.target.value)} required />
                            <Button type="button" variant="outline" size="icon" onClick={handleGetLocation} disabled={isGettingLocation}>
                                {isGettingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="secondary">Batal</Button></DialogClose>
                        <Button type="submit" disabled={isSaving}>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function UpdateAssetDialog({ pelanggan, isOpen, onOpenChange, onFinished }: { pelanggan: Pelanggan, isOpen: boolean, onOpenChange: (open: boolean) => void, onFinished: (data: Partial<Pelanggan>) => void }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [odpName, setOdpName] = useState(pelanggan.odpName || '');
    const [odpPort, setOdpPort] = useState(pelanggan.odpPort || '');
    const [odpQRCodeUrl, setOdpQRCodeUrl] = useState(pelanggan.odpQRCodeUrl || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const updatedData = { 
                odpName: odpName.trim(),
                odpPort: odpPort.trim(),
                odpQRCodeUrl: odpQRCodeUrl.trim(),
            };
            const docRef = doc(firestore, 'pelanggan', pelanggan.id);
            updateDocumentNonBlocking(docRef, updatedData);
            toast({ title: 'Info Aset berhasil diperbarui' });
            onFinished(updatedData);
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Gagal menyimpan', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    return (
         <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Ubah Info Aset (ODP)</DialogTitle>
                    <DialogDescription>Perbarui nama ODP, port, dan QR Code yang terhubung dengan pelanggan ini.</DialogDescription>
                </DialogHeader>
                 <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="update-odp-name">Nama ODP</Label>
                        <Input id="update-odp-name" value={odpName} onChange={(e) => setOdpName(e.target.value)} placeholder="Contoh: ODP-KDS-FA/001" />
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="update-odp-port">Port ODP</Label>
                        <Input id="update-odp-port" value={odpPort} onChange={(e) => setOdpPort(e.target.value)} placeholder="Contoh: 5" />
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="update-odp-qr">URL QR Code ODP</Label>
                        <Input id="update-odp-qr" value={odpQRCodeUrl} onChange={(e) => setOdpQRCodeUrl(e.target.value)} placeholder="https://..." />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="secondary">Batal</Button></DialogClose>
                        <Button type="submit" disabled={isSaving}>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}


// --- MAIN PAGE COMPONENT ---

export default function AdminPelangganPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [searchNoService, setSearchNoService] = useState('');
  const [searchedPelanggan, setSearchedPelanggan] = useState<Pelanggan | null>(null);
  const [sheetHistory, setSheetHistory] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [isSheetHistoryLoading, setIsSheetHistoryLoading] = useState(false);
  
  const [isNewPelangganDialogOpen, setIsNewPelangganDialogOpen] = useState(false);
  const [isAddContactDialogOpen, setIsAddContactDialogOpen] = useState(false);
  const [isUpdateLocationDialogOpen, setIsUpdateLocationDialogOpen] = useState(false);
  const [isUpdateAssetDialogOpen, setIsUpdateAssetDialogOpen] = useState(false);


  const { data: currentUserProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(
    useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore])
  );
  const isAdmin = currentUserProfile?.role === 'admin';

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
      if (!searchedPelanggan?.noService) {
        setSheetHistory([]);
        return;
      }

      const fetchSheetHistory = async () => {
        setIsSheetHistoryLoading(true);
        const serviceNumberToFind = searchedPelanggan.noService.trim();
        try {
            const response = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vS6GU4F_Iqvw7u1pkL06KQjDrrdGCu_DshWT0QWeozGpwpUIAc757COSNEnkhrRKH1RnPDqNeXDDNjU/export?format=csv&gid=0&t=' + new Date().getTime());
            if (!response.ok) throw new Error('Gagal mengambil data dari Google Sheet.');
            
            const data = await response.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheetName = workbook.SheetNames[0];
            const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

            const history = jsonData.filter((row: any) => 
                row['No Service']?.toString().trim() === serviceNumberToFind
            ).sort((a: any, b: any) => new Date(b.Timestamp).getTime() - new Date(a.Timestamp).getTime());

            setSheetHistory(history);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Gagal Memuat Riwayat', description: 'Tidak dapat mengambil riwayat laporan dari Google Sheet.' });
            setSheetHistory([]);
        } finally {
            setIsSheetHistoryLoading(false);
        }
    };

    fetchSheetHistory();
  }, [searchedPelanggan, toast]);

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

  const handleExportToExcel = async () => {
    if (!isAdmin || !firestore) {
      toast({ variant: 'destructive', title: 'Akses Ditolak' });
      return;
    }

    toast({ title: 'Mempersiapkan Ekspor...', description: 'Mengambil semua data pelanggan.' });

    try {
      const pelangganCollection = collection(firestore, 'pelanggan');
      const q = query(pelangganCollection, orderBy('dateAdded', 'desc'));
      const querySnapshot = await getDocs(q);
      const allPelanggan = querySnapshot.docs.map(doc => doc.data() as Pelanggan);
      
      if (allPelanggan.length === 0) {
        toast({ variant: 'destructive', title: 'Tidak Ada Data', description: 'Tidak ada data pelanggan untuk diekspor.' });
        return;
      }
      
      const dataToExport = allPelanggan.map(p => ({
        'No. Service': p.noService,
        'Nama Pelanggan': p.namaPelanggan,
        'Service Area': p.serviceArea,
        'Alamat': p.alamat || '',
        'Koordinat': p.koordinat,
        'Nomor Telepon': Array.isArray(p.nomorTelepon) ? p.nomorTelepon.join(', ') : p.nomorTelepon || '',
        'Nama ODP': p.odpName || '',
        'Port ODP': p.odpPort || '',
        'QR Code ODP': p.odpQRCodeUrl || '',
        'Ditambahkan Oleh': p.userEmail,
        'Tanggal Ditambahkan': p.dateAdded?.toDate ? format(p.dateAdded.toDate(), 'yyyy-MM-dd HH:mm') : '',
      }));
      
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Pelanggan');
      XLSX.writeFile(workbook, `Data_Pelanggan_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      
    } catch (error: any) {
      console.error('Export failed:', error);
      toast({ variant: 'destructive', title: 'Ekspor Gagal', description: 'Gagal mengambil data dari database.' });
    }
  };
  
  const isLoading = isUserLoading || isProfileLoading;

  if (isLoading) {
      return <div><Skeleton className="h-48 w-full" /></div>;
  }

  return (
    <>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div><h1 className="text-3xl font-bold tracking-tight">Data Pelanggan & Riwayat Gangguan</h1><p className="text-muted-foreground mt-1">Cari pelanggan berdasarkan No. Service untuk melihat riwayat atau menambah data.</p></div>
         {isAdmin && (
            <Button onClick={handleExportToExcel} variant="outline">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export Semua Data
            </Button>
        )}
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
                  <Button onClick={() => setIsNewPelangganDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4"/>Tambah Pelanggan Baru</Button>
              </CardContent>
          </Card>
      )}

      {searchedPelanggan && (
          <div className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-start justify-between">
                    <div>
                        <CardTitle>Detail Pelanggan</CardTitle>
                        <CardDescription>Data pelanggan yang tersimpan di sistem.</CardDescription>
                    </div>
                     <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setIsAddContactDialogOpen(true)}><Phone className="mr-2 h-4 w-4"/>Tambah Kontak</Button>
                        <Button variant="outline" size="sm" onClick={() => setIsUpdateLocationDialogOpen(true)}><Pencil className="mr-2 h-4 w-4"/>Ubah Lokasi</Button>
                        <Button variant="outline" size="sm" onClick={() => setIsUpdateAssetDialogOpen(true)}><Wrench className="mr-2 h-4 w-4"/>Ubah Info Aset</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-6 text-sm">
                        <div className="flex flex-col"><dt className="text-muted-foreground">No. Service</dt><dd className="font-bold text-base">{searchedPelanggan.noService}</dd></div>
                        <div className="flex flex-col"><dt className="text-muted-foreground">Nama</dt><dd className="font-semibold">{searchedPelanggan.namaPelanggan}</dd></div>
                        <div className="flex flex-col"><dt className="text-muted-foreground">Service Area</dt><dd>{searchedPelanggan.serviceArea}</dd></div>
                        <div className="flex flex-col md:col-span-2"><dt className="text-muted-foreground">Alamat</dt><dd>{searchedPelanggan.alamat || '-'}</dd></div>
                        <div className="flex flex-col"><dt className="text-muted-foreground">No. Telepon</dt>
                            <dd className="flex flex-col gap-1">
                                {(Array.isArray(searchedPelanggan.nomorTelepon) ? searchedPelanggan.nomorTelepon : [searchedPelanggan.nomorTelepon]).filter(Boolean).map((phone, i) => (
                                    <a key={i} href={formatWaNumber(phone as string)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">{phone}</a>
                                ))}
                            </dd>
                        </div>
                        <div className="flex flex-col"><dt className="text-muted-foreground">Koordinat</dt>
                            <dd>
                                <Link href={`https://www.google.com/maps/search/?api=1&query=${searchedPelanggan.koordinat}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                    {searchedPelanggan.koordinat} <MapPin className="h-4 w-4" />
                                </Link>
                            </dd>
                        </div>
                         <div className="flex flex-col"><dt className="text-muted-foreground">ODP Terhubung</dt><dd>{searchedPelanggan.odpName || '-'}</dd></div>
                         <div className="flex flex-col"><dt className="text-muted-foreground">Port ODP</dt><dd>{searchedPelanggan.odpPort || '-'}</dd></div>
                         <div className="flex flex-col"><dt className="text-muted-foreground">QR Code ODP</dt>
                            <dd>
                                {searchedPelanggan.odpQRCodeUrl ? (
                                    <Link href={searchedPelanggan.odpQRCodeUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                        <QrCode className="h-4 w-4" /> Lihat QR Code
                                    </Link>
                                ) : '-'}
                            </dd>
                         </div>
                    </dl>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                    <CardTitle>Lanjutkan Laporan di Bot</CardTitle>
                    <CardDescription>Gunakan bot Telegram untuk membuat laporan gangguan baru bagi pelanggan ini.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild className="w-full">
                        <Link href="https://t.me/B2BLapor_bot" target="_blank" rel="noopener noreferrer"><Bot className="mr-2 h-4 w-4" /> Buka @B2BLapor_bot</Link>
                    </Button>
                </CardContent>
              </Card>

              <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><History /> Riwayat Laporan (dari Bot)</CardTitle></CardHeader>
                  <CardContent>
                        {isSheetHistoryLoading ? (
                            <Skeleton className="h-24" />
                        ) : sheetHistory.length > 0 ? (
                            <div className="hidden md:block">
                                <Table>
                                    <TableHeader><TableRow><TableHead>Tanggal Lapor</TableHead><TableHead>No. Tiket DSC</TableHead><TableHead>Keluhan</TableHead></TableRow></TableHeader>
                                    <TableBody>{sheetHistory.map((g, i) => (<TableRow key={i}><TableCell className="whitespace-nowrap">{g['Timestamp'] || '-'}</TableCell><TableCell>{g['No Tiket DSC'] || '-'}</TableCell><TableCell>{g['Keluhan']}</TableCell></TableRow>))}</TableBody>
                                </Table>
                            </div>
                        ) : (
                            <div className="text-center h-24 flex items-center justify-center text-muted-foreground">Belum ada riwayat laporan dari bot untuk pelanggan ini.</div>
                        )}
                    </CardContent>
              </Card>
          </div>
      )}

      {/* --- Dialogs --- */}
      <NewPelangganDialog 
        isOpen={isNewPelangganDialogOpen}
        onOpenChange={setIsNewPelangganDialogOpen}
        onFinished={(newPelanggan) => {
            setSearchedPelanggan(newPelanggan);
            setIsNewPelangganDialogOpen(false);
        }}
      />
      {searchedPelanggan && (
          <>
            <AddContactDialog 
                pelanggan={searchedPelanggan}
                isOpen={isAddContactDialogOpen}
                onOpenChange={setIsAddContactDialogOpen}
                onFinished={(updatedData) => {
                    setSearchedPelanggan(prev => prev ? { ...prev, ...updatedData } : null);
                    setIsAddContactDialogOpen(false);
                }}
            />
            <UpdateLocationDialog
                 pelanggan={searchedPelanggan}
                 isOpen={isUpdateLocationDialogOpen}
                 onOpenChange={setIsUpdateLocationDialogOpen}
                 onFinished={(updatedData) => {
                    setSearchedPelanggan(prev => prev ? { ...prev, ...updatedData } : null);
                    setIsUpdateLocationDialogOpen(false);
                 }}
            />
            <UpdateAssetDialog
                 pelanggan={searchedPelanggan}
                 isOpen={isUpdateAssetDialogOpen}
                 onOpenChange={setIsUpdateAssetDialogOpen}
                 onFinished={(updatedData) => {
                    setSearchedPelanggan(prev => prev ? { ...prev, ...updatedData } : null);
                    setIsUpdateAssetDialogOpen(false);
                 }}
            />
          </>
      )}
    </>
  );
}
