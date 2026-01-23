
'use client';

import Link from 'next/link';
import type { Nota, UserProfile } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowUpRight, PlusCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Terminal } from "lucide-react"

function NotaCard({ nota }: { nota: Nota }) {
  const tanggalLaporan = nota.tanggal?.toDate ? nota.tanggal.toDate() : new Date();
  
  return (
    <Card className="flex flex-col transition-all hover:shadow-md">
      <CardHeader>
        <CardTitle className="text-xl line-clamp-1">Laporan: {nota.segmen}</CardTitle>
        <CardDescription>
          {format(tanggalLaporan, 'PPP')}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-2">
        <p className="text-sm text-muted-foreground line-clamp-2 h-10">
          {nota.keterangan || <span className="italic">Tidak ada keterangan.</span>}
        </p>
         <p className="text-lg font-semibold">
            Rp {nota.nominal.toLocaleString('id-ID')}
        </p>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 pt-4">
         <div className="text-xs text-muted-foreground w-full truncate">
            Oleh: {nota.userEmail || '...'}
          </div>
        <Link href={`/dashboard/notas/${nota.id}`} className="w-full">
          <Button variant="outline" className="w-full">
            Lihat Detail
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);
  const isAdmin = userProfile?.role === 'admin';

  // For admins, query all notas. For regular users, this query is filtered by security rules.
  const notasQuery = useMemoFirebase(() => {
    return query(collection(firestore, 'notas'), orderBy('dateCreated', 'desc'));
  }, [firestore]);

  const { data: notas, isLoading: areNotasLoading } = useCollection<Nota>(notasQuery);

  const isLoading = isProfileLoading || areNotasLoading;

  return (
    <>
       {isAdmin && (
        <Alert className="mb-6">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Anda adalah Admin</AlertTitle>
            <AlertDescription>
                Anda dapat melihat, mengedit, dan memverifikasi semua laporan dari semua pengguna.
            </Aler