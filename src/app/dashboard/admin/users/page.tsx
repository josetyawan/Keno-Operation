
'use client';

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
import { MoreHorizontal, Shield, User, CheckCircle, Trash2, KeyRound, Edit, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, useDoc, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, doc, Timestamp } from 'firebase/firestore';
import type { UserProfile, Pendidikan } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';


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
  const [statusPernikahan, setStatusPernikahan] = useState<'menikah' | 'lajang' | undefined>();
  const [jumlahAnak, setJumlahAnak] = useState('');
  const [noSimA, setNoSimA] = useState('');
  const [noSimC, setNoSimC] = useState('');
  const [masaBerlakuSim, setMasaBerlakuSim] = useState<Date | undefined>();
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
        setMasaBerlakuSim(user.masaBerlakuSim?.toDate());
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
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedData: Partial<UserProfile> = {
      displayName, emailCorporate, nik: nikKaryawan, nikKtp, noHpTsel, jabatan,
      jobDescHrmista, jobDescLapangan, alamat, tempatLahir, golonganDarah,
      statusPernikahan, noSimA, noSimC, labor, ukuranBaju, ukuranCelana, ukuranSepatu,
      noBpjsKetenagakerjaan, noBpjsKesehatan, pendidikanTerakhir,
      jumlahAnak: statusPernikahan === 'menikah' ? Number(jumlahAnak) || 0 : 0,
      tinggiBadan: Number(tinggiBadan) || 0,
      beratBadan: Number(beratBadan) || 0,
      tanggalLahir: tanggalLahir ? Timestamp.fromDate(tanggalLahir) : null,
      masaBerlakuSim: masaBerlakuSim ? Timestamp.fromDate(masaBerlakuSim) : null,
      tanggalMasukKerja: tanggalMasukKerja ? Timestamp.fromDate(tanggalMasukKerja) : null,
    };
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
                <Popover><PopoverTrigger asChild><Button variant={'outline'} className={cn('justify-start text-left font-normal', !tanggalLahir && 'text-muted-foreground')}>
                  <CalendarIcon className="mr-2 h-4 w-4" />{tanggalLahir ? format(tanggalLahir, 'dd MMMM yyyy') : <span>Pilih tanggal</span>}</Button></PopoverTrigger>
                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={tanggalLahir} onSelect={setTanggalLahir} captionLayout="dropdown-buttons" fromYear={1950} toYear={new Date().getFullYear()} initialFocus /></PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="grid gap-2"><Label htmlFor="alamat">Alamat Sesuai KTP</Label><Textarea id="alamat" value={alamat} onChange={e => setAlamat(e.target.value)} /></div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="grid gap-2"><Label htmlFor="golonganDarah">Golongan Darah</Label><Input id="golonganDarah" value={golonganDarah} onChange={e => setGolonganDarah(e.target.value)} /></div>
              <div className="grid gap-2"><Label>Status Pernikahan</Label>
                <RadioGroup value={statusPernikahan} onValueChange={(value: 'menikah' | 'lajang') => setStatusPernikahan(value)} className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2"><RadioGroupItem value="lajang" id="lajang" /><Label htmlFor="lajang">Lajang</Label></div>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="menikah" id="menikah" /><Label htmlFor="menikah">Menikah</Label></div>
                </RadioGroup>
              </div>
            </div>
            {statusPernikahan === 'menikah' && <div className="grid gap-2"><Label htmlFor="jumlahAnak">Jumlah Anak</Label><Input id="jumlahAnak" type="number" value={jumlahAnak} onChange={e => setJumlahAnak(e.target.value)} /></div>}
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
                    <Popover><PopoverTrigger asChild><Button variant={'outline'} className={cn('justify-start text-left font-normal', !tanggalMasukKerja && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />{tanggalMasukKerja ? format(tanggalMasukKerja, 'dd MMMM yyyy') : <span>Pilih tanggal</span>}</Button></PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={tanggalMasukKerja} onSelect={setTanggalMasukKerja} captionLayout="dropdown-buttons" fromYear={2000} toYear={new Date().getFullYear()} initialFocus /></PopoverContent>
                    </Popover>
                </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="grid gap-2"><Label htmlFor="jabatan">Jabatan</Label><Input id="jabatan" value={jabatan} onChange={e => setJabatan(e.target.value)} /></div>
              <div className="grid gap-2"><Label htmlFor="labor">Labor</Label><Input id="labor" value={labor} onChange={e => setLabor(e.target.value)} /></div>
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
            <div className="grid md:grid-cols-2 gap-4">
              <div className="grid gap-2"><Label htmlFor="noSimA">No. SIM A</Label><Input id="noSimA" value={noSimA} onChange={e => setNoSimA(e.target.value)} /></div>
              <div className="grid gap-2"><Label htmlFor="noSimC">No. SIM C</Label><Input id="noSimC" value={noSimC} onChange={e => setNoSimC(e.target.value)} /></div>
            </div>
             <div className="grid md:grid-cols-2 gap-4">
                {(noSimA || noSimC) && (
                    <div className="grid gap-2"><Label htmlFor="masaBerlakuSim">Masa Berlaku SIM</Label>
                        <Popover><PopoverTrigger asChild><Button variant={'outline'} className={cn('justify-start text-left font-normal', !masaBerlakuSim && 'text-muted-foreground')}>
                        <CalendarIcon className="mr-2 h-4 w-4" />{masaBerlakuSim ? format(masaBerlakuSim, 'dd MMMM yyyy') : <span>Pilih tanggal</span>}</Button></PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={masaBerlakuSim} onSelect={setMasaBerlakuSim} captionLayout="dropdown-buttons" fromYear={new Date().getFullYear()} toYear={new Date().getFullYear() + 10} initialFocus /></PopoverContent>
                        </Popover>
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

  const handleUpdate = (data: Partial<UserProfile>) => {
    const userDocRef = doc(firestore, 'users', userToManage.id);
    updateDocumentNonBlocking(userDocRef, data);
    toast({
      title: 'User Updated',
      description: `User ${userToManage.email} has been updated.`,
    });
  };
  
  const handleDeleteUser = () => {
    const userDocRef = doc(firestore, 'users', userToManage.id);
    deleteDocumentNonBlocking(userDocRef);
     toast({
      title: 'User Document Deleted',
      description: `The profile for ${userToManage.email} has been deleted. Please delete the user from the Firebase Authentication console to fully remove them.`,
      duration: 7000
    });
  }

  const handleApprove = () => {
    handleUpdate({ registrationStatus: 'approved', appAccess: selectedAccess });
    setIsApproveDialogOpen(false);
  }

  const handleChangeAccess = () => {
    handleUpdate({ appAccess: selectedAccess });
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
                    Delete User
                </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action only deletes the user's profile data from the application's database. The user's login account must be deleted manually from the Firebase Authentication console. This action cannot be undone.
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
  
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!searchQuery) return users;

    const lowercasedQuery = searchQuery.toLowerCase();
    return users.filter(user => 
      user.email?.toLowerCase().includes(lowercasedQuery) ||
      user.displayName?.toLowerCase().includes(lowercasedQuery) ||
      user.nik?.toLowerCase().includes(lowercasedQuery) ||
      user.nikKtp?.toLowerCase().includes(lowercasedQuery) ||
      user.noHpTsel?.toLowerCase().includes(lowercasedQuery) ||
      user.jabatan?.toLowerCase().includes(lowercasedQuery)
    );
  }, [users, searchQuery]);
  
  const handleEditUser = (user: UserProfile) => {
    setUserToEdit(user);
  };
  
  const handleFormSubmit = (data: Partial<UserProfile>) => {
    if (!userToEdit) return;
    setIsSaving(true);
    
    const userDocRef = doc(firestore, 'users', userToEdit.id);
    updateDocumentNonBlocking(userDocRef, data);
    
    toast({
      title: 'User Data Updated',
      description: `Data untuk ${userToEdit.email} telah diperbarui.`,
    });
    
    setIsSaving(false);
    setUserToEdit(null);
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
              placeholder="Cari berdasarkan nama, email, NIK, No. HP, atau jabatan..."
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
                <TableHead>NIK Karyawan</TableHead>
                <TableHead>NIK KTP</TableHead>
                <TableHead>No. HP</TableHead>
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
              {filteredUsers && filteredUsers.length > 0 ? (
                filteredUsers.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                        <div className="font-semibold">{u.displayName || 'No Name'}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                    </TableCell>
                    <TableCell>{u.nik || '-'}</TableCell>
                    <TableCell>{u.nikKtp || '-'}</TableCell>
                    <TableCell>{u.noHpTsel || '-'}</TableCell>
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
                  <TableCell colSpan={9} className="h-24 text-center">
                    Tidak ada pengguna ditemukan.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
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

    