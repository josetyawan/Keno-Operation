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
import Link from 'next/link';
import { ArrowLeft, CalendarIcon, Camera, Upload } from 'lucide-react';
import { useState } from 'react';
import { useUser, useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { Nota } from '@/lib/types';

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
  const { user } = useUser();
  const firestore = useFirestore();
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [tanggal, setTanggal] = useState<Date | undefined>();
  const [segmen, setSegmen] = useState('');
  const [noPlatKendaraan, setNoPlatKendaraan] = useState('');
  const [kmAwal, setKmAwal] = useState('');
  const [kmAkhir, setKmAkhir] = useState('');
  const [namaBarang, setNamaBarang] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [nominal, setNominal] = useState('');
  const [namaPic, setNamaPic] = useState('');
  const [files, setFiles] = useState<(File | null)[]>(Array(7).fill(null));

  const bbmKendaraanSegments = ['BBM R2', 'BBM R4 Harian', 'BBM R4 Turlap', 'BBM R4 UT'];
  const nonBbmKendaraanSegments = ['Material', 'BBM Genset', 'jasa', 'Konsumsi Turlap', 'Konsumsi UT', 'Konsumsi Lembur', 'Material SPPG'];
  
  const isBBMKendaraan = segmen && bbmKendaraanSegments.includes(segmen);
  const isNonBBMKendaraan = segmen && nonBbmKendaraanSegments.includes(segmen);
  
  const handleSegmenChange = (value: string) => {
    setSegmen(value);
    // Reset fields that are not applicable to the new segmen
    if (!bbmKendaraanSegments.includes(value)) {
      setNoPlatKendaraan('');
      setKmAwal('');
      setKmAkhir('');
    }
    
    if (value === 'Material') {
        setKeterangan('Material SA Kudus');
    } else if (value === 'Material SPPG') {
        setKeterangan('Material SPPG SA Kudus');
    } else {
        // If switching away from a static segment, clear the text area
        if (keterangan === 'Material SA Kudus' || keterangan === 'Material SPPG SA Kudus') {
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
    if (!user || !user.email) {
      toast({
        variant: 'destructive',
        title: 'Not Authenticated',
        description: 'You must be logged in to create a report.',
      });
      return;
    }
    
    // Dynamic validation
    let isFormValid = !!(tanggal && segmen && nominal && namaPic);
    if (isBBMKendaraan) {
        isFormValid = isFormValid && !!(noPlatKendaraan && kmAwal && kmAkhir);
    }
    
    if (!isFormValid) {
      toast({
        variant: 'destructive',
        title: 'Incomplete Form',
        description: 'Please fill out all required fields for the selected segment.',
      });
      return;
    }

    setIsSaving(true);

    const notasCollection = collection(firestore, 'notas');

    // Note: File upload logic is not implemented. We are saving an empty array for URLs.
    const newNota: Partial<Nota> = {
      userId: user.uid,
      userEmail: user.email,
      tanggal: tanggal,
      segmen,
      keterangan,
      nominal: Number(nominal),
      namaPic,
      fotoEvidenUrls: [], // Placeholder for file URLs
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

    // Redirect immediately, optimistic update
    router.push('/dashboard');
  }

  return (
    <div className="mx-auto grid w-full flex-1 auto-rows-max gap-4">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-4 mb-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="h-8 w-8" type="button">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Kembali</span>
            </Button>
          </Link>
          <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-bold tracking-tight sm:grow-0">
            Input Laporan Nota
          </h1>
          <div className="hidden items-center gap-2 md:ml-auto md:flex">
            <Link href="/dashboard">
              <Button variant="outline" type="button">
                Batal
              </Button>
            </Link>
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
                  <Label htmlFor="segmen">Segmen *</Label>
                  <Select onValueChange={handleSegmenChange} value={segmen} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih segmen" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="BBM R2">BBM R2</SelectItem>
                        <SelectItem value="BBM R4 Harian">BBM R4 Harian</SelectItem>
                        <SelectItem value="BBM R4 Turlap">BBM R4 Turlap</SelectItem>
                        <SelectItem value="BBM R4 UT">BBM R4 UT</SelectItem>
                        <SelectItem value="Material">Material</SelectItem>
                        <SelectItem value="BBM Genset">BBM Genset</SelectItem>
                        <SelectItem value="jasa">Jasa</SelectItem>
                        <SelectItem value="Konsumsi Turlap">Konsumsi Turlap</SelectItem>
                        <SelectItem value="Konsumsi UT">Konsumsi UT</SelectItem>
                        <SelectItem value="Konsumsi Lembur">Konsumsi Lembur</SelectItem>
                        <SelectItem value="Material SPPG">Material SPPG</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                    <Label htmlFor="namaBarang">{segmen === 'jasa' ? 'Nama Jasa' : 'Nama Barang'}</Label>
                    <Input
                        id="namaBarang"
                        type="text"
                        placeholder={segmen === 'jasa' ? 'Contoh: Jasa perbaikan AC' : 'Nama barang yang dibeli...'}
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
                  readOnly={segmen === 'Material' || segmen === 'Material SPPG'}
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
                    onChange={(e) => setNamaPic(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label className="mb-3 block">Upload Foto Bukti</Label>
                {isBBMKendaraan ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <PhotoUpload
                      id="foto1"
                      label="Foto Keperluan 1"
                      file={files[0]}
                      onFileChange={(file) => handleFileChange(0, file)}
                    />
                    <PhotoUpload
                      id="foto2"
                      label="Foto Keperluan 2"
                      file={files[1]}
                      onFileChange={(file) => handleFileChange(1, file)}
                    />
                    <PhotoUpload
                      id="foto3"
                      label="Foto Keperluan 3"
                      file={files[2]}
                      onFileChange={(file) => handleFileChange(2, file)}
                    />
                    <PhotoUpload
                      id="foto4"
                      label="Foto Keperluan 4"
                      file={files[3]}
                      onFileChange={(file) => handleFileChange(3, file)}
                    />
                    <PhotoUpload
                      id="foto5"
                      label="Foto KM Awal Bulan"
                      file={files[4]}
                      onFileChange={(file) => handleFileChange(4, file)}
                    />
                    <PhotoUpload
                      id="foto6"
                      label="Foto KM Awal"
                      file={files[5]}
                      onFileChange={(file) => handleFileChange(5, file)}
                    />
                    <PhotoUpload
                      id="foto7"
                      label="Foto KM Akhir"
                      file={files[6]}
                      onFileChange={(file) => handleFileChange(6, file)}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <PhotoUpload
                      id="foto1"
                      label="Foto Eviden 1"
                      file={files[0]}
                      onFileChange={(file) => handleFileChange(0, file)}
                    />
                    <PhotoUpload
                      id="foto2"
                      label="Foto Eviden 2"
                      file={files[1]}
                      onFileChange={(file) => handleFileChange(1, file)}
                    />
                    <PhotoUpload
                      id="foto3"
                      label="Foto Eviden 3"
                      file={files[2]}
                      onFileChange={(file) => handleFileChange(2, file)}
                    />
                    <PhotoUpload
                      id="foto4"
                      label="Foto Eviden 4"
                      file={files[3]}
                      onFileChange={(file) => handleFileChange(3, file)}
                    />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="flex items-center justify-end gap-2 mt-4 md:hidden">
          <Link href="/dashboard">
            <Button variant="outline" type="button">
              Batal
            </Button>
          </Link>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Menyimpan...' : 'Simpan Laporan'}
          </Button>
        </div>
      </form>
    </div>
  );
}