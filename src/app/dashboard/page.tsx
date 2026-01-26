'use client';

import Link from 'next/link';
import type { Nota, UserProfile } from '@/lib/types';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from '@/components/ui/button';
import { MoreHorizontal, PlusCircle, Package, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

function NotaActions({ nota }: { nota: Nota }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

  const isAdmin = userProfile?.role === 'admin';
  const isOwner = user?.uid === nota.userId;

  const handleDelete = () => {
    const notaRef = doc(firestore, 'notas', nota.id);
    deleteDocumentNonBlocking(notaRef);
    toast({
      title: 'Laporan Dihapus',
      description: 'Laporan telah berhasil dihapus.',
    });
  };

  if (!isOwner && !isAdmin) {
    // Render the detail button for everyone
    return (
      <Link href={`/dashboard/notas/${nota.id}`}>
        <Button variant="ghost" size="sm">Detail</Button>
      </Link>
    );
  }

  return (
    <div className="flex justify-end items-center">
        <Link href={`/dashboard/notas/${nota.id}`}>
            <Button variant="ghost" size="sm">Detail</Button>
        </Link>
        <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button aria-haspopup="true" size="icon" variant="ghost">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Toggle menu</span>
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <Link href={`/dashboard/notas/${nota.id}/edit`}>
            <DropdownMenuItem>
                <Edit className="mr-2 h-4 w-4" />
                Edit
            </DropdownMenuItem>
            </Link>
            <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive focus:bg-destructive/10">
            <Trash2 className="mr-2 h-4 w-4" />
            Hapus
            </DropdownMenuItem>
        </DropdownMenuContent>
        </DropdownMenu>
    </div>
  );
}


export default function DashboardPage() {
  const firestore = useFirestore();

  // For admins, query all notas. For regular users, this query is filtered by security rules.
  const notasQuery = useMemoFirebase(() => {
    return query(collection(firestore, 'notas'), orderBy('dateCreated', 'desc'));
  }, [firestore]);

  const { data: notas, isLoading } = useCollection<Nota>(notasQuery);

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">
                Selamat Datang di Aplikasi Pelaporan Nota
            </h1>
            <p className="text-muted-foreground mt-1">
                Kelola semua nota pengeluaran Anda di sini.
            </p>
        </div>
        <div className="flex gap-2 shrink-0">
            <Link href="/dashboard/new">
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Tambah Nota
                </Button>
            </Link>
            <Link href="/dashboard/export">
              <Button variant="outline">
                  Buat Laporan Rekap
              </Button>
            </Link>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <Skeleton className="h-12 w-full mb-4" />
              <Skeleton className="h-10 w-full mb-2" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : notas && notas.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px] pl-6">Segment</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                  <TableHead className="hidden md:table-cell w-[160px]">Tanggal</TableHead>
                  <TableHead className="w-[150px] text-center pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notas.map(nota => (
                  <TableRow key={nota.id}>
                    <TableCell className="font-medium pl-6">
                      <div className="flex items-center gap-3">
                        <Package className="h-4 w-4 text-muted-foreground"/>
                        {nota.segmen}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground truncate max-w-xs">{nota.keterangan || nota.namaBarang || '-'}</TableCell>
                    <TableCell className="text-right font-semibold">
                      Rp {nota.nominal.toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {nota.tanggal?.toDate ? format(nota.tanggal.toDate(), 'dd MMM yyyy', { locale: idLocale }) : '-'}
                    </TableCell>
                    <TableCell className="text-center pr-6">
                      <NotaActions nota={nota} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-16 px-6">
                <h2 className="text-xl font-semibold">Belum Ada Laporan</h2>
                <p className="text-muted-foreground mt-2">Mulai buat laporan pertama Anda untuk melihatnya di sini.</p>
                <Link href="/dashboard/new" className="mt-4 inline-block">
                    <Button>
                        <PlusCircle className="mr-2" />
                        Tambah Nota
                    </Button>
                </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
