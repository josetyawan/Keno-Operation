
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { useStorage } from '@/firebase/provider';
import { doc, updateDoc, Timestamp, addDoc, collection, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Loader2, Info, Camera, Upload, Check, Trash2, X, AlertTriangle } from 'lucide-react';
import type { RiwayatGangguan, UserProfile, MaterialEvidence } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useMemo } from 'react';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import Link from 'next/link';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { Checkbox } from '@/components/ui/checkbox';
import { format, isValid } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion } from '@/components/ui/accordion';

const jenisOrderOptions = [
  "Aktivasi Cross Connect TDE", "Aktivasi/Migrasi/Dismantel DCS", "Aktivasi/Migrasi/Dismantel Digiserve", "Aktivasi/Migrasi/Dismantel Hypernet", "Corrective Akses Tower CENTRATAMA", "Corrective Akses Tower Lintasarta", "Corrective Akses Tower UMT", "Corrective Cross Connect TDE", "Corrective CSA", "Corrective DCS", "Corrective Digiserve", "Corrective Hypernet", "Corrective MMP", "Corrective MyRep", "Corrective NuTech", "Corrective SNT", "Corrective SPBU", "Corrective TBG", "Corrective Tower POLARIS", "Corrective Tower TIS", "DISMANTLING FWA", "DISMANTLING ONT", "DISMANTLING PLC", "DISMANTLING STB", "DISMANTLING WIFI EXTENDER", "Dismantling DC Infracare", "Dismantling NTE B2B", "EXPAND ODP", "Inventory SPBU", "IXSA FTM", "IXSA ODC", "IXSA OLT", "Lapsung (Laporan Langsung)", "MO/DO Indibiz / Datin", "MO/DO Indihome", "PDA PSB Indihome", "PSB DATIN", "PSB INDIBIZ", "PSB OLO", "PSB MyRep", "PSB Surge", "PSB WIFI", "PT2 Simple", "Patroli Akses", "Preventif MMP", "Preventive Akses Tower CENTRATAMA", "Preventive Akses Tower Lintasarta", "Preventive Akses Tower UMT", "Preventive Asianet", "Preventive CSA", "Preventive FIberisasi", "Preventive NuTech", "Preventive SPBU", "Preventive TBG", "Preventive Tower POLARIS", "Preventive Tower TIS", "REPLACEMENT ONT Premium/Dual Band", "REPLACEMENT STB", "Relokasi DCS", "Relokasi Digiserve", "Relokasi Hypernet", "Reseller", "SQM Reguler", "Tangible ODP HSI Indihome", "Tangible ODP Tiket Datin Kategori 1", "Tiket Datin Kategori 2", "Tiket Datin Kategori 3", "Tiket FFG DATIN", "Tiket FFG HSI", "Tiket FFG WIFI", "Tiket GAMAS", "Tiket HSI Indibiz", "Tiket NodeB CNQ (Preventive/Quality)", "Tiket NodeB Critical", "Tiket NodeB Low", "Tiket NodeB Major", "Tiket NodeB Minor", "Tiket NodeB Premium", "Tiket NodeB Premium Preventive", "Tiket OLO Datin Gamas", "Tiket OLO Datin Non Gamas", "Tiket OLO Datin Quality", "Tiket OLO SL WDM", "Tiket OLO SL WDM Quality", "Tiket Pra SQM Gaul HSI", "Tiket Reguler", "Tiket SIP Trunk", "Tiket SQM Datin", "Tiket SQM HSI", "Tiket WIFI ID", "Tiket Wifi Logic", "UNLOCK ODP", "Unspec DATIN", "Unspec HSI", "Unspec SITE/NODE-B", "Unspec WIFI", "Unspec Reguler", "Validasi Data EBIS", "Validasi Data WIFI", "Validasi Tiang", "Valins FTM", "Valins ODC", "Valins Regular", "WFM", "Corrective Mitratel",
].sort();

