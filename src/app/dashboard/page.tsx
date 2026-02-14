'use client';

import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { BookCopy, BarChart3, Search } from 'lucide-react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardSelectorPage() {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const isLoading = isAuthLoading || isProfileLoading;
  const canAccessAllApps = userProfile?.role === 'admin' || userProfile?.appAccess === 'all';

   if (isLoading) {
    return (
      <>
        <div className="mb-8">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96 mt-2" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
            <CardContent><Skeleton className="h-4 w-full" /></CardContent>
          </Card>
          <Card>
            <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
            <CardContent><Skeleton className="h-4 w-full" /></CardContent>
          </Card>
        </div>
      </>
    );
  }


  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Selamat Datang
        </h1>
        <p className="text-muted-foreground mt-1">
          Silakan pilih aplikasi yang ingin Anda gunakan.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/dashboard/nota">
          <Card className="hover:border-primary hover:shadow-lg transition-all duration-200 h-full">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10 text-primary">
                <BookCopy className="h-8 w-8" />
              </div>
              <div>
                <CardTitle>Aplikasi Nota</CardTitle>
                <CardDescription>Manajemen dan pelaporan nota.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Buat, edit, dan kelola semua laporan nota Anda.
              </p>
            </CardContent>
          </Card>
        </Link>
        
        {canAccessAllApps && (
           <Link href="/dashboard/search-assets">
            <Card className="hover:border-primary hover:shadow-lg transition-all duration-200 h-full">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10 text-primary">
                  <Search className="h-8 w-8" />
                </div>
                <div>
                  <CardTitle>Pencarian Aset</CardTitle>
                  <CardDescription>Cari aset jaringan publik.</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Temukan detail aset jaringan di semua Service Area.
                </p>
              </CardContent>
            </Card>
          </Link>
        )}

        <Link href="/dashboard/allpro">
          <Card className="hover:border-primary hover:shadow-lg transition-all duration-200 h-full">
             <CardHeader className="flex flex-row items-center gap-4">
               <div className="p-3 rounded-full bg-primary/10 text-primary">
                <BarChart3 className="h-8 w-8" />
              </div>
              <div>
                <CardTitle>Rekapitulasi Jaringan</CardTitle>
                <CardDescription>Ringkasan data jaringan.</CardDescription>
              </div>
            </CardHeader>
             <CardContent>
               <p className="text-sm text-muted-foreground">
                Lihat ringkasan data OLT, ODC, ODP, dan FTM.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </>
  );
}
