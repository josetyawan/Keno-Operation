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
import { ArrowLeft, CalendarIcon, Upload, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, useStorage } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { Nota, UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import Image from 'next/image';

// Modified PhotoUpload component for edit page
function PhotoUpload({
  id,
  label,
  onFileChange,
  onRemove,
  previewUrl,
}: {
  id: string;
  label: string;
  onFileChange: (file: File | null) => void;
  onRemove: () => void;
  previewUrl: string | null;
}) {

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    onFileChange(file || null);
  };

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative group flex justify-center items-center h-32 w-full rounded-md border-2 border-dashed border-muted-foreground/50 overflow-hidden">
        <input
          type="file"
          id={id}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleFileChange}
          accept="image/*"
        />
        {previewUrl ? (
          <>
            <Image src={previewUrl} alt={label} fill className="object-cover" />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6 z-10"
              onClick={onRemove}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Remove Photo</span>
            </Button>
          </>
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

function EditNotaForm({ nota, isAdmin }: { nota: Nota, isAdmin: boolean }) {
    const router = useRouter();
    const id = nota.id;
    const { toast } = useToast();
    const { user } = useUser();
    const firestore = useFirestore();
    const storage = useStorage();

    const [isSaving, setIsSaving] = useState(false);

    // Form state is now initialized directly from the nota prop
    const [tanggal, setTanggal] = useState<Date | undefined>(nota.tanggal?.toDate());
    const [segmen, setSegmen] = useState(nota.segmen);
    const [serviceArea, setServiceArea] = useState(nota.serviceArea);
    const [noPlatKendaraan, setNoPlatKendaraan] = useState(nota.noPlatKendaraan || '');
    const [kmAwal, setKmAwal] = useState(nota.kmAwal?.toString() || '');
    const [kmAkhir, setKmAkhir] = useState(nota.kmAkhir?.toString() || '');
    const [namaBarang, setNamaBarang] = useState(nota.namaBarang || '');
    const [keterangan, setKeterangan] = useState(nota.keterangan || '');
    const [nominal, setNominal] = useState(nota.nominal.toString());
    const [namaPic, setNamaPic] = useState(nota.namaPic);

    // Image management state
    const initialUrls = [...(nota.fotoEvidenUrls || [])];
    while (initialUrls.length < 7) {
        initialUrls.push(null);
    }
    const [files, setFiles] = useState<(File | null)[]>(Array(7).fill(null));
    const [imageUrls, setImageUrls] = useState<(string | null)[]>(initialUrls);
    const [previews, setPreviews] = useState<(string | null)[]>(initialUrls);
  
    const serviceAreas = ['SA KUDUS', 'SA PATI', 'SA JEPARA', 'SA PURWODADI', 'SA BLORA', 'SA REMBANG'];
    const bbmKendaraanSegments = [
        'BBM R2 Harian B2B IOAN',
        'BBM R2 Harian PROVISIONING',
        'BBM R4 Harian B2B IOAN',
        'BBM R4 Harian PROVISIONING',
        'BBM R4 Turlap B2B IOAN',
        'BBM R4 Turlap PROVISIONING',
        'BBM R4 UT B2B IOAN',
        'BBM R4 UT PROVISIONING',
        'BBM R4 Pengiriman Warehouse',
    ];
    const nonBbmKendaraanSegments = [
        'Pembelian Material Non stok B2B IOAN',
        'Pembelian Material Non stok PROVISIONING',
        'Perincian Nota ATK',
        'BBM Genset',
        'Jasa B2B IOAN',
        'Jasa PROVISIONING',
        'Perincian Nota Pengiriman B2B IOAN',
        'Perincian Nota Pengiriman PROVISIONING',
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
        if (!bbmKendaraanSegments.includes(value)) {
            setNoPlatKendaraan('');
            setKmAwal('');
            setKmAkhir('');
        }
        
        if (value === 'MATERIAL SPPG') {
            setKeterangan('Material SPPG');
        } else {
             if (keterangan === 'Material SPPG') {
                setKeterangan('');
            }
        }
    };

    const handleFileChange = (index: number, file: File | null) => {
        const newFiles = [...files];
        newFiles[index] = file;
        setFiles(newFiles);

        const newPreviews = [...previews];
        if (file) {
            newPreviews[index] = URL.createObjectURL(file);
        } else {
            newPreviews[index] = imageUrls[index];
        }
        setPreviews(newPreviews);
    };

    const handleRemovePhoto = (index: number) => {
        const newFiles = [...files];
        newFiles[index] = null;
        setFiles(newFiles);

        const newImageUrls = [...imageUrls];
        newImageUrls[index] = null;
        setImageUrls(newImageUrls);

        const newPreviews = [...previews];
        newPreviews[index] = null;
        setPreviews(newPreviews);
    };

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const notaRef = doc(firestore, 'notas', id);
        if (!user) return;
        
        let isFormValid = !!(tanggal && segmen && serviceArea && nominal && namaPic);
        if (isBBMKendaraan) isFormValid = isFormValid && !!(noPlatKendaraan && kmAwal && kmAkhir);
        
        if (!isFormValid) {
            toast({ variant: 'destructive', title: 'Incomplete Form', description: 'Please fill out all required fields.' });
            return;
        }
        setIsSaving(true);

        try {
            const uploadPromises = files.map(async (file, index) => {
                if (file) {
                    const fileExtension = file.name.split('.').pop();
                    const fileName = `${user.uid}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExtension}`;
                    const filePath = `notas/${user.uid}/${fileName}`;
                    const storageRef = ref(storage, filePath);
                    await uploadBytes(storageRef, file);
                    return getDownloadURL(storageRef);
                }
                return imageUrls[index]; // Return existing URL (which can be null)
            });
            
            const allPossibleUrls = await Promise.all(uploadPromises);
            
            const finalUrls = isBBMKendaraan
                ? allPossibleUrls
                : allPossibleUrls.slice(0, 4).filter((url): url is string => !!url);

            const updatedData: Partial<Nota> = {
                tanggal, segmen, serviceArea, keterangan, nominal: Number(nominal), namaPic,
                fotoEvidenUrls: finalUrls,
            };

            if (nota.status === 'rejected') {
                updatedData.status = 'pending';
                updatedData.rejectionReason = '';
                updatedData.tanggalVerifikasi = null;
            }
            
            if (isBBMKendaraan) {
                updatedData.noPlatKendaraan = noPlatKendaraan;
                updatedData.kmAwal = Number(kmAwal);
                updatedData.kmAkhir = Number(kmAkhir);
            } else {
                updatedData.noPlatKendaraan = ''; updatedData.kmAwal = 0; updatedData.kmAkhir = 0;
            }
            
            if(isNonBBMKendaraan) updatedData.namaBarang = namaBarang;
            else updatedData.namaBarang = '';
            
            await updateDoc(notaRef, updatedData);

            toast({ 
                title: 'Laporan Diperbarui!', 
                description: nota.status === 'rejected' ? 'Laporan Anda telah dikirim ulang untuk verifikasi.' : 'Laporan Anda telah berhasil disimpan.' 
            });
            router.push(`/dashboard/notas/${id}`);
        } catch(error) {
            console.error("Error updating nota:", error);
            toast({ variant: "destructive", title: "Gagal Memperbarui", description: "Terjadi kesalahan. Silakan coba lagi." });
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div className="mx-auto grid w-full flex-1 auto-rows-max gap-4">
            <form onSubmit={handleSubmit}>
                <div className="flex items-center gap-4 mb-4">
                    <Button onClick={() => router.back()} variant="outline" size="icon" className="h-7 w-7" type="button">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Back</span>
                    </Button>
                    <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0 font-headline">
                        Edit Laporan
                    </h1>
                    <div className="hidden items-center gap-2 md:ml-auto md:flex">
                        <Button onClick={() => router.back()} variant="outline" type="button">Cancel</Button>
                        <Button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Save Changes"}</Button>
                    </div>
                </div>
                <Card>
                    <CardHeader><CardTitle>Detail Laporan</CardTitle><CardDescription>Ubah detail laporan Anda di bawah ini.</CardDescription></CardHeader>
                    <CardContent className="p-6">
                        <div className="grid gap-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="grid gap-3"><Label htmlFor="tanggal">Tanggal *</Label>
                                <Popover><PopoverTrigger asChild>
                                    <Button variant={'outline'} className={cn('justify-start text-left font-normal',!tanggal && 'text-muted-foreground')}>
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
                                        captionLayout="dropdown-buttons"
                                        fromYear={new Date().getFullYear() - 5}
                                        toYear={new Date().getFullYear()}
                                    />
                                </PopoverContent>
                                </Popover>
                                </div>
                                <div className="grid gap-3"><Label htmlFor="serviceArea">Service Area *</Label>
                                <Select onValueChange={setServiceArea} defaultValue={serviceArea} required><SelectTrigger><SelectValue placeholder="Pilih service area" /></SelectTrigger>
                                    <SelectContent>{serviceAreas.map(sa => <SelectItem key={sa} value={sa}>{sa}</SelectItem>)}</SelectContent>
                                </Select>
                                </div>
                            </div>
                            <div className="grid gap-3"><Label htmlFor="segmen">Segmen *</Label>
                                <Select onValueChange={handleSegmenChange} defaultValue={segmen} required><SelectTrigger><SelectValue placeholder="Pilih segmen" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="BBM R2 Harian B2B IOAN">BBM R2 Harian B2B IOAN</SelectItem>
                                        <SelectItem value="BBM R2 Harian PROVISIONING">BBM R2 Harian PROVISIONING</SelectItem>
                                        <SelectItem value="BBM R4 Harian B2B IOAN">BBM R4 Harian B2B IOAN</SelectItem>
                                        <SelectItem value="BBM R4 Harian PROVISIONING">BBM R4 Harian PROVISIONING</SelectItem>
                                        <SelectItem value="BBM R4 Turlap B2B IOAN">BBM R4 Turlap B2B IOAN</SelectItem>
                                        <SelectItem value="BBM R4 Turlap PROVISIONING">BBM R4 Turlap PROVISIONING</SelectItem>
                                        <SelectItem value="BBM R4 UT B2B IOAN">BBM R4 UT B2B IOAN</SelectItem>
                                        <SelectItem value="BBM R4 UT PROVISIONING">BBM R4 UT PROVISIONING</SelectItem>
                                        <SelectItem value="BBM R4 Pengiriman Warehouse">BBM R4 Pengiriman Warehouse</SelectItem>
                                        <SelectItem value="Pembelian Material Non stok B2B IOAN">Pembelian Material Non stok B2B IOAN</SelectItem>
                                        <SelectItem value="Pembelian Material Non stok PROVISIONING">Pembelian Material Non stok PROVISIONING</SelectItem>
                                        <SelectItem value="Perincian Nota ATK">Perincian Nota ATK</SelectItem>
                                        <SelectItem value="BBM Genset">BBM Genset</SelectItem>
                                        <SelectItem value="Jasa B2B IOAN">Jasa B2B IOAN</SelectItem>
                                        <SelectItem value="Jasa PROVISIONING">Jasa PROVISIONING</SelectItem>
                                        <SelectItem value="Perincian Nota Pengiriman B2B IOAN">Perincian Nota Pengiriman B2B IOAN</SelectItem>
                                        <SelectItem value="Perincian Nota Pengiriman PROVISIONING">Perincian Nota Pengiriman PROVISIONING</SelectItem>
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
                                <div className="grid gap-3"><Label htmlFor="noPlatKendaraan">No Plat Kendaraan *</Label>
                                    <Input id="noPlatKendaraan" type="text" placeholder="B 1234 ABC" required={isBBMKendaraan} value={noPlatKendaraan} onChange={(e) => setNoPlatKendaraan(e.target.value)} />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="grid gap-3"><Label htmlFor="kmAwal">KM Awal *</Label><Input id="kmAwal" type="number" placeholder="10000" required={isBBMKendaraan} value={kmAwal} onChange={(e) => setKmAwal(e.target.value)} /></div>
                                    <div className="grid gap-3"><Label htmlFor="kmAkhir">KM Akhir *</Label><Input id="kmAkhir" type="number" placeholder="10050" required={isBBMKendaraan} value={kmAkhir} onChange={(e) => setKmAkhir(e.target.value)} /></div>
                                </div>
                                </>
                            )}

                            {isNonBBMKendaraan && (
                                <div className="grid gap-3">
                                    <Label htmlFor="namaBarang">Nama Toko/Warung</Label>
                                    <Input id="namaBarang" type="text" placeholder="Contoh: Toko ATK Jaya, Warung Makan Bu Tini" value={namaBarang} onChange={(e) => setNamaBarang(e.target.value)} />
                                </div>
                            )}

                            <div className="grid gap-3">
                                <Label htmlFor="keterangan">Keterangan</Label>
                                <Textarea
                                id="keterangan"
                                placeholder={isNonBBMKendaraan ? 'Isi nama barang/jasa lengkap sesuai nota...' : 'Keterangan tambahan...'}
                                value={keterangan}
                                onChange={(e) => setKeterangan(e.target.value)}
                                readOnly={keterangan === 'Material SPPG'}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="grid gap-3"><Label htmlFor="nominal">Nominal (Rp) *</Label><Input id="nominal" type="number" placeholder="50000" required value={nominal} onChange={(e) => setNominal(e.target.value)} /></div>
                                <div className="grid gap-3">
                                <Label htmlFor="namaPic">Nama PIC *</Label>
                                <Input id="namaPic" type="text" placeholder="Nama penanggung jawab" required value={namaPic} readOnly className="bg-muted/50" />
                                </div>
                            </div>
                            <div><Label className="mb-3 block">Upload Foto Bukti</Label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {photoUploadSlots.map((slot, index) => (
                                    <div key={slot.id} className={cn(slot.isBbmOnly && !isBBMKendaraan && 'hidden')}>
                                    <PhotoUpload
                                        id={slot.id}
                                        label={isBBMKendaraan ? slot.bbmLabel : slot.nonBbmLabel}
                                        onFileChange={(file) => handleFileChange(index, file)}
                                        onRemove={() => handleRemovePhoto(index)}
                                        previewUrl={previews[index]}
                                    />
                                    </div>
                                ))}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <div className="flex items-center justify-end gap-2 mt-4 md:hidden">
                    <Button onClick={() => router.back()} variant="outline" type="button">Cancel</Button>
                    <Button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Save Changes"}</Button>
                </div>
            </form>
        </div>
    );
}

