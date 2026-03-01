
'use client';

import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
import { PlusCircle, FileWarning, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { useUser, useFirestore, useMemoFirebase, useDoc, useCollection } from '@/firebase';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { GamasReport, UserProfile } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

function GamasActions({ report }: { report: GamasReport }) {
  return (
    <div className="flex justify-end items-center">
      <Link href={`/dashboard/gamas/${report.id}`}>
        <Button variant="ghost" size="sm">
          <Eye className="mr-2 h-4 w-4" />
          Detail
        </Button>
      </Link>
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

export default function GamasListPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const reportsQuery = useMemoFirebase(() => {
    if (isProfileLoading || !userProfile) {
        return null;
    }
    
    const reportsCollectionRef = collection(firestore, 'gamas-reports');
    const isAdminOrKorlap = userProfile.role === 'admin' || userProfile.role === 'korlap';

    if (isAdminOrKorlap) {
      return query(reportsCollectionRef, orderBy('createdAt', 'desc'));
    }
    
    // For regular technicians, fetch only their own documents without server-side ordering.
    return query(reportsCollectionRef, where('userId', '==', userProfile.id));

  }, [firestore, userProfile, isProfileLoading]);

  const { data: reports, isLoading: areReportsLoading } = useCollection<GamasReport>(reportsQuery);

  const sortedReports = useMemo(() => {
    if (!reports) return [];

    const isAdminOrKorlap = userProfile?.role === 'admin' || userProfile?.role === 'korlap';
    // If admin, data is already sorted by Firestore.
    if (isAdminOrKorlap) return reports;

    // For regular users, sort on the client-side.
    const processedReports = [...reports];
    processedReports.sort((a, b) => {
      const timeA = safeToDate(a.createdAt)?.getTime() ?? 0;
      const timeB = safeToDate(b.createdAt)?.getTime() ?? 0;
      return timeB - timeA;
    });
    
    return processedReports;
  }, [reports, userProfile]);

  const totalPages = sortedReports ? Math.ceil(sortedReports.length / ITEMS_PER_PAGE) : 0;
  const paginatedReports = useMemo(() => {
    if (!sortedReports) return [];
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return sortedReports.slice(startIndex, endIndex);
  }, [sortedReports, currentPage]);

  const isLoading = areReportsLoading || isProfileLoading || isUserLoading;

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Laporan Eviden Gamas</h1>
          <p className="text-muted-foreground mt-1">
            Daftar semua laporan gangguan massal yang telah dikirim.
          </p>
        </div>
        <Link href="/dashboard/gamas/new">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Buat Laporan Baru
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <Skeleton className="h-40 w-full" />
            </div>
          ) : paginatedReports && paginatedReports.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Designator</TableHead>
                  <TableHead>Teknisi</TableHead>
                  <TableHead>Jumlah Foto</TableHead>
                  <TableHead>Tanggal Laporan</TableHead>
                  <TableHead className="text-center pr-6">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedReports.map(report => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium pl-6">{report.designator}</TableCell>
                    <TableCell>{report.userName}</TableCell>
                    <TableCell><Badge variant="secondary">{report.photoUrls.length} Foto</Badge></TableCell>
                    <TableCell>{safeToDate(report.createdAt) ? format(safeToDate(report.createdAt)!, 'dd MMM yyyy, HH:mm') : '-'}</TableCell>
                    <TableCell className="text-center pr-6">
                      <GamasActions report={report} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-16 px-6">
              <h2 className="text-xl font-semibold">Belum Ada Laporan</h2>
              <p className="text-muted-foreground mt-2">
                Mulai buat laporan eviden gamas pertama Anda.
              </p>
              <Link href="/dashboard/gamas/new" className="mt-4 inline-block">
                <Button>
                  <PlusCircle className="mr-2" />
                  Buat Laporan Baru
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
        {totalPages > 1 && (
          <CardFooter>
            <div className="text-xs text-muted-foreground">
              Halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>
                <ChevronLeft className="h-4 w-4" /> Sebelumnya
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>
                Berikutnya <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
    </>
  );
}
