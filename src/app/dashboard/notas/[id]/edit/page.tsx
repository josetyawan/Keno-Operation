'use client';

import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
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
import { ArrowLeft, CalendarIcon, Upload } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
import type { Nota, UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import Image from 'next/image';

// Simplified upload component for edit page
function PhotoUpload({
  id,
  label,
  onFileChange,
  existingImageUrl
}: {
  id: string;
  label: string;
  onFileChange: (file: File | null) => void;
  existingImageUrl?: string;
}) {

  const [preview, setPreview] = useState<string | null>(existingImageUrl || null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileChange(file);
      setPreview(URL.createObjectURL(file));
    }
  };
  
  useEffect(() => {
    setPreview(existingImageUrl || null);
  }, [existingImageUrl]);

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative flex justify-center items-center h-32 w-full rounded-md border-2 border-dashed border-muted-foreground/50 overflow-hidden">
        <input
          type="file"
          id={id}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleFileChange}
          accept="image/*"
        />
        {preview ? (
            <Image src={preview} alt={label} fill className="object-cover" />
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


export default function EditNotaPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
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

  // Get user profile to check for admin role
  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);
  const isAdmin = userProfile?.role === 'admin';

  // Get the nota document
  const notaRef = useMemoFirebase(() => {
    if (!firestore || !id) return null;
    return doc(firestore, 'notas', id);
  }, [firestore, id]);

  const { data: nota, isLoading: isNotaLoading } = useDoc<Nota>(notaRef);

  // Populate form when nota data is loaded
  useEffect(() => {
    if (nota) {
      setTanggal(nota.tanggal?.toDate());
      setSegmen(nota.segmen);
      setNoPlatKendaraan(nota.noPlatKendaraan || '');
      setKmAwal(nota.kmAwal?.toString() || '');
      setKmAkhir(nota.kmAkhir?.toString() || '');
      setNamaBarang(nota.namaBarang || '');
      setKeterangan(nota.keterangan || '');
      setNominal(nota.nominal.toString());
      setNamaPic(nota.namaPic);
      // We don't handle file re-population, just show existing URLs if any.
    }
  }, [nota]);
  
  // Security check: ensure user is owner or admin
  useEffect(() => {
    if (!isNotaLoading && nota) {
        const isOwner = user?.uid === nota.userId;
        if (!isOwner && !isAdmin) {
            toast({
                variant: 'destructive',
                title: 'Unauthorized',
                description: "You don't have permission to edit this report.",
            });
            router.push('/dashboard');
        }
    }
  }, [isNotaLoading, nota, user, isAdmin, router, toast]);
  
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
    }
  };

  const handleFileChange = (index: number, file: File | null) => {
    const newFiles = [...files];
    newFiles[index] = file;
    setFiles(newFiles);
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!notaRef) return;
    
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

    const updatedData: Partial<Nota> = {
        tanggal,
        segmen,
        keterangan,
        nominal: Number(nominal),
        namaPic,
        // File uploads would be handled here
    };
    
    if (isBBMKendaraan) {
        updatedData.noPlatKendaraan = noPlatKendaraan;
        updatedData.kmAwal = Number(kmAwal);
        updatedData.kmAkhir = Number(kmAkhir);
    } else {
        updatedData.noPlatKendaraan = '';
        updatedData.kmAwal = 0;
        updatedData.kmAkhir = 0;
    }
    
    if(isNonBBMKendaraan) {
        updatedData.namaBarang = namaBarang;
    } else {
        updatedData.namaBarang = '';
    }
    
    updateDocumentNonBlocking(notaRef, updatedData);

    toast({
      title: 'Laporan Diperbarui!',
      description: 'Laporan Anda telah berhasil disimpan.',
    });
    
    // Redirect immediately, optimistic update
    router.push(`/dashboard/notas/${id}`);
  }
  
  if (isNotaLoading || !nota) {
     return (
        <div className="mx-auto grid max-w-4xl flex-1 auto-rows-max gap-4">
            <div className="flex items-center gap-4 mb-4">
                <Skeleton className="h-7 w-7" />
                <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0 font-headline">
                    <Skeleton className="h-6 w-48" />
                </h1>
            </div>
            <Card>
                <CardHeader>
                    <Skeleton className="h-7 w-32" />
                    <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent>
                    <div className="grid gap-6">
                        <div className="grid gap-3">
                            <Skeleton className="h-4 w-12" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                        <div className="grid gap-3">
                            <Skeleton className="h-4 w-12" />
                            <Skeleton className="h-40 w-full" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
  }

  return (
    <div className="mx-auto grid w-full flex-1 auto-rows-max gap-4">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-4 mb-4">
          <Link href={`/dashboard/notas/${id}`}>
            <Button variant="outline" size="icon" className="h-7 w-7" type="button">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back</span>
            </Button>
          </Link>
          <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0 font-headline">
            Edit Laporan
          </h1>
          <div className="hidden items-center gap-2 md:ml-auto md:flex">
            <Link href={`/dashboard/notas/${id}`}>
              <Button variant="outline" type="button">Cancel</Button>
            </Link>
            <Button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Save Changes"}</Button>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Detail Laporan</CardTitle>
            <CardDescription>
              Ubah detail laporan Anda di bawah ini.
            </CardDescription>
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
                        <PhotoUpload id="foto1" label="Foto Keperluan 1" onFileChange={(file) => handleFileChange(0, file)} existingImageUrl={nota.fotoEvidenUrls?.[0]} />
                        <PhotoUpload id="foto2" label="Foto Keperluan 2" onFileChange={(file) => handleFileChange(1, file)} existingImageUrl={nota.fotoEvidenUrls?.[1]} />
                        <PhotoUpload id="foto3" label="Foto Keperluan 3" onFileChange={(file) => handleFileChange(2, file)} existingImageUrl={nota.fotoEvidenUrls?.[2]} />
                        <PhotoUpload id="foto4" label="Foto Keperluan 4" onFileChange={(file) => handleFileChange(3, file)} existingImageUrl={nota.fotoEvidenUrls?.[3]} />
                        <PhotoUpload id="foto5" label="Foto KM Awal Bulan" onFileChange={(file) => handleFileChange(4, file)} existingImageUrl={nota.fotoEvidenUrls?.[4]} />
                        <PhotoUpload id="foto6" label="Foto KM Awal" onFileChange={(file) => handleFileChange(5, file)} existingImageUrl={nota.fotoEvidenUrls?.[5]} />
                        <PhotoUpload id="foto7" label="Foto KM Akhir" onFileChange={(file) => handleFileChange(6, file)} existingImageUrl={nota.fotoEvidenUrls?.[6]} />
                    </div>
                 ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <PhotoUpload id="foto1" label="Foto Eviden 1" onFileChange={(file) => handleFileChange(0, file)} existingImageUrl={nota.fotoEvidenUrls?.[0]} />
                        <PhotoUpload id="foto2" label="Foto Eviden 2" onFileChange={(file) => handleFileChange(1, file)} existingImageUrl={nota.fotoEvidenUrls?.[1]} />
                        <PhotoUpload id="foto3" label="Foto Eviden 3" onFileChange={(file) => handleFileChange(2, file)} existingImageUrl={nota.fotoEvidenUrls?.[2]} />
                        <PhotoUpload id="foto4" label="Foto Eviden 4" onFileChange={(file) => handleFileChange(3, file)} existingImageUrl={nota.fotoEvidenUrls?.[3]} />
                    </div>
                 )}
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="flex items-center justify-end gap-2 mt-4 md:hidden">
          <Link href={`/dashboard/notas/${id}`}>
            <Button variant="outline" type="button">Cancel</Button>
          </Link>
          <Button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Save Changes"}</Button>
        </div>
      </form>
    </div>
  );
}