

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
import { PlusCircle, MapPin, Loader2, Search, History, Phone, Pencil, Wrench, QrCode, FileSpreadsheet, AlertCircle, Info, Upload, Trash2, Bot, CalendarIcon, MessageSquare } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc, errorEmitter, FirestorePermissionError, useStorage } from '@/firebase';
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
                const filePath = `notas/${user.uid}/${Date.now()}-${fotoCp.name}`;
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
                serviceArea,
                sto: sto,
                odpName: odpName.trim(),
                odpPort: odpPort.trim(),
                odpQRCodeUrl: odpQRCodeUrl.trim(),
                // fotoCpUrl,
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

const jenisOrderOptions = [
  "Aktivasi Cross Connect TDE", "Aktivasi/Migrasi/Dismantel DCS", "Aktivasi/Migrasi/Dismantel Digiserve", "Aktivasi/Migrasi/Dismantel Hypernet", "Corrective Akses Tower CENTRATAMA", "Corrective Akses Tower Lintasarta", "Corrective Akses Tower UMT", "Corrective Cross Connect TDE", "Corrective CSA", "Corrective DCS", "Corrective Digiserve", "Corrective Hypernet", "Corrective MMP", "Corrective MyRep", "Corrective NuTech", "Corrective SNT", "Corrective SPBU", "Corrective TBG", "Corrective Tower POLARIS", "Corrective Tower TIS", "DISMANTLING FWA", "DISMANTLING ONT", "DISMANTLING PLC", "DISMANTLING STB", "DISMANTLING WIFI EXTENDER", "Dismantling DC Infracare", "Dismantling NTE B2B", "EXPAND ODP", "Inventory SPBU", "IXSA FTM", "IXSA ODC", "IXSA OLT", "Lapsung (Laporan Langsung)", "MO/DO Indibiz / Datin", "MO/DO Indihome", "PDA PSB Indihome", "PSB DATIN", "PSB INDIBIZ", "PSB OLO", "PSB MyRep", "PSB Surge", "PSB WIFI", "PT2 Simple", "Patroli Akses", "Preventif MMP", "Preventive Akses Tower CENTRATAMA", "Preventive Akses Tower Lintasarta", "Preventive Akses Tower UMT", "Preventive Asianet", "Preventive CSA", "Preventive FIberisasi", "Preventive NuTech", "Preventive SPBU", "Preventive TBG", "Preventive Tower POLARIS", "Preventive Tower TIS", "REPLACEMENT ONT Premium/Dual Band", "REPLACEMENT STB", "Relokasi DCS", "Relokasi Digiserve", "Relokasi Hypernet", "Reseller", "SQM Reguler", "Tangible ODP HSI Indihome", "Tangible ODP Tiket Datin Kategori 1", "Tiket Datin Kategori 2", "Tiket Datin Kategori 3", "Tiket FFG DATIN", "Tiket FFG HSI", "Tiket FFG WIFI", "Tiket FFG Indihome", "Tiket GAMAS", "Tiket HSI Indibiz", "Tiket NodeB CNQ (Preventive/Quality)", "Tiket NodeB Critical", "Tiket NodeB Low", "Tiket NodeB Major", "Tiket NodeB Minor", "Tiket NodeB Premium", "Tiket NodeB Premium Preventive", "Tiket OLO Datin Gamas", "Tiket OLO Datin Non Gamas", "Tiket OLO Datin Quality", "Tiket OLO SL WDM", "Tiket OLO SL WDM Quality", "Tiket Pra SQM Gaul HSI", "Tiket Reguler", "Tiket SIP Trunk", "Tiket SQM Datin", "Tiket SQM HSI", "Tiket WIFI ID", "Tiket Wifi Logic", "UNLOCK ODP", "Unspec DATIN", "Unspec HSI", "Unspec SITE/NODE-B", "Unspec WIFI", "Unspec Reguler", "Validasi Data EBIS", "Validasi Data WIFI", "Validasi Tiang", "Valins FTM", "Valins ODC", "Valins Regular", "WFM", "Corrective Mitratel",
].sort();


const typeOrderOptions: Record<string, string[]> = {
    'Tiket Reguler': ['VVIP', 'Diamond', 'Platinum', 'Gold', 'NonHVC', 'HVC_Diamond', 'HVC_Gold', 'HVC_Platinum', 'Reguler'],
    'SQM Reguler': ['Workhours', 'NonWorkhours'],
    'Tiket GAMAS': ['DISTRIBUSI', 'FEEDER', 'ODC', 'ODP'],
};

const layananOptions = ["INTERNET", "VOICE", "USEETV", "WIFI MESH", "WIFI AP", "WIFI-LITE", "OLO", "METRO", "ASTINET", "VPNIP", "DATIN"];

