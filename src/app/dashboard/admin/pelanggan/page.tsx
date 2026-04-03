

'use client';

import * as React from 'react';
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
import { PlusCircle, MapPin, Loader2, Search, History, Phone, Pencil, Wrench, QrCode, FileSpreadsheet, AlertCircle, Info, Upload, Trash2, Bot, CalendarIcon, MessageSquare, AlertTriangle, Image as ImageIcon, Contact } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc, useStorage } from '@/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, query, doc, serverTimestamp, where, getDocs, limit, orderBy, Timestamp, writeBatch, deleteDoc, addDoc, updateDoc } from 'firebase/firestore';
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
import { Badge } from '@/components/ui/badge';


const serviceAreas = ['SA KUDUS', 'SA PATI', 'SA JEPARA', 'SA PURWODADI', 'SA BLORA', 'SA REMBANG'];
const layananOptions = ["INTERNET", "VOICE", "USEETV", "WIFI MESH", "WIFI AP", "WIFI-LITE", "OLO", "METRO", "ASTINET", "VPNIP", "DATIN"];

const jenisOrderOptions = [
  "Aktivasi Cross Connect TDE", "Aktivasi/Migrasi/Dismantel DCS", "Aktivasi/Migrasi/Dismantel Digiserve", "Aktivasi/Migrasi/Dismantel Hypernet", "Corrective Akses Tower CENTRATAMA", "Corrective Akses Tower Lintasarta", "Corrective Akses Tower UMT", "Corrective Cross Connect TDE", "Corrective CSA", "Corrective DCS", "Corrective Digiserve", "Corrective Hypernet", "Corrective MMP", "Corrective MyRep", "Corrective NuTech", "Corrective SNT", "Corrective SPBU", "Corrective TBG", "Corrective Tower POLARIS", "Corrective Tower TIS", "DISMANTLING FWA", "DISMANTLING ONT", "DISMANTLING PLC", "DISMANTLING STB", "DISMANTLING WIFI EXTENDER", "Dismantling DC Infracare", "Dismantling NTE B2B", "EXPAND ODP", "Inventory SPBU", "IXSA FTM", "IXSA ODC", "IXSA OLT", "Lapsung (Laporan Langsung)", "MO/DO Indibiz / Datin", "MO/DO Indihome", "PDA PSB Indihome", "PSB DATIN", "PSB INDIBIZ", "PSB OLO", "PSB MyRep", "PSB Surge", "PSB WIFI", "PT2 Simple", "Patroli Akses", "Preventif MMP", "Preventive Akses Tower CENTRATAMA", "Preventive Akses Tower Lintasarta", "Preventive Akses Tower UMT", "Preventive Asianet", "Preventive CSA", "Preventive FIberisasi", "Preventive NuTech", "Preventive SPBU", "Preventive TBG", "Preventive Tower POLARIS", "Preventive Tower TIS", "REPLACEMENT ONT Premium/Dual Band", "REPLACEMENT STB", "Relokasi DCS", "Relokasi Digiserve", "Relokasi Hypernet", "Reseller", "SQM Reguler", "Tangible ODP HSI Indihome", "Tangible ODP Tiket Datin Kategori 1", "Tiket Datin Kategori 2", "Tiket Datin Kategori 3", "Tiket FFG DATIN", "Tiket FFG HSI", "Tiket FFG WIFI", "Tiket GAMAS", "Tiket HSI Indibiz", "Tiket NodeB CNQ (Preventive/Quality)", "Tiket NodeB Critical", "Tiket NodeB Low", "Tiket NodeB Major", "Tiket NodeB Minor", "Tiket NodeB Premium", "Tiket NodeB Premium Preventive", "Tiket OLO Datin Gamas", "Tiket OLO Datin Non Gamas", "Tiket OLO Datin Quality", "Tiket OLO SL WDM", "Tiket OLO SL WDM Quality", "Tiket Pra SQM Gaul HSI", "Tiket Reguler", "Tiket SIP Trunk", "Tiket SQM Datin", "Tiket SQM HSI", "Tiket WIFI ID", "Tiket Wifi Logic", "UNLOCK ODP", "Unspec DATIN", "Unspec HSI", "Unspec SITE/NODE-B", "Unspec WIFI", "Unspec Reguler", "Validasi Data EBIS", "Validasi Data WIFI", "Validasi Tiang", "Valins FTM", "Valins ODC", "Valins Regular", "WFM", "Corrective Mitratel",
].sort();

