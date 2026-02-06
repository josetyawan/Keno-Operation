'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, CalendarIcon, Camera, Upload } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useFirestore, addDocumentNonBlocking, useUser, useStorage, useDoc, useMemoFirebase } from '@/firebase';
import { collection, serverTimestamp, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { Nota, UserProfile } from '@/lib/types';

function PhotoUpload({
  id,
  label,
  file,
  onFileChange,
}: {
  id: string;
  label: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
}) {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      onFileChange(event.target.files[0]);
    }
  };

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative flex justify-center items-center h-32 w-full rounded-md border-2 border-dashed border-muted-foreground/50">
        <input
          type="file"
          id={id}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleFileChange}
          accept="image/*"
        />
        {file ? (
          <p className="text-sm text-center p-2 break-all">{file.name}</p>
        ) : (
          <div className="text-center text-muted-foreground">
            <Upload className="mx-auto h-8 w-8" />
            <span className="text-sm">Upload</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function NewNotaPage() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const storage = useStorage();
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [tanggal, setTanggal] = useState<Date | undefined>();
  const [segmen, setSegmen] = useState('');
  const [serviceArea, setServiceArea] = useState('');
  const [noPlatKendaraan, setNoPlatKendaraan] = useState('');
  const [kmAwal, setKmAwal] = useState('');
  const [kmAkhir, setKmAkhir] = useState('');
  const [namaBarang, setNamaBarang] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [nominal, setNominal] = useState('');
  const [namaPic, setNamaPic] = useState('');
  const [files, setFiles] = useState<(File | null)[]>(Array(7).fill(null));

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

  useEffect(() => {
      if (userProfile?.displayName) {
          setNamaPic(userProfile.displayName);
      }
  }, [userProfile]);

  const serviceAreas = ['SA KUDUS', 'SA PATI', 'SA JEPARA', 'SA PURWODADI', 'SA BLORA'];
  const bbmKendaraanSegments = [
    'BBM R2 Harian B2B IOAN',
    'BBM R2 Harian PROVISIONING',
    'BBM R4 Harian B2B IOAN',
    'BBM R4 Harian PROVISIONING',
    'BBM R4 Turlap B2B IOAN',
    'BBM R4 Turlap PROVISIONING',
    'BBM R4 UT B2B IOAN',
    'BBM R4 UT PROVISIONING',
  ];
  const nonBbmKendaraanSegments = [
    'Pembelian Material Non stok B2B IOAN',
    'Pembelian Material Non stok PROVISIONING',
    'Perincian Nota ATK',
    'BBM Genset',
    'jasa B2B IOAN',
    'jasa PROVISIONING',
    'Perincian Nota Pengiriman B2B IOAN',
    'Perincian Nota Pengiriman PROVISIONING',
    'Perincian Nota Pengiriman Warehouse',
    'Konsumsi Turlap B2B IOAN',
    'Konsumsi Turlap PROVISIONING',
    'Konsumsi UT B2B IOAN',
    'Konsumsi UT PROVISIONING',
    'Konsumsi Lembur B2B IOAN',
    'Konsumsi Lembur PROVISIONING',
    'MATERIAL SPPG',
    'ISI PANTRY',
  ];
  
  const isBBMKendaraan = segmen && bbmKendaraanSegments.includes(segmen);
  const isNonBBMKendaraan = segmen && nonBbmKendaraanSegments.includes(segmen);

  const photoUploadSlots = [
    { id: 'foto1', bbmLabel: 'Foto Keperluan 1', nonBbmLabel: 'Foto Eviden 1', isBbmOnly: false },
    { id: 'foto2', bbmLabel: 'Foto Keperluan 2', nonBbmLabel: 'Foto Eviden 2', isBbmOnly: false },
    { id: 'foto3', bbmLabel: 'Foto Keperluan 3', nonBbmLabel: 'Foto Eviden 3', isBbmOnly: false },
    { id: 'foto4', bbmLabel: 'Foto Keperluan 4', nonBbmLabel: 'Foto Eviden 4', isBbmOnly: false },
    { id: 'foto5', bbmLabel: 'Foto KM Awal Bulan', nonBbmLabel: '', isBbmOnly: true },
    { id: 'foto6', bbmLabel: 'Foto KM Awal', nonBbmLabel: '', isBbmOnly: true },
    { id: 'foto7', bbmLabel: 'Foto KM Akhir', nonBbmLabel: '', isBbmOnly: true },
  ];
  
  const handleSegmenChange = (value: string) => {
    setSegmen(value);
    // Reset fields that are not applicable to the new segmen
    if (!bbmKendaraanSegments.includes(value)) {
      setNoPlatKendaraan('');
      setKmAwal('');
      setKmAkhir('');
    }
    
    if (value.startsWith('Pembelian Material Non stok')) {
        setKeterangan('Pembelian Material Non stok');
    } else if (value === 'MATERIAL SPPG') {
        setKeterangan('Material SPPG');
    } else {
        // If switching away from a static segment, clear the text area
        if (keterangan.startsWith('Pembelian Material Non stok') || keterangan === 'Material SPPG') {
            setKeterangan('');
        }
    }
  };

  const handleFileChange = (index: number, file: File | null) => {
    const newFiles = [...files];
    newFiles[index] = file;
    setFiles(newFiles);
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    
    if (!user || !user.uid || !user.email) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'User session not found. Please log out and log back in, then try again.',
      });
      setIsSaving(false);
      return;
    }
    
    let isFormValid = !!(tanggal && segmen && serviceArea && nominal && namaPic);
    if (isBBMKendaraan) {
        isFormValid = isFormValid && !!(noPlatKendaraan && kmAwal && kmAkhir);
    }
    
    if (!isFormValid) {
      toast({
        variant: 'destructive',
        title: 'Incomplete Form',
        description: 'Please fill out all required fields for the selected segment.',
      });
      setIsSaving(false);
      return;
    }

    try {
      const uploadPromises = files
        .filter((file): file is File => file !== null)
        .map(async (file) => {
          const fileExtension = file.name.split('.').pop();
          const fileName = `${user.uid}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExtension}`;
          const filePath = `notas/${user.uid}/${fileName}`;
          const storageRef = ref(storage, filePath);
          
          await uploadBytes(storageRef, file);
          const downloadURL = await getDownloadURL(storageRef);
          return downloadURL;
        });

      const uploadedUrls = await Promise.all(uploadPromises);

      const notasCollection = collection(firestore, 'notas');

      const newNota: Partial<Nota> = {
        userId: user.uid,
        userEmail: user.email,
        tanggal: tanggal,
        segmen,
        serviceArea,
        keterangan,
        nominal: Number(nominal),
        namaPic,
        fotoEvidenUrls: uploadedUrls,
        dateCreated: serverTimestamp(),
        status: 'pending',
      };

      if (isBBMKendaraan) {
          newNota.noPlatKendaraan = noPlatKendaraan;
          newNota.kmAwal = Number(kmAwal);
          newNota.kmAkhir = Number(kmAkhir);
      }
      
      if(isNonBBMKendaraan) {
          newNota.namaBarang = namaBarang;
      }

      addDocumentNonBlocking(notasCollection, newNota);

      toast({
        title: 'Laporan Dibuat!',
        description: 'Laporan baru Anda telah berhasil disimpan.',
      });

      router.push('/dashboard');
    } catch (error) {
      console.error("Error creating nota:", error);
      toast({
        variant: "destructive",
        title: "Gagal Menyimpan",
        description: "Terjadi kesalahan saat mengunggah gambar atau menyimpan laporan. Silakan coba lagi.",
      });
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto grid w-full flex-1 auto-rows-max gap-4">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-4 mb-4">
          <Button onClick={() => router.back()} variant="ghost" size="icon" className="h-8 w-8" type="button">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Kembali</span>
          </Button>
          <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-bold tracking-tight sm:grow-0">
            Input Laporan Nota
          </h1>
          <div className="hidden items-center gap-2 md:ml-auto md:flex">
            <Button onClick={() => router.back()} variant="outline" type="button">
              Batal
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Menyimpan...' : 'Simpan Laporan'}
            </Button>
          </div>
        </div>
        <Card>
          <CardHeader className="bg-primary text-primary-foreground p-4 rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <Camera /> Input Laporan Nota
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="grid gap-3">
                  <Label htmlFor="tanggal">Tanggal *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={'outline'}
                        className={cn(
                          'justify-start text-left font-normal',
                          !tanggal && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {tanggal ? format(tanggal, 'dd/MM/yyyy') : <span>Pilih tanggal</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={tanggal}
                        onSelect={setTanggal}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                 <div className="grid gap-3">
                  <Label htmlFor="serviceArea">Service Area *</Label>
                  <Select onValueChange={setServiceArea} value={serviceArea} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih service area" />
                    </SelectTrigger>
                    <SelectContent>
                        {serviceAreas.map(sa => <SelectItem key={sa} value={sa}>{sa}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
               <div className="grid gap-3">
                  <Label htmlFor="segmen">Segmen *</Label>
                  <Select onValueChange={handleSegmenChange} value={segmen} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih segmen" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="BBM R2 Harian B2B IOAN">BBM R2 Harian B2B IOAN</SelectItem>
                        <SelectItem value="BBM R2 Harian PROVISIONING">BBM R2 Harian PROVISIONING</SelectItem>
                        <SelectItem value="BBM R4 Harian B2B IOAN">BBM R4 Harian B2B IOAN</SelectItem>
                        <SelectItem value="BBM R4 Harian PROVISIONING">BBM R4 Harian PROVISIONING</SelectItem>
                        <SelectItem value="BBM R4 Turlap B2B IOAN">BBM R4 Turlap B2B IOAN</SelectItem>
                        <SelectItem value="BBM R4 Turlap PROVISIONING">BBM R4 Turlap PROVISIONING</SelectItem>
                        <SelectItem value="BBM R4 UT B2B IOAN">BBM R4 UT B2B IOAN</SelectItem>
                        <SelectItem value="BBM R4 UT PROVISIONING">BBM R4 UT PROVISIONING</SelectItem>
                        <SelectItem value="Pembelian Material Non stok B2B IOAN">Pembelian Material Non stok B2B IOAN</SelectItem>
                        <SelectItem value="Pembelian Material Non stok PROVISIONING">Pembelian Material Non stok PROVISIONING</SelectItem>
                        <SelectItem value="Perincian Nota ATK">Perincian Nota ATK</SelectItem>
                        <SelectItem value="BBM Genset">BBM Genset</SelectItem>
                        <SelectItem value="jasa B2B IOAN">jasa B2B IOAN</SelectItem>
                        <SelectItem value="jasa PROVISIONING">jasa PROVISIONING</SelectItem>
                        <SelectItem value="Perincian Nota Pengiriman B2B IOAN">Perincian Nota Pengiriman B2B IOAN</SelectItem>
                        <SelectItem value="Perincian Nota Pengiriman PROVISIONING">Perincian Nota Pengiriman PROVISIONING</SelectItem>
                        <SelectItem value="Perincian Nota Pengiriman Warehouse">Perincian Nota Pengiriman Warehouse</SelectItem>
                        <SelectItem value="Konsumsi Turlap B2B IOAN">Konsumsi Turlap B2B IOAN</SelectItem>
                        <SelectItem value="Konsumsi Turlap PROVISIONING">Konsumsi Turlap PROVISIONING</SelectItem>
                        <SelectItem value="Konsumsi UT B2B IOAN">Konsumsi UT B2B IOAN</SelectItem>
                        <SelectItem value="Konsumsi UT PROVISIONING">Konsumsi UT PROVISIONING</SelectItem>
                        <SelectItem value="Konsumsi Lembur B2B IOAN">Konsumsi Lembur B2B IOAN</SelectItem>
                        <SelectItem value="Konsumsi Lembur PROVISIONING">Konsumsi Lembur PROVISIONING</SelectItem>
                        <SelectItem value="MATERIAL SPPG">MATERIAL SPPG</SelectItem>
                        <SelectItem value="ISI PANTRY">ISI PANTRY</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

              {isBBMKendaraan && (
                <>
                  <div className="grid gap-3">
                    <Label htmlFor="noPlatKendaraan">No Plat Kendaraan *</Label>
                    <Input
                      id="noPlatKendaraan"
                      type="text"
                      placeholder="B 1234 ABC"
                      required={isBBMKendaraan}
                      value={noPlatKendaraan}
                      onChange={(e) => setNoPlatKendaraan(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="grid gap-3">
                          <Label htmlFor="kmAwal">KM Awal *</Label>
                          <Input
                              id="kmAwal"
                              type="number"
                              placeholder="10000"
                              required={isBBMKendaraan}
                              value={kmAwal}
                              onChange={(e) => setKmAwal(e.target.value)}
                          />
                      </div>
                      <div className="grid gap-3">
                          <Label htmlFor="kmAkhir">KM Akhir *</Label>
                          <Input
                              id="kmAkhir"
                              type="number"
                              placeholder="10050"
                              required={isBBMKendaraan}
                              value={kmAkhir}
                              onChange={(e) => setKmAkhir(e.target.value)}
                          />
                      </div>
                  </div>
                </>
              )}
              
              {isNonBBMKendaraan && (
                <div className="grid gap-3">
                    <Label htmlFor="namaBarang">{segmen.startsWith('jasa') || segmen.startsWith('Perincian Nota Pengiriman') ? 'Nama Jasa / Pengiriman' : 'Nama Barang'}</Label>
                    <Input
                        id="namaBarang"
                        type="text"
                        placeholder={segmen.startsWith('jasa') || segmen.startsWith('Perincian Nota Pengiriman') ? 'Contoh: Jasa perbaikan / Pengiriman barang' : 'Nama barang yang dibeli...'}
                        value={namaBarang}
                        onChange={(e) => setNamaBarang(e.target.value)}
                    />
                </div>
              )}

              <div className="grid gap-3">
                <Label htmlFor="keterangan">Keterangan</Label>
                <Textarea
                  id="keterangan"
                  placeholder="Keterangan tambahan..."
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  readOnly={keterangan.startsWith('Pembelian Material Non stok') || keterangan === 'Material SPPG'}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="grid gap-3">
                  <Label htmlFor="nominal">Nominal (Rp) *</Label>
                  <Input
                    id="nominal"
                    type="number"
                    placeholder="50000"
                    required
                    value={nominal}
                    onChange={(e) => setNominal(e.target.value)}
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="namaPic">Nama PIC *</Label>
                  <Input
                    id="namaPic"
                    type="text"
                    placeholder="Nama penanggung jawab"
                    required
                    value={namaPic}
                    readOnly
                    className="bg-muted/50"
                  />
                </div>
              </div>
              <div>
                <Label className="mb-3 block">Upload Foto Bukti</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {photoUploadSlots.map((slot, index) => (
                    <div
                      key={slot.id}
                      className={cn(slot.isBbmOnly && !isBBMKendaraan && 'hidden')}
                    >
                      <PhotoUpload
                        id={slot.id}
                        label={isBBMKendaraan ? slot.bbmLabel : slot.nonBbmLabel}
                        file={files[index]}
                        onFileChange={(file) => handleFileChange(index, file)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="flex items-center justify-end gap-2 mt-4 md:hidden">
          <Button onClick={() => router.back()} variant="outline" type="button">
            Batal
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Menyimpan...' : 'Simpan Laporan'}
          </Button>
        </div>
      </form>
    </div>
  );
}
