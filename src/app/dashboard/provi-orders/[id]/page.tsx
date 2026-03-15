
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { useStorage } from '@/firebase/provider';
import { doc, updateDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Loader2, PackageOpen, Truck, MapPin, PackageCheck, Phone, AlertTriangle, Send, Camera, Upload } from 'lucide-react';
import type { ProvisioningRecord } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useState, useRef } from 'react';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import Link from 'next/link';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import Image from 'next/image';

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
  
  // State for Kendala Dialog
  const [kendalaReason, setKendalaReason] = useState('');
  const [kendalaFiles, setKendalaFiles] = useState<FileList | null>(null);

  // State for Progress Dialog
  const [odpPort, setOdpPort] = useState('');
  const [odpQr, setOdpQr] = useState('');
  const [housePhoto, setHousePhoto] = useState<File | null>(null);


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
  
  const handleKendalaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kendalaReason.trim() || !kendalaFiles || kendalaFiles.length < 2 || kendalaFiles.length > 10) {
        toast({ variant: 'destructive', title: 'Data Tidak Lengkap', description: 'Mohon isi alasan dan unggah 2-10 foto bukti.' });
        return;
    }
    setIsUpdating(true);
    try {
        const uploadPromises = Array.from(kendalaFiles).map(async file => {
            const filePath = `kendala/${user?.uid}/${Date.now()}-${file.name}`;
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
    if (!housePhoto) {
        toast({ variant: 'destructive', title: 'Data Tidak Lengkap', description: 'Mohon unggah foto rumah pelanggan.' });
        return;
    }
    setIsUpdating(true);
    try {
        const filePath = `provi_evidence/${user?.uid}/rumah_${Date.now()}-${housePhoto.name}`;
        const storageRef = ref(storage, filePath);
        await uploadBytes(storageRef, housePhoto);
        const photoUrl = await getDownloadURL(storageRef);

        await updateDoc(orderRef, {
            provisioningStatus: 'wip_odp_done',
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


  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-48 w-full" /></div>;
  }

  if (!order) {
    return <div>Order tidak ditemukan.</div>;
  }
  
  const canPickup = order.provisioningStatus === 'assigned' && order.assignedTo_userId === user?.uid;
  const canDepart = order.provisioningStatus === 'picked_up' && order.assignedTo_userId === user?.uid;
  const canArrive = order.provisioningStatus === 'departed' && order.assignedTo_userId === user?.uid;
  const hasArrived = order.provisioningStatus === 'arrived' && order.assignedTo_userId === user?.uid;


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
                    <TableRow><TableCell className="font-medium">Service No</TableCell><TableCell>{order.serviceNo}</TableCell></TableRow>
                    <TableRow><TableCell className="font-medium">Kontak Pelanggan</TableCell>
                        <TableCell>
                            <a href={formatWaNumber(order.contactNumber)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                <Phone className="h-4 w-4" /> {order.contactNumber}
                            </a>
                        </TableCell>
                    </TableRow>
                    <TableRow><TableCell className="font-medium">Produk</TableCell><TableCell>{order.productName} ({order.productType})</TableCell></TableRow>
                    <TableRow><TableCell className="font-medium">CRM Order Type</TableCell><TableCell>{order.crmOrder}</TableCell></TableRow>
                    <TableRow><TableCell className="font-medium">Deskripsi</TableCell><TableCell>{order.description || '-'}</TableCell></TableRow>
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

      {hasArrived && (
         <Card>
            <CardHeader><CardTitle className="text-green-600 flex items-center gap-2"><PackageCheck/> Anda Telah Tiba</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
                <Button onClick={() => setIsProgressDialogOpen(true)} className="w-full" size="lg">Lanjutkan Progres</Button>
                <Button onClick={() => setIsKendalaDialogOpen(true)} variant="destructive" className="w-full" size="lg">Laporkan Kendala</Button>
            </CardContent>
        </Card>
      )}

      <Dialog open={isKendalaDialogOpen} onOpenChange={setIsKendalaDialogOpen}>
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
      
      <Dialog open={isProgressDialogOpen} onOpenChange={setIsProgressDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Input Progres Awal</DialogTitle>
                <DialogDescription>Lengkapi data ODP dan foto rumah pelanggan.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleProgressSubmit} className="space-y-4">
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
                    <Label htmlFor="house-photo">Foto Rumah Pelanggan</Label>
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

    </div>
  );
}
