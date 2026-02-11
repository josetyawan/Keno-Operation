'use client';

import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { BookCopy, Briefcase, BarChart3 } from 'lucide-react';

export default function DashboardSelectorPage() {
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/dashboard/nota">
          <Card className="hover:border-primary hover:shadow-lg transition-all duration-200 h-full">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10 text-primary">
                <BookCopy className="h-8 w-8" />
              </div>
              <div>
                <CardTitle>Aplikasi Nota</CardTitle>
                <CardDescription>Manajemen dan pelaporan nota pengeluaran.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Buat, edit, dan kelola semua laporan nota Anda. Lakukan ekspor laporan untuk kebutuhan rekapitulasi.
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/allpro">
          <Card className="hover:border-primary hover:shadow-lg transition-all duration-200 h-full">
             <CardHeader className="flex flex-row items-center gap-4">
               <div className="p-3 rounded-full bg-primary/10 text-primary">
                <BarChart3 className="h-8 w-8" />
              </div>
              <div>
                <CardTitle>Aplikasi ALLPRO</CardTitle>
                <CardDescription>Rekapitulasi data jaringan.</CardDescription>
              </div>
            </CardHeader>
             <CardContent>
               <p className="text-sm text-muted-foreground">
                Lihat ringkasan data OLT, ODC, ODP, dan FTM untuk semua Service Area dalam satu dashboard terpusat.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </>
  );
}
