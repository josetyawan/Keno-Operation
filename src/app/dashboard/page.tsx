'use client';

import Link from 'next/link';
import type { Nota, UserProfile } from '@/lib/types';
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
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, PlusCircle, Edit, Trash2, User } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useState, useMemo } from 'react';

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
  const [selectedSA, setSelectedSA] = useState('all');
  const serviceAreas = ['SA KUDUS', 'SA PATI', 'SA JEPARA', 'SA PURWODADI', 'SA BLORA'];

  // For admins, query all notas. For regular users, this query is filtered by security rules.
  const notasQuery = useMemoFirebase(() => {
    return query(collection(firestore, 'notas'), orderBy('dateCreated', 'desc'));
  }, [firestore]);

  const { data: notas, isLoading } = useCollection<Nota>(notasQuery);

  const filteredNotas = useMemo(() => {
      if (!notas) return [];
      if (selectedSA === 'all') {
          return notas;
      }
      return notas.filter(nota => nota.serviceArea === selectedSA);
  }, [notas, selectedSA]);

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

       <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filter Laporan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 max-w-sm">
            <Label htmlFor="service-area-filter">Service Area</Label>
            <Select value={selectedSA} onValueChange={setSelectedSA}>
              <SelectTrigger id="service-area-filter">
                <SelectValue placeholder="Pilih Service Area..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Service Area</SelectItem>
                {serviceAreas.map(sa => <SelectItem key={sa} value={sa}>{sa}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <Skeleton className="h-12 w-full mb-4" />
              <Skeleton className="h-10 w-full mb-2" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : filteredNotas && filteredNotas.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px] pl-6">PIC</TableHead>
                  <TableHead>Segmen</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                  <TableHead className="hidden md:table-cell w-[160px]">Tanggal</TableHead>
                  <TableHead className="w-[150px] text-center pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNotas.map(nota => (
                  <TableRow key={nota.id}>
                    <TableCell className="font-medium pl-6">
                      <div className="flex items-center gap-3">
                        <User className="h-4 w-4 text-muted-foreground"/>
                        {nota.namaPic}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{nota.segmen}</TableCell>
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
                <p className="text-muted-foreground mt-2">
                    Tidak ada laporan ditemukan untuk filter yang dipilih.
                    <br/>
                    Mulai buat laporan pertama Anda untuk melihatnya di sini.
                </p>
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
