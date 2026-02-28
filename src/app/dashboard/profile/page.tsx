

'use client';

import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile, Pendidikan } from '@/lib/types';
import { useState, useEffect } from 'react';
import { DatePickerDropdowns } from '@/components/ui/date-picker-dropdowns';
import { isValid } from 'date-fns';

export default function ProfilePage() {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [emailCorporate, setEmailCorporate] = useState('');
  const [nikKaryawan, setNikKaryawan] = useState('');
  const [nikKtp, setNikKtp] = useState('');
  const [noHpTsel, setNoHpTsel] = useState('');
  const [paymentInfo, setPaymentInfo] = useState('');
  const [jabatan, setJabatan] = useState('');
  const [jobDescHrmista, setJobDescHrmista] = useState('');
  const [jobDescLapangan, setJobDescLapangan] = useState('');
  const [alamat, setAlamat] = useState('');
  const [tempatLahir, setTempatLahir] = useState('');
  const [tanggalLahir, setTanggalLahir] = useState<Date | undefined>();
  const [golonganDarah, setGolonganDarah] = useState('');
  const [statusPernikahan, setStatusPernikahan] = useState<'menikah' | 'lajang' | 'duda' | 'janda' | undefined>();
  const [jumlahAnak, setJumlahAnak] = useState('');
  const [noSimA, setNoSimA] = useState('');
  const [noSimC, setNoSimC] = useState('');
  const [masaBerlakuSimA, setMasaBerlakuSimA] = useState<Date | undefined>();
  const [masaBerlakuSimC, setMasaBerlakuSimC] = useState<Date | undefined>();
  const [tanggalMasukKerja, setTanggalMasukKerja] = useState<Date | undefined>();
  const [tinggiBadan, setTinggiBadan] = useState('');
  const [beratBadan, setBeratBadan] = useState('');
  const [noBpjsKetenagakerjaan, setNoBpjsKetenagakerjaan] = useState('');
  const [noBpjsKesehatan, setNoBpjsKesehatan] = useState('');
  const [pendidikanTerakhir, setPendidikanTerakhir] = useState<Pendidikan>({ institusi: '', jurusan: '', tahunLulus: '' });
  const [labor, setLabor] = useState('');
  const [ukuranBaju, setUkuranBaju] = useState('');
  const [ukuranCelana, setUkuranCelana] = useState('');
  const [ukuranSepatu, setUkuranSepatu] = useState('');
  const [telegramId, setTelegramId] = useState('');
  const [telegramUsername, setTelegramUsername] = useState('');
  const [devisi, setDevisi] = useState('');
  const [unit, setUnit] = useState('');
  const [psa, setPsa] = useState('');
  
  const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: userProfile, isLoading: isFirestoreLoading } = useDoc<UserProfile>(userDocRef);

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || '');
      setEmail(userProfile.email || '');
      setEmailCorporate(userProfile.emailCorporate || '');
      setNikKaryawan(userProfile.nik || '');
      setNikKtp(userProfile.nikKtp || '');
      setNoHpTsel(userProfile.noHpTsel || '');
      setPaymentInfo(userProfile.paymentInfo || (userProfile as any).phone || '');
      setJabatan(userProfile.jabatan || '');
      setJobDescHrmista(userProfile.jobDescHrmista || '');
      setJobDescLapangan(userProfile.jobDescLapangan || '');
      setAlamat(userProfile.alamat || '');
      setTempatLahir(userProfile.tempatLahir || '');
      setTanggalLahir(userProfile.tanggalLahir?.toDate());
      setGolonganDarah(userProfile.golonganDarah || '');
      setStatusPernikahan(userProfile.statusPernikahan);
      setJumlahAnak(userProfile.jumlahAnak?.toString() || '');
      setNoSimA(userProfile.noSimA || '');
      setNoSimC(userProfile.noSimC || '');
      setMasaBerlakuSimA(userProfile.masaBerlakuSimA?.toDate());
      setMasaBerlakuSimC(userProfile.masaBerlakuSimC?.toDate());
      setTanggalMasukKerja(userProfile.tanggalMasukKerja?.toDate());
      setTinggiBadan(userProfile.tinggiBadan?.toString() || '');
      setBeratBadan(userProfile.beratBadan?.toString() || '');
      setNoBpjsKetenagakerjaan(userProfile.noBpjsKetenagakerjaan || '');
      setNoBpjsKesehatan(userProfile.noBpjsKesehatan || '');
      setPendidikanTerakhir(userProfile.pendidikanTerakhir || { institusi: '', jurusan: '', tahunLulus: '' });
      setLabor(userProfile.labor || '');
      setUkuranBaju(userProfile.ukuranBaju || '');
      setUkuranCelana(userProfile.ukuranCelana || '');
      setUkuranSepatu(userProfile.ukuranSepatu || '');
      setTelegramId(userProfile.telegramId || '');
      setTelegramUsername(userProfile.telegramUsername || '');
      setDevisi(userProfile.devisi || '');
      setUnit(userProfile.unit || '');
      setPsa(userProfile.psa || '');
    }
  }, [userProfile]);

  const isLoading = isAuthLoading || isFirestoreLoading;

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userDocRef) return;
    setIsSaving(true);
    
    const updatedData: { [key: string]: any } = {
        displayName,
        emailCorporate,
        nik: nikKaryawan,
        nikKtp,
        noHpTsel,
        jabatan,
        jobDescHrmista,
        jobDescLapangan,
        alamat,
        tempatLahir,
        golonganDarah,
        paymentInfo,
        noSimA,
        noSimC,
        labor,
        ukuranBaju,
        ukuranCelana,
        ukuranSepatu,
        noBpjsKetenagakerjaan,
        noBpjsKesehatan,
        pendidikanTerakhir,
        telegramId,
        telegramUsername,
        devisi,
        unit,
        psa,
    };
    
    if (statusPernikahan) {
      updatedData.statusPernikahan = statusPernikahan;
    }
    
    const hasChildren = ['menikah', 'duda', 'janda'].includes(statusPernikahan || '');
    if (hasChildren) {
        updatedData.jumlahAnak = Number(jumlahAnak) || 0;
    } else {
        updatedData.jumlahAnak = 0;
    }
    
    if (tinggiBadan) updatedData.tinggiBadan = Number(tinggiBadan) || 0;
    if (beratBadan) updatedData.beratBadan = Number(beratBadan) || 0;
    
    updatedData.tanggalLahir = tanggalLahir && isValid(tanggalLahir) ? Timestamp.fromDate(tanggalLahir) : null;
    updatedData.masaBerlakuSimA = masaBerlakuSimA && isValid(masaBerlakuSimA) ? Timestamp.fromDate(masaBerlakuSimA) : null;
    updatedData.masaBerlakuSimC = masaBerlakuSimC && isValid(masaBerlakuSimC) ? Timestamp.fromDate(masaBerlakuSimC) : null;
    updatedData.tanggalMasukKerja = tanggalMasukKerja && isValid(tanggalMasukKerja) ? Timestamp.fromDate(tanggalMasukKerja) : null;

    try {
      await updateDoc(userDocRef, updatedData);
      toast({ title: 'Profil Diperbarui', description: 'Informasi profil Anda telah berhasil disimpan.' });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({ variant: 'destructive', title: 'Gagal Memperbarui', description: 'Tidak dapat menyimpan profil Anda. Silakan coba lagi.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto grid max-w-4xl flex-1 auto-rows-max gap-6">
        <div className="flex items-center gap-4"><Skeleton className="h-7 w-7 rounded-md" /><Skeleton className="h-7 w-48" /></div>
        <Card><CardHeader><Skeleton className="h-8 w-1/2" /><Skeleton className="h-4 w-3/4" /></CardHeader>
          <CardContent className="space-y-4"><div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
            <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <form onSubmit={handleProfileUpdate} className="mx-auto grid max-w-4xl flex-1 auto-rows-max gap-6">
      <div className="flex items-center gap-4">
        <Button onClick={() => router.back()} variant="outline" size="icon" className="h-7 w-7" type="button">
          <ArrowLeft className="h-4 w-4" /><span className="sr-only">Back</span>
        </Button>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">Edit Profil HR</h1>
        {userProfile?.role === 'admin' && <Badge variant="destructive" className="ml-auto sm:ml-0 capitalize">{userProfile.role}</Badge>}
      </div>

      <div className="grid gap-6">
        {/* Data Diri */}
        <Card><CardHeader><CardTitle>Data Diri</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="grid gap-2"><Label htmlFor="displayName">Nama Lengkap Sesuai KTP *</Label><Input id="displayName" value={displayName} onChange={e => setDisplayName(e.target.value)} required /></div>
              <div className="grid gap-2"><Label htmlFor="nikKtp">NIK KTP</Label><Input id="nikKtp" value={nikKtp} onChange={e => setNikKtp(e.target.value)} /></div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="grid gap-2"><Label htmlFor="tempatLahir">Tempat Lahir</Label><Input id="tempatLahir" value={tempatLahir} onChange={e => setTempatLahir(e.target.value)} /></div>
              <div className="grid gap-2"><Label htmlFor="tanggalLahir">Tanggal Lahir</Label>
                <DatePickerDropdowns
                  value={tanggalLahir}
                  onChange={setTanggalLahir}
                  fromYear={1950}
                  toYear={new Date().getFullYear()}
                />
              </div>
            </div>
            <div className="grid gap-2"><Label htmlFor="alamat">Alamat Sesuai KTP</Label><Textarea id="alamat" value={alamat} onChange={e => setAlamat(e.target.value)} /></div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="grid gap-2"><Label htmlFor="golonganDarah">Golongan Darah</Label><Input id="golonganDarah" value={golonganDarah} onChange={e => setGolonganDarah(e.target.value)} /></div>
              <div className="grid gap-2"><Label>Status Pernikahan</Label>
                <RadioGroup value={statusPernikahan} onValueChange={(value: any) => setStatusPernikahan(value)} className="flex items-center space-x-4 flex-wrap">
                  <div className="flex items-center space-x-2"><RadioGroupItem value="lajang" id="lajang" /><Label htmlFor="lajang">Lajang</Label></div>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="menikah" id="menikah" /><Label htmlFor="menikah">Menikah</Label></div>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="duda" id="duda" /><Label htmlFor="duda">Duda</Label></div>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="janda" id="janda" /><Label htmlFor="janda">Janda</Label></div>
                </RadioGroup>
              </div>
            </div>
            {['menikah', 'duda', 'janda'].includes(statusPernikahan || '') && <div className="grid gap-2"><Label htmlFor="jumlahAnak">Jumlah Anak</Label><Input id="jumlahAnak" type="number" value={jumlahAnak} onChange={e => setJumlahAnak(e.target.value)} /></div>}
          </CardContent>
        </Card>

        {/* Data Kepegawaian */}
        <Card><CardHeader><CardTitle>Data Kepegawaian</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="grid gap-2"><Label htmlFor="email">Email Login</Label><Input id="email" value={email} readOnly disabled /></div>
              <div className="grid gap-2"><Label htmlFor="emailCorporate">Email Coorporate</Label><Input id="emailCorporate" type="email" value={emailCorporate} onChange={e => setEmailCorporate(e.target.value)} /></div>
            </div>
             <div className="grid md:grid-cols-2 gap-4">
                <div className="grid gap-2"><Label htmlFor="nikKaryawan">NIK Karyawan</Label><Input id="nikKaryawan" value={nikKaryawan} onChange={e => setNikKaryawan(e.target.value)} /></div>
                <div className="grid gap-2"><Label htmlFor="noHpTsel">No. HP Aktif TSEL</Label><Input id="noHpTsel" value={noHpTsel} onChange={e => setNoHpTsel(e.target.value)} /></div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="grid gap-2"><Label htmlFor="telegramId">ID Telegram</Label><Input id="telegramId" value={telegramId} onChange={e => setTelegramId(e.target.value)} placeholder="Contoh: 123456789" /></div>
              <div className="grid gap-2"><Label htmlFor="telegramUsername">Username Telegram</Label><Input id="telegramUsername" value={telegramUsername} onChange={e => setTelegramUsername(e.target.value)} placeholder="Contoh: @username" /></div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="grid gap-2"><Label htmlFor="tanggalMasukKerja">Tanggal Masuk Kerja</Label>
                 <DatePickerDropdowns
                    value={tanggalMasukKerja}
                    onChange={setTanggalMasukKerja}
                    fromYear={2000}
                    toYear={new Date().getFullYear()}
                  />
              </div>
              <div className="grid gap-2"><Label htmlFor="jabatan">Jabatan</Label><Input id="jabatan" value={jabatan} onChange={e => setJabatan(e.target.value)} /></div>
            </div>
            <div className="grid gap-2"><Label htmlFor="jobDescHrmista">Job Desk di HRMISTA</Label><Textarea id="jobDescHrmista" value={jobDescHrmista} onChange={e => setJobDescHrmista(e.target.value)} /></div>
            <div className="grid gap-2"><Label htmlFor="jobDescLapangan">Job Desk Lapangan</Label><Textarea id="jobDescLapangan" value={jobDescLapangan} onChange={e => setJobDescLapangan(e.target.value)} /></div>
            <div className="grid gap-2"><Label htmlFor="labor">Labor</Label><Input id="labor" value={labor} onChange={e => setLabor(e.target.value)} /></div>
             <div className="grid md:grid-cols-3 gap-4">
                <div className="grid gap-2"><Label htmlFor="devisi">DEVISI</Label><Input id="devisi" value={devisi} onChange={e => setDevisi(e.target.value)} /></div>
                <div className="grid gap-2"><Label htmlFor="unit">UNIT</Label><Input id="unit" value={unit} onChange={e => setUnit(e.target.value)} /></div>
                <div className="grid gap-2"><Label htmlFor="psa">PSA</Label><Input id="psa" value={psa} onChange={e => setPsa(e.target.value)} /></div>
            </div>
          </CardContent>
        </Card>

        {/* Data Pelengkap */}
        <Card><CardHeader><CardTitle>Data Pelengkap</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-2">
                <Label htmlFor="paymentInfo">No. Pembayaran (Gaji)</Label>
                <Input id="paymentInfo" value={paymentInfo} onChange={e => setPaymentInfo(e.target.value)} placeholder="e.g., OVO 0812... / BCA 123..." />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="grid gap-2"><Label htmlFor="noSimA">No. SIM A</Label><Input id="noSimA" value={noSimA} onChange={e => setNoSimA(e.target.value)} /></div>
              {noSimA && (
                  <div className="grid gap-2">
                    <Label htmlFor="masaBerlakuSimA">Masa Berlaku SIM A</Label>
                    <DatePickerDropdowns
                        value={masaBerlakuSimA}
                        onChange={setMasaBerlakuSimA}
                        fromYear={new Date().getFullYear()}
                        toYear={new Date().getFullYear() + 10}
                    />
                  </div>
              )}
            </div>
             <div className="grid md:grid-cols-2 gap-4">
              <div className="grid gap-2"><Label htmlFor="noSimC">No. SIM C</Label><Input id="noSimC" value={noSimC} onChange={e => setNoSimC(e.target.value)} /></div>
               {noSimC && (
                  <div className="grid gap-2">
                    <Label htmlFor="masaBerlakuSimC">Masa Berlaku SIM C</Label>
                     <DatePickerDropdowns
                        value={masaBerlakuSimC}
                        onChange={setMasaBerlakuSimC}
                        fromYear={new Date().getFullYear()}
                        toYear={new Date().getFullYear() + 10}
                    />
                  </div>
                )}
            </div>
            
             <div className="grid md:grid-cols-2 gap-4">
                <div className="grid gap-2"><Label htmlFor="noBpjsKetenagakerjaan">No. BPJS Ketenagakerjaan</Label><Input id="noBpjsKetenagakerjaan" value={noBpjsKetenagakerjaan} onChange={e => setNoBpjsKetenagakerjaan(e.target.value)} /></div>
                <div className="grid gap-2"><Label htmlFor="noBpjsKesehatan">No. BPJS Kesehatan</Label><Input id="noBpjsKesehatan" value={noBpjsKesehatan} onChange={e => setNoBpjsKesehatan(e.target.value)} /></div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
                 <div className="grid gap-2"><Label htmlFor="tinggiBadan">Tinggi Badan (cm)</Label><Input id="tinggiBadan" type="number" value={tinggiBadan} onChange={e => setTinggiBadan(e.target.value)} /></div>
                 <div className="grid gap-2"><Label htmlFor="beratBadan">Berat Badan (kg)</Label><Input id="beratBadan" type="number" value={beratBadan} onChange={e => setBeratBadan(e.target.value)} /></div>
            </div>
             <div className="grid md:grid-cols-3 gap-4">
                 <div className="grid gap-2"><Label htmlFor="ukuranBaju">Ukuran Baju</Label><Input id="ukuranBaju" value={ukuranBaju} onChange={e => setUkuranBaju(e.target.value)} /></div>
                 <div className="grid gap-2"><Label htmlFor="ukuranCelana">Ukuran Celana</Label><Input id="ukuranCelana" value={ukuranCelana} onChange={e => setUkuranCelana(e.target.value)} /></div>
                 <div className="grid gap-2"><Label htmlFor="ukuranSepatu">Ukuran Sepatu</Label><Input id="ukuranSepatu" value={ukuranSepatu} onChange={e => setUkuranSepatu(e.target.value)} /></div>
            </div>
          </CardContent>
        </Card>
        
        {/* Pendidikan */}
        <Card>
          <CardHeader><CardTitle>Pendidikan Terakhir</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2"><Label htmlFor="institusi">Nama Institusi/Sekolah</Label><Input id="institusi" value={pendidikanTerakhir.institusi} onChange={e => setPendidikanTerakhir(p => ({...p, institusi: e.target.value}))} /></div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="grid gap-2"><Label htmlFor="jurusan">Jurusan</Label><Input id="jurusan" value={pendidikanTerakhir.jurusan} onChange={e => setPendidikanTerakhir(p => ({...p, jurusan: e.target.value}))} /></div>
              <div className="grid gap-2"><Label htmlFor="tahunLulus">Tahun Lulus</Label><Input id="tahunLulus" value={pendidikanTerakhir.tahunLulus} onChange={e => setPendidikanTerakhir(p => ({...p, tahunLulus: e.target.value}))} /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2 mt-6">
        <Button onClick={() => router.back()} variant="outline" size="lg" type="button">Batal</Button>
        <Button type="submit" size="lg" className="flex-grow" disabled={isSaving}>
          {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
        </Button>
      </div>
    </form>
  );
}
