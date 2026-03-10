'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { collection, serverTimestamp, doc, addDoc } from 'firebase/firestore';
import type { OtherWork, UserProfile } from '@/lib/types';
import { format } from 'date-fns';
import { ToastAction } from '@/components/ui/toast';
import Link from 'next/link';
import { ScrollArea } from '@/components/ui/scroll-area';

const jenisOrderOptions = [
  "Validasi Data EBIS", "Validasi Data WIFI", "Dismantling DC Infracare",
  "IXSA FTM", "IXSA ODC", "IXSA OLT", "Patroli Akses",
  "Tiket GAMAS", "Tangible ODP", "Validasi Tiang", "Valins FTM", "Valins ODC",
  "Valins Regular", "Preventive FIberisasi", "PT2 Simple", "UNLOCK ODP", "EXPAND ODP",
].sort();

const typeOrderOptions: Record<string, string[]> = {
    'Tiket GAMAS': ['DISTRIBUSI', 'FEEDER', 'ODC', 'ODP'],
};

export default function NewOtherWorkPage() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [namaPekerjaan, setNamaPekerjaan] = useState('');
  const [jenisOrder, setJenisOrder] = useState('');
  const [orderType, setOrderType] = useState('');
  const [tanggalPengerjaan, setTanggalPengerjaan] = useState('');
  const [tanggalSelesai, setTanggalSelesai] = useState('');
  const [keterangan, setKeterangan] = useState('');

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(
    useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore])
  );

  useEffect(() => {
    // Set default pengerjaan date to now when component mounts
    setTanggalPengerjaan(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  }, []);
  
  useEffect(() => {
    if (!isUserLoading && !isProfileLoading) {
        const isApproved = userProfile?.registrationStatus === 'approved';
        const hasAccess = userProfile?.role === 'admin' || userProfile?.role === 'korlap' || userProfile?.appAccess === 'allpro' || userProfile?.appAccess === 'all';
        if (!user || !isApproved || !hasAccess) {
            router.push('/dashboard');
        }
    }
  }, [user, userProfile, isUserLoading, isProfileLoading, router]);

  const showOrderType = useMemo(() => jenisOrder === 'Tiket GAMAS', [jenisOrder]);
  
  useEffect(() => {
      if (!showOrderType) {
          setOrderType('');
      }
  }, [showOrderType]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !userProfile) {
      toast({ variant: 'destructive', title: 'Error', description: 'Pengguna tidak terautentikasi.' });
      return;
    }
    if (!jenisOrder || !tanggalPengerjaan) {
      toast({ variant: 'destructive', title: 'Data Tidak Lengkap', description: 'Jenis Order dan Tanggal Pengerjaan wajib diisi.' });
      return;
    }
    if (showOrderType && !orderType) {
        toast({ variant: 'destructive', title: 'Data Tidak Lengkap', description: 'Order Type wajib diisi untuk Tiket GAMAS.' });
        return;
    }

    setIsSaving(true);
    try {
      const newWorkData: Omit<OtherWork, 'id'> = {
        userId: user.uid,
        userName: userProfile.displayName || user.email!,
        nik: userProfile.nik || '',
        namaPekerjaan: namaPekerjaan.trim() || undefined,
        jenisOrder,
        orderType: orderType || undefined,
        tanggalPengerjaan: new Date(tanggalPengerjaan),
        tanggalSelesai: tanggalSelesai ? new Date(tanggalSelesai) : new Date(),
        keterangan: keterangan.trim() || undefined,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(firestore, 'other-works'), newWorkData);
      
      if (showOrderType) {
        toast({
          title: 'Laporan Awal Disimpan!',
          description: 'Lanjutkan untuk menginput eviden foto di Laporan Gamas.',
          action: <ToastAction asChild altText="Input Eviden"><Link href="/dashboard/gamas/new">Input Eviden</Link></ToastAction>,
          duration: 10000,
        });
      } else {
        toast({ title: 'Pekerjaan Disimpan', description: 'Laporan pekerjaan Anda telah berhasil disimpan.' });
      }

      router.push('/dashboard/admin/other-works');

    } catch (error) {
      console.error('Error saving other work:', error);
      toast({ variant: 'destructive', title: 'Gagal Menyimpan', description: 'Terjadi kesalahan saat menyimpan data.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto grid w-full max-w-2xl flex-1 auto-rows-max gap-4">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-4 mb-4">
          <Button onClick={() => router.back()} variant="outline" size="icon" className="h-8 w-8" type="button">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Kembali</span>
          </Button>
          <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-bold tracking-tight sm:grow-0">
            Input Pekerjaan Lain-lain
          </h1>
          <div className="hidden items-center gap-2 md:ml-auto md:flex">
            <Button onClick={() => router.back()} variant="outline" type="button">Batal</Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <><Loader2 className="animate-spin mr-2" /> Menyimpan...</> : <><Save className="mr-2"/> Simpan</>}
            </Button>
          </div>
        </div>
        
        <Card>
            <CardHeader><CardTitle>Detail Pekerjaan</CardTitle><CardDescription>Isi detail pekerjaan non-service number di bawah ini.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
                <div className="grid gap-2">
                    <Label htmlFor="nama-pekerjaan">Nama Pekerjaan / WO (Opsional)</Label>
                    <Input id="nama-pekerjaan" value={namaPekerjaan} onChange={(e) => setNamaPekerjaan(e.target.value)} placeholder="Contoh: Validasi Tiang Area Jepara Kota"/>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="jenis-order">Jenis Order *</Label>
                        <Select value={jenisOrder} onValueChange={setJenisOrder} required>
                            <SelectTrigger id="jenis-order"><SelectValue placeholder="Pilih Jenis Order..." /></SelectTrigger>
                            <SelectContent><ScrollArea className="h-72">{jenisOrderOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</ScrollArea></SelectContent>
                        </Select>
                    </div>
                    {showOrderType && (
                        <div className="grid gap-2">
                            <Label htmlFor="order-type">Order Type (GAMAS) *</Label>
                            <Select value={orderType} onValueChange={setOrderType} required>
                                <SelectTrigger id="order-type"><SelectValue placeholder="Pilih Tipe Order GAMAS..." /></SelectTrigger>
                                <SelectContent>{typeOrderOptions['Tiket GAMAS'].map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="tanggal-pengerjaan">Tanggal & Jam Pengerjaan *</Label>
                        <Input id="tanggal-pengerjaan" type="datetime-local" value={tanggalPengerjaan} onChange={e => setTanggalPengerjaan(e.target.value)} required />
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="tanggal-selesai">Tanggal & Jam Selesai (Opsional)</Label>
                        <Input id="tanggal-selesai" type="datetime-local" value={tanggalSelesai} onChange={e => setTanggalSelesai(e.target.value)} />
                        <p className="text-xs text-muted-foreground">Kosongkan untuk menggunakan waktu saat ini.</p>
                    </div>
                </div>
                 <div className="grid gap-2">
                    <Label htmlFor="keterangan">Keterangan</Label>
                    <Textarea id="keterangan" value={keterangan} onChange={e => setKeterangan(e.target.value)} placeholder="Catatan tambahan..."/>
                </div>
            </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-2 mt-4 md:hidden">
            <Button onClick={() => router.back()} variant="outline" type="button">Batal</Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <><Loader2 className="animate-spin mr-2" /> Menyimpan...</> : <><Save className="mr-2"/> Simpan</>}
            </Button>
        </div>
      </form>
    </div>
  );
}
