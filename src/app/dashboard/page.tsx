'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { BookCopy, BarChart3, Search, ClipboardCheck, Wrench, Bot, Contact, MessageSquare, Component, LayoutGrid, Truck, FileWarning, Briefcase, CalendarDays, Weight } from 'lucide-react';
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
  
  const isAdmin = !isLoading && userProfile?.role === 'admin';
  const isKorlap = !isLoading && userProfile?.role === 'korlap';
  const canAccessNota = !isLoading && (isAdmin || userProfile?.appAccess === 'nota' || userProfile?.appAccess === 'all');
  const canAccessAllpro = !isLoading && (isAdmin || isKorlap || userProfile?.appAccess === 'allpro' || userProfile?.appAccess === 'all');

  const menuItems = [
    { href: '/dashboard/chat', label: 'Chat', icon: MessageSquare, description: 'Komunikasi tim secara real-time.', access: 'public' },
    { href: '/dashboard/admin/pelanggan', label: 'Data Pelanggan', icon: Contact, description: 'Cari, tambah, dan kelola data pelanggan.', access: 'allpro' },
    { href: '/dashboard/provi-orders', label: 'Order Provi', icon: Truck, description: 'Lihat daftar pekerjaan provisioning yang ditugaskan.', access: 'allpro' },
    { href: '/dashboard/nota', label: 'Laporan Nota', icon: LayoutGrid, description: 'Buat, edit, dan kelola semua laporan nota Anda.', access: 'nota' },
    { href: '/dashboard/gamas', label: 'Laporan Gamas', icon: FileWarning, description: 'Buat & lihat laporan untuk gangguan massal.', access: 'allpro' },
    { href: '/dashboard/other-works/new', label: 'Input Pekerjaan Lain', icon: Briefcase, description: 'Catat pekerjaan yang tidak memiliki nomor service.', access: 'allpro' },
    { href: '/dashboard/search-assets', label: 'Network Cek', icon: Search, description: 'Cari aset jaringan publik di semua Service Area.', access: 'allpro' },
    { href: '/dashboard/allpro', label: 'Network Service Area', icon: BarChart3, description: 'Ringkasan data OLT, ODC, ODP, dan FTM.', access: 'allpro' },
    { href: '/dashboard/hr/performance', label: 'Performa Teknisi', icon: BarChart3, description: 'Lihat laporan performa bulanan Anda.', access: 'public' },
    { href: '/dashboard/hr/work-schedule', label: 'Jadwal Kerja', icon: CalendarDays, description: 'Lihat jadwal kerja bulanan untuk semua teknisi.', access: 'public' },
    { href: '/dashboard/hr/attendance', label: 'Absensi Jaga', icon: ClipboardCheck, description: 'Lakukan absensi untuk jadwal jaga Anda hari ini.', access: 'allpro' },
    { href: '/dashboard/inventory/orbit', label: 'Pinjam Orbit', icon: Component, description: 'Pinjam atau kembalikan perangkat Orbit.', access: 'public' },
    { href: '/dashboard/alker', label: 'Daftar Pengecekan', icon: ClipboardCheck, description: 'Lihat riwayat laporan pengecekan alat kerja.', access: 'allpro' },
    { href: '/dashboard/alker/new', label: 'Input Pengecekan Alker', icon: Wrench, description: 'Buat laporan baru untuk kondisi alat kerja.', access: 'allpro' },
    { href: '/dashboard/admin/hr/bobot', label: 'Manajemen Bobot', icon: Weight, description: 'Lihat tabel acuan bobot produktivitas.', access: 'public' },
    { href: '/dashboard/bots', label: 'Daftar Bot', icon: Bot, description: 'Kumpulan bot Telegram untuk alur kerja.', access: 'public' },
  ];

   if (isLoading) {
    return (
      <>
        <div className="mb-8">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96 mt-2" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 9 }).map((_, i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
              <CardContent><Skeleton className="h-4 w-full" /></CardContent>
            </Card>
          ))}
        </div>
      </>
    );
  }

  const filteredMenuItems = menuItems.filter(item => {
    if (item.access === 'public') return true;
    if (item.access === 'nota') return canAccessNota;
    if (item.access === 'allpro') return canAccessAllpro;
    return false;
  });

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
        {filteredMenuItems.map(item => (
          <Link href={item.href} key={item.href}>
            <Card className="hover:border-primary hover:shadow-lg transition-all duration-200 h-full">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10 text-primary">
                  <item.icon className="h-8 w-8" />
                </div>
                <div>
                  <CardTitle>{item.label}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-8 w-full overflow-hidden">
        <Adsense
          data-ad-client="ca-pub-6478281232505590"
          data-ad-slot="3045421226"
          data-ad-format="auto"
          className="block"
          data-full-width-responsive="true"
        />
      </div>
    </>
  );
}
