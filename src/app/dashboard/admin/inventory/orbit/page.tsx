
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
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit, PlusCircle, Trash2, History } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc, orderBy, serverTimestamp, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import type { UserProfile, OrbitInventory, LoanEvent } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

function InventoryForm({ item, onFormSubmit }: { item?: OrbitInventory | null, onFormSubmit: (data: Partial<Omit<OrbitInventory, 'id' | 'dateAdded' | 'addedBy'>>) => void }) {
  const [snOrbit, setSnOrbit] = useState('');
  const [snMikrotik, setSnMikrotik] = useState('');
  const [noSimCard, setNoSimCard] = useState('');

  useEffect(() => {
    if (item) {
      setSnOrbit(item.snOrbit);
      setSnMikrotik(item.snMikrotik || '');
      setNoSimCard(item.noSimCard);
    } else {
      setSnOrbit('');
      setSnMikrotik('');
      setNoSimCard('');
    }
  }, [item]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!snOrbit || !noSimCard) return;
    onFormSubmit({ snOrbit, snMikrotik, noSimCard, status: 'available' });
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 py-4">
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="snOrbit" className="text-right">SN Orbit *</Label>
        <Input id="snOrbit" value={snOrbit} onChange={(e) => setSnOrbit(e.target.value)} className="col-span-3" required />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="snMikrotik" className="text-right">SN Mikrotik</Label>
        <Input id="snMikrotik" value={snMikrotik} onChange={(e) => setSnMikrotik(e.target.value)} className="col-span-3" />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="noSimCard" className="text-right">No. SIM Card *</Label>
        <Input id="noSimCard" value={noSimCard} onChange={(e) => setNoSimCard(e.target.value)} className="col-span-3" required />
      </div>
      <DialogFooter>
        <DialogClose asChild><Button type="button" variant="secondary">Batal</Button></DialogClose>
        <Button type="submit">Simpan</Button>
      </DialogFooter>
    </form>
  );
}

