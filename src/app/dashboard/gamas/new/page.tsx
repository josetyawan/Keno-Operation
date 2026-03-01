
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, Upload, X, FileWarning, ChevronsUpDown, Check, Camera } from 'lucide-react';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useFirestore, useUser, useStorage, useDoc, useMemoFirebase } from '@/firebase';
import { collection, serverTimestamp, doc, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { GamasReport, UserProfile } from '@/lib/types';
import Image from 'next/image';
import { designatorListData } from '@/lib/designator-data';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';


export default function NewGamasReportPage() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const storage = useStorage();
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [designator, setDesignator] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  
  // State for searchable designator dropdown
  const [isDesignatorOpen, setIsDesignatorOpen] = useState(false);
  const [designatorSearch, setDesignatorSearch] = useState('');

  // State for camera
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

  useEffect(() => {
    // Cleanup preview URLs to prevent memory leaks
    return () => {
      previews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previews]);
  
  const filteredDesignators = useMemo(() => {
    if (!designatorSearch) {
        return designatorListData;
    }
    const lowercasedSearch = designatorSearch.toLowerCase();
    return designatorListData.filter(
        d => d.code.toLowerCase().includes(lowercasedSearch) || d.description.toLowerCase().includes(lowercasedSearch)
    );
  }, [designatorSearch]);

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      if (photos.length + newFiles.length > 10) {
        toast({
          variant: 'destructive',
          title: 'Maksimal 10 Foto',
          description: 'Anda hanya dapat mengunggah hingga 10 foto.',
        });
        return;
      }
      const newPhotos = [...photos, ...newFiles];
      setPhotos(newPhotos);
      
      const newPreviews = newFiles.map(file => URL.createObjectURL(file));
      setPreviews(prev => [...prev, ...newPreviews]);
    }
  };
  
  const removePhoto = (indexToRemove: number) => {
    setPhotos(prev => prev.filter((_, index) => index !== indexToRemove));
    setPreviews(prev => {
        const urlToRemove = prev[indexToRemove];
        if (urlToRemove) URL.revokeObjectURL(urlToRemove); // Clean up memory
        return prev.filter((_, index) => index !== indexToRemove);
    });
  };

    useEffect(() => {
    if (isCameraOpen) {
      const getCameraPermission = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          setStream(stream);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (error) {
          console.error('Error accessing camera:', error);
          toast({
            variant: 'destructive',
            title: 'Izin Kamera Ditolak',
            description: 'Mohon izinkan akses kamera di pengaturan browser Anda.',
          });
          setIsCameraOpen(false);
        }
      };
      getCameraPermission();
    } else {
      stream?.getTracks().forEach(track => track.stop());
    }

    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [isCameraOpen, toast, stream]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      if (photos.length >= 10) {
        toast({
          variant: 'destructive',
          title: 'Maksimal 10 Foto',
        });
        return;
      }
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context?.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
          setPhotos(prev => [...prev, file]);
          setPreviews(prev => [...prev, URL.createObjectURL(file)]);
          setIsCameraOpen(false);
        }
      }, 'image/jpeg');
    }
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !userProfile) {
      toast({ variant: 'destructive', title: 'Error', description: 'Pengguna tidak ditemukan.' });
      return;
    }
    if (!designator) {
      toast({ variant: 'destructive', title: 'Data Tidak Lengkap', description: 'Silakan pilih designator.' });
      return;
    }
    if (photos.length < 4) {
      toast({ variant: 'destructive', title: 'Foto Kurang', description: 'Anda harus mengunggah minimal 4 foto.' });
      return;
    }
    
    setIsSaving(true);
    
    try {
        const uploadPromises = photos.map(async (file) => {
            const filePath = `gamas-photos/${user.uid}/${Date.now()}-${file.name}`;
            const storageRef = ref(storage, filePath);
            await uploadBytes(storageRef, file);
            return getDownloadURL(storageRef);
        });

        const photoUrls = await Promise.all(uploadPromises);

        const gamasCollection = collection(firestore, 'gamas-reports');
        
        const newReport: Omit<GamasReport, 'id'> = {
            userId: user.uid,
            userName: userProfile.displayName || user.email!,
            designator,
            photoUrls,
            notes,
            createdAt: serverTimestamp(),
        };

        await addDoc(gamasCollection, newReport);
        
        toast({ title: 'Laporan Berhasil Dibuat', description: 'Laporan eviden gamas Anda telah disimpan.' });
        router.push('/dashboard/gamas');

    } catch (error) {
        console.error("Error creating Gamas report:", error);
        toast({ variant: 'destructive', title: 'Gagal Menyimpan', description: 'Terjadi kesalahan saat menyimpan laporan.' });
    } finally {
        setIsSaving(false);
    }
  }


  return (
    <div className="mx-auto grid w-full flex-1 auto-rows-max gap-4">
        <form onSubmit={handleSubmit}>
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
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><FileWarning /> Detail Laporan</CardTitle>
                    <CardDescription>Pilih designator dan unggah foto-foto eviden yang diperlukan.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6">
                    <div className="grid gap-3">
                        <Label htmlFor="designator">Designator *</Label>
                        <Popover open={isDesignatorOpen} onOpenChange={setIsDesignatorOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={isDesignatorOpen}
                                    className="w-full justify-between font-normal"
                                >
                                    <span className="truncate">
                                        {designator
                                            ? designatorListData.find((d) => d.code === designator)?.code
                                            : "Pilih atau cari designator..."}
                                    </span>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <div className="p-2">
                                    <Input
                                        placeholder="Cari kode atau keterangan..."
                                        value={designatorSearch}
                                        onChange={(e) => setDesignatorSearch(e.target.value)}
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
                                                    onClick={() => {
                                                        setDesignator(d.code);
                                                        setIsDesignatorOpen(false);
                                                        setDesignatorSearch('');
                                                    }}
                                                    className={cn(
                                                        "w-full text-left p-2 rounded-md hover:bg-accent flex items-center justify-between",
                                                    )}
                                                >
                                                    <div>
                                                        <p className="font-medium text-sm">{d.code}</p>
                                                        <p className="text-xs text-muted-foreground">{d.description}</p>
                                                    </div>
                                                    <Check className={cn("h-4 w-4", designator === d.code ? "opacity-100" : "opacity-0")} />
                                                </button>
                                            ))
                                        ) : (
                                            <div className="p-2 text-center text-sm text-muted-foreground">
                                                Tidak ada designator ditemukan.
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="grid gap-3">
                        <Label htmlFor="notes">Catatan</Label>
                        <Textarea id="notes" placeholder="Catatan tambahan (opsional)..." value={notes} onChange={(e) => setNotes(e.target.value)} />
                    </div>
                    <div className="grid gap-3">
                        <Label>Foto Eviden (min 4, max 10)</Label>
                        <div className="flex gap-2">
                            <Label htmlFor="photo-upload" className={cn(buttonVariants({ variant: "outline" }), "cursor-pointer")}>
                                <Upload className="mr-2 h-4 w-4" />
                                Upload dari Galeri
                            </Label>
                            <input type="file" id="photo-upload" className="hidden" onChange={handlePhotoChange} accept="image/*" multiple disabled={photos.length >= 10}/>

                            <Button type="button" variant="secondary" onClick={() => setIsCameraOpen(true)} disabled={photos.length >= 10}>
                                <Camera className="mr-2 h-4 w-4" />
                                Ambil Foto
                            </Button>
                        </div>

                         <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-2">
                            {previews.map((previewUrl, index) => (
                                <div key={index} className="relative group aspect-square">
                                    <Image src={previewUrl} alt={`Preview ${index + 1}`} fill className="object-cover rounded-md border" />
                                    <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full z-10 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removePhoto(index)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                         {photos.length > 0 && <p className="text-sm text-muted-foreground">{photos.length} / 10 foto terpilih.</p>}
                    </div>
                </CardContent>
            </Card>

            <div className="flex items-center justify-end gap-2 mt-4 md:hidden">
                <Button onClick={() => router.back()} variant="outline" type="button">Batal</Button>
                <Button type="submit" disabled={isSaving}>
                    {isSaving ? <><Loader2 className="animate-spin mr-2" /> Menyimpan...</> : 'Simpan Laporan'}
                </Button>
            </div>
        </form>

        <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Ambil Foto Eviden</DialogTitle>
                </DialogHeader>
                <div className="relative aspect-video w-full bg-muted rounded-md overflow-hidden flex items-center justify-center">
                    <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                    <canvas ref={canvasRef} className="hidden"></canvas>
                </div>
                <DialogFooter>
                    <Button variant="secondary" onClick={() => setIsCameraOpen(false)}>Batal</Button>
                    <Button onClick={handleCapture}>Ambil Gambar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}

    