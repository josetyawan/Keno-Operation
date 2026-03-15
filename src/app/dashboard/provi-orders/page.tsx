
'use client';

import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import type { ProvisioningRecord } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Truck } from 'lucide-react';
import Link from 'next/link';

export default function TechnicianOrdersPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const ordersQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(firestore, 'provisioning-records'),
      where('assignedTo_userId', '==', user.uid),
      orderBy('assignedAt', 'desc')
    );
  }, [firestore, user]);

  const { data: orders, isLoading: areOrdersLoading } = useCollection<ProvisioningRecord>(ordersQuery);

  const isLoading = isUserLoading || areOrdersLoading;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Order Provisioning Anda</h1>
      <p className="text-muted-foreground">
        Berikut adalah daftar order pekerjaan yang ditugaskan kepada Anda.
      </p>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : orders && orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map(order => (
            <Link key={order.id} href={`/dashboard/provi-orders/${order.id}`}>
              <Card className="hover:border-primary transition-colors">
                <CardHeader>
                  <CardTitle>{order.customerName}</CardTitle>
                  <CardDescription>
                    WO: {order.workorder} | SC: {order.scOrder}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{order.address}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center p-12">
          <Truck className="h-16 w-16 text-muted-foreground" />
          <CardTitle className="mt-4">Tidak Ada Order</CardTitle>
          <CardDescription className="mt-2">Saat ini tidak ada order pekerjaan yang ditugaskan kepada Anda.</CardDescription>
        </Card>
      )}
    </div>
  );
}

    