const materialEvidenMap: Record<string, { evidences?: string[], quantity?: boolean, default?: number, inputs?: string[] }> = {
  "DROPCORE BARU": { evidences: ["eviden marking awal", "eviden marking akhir", "eviden dc", "eviden progres"] },
  "DROPCORE REFURBISH": { evidences: ["eviden marking awal", "eviden marking akhir", "eviden dc", "eviden progres"] },
  "ROSET": { evidences: ["eviden foto roset baru", "eviden roset lama", "eviden progres", "eviden saat terpasang"] },
  "PIGTAIL SC": { evidences: ["eviden foto pigtail baru", "eviden pigtail lama", "eviden progres", "eviden saat terpasang"] },
  "PATCHCORE 15": { evidences: ["eviden foto pathcore baru", "eviden pathcore lama", "eviden progres", "eviden saat terpasang"] },
  "PATCHCORE 2 MTR": { evidences: ["eviden foto pathcore baru", "eviden pathcore lama", "eviden progres", "eviden saat terpasang"] },
  "PATCHCORE 1 MTR": { evidences: ["eviden foto pathcore baru", "eviden pathcore lama", "eviden progres", "eviden saat terpasang"] },
  "SPLITER 1:2": { evidences: ["eviden foto spliter baru", "eviden spliter lama", "eviden progres", "eviden saat terpasang"] },
  "SPLITER 1:4": { evidences: ["eviden foto spliter baru", "eviden spliter lama", "eviden progres", "eviden saat terpasang"] },
  "SPLITER 1:8": { evidences: ["eviden foto spliter baru", "eviden spliter lama", "eviden progres", "eviden saat terpasang"] },
  "SPLITER 1:16": { evidences: ["eviden foto spliter baru", "eviden spliter lama", "eviden progres", "eviden saat terpasang"] },
  "Termovit (cm)": { evidences: [], quantity: true, default: 15 },
  "Adapter SC": { evidences: ["eviden foto adaptor baru", "eviden adaptor lama", "eviden progres", "eviden saat terpasang"] },
  "RJ45": { evidences: ["eviden foto rj45 baru", "eviden rj45 lama", "eviden progres", "eviden saat terpasang"] },
  "Protection Sleeve": { evidences: ["eviden foto sambung"] },
  "Splice on Connector": { evidences: ["eviden SOC baru", "eviden progres", "eviden saat terpasang"] },
  "Penarikan Kabel UTP (Mtr)": { evidences: ["eviden marking awal", "eviden marking akhir", "eviden dc", "eviden progres"], quantity: true },
  "ONT": { inputs: ['SN ONT', 'Valins ID'] },
  "STB": { inputs: ['STB ID'] },
  "AP": { inputs: ['SN AP', 'MAC AP'] },
  "PoE AP": { inputs: ['SN PoE'] },
  "AP Mesh": { inputs: ['SN'] }
};

