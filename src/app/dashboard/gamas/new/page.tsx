
'use client';

import { useRouter } from 'next/navigation';
import { Button, buttonVariants } from '@/components/ui/button';
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
import { ArrowLeft, Loader2, Upload, X, FileWarning, ChevronsUpDown, Check, Camera, PlusCircle } from 'lucide-react';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';


export default function NewGamasReportPage() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const storage = useStorage();
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [noTiket, setNoTiket] = useState('');
  const [selectedDesignators, setSelectedDesignators] = useState<string[]>([]);
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

  const addDesignator = (code: string) => {
    if (!selectedDesignators.includes(code)) {
      setSelectedDesignators(prev => [...prev, code]);
    }
    setIsDesignatorOpen(false);
    setDesignatorSearch('');
  };

  const removeDesignator = (codeToRemove: string) => {
    setSelectedDesignators(prev => prev.filter(code => code !== codeToRemove));
  };

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
          description: 'Anda telah mencapai batas maksimum 10 foto.',
        });
        setIsCameraOpen(false); // Close if max is reached
        return;
      }
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context?.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      
      // Convert data URL to File object
      fetch(dataUrl)
        .then(res => res.blob())
        .then(blob => {
            const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
            setPhotos(prev => [...prev, file]);
            setPreviews(prev => [...prev, URL.createObjectURL(file)]);
            toast({
              title: `Foto ${photos.length + 1} ditambahkan`,
              description: `Anda dapat mengambil foto lagi atau menutup kamera jika sudah selesai.`,
              duration: 2000,
            });
        });
    }
  };
  
  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1024;
        const MAX_HEIGHT = 1024;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return reject(new Error('Could not get canvas context'));
        }
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Canvas to Blob conversion failed'));
            }
          },
          'image/jpeg',
          0.75 // Compression quality
        );
        URL.revokeObjectURL(img.src);
      };
      img.onerror = (err) => {
        URL.revokeObjectURL(img.src);
        reject(err);
      };
    });
  };


  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !userProfile) {
      toast({ variant: 'destructive', title: 'Error', description: 'Pengguna tidak ditemukan.' });
      return;
    }
    if (!noTiket.trim() || selectedDesignators.length === 0) {
      toast({ variant: 'destructive', title: 'Data Tidak Lengkap', description: 'Silakan isi No. Tiket dan pilih setidaknya satu designator.' });
      return;
    }
    if (photos.length < 4) {
      toast({ variant: 'destructive', title: 'Foto Kurang', description: 'Anda harus mengunggah minimal 4 foto.' });
      return;
    }
    
    setIsSaving(true);
    
    try {
        const uploadPromises = photos.map(async (file) => {
            const compressedBlob = await compressImage(file);
            const filePath = `gamas-photos/${user.uid}/${Date.now()}-${file.name.split('.')[0]}.jpg`;
            const storageRef = ref(storage, filePath);
            await uploadBytes(storageRef, compressedBlob);
            return getDownloadURL(storageRef);
        });
        
        const uploadedUrls = await Promise.all(uploadPromises);

        const gamasCollection = collection(firestore, 'gamas-reports');
        
        const newReport: Omit<GamasReport, 'id'> = {
            userId: user.uid,
            userName: userProfile.displayName || user.email!,
            noTiket: noTiket.trim(),
            designators: selectedDesignators,
            photoUrls: uploadedUrls,
            notes,
            createdAt: serverTimestamp(),
            status: 'pending',
        };

        await addDoc(gamasCollection, newReport);
        
        toast({ title: 'Laporan Berhasil Dibuat', description: 'Laporan eviden gamas Anda telah disimpan.' });
        router.push('/dashboard/gamas');

    } catch (error) {
        console.error("Error creating Gamas report:", error);
        toast({ variant: 'destructive', title: 'Gagal Menyimpan', description: 'Terjadi kesalahan saat mengunggah atau menyimpan laporan. Silakan coba lagi.' });
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
                        <Label htmlFor="noTiket">No. Tiket *</Label>
                        <Input id="noTiket" placeholder="Contoh: INC12345678" value={noTiket} onChange={(e) => setNoTiket(e.target.value)} required />
                    </div>
                    <div className="grid gap-3">
                        <Label>Designator *</Label>
                        <div className="flex flex-wrap gap-2 mb-2 min-h-[24px]">
                            {selectedDesignators.map(code => (
                                <Badge key={code} variant="secondary" className="text-base">
                                    {code}
                                    <button type="button" onClick={() => removeDesignator(code)} className="ml-2 rounded-full p-0.5 hover:bg-destructive/20">
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                        <Popover open={isDesignatorOpen} onOpenChange={setIsDesignatorOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="w-full justify-start font-normal"
                                >
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Tambah Designator...
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
                                                    onClick={() => addDesignator(d.code)}
                                                    className={cn(
                                                        "w-full text-left p-2 rounded-md hover:bg-accent flex items-center justify-between",
                                                    )}
                                                >
                                                    <div>
                                                        <p className="font-medium text-sm">{d.code}</p>
                                                        <p className="text-xs text-muted-foreground">{d.description}</p>
                                                    </div>
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
                    <DialogTitle>Ambil Foto Eviden ({photos.length} / 10)</DialogTitle>
                     <DialogDescription>
                        Arahkan kamera dan klik "Ambil Gambar". Anda dapat mengambil beberapa foto sekaligus.
                    </DialogDescription>
                </DialogHeader>
                <div className="relative aspect-video w-full bg-muted rounded-md overflow-hidden flex items-center justify-center">
                    <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                    <canvas ref={canvasRef} className="hidden"></canvas>
                </div>
                <DialogFooter className="sm:justify-between">
                    <Button variant="secondary" onClick={() => setIsCameraOpen(false)}>Selesai & Tutup</Button>
                    <Button onClick={handleCapture} disabled={photos.length >= 10}>Ambil Gambar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}
