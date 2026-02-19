
'use client';

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Shield, User, CheckCircle, Trash2, KeyRound, Edit, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc, Timestamp, updateDoc } from 'firebase/firestore';
import type { UserProfile, Pendidikan } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DatePickerDropdowns } from '@/components/ui/date-picker-dropdowns';


function UserEditForm({ user, onFormSubmit, isSaving }: { user: UserProfile, onFormSubmit: (data: Partial<UserProfile>) => void, isSaving: boolean }) {
  const [displayName, setDisplayName] = useState('');
  const [emailCorporate, setEmailCorporate] = useState('');
  const [nikKaryawan, setNikKaryawan] = useState('');
  const [nikKtp, setNikKtp] = useState('');
  const [noHpTsel, setNoHpTsel] = useState('');
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
  const [paymentInfo, setPaymentInfo] = useState('');
  const [telegramId, setTelegramId] = useState('');
  const [telegramUsername, setTelegramUsername] = useState('');
  const [devisi, setDevisi] = useState('');
  const [unit, setUnit] = useState('');
  const [psa, setPsa] = useState('');
  
  useEffect(() => {
    if (user) {
        setDisplayName(user.displayName || '');
        setEmailCorporate(user.emailCorporate || '');
        setNikKaryawan(user.nik || '');
        setNikKtp(user.nikKtp || '');
        setNoHpTsel(user.noHpTsel || '');
        setJabatan(user.jabatan || '');
        setJobDescHrmista(user.jobDescHrmista || '');
        setJobDescLapangan(user.jobDescLapangan || '');
        setAlamat(user.alamat || '');
        setTempatLahir(user.tempatLahir || '');
        setTanggalLahir(user.tanggalLahir?.toDate());
        setGolonganDarah(user.golonganDarah || '');
        setStatusPernikahan(user.statusPernikahan);
        setJumlahAnak(user.jumlahAnak?.toString() || '');
        setNoSimA(user.noSimA || '');
        setNoSimC(user.noSimC || '');
        setMasaBerlakuSimA(user.masaBerlakuSimA?.toDate());
        setMasaBerlakuSimC(user.masaBerlakuSimC?.toDate());
        setTanggalMasukKerja(user.tanggalMasukKerja?.toDate());
        setTinggiBadan(user.tinggiBadan?.toString() || '');
        setBeratBadan(user.beratBadan?.toString() || '');
        setNoBpjsKetenagakerjaan(user.noBpjsKetenagakerjaan || '');
        setNoBpjsKesehatan(user.noBpjsKesehatan || '');
        setPendidikanTerakhir(user.pendidikanTerakhir || { institusi: '', jurusan: '', tahunLulus: '' });
        setLabor(user.labor || '');
        setUkuranBaju(user.ukuranBaju || '');
        setUkuranCelana(user.ukuranCelana || '');
        setUkuranSepatu(user.ukuranSepatu || '');
        setPaymentInfo(user.paymentInfo || '');
        setTelegramId(user.telegramId || '');
        setTelegramUsername(user.telegramUsername || '');
        setDevisi(user.devisi || '');
        setUnit(user.unit || '');
        setPsa(user.psa || '');
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedData: { [key: string]: any } = {
        displayName, emailCorporate, nik: nikKaryawan, nikKtp, noHpTsel, jabatan,
        jobDescHrmista, jobDescLapangan, alamat, tempatLahir, golonganDarah, paymentInfo,
        noSimA, noSimC, labor, ukuranBaju, ukuranCelana, ukuranSepatu,
        noBpjsKetenagakerjaan, noBpjsKesehatan, pendidikanTerakhir,
        telegramId, telegramUsername, devisi, unit, psa,
    };
    
    // Only set the field if a value has been selected.
    if (statusPernikahan) {
      updatedData.statusPernikahan = statusPernikahan;
    }
    
    const hasChildren = ['menikah', 'duda', 'janda'].includes(statusPernikahan || '');
    if (hasChildren && jumlahAnak) {
      updatedData.jumlahAnak = Number(jumlahAnak);
    } else if (!hasChildren) {
      updatedData.jumlahAnak = 0;
    }
    
    // Only include numeric values if they are not empty strings.
    if (tinggiBadan) updatedData.tinggiBadan = Number(tinggiBadan);
    if (beratBadan) updatedData.beratBadan = Number(beratBadan);
    
    // Only include dates if they are defined to avoid overwriting with null.
    if (tanggalLahir) updatedData.tanggalLahir = Timestamp.fromDate(tanggalLahir);
    if (masaBerlakuSimA) updatedData.masaBerlakuSimA = Timestamp.fromDate(masaBerlakuSimA);
    if (masaBerlakuSimC) updatedData.masaBerlakuSimC = Timestamp.fromDate(masaBerlakuSimC);
    if (tanggalMasukKerja) updatedData.tanggalMasukKerja = Timestamp.fromDate(tanggalMasukKerja);

    onFormSubmit(updatedData);
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 py-4 max-h-[70vh] overflow-y-auto pr-4">
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
                  <div className="flex items-center space-x-2"><RadioGroupItem value="lajang" id="lajang-admin" /><Label htmlFor="lajang-admin">Lajang</Label></div>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="menikah" id="menikah-admin" /><Label htmlFor="menikah-admin">Menikah</Label></div>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="duda" id="duda-admin" /><Label htmlFor="duda-admin">Duda</Label></div>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="janda" id="janda-admin" /><Label htmlFor="janda-admin">Janda</Label></div>
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
              <div className="grid gap-2"><Label htmlFor="emailCorporate">Email Coorporate</Label><Input id="emailCorporate" type="email" value={emailCorporate} onChange={e => setEmailCorporate(e.target.value)} /></div>
               <div className="grid gap-2"><Label htmlFor="nikKaryawan">NIK Karyawan</Label><Input id="nikKaryawan" value={nikKaryawan} onChange={e => setNikKaryawan(e.target.value)} /></div>
            </div>
             <div className="grid md:grid-cols-2 gap-4">
                <div className="grid gap-2"><Label htmlFor="noHpTsel">No. HP Aktif TSEL</Label><Input id="noHpTsel" value={noHpTsel} onChange={e => setNoHpTsel(e.target.value)} /></div>
                <div className="grid gap-2"><Label htmlFor="tanggalMasukKerja">Tanggal Masuk Kerja</Label>
                    <DatePickerDropdowns
                        value={tanggalMasukKerja}
                        onChange={setTanggalMasukKerja}
                        fromYear={2000}
                        toYear={new Date().getFullYear()}
                    />
                </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="grid gap-2"><Label htmlFor="telegramId">ID Telegram</Label><Input id="telegramId" value={telegramId} onChange={e => setTelegramId(e.target.value)} placeholder="Contoh: 123456789" /></div>
              <div className="grid gap-2"><Label htmlFor="telegramUsername">Username Telegram</Label><Input id="telegramUsername" value={telegramUsername} onChange={e => setTelegramUsername(e.target.value)} placeholder="Contoh: @username" /></div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="grid gap-2"><Label htmlFor="jabatan">Jabatan</Label><Input id="jabatan" value={jabatan} onChange={e => setJabatan(e.target.value)} /></div>
              <div className="grid gap-2"><Label htmlFor="labor">Labor</Label><Input id="labor" value={labor} onChange={e => setLabor(e.target.value)} /></div>
            </div>
             <div className="grid md:grid-cols-3 gap-4">
                <div className="grid gap-2"><Label htmlFor="devisi-admin">DEVISI</Label><Input id="devisi-admin" value={devisi} onChange={e => setDevisi(e.target.value)} /></div>
                <div className="grid gap-2"><Label htmlFor="unit-admin">UNIT</Label><Input id="unit-admin" value={unit} onChange={e => setUnit(e.target.value)} /></div>
                <div className="grid gap-2"><Label htmlFor="psa-admin">PSA</Label><Input id="psa-admin" value={psa} onChange={e => setPsa(e.target.value)} /></div>
            </div>
            <div className="grid gap-2"><Label htmlFor="jobDescHrmista">Job Desk di HRMISTA</Label><Textarea id="jobDescHrmista" value={jobDescHrmista} onChange={e => setJobDescHrmista(e.target.value)} /></div>
            <div className="grid gap-2"><Label htmlFor="jobDescLapangan">Job Desk Lapangan</Label><Textarea id="jobDescLapangan" value={jobDescLapangan} onChange={e => setJobDescLapangan(e.target.value)} /></div>
          </CardContent>
        </Card>

         {/* Pendidikan */}
        <Card><CardHeader><CardTitle>Pendidikan Terakhir</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2"><Label htmlFor="institusi">Nama Institusi/Sekolah</Label><Input id="institusi" value={pendidikanTerakhir.institusi} onChange={e => setPendidikanTerakhir(p => ({...p, institusi: e.target.value}))} /></div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="grid gap-2"><Label htmlFor="jurusan">Jurusan</Label><Input id="jurusan" value={pendidikanTerakhir.jurusan} onChange={e => setPendidikanTerakhir(p => ({...p, jurusan: e.target.value}))} /></div>
              <div className="grid gap-2"><Label htmlFor="tahunLulus">Tahun Lulus</Label><Input id="tahunLulus" value={pendidikanTerakhir.tahunLulus} onChange={e => setPendidikanTerakhir(p => ({...p, tahunLulus: e.target.value}))} /></div>
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
      <DialogFooter>
        <DialogClose asChild><Button type="button" variant="secondary">Batal</Button></DialogClose>
        <Button type="submit" disabled={isSaving}>
            {isSaving ? <Loader2 className="animate-spin" /> : 'Simpan'}
        </Button>
      </DialogFooter>
    </form>
  );
}

function UserActions({ userToManage, currentUserId, onEdit }: { userToManage: UserProfile, currentUserId: string, onEdit: (user: UserProfile) => void }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isAccessDialogOpen, setIsAccessDialogOpen] = useState(false);
  const [selectedAccess, setSelectedAccess] = useState<'nota' | 'allpro' | 'all'>('nota');

  const handleUpdate = async (data: Partial<UserProfile>) => {
    const userDocRef = doc(firestore, 'users', userToManage.id);
    try {
      await updateDoc(userDocRef, data);
      toast({
        title: 'User Updated',
        description: `User ${userToManage.email} has been updated.`,
      });
    } catch(error) {
        console.error("Failed to update user from actions:", error);
        toast({
            variant: 'destructive',
            title: 'Update Failed',
            description: 'Could not update user. Please try again.'
        });
    }
  };
  
  const handleDeleteUser = async () => {
    const userDocRef = doc(firestore, 'users', userToManage.id);
    try {
        await updateDoc(userDocRef, { registrationStatus: 'deleted' }); // Soft delete
        toast({
         title: 'User Deactivated',
         description: `The profile for ${userToManage.email} has been deactivated. They can no longer log in.`,
         duration: 7000
       });
    } catch (error) {
        console.error('Failed to delete user profile:', error);
        toast({
            variant: 'destructive',
            title: 'Deactivation Failed',
            description: 'Could not deactivate the user profile.'
        });
    }
  }

  const handleApprove = async () => {
    await handleUpdate({ registrationStatus: 'approved', appAccess: selectedAccess });
    setIsApproveDialogOpen(false);
  }

  const handleChangeAccess = async () => {
    await handleUpdate({ appAccess: selectedAccess });
    setIsAccessDialogOpen(false);
  }
  
  if (userToManage.id === currentUserId) {
      return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button aria-haspopup="true" size="icon" variant="ghost">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
           <DropdownMenuItem onSelect={() => onEdit(userToManage)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Data HR
            </DropdownMenuItem>
          {userToManage.registrationStatus === 'pending' && (
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsApproveDialogOpen(true); }}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve User
            </DropdownMenuItem>
          )}

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Shield className="mr-2 h-4 w-4" />
              Set Role
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => handleUpdate({ role: 'admin' })}>Admin</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleUpdate({ role: 'korlap' })}>Korlap</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleUpdate({ role: 'teknisi' })}>Teknisi</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          
           {userToManage.registrationStatus === 'approved' && (
             <DropdownMenuItem onSelect={(e) => {
                e.preventDefault();
                setSelectedAccess(userToManage.appAccess || 'nota');
                setIsAccessDialogOpen(true);
             }}>
                <KeyRound className="mr-2 h-4 w-4" />
                Ubah Akses
            </DropdownMenuItem>
           )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Deactivate User
                </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action will deactivate the user account, preventing them from logging in. This is reversible by an admin. This is safer than permanent deletion.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Continue</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
              <AlertDialogTitle>Approve User: {userToManage.email}</AlertDialogTitle>
              <AlertDialogDescription>
                  Pilih tingkat akses yang akan diberikan kepada pengguna ini setelah disetujui.
              </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="py-4">
                  <RadioGroup defaultValue="nota" onValueChange={(value: 'nota' | 'allpro' | 'all') => setSelectedAccess(value)}>
                      <div className="flex items-center space-x-2">
                          <RadioGroupItem value="nota" id="r1-approve" />
                          <Label htmlFor="r1-approve">Hanya Nota (Finance)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                          <RadioGroupItem value="allpro" id="r2-approve" />
                          <Label htmlFor="r2-approve">Hanya Aset (Teknis)</Label>
                      </div>
                       <div className="flex items-center space-x-2">
                          <RadioGroupItem value="all" id="r3-approve" />
                          <Label htmlFor="r3-approve">Akses Semua (Nota & Aset)</Label>
                      </div>
                  </RadioGroup>
              </div>
              <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={handleApprove}>Setujui Pengguna</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

       <AlertDialog open={isAccessDialogOpen} onOpenChange={setIsAccessDialogOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
              <AlertDialogTitle>Ubah Akses untuk: {userToManage.email}</AlertDialogTitle>
              <AlertDialogDescription>
                  Pilih tingkat akses baru untuk pengguna ini.
              </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="py-4">
                  <RadioGroup value={selectedAccess} onValueChange={(value: 'nota' | 'allpro' | 'all') => setSelectedAccess(value)}>
                      <div className="flex items-center space-x-2">
                          <RadioGroupItem value="nota" id="r1-change" />
                          <Label htmlFor="r1-change">Hanya Nota (Finance)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                          <RadioGroupItem value="allpro" id="r2-change" />
                          <Label htmlFor="r2-change">Hanya Aset (Teknis)</Label>
                      </div>
                       <div className="flex items-center space-x-2">
                          <RadioGroupItem value="all" id="r3-change" />
                          <Label htmlFor="r3-change">Akses Semua (Nota & Aset)</Label>
                      </div>
                  </RadioGroup>
              </div>
              <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={handleChangeAccess}>Simpan Perubahan</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function AdminUsersPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;
  
  const [userToEdit, setUserToEdit] = useState<UserProfile | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { data: currentUserProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(
    useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore])
  );

  useEffect(() => {
    if (!isUserLoading && !isProfileLoading) {
      if (!user || currentUserProfile?.role !== 'admin') {
        router.push('/dashboard');
      }
    }
  }, [user, currentUserProfile, isUserLoading, isProfileLoading, router]);

  const usersQuery = useMemoFirebase(() => {
      if (currentUserProfile?.role === 'admin') {
          return query(collection(firestore, 'users'));
      }
      return null;
  }, [firestore, currentUserProfile?.role]);

  const { data: users, isLoading: areUsersLoading } = useCollection<UserProfile>(usersQuery);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    const activeUsers = users.filter(u => u.registrationStatus !== 'deleted');

    if (!searchQuery) return activeUsers;

    const lowercasedQuery = searchQuery.toLowerCase();
    return activeUsers.filter(user => {
      const paymentValue = user.paymentInfo || (user as any).phone;
      return user.email?.toLowerCase().includes(lowercasedQuery) ||
        user.displayName?.toLowerCase().includes(lowercasedQuery) ||
        user.nik?.toLowerCase().includes(lowercasedQuery) ||
        (paymentValue && paymentValue.toLowerCase().includes(lowercasedQuery)) ||
        user.jabatan?.toLowerCase().includes(lowercasedQuery);
    });
  }, [users, searchQuery]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  }, [filteredUsers]);

  const paginatedUsers = useMemo(() => {
      const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE;
      return filteredUsers.slice(startIndex, endIndex);
  }, [filteredUsers, currentPage]);
  
  const handleEditUser = (user: UserProfile) => {
    setUserToEdit(user);
  };
  
  const handleFormSubmit = async (data: Partial<UserProfile>) => {
    if (!userToEdit) return;
    setIsSaving(true);
    
    const userDocRef = doc(firestore, 'users', userToEdit.id);
    
    try {
      await updateDoc(userDocRef, data);
      toast({
        title: 'User Data Updated',
        description: `Data untuk ${userToEdit.email} telah diperbarui.`,
      });
      setUserToEdit(null);
    } catch (error) {
      console.error("Failed to update user:", error);
      toast({
        variant: "destructive",
        title: "Update Gagal",
        description: "Gagal memperbarui data pengguna. Silakan coba lagi."
      });
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = isUserLoading || isProfileLoading || areUsersLoading;

  if (isLoading) {
      return (
          <div>
              <div className="flex items-center justify-between mb-8">
                  <div>
                      <Skeleton className="h-8 w-64 mb-2" />
                      <Skeleton className="h-5 w-80" />
                  </div>
              </div>
              <Card>
                  <CardHeader>
                        <Skeleton className="h-7 w-32" />
                        <Skeleton className="h-4 w-64" />
                  </CardHeader>
                  <CardContent className="p-6">
                      <Skeleton className="h-12 w-full mb-4" />
                      <Skeleton className="h-10 w-full mb-2" />
                      <Skeleton className="h-10 w-full" />
                  </CardContent>
              </Card>
          </div>
      )
  }

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Manajemen User
          </h1>
          <p className="text-muted-foreground mt-1">
            Setujui pengguna baru, kelola peran, dan perbarui data HR di sini.
          </p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Semua Pengguna</CardTitle>
          <CardDescription>
            Daftar semua pengguna yang terdaftar di sistem.
          </CardDescription>
           <div className="pt-4">
            <Input
              placeholder="Cari berdasarkan nama, email, NIK, No. Pembayaran, atau jabatan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-lg"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama / Email</TableHead>
                <TableHead>NIK</TableHead>
                <TableHead>No. Pembayaran</TableHead>
                <TableHead>Jabatan</TableHead>
                <TableHead>Peran</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Akses App</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers && paginatedUsers.length > 0 ? (
                paginatedUsers.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                        <div className="font-semibold">{u.displayName || 'No Name'}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                    </TableCell>
                    <TableCell>{u.nik || '-'}</TableCell>
                    <TableCell>{u.paymentInfo || (u as any).phone || '-'}</TableCell>
                    <TableCell>{u.jabatan || '-'}</TableCell>
                     <TableCell className="capitalize">
                      <Badge variant={u.role === 'admin' ? 'destructive' : u.role === 'korlap' ? 'secondary' : 'outline'}>
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.registrationStatus === 'approved' ? 'default' : 'secondary'} className="capitalize">
                        {u.registrationStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">
                       {u.registrationStatus === 'approved' && (() => {
                          switch (u.appAccess) {
                              case 'nota':
                                  return <Badge variant="secondary">Nota</Badge>;
                              case 'allpro':
                                  return <Badge variant="outline" className="text-blue-600 border-blue-600">Aset</Badge>;
                              case 'all':
                                  return <Badge variant="default">Semua</Badge>;
                              default:
                                  return null;
                          }
                      })()}
                    </TableCell>
                    <TableCell className="text-right">
                       {user && <UserActions userToManage={u} currentUserId={user.uid} onEdit={handleEditUser} />}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    Tidak ada pengguna ditemukan.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
         <CardFooter>
            <div className="text-xs text-muted-foreground">
                Halaman <strong>{totalPages > 0 ? currentPage : 0}</strong> dari <strong>{totalPages}</strong>
            </div>
            <div className="flex items-center gap-2 ml-auto">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1 || totalPages === 0}
                >
                    <ChevronLeft className="h-4 w-4" />
                    Sebelumnya
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages || totalPages === 0}
                >
                    Berikutnya
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </CardFooter>
      </Card>
      
      {userToEdit && (
        <Dialog open={!!userToEdit} onOpenChange={(open) => !open && setUserToEdit(null)}>
            <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                <DialogTitle>Edit Data HR: {userToEdit.displayName}</DialogTitle>
                <DialogDescription>
                    Perbarui informasi untuk pengguna {userToEdit.email}.
                </DialogDescription>
                </DialogHeader>
                <UserEditForm user={userToEdit} onFormSubmit={handleFormSubmit} isSaving={isSaving} />
            </DialogContent>
        </Dialog>
      )}
    </>
  );
}

    
