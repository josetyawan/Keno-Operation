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
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { OrbitInventory } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ViewOrbitInventoryPage() {
  const firestore = useFirestore();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const inventoryQuery = useMemoFirebase(() => {
      return query(collection(firestore, 'orbit-inventory'), orderBy('dateAdded', 'desc'));
  }, [firestore]);

  const { data: inventory, isLoading: isInventoryLoading } = useCollection<OrbitInventory>(inventoryQuery);

  const filteredInventory = useMemo(() => {
    if (!inventory) return [];
    if (!searchQuery) return inventory;

    const lowercasedQuery = searchQuery.toLowerCase();
    return inventory.filter(item =>
        item.snOrbit.toLowerCase().includes(lowercasedQuery) ||
        (item.snMikrotik && item.snMikrotik.toLowerCase().includes(lowercasedQuery)) ||
        item.noSimCard.toLowerCase().includes(lowercasedQuery)
    );
  }, [inventory, searchQuery]);

  return (
    <>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventaris Orbit & Mikrotik</h1>
          <p className="text-muted-foreground mt-1">Daftar perangkat yang terdaftar di sistem.</p>
        </div>
        <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
        </Button>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>Cari Inventaris</CardTitle>
            <div className="grid max-w-sm gap-2 mt-4">
              <Label htmlFor="search-inventory" className="sr-only">Cari</Label>
              <Input
                id="search-inventory"
                placeholder="Cari SN Orbit, Mikrotik, atau No. SIM..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SN Orbit</TableHead>
                <TableHead>SN Mikrotik</TableHead>
                <TableHead>No. SIM Card</TableHead>
                <TableHead>Tanggal Ditambahkan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isInventoryLoading && (!filteredInventory || filteredInventory.length === 0) ? (
                Array.from({length: 5}).map((_, i) => <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-6 w-full" /></TableCell></TableRow>)
              ) : filteredInventory && filteredInventory.length > 0 ? (
                filteredInventory.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.snOrbit}</TableCell>
                    <TableCell>{item.snMikrotik || '-'}</TableCell>
                    <TableCell>{item.noSimCard}</TableCell>
                    <TableCell>{item.dateAdded?.toDate ? format(item.dateAdded.toDate(), 'dd MMM yyyy, HH:mm', { locale: idLocale }) : 'Baru saja'}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={4} className="h-24 text-center">
                    {searchQuery ? "Tidak ada data inventaris yang cocok." : "Belum ada data inventaris."}
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
