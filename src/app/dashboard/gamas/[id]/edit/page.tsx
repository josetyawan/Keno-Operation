
'use client';

import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, Upload, X, FileWarning, PlusCircle, Trash2, Check, FileUp, FileIcon } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { useStorage } from '@/firebase/provider';
import { collection, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { GamasReport, UserProfile, DesignatorEvidence, KmlEvidence } from '@/lib/types';
import Image from 'next/image';
import { designatorListData } from '@/lib/designator-data';
import { cn } from '@/lib/utils';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type EvidenceFormValues = {
  designator: string;
  notes: string;
  quantity: number; // VOL
  photos: File[];
  existingPhotos: string[];
};

type KmlFileFormValue = {
  file?: File;
  keterangan: string;
  fileName?: string;
  url?: string;
};

type FormValues = {
  noTiket: string;
  sto: string;
  evidences: EvidenceFormValues[];
  kmlEvidences: KmlFileFormValue[];
};

// Component to preview newly uploaded files
function PhotoUploadPreview({ files, onRemove }: { files: File[], onRemove: (index: number) => void }) {
    const [previews, setPreviews] = useState<string[]>([]);
  
    useEffect(() => {
      const newPreviews = files.map(file => URL.createObjectURL(file));
      setPreviews(newPreviews);
  
      return () => {
        newPreviews.forEach(url => URL.revokeObjectURL(url));
      };
    }, [files]);
  
    if (previews.length === 0) return null;

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-2">
        {previews.map((previewUrl, index) => (
          <div key={index} className="relative group aspect-square">
            <Image src={previewUrl} alt={`Preview ${index + 1}`} fill className="object-cover rounded-md border border-primary/50" />
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

export default function EditGamasReportPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const storage = useStorage();
  const [isSaving, setIsSaving] = useState(false);

  const reportRef = useMemoFirebase(() => doc(firestore, 'gamas-reports', id), [firestore, id]);
  const { data: report, isLoading: isReportLoading } = useDoc<GamasReport>(reportRef);

  const { register, control, handleSubmit, formState: { errors }, getValues, setValue, reset, watch } = useForm<FormValues>({
    defaultValues: {
      noTiket: '',
      sto: 'KUD',
      evidences: [],
      kmlEvidences: [],
    },
  });

  const evidencesWatch = watch("evidences");
  const { fields: kmlFields, append: appendKml, remove: removeKml } = useFieldArray({ control, name: 'kmlEvidences' });

  useEffect(() => {
    if (report) {
      reset({
        noTiket: report.noTiket,
        sto: report.sto || 'KUD',
        evidences: report.evidences.map(ev => ({
          designator: ev.designator,
          notes: ev.notes || '',
          quantity: ev.quantity || 1,
          photos: [],
          existingPhotos: ev.photoUrls || []
        })),
        kmlEvidences: (report.kmlEvidences || []).map(kml => ({
          fileName: kml.fileName,
          url: kml.url,
          keterangan: kml.keterangan,
        })),
      });
    }
  }, [report, reset]);

  const { fields, append, remove } = useFieldArray({ control, name: 'evidences' });

  const addEvidenceBlock = () => {
    append({ designator: '', notes: '', quantity: 1, photos: [], existingPhotos: [] });
  };
  
  const handleKmlFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (kmlFields.length + files.length > 5) {
      toast({ variant: 'destructive', title: 'Batas File', description: 'Maksimal 5 file KML/ABD/SS.' });
      return;
    }
    files.forEach(file => appendKml({ file, keterangan: '', fileName: file.name, url: '' }));
  };
  
  const handleRemoveExistingKml = (index: number) => {
    removeKml(index);
    // Note: This only removes it from the form state. The actual file in storage is not deleted until submission.
    // If we want to delete it from storage, we'd need more complex logic here. For now, it will just be orphaned if the form is saved.
  };

  const handleRemoveExistingPhoto = (evidenceIndex: number, photoIndex: number) => {
    const existingPhotos = getValues(`evidences.${evidenceIndex}.existingPhotos`);
    const updatedPhotos = (existingPhotos || []).filter((_, idx) => idx !== photoIndex);
    setValue(`evidences.${evidenceIndex}.existingPhotos`, updatedPhotos);
  };

  const onSubmit = async (data: FormValues) => {
    if (!user || !report) return;
    setIsSaving(true);
    try {
      await user.getIdToken(true);
      
      const evidencePromises = data.evidences.map(async (evidenceBlock) => {
        const uploadPhoto = async (file: File) => {
            const compressedFile = await compressImage(file);
            const filePath = `notas/${user.uid}/gamas-edit-${Date.now()}-${compressedFile.name}`;
            const storageRef = ref(storage, filePath);
            await uploadBytes(storageRef, compressedFile);
            return getDownloadURL(storageRef);
        };

        const newPhotoUploadPromises = (evidenceBlock.photos || []).map(file => uploadPhoto(file));
        const newPhotoUrls = await Promise.all(newPhotoUploadPromises);
        const finalPhotoUrls = [...(evidenceBlock.existingPhotos || []), ...newPhotoUrls];
        
        return {
          designator: evidenceBlock.designator,
          notes: evidenceBlock.notes,
          quantity: evidenceBlock.quantity || 1,
          photoUrls: finalPhotoUrls,
          status: 'pending',
          rejectionReason: '',
        } as DesignatorEvidence;
      });

      const kmlEvidencePromises = data.kmlEvidences.map(async (kmlItem) => {
        if (kmlItem.file) { // It's a new file to upload
          let fileToUpload = kmlItem.file;
          if (['image/jpeg', 'image/png'].includes(kmlItem.file.type)) {
              try { fileToUpload = await compressImage(kmlItem.file); } catch (e) { console.warn("Image compression failed, uploading original."); }
          }
          const filePath = `notas/${user.uid}/gamas-kml-${Date.now()}-${fileToUpload.name}`;
          const storageRef = ref(storage, filePath);
          await uploadBytes(storageRef, fileToUpload);
          const url = await getDownloadURL(storageRef);
          return { fileName: kmlItem.file.name, url, keterangan: kmlItem.keterangan || '' };
        }
        // It's an existing file, just return its data
        return { fileName: kmlItem.fileName!, url: kmlItem.url!, keterangan: kmlItem.keterangan };
      });
      
      const processedEvidences = await Promise.all(evidencePromises);
      const processedKmlEvidences = await Promise.all(kmlEvidencePromises);

      await updateDoc(reportRef, {
        noTiket: data.noTiket,
        sto: data.sto,
        evidences: processedEvidences,
        kmlEvidences: processedKmlEvidences,
        status: 'pending',
        rejectionReason: '',
      });

      toast({ title: 'Laporan Berhasil Diperbarui', description: 'Laporan Anda telah dikirim ulang untuk persetujuan.' });
      router.push('/dashboard/gamas');

    } catch (error: any) {
      console.error("Error updating Gamas report:", error);
      toast({ variant: "destructive", title: "Gagal Memperbarui", description: "Terjadi kesalahan saat menyimpan laporan." });
    } finally {
      setIsSaving(false);
    }
  };
  
  if (isReportLoading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin" /> Memuat data laporan...</div>;
  }

  if (!report) {
    return <div>Laporan tidak ditemukan.</div>
  }

  return (
    <div className="mx-auto grid w-full flex-1 auto-rows-max gap-4">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex items-center gap-4 mb-4">
          <Button onClick={() => router.back()} variant="outline" size="icon" className="h-8 w-8" type="button">
            <ArrowLeft className="h-5 w-5" /><span className="sr-only">Kembali</span>
          </Button>
          <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-bold tracking-tight sm:grow-0">
            Edit Laporan Eviden Gamas
          </h1>
          <div className="hidden items-center gap-2 md:ml-auto md:flex">
            <Button onClick={() => router.back()} variant="outline" type="button">Batal</Button>
            <Button type="submit" disabled={isSaving || isUserLoading || isReportLoading}>
              {isSaving ? <><Loader2 className="animate-spin mr-2" /> Menyimpan...</> : 'Simpan & Kirim Ulang'}
            </Button>
          </div>
        </div>

        <Card className="mb-6">
            <CardHeader><CardTitle>Informasi Tiket</CardTitle></CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="grid gap-3">
                        <Label htmlFor="noTiket">No. Tiket *</Label>
                        <Input id="noTiket" placeholder="Contoh: INC12345678" {...register('noTiket')} required />
                    </div>
                    <div className="grid gap-3">
                        <Label htmlFor="sto">STO *</Label>
                        <Controller
                            name="sto"
                            control={control}
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger id="sto">
                                        <SelectValue placeholder="Pilih STO..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="KUD">KUDUS (KUD)</SelectItem>
                                        <SelectItem value="DMA">DEMAK (DMA)</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </div>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <Label htmlFor={`quantity-${index}`}>Volume (VOL) *</Label>
                    <Input id={`quantity-${index}`} type="number" {...register(`evidences.${index}.quantity`, { valueAsNumber: true, min: 1 })} required min="1" />
                </div>
              </div>
              <div className="grid gap-3">
                <Label htmlFor={`notes-${index}`}>Catatan</Label>
                <Textarea id={`notes-${index}`} placeholder="Catatan tambahan untuk designator ini..." {...register(`evidences.${index}.notes`)} />
              </div>
              <div className="grid gap-3">
                <Label>Foto Eviden</Label>
                
                {/* Display existing photos with a remove button */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-2">
                    {(evidencesWatch?.[index]?.existingPhotos || []).map((url, photoIdx) => (
                        <div key={photoIdx} className="relative group aspect-square">
                            <Image src={url} alt={`Existing photo ${photoIdx + 1}`} fill className="object-cover rounded-md border" />
                            <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleRemoveExistingPhoto(index, photoIdx)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>

                {/* Display previews for newly added files with a remove button */}
                <PhotoUploadPreview 
                    files={evidencesWatch?.[index]?.photos || []}
                    onRemove={(photoIndex) => {
                        const currentPhotos = getValues(`evidences.${index}.photos`) || [];
                        const updatedPhotos = currentPhotos.filter((_, i) => i !== photoIndex);
                        setValue(`evidences.${index}.photos`, updatedPhotos, { shouldValidate: true });
                    }}
                />

                <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                        const currentPhotos = getValues(`evidences.${index}.photos`) || [];
                        const newFiles = Array.from(e.target.files || []);
                        setValue(`evidences.${index}.photos`, [...currentPhotos, ...newFiles], { shouldValidate: true });
                        e.target.value = ''; 
                    }}
                />
                 <p className="text-xs text-muted-foreground">Anda dapat mengunggah beberapa foto sekaligus. Foto yang sudah ada tidak akan terhapus kecuali Anda mengklik tombol X.</p>
              </div>
            </CardContent>
          </Card>
        ))}

        <Button type="button" variant="outline" onClick={addEvidenceBlock} className="w-full">
            <PlusCircle className="mr-2" /> Tambah Designator & Eviden
        </Button>
        
        <Card className="mt-6">
            <CardHeader>
                <CardTitle>Upload KML/ABD/SS KML (Opsional)</CardTitle>
                <CardDescription>
                    Unggah file pendukung seperti KML, ABD, atau PDF. Maksimal 5 file.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {kmlFields.map((field, index) => (
                    <div key={field.id} className="flex items-start gap-4 p-3 border rounded-md relative">
                        <FileIcon className="h-6 w-6 text-muted-foreground mt-1" />
                        <div className="flex-grow space-y-2">
                            <p className="text-sm font-medium">{field.file?.name || field.fileName}</p>
                            <div className="grid gap-2">
                                <Label htmlFor={`kmlKeterangan-${index}`} className="sr-only">Keterangan</Label>
                                <Input
                                    id={`kmlKeterangan-${index}`}
                                    placeholder="Tambahkan keterangan..."
                                    {...register(`kmlEvidences.${index}.keterangan`)}
                                />
                            </div>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => handleRemoveExistingKml(index)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
                {kmlFields.length < 5 && (
                    <div className="relative flex justify-center items-center h-24 w-full rounded-md border-2 border-dashed">
                        <Input
                            type="file"
                            id="kml-upload"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            multiple
                            accept=".jpg,.jpeg,.png,.kml,.pdf,.abd"
                            onChange={handleKmlFileChange}
                        />
                        <div className="text-center text-muted-foreground">
                            <Upload className="mx-auto h-8 w-8" />
                            <span className="text-sm">Klik atau seret file ke sini</span>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>


        <div className="flex items-center justify-end gap-2 mt-4 md:hidden">
          <Button onClick={() => router.back()} variant="outline" type="button">Batal</Button>
          <Button type="submit" disabled={isSaving || isUserLoading || isReportLoading}>
            {isSaving ? <><Loader2 className="animate-spin mr-2" /> Menyimpan...</> : 'Simpan & Kirim Ulang'}
          </Button>
        </div>
      </form>
    </div>
  );
}