const typeOrderOptions: Record<string, string[]> = {
    'Tiket Reguler': ['VVIP', 'Diamond', 'Platinum', 'Gold', 'NonHVC', 'HVC_Diamond', 'HVC_Gold', 'HVC_Platinum', 'Reguler'],
    'SQM Reguler': ['Workhours', 'NonWorkhours'],
    'Tiket GAMAS': ['DISTRIBUSI', 'FEEDER', 'ODC', 'ODP'],
};

const layananOptions = ["INTERNET", "VOICE", "USEETV", "WIFI MESH", "WIFI AP", "WIFI-LITE", "OLO", "METRO", "ASTINET", "VPNIP", "DATIN"];

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


export default function EditRiwayatPage() {
    const params = useParams();
    const id = params.id as string;
    const router = useRouter();
    const { user, isUserLoading } = useUser();
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
    const [materialQuantities, setMaterialQuantities] = useState<Record<string, number>>({});
    const [materialDetails, setMaterialDetails] = useState<Record<string, Record<string, string>>>({});
    const [materialFiles, setMaterialFiles] = useState<Record<string, Record<string, File | null>>>({});
    const [existingEvidences, setExistingEvidences] = useState<Record<string, MaterialEvidence['evidences']>>({});
    const [evidenScc, setEvidenScc] = useState<File | null>(null);
    const [existingSccUrl, setExistingSccUrl] = useState<string | null>(null);
    const [dorongClose, setDorongClose] = useState(false);

    // Fetching data
    const riwayatRef = useMemoFirebase(() => doc(firestore, 'riwayat-gangguan', id), [firestore, id]);
    const { data: riwayat, isLoading: isRiwayatLoading } = useDoc<RiwayatGangguan>(riwayatRef);

    const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

    useEffect(() => {
        if (riwayat) {
            setTanggalOpen(riwayat.tanggalOpen?.toDate ? format(riwayat.tanggalOpen.toDate(), "yyyy-MM-dd'T'HH:mm") : '');
            setTanggalClose(riwayat.tanggalClose?.toDate ? format(riwayat.tanggalClose.toDate(), "yyyy-MM-dd'T'HH:mm") : '');
            setNoTiket(riwayat.noTiket || '');
            setJenisOrder(riwayat.jenisOrder || '');
            setTypeOrder(riwayat.typeOrder || '');
            setKeterangan(riwayat.keterangan || '');
            setSelectedLayanan(riwayat.layanan || []);
            setDorongClose(riwayat.dorongClose || false);
            setExistingSccUrl(riwayat.evidenSccUrl || null);

            const initialSelectedMaterials: Record<string, boolean> = {};
            const initialQuantities: Record<string, number> = {};
            const initialDetails: Record<string, Record<string, string>> = {};
            const initialExistingEvidences: Record<string, MaterialEvidence['evidences']> = {};

            (riwayat.materials || []).forEach(mat => {
                initialSelectedMaterials[mat.materialName] = true;
                if (mat.quantity) initialQuantities[mat.materialName] = mat.quantity;
                if (mat.details) initialDetails[mat.materialName] = mat.details;
                if (mat.evidences) initialExistingEvidences[mat.materialName] = mat.evidences;
            });

            setSelectedMaterials(initialSelectedMaterials);
            setMaterialQuantities(initialQuantities);
            setMaterialDetails(initialDetails);
            setExistingEvidences(initialExistingEvidences);
        }
    }, [riwayat]);

    const showOrderType = useMemo(() => Object.keys(typeOrderOptions).includes(jenisOrder), [jenisOrder]);
    
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
        }
    };
    
    const handleFileChange = (materialName: string, evidenceName: string, file: File | null) => {
        setMaterialFiles(prev => ({ ...prev, [materialName]: { ...(prev[materialName] || {}), [evidenceName]: file } }));
    };

    const handleDetailChange = (materialName: string, detailKey: string, value: string) => {
        setMaterialDetails(prev => ({ ...prev, [materialName]: { ...(prev[materialName] || {}), [detailKey]: value } }));
    };

    const handleRemoveExistingEvidence = async (materialName: string, photoUrl: string) => {
        if (!confirm('Anda yakin ingin menghapus foto ini?')) return;

        try {
            // Delete from storage
            const photoRef = ref(storage, photoUrl);
            await deleteObject(photoRef);
            
            // Update local state
            setExistingEvidences(prev => {
                const updatedMaterialEvidences = (prev[materialName] || []).filter(e => e.photoUrl !== photoUrl);
                return { ...prev, [materialName]: updatedMaterialEvidences };
            });
            toast({ title: 'Foto Dihapus' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Gagal Menghapus Foto' });
        }
    };

     const handleRemoveSccEvidence = async () => {
        if (!existingSccUrl || !confirm('Anda yakin ingin menghapus foto SCC?')) return;
        try {
            const photoRef = ref(storage, existingSccUrl);
            await deleteObject(photoRef);
            setExistingSccUrl(null);
            toast({ title: 'Foto SCC Dihapus' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Gagal Menghapus Foto SCC' });
        }
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !riwayat) return;
        if (!jenisOrder || !tanggalOpen) {
            toast({ variant: 'destructive', title: 'Data Wajib Diisi', description: 'Pastikan Jenis Order dan Tanggal Open telah diisi.' });
            return;
        }
        setIsSaving(true);
    
        try {
            const uploadFile = async (file: File) => {
                const filePath = `notas/${user.uid}/gangguan_evidence_${Date.now()}-${file.name}`;
                const storageRef = ref(storage, filePath);
                await uploadBytes(storageRef, file);
                return getDownloadURL(storageRef);
            };
    
            const materialEvidencePromises = Object.entries(selectedMaterials)
                .filter(([, isSelected]) => isSelected)
                .map(async ([materialName]) => {
                    const evidenceFiles = materialFiles[materialName] || {};
                    const newEvidenceUploads = await Promise.all(
                        Object.entries(evidenceFiles)
                            .filter(([, file]) => file)
                            .map(async ([evidenceName, file]) => ({
                                evidenceName,
                                photoUrl: await uploadFile(file!),
                            }))
                    );
    
                    const finalEvidences = [
                        ...(existingEvidences[materialName] || []),
                        ...newEvidenceUploads,
                    ];
    
                    const materialEntry: MaterialEvidence = { materialName };
                    if (materialEvidenMap[materialName]?.quantity) {
                        materialEntry.quantity = materialQuantities[materialName] || 0;
                    }
                    if (materialEvidenMap[materialName]?.inputs) {
                        materialEntry.details = materialDetails[materialName] || {};
                    }
                    if (finalEvidences.length > 0) {
                        materialEntry.evidences = finalEvidences;
                    }
                    return materialEntry;
                });
    
            const processedMaterials = await Promise.all(materialEvidencePromises);
            
            let finalSccUrl = existingSccUrl;
            if (evidenScc) {
                finalSccUrl = await uploadFile(evidenScc);
            }
    
            const updatedData: any = {
                noTiket, jenisOrder, typeOrder: showOrderType ? typeOrder : '', keterangan, layanan: selectedLayanan,
                materials: processedMaterials,
                tanggalOpen: Timestamp.fromDate(new Date(tanggalOpen)),
                tanggalClose: tanggalClose ? Timestamp.fromDate(new Date(tanggalClose)) : null,
                dorongClose,
                evidenSccUrl: finalSccUrl,
                lastEditedBy: userProfile?.email || user.email,
                lastEditedDate: serverTimestamp(),
            };
    
            await updateDoc(riwayatRef, updatedData);
            toast({ title: 'Laporan Berhasil Diperbarui' });
            router.push(`/dashboard/admin/pelanggan/riwayat/${id}`);
    
        } catch (error: any) {
            console.error("Error updating report:", error);
            toast({ variant: 'destructive', title: 'Gagal Memperbarui', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    if (isRiwayatLoading || isProfileLoading) {
        return <div className="p-6"><Skeleton className="h-96 w-full" /></div>;
    }

    return (
        <form onSubmit={handleSubmit} className="mx-auto grid w-full max-w-2xl flex-1 auto-rows-max gap-6">
            <div className="flex items-center gap-4">
                <Button onClick={() => router.back()} variant="outline" size="icon" className="h-8 w-8" type="button">
                    <ArrowLeft className="h-4 w-4" /><span className="sr-only">Kembali</span>
                </Button>
                <h1 className="text-xl font-bold tracking-tight">Edit Laporan Gangguan</h1>
                <Button type="submit" disabled={isSaving} className="ml-auto">
                    {isSaving ? <Loader2 className="animate-spin" /> : 'Simpan Perubahan'}
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Detail Laporan</CardTitle>
                    <CardDescription>Perbarui detail laporan gangguan untuk No. Service {riwayat?.noService}.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6">
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
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Material & Eviden</CardTitle></CardHeader>
                <CardContent>
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
                                                    <Input id={`qty-${materialName}`} type="number" placeholder="Jumlah" value={materialQuantities[materialName] ?? ''} onChange={e => setMaterialQuantities(prev => ({...prev, [materialName]: Number(e.target.value)}))} className="w-32"/>
                                                </div>
                                            )}
                                            {config.inputs && config.inputs.map(inputLabel => (
                                                <div key={inputLabel} className="grid gap-2">
                                                    <Label htmlFor={`detail-${materialName}-${inputLabel}`}>{inputLabel}</Label>
                                                    <Input id={`detail-${materialName}-${inputLabel}`} placeholder={`${inputLabel}...`} value={materialDetails[materialName]?.[inputLabel] || ''} onChange={e => handleDetailChange(materialName, inputLabel, e.target.value)} />
                                                </div>
                                            ))}
                                            {(existingEvidences[materialName] || []).length > 0 && (
                                                <div className="grid gap-2">
                                                    <Label>Foto Tersimpan</Label>
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                                        {(existingEvidences[materialName] || []).map((ev, idx) => (
                                                            <div key={idx} className="relative group aspect-square">
                                                                <Image src={ev.photoUrl} alt={`${materialName} - ${ev.evidenceName}`} fill className="object-cover rounded-md" />
                                                                <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full z-10 opacity-0 group-hover:opacity-100" onClick={() => handleRemoveExistingEvidence(materialName, ev.photoUrl)}>
                                                                    <X className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {config.evidences && config.evidences.map(evidenName => (
                                                <div key={evidenName} className="grid gap-2">
                                                    <Label htmlFor={`file-${materialName}-${evidenName}`} className="capitalize">Tambah {evidenName}</Label>
                                                    <Input id={`file-${materialName}-${evidenName}`} type="file" accept="image/*" onChange={(e) => handleFileChange(materialName, evidenName, e.target.files?.[0] || null)} />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </Accordion>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Eviden Tambahan</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                     <div className="grid gap-2">
                        <Label>Eviden SCC</Label>
                        {existingSccUrl && (
                             <div className="relative group w-32 h-32">
                                <Image src={existingSccUrl} alt="Eviden SCC" fill className="object-cover rounded-md" />
                                <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full z-10" onClick={handleRemoveSccEvidence}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                        <Input id="eviden-scc" type="file" accept="image/*" onChange={(e) => setEvidenScc(e.target.files?.[0] || null)} />
                     </div>
                     <div className="flex items-center space-x-2">
                        <Checkbox id="dorong-close" checked={dorongClose} onCheckedChange={(checked) => setDorongClose(Boolean(checked))} />
                        <Label htmlFor="dorong-close">Dorong Close (Jika tidak ada eviden)</Label>
                    </div>
                </CardContent>
            </Card>
        </form>
    );
}

