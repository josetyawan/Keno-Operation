

'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, Upload, X, Wrench, PlusCircle, Trash2 } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useFirestore, useUser, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { useStorage } from '@/firebase/provider';
import { collection, serverTimestamp, query, orderBy, doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useForm, useFieldArray, Controller, useWatch } from 'react-hook-form';
import type { AlkerChecklist, AlkerTool, UserProfile } from '@/lib/types';
import Image from 'next/image';

const toolList = [
  "Splicer (Asuransi dan pajak, Maintenance Service, SUCA dan elektroda)",
  "Optical Power Meter",
  "VFL (Visible Fault Locator) 20km",
  "Optical Fiber Ranger",
  "One Click Cleanner (Fiber Cleaner)",
  "Toolkit Fo (Fiber Stripper)",
  "Tangga Dorong Aluminium (5.1 Meter)",
  "Powerbank Valins + Converter Type-C to RJ 45",
  "Testphone",
  "Tone Checker",
  "LAN Tester",
  "Toolkit Set",
  "Crimping tool RJ 11/RJ 45",
  "Body Harness/ Working Belt, Helm pengaman dan Kaus tangan",
  "Jas Hujan",
  "Tas Punggung",
  "KBM Roda 2",
];

const toolsWithTwoPhotos = ["Splicer", "Optical Power Meter", "Optical Fiber Ranger"];

type ToolFormData = Omit<AlkerTool, 'photoUrl1' | 'photoUrl2'> & { 
  photo1?: FileList; 
  photo2?: FileList;
  photoUrl1?: string;
  photoUrl2?: string;
};

type FormValues = {
  crewUserId: string;
  tools: ToolFormData[];
  otherTools: ToolFormData[];
};