function HistoryDialog({ item, isOpen, onOpenChange }: { item: OrbitInventory | null, isOpen: boolean, onOpenChange: (open: boolean) => void }) {
    if (!item) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Riwayat Peminjaman</DialogTitle>
                    <DialogDescription>SN Orbit: {item.snOrbit}</DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-96">
                    <div className="py-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tanggal</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Pengguna</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {item.loanHistory && item.loanHistory.length > 0 ? (
                                    [...item.loanHistory].reverse().map((event, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="text-sm">{format(event.date.toDate(), 'dd MMM yyyy, HH:mm', { locale: idLocale })}</TableCell>
                                            <TableCell>
                                                <Badge variant={event.status === 'borrowed' ? 'destructive' : 'secondary'}>
                                                    {event.status === 'borrowed' ? 'Dipinjam' : 'Dikembalikan'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm">{event.userName}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center">Belum ada riwayat.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </ScrollArea>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button">Tutup</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function AdminOrbitInventoryPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<OrbitInventory | null>(null);
  const [itemToDelete, setItemToDelete] = useState<OrbitInventory | null>(null);
  const [historyToView, setHistoryToView] = useState<OrbitInventory | null>(null);

  const { data: currentUserProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(
    useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore])
  );

  useEffect(() => {
    if (!isUserLoading && !isProfileLoading) {
      if (!user || currentUserProfile?.role !== 'admin') {
        router.push('/dashboard');
      }
    }
  }, [user, currentUserProfile, isUserLoading, isProfileLoading, router]);

  const inventoryQuery = useMemoFirebase(() => {
      if (currentUserProfile?.role === 'admin') {
          return query(collection(firestore, 'orbit-inventory'), orderBy('dateAdded', 'desc'));
      }
      return null;
  }, [firestore, currentUserProfile?.role]);

  const { data: inventory, isLoading: isInventoryLoading } = useCollection<OrbitInventory>(inventoryQuery);

  const handleCreate = () => {
    setItemToEdit(null);
    setIsFormOpen(true);
  };

  const handleEdit = (item: OrbitInventory) => {
    setItemToEdit(item);
    setIsFormOpen(true);
  };

  const handleDelete = (item: OrbitInventory) => {
    setItemToDelete(item);
  };
  
  const confirmDelete = async () => {
    if (!itemToDelete || !firestore) return;
    const itemDocRef = doc(firestore, 'orbit-inventory', itemToDelete.id);
    try {
        await deleteDoc(itemDocRef);
        toast({ title: 'Inventaris Dihapus', description: `Item dengan SN Orbit ${itemToDelete.snOrbit} telah dihapus.` });
    } catch(e) {
        toast({ variant: 'destructive', title: 'Gagal menghapus' });
    }
    setItemToDelete(null);
  }

  const handleFormSubmit = async (data: Partial<Omit<OrbitInventory, 'id' | 'dateAdded' | 'addedBy'>>) => {
    if (!firestore || !user?.email) return;
    try {
        if (itemToEdit) {
          const itemDocRef = doc(firestore, 'orbit-inventory', itemToEdit.id);
          await updateDoc(itemDocRef, data);
          toast({ title: 'Inventaris Diperbarui' });
        } else {
          const inventoryCollection = collection(firestore, 'orbit-inventory');
          await addDoc(inventoryCollection, { ...data, dateAdded: serverTimestamp(), addedBy: user.email, loanHistory: [] });
          toast({ title: 'Inventaris Dibuat' });
        }
    } catch(e) {
        toast({ variant: 'destructive', title: 'Gagal menyimpan' });
    }
    setIsFormOpen(false);
    setItemToEdit(null);
  }

  const isLoading = isUserLoading || isProfileLoading || isInventoryLoading;

  if (isLoading && !inventory) {
      return (
          <div>
              <div className="flex items-center justify-between mb-8"><Skeleton className="h-8 w-64 mb-2" /><Skeleton className="h-10 w-32" /></div>
              <Card><CardHeader><Skeleton className="h-7 w-32" /></CardHeader><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
          </div>
      )
  }

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div><h1 className="text-3xl font-bold tracking-tight">Inventaris Orbit & Mikrotik</h1><p className="text-muted-foreground mt-1">Kelola data serial number untuk perangkat Orbit dan Mikrotik.</p></div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild><Button onClick={handleCreate}><PlusCircle className="mr-2 h-4 w-4"/>Tambah Inventaris</Button></DialogTrigger>
            <DialogContent className="sm:max-w-[500px]"><DialogHeader><DialogTitle>{itemToEdit ? 'Edit Item' : 'Tambah Item Baru'}</DialogTitle></DialogHeader><InventoryForm item={itemToEdit} onFormSubmit={handleFormSubmit} /></DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader><CardTitle>Semua Data Inventaris</CardTitle><CardDescription>Daftar semua perangkat yang tersimpan di sistem.</CardDescription></CardHeader>
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
              {isInventoryLoading && (!inventory || inventory.length === 0) ? (
                Array.from({length: 3}).map((_, i) => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-6 w-full" /></TableCell></TableRow>)
              ) : inventory && inventory.length > 0 ? (
                inventory.map(item => (
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
                       <Button variant="ghost" size="icon" onClick={() => setHistoryToView(item)}><History className="h-4 w-4" /></Button>
                       <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}><Edit className="h-4 w-4" /></Button>
                       <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(item)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={6} className="h-24 text-center">Tidak ada data inventaris. Klik "Tambah Inventaris" untuk memulai.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
       <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Anda yakin?</AlertDialogTitle><AlertDialogDescription>Tindakan ini akan menghapus data inventaris secara permanen.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Hapus</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <HistoryDialog item={historyToView} isOpen={!!historyToView} onOpenChange={(open) => !open && setHistoryToView(null)} />
    </>
  );
}
