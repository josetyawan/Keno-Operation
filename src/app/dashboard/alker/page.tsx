
'use client';

import Link from 'next/link';
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { MoreHorizontal, PlusCircle, Trash2 } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { useUser, useFirestore, useMemoFirebase, useDoc, deleteDocumentNonBlocking, useCollection } from '@/firebase';
import { collection, query, doc, where, orderBy } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AlkerChecklist, UserProfile } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

function AlkerActions({ checklist, isAdminOrKorlap }: { checklist: AlkerChecklist, isAdminOrKorlap: boolean }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = () => {
    setIsDeleting(true);
    const docRef = doc(firestore, 'tool-checklists', checklist.id);
    deleteDocumentNonBlocking(docRef);
    toast({
      title: 'Pengecekan Dihapus',
      description: 'Laporan pengecekan alker telah berhasil dihapus.',
    });
  };

  return (
    <div className="flex justify-end items-center">
      <Link href={`/dashboard/alker/${checklist.id}`}>
        <Button variant="ghost" size="sm">Detail</Button>
      </Link>
      {isAdminOrKorlap && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Anda yakin?</AlertDialogTitle>
              <AlertDialogDescription>
                Tindakan ini akan menghapus laporan pengecekan oleh {checklist.userName} pada {checklist.dateSubmitted ? format(checklist.dateSubmitted.toDate(), 'dd MMM yyyy') : ''} secara permanen.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

const safeToDate = (timestamp: any): Date | null => {
  if (!timestamp) return null;
  if (timestamp.toDate) return timestamp.toDate();
  if (timestamp instanceof Date && isValid(timestamp)) return timestamp;
  const d = new Date(timestamp);
  return isValid(d) ? d : null;
};

export default function AlkerListPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => {
    return user ? doc(firestore, 'users', user.uid) : null;
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const checklistsQuery = useMemoFirebase(() => {
    if (isProfileLoading || !userProfile) {
        return null;
    }
    
    const checklistsCollectionRef = collection(firestore, 'tool-checklists');
    const isAdminOrKorlap = userProfile.role === 'admin' || userProfile.role === 'korlap';

    if (isAdminOrKorlap) {
      return query(checklistsCollectionRef, orderBy('dateSubmitted', 'desc'));
    }
    
    return query(checklistsCollectionRef, where('userId', '==', userProfile.id), orderBy('dateSubmitted', 'desc'));
  }, [firestore, userProfile, isProfileLoading]);

  const { data: checklists, isLoading: areChecklistsLoading } = useCollection<AlkerChecklist>(checklistsQuery);

  const isLoading = areChecklistsLoading || isProfileLoading || isUserLoading;
  const isAdminOrKorlap = userProfile?.role === 'admin' || userProfile?.role === 'korlap';

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pengecekan Alat Kerja (Alker)</h1>
          <p className="text-muted-foreground mt-1">
            Daftar semua laporan pengecekan alat kerja yang telah dikirim.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link href="/dashboard/alker/new">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Buat Pengecekan Baru
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
          ) : checklists && checklists.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px] pl-6">Teknisi Utama</TableHead>
                  <TableHead>Jabatan</TableHead>
                  <TableHead>Rekan Kerja</TableHead>
                  <TableHead className="w-[160px]">Tanggal Laporan</TableHead>
                  <TableHead className="w-[150px] text-center pr-6">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checklists.map(checklist => (
                  <TableRow key={checklist.id}>
                    <TableCell className="font-medium pl-6">{checklist.userName}</TableCell>
                    <TableCell><Badge variant="secondary">{checklist.userJabatan || '-'}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{checklist.crewUserName || '-'}</TableCell>
                    <TableCell>
                      {safeToDate(checklist.dateSubmitted) ? format(safeToDate(checklist.dateSubmitted)!, 'dd MMM yyyy, HH:mm') : '-'}
                    </TableCell>
                    <TableCell className="text-center pr-6">
                      <AlkerActions checklist={checklist} isAdminOrKorlap={!!isAdminOrKorlap} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-16 px-6">
              <h2 className="text-xl font-semibold">Belum Ada Pengecekan</h2>
              <p className="text-muted-foreground mt-2">
                Mulai buat laporan pengecekan alat kerja pertama Anda.
              </p>
              <Link href="/dashboard/alker/new" className="mt-4 inline-block">
                <Button>
                  <PlusCircle className="mr-2" />
                  Buat Pengecekan Baru
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
