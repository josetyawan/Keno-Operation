
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Loader2, PackageOpen, Truck } from 'lucide-react';
import type { ProvisioningRecord } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

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

  const handlePickup = async () => {
    if (!order || !user) return;
    setIsUpdating(true);
    try {
      await updateDoc(orderRef, {
        provisioningStatus: 'picked_up',
        pickupAt: serverTimestamp(),
      });
      toast({ title: 'Order Dipickup', description: 'Anda telah memulai pengerjaan order ini.' });
    } catch (error: any) {
      console.error("Failed to pickup order:", error);
      toast({ variant: 'destructive', title: 'Gagal', description: error.message });
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
            {/* More order details will be displayed here */}
             <p>SC Order: {order.scOrder}</p>
             <p>Kontak: {order.contactNumber}</p>
        </CardContent>
      </Card>
      
      {canPickup && (
          <Card>
            <CardHeader><CardTitle>Aksi Berikutnya</CardTitle></CardHeader>
            <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                    Klik tombol di bawah untuk menandai bahwa Anda telah mengambil order ini dan siap untuk berangkat.
                </p>
                <Button onClick={handlePickup} disabled={isUpdating} className="w-full">
                    {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackageOpen className="mr-2 h-4 w-4" />}
                    {isUpdating ? 'Memproses...' : 'Pickup Order'}
                </Button>
            </CardContent>
          </Card>
      )}

      {order.provisioningStatus === 'picked_up' && (
        <Card>
          <CardHeader><CardTitle>Aksi Berikutnya</CardTitle></CardHeader>
          <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                  Anda sudah mengambil order. Klik untuk menandai keberangkatan ke lokasi pelanggan.
              </p>
              <Button disabled={true} className="w-full">
                  <Truck className="mr-2 h-4 w-4" />
                  Berangkat ke Lokasi (Segera Hadir)
              </Button>
          </CardContent>
        </Card>
      )}
      
      {/* Other workflow steps will be added here */}

    </div>
  );
}
