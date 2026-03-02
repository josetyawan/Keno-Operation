'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, Upload, X, FileWarning, PlusCircle, Trash2, Check } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useUser, useStorage, useDoc, useMemoFirebase } from '@/firebase';
import { collection, serverTimestamp, doc, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { GamasReport, UserProfile, DesignatorEvidence } from '@/lib/types';
import Image from 'next/image';
import { designatorListData } from '@/lib/designator-data';
import { cn } from '@/lib/utils';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

type EvidenceFormValues = {
  designator: string;
  notes: string;
  photos: File[];
};

type FormValues = {
  noTiket: string;
  evidences: EvidenceFormValues[];
};

function PhotoUploadPreview({ files, onRemove }: { files: File[], onRemove: (index: number) => void }) {
    const [previews, setPreviews] = useState<string[]>([]);
  
    useEffect(() => {
      const newPreviews = files.map(file => URL.createObjectURL(file));
      setPreviews(newPreviews);
  
      return () => {
        newPreviews.forEach(url => URL.revokeObjectURL(url));
      };
    }, [files]);
  
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-2">
        {previews.map((previewUrl, index) => (
          <div key={index} className="relative group aspect-square">
            <Image src={previewUrl} alt={`Preview ${index + 1}`} fill className="object-cover rounded-md border" />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full z-10 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onRemove(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    );
}

function DesignatorSelector({ value, onChange }: { value: string, onChange: (value: string) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
  
    const filteredDesignators = useMemo(() => {
      if (!search) return designatorListData;
      const lowercasedSearch = search.toLowerCase();
      return designatorListData.filter(
        d => d.code.toLowerCase().includes(lowercasedSearch) || d.description.toLowerCase().includes(lowercasedSearch)
      );
    }, [search]);
  
    const handleSelect = (code: string) => {
      onChange(code);
      setIsOpen(false);
      setSearch('');
    };
  
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" aria-expanded={isOpen} className="w-full justify-between">
            {value ? designatorListData.find(d => d.code === value)?.code : "Pilih designator..."}
            <FileWarning className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <div className="p-2">
            <Input
              placeholder="Cari kode atau keterangan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9"
            />
          </div>
          <ScrollArea className="h-72">
            <div className="p-1">
              {filteredDesignators.length > 0 ? (
                filteredDesignators.map((d) => (
                  <button
                    type="button"
                    key={d.code}
                    onClick={() => handleSelect(d.code)}
                    className={cn(
                      "w-full text-left p-2 rounded-md hover:bg-accent flex items-center justify-between",
                      value === d.code && "bg-accent"
                    )}
                  >
                    <div>
                      <p className="font-medium text-sm">{d.code}</p>
                      <p className="text-xs text-muted-foreground">{d.description}</p>
                    </div>
                    {value === d.code && <Check className="h-4 w-4" />}
                  </button>
                ))
              ) : (
                <div className="p-2 text-center text-sm text-muted-foreground">Tidak ada designator ditemukan.</div>
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    );
}

export default function NewGamasReportPage() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const storage = useStorage();
  const [isSaving, setIsSaving] = useState(false);

  const userDocRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

  const { register, control, handleSubmit, formState: { errors }, getValues, setValue } = useForm<FormValues>({
    defaultValues: {
      noTiket: '',
      evidences: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'evidences',
  });

  const addEvidenceBlock = () => {
    append({ designator: '', notes: '', photos: [] });
  };
  
  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img');
      const reader = new FileReader();
      
      reader.onload = (e) => {
        if(typeof e.target?.result === 'string') {
          img.src = e.target.result;
        } else {
          reject(new Error('Gagal membaca file.'));
        }
      }
      reader.onerror = reject;
      reader.readAsDataURL(file);

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1024;
        let { width, height } = img;

        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Tidak dapat memuat konteks canvas'));

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
          } else {
            reject(new Error('Gagal membuat blob dari canvas.'));
          }
        }, 'image/jpeg', 0.8);
      };
      img.onerror = (err) => reject(err);
    });
  };

  const onSubmit = async (data: FormValues) => {
    if (!user || !userProfile) {
      toast({ variant: 'destructive', title: 'Error', description: 'Pengguna tidak ditemukan.' });
      return;
    }
    if (!data.noTiket.trim()) {
      toast({ variant: 'destructive', title: 'Data Tidak Lengkap', description: 'Silakan isi No. Tiket.' });
      return;
    }
    if (data.evidences.length === 0) {
      toast({ variant: 'destructive', title: 'Data Tidak Lengkap', description: 'Tambahkan setidaknya satu blok eviden designator.' });
      return;
    }
    const invalidEvidence = data.evidences.some(e => !e.designator || e.photos.length === 0);
    if (invalidEvidence) {
      toast({ variant: 'destructive', title: 'Data Eviden Tidak Lengkap', description: 'Setiap blok eviden harus memiliki designator dan setidaknya satu foto.' });
      return;
    }

    setIsSaving(true);
    try {
      const evidencePromises = data.evidences.map(async (evidence) => {
        const photoUploadPromises = evidence.photos.map(async (file) => {
            const compressedFile = await compressImage(file);
            const filePath = `gamas-photos/${user.uid}/${Date.now()}-${compressedFile.name}`;
            const storageRef = ref(storage, filePath);
            await uploadBytes(storageRef, compressedFile);
            return getDownloadURL(storageRef);
        });
        
        const photoUrls = await Promise.all(photoUploadPromises);
        
        return {
          designator: evidence.designator,
          notes: evidence.notes,
          photoUrls,
          status: 'pending',
        } as DesignatorEvidence;
      });

      const processedEvidences: DesignatorEvidence[] = await Promise.all(evidencePromises);

      const gamasCollection = collection(firestore, 'gamas-reports');
      const newReport: Omit<GamasReport, 'id'> = {
        userId: user.uid,
        userName: userProfile.displayName || user.email!,
        noTiket: data.noTiket.trim(),
        evidences: processedEvidences,
        createdAt: serverTimestamp(),
        status: 'pending',
      };
      await addDoc(gamasCollection, newReport);
      toast({ title: 'Laporan Berhasil Dibuat', description: 'Laporan eviden gamas Anda telah disimpan.' });
      router.push('/dashboard/gamas');

    } catch (error: any) {
      console.error("Error creating Gamas report:", error);
      let errorMessage = "Terjadi kesalahan saat menyimpan laporan.";
      if (error.code === 'storage/unauthorized') {
          errorMessage = "Izin ditolak. Anda tidak memiliki izin untuk mengunggah file. Pastikan Anda telah login."
      } else if (error.message && error.message.includes('longer than 1048487 bytes')) {
          errorMessage = "Ukuran total file terlalu besar. Coba unggah lebih sedikit foto atau foto dengan resolusi lebih kecil.";
      }
      toast({ variant: "destructive", title: "Gagal Menyimpan", description: errorMessage });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto grid w-full flex-1 auto-rows-max gap-4">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex items-center gap-4 mb-4">
          <Button onClick={() => router.back()} variant="outline" size="icon" className="h-8 w-8" type="button">
            <ArrowLeft className="h-5 w-5" /><span className="sr-only">Kembali</span>
          </Button>
          <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-bold tracking-tight sm:grow-0">
            Laporan Eviden Gamas Baru
          </h1>
          <div className="hidden items-center gap-2 md:ml-auto md:flex">
            <Button onClick={() => router.back()} variant="outline" type="button">Batal</Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <><Loader2 className="animate-spin mr-2" /> Menyimpan...</> : 'Simpan Laporan'}
            </Button>
          </div>
        </div>

        <Card className="mb-6">
            <CardHeader><CardTitle>Informasi Tiket</CardTitle></CardHeader>
            <CardContent>
                <div className="grid gap-3">
                    <Label htmlFor="noTiket">No. Tiket *</Label>
                    <Input id="noTiket" placeholder="Contoh: INC12345678" {...register('noTiket')} required />
                </div>
            </CardContent>
        </Card>

        {fields.map((field, index) => (
          <Card key={field.id} className="mb-4">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Eviden untuk Designator #{index + 1}</CardTitle>
                <Button variant="destructive" size="icon" onClick={() => remove(index)}>
                    <Trash2 className="h-4 w-4" />
                </Button>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="grid gap-3">
                <Label>Designator *</Label>
                <Controller
                  name={`evidences.${index}.designator`}
                  control={control}
                  rules={{ required: "Designator harus dipilih" }}
                  render={({ field: { onChange, value } }) => (
                    <DesignatorSelector value={value} onChange={onChange} />
                  )}
                />
                 {errors.evidences?.[index]?.designator && <p className="text-sm text-destructive">{errors.evidences?.[index]?.designator?.message}</p>}
              </div>
              <div className="grid gap-3">
                <Label htmlFor={`notes-${index}`}>Catatan</Label>
                <Textarea id={`notes-${index}`} placeholder="Catatan tambahan untuk designator ini..." {...register(`evidences.${index}.notes`)} />
              </div>
              <div className="grid gap-3">
                <Label>Foto Eviden *</Label>
                <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                        const currentPhotos = getValues(`evidences.${index}.photos`) || [];
                        const newFiles = Array.from(e.target.files || []);
                        setValue(`evidences.${index}.photos`, [...currentPhotos, ...newFiles], { shouldValidate: true });
                    }}
                />
                 <PhotoUploadPreview 
                    files={getValues(`evidences.${index}.photos`) || []}
                    onRemove={(photoIndex) => {
                        const currentPhotos = getValues(`evidences.${index}.photos`) || [];
                        const updatedPhotos = currentPhotos.filter((_, i) => i !== photoIndex);
                        setValue(`evidences.${index}.photos`, updatedPhotos, { shouldValidate: true });
                    }}
                />
              </div>
            </CardContent>
          </Card>
        ))}

        <Button type="button" variant="outline" onClick={addEvidenceBlock} className="w-full">
            <PlusCircle className="mr-2" /> Tambah Designator & Eviden
        </Button>

        <div className="flex items-center justify-end gap-2 mt-4 md:hidden">
          <Button onClick={() => router.back()} variant="outline" type="button">Batal</Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? <><Loader2 className="animate-spin mr-2" /> Menyimpan...</> : 'Simpan Laporan'}
          </Button>
        </div>
      </form>
    </div>
  );
}
