
'use client';

import {
  Card,
  CardContent,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, serverTimestamp, doc, arrayUnion, updateDoc, Timestamp } from 'firebase/firestore';
import type { OrbitInventory, UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export default function ViewOrbitInventoryPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const { data: userProfile } = useDoc<UserProfile>(
    useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore])
  );

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

  const handleAction = async (item: OrbitInventory, action: 'borrow' | 'return') => {
      if (!user || !userProfile) return;
      setLoadingAction(item.id);

      try {
          const docRef = doc(firestore, 'orbit-inventory', item.id);
          let updateData: Partial<OrbitInventory> = {};
          
          const historyEvent = {
              status: action === 'borrow' ? 'borrowed' : 'returned',
              userId: user.uid,
              userName: userProfile.displayName || user.email,
              date: Timestamp.now(),
          };

          if (action === 'borrow') {
              updateData = {
                  status: 'borrowed',
                  borrowedByUserId: user.uid,
                  borrowedByName: userProfile.displayName || user.email,
                  borrowedDate: serverTimestamp(),
                  loanHistory: arrayUnion(historyEvent)
              };
          } else {
              updateData = {
                  status: 'available',
                  borrowedByUserId: '',
                  borrowedByName: '',
                  borrowedDate: null,
                  loanHistory: arrayUnion(historyEvent)
              };
          }
          
          await updateDoc(docRef, updateData);
          toast({ title: 'Sukses', description: `Perangkat berhasil di${action === 'borrow' ? 'pinjam' : 'kembalikan'}.` });

      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Gagal', description: error.message });
          console.error(`Failed to ${action} item:`, error);
      } finally {
          setLoadingAction(null);
      }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventaris Orbit & Mikrotik</h1>
          <p className="text-muted-foreground mt-1">Daftar perangkat yang terdaftar di sistem.</p>
        </div>
        <Link href="/dashboard/inventory/orbit/goodbye">
          <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Dashboard
          </Button>
        </Link>
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
                <TableHead>No. SIM</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Dipinjam Oleh</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isInventoryLoading && (!filteredInventory || filteredInventory.length === 0) ? (
                Array.from({length: 5}).map((_, i) => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-6 w-full" /></TableCell></TableRow>)
              ) : filteredInventory && filteredInventory.length > 0 ? (
                filteredInventory.map(item => {
                  const isBorrowedByCurrentUser = item.status === 'borrowed' && item.borrowedByUserId === user?.uid;
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.snOrbit}</TableCell>
                      <TableCell>{item.snMikrotik || '-'}</TableCell>
                      <TableCell>{item.noSimCard}</TableCell>
                      <TableCell>
                        <Badge variant={item.status === 'borrowed' ? 'destructive' : 'default'}>
                          {item.status === 'borrowed' ? 'Dipinjam' : 'Tersedia'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.status === 'borrowed' && (
                          <div className="text-xs">
                            <p className="font-semibold">{item.borrowedByName || 'N/A'}</p>
                            <p className="text-muted-foreground">{item.borrowedDate ? format(item.borrowedDate.toDate(), 'dd MMM yy', { locale: idLocale }) : ''}</p>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.status === 'borrowed' ? (
                          isBorrowedByCurrentUser && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="sm" disabled={loadingAction === item.id}>
                                        {loadingAction === item.id ? <Loader2 className="animate-spin" /> : 'Kembalikan'}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Konfirmasi Pengembalian</AlertDialogTitle><AlertDialogDescription>Apakah Anda yakin ingin mengembalikan perangkat ini?</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => handleAction(item, 'return')}>Ya, Kembalikan</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                          )
                        ) : (
                           <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="default" size="sm" disabled={loadingAction === item.id}>
                                         {loadingAction === item.id ? <Loader2 className="animate-spin" /> : 'Pinjam'}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Konfirmasi Peminjaman</AlertDialogTitle><AlertDialogDescription>Apakah Anda yakin ingin meminjam perangkat ini? Tindakan ini akan dicatat.</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => handleAction(item, 'borrow')}>Ya, Pinjam</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow><TableCell colSpan={6} className="h-24 text-center">
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
