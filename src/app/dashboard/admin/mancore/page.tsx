
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit, PlusCircle, Trash2 } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, doc, orderBy } from 'firebase/firestore';
import type { UserProfile, MancoreLink } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const serviceAreas = ['SA KUDUS', 'SA PATI', 'SA JEPARA', 'SA PURWODADI', 'SA BLORA', 'SA REMBANG'];

function MancoreLinkForm({ link, onFormSubmit }: { link?: MancoreLink | null, onFormSubmit: (data: { serviceArea: string, label: string, url: string }) => void }) {
  const [serviceArea, setServiceArea] = useState('');
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (link) {
      setServiceArea(link.serviceArea);
      setLabel(link.label);
      setUrl(link.url);
    } else {
      setServiceArea('');
      setLabel('');
      setUrl('');
    }
  }, [link]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceArea || !label || !url) return;
    onFormSubmit({ serviceArea, label, url });
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 py-4">
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="serviceArea" className="text-right">
          Service Area
        </Label>
        <Select value={serviceArea} onValueChange={setServiceArea} required>
            <SelectTrigger id="serviceArea" className="col-span-3">
                <SelectValue placeholder="Pilih Service Area..." />
            </SelectTrigger>
            <SelectContent>
                {serviceAreas.map(sa => <SelectItem key={sa} value={sa}>{sa}</SelectItem>)}
            </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="label" className="text-right">
          Label Link
        </Label>
        <Input
          id="label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="col-span-3"
          placeholder="e.g., Peta Jaringan ODP"
          required
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="url" className="text-right">
          URL
        </Label>
        <Input
          id="url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="col-span-3"
          placeholder="https://drive.google.com/..."
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

export default function AdminMancorePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [linkToEdit, setLinkToEdit] = useState<MancoreLink | null>(null);
  const [linkToDelete, setLinkToDelete] = useState<MancoreLink | null>(null);

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

  const mancoreLinksQuery = useMemoFirebase(() => {
      if (currentUserProfile?.role === 'admin') {
          return query(collection(firestore, 'mancore-links'), orderBy('serviceArea'));
      }
      return null;
  }, [firestore, currentUserProfile?.role]);

  const { data: mancoreLinks, isLoading: areLinksLoading } = useCollection<MancoreLink>(mancoreLinksQuery);

  const handleCreate = () => {
    setLinkToEdit(null);
    setIsFormDialogOpen(true);
  };

  const handleEdit = (link: MancoreLink) => {
    setLinkToEdit(link);
    setIsFormDialogOpen(true);
  };

  const handleDelete = (link: MancoreLink) => {
    setLinkToDelete(link);
  };
  
  const confirmDelete = () => {
    if (!linkToDelete || !firestore) return;
    const linkDocRef = doc(firestore, 'mancore-links', linkToDelete.id);
    deleteDocumentNonBlocking(linkDocRef);
    toast({
      title: 'Link Dihapus',
      description: `Link "${linkToDelete.label}" telah dihapus.`,
    });
    setLinkToDelete(null);
  }

  const handleFormSubmit = (data: { serviceArea: string, label: string, url: string }) => {
    if (!firestore) return;
    if (linkToEdit) {
      const linkDocRef = doc(firestore, 'mancore-links', linkToEdit.id);
      updateDocumentNonBlocking(linkDocRef, data);
      toast({
        title: 'Link Diperbarui',
        description: `Link "${data.label}" telah diperbarui.`,
      });
    } else {
      const linksCollection = collection(firestore, 'mancore-links');
      addDocumentNonBlocking(linksCollection, data);
      toast({
        title: 'Link Dibuat',
        description: `Link baru "${data.label}" telah dibuat.`,
      });
    }
    setIsFormDialogOpen(false);
    setLinkToEdit(null);
  }


  const isLoading = isUserLoading || isProfileLoading || areLinksLoading;

  if (isLoading && (!mancoreLinks || mancoreLinks.length === 0)) {
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
            Manajemen Link Mancore
          </h1>
          <p className="text-muted-foreground mt-1">
            Kelola link eksternal (e.g., Google Drive) untuk setiap Service Area.
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
                    <DialogTitle>{linkToEdit ? 'Edit Link' : 'Buat Link Baru'}</DialogTitle>
                    <DialogDescription>
                        Tambahkan atau perbarui link untuk sebuah Service Area.
                    </DialogDescription>
                </DialogHeader>
                <MancoreLinkForm link={linkToEdit} onFormSubmit={handleFormSubmit} />
            </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Semua Link Tersimpan</CardTitle>
          <CardDescription>
            Daftar semua link yang akan muncul di halaman Network Cek.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service Area</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>URL</TableHead>
                <TableHead className="text-right">
                  Aksi
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {areLinksLoading && mancoreLinks?.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                        Memuat data...
                    </TableCell>
                </TableRow>
              ) : mancoreLinks && mancoreLinks.length > 0 ? (
                mancoreLinks.map(link => (
                  <TableRow key={link.id}>
                    <TableCell className="font-medium">{link.serviceArea}</TableCell>
                    <TableCell>{link.label}</TableCell>
                    <TableCell>
                        <Link href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate block max-w-xs">
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
                  <TableCell colSpan={4} className="h-24 text-center">
                    Tidak ada link ditemukan. Klik "Buat Link Baru".
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
       <AlertDialog open={!!linkToDelete} onOpenChange={(open) => !open && setLinkToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Anda yakin?</AlertDialogTitle>
            <AlertDialogDescription>
                Tindakan ini akan menghapus link "{linkToDelete?.label}" secara permanen.
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