function DateTimePicker({ value, onChange, disabled = false }: { value?: Date, onChange: (date?: Date) => void, disabled?: boolean }) {
    const datePart = value;
    const timePart = value ? format(value, 'HH:mm') : '00:00';

    const handleDateChange = (newDate?: Date) => {
        if (!newDate) {
            onChange(undefined);
            return;
        }
        const [currentHours, currentMinutes] = timePart.split(':').map(Number);
        newDate.setHours(isNaN(currentHours) ? 0 : currentHours, isNaN(currentMinutes) ? 0 : currentMinutes, 0, 0);
        onChange(newDate);
    };

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const [newHours, newMinutes] = e.target.value.split(':').map(Number);
        const newDate = value ? new Date(value.getTime()) : new Date();
        if (isNaN(newHours) || isNaN(newMinutes)) return;
        newDate.setHours(newHours, newMinutes, 0, 0);
        onChange(newDate);
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant={'outline'} disabled={disabled} className={cn('w-full justify-start text-left font-normal', !datePart && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {datePart ? format(datePart, 'dd MMM yyyy, HH:mm') : <span>Pilih tanggal & waktu</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={datePart} onSelect={handleDateChange} initialFocus />
                 <div className="p-2 border-t border-border">
                    <Input
                        type="time"
                        value={timePart}
                        onChange={handleTimeChange}
                    />
                </div>
            </PopoverContent>
        </Popover>
    );
}

function NewRiwayatDialog({ pelanggan, isOpen, onOpenChange, onFinished, currentUserProfile }: { pelanggan: Pelanggan, isOpen: boolean, onOpenChange: (open: boolean) => void, onFinished: (riwayat: RiwayatGangguan) => void, currentUserProfile: UserProfile | null }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const storage = useStorage();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    
    // Form state
    const [tanggalLapor, setTanggalLapor] = useState<Date | undefined>(new Date());
    const [tanggalOpen, setTanggalOpen] = useState<Date | undefined>(new Date());
    const [tanggalClose, setTanggalClose] = useState<Date | undefined>();
    const [noTiket, setNoTiket] = useState('');
    const [jenisOrder, setJenisOrder] = useState('');
    const [typeOrder, setTypeOrder] = useState('');
    const [keterangan, setKeterangan] = useState('');
    const [selectedLayanan, setSelectedLayanan] = useState<string[]>([]);
    const [selectedMaterials, setSelectedMaterials] = useState<Record<string, boolean>>({});
    const [materialFiles, setMaterialFiles] = useState<Record<string, Record<string, File | null>>>({});
    const [materialQuantities, setMaterialQuantities] = useState<Record<string, number>>({});
    const [materialDetails, setMaterialDetails] = useState<Record<string, Record<string, string>>>({});
    
    const showTypeOrder = useMemo(() => Object.keys(typeOrderOptions).includes(jenisOrder), [jenisOrder]);
    
    useEffect(() => {
        if (!isOpen) {
            setTanggalLapor(new Date());
            setTanggalOpen(new Date());
            setTanggalClose(undefined);
            setNoTiket('');
            setJenisOrder('');
            setTypeOrder('');
            setKeterangan('');
            setSelectedLayanan([]);
            setSelectedMaterials({});
            setMaterialFiles({});
            setMaterialQuantities({});
            setMaterialDetails({});
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
             if(materialConfig?.quantity && materialConfig.default) {
                 setMaterialQuantities(prev => ({...prev, [materialName]: materialConfig.default!}));
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
            const materialEvidencePromises = Object.entries(selectedMaterials)
                .filter(([, isSelected]) => isSelected)
                .map(async ([materialName]) => {
                    const materialConfig = materialEvidenMap[materialName];
                    const evidenceFiles = materialFiles[materialName] || {};
                    const evidenceUploadPromises = Object.entries(evidenceFiles)
                        .filter(([, file]) => file)
                        .map(async ([evidenceName, file]) => {
                            const filePath = `gangguan_evidence/${user.uid}/${Date.now()}-${file!.name}`;
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
            
            const processedMaterials = await Promise.all(materialEvidencePromises);

            const newRiwayatData: Omit<RiwayatGangguan, 'id'> = {
                pelangganId: pelanggan.id,
                userId: user.uid,
                noService: pelanggan.noService,
                tanggalLapor: Timestamp.fromDate(tanggalLapor || new Date()),
                noTiket,
                namaPetugas: currentUserProfile.displayName || currentUserProfile.email,
                nik: currentUserProfile.nik || '',
                jenisOrder,
                typeOrder: showTypeOrder ? typeOrder : undefined,
                keterangan,
                sto: pelanggan.sto || '',
                tanggalOpen: Timestamp.fromDate(tanggalOpen),
                tanggalClose: Timestamp.fromDate(tanggalClose || new Date()),
                layanan: selectedLayanan,
                materials: processedMaterials,
            };
            const docRef = await addDoc(collection(firestore, 'riwayat-gangguan'), newRiwayatData);
            onFinished({ id: docRef.id, ...newRiwayatData } as RiwayatGangguan);
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
                            <DateTimePicker value={tanggalOpen} onChange={setTanggalOpen} />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="tanggal-close">Tanggal Close</Label>
                             <DateTimePicker value={tanggalClose} onChange={setTanggalClose} />
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
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="grid gap-2"><Label htmlFor={`qty-${materialName}`}>Jumlah ({materialName.split('(')[1]}</Label>
                                                        <Input id={`qty-${materialName}`} type="number" value={materialQuantities[materialName] ?? ''} onChange={e => setMaterialQuantities(prev => ({...prev, [materialName]: Number(e.target.value)}))} />
                                                    </div>
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

                  <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="secondary">Batal</Button></DialogClose>
                    <Button type="submit" disabled={isSaving}>{isSaving ? <Loader2 className="animate-spin" /> : 'Simpan Laporan'}</Button>
                  </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function AddContactDialog({ pelanggan, isOpen, onOpenChange, onFinished, currentUserEmail }: { pelanggan: Pelanggan, isOpen: boolean, onOpenChange: (open: boolean) => void, onFinished: (data: Partial<Pelanggan>) => void, currentUserEmail: string }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [newPhone, setNewPhone] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPhone.trim()) {
            toast({ variant: 'destructive', title: 'Nomor telepon diperlukan' });
            return;
        }
        setIsSaving(true);
        try {
            const currentPhones = Array.isArray(pelanggan.nomorTelepon) ? pelanggan.nomorTelepon : (pelanggan.nomorTelepon ? [pelanggan.nomorTelepon] : []);
            const updatedPhones = [...currentPhones, newPhone.trim()];
            const updatedData: Partial<Pelanggan> = { 
                nomorTelepon: updatedPhones,
                lastEditedBy: currentUserEmail,
                lastEditedDate: serverTimestamp(),
            };

            const docRef = doc(firestore, 'pelanggan', pelanggan.id);
            await updateDoc(docRef, updatedData);
            
            toast({ title: 'Kontak berhasil ditambahkan' });
            onFinished(updatedData);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Gagal menyimpan', description: error.message });
        } finally {
            setIsSaving(false);
            setNewPhone('');
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Tambah Nomor Kontak</DialogTitle>
                    <DialogDescription>Tambahkan nomor telepon baru untuk {pelanggan.namaPelanggan}.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="new-phone">Nomor Telepon Baru</Label>
                        <Input id="new-phone" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="0812..." required/>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="secondary">Batal</Button></DialogClose>
                        <Button type="submit" disabled={isSaving}>{isSaving ? 'Menyimpan...' : 'Tambah'}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function UpdateLocationDialog({ pelanggan, isOpen, onOpenChange, onFinished, currentUserEmail }: { pelanggan: Pelanggan, isOpen: boolean, onOpenChange: (open: boolean) => void, onFinished: (data: Partial<Pelanggan>) => void, currentUserEmail: string }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [alamat, setAlamat] = useState(pelanggan.alamat || '');
    const [koordinat, setKoordinat] = useState(pelanggan.koordinat || '');
    const [isSaving, setIsSaving] = useState(false);
    const [isGettingLocation, setIsGettingLocation] = useState(false);

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
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const updatedData: Partial<Pelanggan> = { 
                alamat, 
                koordinat,
                lastEditedBy: currentUserEmail,
                lastEditedDate: serverTimestamp(),
            };
            const docRef = doc(firestore, 'pelanggan', pelanggan.id);
            await updateDoc(docRef, updatedData);
            toast({ title: 'Lokasi berhasil diperbarui' });
            onFinished(updatedData);
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Gagal menyimpan', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    return (
         <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Ubah Lokasi Pelanggan</DialogTitle>
                </DialogHeader>
                 <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="update-alamat">Alamat Baru</Label>
                        <Textarea id="update-alamat" value={alamat} onChange={(e) => setAlamat(e.target.value)} />
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="update-koordinat">Koordinat Baru</Label>
                        <div className="flex items-center gap-2">
                            <Input id="update-koordinat" value={koordinat} onChange={(e) => setKoordinat(e.target.value)} required />
                            <Button type="button" variant="outline" size="icon" onClick={handleGetLocation} disabled={isGettingLocation}>
                                {isGettingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="secondary">Batal</Button></DialogClose>
                        <Button type="submit" disabled={isSaving}>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function UpdateAssetDialog({ pelanggan, isOpen, onOpenChange, onFinished, currentUserEmail }: { pelanggan: Pelanggan, isOpen: boolean, onOpenChange: (open: boolean) => void, onFinished: (data: Partial<Pelanggan>) => void, currentUserEmail: string }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [odpName, setOdpName] = useState(pelanggan.odpName || '');
    const [odpPort, setOdpPort] = useState(pelanggan.odpPort || '');
    const [odpQRCodeUrl, setOdpQRCodeUrl] = useState(pelanggan.odpQRCodeUrl || '');
    const [sto, setSto] = useState(pelanggan.sto || '');
    const [isSaving, setIsSaving] = useState(false);

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
    
    useEffect(() => {
        if (isOpen) {
            setOdpName(pelanggan.odpName || '');
            setOdpPort(pelanggan.odpPort || '');
            setOdpQRCodeUrl(pelanggan.odpQRCodeUrl || '');
            setSto(pelanggan.sto || '');
        }
    }, [isOpen, pelanggan]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const updatedData: Partial<Pelanggan> = { 
                odpName: odpName.trim(),
                odpPort: odpPort.trim(),
                odpQRCodeUrl: odpQRCodeUrl.trim(),
                sto: sto.trim(),
                lastEditedBy: currentUserEmail,
                lastEditedDate: serverTimestamp(),
            };
            const docRef = doc(firestore, 'pelanggan', pelanggan.id);
            await updateDoc(docRef, updatedData);
            toast({ title: 'Info Aset berhasil diperbarui' });
            onFinished(updatedData);
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Gagal menyimpan', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    return (
         <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Ubah Info Aset (ODP)</DialogTitle>
                    <DialogDescription>Perbarui nama ODP, port, dan QR Code yang terhubung dengan pelanggan ini.</DialogDescription>
                </DialogHeader>
                 <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="update-odp-name">Nama ODP</Label>
                            <Input id="update-odp-name" value={odpName} onChange={(e) => setOdpName(e.target.value)} placeholder="Contoh: ODP-KDS-FA/001" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="update-sto">STO</Label>
                            <Input id="update-sto" value={sto} disabled placeholder="Otomatis dari ODP" />
                        </div>
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="update-odp-port">Port ODP</Label>
                        <Input id="update-odp-port" value={odpPort} onChange={(e) => setOdpPort(e.target.value)} placeholder="Contoh: 5" />
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="update-odp-qr">URL QR Code ODP</Label>
                        <Input id="update-odp-qr" value={odpQRCodeUrl} onChange={(e) => setOdpQRCodeUrl(e.target.value)} placeholder="https://..." />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="secondary">Batal</Button></DialogClose>
                        <Button type="submit" disabled={isSaving}>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}


// --- MAIN PAGE COMPONENT ---

export default function AdminPelangganPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [searchNoService, setSearchNoService] = useState('');
  const [searchedPelanggan, setSearchedPelanggan] = useState<Pelanggan | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  
  const [isNewPelangganDialogOpen, setIsNewPelangganDialogOpen] = useState(false);
  const [isNewRiwayatDialogOpen, setIsNewRiwayatDialogOpen] = useState(false);
  const [isAddContactDialogOpen, setIsAddContactDialogOpen] = useState(false);
  const [isUpdateLocationDialogOpen, setIsUpdateLocationDialogOpen] = useState(false);
  const [isUpdateAssetDialogOpen, setIsUpdateAssetDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: currentUserProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(
    useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore])
  );
  const isAdmin = currentUserProfile?.role === 'admin';
  const isAdminOrKorlap = isAdmin || currentUserProfile?.role === 'korlap';


  useEffect(() => {
    if (!isUserLoading && !isProfileLoading) {
      const isApproved = currentUserProfile?.registrationStatus === 'approved';
      const hasAccess = currentUserProfile?.role === 'admin' || currentUserProfile?.role === 'korlap' || currentUserProfile?.appAccess === 'allpro' || currentUserProfile?.appAccess === 'all';
      if (!user || !isApproved || !hasAccess) {
        router.push('/dashboard');
      }
    }
  }, [user, currentUserProfile, isUserLoading, isProfileLoading, router]);
  
  const allRiwayatQuery = useMemoFirebase(() => {
    if (!firestore || !searchedPelanggan) return null;
    return query(collection(firestore, 'riwayat-gangguan'), where('noService', '==', searchedPelanggan.noService));
  }, [firestore, searchedPelanggan]);

  const { data: allRiwayat, isLoading: isRiwayatLoading } = useCollection<RiwayatGangguan>(allRiwayatQuery);

  const riwayatGangguan = useMemo(() => {
    if (!allRiwayat) return null;
    return [...allRiwayat].sort((a, b) => {
        const timeA = safeToDate(a.tanggalLapor)?.getTime() ?? 0;
        const timeB = safeToDate(b.tanggalLapor)?.getTime() ?? 0;
        return timeB - timeA; // descending
    });
  }, [allRiwayat]);


  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchNoService.trim()) return;

    setIsSearching(true);
    setSearchPerformed(true);
    setSearchedPelanggan(null);

    const q = query(collection(firestore, 'pelanggan'), where('noService', '==', searchNoService.trim()), limit(1));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        setSearchedPelanggan(null);
    } else {
        const pelangganData = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as Pelanggan;
        setSearchedPelanggan(pelangganData);
    }
    setIsSearching(false);
  };
  
  const handleDeletePelanggan = async () => {
    if (!searchedPelanggan || !isAdminOrKorlap || !firestore) return;

    setIsDeleting(true);
    try {
        const batch = writeBatch(firestore);

        const pelangganDocRef = doc(firestore, 'pelanggan', searchedPelanggan.id);
        batch.delete(pelangganDocRef);
        
        const riwayatQuery = query(collection(firestore, 'riwayat-gangguan'), where('noService', '==', searchedPelanggan.noService));
        const riwayatSnapshot = await getDocs(riwayatQuery);
        
        if (!riwayatSnapshot.empty) {
            riwayatSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
        }

        await batch.commit();

        toast({
            title: 'Pelanggan & Riwayat Dihapus',
            description: `Pelanggan ${searchedPelanggan.namaPelanggan} dan ${riwayatSnapshot.size} riwayat laporannya telah dihapus.`,
        });
        
        setSearchedPelanggan(null);
        setSearchNoService('');
        setSearchPerformed(false);
    } catch (error: any) {
        const contextualError = new FirestorePermissionError({
            operation: 'delete',
            path: `pelanggan/${searchedPelanggan.id}`,
        });
        errorEmitter.emit('permission-error', contextualError);
        toast({
            variant: 'destructive',
            title: 'Gagal Menghapus',
            description: error.message,
        });
    } finally {
        setIsDeleting(false);
    }
};


  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
        toast({ title: "Tidak ada file dipilih.", variant: "destructive" });
        return;
    }
    const file = event.target.files[0];
    setIsImporting(true);
    toast({ title: "Membaca file...", description: "Mohon tunggu, proses impor sedang dimulai." });

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const XLSX = await import('xlsx');
            const data = e.target?.result;
            if (!data) throw new Error("Gagal membaca file.");

            const workbook = XLSX.read(data, { type: 'array', cellDates: true });
            const sheetName = workbook.SheetNames[0];
            if (!sheetName) throw new Error("File Excel tidak memiliki sheet yang dapat dibaca.");
            
            const worksheet = workbook.Sheets[sheetName];
            const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

            if (jsonData.length === 0) throw new Error("Sheet Excel yang Anda unggah kosong.");

            const headers = Object.keys(jsonData[0]);
            const findHeader = (aliases: string[]) => headers.find(h => aliases.includes(h.toLowerCase().trim()));
            
            const noServiceCol = findHeader(['no service', 'nomor service', 'no_service', 'service number']);
            const tanggalLaporCol = findHeader(['tanggal lapor', 'tanggal', 'date']);
            const noTiketCol = findHeader(['no tiket', 'nomor tiket', 'ticket_id', 'ticket number', 'tiket']);
            const teknisiCol = findHeader(['teknisi', 'pic', 'nama petugas']);
            const keteranganCol = findHeader(['keterangan', 'deskripsi', 'description']);
            const userIdCol = findHeader(['user id', 'userid']);
            const nikCol = findHeader(['nik']);

            if (!noServiceCol || !tanggalLaporCol) {
                throw new Error("Kolom wajib 'No Service' dan 'Tanggal Lapor' tidak ditemukan di file Excel Anda.");
            }

            const batchSize = 400;
            let batch = writeBatch(firestore);
            let writtenCount = 0;
            let totalProcessed = 0;

            for (const row of jsonData) {
                const noService = row[noServiceCol]?.toString().trim();
                const tanggalLaporRaw = row[tanggalLaporCol];
                
                if (!noService || !tanggalLaporRaw) continue;

                let tanggalLapor: Date;
                if (tanggalLaporRaw instanceof Date && isValid(tanggalLaporRaw)) {
                    tanggalLapor = tanggalLaporRaw;
                } else {
                    const parsedDate = parse(String(tanggalLaporRaw), 'dd/MM/yyyy', new Date());
                    if (isValid(parsedDate)) {
                        tanggalLapor = parsedDate;
                    } else {
                        const directDate = new Date(tanggalLaporRaw);
                        if(isValid(directDate)) {
                           tanggalLapor = directDate;
                        } else {
                           continue; // Skip rows with invalid dates
                        }
                    }
                }
                
                const riwayatData: Omit<RiwayatGangguan, 'id' | 'jenisOrder'> = {
                    noService: noService,
                    userId: userIdCol && row[userIdCol] ? row[userIdCol].toString().trim() : 'system-import',
                    nik: nikCol && row[nikCol] ? row[nikCol].toString().trim() : '',
                    namaPetugas: teknisiCol && row[teknisiCol] ? row[teknisiCol].toString().trim() : 'System Import',
                    tanggalLapor: Timestamp.fromDate(tanggalLapor),
                    noTiket: noTiketCol && row[noTiketCol] ? row[noTiketCol].toString().trim() : '',
                    keterangan: keteranganCol && row[keteranganCol] ? row[keteranganCol].toString().trim() : '',
                    jenisOrder: ''
                };

                const docRef = doc(collection(firestore, 'riwayat-gangguan'));
                batch.set(docRef, riwayatData);
                writtenCount++;

                if (writtenCount >= batchSize) {
                    await batch.commit();
                    batch = writeBatch(firestore);
                    writtenCount = 0;
                }
                totalProcessed++;
            }
            
            if (writtenCount > 0) {
                await batch.commit();
            }

            toast({ title: "Impor Berhasil!", description: `${totalProcessed} data riwayat gangguan telah berhasil diimpor.` });

        } catch (error: any) {
            toast({ title: "Impor Gagal", description: error.message, variant: "destructive" });
        } finally {
            setIsImporting(false);
            setIsImportDialogOpen(false);
            if (event.target) event.target.value = '';
        }
    };
    reader.readAsArrayBuffer(file);
};
  
    const handleExportToExcel = async () => {
    if (!isAdmin || !firestore) {
      toast({ variant: 'destructive', title: 'Akses Ditolak' });
      return;
    }

    toast({ title: 'Mempersiapkan Ekspor...', description: 'Mengambil semua data pelanggan.' });

    try {
      const XLSX = await import('xlsx');
      const pelangganCollection = collection(firestore, 'pelanggan');
      const q = query(pelangganCollection, orderBy('dateAdded', 'desc'));
      const querySnapshot = await getDocs(q);
      const allPelanggan = querySnapshot.docs.map(doc => doc.data() as Pelanggan);
      
      if (allPelanggan.length === 0) {
        toast({ variant: 'destructive', title: 'Tidak Ada Data', description: 'Tidak ada data pelanggan untuk diekspor.' });
        return;
      }
      
      const dataToExport = allPelanggan.map(p => ({
        'No. Service': p.noService,
        'Nama Pelanggan': p.namaPelanggan,
        'Service Area': p.serviceArea,
        'STO': p.sto || '',
        'Alamat': p.alamat || '',
        'Koordinat': p.koordinat,
        'Nomor Telepon': Array.isArray(p.nomorTelepon) ? p.nomorTelepon.join(', ') : p.nomorTelepon || '',
        'Nama ODP': p.odpName || '',
        'Port ODP': p.odpPort || '',
        'QR Code ODP': p.odpQRCodeUrl || '',
        'Ditambahkan Oleh': p.userEmail,
        'Tanggal Ditambahkan': p.dateAdded?.toDate ? format(p.dateAdded.toDate(), 'yyyy-MM-dd HH:mm') : '',
      }));
      
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Pelanggan');
      XLSX.writeFile(workbook, `Data_Pelanggan_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      
    } catch (error: any) {
      console.error('Export failed:', error);
      toast({ variant: 'destructive', title: 'Ekspor Gagal', description: 'Gagal mengambil data dari database.' });
    }
  };
  
  const isLoading = isUserLoading || isProfileLoading;

  if (isLoading) {
      return <div><Skeleton className="h-48 w-full" /></div>;
  }

  return (
    <>
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div><h1 className="text-3xl font-bold tracking-tight">Data Pelanggan & Riwayat Gangguan</h1><p className="text-muted-foreground mt-1">Cari pelanggan berdasarkan No. Service untuk melihat riwayat atau menambah data.</p></div>
        <div className="flex flex-wrap gap-2">
          {isAdminOrKorlap && (
            <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
              <DialogTrigger asChild>
                  <Button variant="secondary"><Upload className="mr-2 h-4 w-4" /> Import Riwayat</Button>
              </DialogTrigger>
              <DialogContent>
                  <DialogHeader>
                      <DialogTitle>Import Riwayat Gangguan</DialogTitle>
                      <DialogDescription>
                          Unggah file Excel (.xlsx) atau CSV (.csv) dengan riwayat gangguan. Pastikan file Anda memiliki kolom "No Service" dan "Tanggal Lapor".
                      </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                      <Input id="excel-file" type="file" accept=".xlsx, .xls, .csv" onChange={handleFileImport} disabled={isImporting} />
                      {isImporting && <p className="text-sm mt-2 text-muted-foreground flex items-center gap-2"><Loader2 className="animate-spin" /> Mengimpor data...</p>}
                  </div>
              </DialogContent>
            </Dialog>
          )}
          {isAdmin && (
              <Button onClick={handleExportToExcel} variant="outline">
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Export Data Pelanggan
              </Button>
          )}
        </div>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Search /> Cari Pelanggan (Database Aplikasi)</CardTitle>
        </CardHeader>
        <CardContent>
            <form onSubmit={handleSearch} className="flex items-end gap-4 flex-wrap">
                <div className="grid gap-2 flex-grow">
                    <Label htmlFor="no-service-search">Nomor Service</Label>
                    <Input id="no-service-search" placeholder="Masukkan No. Service..." value={searchNoService} onChange={(e) => setSearchNoService(e.target.value)} />
                </div>
                <Button type="submit" disabled={isSearching}>{isSearching ? <Loader2 className="animate-spin" /> : 'Cari'}</Button>
            </form>
        </CardContent>
      </Card>
      
      {isSearching && <div className="flex justify-center items-center p-8"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>}

      {!isSearching && searchPerformed && !searchedPelanggan && (
          <Card>
              <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground mb-4">Pelanggan dengan No. Service "{searchNoService}" tidak ditemukan di database aplikasi.</p>
                  <Button onClick={() => setIsNewPelangganDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4"/>Tambah Pelanggan Baru</Button>
              </CardContent>
          </Card>
      )}

      {searchedPelanggan && (
          <div className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-start justify-between">
                    <div>
                        <CardTitle>Detail Pelanggan</CardTitle>
                        <CardDescription>Data pelanggan yang tersimpan di database aplikasi.</CardDescription>
                    </div>
                     <div className="flex flex-wrap gap-2">
                        {isAdminOrKorlap && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm" disabled={isDeleting}><Trash2 className="mr-2 h-4 w-4"/>Hapus</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Anda Yakin?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Tindakan ini akan menghapus pelanggan "{searchedPelanggan.namaPelanggan}" dan semua riwayat laporannya secara permanen. This cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Batal</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDeletePelanggan} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                            {isDeleting ? <Loader2 className="animate-spin" /> : 'Ya, Hapus'}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                        <Button variant="default" size="sm" onClick={() => setIsNewRiwayatDialogOpen(true)}><MessageSquare className="mr-2 h-4 w-4"/>Input Laporan Gangguan</Button>
                        <Button variant="outline" size="sm" onClick={() => setIsAddContactDialogOpen(true)}><Phone className="mr-2 h-4 w-4"/>Tambah Kontak</Button>
                        <Button variant="outline" size="sm" onClick={() => setIsUpdateLocationDialogOpen(true)}><Pencil className="mr-2 h-4 w-4"/>Ubah Lokasi</Button>
                        <Button variant="outline" size="sm" onClick={() => setIsUpdateAssetDialogOpen(true)}><Wrench className="mr-2 h-4 w-4"/>Ubah Info Aset</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-6 text-sm">
                        <div className="flex flex-col"><dt className="text-muted-foreground">No. Service</dt><dd className="font-bold text-base">{searchedPelanggan.noService}</dd></div>
                        <div className="flex flex-col"><dt className="text-muted-foreground">Nama</dt><dd className="font-semibold">{searchedPelanggan.namaPelanggan}</dd></div>
                        <div className="flex flex-col"><dt className="text-muted-foreground">Service Area</dt><dd>{searchedPelanggan.serviceArea}</dd></div>
                        <div className="flex flex-col md:col-span-2"><dt className="text-muted-foreground">Alamat</dt><dd>{searchedPelanggan.alamat || '-'}</dd></div>
                        <div className="flex flex-col"><dt className="text-muted-foreground">No. Telepon</dt>
                            <dd className="flex flex-col gap-1">
                                {(Array.isArray(searchedPelanggan.nomorTelepon) ? searchedPelanggan.nomorTelepon : [searchedPelanggan.nomorTelepon]).filter(Boolean).map((phone, i) => (
                                    <a key={i} href={formatWaNumber(phone as string)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">{phone}</a>
                                ))}
                            </dd>
                        </div>
                        <div className="flex flex-col"><dt className="text-muted-foreground">Koordinat</dt>
                            <dd>
                                <Link href={`https://www.google.com/maps/search/?api=1&query=${searchedPelanggan.koordinat}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                    {searchedPelanggan.koordinat} <MapPin className="h-4 w-4" />
                                </Link>
                            </dd>
                        </div>
                         <div className="flex flex-col"><dt className="text-muted-foreground">ODP Terhubung</dt><dd>{searchedPelanggan.odpName || '-'}</dd></div>
                         <div className="flex flex-col"><dt className="text-muted-foreground">Port ODP</dt><dd>{searchedPelanggan.odpPort || '-'}</dd></div>
                         <div className="flex flex-col"><dt className="text-muted-foreground">STO</dt><dd className="font-medium">{searchedPelanggan.sto || '-'}</dd></div>
                         <div className="flex flex-col"><dt className="text-muted-foreground">QR Code ODP</dt>
                            <dd>
                                {searchedPelanggan.odpQRCodeUrl ? (
                                    <Link href={searchedPelanggan.odpQRCodeUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                        <QrCode className="h-4 w-4" /> Lihat QR Code
                                    </Link>
                                ) : '-'}
                            </dd>
                         </div>
                        {searchedPelanggan.lastEditedBy && safeToDate(searchedPelanggan.lastEditedDate) && (
                            <div className="flex flex-col md:col-span-3 border-t pt-4 mt-2">
                                <dt className="text-muted-foreground">Terakhir Diubah</dt>
                                <dd>
                                    Oleh {searchedPelanggan.lastEditedBy} pada {format(safeToDate(searchedPelanggan.lastEditedDate)!, 'd MMM yyyy, HH:mm', { locale: idLocale })}
                                </dd>
                            </div>
                         )}
                    </dl>
                </CardContent>
              </Card>

              <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><History /> Riwayat Laporan (Database Aplikasi)</CardTitle>
                    <CardDescription>Menampilkan riwayat laporan gangguan yang tersimpan di database aplikasi.</CardDescription>
                  </CardHeader>
                  <CardContent>
                        {isRiwayatLoading ? (
                           <div className="flex justify-center items-center h-24">
                                <Loader2 className="h-6 w-6 animate-spin" />
                            </div>
                        ) : riwayatGangguan && riwayatGangguan.length > 0 ? (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader><TableRow>
                                        <TableHead>Tanggal Lapor</TableHead>
                                        <TableHead>No. Tiket</TableHead>
                                        <TableHead>Nama Petugas</TableHead>
                                        <TableHead>Jenis Order</TableHead>
                                        <TableHead>Keterangan</TableHead>
                                    </TableRow></TableHeader>
                                    <TableBody>{riwayatGangguan.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="whitespace-nowrap">{safeToDate(item.tanggalLapor) ? format(safeToDate(item.tanggalLapor)!, 'd MMMM yyyy, HH:mm', { locale: idLocale }) : '-'}</TableCell>
                                            <TableCell>{item.noTiket || '-'}</TableCell>
                                            <TableCell>{item.namaPetugas || '-'}</TableCell>
                                            <TableCell>{item.jenisOrder || '-'}</TableCell>
                                            <TableCell>{item.keterangan || '-'}</TableCell>
                                        </TableRow>
                                    ))}</TableBody>
                                </Table>
                            </div>
                        ) : (
                            <div className="text-center h-24 flex flex-col items-center justify-center text-muted-foreground">
                               <p>Tidak ada riwayat laporan yang ditemukan di database aplikasi untuk pelanggan ini.</p>
                            </div>
                        )}
                    </CardContent>
              </Card>
          </div>
      )}

      {/* --- Dialogs --- */}
      <NewPelangganDialog 
        isOpen={isNewPelangganDialogOpen}
        onOpenChange={setIsNewPelangganDialogOpen}
        onFinished={(newPelanggan) => {
            setSearchedPelanggan(newPelanggan);
            setIsNewPelangganDialogOpen(false);
            toast({
                title: 'Pelanggan Dibuat',
                description: `${newPelanggan.namaPelanggan} telah berhasil ditambahkan.`,
            });
        }}
      />
       {searchedPelanggan && currentUserProfile && (
        <NewRiwayatDialog
            pelanggan={searchedPelanggan}
            isOpen={isNewRiwayatDialogOpen}
            onOpenChange={setIsNewRiwayatDialogOpen}
            currentUserProfile={currentUserProfile}
            onFinished={() => {
                setIsNewRiwayatDialogOpen(false);
            }}
        />
       )}
      {searchedPelanggan && currentUserProfile && (
          <>
            <AddContactDialog 
                pelanggan={searchedPelanggan}
                isOpen={isAddContactDialogOpen}
                onOpenChange={setIsAddContactDialogOpen}
                onFinished={(updatedData) => {
                    setSearchedPelanggan(prev => prev ? { ...prev, ...updatedData } : null);
                    setIsAddContactDialogOpen(false);
                }}
                currentUserEmail={currentUserProfile.email}
            />
            <UpdateLocationDialog
                 pelanggan={searchedPelanggan}
                 isOpen={isUpdateLocationDialogOpen}
                 onOpenChange={setIsUpdateLocationDialogOpen}
                 onFinished={(updatedData) => {
                    setSearchedPelanggan(prev => prev ? { ...prev, ...updatedData } : null);
                    setIsUpdateLocationDialogOpen(false);
                 }}
                 currentUserEmail={currentUserProfile.email}
            />
            <UpdateAssetDialog
                 pelanggan={searchedPelanggan}
                 isOpen={isUpdateAssetDialogOpen}
                 onOpenChange={setIsUpdateAssetDialogOpen}
                 onFinished={(updatedData) => {
                    setSearchedPelanggan(prev => prev ? { ...prev, ...updatedData } : null);
                    setIsUpdateAssetDialogOpen(false);
                 }}
                 currentUserEmail={currentUserProfile.email}
            />
          </>
      )}
    </>
  );
}






