
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Loader2, PackageOpen, Truck, MapPin, PackageCheck, Phone } from 'lucide-react';
import type { ProvisioningRecord } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import Link from 'next/link';

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
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

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
    try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject));
        const coordinates = `${position.coords.latitude}, ${position.coords.longitude}`;
        await handleUpdateStatus('arrived', { arriveCoordinates: coordinates });
    } catch (error: any) {
         toast({ variant: 'destructive', title: 'Gagal Mendapatkan Lokasi', description: error.message });
    }
  }


  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-48 w-full" /></div>;
  }

  if (!order) {
    return <div>Order tidak ditemukan.</div>;
  }
  
  const canPickup = order.provisioningStatus === 'assigned' && order.assignedTo_userId === user?.uid;
  const canDepart = order.provisioningStatus === 'picked_up' && order.assignedTo_userId === user?.uid;
  const canArrive = order.provisioningStatus === 'departed' && order.assignedTo_userId === user?.uid;
  const hasArrived = order.provisioningStatus === 'arrived';


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
                  Anda sedang dalam perjalanan. Klik jika Anda sudah tiba di lokasi pelanggan.
              </p>
              <Button onClick={handleArrive} disabled={isUpdating} className="w-full">
                   {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
                   {isUpdating ? 'Memproses...' : 'Tiba di Lokasi'}
              </Button>
          </CardContent>
        </Card>
      )}

      {hasArrived && (
         <Card>
            <CardHeader><CardTitle className="text-green-600 flex items-center gap-2"><PackageCheck/> Anda Telah Tiba</CardTitle></CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">
                    Silakan lanjutkan dengan pekerjaan di lokasi. Formulir untuk input progres dan kendala akan tersedia di sini segera.
                </p>
            </CardContent>
        </Card>
      )}

    </div>
  );
}
