

'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
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
import { PlusCircle, MapPin, Loader2, Search, History, Phone, Pencil, Wrench, QrCode, FileSpreadsheet, AlertCircle, Info, Upload, Trash2, Bot, CalendarIcon, MessageSquare, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useStorage } from '@/firebase/provider';
import { collection, query, doc, serverTimestamp, where, getDocs, limit, orderBy, Timestamp, writeBatch, deleteDoc, addDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { UserProfile, Pelanggan, RiwayatGangguan, MaterialEvidence } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { format, isValid, parse } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';


const serviceAreas = ['SA KUDUS', 'SA PATI', 'SA JEPARA', 'SA PURWODADI', 'SA BLORA', 'SA REMBANG'];

// --- Helper Functions ---

const safeToDate = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (timestamp.toDate) return timestamp.toDate();
    if (timestamp instanceof Date && isValid(timestamp)) return timestamp;
    const d = new Date(timestamp);
    return isValid(d) ? d : null;
};

const formatWaNumber = (phone: string) => {
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
        cleanPhone = '62' + cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith('62')) {
        cleanPhone = '62' + cleanPhone;
    }
    return `https://wa.me/${cleanPhone}`;
};

function NewPelangganDialog({ isOpen, onOpenChange, onFinished }: { isOpen: boolean, onOpenChange: (open: boolean) => void, onFinished: (pelanggan: Pelanggan) => void }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const storage = useStorage();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    
    // Form state
    const [noService, setNoService] = useState('');
    const [namaPelanggan, setNamaPelanggan] = useState('');
    const [alamat, setAlamat] = useState('');
    const [nomorTelepon, setNomorTelepon] = useState('');
    const [koordinat, setKoordinat] = useState('');
    const [serviceArea, setServiceArea] = useState('');
    const [sto, setSto] = useState('');
    const [odpName, setOdpName] = useState('');
    const [odpPort, setOdpPort] = useState('');
    const [odpQRCodeUrl, setOdpQRCodeUrl] = useState('');
    const [fotoCp, setFotoCp] = useState<File | null>(null);
    const [fotoCpPreview, setFotoCpPreview] = useState<string | null>(null);
    const [isGettingLocation, setIsGettingLocation] = useState(false);

     useEffect(() => {
        if (!isOpen) {
            // Reset all state when dialog closes
            setNoService('');
            setNamaPelanggan('');
            setAlamat('');
            setNomorTelepon('');
            setKoordinat('');
            setServiceArea('');
            setSto('');
            setOdpName('');
            setOdpPort('');
            setOdpQRCodeUrl('');
            setFotoCp(null);
            setFotoCpPreview(null);
        }
    }, [isOpen]);
    
    useEffect(() => {
        if (odpName) {
            const parts = odpName.trim().toUpperCase().split('-');
            if (parts.length > 1) {
                setSto(parts[1]);
            } else {
                setSto('');
            }
        } else {
            setSto('');
        }
    }, [odpName]);


    const handleGetLocation = () => {
        setIsGettingLocation(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setKoordinat(`${position.coords.latitude}, ${position.coords.longitude}`);
                setIsGettingLocation(false);
            },
            () => {
                toast({ variant: 'destructive', title: 'Gagal Mendapatkan Lokasi' });
                setIsGettingLocation(false);
            }
        );
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setFotoCp(file);
            setFotoCpPreview(URL.createObjectURL(file));
        }
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !user.email || !noService || !namaPelanggan || !koordinat || !serviceArea) {
            toast({ variant: 'destructive', title: 'Data Tidak Lengkap', description: 'Harap isi semua kolom yang ditandai dengan tanda bintang (*).' });
            return;
        }
        setIsSaving(true);
        try {
            let fotoCpUrl: string | undefined = undefined;
            if (fotoCp) {
                const filePath = `notas/${user.uid}/pelanggan_photo_${Date.now()}-${fotoCp.name}`;
                const storageRef = ref(storage, filePath);
                await uploadBytes(storageRef, fotoCp);
                fotoCpUrl = await getDownloadURL(storageRef);
            }

            const newPelangganData: Omit<Pelanggan, 'id'> = {
                userId: user.uid,
                userEmail: user.email,
                noService,
                namaPelanggan,
                alamat,
                nomorTelepon: nomorTelepon ? [nomorTelepon] : [],
                koordinat,
                fotoCpUrl,
                serviceArea,
                sto: sto,
                odpName: odpName.trim(),
                odpPort: odpPort.trim(),
                odpQRCodeUrl: odpQRCodeUrl.trim(),
                dateAdded: serverTimestamp(),
                lastEditedBy: user.email,
                lastEditedDate: serverTimestamp(),
            };
            const docRef = await addDoc(collection(firestore, 'pelanggan'), newPelangganData);
            onFinished({ ...newPelangganData, id: docRef.id } as Pelanggan);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Gagal menyimpan', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Tambah Pelanggan Baru</DialogTitle>
                    <DialogDescription>Isi detail pelanggan di bawah ini.</DialogDescription>
                </DialogHeader>
                 <form onSubmit={handleSubmit} className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                  <div className="grid gap-2">
                    <Label htmlFor="new-noService">No. Service *</Label>
                    <Input id="new-noService" value={noService} onChange={(e) => setNoService(e.target.value)} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="new-namaPelanggan">Nama Pelanggan *</Label>
                    <Input id="new-namaPelanggan" value={namaPelanggan} onChange={(e) => setNamaPelanggan(e.target.value)} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="new-alamat">Alamat</Label>
                    <Textarea id="new-alamat" value={alamat} onChange={(e) => setAlamat(e.target.value)} />
                  </div>
                   <div className="grid gap-2">
                    <Label htmlFor="new-nomorTelepon">No. Telepon</Label>
                    <Input id="new-nomorTelepon" value={nomorTelepon} onChange={(e) => setNomorTelepon(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="new-koordinat">Koordinat *</Label>
                    <div className="flex items-center gap-2">
                        <Input id="new-koordinat" value={koordinat} onChange={(e) => setKoordinat(e.target.value)} required />
                        <Button type="button" variant="outline" size="icon" onClick={handleGetLocation} disabled={isGettingLocation}>
                            {isGettingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                        </Button>
                    </div>
                  </div>
                   <div className="grid gap-2">
                    <Label htmlFor="new-serviceArea">Service Area *</Label>
                     <Select value={serviceArea} onValueChange={setServiceArea} required>
                        <SelectTrigger><SelectValue placeholder="Pilih Service Area" /></SelectTrigger>
                        <SelectContent>{serviceAreas.map(sa => <SelectItem key={sa} value={sa}>{sa}</SelectItem>)}</SelectContent>
                      </Select>
                  </div>
                   <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="new-odpName">Nama ODP</Label>
                            <Input id="new-odpName" value={odpName} onChange={(e) => setOdpName(e.target.value)} placeholder="Contoh: ODP-KDS-FA/001" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="new-sto">STO</Label>
                            <Input id="new-sto" value={sto} disabled placeholder="Otomatis dari ODP" />
                        </div>
                   </div>
                   <div className="grid gap-2">
                    <Label htmlFor="new-odpPort">Port ODP</Label>
                    <Input id="new-odpPort" value={odpPort} onChange={(e) => setOdpPort(e.target.value)} placeholder="Contoh: 5" />
                  </div>
                   <div className="grid gap-2">
                    <Label htmlFor="new-odpQRCodeUrl">URL QR Code ODP</Label>
                    <Input id="new-odpQRCodeUrl" value={odpQRCodeUrl} onChange={(e) => setOdpQRCodeUrl(e.target.value)} placeholder="https://..." />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="new-fotoCp">Foto Lokasi</Label>
                    <Input id="new-fotoCp" type="file" onChange={handleFileChange} accept="image/*" />
                    {fotoCpPreview && <div className="relative w-32 h-32 mt-2"><Image src={fotoCpPreview} alt="Preview Foto" fill className="rounded-md object-cover" /></div>}
                  </div>
                  <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="secondary">Batal</Button></DialogClose>
                    <Button type="submit" disabled={isSaving}>{isSaving ? <Loader2 className="animate-spin" /> : 'Simpan'}</Button>
                  </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function NewRiwayatDialog({ pelanggan, isOpen, onOpenChange, onFinished, currentUserProfile }: { pelanggan: Pelanggan, isOpen: boolean, onOpenChange: (open: boolean) => void, onFinished: (riwayat: RiwayatGangguan) => void, currentUserProfile: UserProfile | null }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const storage = useStorage();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    
    // Form state
    const [tanggalOpen, setTanggalOpen] = useState('');
    const [tanggalClose, setTanggalClose] = useState('');
    const [noTiket, setNoTiket] = useState('');
    const [jenisOrder, setJenisOrder] = useState('');
    const [typeOrder, setTypeOrder] = useState('');
    const [keterangan, setKeterangan] = useState('');
    const [selectedLayanan, setSelectedLayanan] = useState<string[]>([]);
    const [selectedMaterials, setSelectedMaterials] = useState<Record<string, boolean>>({});
    const [materialFiles, setMaterialFiles] = useState<Record<string, Record<string, File | null>>>({});
    const [materialQuantities, setMaterialQuantities] = useState<Record<string, number>>({});
    const [materialDetails, setMaterialDetails] = useState<Record<string, Record<string, string>>>({});
    const [evidenScc, setEvidenScc] = useState<File | null>(null);
    const [dorongClose, setDorongClose] = useState(false);

    useEffect(() => {
        const protectionSleeveQty = materialQuantities['Protection Sleeve'];
        if (protectionSleeveQty && protectionSleeveQty > 0) {
            // Auto-calculate and set Termovit quantity
            setMaterialQuantities(prev => ({
                ...prev,
                'Termovit (cm)': protectionSleeveQty * 15,
            }));
            // Auto-select Termovit if Protection Sleeve is used and it's not already selected
            if (!selectedMaterials['Termovit (cm)']) {
                setSelectedMaterials(prev => ({
                    ...prev,
                    ['Termovit (cm)']: true,
                }));
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [materialQuantities['Protection Sleeve']]);

    const showTypeOrder = useMemo(() => Object.keys(typeOrderOptions).includes(jenisOrder), [jenisOrder]);
    
    useEffect(() => {
        if (isOpen) {
            // Set default to current date and time when dialog opens
            setTanggalOpen(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
        } else {
            // Reset all state when dialog closes
            setTanggalOpen('');
            setTanggalClose('');
            setNoTiket('');
            setJenisOrder('');
            setTypeOrder('');
            setKeterangan('');
            setSelectedLayanan([]);
            setSelectedMaterials({});
            setMaterialFiles({});
            setMaterialQuantities({});
            setMaterialDetails({});
            setEvidenScc(null);
            setDorongClose(false);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!showTypeOrder) setTypeOrder('');
    }, [jenisOrder, showTypeOrder]);

    const handleLayananChange = (layanan: string, checked: boolean) => {
        setSelectedLayanan(prev => checked ? [...prev, layanan] : prev.filter(l => l !== layanan));
    };

    const handleMaterialToggle = (materialName: string, checked: boolean) => {
        setSelectedMaterials(prev => ({ ...prev, [materialName]: checked }));
        if (!checked) {
            setMaterialFiles(prev => { const newState = { ...prev }; delete newState[materialName]; return newState; });
            setMaterialQuantities(prev => { const newState = { ...prev }; delete newState[materialName]; return newState; });
            setMaterialDetails(prev => { const newState = { ...prev }; delete newState[materialName]; return newState; });
        } else {
             const materialConfig = materialEvidenMap[materialName];
             if(materialConfig?.quantity) {
                 if (materialConfig.default) {
                    setMaterialQuantities(prev => ({...prev, [materialName]: materialConfig.default!}));
                 } else if (!materialName.includes('(cm)') && !materialName.includes('(Mtr)')) {
                    setMaterialQuantities(prev => ({...prev, [materialName]: 1}));
                 }
             }
        }
    };
    
    const handleFileChange = (materialName: string, evidenceName: string, file: File | null) => {
        setMaterialFiles(prev => ({ ...prev, [materialName]: { ...(prev[materialName] || {}), [evidenceName]: file } }));
    };

    const handleDetailChange = (materialName: string, detailKey: string, value: string) => {
        setMaterialDetails(prev => ({
            ...prev,
            [materialName]: {
                ...(prev[materialName] || {}),
                [detailKey]: value,
            },
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tanggalOpen || !jenisOrder || !currentUserProfile || !user) {
            toast({ variant: 'destructive', title: 'Data Tidak Lengkap', description: 'Harap isi Tanggal Open dan Jenis Order.' });
            return;
        }
        setIsSaving(true);
        try {
            const hasMaterialPhotos = Object.values(materialFiles).some(evidences => Object.values(evidences).some(file => file !== null));
            if (!hasMaterialPhotos && !evidenScc && !dorongClose) {
                toast({
                    variant: 'destructive',
                    title: 'Eviden Diperlukan',
                    description: 'Harap unggah setidaknya satu foto eviden (material atau SCC), atau centang "Dorong Close".'
                });
                setIsSaving(false);
                return;
            }

            const materialEvidencePromises = Object.entries(selectedMaterials)
                .filter(([, isSelected]) => isSelected)
                .map(async ([materialName]) => {
                    const materialConfig = materialEvidenMap[materialName];
                    const evidenceFiles = materialFiles[materialName] || {};
                    const evidenceUploadPromises = Object.entries(evidenceFiles)
                        .filter(([, file]) => file)
                        .map(async ([evidenceName, file]) => {
                            const filePath = `notas/${user.uid}/${Date.now()}-${file!.name}`;
                            const storageRef = ref(storage, filePath);
                            await uploadBytes(storageRef, file!);
                            const photoUrl = await getDownloadURL(storageRef);
                            return { evidenceName, photoUrl };
                        });
                    
                    const uploadedEvidences = await Promise.all(evidenceUploadPromises);
                    
                    const materialEntry: MaterialEvidence = {
                        materialName,
                    };
                    if (materialConfig?.quantity) {
                        materialEntry.quantity = materialQuantities[materialName] || 0;
                    }
                    if (materialConfig?.inputs) {
                        materialEntry.details = materialDetails[materialName] || {};
                    }
                    if (uploadedEvidences.length > 0) {
                        materialEntry.evidences = uploadedEvidences;
                    }

                    return materialEntry;
                });

            let evidenSccUrl: string | undefined;
            if (evidenScc) {
                const filePath = `notas/${user.uid}/scc_${Date.now()}-${evidenScc.name}`;
                const storageRef = ref(storage, filePath);
                await uploadBytes(storageRef, evidenScc);
                evidenSccUrl = await getDownloadURL(storageRef);
            }
            
            const processedMaterials = await Promise.all(materialEvidencePromises);

            const newRiwayatData: Omit<RiwayatGangguan, 'id'> = {
                pelangganId: pelanggan.id,
                userId: user.uid,
                noService: pelanggan.noService,
                tanggalLapor: Timestamp.now(),
                noTiket,
                namaPetugas: currentUserProfile.displayName || currentUserProfile.email,
                nik: currentUserProfile.nik || '',
                jenisOrder,
                keterangan,
                sto: pelanggan.sto || '',
                tanggalOpen: Timestamp.fromDate(new Date(tanggalOpen)),
                tanggalClose: tanggalClose ? Timestamp.fromDate(new Date(tanggalClose)) : null,
                layanan: selectedLayanan,
                materials: processedMaterials,
                dorongClose: dorongClose,
            };
            
            const dataToSave: any = { ...newRiwayatData };

            if (showTypeOrder && typeOrder) {
                dataToSave.typeOrder = typeOrder;
            }
            if (evidenSccUrl) {
                dataToSave.evidenSccUrl = evidenSccUrl;
            }

            const docRef = await addDoc(collection(firestore, 'riwayat-gangguan'), dataToSave);
            onFinished({ id: docRef.id, ...dataToSave } as RiwayatGangguan);
            toast({ title: 'Laporan Gangguan Disimpan' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Gagal menyimpan', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Input Laporan Gangguan</DialogTitle>
                    <DialogDescription>Catat laporan gangguan baru untuk {pelanggan.namaPelanggan}.</DialogDescription>
                </DialogHeader>
                 <form onSubmit={handleSubmit} className="grid gap-6 py-4 max-h-[75vh] overflow-y-auto pr-6">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="grid gap-2"><Label>NIK Petugas</Label><Input value={currentUserProfile?.nik || ''} disabled /></div>
                        <div className="grid gap-2 lg:col-span-2"><Label>Nama Petugas</Label><Input value={currentUserProfile?.displayName || ''} disabled /></div>
                        <div className="grid gap-2"><Label>STO</Label><Input value={pelanggan.sto || ''} disabled /></div>
                    </div>
                    <div className="grid gap-2"><Label>No. Service</Label><Input value={pelanggan.noService} disabled /></div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                         <div className="grid gap-2">
                            <Label htmlFor="tanggal-open">Tanggal Open *</Label>
                            <Input id="tanggal-open" type="datetime-local" value={tanggalOpen} onChange={e => setTanggalOpen(e.target.value)} required />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="tanggal-close">Tanggal Close</Label>
                            <Input id="tanggal-close" type="datetime-local" value={tanggalClose} onChange={e => setTanggalClose(e.target.value)} />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="riwayat-tiket">No. Tiket</Label>
                            <Input id="riwayat-tiket" value={noTiket} onChange={(e) => setNoTiket(e.target.value)} placeholder="Contoh: INC123..." />
                          </div>
                    </div>

                    <div className="grid gap-3">
                        <Label>Layanan Terdampak</Label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2">
                            {layananOptions.map(layanan => (
                                <div key={layanan} className="flex items-center space-x-2">
                                    <Checkbox id={`layanan-${layanan}`} checked={selectedLayanan.includes(layanan)} onCheckedChange={(checked) => handleLayananChange(layanan, !!checked)} />
                                    <Label htmlFor={`layanan-${layanan}`} className="font-normal">{layanan}</Label>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="jenis-order">Jenis Order *</Label>
                            <Select value={jenisOrder} onValueChange={setJenisOrder} required>
                                <SelectTrigger id="jenis-order"><SelectValue placeholder="Pilih Jenis Order..." /></SelectTrigger>
                                <SelectContent><ScrollArea className="h-72">{jenisOrderOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</ScrollArea></SelectContent>
                            </Select>
                        </div>
                        {showTypeOrder && (
                            <div className="grid gap-2">
                                <Label htmlFor="type-order">Type Order *</Label>
                                <Select value={typeOrder} onValueChange={setTypeOrder} required>
                                    <SelectTrigger id="type-order"><SelectValue placeholder="Pilih Type Order..." /></SelectTrigger>
                                    <SelectContent>{typeOrderOptions[jenisOrder].map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                  <div className="grid gap-2">
                    <Label htmlFor="riwayat-keterangan">Keterangan</Label>
                    <Textarea id="riwayat-keterangan" value={keterangan} onChange={(e) => setKeterangan(e.target.value)} placeholder="Deskripsi gangguan dan penanganan..." />
                  </div>

                  <div className="grid gap-3">
                    <Label>Material & Eviden</Label>
                    <Accordion type="multiple" className="w-full">
                        {Object.entries(materialEvidenMap).map(([materialName, config]) => (
                            <div key={materialName} className="flex items-start gap-3 p-2 border-b">
                                <Checkbox 
                                    id={`material-${materialName}`}
                                    className="mt-1"
                                    checked={!!selectedMaterials[materialName]}
                                    onCheckedChange={(checked) => handleMaterialToggle(materialName, !!checked)}
                                />
                                <div className="flex-1">
                                    <Label htmlFor={`material-${materialName}`} className="font-medium cursor-pointer">{materialName}</Label>
                                    {selectedMaterials[materialName] && (
                                        <div className="mt-4 pl-2 border-l-2 ml-2 space-y-4">
                                            {config.quantity && (
                                                <div className="grid gap-2">
                                                    <Label htmlFor={`qty-${materialName}`}>Jumlah</Label>
                                                    <Input 
                                                        id={`qty-${materialName}`} 
                                                        type="number"
                                                        placeholder="Jumlah"
                                                        value={materialQuantities[materialName] ?? ''}
                                                        onChange={e => setMaterialQuantities(prev => ({...prev, [materialName]: Number(e.target.value)}))}
                                                        className="w-32"
                                                    />
                                                </div>
                                            )}
                                            {config.inputs && config.inputs.map(inputLabel => (
                                                <div key={inputLabel} className="grid gap-2">
                                                    <Label htmlFor={`detail-${materialName}-${inputLabel}`}>{inputLabel}</Label>
                                                    <Input
                                                        id={`detail-${materialName}-${inputLabel}`}
                                                        placeholder={`${inputLabel}...`}
                                                        value={materialDetails[materialName]?.[inputLabel] || ''}
                                                        onChange={e => handleDetailChange(materialName, inputLabel, e.target.value)}
                                                    />
                                                </div>
                                            ))}
                                            {config.evidences && config.evidences.map(evidenName => (
                                                <div key={evidenName} className="grid gap-2">
                                                    <Label htmlFor={`file-${materialName}-${evidenName}`} className="capitalize">{evidenName}</Label>
                                                    <Input id={`file-${materialName}-${evidenName}`} type="file" accept="image/*" onChange={(e) => handleFileChange(materialName, evidenName, e.target.files?.[0] || null)} />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </Accordion>
                  </div>
                  
                  <div className="mt-6 space-y-4 rounded-md border p-4">
                        <h4 className="font-medium">Eviden Tambahan</h4>
                        <div className="grid gap-2">
                            <Label htmlFor="eviden-scc">Eviden SCC</Label>
                            <Input id="eviden-scc" type="file" accept="image/*" onChange={(e) => setEvidenScc(e.target.files?.[0] || null)} />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="dorong-close" checked={dorongClose} onCheckedChange={(checked) => setDorongClose(Boolean(checked))} />
                            <Label htmlFor="dorong-close">Dorong Close (Jika tidak ada eviden)</Label>
                        </div>
                    </div>


                  <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="secondary">Batal</Button></DialogClose>
                    <Button type="submit" disabled={isSaving}>{isSaving ? <Loader2 className="animate-spin" /> : 'Simpan Laporan'}</Button>
                  </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// ... rest of the file remains the same ...