export default function NewAlkerPage() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const storage = useStorage();
  const [isSaving, setIsSaving] = useState(false);
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [areUsersLoading, setAreUsersLoading] = useState(true);

  // --- Data Fetching ---
  const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
  const { data: currentUserProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
  
  useEffect(() => {
    if (!isUserLoading && !isProfileLoading) {
      if (!currentUserProfile) {
          router.push('/login');
          return;
      }
      const isApproved = currentUserProfile?.registrationStatus === 'approved';
      const hasAccess = currentUserProfile?.role === 'admin' || currentUserProfile?.role === 'korlap' || currentUserProfile?.appAccess === 'allpro' || currentUserProfile?.appAccess === 'all';
      if (!isApproved || !hasAccess) {
        router.push('/dashboard');
      }
    }
  }, [user, currentUserProfile, isUserLoading, isProfileLoading, router]);

  const checklistDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'tool-checklists', user.uid);
  }, [user, firestore]);
  const { data: existingChecklist, isLoading: isChecklistLoading } = useDoc<AlkerChecklist>(checklistDocRef);


  const canListUsers = useMemo(() => {
    if (!currentUserProfile) return false;
    return ['admin', 'korlap', 'teknisi'].includes(currentUserProfile.role);
  }, [currentUserProfile]);

  const usersQuery = useMemoFirebase(() => {
      if (!canListUsers) return null;
      return query(collection(firestore, 'users'), orderBy('displayName'));
  }, [firestore, canListUsers]);
  
  const { data: allUsers, isLoading: isCollectionLoading } = useCollection<UserProfile>(usersQuery);

  useEffect(() => {
    if (!canListUsers && !isProfileLoading) {
        setUsers([]);
        setAreUsersLoading(false);
        return;
    }
    if (allUsers) {
      const approvedUsers = allUsers.filter(u => u.registrationStatus === 'approved');
      setUsers(approvedUsers);
      setAreUsersLoading(false);
    }
  }, [allUsers, canListUsers, isProfileLoading]);

  const otherTeknisi = useMemo(() => {
    if (!users || !user) return [];
    return users.filter(u => u.role === 'teknisi' && u.id !== user.uid);
  }, [users, user]);

  const groupedTeknisi = useMemo(() => {
    if (!otherTeknisi) return {};
    const sortedTeknisi = [...otherTeknisi].sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
    return sortedTeknisi.reduce((acc, teknisi) => {
      const jabatan = teknisi.jabatan || 'Lainnya';
      if (!acc[jabatan]) {
        acc[jabatan] = [];
      }
      acc[jabatan].push(teknisi);
      return acc;
    }, {} as Record<string, UserProfile[]>);
  }, [otherTeknisi]);

  // --- Form Management ---
  const { register, control, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<FormValues>({
    defaultValues: {
      crewUserId: '',
      tools: toolList.map(name => ({
        toolName: name,
        condition: 'tidak-punya',
        serialNumber: '',
        brand: '',
        photoUrl1: '',
        photoUrl2: ''
      })),
      otherTools: [],
    },
  });

  const { fields } = useFieldArray({ control, name: "tools" });
  const { fields: otherFields, append: appendOther, remove: removeOther } = useFieldArray({ control, name: "otherTools" });
  
  const watchedTools = watch("tools");
  const watchedOtherTools = watch("otherTools");

  useEffect(() => {
    if (existingChecklist) {
      const predefinedToolNames = new Set(toolList);
      
      const predefinedToolsData: ToolFormData[] = toolList.map(toolName => {
        const existingTool = existingChecklist.tools.find(t => t.toolName === toolName);
        return {
          toolName: toolName,
          condition: existingTool?.condition || 'tidak-punya',
          serialNumber: existingTool?.serialNumber || '',
          brand: existingTool?.brand || '',
          photoUrl1: existingTool?.photoUrl1 || '',
          photoUrl2: existingTool?.photoUrl2 || '',
        };
      });

      const otherToolsData: ToolFormData[] = existingChecklist.tools
        .filter(t => !predefinedToolNames.has(t.toolName))
        .map(t => ({...t, photo1: undefined, photo2: undefined}));

      reset({
        crewUserId: existingChecklist.crewUserId || '',
        tools: predefinedToolsData,
        otherTools: otherToolsData,
      });
    }
  }, [existingChecklist, reset]);

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
    setIsSaving(true);
    if (!user || !currentUserProfile) {
      toast({ variant: 'destructive', title: 'Error', description: 'User data not found.' });
      setIsSaving(false);
      return;
    }

    try {
      const uploadPhoto = async (file: File) => {
          const compressedFile = await compressImage(file);
          const filePath = `notas/${user.uid}/alker-${Date.now()}-${file.name}`;
          const storageRef = ref(storage, filePath);
          await uploadBytes(storageRef, compressedFile);
          return getDownloadURL(storageRef);
      };

      const processTool = async (tool: ToolFormData): Promise<AlkerTool> => {
          let url1 = tool.photoUrl1 || '';
          let url2 = tool.photoUrl2 || '';

          if (tool.photo1 && tool.photo1.length > 0) {
              url1 = await uploadPhoto(tool.photo1[0]);
          }
          if (tool.photo2 && tool.photo2.length > 0) {
              url2 = await uploadPhoto(tool.photo2[0]);
          }

          const entry: AlkerTool = {
              toolName: tool.toolName,
              condition: tool.condition,
              serialNumber: tool.serialNumber || '',
              brand: tool.brand || '',
          };
          if (url1) entry.photoUrl1 = url1;
          if (url2) entry.photoUrl2 = url2;
          return entry;
      };

      const allToolsFromForm = [...data.tools, ...data.otherTools];
      const toolProcessingPromises: Promise<AlkerTool>[] = [];
      
      for (const tool of allToolsFromForm) {
          if (tool.toolName.trim() === '') continue; // Skip empty custom tools
          toolProcessingPromises.push(processTool(tool));
      }

      const finalTools = await Promise.all(toolProcessingPromises);
      
      const selectedCrew = users?.find(u => u.id === data.crewUserId);
      
      const checklistDocRef = doc(firestore, 'tool-checklists', user.uid);

      const checklistData: AlkerChecklist = {
        id: user.uid,
        userId: user.uid,
        userEmail: user.email!,
        userName: currentUserProfile.displayName || user.email!,
        userJabatan: currentUserProfile.jabatan || 'N/A',
        userUnit: currentUserProfile.unit || '',
        crewUserId: data.crewUserId,
        crewUserName: selectedCrew?.displayName || '',
        dateSubmitted: serverTimestamp(),
        tools: finalTools,
      };

      await setDoc(checklistDocRef, checklistData, { merge: true });

      toast({ title: 'Sukses', description: 'Laporan pengecekan alker berhasil disimpan/diperbarui.' });
      router.push('/dashboard/alker');

    } catch (error) {
      console.error("Error submitting alker checklist:", error);
      toast({ variant: "destructive", title: "Gagal Menyimpan", description: "Terjadi kesalahan saat menyimpan data." });
    } finally {
      setIsSaving(false);
    }
  };
  
  const pageIsLoading = isProfileLoading || areUsersLoading || isChecklistLoading;

  if (pageIsLoading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin" /> Memuat data...</div>;
  }

  return (
    <div className="mx-auto grid w-full flex-1 auto-rows-max gap-4">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex items-center gap-4 mb-4">
          <Button onClick={() => router.back()} variant="outline" size="icon" className="h-8 w-8" type="button">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Kembali</span>
          </Button>
          <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-bold tracking-tight sm:grow-0">
            Input Pengecekan Alat Kerja
          </h1>
          <div className="hidden items-center gap-2 md:ml-auto md:flex">
            <Button onClick={() => router.back()} variant="outline" type="button">Batal</Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <><Loader2 className="animate-spin mr-2" /> Menyimpan...</> : 'Simpan Laporan'}
            </Button>
          </div>
        </div>

        <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Informasi Teknisi</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-4 gap-6">
                    <div className="grid gap-2">
                        <Label>Nama Teknisi Utama</Label>
                        <Input value={currentUserProfile?.displayName || user?.email || ''} disabled />
                    </div>
                    <div className="grid gap-2">
                        <Label>Jabatan</Label>
                        <Input value={currentUserProfile?.jabatan || 'N/A'} disabled />
                    </div>
                    <div className="grid gap-2">
                        <Label>Unit</Label>
                        <Input value={currentUserProfile?.unit || 'N/A'} disabled />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="crewUserId">Rekan Kerja (Crew)</Label>
                        <Controller
                            name="crewUserId"
                            control={control}
                            render={({ field }) => (
                                <Select 
                                    onValueChange={(value) => field.onChange(value === 'none' ? '' : value)} 
                                    value={field.value || 'none'}
                                    disabled={!canListUsers && !areUsersLoading}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={canListUsers ? "Pilih rekan kerja..." : (areUsersLoading ? "Memuat..." : "Tidak ada data")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Tidak Ada</SelectItem>
                                        {Object.entries(groupedTeknisi).map(([jabatan, teknisiList]) => (
                                            <SelectGroup key={jabatan}>
                                                <Label className="px-2 py-1.5 text-xs font-semibold">{jabatan}</Label>
                                                {teknisiList.map(t => (
                                                    <SelectItem key={t.id} value={t.id}>{t.displayName}</SelectItem>
                                                ))}
                                            </SelectGroup>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                 <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Wrench /> Daftar Alat Kerja Standar</CardTitle>
                </CardHeader>
                <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                        {fields.map((item, index) => {
                            const needsTwoPhotos = toolsWithTwoPhotos.some(t => item.toolName.startsWith(t));
                            const isKbmR2 = item.toolName === 'KBM Roda 2';
                            const watchedPhoto1 = watch(`tools.${index}.photo1`);
                            const watchedPhoto2 = watch(`tools.${index}.photo2`);
                            
                            const photo1Preview = watchedPhoto1?.[0] ? URL.createObjectURL(watchedPhoto1[0]) : watchedTools[index]?.photoUrl1;
                            const photo2Preview = watchedPhoto2?.[0] ? URL.createObjectURL(watchedPhoto2[0]) : watchedTools[index]?.photoUrl2;

                            return (
                                <AccordionItem value={`item-${index}`} key={item.id}>
                                    <AccordionTrigger>{index + 1}. {item.toolName}</AccordionTrigger>
                                    <AccordionContent>
                                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 p-4">
                                            <div className="grid gap-2">
                                                <Label>Kondisi</Label>
                                                <Controller
                                                    name={`tools.${index}.condition`}
                                                    control={control}
                                                    render={({ field }) => (
                                                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
                                                            <div className="flex items-center space-x-2"><RadioGroupItem value="baik" id={`baik-${index}`} /><Label htmlFor={`baik-${index}`}>Baik</Label></div>
                                                            <div className="flex items-center space-x-2"><RadioGroupItem value="rusak" id={`rusak-${index}`} /><Label htmlFor={`rusak-${index}`}>Rusak</Label></div>
                                                            <div className="flex items-center space-x-2"><RadioGroupItem value="tidak-punya" id={`tidak-punya-${index}`} /><Label htmlFor={`tidak-punya-${index}`}>Tidak Punya</Label></div>
                                                        </RadioGroup>
                                                    )}
                                                />
                                            </div>
                                             <div className="grid gap-2">
                                                <Label htmlFor={`sn-${index}`}>{isKbmR2 ? 'Plat Nomor' : 'Serial Number (SN)'}</Label>
                                                <Input id={`sn-${index}`} {...register(`tools.${index}.serialNumber`)} placeholder={isKbmR2 ? 'Contoh: K 1234 AB' : 'Masukkan SN...'} />
                                            </div>
                                             <div className="grid gap-2">
                                                <Label htmlFor={`brand-${index}`}>Merek / Tipe</Label>
                                                <Input id={`brand-${index}`} {...register(`tools.${index}.brand`)} placeholder="Contoh: Fujikura, Joinwit" />
                                            </div>
                                            <div className="grid gap-4 grid-cols-2">
                                                <div className="grid gap-2">
                                                    <Label htmlFor={`photo1-${index}`}>{needsTwoPhotos ? 'Foto Alat' : 'Foto'}</Label>
                                                    {photo1Preview && (
                                                        <div className="relative group aspect-square w-full">
                                                          <Image src={photo1Preview} alt="Preview" fill className="object-cover rounded-md" />
                                                          <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full z-10" onClick={() => { setValue(`tools.${index}.photo1`, undefined); setValue(`tools.${index}.photoUrl1`, ''); }}>
                                                            <X className="h-4 w-4" />
                                                          </Button>
                                                        </div>
                                                    )}
                                                    <Input id={`photo1-${index}`} type="file" accept="image/*" {...register(`tools.${index}.photo1`)} />
                                                </div>
                                                {needsTwoPhotos && (
                                                    <div className="grid gap-2">
                                                        <Label htmlFor={`photo2-${index}`}>Foto SN</Label>
                                                        {photo2Preview && (
                                                            <div className="relative group aspect-square w-full">
                                                              <Image src={photo2Preview} alt="Preview SN" fill className="object-cover rounded-md" />
                                                              <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full z-10" onClick={() => { setValue(`tools.${index}.photo2`, undefined); setValue(`tools.${index}.photoUrl2`, ''); }}>
                                                                <X className="h-4 w-4" />
                                                              </Button>
                                                            </div>
                                                        )}
                                                        <Input id={`photo2-${index}`} type="file" accept="image/*" {...register(`tools.${index}.photo2`)} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            );
                        })}
                    </Accordion>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">Daftar Alat Lain-lain</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {otherFields.map((field, index) => {
                        const watchedPhoto1 = watch(`otherTools.${index}.photo1`);
                        const watchedPhoto2 = watch(`otherTools.${index}.photo2`);
                        const photo1Preview = watchedPhoto1?.[0] ? URL.createObjectURL(watchedPhoto1[0]) : watchedOtherTools[index]?.photoUrl1;
                        const photo2Preview = watchedPhoto2?.[0] ? URL.createObjectURL(watchedPhoto2[0]) : watchedOtherTools[index]?.photoUrl2;
                        
                        return (
                            <Card key={field.id} className="p-4 relative bg-muted/20">
                                <Button type="button" variant="destructive" size="icon" className="absolute -top-3 -right-3 h-7 w-7 rounded-full z-10" onClick={() => removeOther(index)}>
                                    <Trash2 className="h-4 w-4"/>
                                </Button>
                                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div className="grid gap-2 md:col-span-2">
                                        <Label htmlFor={`otherToolName-${index}`}>Nama Alat *</Label>
                                        <Input id={`otherToolName-${index}`} {...register(`otherTools.${index}.toolName`, { required: true })} placeholder="Contoh: Tang Ampere" />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Kondisi</Label>
                                        <Controller
                                            name={`otherTools.${index}.condition`}
                                            control={control}
                                            render={({ field }) => (
                                                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
                                                    <div className="flex items-center space-x-2"><RadioGroupItem value="baik" id={`otherBaik-${index}`} /><Label htmlFor={`otherBaik-${index}`}>Baik</Label></div>
                                                    <div className="flex items-center space-x-2"><RadioGroupItem value="rusak" id={`otherRusak-${index}`} /><Label htmlFor={`otherRusak-${index}`}>Rusak</Label></div>
                                                    <div className="flex items-center space-x-2"><RadioGroupItem value="tidak-punya" id={`other-tidak-punya-${index}`} /><Label htmlFor={`other-tidak-punya-${index}`}>Tidak Punya</Label></div>
                                                </RadioGroup>
                                            )}
                                        />
                                    </div>
                                     <div className="grid gap-2">
                                        <Label htmlFor={`otherBrand-${index}`}>Merek / Tipe</Label>
                                        <Input id={`otherBrand-${index}`} {...register(`otherTools.${index}.brand`)} placeholder="Contoh: Kyoritsu" />
                                    </div>
                                     <div className="grid gap-2 md:col-span-2">
                                        <Label htmlFor={`otherSN-${index}`}>Serial Number (SN)</Label>
                                        <Input id={`otherSN-${index}`} {...register(`otherTools.${index}.serialNumber`)} placeholder="Masukkan SN..." />
                                    </div>
                                    <div className="grid gap-4 grid-cols-2 md:col-span-2">
                                        <div className="grid gap-2">
                                            <Label htmlFor={`otherPhoto1-${index}`}>Foto 1</Label>
                                            {photo1Preview && (
                                                <div className="relative group aspect-square w-full">
                                                  <Image src={photo1Preview} alt="Preview" fill className="object-cover rounded-md" />
                                                  <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full z-10" onClick={() => { setValue(`otherTools.${index}.photo1`, undefined); setValue(`otherTools.${index}.photoUrl1`, ''); }}>
                                                    <X className="h-4 w-4" />
                                                  </Button>
                                                </div>
                                            )}
                                            <Input id={`otherPhoto1-${index}`} type="file" accept="image/*" {...register(`otherTools.${index}.photo1`)} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor={`otherPhoto2-${index}`}>Foto 2</Label>
                                            {photo2Preview && (
                                                <div className="relative group aspect-square w-full">
                                                  <Image src={photo2Preview} alt="Preview SN" fill className="object-cover rounded-md" />
                                                  <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full z-10" onClick={() => { setValue(`otherTools.${index}.photo2`, undefined); setValue(`otherTools.${index}.photoUrl2`, ''); }}>
                                                    <X className="h-4 w-4" />
                                                  </Button>
                                                </div>
                                            )}
                                            <Input id={`otherPhoto2-${index}`} type="file" accept="image/*" {...register(`otherTools.${index}.photo2`)} />
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                    <Button type="button" variant="outline" className="w-full mt-4" onClick={() => appendOther({ toolName: '', condition: 'tidak-punya', serialNumber: '', brand: '', photoUrl1: '', photoUrl2: '' })}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Tambah Alat Lain-lain
                    </Button>
                </CardContent>
            </Card>

        </div>

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
