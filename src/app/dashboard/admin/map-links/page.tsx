
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
import { Edit, PlusCircle, Trash2 } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import type { UserProfile, MapLink } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';

function MapLinkForm({ mapLink, onFormSubmit }: { mapLink?: MapLink | null, onFormSubmit: (data: { serviceArea: string, url: string }) => void }) {
  const [serviceArea, setServiceArea] = useState('');
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (mapLink) {
      setServiceArea(mapLink.serviceArea);
      setUrl(mapLink.url);
    } else {
      setServiceArea('');
      setUrl('');
    }
  }, [mapLink]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceArea || !url) return;
    onFormSubmit({ serviceArea, url });
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 py-4">
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="serviceArea" className="text-right">
          Service Area
        </Label>
        <Input
          id="serviceArea"
          value={serviceArea}
          onChange={(e) => setServiceArea(e.target.value)}
          className="col-span-3"
          placeholder="e.g., SA KUDUS atau Proyek Fiber Solo"
          required
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="url" className="text-right">
          Map URL
        </Label>
        <Input
          id="url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="col-span-3"
          placeholder="https://www.google.com/maps/d/..."
          required
        />
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="secondary">Batal</Button>
        </DialogClose>
        <Button type="submit">Simpan</Button>
      </DialogFooter>
    </form>
  );
}


export default function AdminMapLinksPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [mapLinkToEdit, setMapLinkToEdit] = useState<MapLink | null>(null);
  const [mapLinkToDelete, setMapLinkToDelete] = useState<MapLink | null>(null);

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

  const mapLinksQuery = useMemoFirebase(() => {
      if (currentUserProfile?.role === 'admin') {
          return query(collection(firestore, 'map-links'));
      }
      return null;
  }, [firestore, currentUserProfile?.role]);

  const { data: mapLinks, isLoading: areMapLinksLoading } = useCollection<MapLink>(mapLinksQuery);

  const handleCreate = () => {
    setMapLinkToEdit(null);
    setIsFormDialogOpen(true);
  };

  const handleEdit = (link: MapLink) => {
    setMapLinkToEdit(link);
    setIsFormDialogOpen(true);
  };

  const handleDelete = (link: MapLink) => {
    setMapLinkToDelete(link);
  };
  
  const confirmDelete = () => {
    if (!mapLinkToDelete || !firestore) return;
    const linkDocRef = doc(firestore, 'map-links', mapLinkToDelete.id);
    deleteDocumentNonBlocking(linkDocRef);
    toast({
      title: 'Link Peta Dihapus',
      description: `Link untuk ${mapLinkToDelete.serviceArea} telah dihapus.`,
    });
    setMapLinkToDelete(null);
  }

  const handleFormSubmit = (data: { serviceArea: string, url: string }) => {
    if (!firestore) return;
    if (mapLinkToEdit) {
      const linkDocRef = doc(firestore, 'map-links', mapLinkToEdit.id);
      updateDocumentNonBlocking(linkDocRef, data);
      toast({
        title: 'Link Peta Diperbarui',
        description: `Link untuk ${data.serviceArea} telah diperbarui.`,
      });
    } else {
      const linksCollection = collection(firestore, 'map-links');
      addDocumentNonBlocking(linksCollection, data);
      toast({
        title: 'Link Peta Dibuat',
        description: `Link baru untuk ${data.serviceArea} telah dibuat.`,
      });
    }
    setIsFormDialogOpen(false);
    setMapLinkToEdit(null);
  }


  const isLoading = isUserLoading || isProfileLoading || areMapLinksLoading;

  if (isLoading && (!mapLinks || mapLinks.length === 0)) {
      return (
          <div>
              <div className="flex items-center justify-between mb-8">
                  <Skeleton className="h-8 w-64 mb-2" />
                  <Skeleton className="h-10 w-32" />
              </div>
              <Card>
                  <CardHeader>
                        <Skeleton className="h-7 w-32" />
                  </CardHeader>
                  <CardContent className="p-6">
                      <Skeleton className="h-10 w-full mb-2" />
                      <Skeleton className="h-10 w-full" />
                  </CardContent>
              </Card>
          </div>
      )
  }

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Manajemen Link Peta
          </h1>
          <p className="text-muted-foreground mt-1">
            Kelola link Google My Maps untuk setiap Service Area atau unit bisnis.
          </p>
        </div>
        <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
            <DialogTrigger asChild>
                <Button onClick={handleCreate}>
                    <PlusCircle className="mr-2 h-4 w-4"/>
                    Buat Link Baru
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{mapLinkToEdit ? 'Edit Link Peta' : 'Buat Link Peta Baru'}</DialogTitle>
                    <DialogDescription>
                        {mapLinkToEdit ? 'Perbarui URL untuk Service Area ini.' : 'Tambahkan link Google My Maps untuk sebuah Service Area.'}
                    </DialogDescription>
                </DialogHeader>
                <MapLinkForm mapLink={mapLinkToEdit} onFormSubmit={handleFormSubmit} />
            </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Semua Link Peta</CardTitle>
          <CardDescription>
            Daftar semua link peta yang tersimpan di sistem.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service Area</TableHead>
                <TableHead>URL Peta</TableHead>
                <TableHead className="text-right">
                  Aksi
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {areMapLinksLoading && mapLinks?.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                        Memuat data...
                    </TableCell>
                </TableRow>
              ) : mapLinks && mapLinks.length > 0 ? (
                mapLinks.map(link => (
                  <TableRow key={link.id}>
                    <TableCell className="font-medium">{link.serviceArea}</TableCell>
                    <TableCell>
                        <Link href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate block max-w-sm">
                            {link.url}
                        </Link>
                    </TableCell>
                    <TableCell className="text-right">
                       <Button variant="ghost" size="icon" onClick={() => handleEdit(link)}>
                           <Edit className="h-4 w-4" />
                       </Button>
                       <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(link)}>
                           <Trash2 className="h-4 w-4" />
                       </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    Tidak ada link peta ditemukan. Klik "Buat Link Baru".
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
       <AlertDialog open={!!mapLinkToDelete} onOpenChange={(open) => !open && setMapLinkToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Anda yakin?</AlertDialogTitle>
            <AlertDialogDescription>
                Tindakan ini akan menghapus link peta untuk {mapLinkToDelete?.serviceArea} secara permanen.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Hapus</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

    