export default function EditNotaPage() {
    const params = useParams();
    const id = params.id as string;
    const { user } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    // Get the nota document
    const notaRef = useMemoFirebase(() => {
        if (!firestore || !id) return null;
        return doc(firestore, 'notas', id);
    }, [firestore, id]);
    const { data: nota, isLoading: isNotaLoading } = useDoc<Nota>(notaRef);

    // Get user profile to check for admin role
    const userDocRef = useMemoFirebase(() => {
        if (!user) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: userProfile } = useDoc<UserProfile>(userDocRef);
    const isAdmin = userProfile?.role === 'admin';

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

    if (isNotaLoading) {
        return (
            <div className="mx-auto grid max-w-4xl flex-1 auto-rows-max gap-4">
                <div className="flex items-center gap-4 mb-4">
                    <Skeleton className="h-7 w-7" />
                    <h1 className="flex-1"><Skeleton className="h-6 w-48" /></h1>
                </div>
                <Card>
                    <CardHeader><Skeleton className="h-7 w-32" /><Skeleton className="h-4 w-64" /></CardHeader>
                    <CardContent><div className="grid gap-6">
                        <div className="grid gap-3"><Skeleton className="h-4 w-12" /><Skeleton className="h-10 w-full" /></div>
                        <div className="grid gap-3"><Skeleton className="h-4 w-12" /><Skeleton className="h-40 w-full" /></div>
                    </div></CardContent>
                </Card>
            </div>
        );
    }
    
    if (!nota) {
         return (
            <div className="mx-auto grid w-full flex-1 auto-rows-max gap-4">
                <div className="flex items-center gap-4 mb-4">
                  <Button onClick={() => router.back()} variant="outline" size="icon" className="h-7 w-7" type="button">
                      <ArrowLeft className="h-4 w-4" />
                      <span className="sr-only">Back</span>
                  </Button>
                  <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0 font-headline">
                    Laporan Tidak Ditemukan
                  </h1>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>Error: 404</CardTitle>
                        <CardDescription>
                            Laporan yang Anda coba edit tidak ada atau telah dihapus.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return <EditNotaForm nota={nota} isAdmin={isAdmin} />;
}