const typeOrderOptions: Record<string, string[]> = {
    'Tiket Reguler': ['VVIP', 'Diamond', 'Platinum', 'Gold', 'NonHVC', 'HVC_Diamond', 'HVC_Gold', 'HVC_Platinum', 'Reguler'],
    'SQM Reguler': ['Workhours', 'NonWorkhours'],
    'Tiket GAMAS': ['DISTRIBUSI', 'FEEDER', 'ODC', 'ODP'],
    'DISMANTLING EBIS': ['ONT', 'STB', 'AP', 'IP CAMERA'],
    'REPLACEMENT': ['ONT', 'STB'],
};

const materialEvidenMap: Record<string, { evidences?: string[], quantity?: boolean, default?: number, inputs?: string[] }> = {
  "DROPCORE BARU": { evidences: ["eviden marking awal", "eviden marking akhir", "eviden dc", "eviden progres"], quantity: true },
  "DROPCORE REFURBISH": { evidences: ["eviden marking awal", "eviden marking akhir", "eviden dc", "eviden progres"], quantity: true },
  "ROSET": { evidences: ["eviden foto roset baru", "eviden roset lama", "eviden progres", "eviden saat terpasang"], quantity: true },
  "PIGTAIL SC": { evidences: ["eviden foto pigtail baru", "eviden pigtail lama", "eviden progres", "eviden saat terpasang"], quantity: true },
  "PATCHCORE 15": { evidences: ["eviden foto pathcore baru", "eviden pathcore lama", "eviden progres", "eviden saat terpasang"], quantity: true },
  "PATCHCORE 2 MTR": { evidences: ["eviden foto pathcore baru", "eviden pathcore lama", "eviden progres", "eviden saat terpasang"], quantity: true },
  "PATCHCORE 1 MTR": { evidences: ["eviden foto pathcore baru", "eviden pathcore lama", "eviden progres", "eviden saat terpasang"], quantity: true },
  "SPLITER 1:2": { evidences: ["eviden foto spliter baru", "eviden spliter lama", "eviden progres", "eviden saat terpasang"], quantity: true },
  "SPLITER 1:4": { evidences: ["eviden foto spliter baru", "eviden spliter lama", "eviden progres", "eviden saat terpasang"], quantity: true },
  "SPLITER 1:8": { evidences: ["eviden foto spliter baru", "eviden spliter lama", "eviden progres", "eviden saat terpasang"], quantity: true },
  "SPLITER 1:16": { evidences: ["eviden foto spliter baru", "eviden spliter lama", "eviden progres", "eviden saat terpasang"], quantity: true },
  "Termovit (cm)": { evidences: [], quantity: true, default: 15 },
  "Adapter SC": { evidences: ["eviden foto adaptor baru", "eviden adaptor lama", "eviden progres", "eviden saat terpasang"], quantity: true },
  "RJ45": { evidences: ["eviden foto rj45 baru", "eviden rj45 lama", "eviden progres", "eviden saat terpasang"], quantity: true },
  "Protection Sleeve": { evidences: ["eviden foto sambung"], quantity: true },
  "Splice on Connector": { evidences: ["eviden SOC baru", "eviden progres", "eviden saat terpasang"], quantity: true },
  "Penarikan Kabel UTP (Mtr)": { evidences: ["eviden marking awal", "eviden marking akhir", "eviden dc", "eviden progres"], quantity: true },
  "ONT": { inputs: ['SN ONT', 'Valins ID'] },
  "STB": { inputs: ['STB ID'] },
  "AP": { inputs: ['SN AP', 'MAC AP'] },
  "PoE AP": { inputs: ['SN PoE'] },
  "AP Mesh": { inputs: ['SN'] }
};

