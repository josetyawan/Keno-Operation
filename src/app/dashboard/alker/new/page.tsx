
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, Upload, X, Wrench } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useFirestore, addDocumentNonBlocking, useUser, useStorage, useCollection, useMemoFirebase } from '@/firebase';
import { collection, serverTimestamp, query, where, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
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

type FormValues = {
  crewUserId: string;
  tools: (Omit<AlkerTool, 'photoUrl1' | 'photoUrl2'> & { photo1?: FileList; photo2?: FileList })[];
};

export default function NewAlkerPage() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const storage = useStorage();
  const [isSaving, setIsSaving] = useState(false);

  // --- Data Fetching ---
  const usersQuery = useMemoFirebase(() => query(collection(firestore, 'users'), where('registrationStatus', '==', 'approved'), orderBy('displayName')), [firestore]);
  const { data: users, isLoading: areUsersLoading } = useCollection<UserProfile>(usersQuery);

  const currentUserProfile = useMemo(() => users?.find(u => u.id === user?.uid), [users, user]);
  const otherTeknisi = useMemo(() => users?.filter(u => u.role === 'teknisi' && u.id !== user?.uid), [users, user]);

  const groupedTeknisi = useMemo(() => {
    if (!otherTeknisi) return {};
    return otherTeknisi.reduce((acc, teknisi) => {
      const jabatan = teknisi.jabatan || 'Lainnya';
      if (!acc[jabatan]) {
        acc[jabatan] = [];
      }
      acc[jabatan].push(teknisi);
      return acc;
    }, {} as Record<string, UserProfile[]>);
  }, [otherTeknisi]);

  // --- Form Management ---
  const { register, control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      crewUserId: '',
      tools: toolList.map(name => ({
        toolName: name,
        condition: 'baik',
        serialNumber: '',
        brand: '',
      })),
    },
  });

  const { fields } = useFieldArray({ control, name: "tools" });

  const onSubmit = async (data: FormValues) => {
    setIsSaving(true);
    if (!user || !currentUserProfile) {
      toast({ variant: 'destructive', title: 'Error', description: 'User data not found.' });
      setIsSaving(false);
      return;
    }

    try {
      const toolDataWithUrls: AlkerTool[] = [];

      for (let i = 0; i < data.tools.length; i++) {
        const tool = data.tools[i];
        let photoUrl1: string | undefined = undefined;
        let photoUrl2: string | undefined = undefined;

        const uploadPhoto = async (file: File) => {
            const filePath = `alker-photos/${user.uid}/${Date.now()}-${file.name}`;
            const storageRef = ref(storage, filePath);
            await uploadBytes(storageRef, file);
            return getDownloadURL(storageRef);
        };

        if (tool.photo1 && tool.photo1.length > 0) {
          photoUrl1 = await uploadPhoto(tool.photo1[0]);
        }
        if (tool.photo2 && tool.photo2.length > 0) {
          photoUrl2 = await uploadPhoto(tool.photo2[0]);
        }
        
        toolDataWithUrls.push({
            toolName: tool.toolName,
            condition: tool.condition,
            serialNumber: tool.serialNumber,
            brand: tool.brand,
            photoUrl1,
            photoUrl2,
        });
      }

      const selectedCrew = users?.find(u => u.id === data.crewUserId);

      const newChecklist: Omit<AlkerChecklist, 'id'> = {
        userId: user.uid,
        userEmail: user.email!,
        userName: currentUserProfile.displayName || user.email!,
        userJabatan: currentUserProfile.jabatan || 'N/A',
        crewUserId: selectedCrew?.id,
        crewUserName: selectedCrew?.displayName,
        dateSubmitted: serverTimestamp(),
        tools: toolDataWithUrls,
      };

      await addDocumentNonBlocking(collection(firestore, 'alker-checklists'), newChecklist);

      toast({ title: 'Sukses', description: 'Laporan pengecekan alker berhasil disimpan.' });
      router.push('/dashboard/alker');

    } catch (error) {
      console.error("Error submitting alker checklist:", error);
      toast({ variant: "destructive", title: "Gagal Menyimpan", description: "Terjadi kesalahan saat menyimpan data." });
    } finally {
      setIsSaving(false);
    }
  };

  if (areUsersLoading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin" /> Memuat data teknisi...</div>;
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
                <CardContent className="grid md:grid-cols-3 gap-6">
                    <div className="grid gap-2">
                        <Label>Nama Teknisi Utama</Label>
                        <Input value={currentUserProfile?.displayName || user?.email || ''} disabled />
                    </div>
                    <div className="grid gap-2">
                        <Label>Jabatan</Label>
                        <Input value={currentUserProfile?.jabatan || 'N/A'} disabled />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="crewUserId">Rekan Kerja (Crew)</Label>
                        <Controller
                            name="crewUserId"
                            control={control}
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <SelectTrigger><SelectValue placeholder="Pilih rekan kerja..." /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">Tidak Ada</SelectItem>
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
                    <CardTitle className="flex items-center gap-2"><Wrench /> Daftar Alat Kerja</CardTitle>
                </CardHeader>
                <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                        {fields.map((item, index) => {
                            const needsTwoPhotos = toolsWithTwoPhotos.some(t => item.toolName.startsWith(t));
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
                                                        </RadioGroup>
                                                    )}
                                                />
                                            </div>
                                             <div className="grid gap-2">
                                                <Label htmlFor={`sn-${index}`}>Serial Number (SN)</Label>
                                                <Input id={`sn-${index}`} {...register(`tools.${index}.serialNumber`)} placeholder="Masukkan SN..." />
                                            </div>
                                             <div className="grid gap-2">
                                                <Label htmlFor={`brand-${index}`}>Merek / Tipe</Label>
                                                <Input id={`brand-${index}`} {...register(`tools.${index}.brand`)} placeholder="Contoh: Fujikura, Joinwit" />
                                            </div>
                                            <div className="grid gap-4 grid-cols-2">
                                                 <div className="grid gap-2">
                                                    <Label htmlFor={`photo1-${index}`}>{needsTwoPhotos ? 'Foto Alat' : 'Foto'}</Label>
                                                    <Input id={`photo1-${index}`} type="file" accept="image/*" {...register(`tools.${index}.photo1`)} />
                                                </div>
                                                {needsTwoPhotos && (
                                                     <div className="grid gap-2">
                                                        <Label htmlFor={`photo2-${index}`}>Foto SN</Label>
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
        </div>

        <div className="flex items-center justify-end gap-2 mt-4">
          <Button onClick={() => router.back()} variant="outline" type="button">Batal</Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? <><Loader2 className="animate-spin mr-2" /> Menyimpan...</> : 'Simpan Laporan'}
          </Button>
        </div>
      </form>
    </div>
  );
}

