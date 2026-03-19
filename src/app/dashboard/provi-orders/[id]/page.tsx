
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { useStorage } from '@/firebase/provider';
import { doc, updateDoc, serverTimestamp, addDoc, collection, setDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Loader2, PackageOpen, Truck, MapPin, PackageCheck, Phone, AlertTriangle, Send, Camera, Upload, Wrench, Check, Circle, Calendar as CalendarIcon, FileUp, Save, RefreshCw } from 'lucide-react';
import type { ProvisioningRecord, ProvisioningMaterial, Pelanggan, RiwayatGangguan, UserProfile, MaterialEvidence } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useState, useRef, useEffect, useMemo } from 'react';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import Link from 'next/link';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';


const formatWaNumber = (phone: string) => {
    if (!phone) return '#';
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
        cleanPhone = '62' + cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith('62')) {
        cleanPhone = '62' + cleanPhone;
    }
    return `https://wa.me/${cleanPhone}`;
};

const materialList: { name: string; type: 'meter' | 'check' | 'pcs' }[] = [
    { name: "dropcore", type: 'meter' },
    { name: "precon 50m", type: 'check' },
    { name: "precon 100m", type: 'check' },
    { name: "precon 150m", type: 'check' },
    { name: "Precon 200m", type: 'check' },
    { name: "Precon 250m", type: 'check' },
    { name: "prekso", type: 'check' },
    { name: "OTP", type: 'pcs' },
    { name: "SOC", type: 'pcs' },
    { name: "S-Klem", type: 'pcs' },
    { name: "Bracket", type: 'pcs' },
    { name: "Kabel UTP", type: 'meter' },
    { name: "RJ45", type: 'pcs' },
];

const jenisOrderOptions = [
  "PSB Indihome", "PSB Indibiz", "PDA Indihome", "PDA Indibiz",
  "PSB DATIN", "PSB OLO", "PSB WIFI", "PDA DATIN", "PDA WIFI",
  "REPLACEMENT", "Instalasi IP Camera", "Instalasi SD-WAN",
  "Instalasi Router", "Install AP WIFI (1 AP)", "Install AP WIFI (2 AP)",
  "Install AP WIFI(3 AP)", "Install AP WIFI (4 AP)",
  "Pembuatan BAI (Satkomindo,BRI MPLS)", "Provisioning MyRep", "PSB Surge",
  "Provisioning 5 Menara Bintang", "PSB IBU - FTTR",
  "PT Anagata Cipta Teknologi (KerjainAja)", "PSB TBG", "Provisioning Hypernet",
  "2ND STB", "UPSELLING", "DISMANTLING EBIS"
].sort();

const typeOrderOptions: Record<string, string[]> = {
    'DISMANTLING EBIS': ['ONT', 'STB', 'AP', 'IP CAMERA'],
    'REPLACEMENT': ['ONT', 'STB'],
};