// --- Helper Functions ---

const safeToDate = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (timestamp.toDate) return timestamp.toDate();
    if (timestamp instanceof Date) return timestamp;
    const d = new Date(timestamp);
    return d instanceof Date && !isNaN(d.getTime()) ? d : null;
};

const formatWaNumber = (phone: string) => {
    if (!phone) return '#';
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
                const filePath = `notas/${user.uid}/pelanggan_cp_${Date.now()}-${fotoCp.name}`;
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

function EditPelangganDialog({ pelanggan, isOpen, onOpenChange, onFinished }: { pelanggan: Pelanggan; isOpen: boolean; onOpenChange: (open: boolean) => void; onFinished: () => void; }) {
    const { user: authUser } = useUser();
    const firestore = useFirestore();
    const storage = useStorage();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    // Form state
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
        if (pelanggan) {
            setNamaPelanggan(pelanggan.namaPelanggan);
            setAlamat(pelanggan.alamat || '');
            setNomorTelepon(Array.isArray(pelanggan.nomorTelepon) ? pelanggan.nomorTelepon.join(', ') : (pelanggan.nomorTelepon || ''));
            setKoordinat(pelanggan.koordinat);
            setServiceArea(pelanggan.serviceArea);
            setSto(pelanggan.sto || '');
            setOdpName(pelanggan.odpName || '');
            setOdpPort(pelanggan.odpPort || '');
            setOdpQRCodeUrl(pelanggan.odpQRCodeUrl || '');
            setFotoCpPreview(pelanggan.fotoCpUrl || null);
            setFotoCp(null);
        }
    }, [pelanggan, isOpen]);

     useEffect(() => {
        if (odpName) {
            const parts = odpName.trim().toUpperCase().split('-');
            if (parts.length > 1) {
                setSto(parts[1]);
            }
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
        if (!authUser || !authUser.email) return;
        setIsSaving(true);
        try {
            let fotoUrl = pelanggan.fotoCpUrl;
            if (fotoCp) {
                const filePath = `notas/${authUser.uid}/pelanggan_cp_${Date.now()}-${fotoCp.name}`;
                const storageRef = ref(storage, filePath);
                await uploadBytes(storageRef, fotoCp);
                fotoUrl = await getDownloadURL(storageRef);
            }

            const updateData: Partial<Pelanggan> = {
                namaPelanggan,
                alamat,
                nomorTelepon: nomorTelepon.split(',').map(s => s.trim()).filter(Boolean),
                koordinat,
                serviceArea,
                sto,
                odpName,
                odpPort,
                odpQRCodeUrl,
                fotoCpUrl: fotoUrl,
                lastEditedBy: authUser.email,
                lastEditedDate: serverTimestamp(),
            };

            const docRef = doc(firestore, 'pelanggan', pelanggan.id);
            await updateDoc(docRef, updateData);
            
            toast({ title: 'Pelanggan Diperbarui' });
            onFinished();

        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Gagal memperbarui', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Edit Data Pelanggan</DialogTitle>
                    <DialogDescription>Perbarui detail untuk {pelanggan.namaPelanggan}.</DialogDescription>
                </DialogHeader>
                 <form onSubmit={handleSubmit} className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-namaPelanggan">Nama Pelanggan *</Label>
                    <Input id="edit-namaPelanggan" value={namaPelanggan} onChange={(e) => setNamaPelanggan(e.target.value)} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-alamat">Alamat</Label>
                    <Textarea id="edit-alamat" value={alamat} onChange={(e) => setAlamat(e.target.value)} />
                  </div>
                   <div className="grid gap-2">
                    <Label htmlFor="edit-nomorTelepon">No. Telepon (pisahkan dengan koma)</Label>
                    <Input id="edit-nomorTelepon" value={nomorTelepon} onChange={(e) => setNomorTelepon(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-koordinat">Koordinat *</Label>
                    <div className="flex items-center gap-2">
                        <Input id="edit-koordinat" value={koordinat} onChange={(e) => setKoordinat(e.target.value)} required />
                        <Button type="button" variant="outline" size="icon" onClick={handleGetLocation} disabled={isGettingLocation}>
                            {isGettingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                        </Button>
                    </div>
                  </div>
                   <div className="grid gap-2">
                    <Label htmlFor="edit-serviceArea">Service Area *</Label>
                     <Select value={serviceArea} onValueChange={setServiceArea} required>
                        <SelectTrigger><SelectValue placeholder="Pilih Service Area" /></SelectTrigger>
                        <SelectContent>{serviceAreas.map(sa => <SelectItem key={sa} value={sa}>{sa}</SelectItem>)}</SelectContent>
                      </Select>
                  </div>
                   <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-odpName">Nama ODP</Label>
                            <Input id="edit-odpName" value={odpName} onChange={(e) => setOdpName(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-sto">STO</Label>
                            <Input id="edit-sto" value={sto} disabled />
                        </div>
                   </div>
                   <div className="grid gap-2">
                    <Label htmlFor="edit-odpPort">Port ODP</Label>
                    <Input id="edit-odpPort" value={odpPort} onChange={(e) => setOdpPort(e.target.value)} />
                  </div>
                   <div className="grid gap-2">
                    <Label htmlFor="edit-odpQRCodeUrl">URL QR Code ODP</Label>
                    <Input id="edit-odpQRCodeUrl" value={odpQRCodeUrl} onChange={(e) => setOdpQRCodeUrl(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-fotoCp">Foto Lokasi</Label>
                    <Input id="edit-fotoCp" type="file" onChange={handleFileChange} accept="image/*" />
                    {fotoCpPreview && (
                        <div className="relative w-32 h-32 mt-2">
                            <Image src={fotoCpPreview} alt="Preview Foto" fill className="rounded-md object-cover" />
                        </div>
                    )}
                  </div>
                  <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="secondary">Batal</Button></DialogClose>
                    <Button type="submit" disabled={isSaving}>{isSaving ? <Loader2 className="animate-spin" /> : 'Simpan Perubahan'}</Button>
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
            setMaterialQuantities(prev => ({
                ...prev,
                'Termovit (cm)': protectionSleeveQty * 15,
            }));
            if (!selectedMaterials['Termovit (cm)']) {
                setSelectedMaterials(prev => ({
                    ...prev,
                    ['Termovit (cm)']: true,
                }));
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [materialQuantities['Protection Sleeve']]);

    const showOrderType = useMemo(() => Object.keys(typeOrderOptions).includes(jenisOrder), [jenisOrder]);
    
    useEffect(() => {
        if (isOpen) {
            setTanggalOpen(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
        } else {
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
        if (!showOrderType) setTypeOrder('');
    }, [jenisOrder, showOrderType]);

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
                            const filePath = `notas/${user.uid}/gangguan_evidence_${Date.now()}-${file!.name}`;
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

            if (showOrderType && typeOrder) {
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
                        {showOrderType && (
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

function RiwayatCard({ pelanggan, onAddRiwayat }: { pelanggan: Pelanggan, onAddRiwayat: () => void }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const riwayatQuery = useMemoFirebase(() => {
        if (!pelanggan) return null;
        return query(
            collection(firestore, 'riwayat-gangguan'), 
            where('pelangganId', '==', pelanggan.id)
        );
    }, [firestore, pelanggan]);

    const { data, isLoading, error } = useCollection<RiwayatGangguan>(riwayatQuery);
    
    // Sorting is now done on the client-side to avoid index requirement.
    const sortedData = useMemo(() => {
        if (!data) return [];
        return [...data].sort((a,b) => (b.tanggalLapor?.toDate()?.getTime() || 0) - (a.tanggalLapor?.toDate()?.getTime() || 0));
    }, [data]);

    if (error) {
        // We don't throw the error, but we can log it for debugging.
        console.error("Firestore error in RiwayatCard:", error);
    }
    
    const handleDeleteRiwayat = async (riwayatId: string) => {
        try {
            if (!window.confirm("Anda yakin ingin menghapus riwayat ini?")) return;
            await deleteDoc(doc(firestore, 'riwayat-gangguan', riwayatId));
            toast({ title: "Riwayat Dihapus" });
        } catch (err: any) {
             console.error("Error deleting riwayat: ", err);
            toast({ variant: 'destructive', title: 'Gagal Menghapus', description: 'Terjadi kesalahan lain.' });
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Riwayat Gangguan</CardTitle>
                <CardDescription>Untuk {pelanggan.namaPelanggan}</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow><TableHead>Tanggal Lapor</TableHead><TableHead>Petugas</TableHead><TableHead>Jenis Order</TableHead><TableHead>Keterangan</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? <TableRow><TableCell colSpan={5} className="text-center"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                         : sortedData && sortedData.length > 0 ? (
                            sortedData.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell>{safeToDate(item.tanggalLapor) ? format(safeToDate(item.tanggalLapor)!, 'dd MMM yyyy') : '-'}</TableCell>
                                    <TableCell>{item.namaPetugas}</TableCell>
                                    <TableCell><Badge variant="secondary">{item.jenisOrder}</Badge></TableCell>
                                    <TableCell className="max-w-[200px] truncate">{item.keterangan}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end">
                                            <Button asChild variant="ghost" size="sm"><Link href={`/dashboard/admin/pelanggan/riwayat/${item.id}`}><Pencil className="h-4 w-4" /></Link></Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader><AlertDialogTitle>Hapus Riwayat?</AlertDialogTitle><AlertDialogDescription>Tindakan ini akan menghapus riwayat gangguan ini secara permanen.</AlertDialogDescription></AlertDialogHeader>
                                                    <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteRiwayat(item.id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Hapus</AlertDialogAction></AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                         ) : <TableRow><TableCell colSpan={5} className="text-center h-24">Belum ada riwayat gangguan.</TableCell></TableRow>}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

export default function PelangganAdminPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPelanggan, setSelectedPelanggan] = useState<Pelanggan | null>(null);
    const [isNewPelangganOpen, setIsNewPelangganOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isNewRiwayatOpen, setIsNewRiwayatOpen] = useState(false);
    const { user } = useUser();
    const { data: currentUserProfile } = useDoc<UserProfile>(
        useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore])
    );
    const [isImporting, setIsImporting] = useState(false);
    const importFileRef = React.useRef<HTMLInputElement>(null);

    const { data: allPelanggan, isLoading: arePelangganLoading } = useCollection<Pelanggan>(
        useMemoFirebase(() => query(collection(firestore, 'pelanggan')), [firestore])
    );

    const searchResults = useMemo(() => {
        if (!allPelanggan) return [];
        const lowercasedQuery = searchQuery.trim().toLowerCase();
        if (!lowercasedQuery) return [];
        return allPelanggan.filter(p => 
            p.noService.toLowerCase().includes(lowercasedQuery) ||
            p.namaPelanggan.toLowerCase().includes(lowercasedQuery)
        );
    }, [allPelanggan, searchQuery]);

    const handleNewPelanggan = (newPelanggan: Pelanggan) => {
        setIsNewPelangganOpen(false);
        setSelectedPelanggan(newPelanggan);
        toast({ title: "Pelanggan Baru Disimpan", description: `${newPelanggan.namaPelanggan} telah ditambahkan.` });
    };
    
    const handleNewRiwayat = () => {
        const current = selectedPelanggan;
        setSelectedPelanggan(null);
        setTimeout(() => setSelectedPelanggan(current), 0);
        setIsNewRiwayatOpen(false);
    }
    
    const handleDeletePelanggan = async (pelanggan: Pelanggan) => {
        try {
            await deleteDoc(doc(firestore, 'pelanggan', pelanggan.id));
            if (selectedPelanggan?.id === pelanggan.id) {
                setSelectedPelanggan(null);
            }
            toast({ title: "Pelanggan Dihapus" });
        } catch (err: any) {
             console.error("Error deleting pelanggan: ", err);
            toast({ variant: 'destructive', title: 'Gagal Menghapus', description: 'Terjadi kesalahan lain.' });
        }
    };

    const handleExportData = async () => {
        if (!allPelanggan || allPelanggan.length === 0) {
            toast({ variant: "destructive", title: "Tidak ada data untuk diekspor" });
            return;
        }
        setIsImporting(true); // Using same loading state
        try {
            const XLSX = await import('xlsx');
            const dataToExport = allPelanggan.map(p => ({
                'No Service': p.noService,
                'Nama Pelanggan': p.namaPelanggan,
                'Alamat': p.alamat,
                'Nomor Telepon': Array.isArray(p.nomorTelepon) ? p.nomorTelepon.join(', ') : p.nomorTelepon,
                'Koordinat': p.koordinat,
                'Service Area': p.serviceArea,
                'STO': p.sto,
                'ODP Name': p.odpName,
                'ODP Port': p.odpPort,
                'ODP QR URL': p.odpQRCodeUrl,
                'Foto URL': p.fotoCpUrl,
                'Ditambahkan Oleh': p.userEmail,
                'Tanggal Ditambahkan': p.dateAdded?.toDate ? format(p.dateAdded.toDate(), 'yyyy-MM-dd HH:mm') : '',
            }));
            const worksheet = XLSX.utils.json_to_sheet(dataToExport);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Data Pelanggan");
            XLSX.writeFile(workbook, `Data_Pelanggan_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
            toast({ title: "Ekspor Berhasil", description: "Data pelanggan telah diunduh." });
        } catch (error) {
            toast({ variant: "destructive", title: "Gagal Mengekspor", description: "Terjadi kesalahan saat membuat file Excel." });
        } finally {
            setIsImporting(false);
        }
    }
    
    const handleImportRiwayat = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!user || !currentUserProfile || !allPelanggan) return;
        const file = event.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        try {
            const XLSX = await import('xlsx');
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json: any[] = XLSX.utils.sheet_to_json(worksheet);

            let successCount = 0;
            let skippedCount = 0;
            const batch = writeBatch(firestore);
            
            const pelangganMap = new Map(allPelanggan.map(p => [p.noService, p.id]));

            for (const row of json) {
                const noService = String(row['No. Layanan'] || row['Nomor Service'] || '').trim();
                if (!noService) continue;

                const pelangganId = pelangganMap.get(noService);
                if (!pelangganId) {
                    skippedCount++;
                    continue;
                }

                const tanggalLapor = parse(String(row['Tanggal Lapor']), 'dd-MMM-yyyy', new Date());
                if (!isValid(tanggalLapor)) continue;
                
                const newRiwayat: Omit<RiwayatGangguan, 'id'> = {
                    pelangganId: pelangganId,
                    noService,
                    userId: user.uid,
                    tanggalLapor: Timestamp.fromDate(tanggalLapor),
                    namaPetugas: String(row['Nama Petugas'] || currentUserProfile?.displayName || ''),
                    nik: String(row['NIK'] || currentUserProfile?.nik || ''),
                    jenisOrder: String(row['Jenis Order'] || ''),
                    keterangan: String(row['Keterangan'] || ''),
                    noTiket: String(row['No. Tiket'] || ''),
                    sto: String(row['STO'] || ''),
                    tanggalOpen: Timestamp.fromDate(tanggalLapor),
                    tanggalClose: null,
                    layanan: [],
                };
                
                const docRef = doc(collection(firestore, 'riwayat-gangguan'));
                batch.set(docRef, newRiwayat);
                successCount++;
            }
            
            await batch.commit();

            toast({
                title: 'Impor Selesai',
                description: `${successCount} riwayat berhasil diimpor. ${skippedCount > 0 ? `${skippedCount} baris dilewati karena No. Service tidak ditemukan.` : ''}`,
            });

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Gagal Mengimpor', description: `Terjadi kesalahan. ${error.message}` });
        } finally {
            setIsImporting(false);
            if (importFileRef.current) importFileRef.current.value = '';
        }
    };


    return (
        <div className="space-y-6">
            <div className='flex justify-between items-center'>
                <h1 className="text-3xl font-bold tracking-tight">Data Pelanggan & Riwayat Gangguan</h1>
                <div className='flex gap-2'>
                    <input type="file" ref={importFileRef} onChange={handleImportRiwayat} style={{ display: 'none' }} accept=".xlsx, .xls" />
                    <Button variant="outline" onClick={() => importFileRef.current?.click()} disabled={isImporting}>
                        {isImporting ? <Loader2 className='mr-2 h-4 w-4 animate-spin'/> : <Upload className='mr-2 h-4 w-4' />}
                        Import Riwayat
                    </Button>
                    <Button variant="outline" onClick={handleExportData} disabled={arePelangganLoading || isImporting}><FileSpreadsheet className='mr-2 h-4 w-4' /> Export Data Pelanggan</Button>
                </div>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Search /> Cari Pelanggan (Database Aplikasi)</CardTitle>
                    <CardDescription>Cari pelanggan berdasarkan No. Service atau Nama untuk melihat riwayat atau menambah data.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-end gap-4">
                        <div className="grid gap-2 flex-1">
                            <Label htmlFor="search-query">Nomor Service atau Nama</Label>
                            <Input 
                                id="search-query"
                                placeholder="Masukkan No. Service atau Nama Pelanggan..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Button type="button" disabled={arePelangganLoading}>
                            {arePelangganLoading ? <Loader2 className="animate-spin"/> : 'Cari'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {searchQuery.trim() && (
                <Card>
                    <CardHeader>
                        <CardTitle>Hasil Pencarian</CardTitle>
                        <CardDescription>Menampilkan {searchResults.length} hasil untuk &quot;{searchQuery}&quot;</CardDescription>
                    </CardHeader>
                    <CardContent>
                       {arePelangganLoading ? (
                           <div className="text-center"><Loader2 className="animate-spin mx-auto text-primary" /></div>
                       ) : searchResults.length > 0 ? (
                           <ul className="space-y-3">
                                {searchResults.map(p => (
                                    <li key={p.id}>
                                        <button onClick={() => setSelectedPelanggan(p)} className="w-full text-left p-4 rounded-lg border hover:bg-muted transition-all">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-semibold">{p.namaPelanggan}</p>
                                                    <p className="text-sm text-muted-foreground font-mono">{p.noService}</p>
                                                </div>
                                                <Badge variant="secondary">{p.sto}</Badge>
                                            </div>
                                             <div className="mt-2 text-sm text-muted-foreground space-y-1">
                                                <p className="truncate">Alamat: {p.alamat || 'N/A'}</p>
                                                <p>Telp: {(Array.isArray(p.nomorTelepon) ? p.nomorTelepon.join(', ') : p.nomorTelepon) || 'N/A'}</p>
                                                <p>ODP: {p.odpName || 'N/A'} {p.odpPort && ` / Port ${p.odpPort}`}</p>
                                            </div>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                       ) : (
                           <div className="text-center py-8">
                               <p className="text-muted-foreground">Tidak ada pelanggan yang ditemukan untuk &quot;{searchQuery}&quot;.</p>
                               <Button className="mt-4" onClick={() => setIsNewPelangganOpen(true)}>
                                   <PlusCircle className="mr-2 h-4 w-4" />
                                   Tambah Pelanggan Baru
                               </Button>
                           </div>
                       )}
                    </CardContent>
                </Card>
            )}

            {selectedPelanggan && (
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                             <div className="flex justify-between items-start flex-wrap gap-2">
                                <div>
                                    <CardTitle>Detail Pelanggan</CardTitle>
                                    <CardDescription>Data pelanggan yang tersimpan di database aplikasi.</CardDescription>
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" size="sm"><Trash2 /> Hapus</Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Hapus Pelanggan?</AlertDialogTitle>
                                                <AlertDialogDescription>Tindakan ini akan menghapus data pelanggan <strong>{selectedPelanggan.namaPelanggan}</strong> secara permanen. Riwayat gangguan tidak akan terhapus tetapi tidak akan lagi tertaut.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeletePelanggan(selectedPelanggan)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Hapus Pelanggan</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                    <Button size="sm" onClick={() => setIsNewRiwayatOpen(true)}><Wrench /> Input Laporan Gangguan</Button>
                                    <Button size="sm" variant="outline" onClick={() => setIsEditOpen(true)}><Pencil /> Ubah Info</Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid md:grid-cols-3 gap-6">
                                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6 text-sm">
                                    <div><Label className="text-muted-foreground">No. Service</Label><p className="font-semibold">{selectedPelanggan.noService}</p></div>
                                    <div><Label className="text-muted-foreground">Nama</Label><p className="font-semibold">{selectedPelanggan.namaPelanggan}</p></div>
                                    <div><Label className="text-muted-foreground">Service Area</Label><p>{selectedPelanggan.serviceArea}</p></div>
                                    <div><Label className="text-muted-foreground">STO</Label><p>{selectedPelanggan.sto}</p></div>
                                    <div className="col-span-2"><Label className="text-muted-foreground">Alamat</Label><p>{selectedPelanggan.alamat}</p></div>
                                    <div><Label className="text-muted-foreground">No. Telepon</Label>
                                        {(Array.isArray(selectedPelanggan.nomorTelepon) ? selectedPelanggan.nomorTelepon : [selectedPelanggan.nomorTelepon]).map((phone, i) => (
                                            <a key={i} href={formatWaNumber(phone || '')} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1"><Phone className="h-3 w-3"/>{phone}</a>
                                        ))}
                                    </div>
                                    <div><Label className="text-muted-foreground">Koordinat</Label><a href={`https://www.google.com/maps/search/?api=1&query=${selectedPelanggan.koordinat}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1"><MapPin className="h-3 w-3"/>{selectedPelanggan.koordinat}</a></div>
                                    <div><Label className="text-muted-foreground">ODP Terhubung</Label><p>{selectedPelanggan.odpName || '-'}</p></div>
                                    <div><Label className="text-muted-foreground">Port ODP</Label><p>{selectedPelanggan.odpPort || '-'}</p></div>
                                     <div className="col-span-2">
                                        <Label className="text-muted-foreground">ODP QR Code</Label>
                                        <p className="font-semibold font-mono">{selectedPelanggan.odpQRCodeUrl || '-'}</p>
                                    </div>
                                </div>
                                <div className="md:col-span-1 space-y-2">
                                    <Label>Foto Lokasi</Label>
                                    <div className="relative aspect-square w-full bg-muted rounded-md overflow-hidden">
                                        {selectedPelanggan.fotoCpUrl ? <Image src={selectedPelanggan.fotoCpUrl} alt="Foto Lokasi" fill className="object-cover"/> : <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Tidak ada foto</div>}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <RiwayatCard pelanggan={selectedPelanggan} onAddRiwayat={handleNewRiwayat} />
                </div>
            )}
            
            <NewPelangganDialog 
                isOpen={isNewPelangganOpen} 
                onOpenChange={setIsNewPelangganOpen}
                onFinished={handleNewPelanggan}
            />

            {selectedPelanggan && (
                <EditPelangganDialog
                    pelanggan={selectedPelanggan}
                    isOpen={isEditOpen}
                    onOpenChange={setIsEditOpen}
                    onFinished={() => {
                        const current = selectedPelanggan;
                        setSelectedPelanggan(null); // Force re-render
                        setTimeout(() => setSelectedPelanggan(current), 0);
                        setIsEditOpen(false);
                    }}
                />
            )}

            {selectedPelanggan && (
                <NewRiwayatDialog 
                    pelanggan={selectedPelanggan}
                    isOpen={isNewRiwayatOpen}
                    onOpenChange={setIsNewRiwayatOpen}
                    onFinished={handleNewRiwayat}
                    currentUserProfile={currentUserProfile}
                />
            )}
        </div>
    );
}






