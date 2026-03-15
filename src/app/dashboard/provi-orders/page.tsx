
'use client';

import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import type { ProvisioningRecord } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Truck } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';

export default function TechnicianOrdersPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const ordersQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(firestore, 'provisioning-records'),
      where('assignedTo_userId', '==', user.uid)
    );
  }, [firestore, user]);

  const { data: orders, isLoading: areOrdersLoading } = useCollection<ProvisioningRecord>(ordersQuery);

  const sortedOrders = useMemo(() => {
    if (!orders) return [];
    return [...orders].sort((a, b) => {
      const timeA = a.assignedAt?.toDate ? a.assignedAt.toDate().getTime() : 0;
      const timeB = b.assignedAt?.toDate ? b.assignedAt.toDate().getTime() : 0;
      return timeB - timeA; // Descending
    });
  }, [orders]);


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
      ) : sortedOrders && sortedOrders.length > 0 ? (
        <div className="space-y-4">
          {sortedOrders.map(order => (
            <Link key={order.id} href={`/dashboard/provi-orders/${order.id}`}>
              <Card className="hover:border-primary transition-colors">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{order.customerName}</CardTitle>
                      <CardDescription>
                        WO: {order.workorder} | SC: {order.scOrder}
                      </CardDescription>
                    </div>
                    <Badge variant={order.provisioningStatus === 'kendala' ? 'destructive' : 'secondary'}>{order.provisioningStatus}</Badge>
                  </div>
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

    