function InitialDataForm({ order, onSave }: { order: ProvisioningRecord, onSave: (data: Partial<ProvisioningRecord>) => void }) {
    const [serviceNo, setServiceNo] = useState(order.serviceNo || '');
    const [productName, setProductName] = useState(order.productName || '');
    const [crmOrder, setCrmOrder] = useState(order.crmOrder || '');
    const [description, setDescription] = useState(order.description || ''); // This will be our "Order Type"
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const showOrderType = useMemo(() => Object.keys(typeOrderOptions).includes(crmOrder), [crmOrder]);

    // If crmOrder changes and it no longer has an order type, clear the description
    useEffect(() => {
        if (!showOrderType) setDescription('');
    }, [crmOrder, showOrderType]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Now, productName and crmOrder are also required.
        if (!serviceNo.trim() || !productName.trim() || !crmOrder) {
            toast({ variant: 'destructive', title: 'Data Tidak Lengkap', description: 'No. Internet, Paket, dan Jenis Order wajib diisi.' });
            return;
        }
        setIsSaving(true);
        const updateData: Partial<ProvisioningRecord> = {
            serviceNo,
            productName,
            crmOrder,
            description: showOrderType ? description : '',
        };
        try {
            await onSave(updateData);
        } catch (error) {
            // Error is handled by the parent, but we should stop the saving indicator here.
        } finally {
             setIsSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Lengkapi Data Order</CardTitle>
                <CardDescription>Data berikut diperlukan untuk melanjutkan progres. Mohon lengkapi data yang masih kosong.</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="serviceNo">No. Internet / Service *</Label>
                        <Input id="serviceNo" value={serviceNo} onChange={e => setServiceNo(e.target.value)} required disabled={!!order.serviceNo} />
                         {!!order.serviceNo && <p className="text-xs text-muted-foreground">No. Service tidak dapat diubah.</p>}
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="productName">Paket Internet *</Label>
                        <Input id="productName" value={productName} onChange={e => setProductName(e.target.value)} required placeholder="Contoh: Indihome 50Mbps"/>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="crmOrder">Jenis Order *</Label>
                            <Select value={crmOrder} onValueChange={setCrmOrder} required>
                                <SelectTrigger id="crmOrder"><SelectValue placeholder="Pilih Jenis Order..." /></SelectTrigger>
                                <SelectContent><ScrollArea className="h-72">{jenisOrderOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</ScrollArea></SelectContent>
                            </Select>
                        </div>
                        {showOrderType && (
                            <div className="grid gap-2">
                                <Label htmlFor="description">Order Type *</Label>
                                <Select value={description} onValueChange={setDescription} required>
                                    <SelectTrigger id="description"><SelectValue placeholder="Pilih Tipe Order..." /></SelectTrigger>
                                    <SelectContent>{typeOrderOptions[crmOrder].map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 animate-spin" /> : <Save className="mr-2" />}
                        Simpan & Lanjutkan
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}

export default function OrderDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [isProgressDialogOpen, setIsProgressDialogOpen] = useState(false);
  const [isKendalaDialogOpen, setIsKendalaDialogOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [kendalaReason, setKendalaReason] = useState('');
  const [kendalaFiles, setKendalaFiles] = useState<FileList | null>(null);

  const [odpName, setOdpName] = useState('');
  const [odpPort, setOdpPort] = useState('');
  const [odpQr, setOdpQr] = useState('');
  const [housePhoto, setHousePhoto] = useState<File | null>(null);
  
  const [isCompleting, setIsCompleting] = useState(false);
  const [baPhoto, setBaPhoto] = useState<File | null>(null);
  const [valinsId, setValinsId] = useState('');
  const [usedMaterials, setUsedMaterials] = useState<Record<string, { used: boolean, quantity: number }>>({});
  const [psDate, setPsDate] = useState<Date | undefined>();

    useEffect(() => {
        setPsDate(new Date());
    }, []);

  const userDocRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  const orderRef = useMemoFirebase(() => doc(firestore, 'provisioning-records', id), [firestore, id]);
  const { data: order, isLoading } = useDoc<ProvisioningRecord>(orderRef);

  const handleUpdateStatus = async (status: 'picked_up' | 'departed' | 'arrived', extraData: Record<string, any> = {}) => {
    if (!order || !user) return;
    setIsUpdating(true);

    let timestampField: string;
    let toastTitle: string;
    switch (status) {
        case 'picked_up':
            timestampField = 'pickupAt';
            toastTitle = 'Order Dipickup';
            break;
        case 'departed':
            timestampField = 'departAt';
            toastTitle = 'Anda Telah Berangkat';
            break;
        case 'arrived':
            timestampField = 'arriveAt';
            toastTitle = 'Anda Telah Tiba';
            break;
        default:
            setIsUpdating(false);
            return;
    }

    try {
      await updateDoc(orderRef, {
        provisioningStatus: status,
        [timestampField]: serverTimestamp(),
        ...extraData,
      });
      toast({ title: 'Status Diperbarui', description: toastTitle });
    } catch (error: any) {
      console.error(`Failed to update status to ${status}:`, error);
      toast({ variant: 'destructive', title: 'Gagal', description: error.message });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleArrive = async () => {
    setIsUpdating(true);
    try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0}));
        const coordinates = `${position.coords.latitude}, ${position.coords.longitude}`;
        await handleUpdateStatus('arrived', { arriveCoordinates: coordinates });
    } catch (error: any) {
         toast({ variant: 'destructive', title: 'Gagal Mendapatkan Lokasi', description: error.message });
    } finally {
        setIsUpdating(false);
    }
  }
  
    const handleInitialDataSave = async (updateData: Partial<ProvisioningRecord>) => {
        if (!order) return;
        
        try {
            await updateDoc(orderRef, updateData);
            toast({ title: 'Data Order Disimpan', description: 'Anda sekarang dapat melanjutkan progres.' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Gagal Menyimpan Data Awal', description: error.message });
            throw error; // Re-throw to prevent form from closing
        }
    };

    const handleKendalaSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            toast({ variant: 'destructive', title: 'Error Autentikasi', description: 'Sesi pengguna tidak ditemukan. Silakan login ulang.' });
            return;
        }
        if (!kendalaReason.trim() || !kendalaFiles || kendalaFiles.length < 2 || kendalaFiles.length > 10) {
            toast({ variant: 'destructive', title: 'Data Tidak Lengkap', description: 'Mohon isi alasan dan unggah 2-10 foto bukti.' });
            return;
        }
        setIsUpdating(true);
        try {
            const uploadPromises = Array.from(kendalaFiles).map(async file => {
                const filePath = `notas/${user.uid}/kendala_${Date.now()}-${file.name}`;
                const storageRef = ref(storage, filePath);
                await uploadBytes(storageRef, file);
                return getDownloadURL(storageRef);
            });
    
            const photoUrls = await Promise.all(uploadPromises);
    
            await updateDoc(orderRef, {
                provisioningStatus: 'kendala',
                kendalaNotes: kendalaReason,
                kendalaPhotos: photoUrls,
                kendalaAt: serverTimestamp(),
            });
            toast({ title: 'Kendala Dilaporkan', description: 'Laporan kendala Anda telah disimpan.' });
            setIsKendalaDialogOpen(false);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Gagal Melaporkan Kendala', description: error.message });
        } finally {
            setIsUpdating(false);
        }
    };
  
    const handleProgressSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            toast({ variant: 'destructive', title: 'Error Autentikasi', description: 'Sesi pengguna tidak ditemukan. Silakan login ulang.' });
            return;
        }
        if (!housePhoto) {
            toast({ variant: 'destructive', title: 'Data Tidak Lengkap', description: 'Mohon unggah foto rumah pelanggan.' });
            return;
        }
        setIsUpdating(true);
        try {
            const filePath = `notas/${user.uid}/rumah_${Date.now()}-${housePhoto.name}`;
            const storageRef = ref(storage, filePath);
            await uploadBytes(storageRef, housePhoto);
            const photoUrl = await getDownloadURL(storageRef);
    
            await updateDoc(orderRef, {
                provisioningStatus: 'wip_odp_done',
                odpName: odpName,
                odpPort,
                odpQRCodeUrl: odpQr,
                customerHousePhoto: photoUrl
            });
            toast({ title: 'Progres Disimpan', description: 'Data ODP dan foto rumah pelanggan berhasil disimpan.' });
            setIsProgressDialogOpen(false);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Gagal Menyimpan Progres', description: error.message });
        } finally {
            setIsUpdating(false);
        }
    };
    
    // --- Combined logic for creating related documents ---
    const syncRelatedData = async (orderToSync: ProvisioningRecord) => {
        if (!user || !user.email || !userProfile) throw new Error("Sesi pengguna tidak valid.");

        // Step 1: Create/Update Pelanggan Document
        const pelangganDocRef = doc(firestore, 'pelanggan', orderToSync.serviceNo);
        const pelangganData: Partial<Pelanggan> = {
            noService: orderToSync.serviceNo,
            namaPelanggan: orderToSync.customerName,
            alamat: orderToSync.address || '',
            nomorTelepon: orderToSync.contactNumber ? [orderToSync.contactNumber] : [],
            serviceArea: orderToSync.workzone,
            sto: orderToSync.odpName?.split('-')[1] || '',
            koordinat: orderToSync.arriveCoordinates || '',
            odpName: orderToSync.odpName || '',
            odpPort: orderToSync.odpPort || '',
            odpQRCodeUrl: orderToSync.odpQRCodeUrl || '',
            fotoCpUrl: orderToSync.customerHousePhoto || '',
            userId: user.uid,
            userEmail: user.email!,
            lastEditedBy: user.email!,
            lastEditedDate: serverTimestamp(),
        };
        await setDoc(pelangganDocRef, pelangganData, { merge: true });

        // Step 2: Transform materials and create Riwayat Gangguan Document
        const materialsForRiwayat: MaterialEvidence[] = (orderToSync.materials || []).map(mat => ({
            materialName: mat.name,
            quantity: mat.quantity,
        }));

        const riwayatData: Omit<RiwayatGangguan, 'id'> = {
            pelangganId: orderToSync.serviceNo,
            userId: user.uid,
            noService: orderToSync.serviceNo,
            namaPetugas: orderToSync.assignedTo_userName || userProfile.displayName || user.email!,
            nik: userProfile.nik || '',
            jenisOrder: orderToSync.crmOrder,
            typeOrder: orderToSync.description || '',
            keterangan: `Penyelesaian WO Provisioning: ${orderToSync.workorder}`,
            tanggalLapor: orderToSync.assignedAt || Timestamp.now(),
            tanggalOpen: orderToSync.assignedAt || Timestamp.now(),
            tanggalClose: orderToSync.completedAt || Timestamp.now(),
            layanan: [orderToSync.productName],
            materials: materialsForRiwayat,
            sto: orderToSync.workzone,
            noTiket: orderToSync.workorder,
            dorongClose: false,
        };
        await addDoc(collection(firestore, 'riwayat-gangguan'), riwayatData);
    };

    const handleCompleteOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !order || !psDate || !userProfile) {
            toast({ variant: 'destructive', title: 'Error', description: 'Sesi pengguna atau data order tidak valid.' });
            return;
        }
        if (!baPhoto) {
            toast({ variant: 'destructive', title: 'Foto BA Wajib', description: 'Harap unggah foto Berita Acara.' });
            return;
        }
        if (!order.serviceNo) {
            toast({ variant: 'destructive', title: 'Data Tidak Lengkap', description: 'Nomor Service/Internet belum diisi. Lengkapi data order terlebih dahulu.' });
            return;
        }
        setIsCompleting(true);
        try {
            // Upload BA photo
            const baPhotoPath = `notas/${user.uid}/ba_${Date.now()}-${baPhoto.name}`;
            const baStorageRef = ref(storage, baPhotoPath);
            await uploadBytes(baStorageRef, baPhoto);
            const baPhotoUrl = await getDownloadURL(baStorageRef);
    
            // Prepare material data
            const materialsToSave: ProvisioningMaterial[] = Object.entries(usedMaterials)
                .filter(([, { used }]) => used)
                .map(([name, { quantity }]) => ({ name, quantity }));
            
            const completedTimestamp = Timestamp.fromDate(psDate);

            // Update main order document
            await updateDoc(orderRef, {
                provisioningStatus: 'completed',
                baPhotoUrl,
                valinsId,
                materials: materialsToSave,
                completedAt: completedTimestamp,
                isSynced: true, // Mark as synced from the start
            });

            // Sync to pelanggan and riwayat
            const updatedOrderData = { ...order, completedAt: completedTimestamp, materials: materialsToSave };
            await syncRelatedData(updatedOrderData as ProvisioningRecord);
    
            toast({ title: 'Order Selesai!', description: 'Pekerjaan provisioning telah berhasil diselesaikan dan dicatat dalam histori.' });
            router.push('/dashboard/provi-orders');
    
        } catch (error: any) {
            console.error("Failed to complete order:", error);
            toast({ variant: 'destructive', title: 'Gagal Menyelesaikan Order', description: error.message });
        } finally {
            setIsCompleting(false);
        }
    };
    
    const handleManualSync = async () => {
      if (!order) return;
      setIsSyncing(true);
      try {
        await syncRelatedData(order);
        await updateDoc(orderRef, { isSynced: true });
        toast({ title: 'Sinkronisasi Berhasil', description: 'Data telah berhasil disinkronkan ke Data Pelanggan dan Riwayat Gangguan.' });
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Gagal Sinkronisasi', description: error.message });
      } finally {
        setIsSyncing(false);
      }
    };
  
  const handleMaterialChange = (name: string, used: boolean, quantity?: number) => {
      setUsedMaterials(prev => ({
          ...prev,
          [name]: { used, quantity: used ? (quantity ?? (prev[name]?.quantity || 1)) : 0 }
      }));
  };

  if (isLoading || isProfileLoading) {
    return <div className="space-y-4"><Skeleton className="h-48 w-full" /></div>;
  }

  if (!order) {
    return <div>Order tidak ditemukan.</div>;
  }
  
  const canPickup = order.provisioningStatus === 'assigned' && order.assignedTo_userId === user?.uid;
  const canDepart = order.provisioningStatus === 'picked_up' && order.assignedTo_userId === user?.uid;
  const canArrive = order.provisioningStatus === 'departed' && order.assignedTo_userId === user?.uid;
  const hasArrived = order.provisioningStatus === 'arrived' && order.assignedTo_userId === user?.uid;
  
  const showInitialForm = hasArrived && (!order.serviceNo || !order.productName || !order.crmOrder);
  const showActionButtons = hasArrived && !!order.serviceNo && !!order.productName && !!order.crmOrder;
  const isWipOdpDone = order.provisioningStatus === 'wip_odp_done' && order.assignedTo_userId === user?.uid;


  return (
    <div className="mx-auto grid w-full flex-1 auto-rows-max gap-6">
      <div className="flex items-center gap-4">
        <Button onClick={() => router.back()} variant="outline" size="icon" className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Kembali</span>
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Detail Order: {order.workorder}</h1>
          <p className="text-muted-foreground text-sm">Status: {order.provisioningStatus || 'N/A'}</p>
        </div>
      </div>
      
      <Card>
        <CardHeader><CardTitle>{order.customerName}</CardTitle><CardDescription>{order.address}</CardDescription></CardHeader>
        <CardContent>
             <Table>
                <TableBody>
                    <TableRow><TableCell className="font-medium">Workorder</TableCell><TableCell>{order.workorder}</TableCell></TableRow>
                    <TableRow><TableCell className="font-medium">SC Order</TableCell><TableCell>{order.scOrder}</TableCell></TableRow>
                    <TableRow><TableCell className="font-medium">Service No</TableCell><TableCell>{order.serviceNo || 'Belum diinput'}</TableCell></TableRow>
                    <TableRow><TableCell className="font-medium">Kontak Pelanggan</TableCell>
                        <TableCell>
                            <a href={formatWaNumber(order.contactNumber)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                <Phone className="h-4 w-4" /> {order.contactNumber}
                            </a>
                        </TableCell>
                    </TableRow>
                    <TableRow><TableCell className="font-medium">Paket</TableCell><TableCell>{order.productName || 'Belum diinput'}</TableCell></TableRow>
                    <TableRow><TableCell className="font-medium">Jenis Order</TableCell><TableCell>{order.crmOrder || 'Belum diinput'}</TableCell></TableRow>
                    <TableRow><TableCell className="font-medium">Order Type</TableCell><TableCell>{order.description || '-'}</TableCell></TableRow>
                    <TableRow><TableCell className="font-medium">Tanggal Booking</TableCell><TableCell>{order.bookingDate}</TableCell></TableRow>
                    <TableRow><TableCell className="font-medium">Workzone</TableCell><TableCell>{order.workzone}</TableCell></TableRow>
                </TableBody>
             </Table>
        </CardContent>
      </Card>
      
      {canPickup && (
          <Card>
            <CardHeader><CardTitle>Aksi Berikutnya</CardTitle></CardHeader>
            <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                    Klik tombol di bawah untuk menandai bahwa Anda telah mengambil order ini dan siap untuk berangkat.
                </p>
                <Button onClick={() => handleUpdateStatus('picked_up')} disabled={isUpdating} className="w-full">
                    {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackageOpen className="mr-2 h-4 w-4" />}
                    {isUpdating ? 'Memproses...' : 'Pickup Order'}
                </Button>
            </CardContent>
          </Card>
      )}

      {canDepart && (
        <Card>
          <CardHeader><CardTitle>Aksi Berikutnya</CardTitle></CardHeader>
          <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                  Anda sudah mengambil order. Klik untuk menandai keberangkatan ke lokasi pelanggan.
              </p>
              <Button onClick={() => handleUpdateStatus('departed')} disabled={isUpdating} className="w-full">
                   {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Truck className="mr-2 h-4 w-4" />}
                   {isUpdating ? 'Memproses...' : 'Berangkat ke Lokasi'}
              </Button>
          </CardContent>
        </Card>
      )}
      
       {canArrive && (
        <Card>
          <CardHeader><CardTitle>Aksi Berikutnya</CardTitle></CardHeader>
          <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                  Anda sedang dalam perjalanan. Klik jika Anda sudah tiba di lokasi pelanggan. Aksi ini akan mencatat koordinat Anda.
              </p>
              <Button onClick={handleArrive} disabled={isUpdating} className="w-full">
                   {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
                   {isUpdating ? 'Mencatat Lokasi...' : 'Tiba di Lokasi'}
              </Button>
          </CardContent>
        </Card>
      )}

      {showInitialForm && (
        <InitialDataForm order={order} onSave={handleInitialDataSave} />
      )}

      {showActionButtons && (
         <Card>
            <CardHeader><CardTitle className="text-green-600 flex items-center gap-2"><PackageCheck/> Anda Telah Tiba</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
                <Dialog open={isProgressDialogOpen} onOpenChange={setIsProgressDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="w-full" size="lg">Lanjutkan Progres</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Input Progres Awal</DialogTitle>
                            <DialogDescription>Lengkapi data ODP dan foto rumah pelanggan.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleProgressSubmit} className="space-y-4">
                             <div className="grid gap-2">
                                <Label htmlFor="odp-name">Nama ODP</Label>
                                <Input id="odp-name" value={odpName} onChange={e => setOdpName(e.target.value)} placeholder="Contoh: ODP-KDS-FA/001"/>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="odp-port">Port ODP</Label>
                                    <Input id="odp-port" value={odpPort} onChange={e => setOdpPort(e.target.value)} placeholder="Contoh: 5"/>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="odp-qr">URL QR Code ODP</Label>
                                    <Input id="odp-qr" value={odpQr} onChange={e => setOdpQr(e.target.value)} placeholder="https://..."/>
                                </div>
                             </div>
                             <div className="grid gap-2">
                                <Label htmlFor="house-photo">Foto Rumah Pelanggan *</Label>
                                <Input id="house-photo" type="file" accept="image/*" onChange={e => setHousePhoto(e.target.files?.[0] || null)} required/>
                                {housePhoto && <p className="text-xs text-muted-foreground">{housePhoto.name}</p>}
                             </div>
                            <DialogFooter>
                                <DialogClose asChild><Button type="button" variant="ghost">Batal</Button></DialogClose>
                                <Button type="submit" disabled={isUpdating}>{isUpdating ? <Loader2 className="animate-spin" /> : 'Simpan Progres'}</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
                
                <Dialog open={isKendalaDialogOpen} onOpenChange={setIsKendalaDialogOpen}>
                    <DialogTrigger asChild>
                         <Button variant="destructive" className="w-full" size="lg">Laporkan Kendala</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Laporkan Kendala</DialogTitle>
                            <DialogDescription>Jelaskan kendala yang terjadi dan lampirkan foto bukti.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleKendalaSubmit} className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="kendala-reason">Alasan Kendala</Label>
                                <Textarea id="kendala-reason" value={kendalaReason} onChange={e => setKendalaReason(e.target.value)} placeholder="Contoh: Pelanggan tidak ada di rumah, alamat tidak ditemukan, dll." required/>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="kendala-evidence">Foto Bukti (min 2, maks 10)</Label>
                                <Input id="kendala-evidence" type="file" multiple accept="image/*" onChange={e => setKendalaFiles(e.target.files)} required/>
                            </div>
                            <DialogFooter>
                                <DialogClose asChild><Button type="button" variant="ghost">Batal</Button></DialogClose>
                                <Button type="submit" disabled={isUpdating}>{isUpdating ? <Loader2 className="animate-spin" /> : 'Kirim Laporan'}</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
      )}

      {isWipOdpDone && (
        <form onSubmit={handleCompleteOrder}>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Wrench/> Aktivasi & Penyelesaian</CardTitle>
                    <CardDescription>Lengkapi data aktivasi, material, dan selesaikan order.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="grid gap-2">
                            <Label htmlFor="ba-photo">Foto Berita Acara (BA) *</Label>
                            <Input id="ba-photo" type="file" accept="image/*" onChange={e => setBaPhoto(e.target.files?.[0] || null)} required/>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="valins-id">ID Valins</Label>
                            <Input id="valins-id" value={valinsId} onChange={e => setValinsId(e.target.value)} placeholder="Masukkan ID Valins..."/>
                        </div>
                    </div>
                    <div className="grid gap-3">
                        <Label>Material yang Digunakan (Opsional)</Label>
                        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3">
                            {materialList.map(material => (
                                <div key={material.name} className="flex items-center gap-3">
                                    <Checkbox 
                                        id={`mat-${material.name}`} 
                                        checked={usedMaterials[material.name]?.used || false}
                                        onCheckedChange={(checked) => handleMaterialChange(material.name, !!checked)}
                                    />
                                    <div className="grid gap-1.5 leading-none">
                                        <Label htmlFor={`mat-${material.name}`} className="font-normal capitalize">{material.name}</Label>
                                        {(material.type === 'meter' || material.type === 'pcs') && usedMaterials[material.name]?.used && (
                                            <Input
                                                type="number"
                                                placeholder={material.type}
                                                className="h-8 w-24"
                                                value={usedMaterials[material.name]?.quantity || ''}
                                                onChange={(e) => handleMaterialChange(material.name, true, Number(e.target.value))}
                                            />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                     <div className="grid gap-2 max-w-sm">
                        <Label>Tanggal PS (Penyelesaian) *</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="justify-start text-left font-normal">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {psDate ? format(psDate, 'PPP') : <span>Pilih tanggal</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={psDate} onSelect={setPsDate} initialFocus/>
                            </PopoverContent>
                        </Popover>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit" className="w-full md:w-auto" disabled={isCompleting}>
                        {isCompleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Check className="mr-2 h-4 w-4" />}
                        {isCompleting ? 'Menyelesaikan...' : 'Selesaikan Order (PS)'}
                    </Button>
                </CardFooter>
            </Card>
        </form>
      )}

      {order.provisioningStatus === 'completed' && (
        <Card>
            <CardHeader>
                <CardTitle className="text-green-600 flex items-center gap-2"><Check /> Order Selesai</CardTitle>
                <CardDescription>
                    Pekerjaan ini telah diselesaikan pada {order.completedAt ? format(order.completedAt.toDate(), 'dd MMMM yyyy, HH:mm') : '-'}.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <h4 className="font-semibold">Ringkasan Penyelesaian</h4>
                <Table>
                    <TableBody>
                        {order.valinsId && <TableRow><TableCell className="font-medium">ID Valins</TableCell><TableCell>{order.valinsId}</TableCell></TableRow>}
                        {order.baPhotoUrl && <TableRow><TableCell className="font-medium">Foto BA</TableCell><TableCell><a href={order.baPhotoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Lihat Foto</a></TableCell></TableRow>}
                        {order.materials && order.materials.length > 0 && (
                            <TableRow>
                                <TableCell className="font-medium align-top">Material</TableCell>
                                <TableCell>
                                    <ul className="list-disc pl-5">
                                        {order.materials.map(mat => (
                                            <li key={mat.name}>{mat.name} {mat.quantity > 1 ? `(${mat.quantity})` : ''}</li>
                                        ))}
                                    </ul>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                {userProfile?.role === 'admin' && !order.isSynced && (
                    <div className="mt-6 border-t pt-4">
                        <h4 className="font-semibold text-amber-600">Aksi Admin</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                            Data ini tampaknya belum tersinkronisasi ke Data Pelanggan & Riwayat. Klik untuk melakukan sinkronisasi manual.
                        </p>
                        <Button onClick={handleManualSync} disabled={isSyncing}>
                            {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <RefreshCw className="mr-2 h-4 w-4" />}
                            Sinkronkan Data
                        </Button>
                    </div>
                )}
                 {order.isSynced && (
                    <div className="mt-6 text-sm text-green-600 flex items-center gap-2">
                        <Check /> Data telah tersinkronisasi dengan histori pelanggan.
                    </div>
                )}
            </CardContent>
        </Card>
      )}

    </div>
  );
}
