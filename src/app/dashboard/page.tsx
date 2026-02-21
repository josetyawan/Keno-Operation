'use client';

import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { BookCopy, BarChart3, Search, ClipboardCheck, Wrench, Bot, Contact } from 'lucide-react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Adsense } from '@/components/adsense';

export default function DashboardSelectorPage() {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const isLoading = isAuthLoading || isProfileLoading;
  
  const canAccessNota = !isLoading && (userProfile?.role === 'admin' || userProfile?.appAccess === 'nota' || userProfile?.appAccess === 'all');
  const canAccessAllpro = !isLoading && (userProfile?.role === 'admin' || userProfile?.appAccess === 'allpro' || userProfile?.appAccess === 'all' || userProfile?.role === 'korlap');


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
        {canAccessNota && (
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
        )}
        
        {canAccessAllpro && (
           <Link href="/dashboard/search-assets">
            <Card className="hover:border-primary hover:shadow-lg transition-all duration-200 h-full">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10 text-primary">
                  <Search className="h-8 w-8" />
                </div>
                <div>
                  <CardTitle>Network Cek</CardTitle>
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

        {canAccessAllpro && (
            <Link href="/dashboard/allpro">
            <Card className="hover:border-primary hover:shadow-lg transition-all duration-200 h-full">
                <CardHeader className="flex flex-row items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10 text-primary">
                    <BarChart3 className="h-8 w-8" />
                </div>
                <div>
                    <CardTitle>Network Service Area</CardTitle>
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
        )}
        
        {canAccessAllpro && (
            <Link href="/dashboard/admin/pelanggan">
            <Card className="hover:border-primary hover:shadow-lg transition-all duration-200 h-full">
                <CardHeader className="flex flex-row items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10 text-primary">
                    <Contact className="h-8 w-8" />
                </div>
                <div>
                    <CardTitle>Data Pelanggan</CardTitle>
                    <CardDescription>Input dan kelola data pelanggan.</CardDescription>
                </div>
                </CardHeader>
                <CardContent>
                <p className="text-sm text-muted-foreground">
                    Simpan informasi lokasi, kontak, dan foto untuk pelanggan baru.
                </p>
                </CardContent>
            </Card>
            </Link>
        )}

        {canAccessAllpro && (
            <Link href="/dashboard/hr/attendance">
            <Card className="hover:border-primary hover:shadow-lg transition-all duration-200 h-full">
                <CardHeader className="flex flex-row items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10 text-primary">
                    <ClipboardCheck className="h-8 w-8" />
                </div>
                <div>
                    <CardTitle>Absensi Jaga</CardTitle>
                    <CardDescription>Lakukan absensi untuk jadwal jaga.</CardDescription>
                </div>
                </CardHeader>
                <CardContent>
                <p className="text-sm text-muted-foreground">
                    Ambil foto dan catat kehadiran Anda untuk shift jaga hari ini.
                </p>
                </CardContent>
            </Card>
            </Link>
        )}

        {canAccessAllpro && (
            <Link href="/dashboard/alker">
            <Card className="hover:border-primary hover:shadow-lg transition-all duration-200 h-full">
                <CardHeader className="flex flex-row items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10 text-primary">
                    <ClipboardCheck className="h-8 w-8" />
                </div>
                <div>
                    <CardTitle>Daftar Pengecekan Alker</CardTitle>
                    <CardDescription>Lihat riwayat pengecekan alat kerja.</CardDescription>
                </div>
                </CardHeader>
                <CardContent>
                <p className="text-sm text-muted-foreground">
                    Tampilkan semua laporan pengecekan alat kerja yang telah dikirim.
                </p>
                </CardContent>
            </Card>
            </Link>
        )}

        {canAccessAllpro && (
            <Link href="/dashboard/alker/new">
            <Card className="hover:border-primary hover:shadow-lg transition-all duration-200 h-full">
                <CardHeader className="flex flex-row items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10 text-primary">
                    <Wrench className="h-8 w-8" />
                </div>
                <div>
                    <CardTitle>Input Pengecekan Alker</CardTitle>
                    <CardDescription>Buat laporan pengecekan alat kerja baru.</CardDescription>
                </div>
                </CardHeader>
                <CardContent>
                <p className="text-sm text-muted-foreground">
                    Isi formulir untuk melaporkan kondisi alat kerja Anda saat ini.
                </p>
                </CardContent>
            </Card>
            </Link>
        )}
        
        <Link href="/dashboard/bots">
            <Card className="hover:border-primary hover:shadow-lg transition-all duration-200 h-full">
                <CardHeader className="flex flex-row items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10 text-primary">
                    <Bot className="h-8 w-8" />
                </div>
                <div>
                    <CardTitle>Daftar Bot</CardTitle>
                    <CardDescription>Kumpulan bot Telegram yang digunakan.</CardDescription>
                </div>
                </CardHeader>
                <CardContent>
                <p className="text-sm text-muted-foreground">
                    Akses cepat ke bot-bot penting untuk alur kerja harian Anda.
                </p>
                </CardContent>
            </Card>
        </Link>
      </div>
      <div className="mt-8 w-full overflow-hidden">
        <Adsense
          data-ad-client="ca-pub-6478281232505590"
          data-ad-slot="YOUR_AD_SLOT_ID_1"
          data-ad-format="auto"
          className="block"
          data-full-width-responsive="true"
        />
      </div>
    </>
  );
}
