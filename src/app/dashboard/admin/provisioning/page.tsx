
'use client';

import * as React from 'react';
import { useState, useMemo, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Upload, FileSpreadsheet, ChevronLeft, ChevronRight, Trash2, ChevronRightIcon, User, AlertTriangle, Phone, MoreHorizontal, Edit, Save, Package, Truck, PackageCheck, Send, PlusCircle, Calendar as CalendarIcon, RefreshCw, X, Bot } from 'lucide-react';
import { format, isValid, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc, writeBatch, orderBy, getDocs, setDoc, updateDoc, serverTimestamp, where, Timestamp, getDoc, limit, deleteDoc } from 'firebase/firestore';
import type { ProvisioningRecord, UserProfile } from '@/lib/types';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { triggerProvisioningRekapAction } from '@/app/actions/triggerProvisioningRekapAction';
import { triggerPlottingRekapAction } from '@/app/actions/triggerPlottingRekapAction';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';


const ITEMS_PER_PAGE = 5;

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

const jenisPekerjaanOptions = [
  "PSB DATIN", "PSB OLO", "PSB WIFI", "PDA DATIN", "PDA WIFI",
  "REPLACEMENT", "Instalasi IP Camera", "Instalasi SD-WAN",
  "Instalasi Router", "Install AP WIFI (1 AP)", "Install AP WIFI (2 AP)",
  "Install AP WIFI(3 AP)", "Install AP WIFI (4 AP)",
  "Pembuatan BAI (Satkomindo,BRI MPLS)", "Provisioning MyRep", "PSB Surge",
  "Provisioning 5 Menara Bintang", "PSB IBU - FTTR",
  "PT Anagata Cipta Teknologi (KerjainAja)", "PSB TBG", "Provisioning Hypernet",
  "2ND STB", "UPSELLING", "DISMANTLING EBIS",
  "PSB Indihome", "PSB Indibiz", "PDA Indihome", "PDA Indibiz"
].sort();

const typeOrderOptions: Record<string, string[]> = {
    'DISMANTLING EBIS': ['ONT', 'STB', 'AP', 'IP CAMERA'],
    'REPLACEMENT': ['ONT', 'STB'],
};

function KendalaDetailsCard({ kendalaOrders, isLoading, onAssign, onCancel }: { 
    kendalaOrders: ProvisioningRecord[], 
    isLoading: boolean,
    onAssign: (order: ProvisioningRecord) => void,
    onCancel: (order: ProvisioningRecord) => void,
}) {
    return (
        <Card className="border-destructive">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle /> Monitoring Kendala
                </CardTitle>
                <CardDescription>Daftar order provisioning yang mengalami kendala dan memerlukan perhatian.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? <Skeleton className="h-10 w-full" /> : 
                 kendalaOrders && kendalaOrders.length > 0 ? (
                    <ul className="space-y-3">
                        {kendalaOrders.map(order => (
                             <li key={order.id} className="text-sm p-3 bg-destructive/10 rounded-md flex items-start justify-between gap-2">
                                <Link href={`/dashboard/provi-orders/${order.id}`} className="flex-grow hover:bg-destructive/10 -m-3 p-3 rounded-l-md">
                                    <div className="flex justify-between items-start">
                                        <span className="font-semibold">{order.customerName} ({order.workorder})</span>
                                        <Badge variant="outline" className="capitalize shrink-0">{order.kendalaCategory || 'Teknis'}</Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">Teknisi: {order.assignedTo_userName}</p>
                                    <p className="text-sm mt-1 truncate">Alasan: {order.kendalaNotes || 'Tidak ada catatan.'}</p>
                                </Link>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Aksi Kendala</DropdownMenuLabel>
                                        <DropdownMenuItem onSelect={() => onAssign(order)}>
                                            <RefreshCw className="mr-2 h-4 w-4" />
                                            Assign Ulang Teknisi
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => onCancel(order)} className="text-destructive focus:text-destructive">
                                            <X className="mr-2 h-4 w-4" />
                                            Batalkan Order
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-sm text-muted-foreground">Tidak ada order yang berkendala saat ini.</p>}
            </CardContent>
        </Card>
    );
}

function ManualOrderForm({ users, onSave, onCancel, currentUserProfile }: { users: UserProfile[], onSave: (data: Partial<ProvisioningRecord>) => Promise<void>, onCancel: () => void, currentUserProfile: UserProfile | null }) {
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();
    
    // Form fields
    const [crmOrder, setCrmOrder] = useState('');
    const [workorder, setWorkorder] = useState('');
    const [workorderBaru, setWorkorderBaru] = useState('');
    const [scOrder, setScOrder] = useState('');
    const [contactNumber, setContactNumber] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [address, setAddress] = useState('');
    const [bookingDate, setBookingDate] = useState('');
    const [serviceNo, setServiceNo] = useState('');
    const [odpName, setOdpName] = useState('');
    const [productName, setProductName] = useState('');
    const [assignedTo_userId, setAssignedTo_userId] = useState('');
    const [assignedTo_crew_userId, setAssignedTo_crew_userId] = useState('');
    const [workzone, setWorkzone] = useState('');

    const workzoneOptions = ['KUD', 'DMA', 'PWD', 'PTI', 'JPR', 'RBG', 'BLA'];

    useEffect(() => {
        if (currentUserProfile?.psa) {
            const initialWz = currentUserProfile.psa.toUpperCase();
            setWorkzone(initialWz === 'KDS' || initialWz === 'N/A' ? 'KUD' : initialWz);
        } else {
            setWorkzone('KUD'); // Default
        }
    }, [currentUserProfile]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!scOrder.trim() || !customerName.trim() || !crmOrder || !workzone) {
            toast({ variant: 'destructive', title: 'Data Wajib Kurang', description: 'SC Order, Nama Pelanggan, Jenis Pekerjaan, dan Workzone harus diisi.' });
            return;
        }

        setIsSaving(true);
        const technician = users.find(u => u.id === assignedTo_userId);
        const crew = users.find(u => u.id === assignedTo_crew_userId);
        const isAssigned = !!technician;
        
        const newOrder: Partial<ProvisioningRecord> = {
            workorder,
            workorderBaru,
            scOrder: scOrder.trim(),
            contactNumber, customerName, address, bookingDate, serviceNo,
            odpName, productName, crmOrder,
            assignedTo_userId: technician?.id || '',
            assignedTo_userName: technician?.displayName || '',
            assignedTo_crew_userId: crew?.id || '',
            assignedTo_crew_userName: crew?.displayName || '',
            provisioningStatus: isAssigned ? 'assigned' : 'unassigned',
            assignedAt: isAssigned ? Timestamp.now() : null,
            status: 'OPEN',
            workzone: workzone,
            productType: ''
        };
        
        try {
            await onSave(newOrder);
        } catch (error) {
            // Error is handled by the parent
        } finally {
             setIsSaving(false);
        }
    };

    const availableCrew = useMemo(() => {
        if (!users || !assignedTo_userId) return users;
        return users.filter(u => u.id !== assignedTo_userId);
    }, [users, assignedTo_userId]);

    return (
        <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                 <div className="grid gap-2">
                    <Label htmlFor="crmOrder">Jenis Pekerjaan *</Label>
                    <Select value={crmOrder} onValueChange={setCrmOrder} required>
                        <SelectTrigger id="crmOrder"><SelectValue placeholder="Pilih Jenis Pekerjaan..." /></SelectTrigger>
                        <SelectContent><ScrollArea className="h-72">{jenisPekerjaanOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</ScrollArea></SelectContent>
                    </Select>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="workorder">WO Lama</Label>
                        <Input id="workorder" value={workorder} onChange={e => setWorkorder(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="workorderBaru">WO Baru</Label>
                        <Input id="workorderBaru" value={workorderBaru} onChange={e => setWorkorderBaru(e.target.value)} />
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="scOrder">SC Order *</Label>
                        <Input id="scOrder" value={scOrder} onChange={e => setScOrder(e.target.value)} required />
                    </div>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="customerName">Nama Pelanggan *</Label>
                    <Input id="customerName" value={customerName} onChange={e => setCustomerName(e.target.value)} required />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="address">Alamat</Label>
                    <Textarea id="address" value={address} onChange={e => setAddress(e.target.value)} />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="serviceNo">No. Internet</Label>
                        <Input id="serviceNo" value={serviceNo} onChange={e => setServiceNo(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="contactNumber">No. Kontak</Label>
                        <Input id="contactNumber" value={contactNumber} onChange={e => setContactNumber(e.target.value)} />
                    </div>
                </div>
                 <div className="grid md:grid-cols-3 gap-4">
                     <div className="grid gap-2">
                        <Label htmlFor="productName">Paket Info</Label>
                        <Input id="productName" value={productName} onChange={e => setProductName(e.target.value)} />
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="odpName">Nama ODP</Label>
                        <Input id="odpName" value={odpName} onChange={e => setOdpName(e.target.value)} />
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="workzone">Workzone *</Label>
                        <Select value={workzone} onValueChange={setWorkzone} required>
                            <SelectTrigger id="workzone"><SelectValue placeholder="Pilih Workzone..." /></SelectTrigger>
                            <SelectContent>{workzoneOptions.map(wz => <SelectItem key={wz} value={wz}>{wz}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="bookingDate">Jadwal Mulai</Label>
                    <Input id="bookingDate" value={bookingDate} onChange={e => setBookingDate(e.target.value)} placeholder="Contoh: 25-07-2024 08:00"/>
                </div>
                 <div className="grid md:grid-cols-2 gap-4 border-t pt-4">
                    <div className="grid gap-2">
                        <Label htmlFor="assignedTo_userId">Tim Teknisi (Utama)</Label>
                        <Select value={assignedTo_userId} onValueChange={setAssignedTo_userId}>
                            <SelectTrigger id="assignedTo_userId"><SelectValue placeholder="Pilih teknisi utama..." /></SelectTrigger>
                            <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.displayName}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="assignedTo_crew_userId">Rekan Crew (Opsional)</Label>
                        <Select value={assignedTo_crew_userId} onValueChange={(value) => setAssignedTo_crew_userId(value === 'none' ? '' : value)}>
                            <SelectTrigger id="assignedTo_crew_userId"><SelectValue placeholder="Pilih rekan crew..." /></SelectTrigger>
                            <SelectContent><SelectItem value="none">Tidak Ada Rekan</SelectItem>{availableCrew.map(u => <SelectItem key={u.id} value={u.id}>{u.displayName}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                </div>
            </div>
             <DialogFooter>
                <Button type="button" variant="ghost" onClick={onCancel}>Batal</Button>
                <Button type="submit" disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 animate-spin" />}
                    Simpan Order
                </Button>
            </DialogFooter>
        </form>
    );
}


function EditOrderForm({ order, onSave, onCancel, isSaving }: { order: ProvisioningRecord, onSave: (data: Partial<ProvisioningRecord>) => void, onCancel: () => void, isSaving: boolean }) {
    const [serviceNo, setServiceNo] = useState(order.serviceNo || '');
    const [customerName, setCustomerName] = useState(order.customerName || '');
    const [contactNumber, setContactNumber] = useState(order.contactNumber || '');
    const [address, setAddress] = useState(order.address || '');
    const [productName, setProductName] = useState(order.productName || '');
    const [crmOrder, setCrmOrder] = useState(order.crmOrder || '');
    const [description, setDescription] = useState(order.description || ''); // This will be our "Order Type"

    const typeOrderOptions: Record<string, string[]> = {
        'DISMANTLING EBIS': ['ONT', 'STB', 'AP', 'IP CAMERA'],
        'REPLACEMENT': ['ONT', 'STB'],
    };

    useEffect(() => {
        setServiceNo(order.serviceNo || '');
        setCustomerName(order.customerName || '');
        setContactNumber(order.contactNumber || '');
        setAddress(order.address || '');
        setProductName(order.productName || '');
        setCrmOrder(order.crmOrder || '');
        setDescription(order.description || '');
    }, [order]);

    const showOrderType = useMemo(() => Object.keys(typeOrderOptions).includes(crmOrder), [crmOrder]);

    useEffect(() => {
        if (!showOrderType) setDescription('');
    }, [crmOrder, showOrderType]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            serviceNo,
            customerName,
            contactNumber,
            address,
            productName,
            crmOrder,
            description: showOrderType ? description : '',
        });
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                <div className="grid gap-2">
                    <Label htmlFor="edit-serviceNo">No. Internet / Service</Label>
                    <Input id="edit-serviceNo" value={serviceNo} onChange={e => setServiceNo(e.target.value)} />
                </div>
                 <div className="grid gap-2">
                    <Label htmlFor="edit-customerName">Nama Pelanggan</Label>
                    <Input id="edit-customerName" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="edit-contactNumber">No. Kontak</Label>
                    <Input id="edit-contactNumber" value={contactNumber} onChange={e => setContactNumber(e.target.value)} />
                </div>
                 <div className="grid gap-2">
                    <Label htmlFor="edit-address">Alamat</Label>
                    <Textarea id="edit-address" value={address} onChange={e => setAddress(e.target.value)} />
                </div>
                 <div className="grid gap-2">
                    <Label htmlFor="edit-productName">Paket Internet</Label>
                    <Input id="edit-productName" value={productName} onChange={e => setProductName(e.target.value)} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="edit-crmOrder">Jenis Order</Label>
                        <Select value={crmOrder} onValueChange={setCrmOrder}>
                            <SelectTrigger id="edit-crmOrder"><SelectValue placeholder="Pilih Jenis Order..." /></SelectTrigger>
                            <SelectContent><ScrollArea className="h-72">{jenisPekerjaanOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</ScrollArea></SelectContent>
                        </Select>
                    </div>
                    {showOrderType && (
                        <div className="grid gap-2">
                            <Label htmlFor="edit-description">Order Type</Label>
                            <Select value={description} onValueChange={setDescription}>
                                <SelectTrigger id="edit-description"><SelectValue placeholder="Pilih Tipe Order..." /></SelectTrigger>
                                <SelectContent>{typeOrderOptions[crmOrder].map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
            </div>
            <DialogFooter>
                <Button type="button" variant="ghost" onClick={onCancel}>Batal</Button>
                <Button type="submit" disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 animate-spin" />}
                    Simpan Perubahan
                </Button>
            </DialogFooter>
        </form>
    );
}

function AssignTechnicianDialog({ order, users, isOpen, onOpenChange, onAssign, isAssigning }: { order: ProvisioningRecord; users: UserProfile[]; isOpen: boolean; onOpenChange: (open: boolean) => void; onAssign: (techId: string, crewId: string) => void; isAssigning: boolean; }) {
  const [selectedTechnician, setSelectedTechnician] = useState('');
  const [selectedCrew, setSelectedCrew] = useState('');

  const availableCrew = useMemo(() => {
      if (!users || !selectedTechnician) return users;
      return users.filter(u => u.id !== selectedTechnician);
  }, [users, selectedTechnician]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedTechnician('');
      setSelectedCrew('');
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tugaskan Teknisi</DialogTitle>
          <DialogDescription>
            Pilih teknisi untuk menangani order WO: {order.workorder}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih teknisi utama..." />
            </SelectTrigger>
            <SelectContent>
              {users.map(u => <SelectItem key={u.id} value={u.id}>{u.displayName}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedCrew} onValueChange={(value) => setSelectedCrew(value === 'none' ? '' : value)}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih rekan crew (opsional)..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Tidak Ada Rekan</SelectItem>
              {availableCrew.map(u => <SelectItem key={u.id} value={u.id}>{u.displayName}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="ghost" disabled={isAssigning}>Batal</Button></DialogClose>
          <Button onClick={() => onAssign(selectedTechnician, selectedCrew)} disabled={!selectedTechnician || isAssigning}>
            {isAssigning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isAssigning ? 'Menugaskan...' : 'Tugaskan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PivotTable({ data, workzones }: { data: any; workzones: string[]; }) {
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

    const workzoneMapping: { [key: string]: string } = {
        'KDS': 'KUD',
        'KUD': 'KUD',
        'DEMAK': 'DMA',
        'DMA': 'DMA',
        'PURWODADI': 'PWD',
        'PWD': 'PWD',
        'PATI': 'PTI',
        'PTI': 'PTI',
        'JEPARA': 'JPR',
        'JPR': 'JPR',
        'REMBANG': 'RBG',
        'RBG': 'RBG',
        'BLORA': 'BLA',
        'BLA': 'BLA',
    };

    const toggleRow = (key: string) => {
        setExpandedRows(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const sortedTechKeys = Object.keys(data).sort();
    
    const { grandTotalCount, workzoneTotals, grandStatusCounts } = useMemo(() => {
        const wt: Record<string, number> = {};
        let gtc = 0;
        const gsc: Record<string, number> = {};

        sortedTechKeys.forEach(key => {
            const techData = data[key];
            gtc += techData.count['Grand Total'];
            workzones.forEach(wz => {
                wt[wz] = (wt[wz] || 0) + (techData.count[wz] || 0);
            });
             if (techData.statusCounts) {
                Object.entries(techData.statusCounts).forEach(([status, count]) => {
                    gsc[status] = (gsc[status] || 0) + (count as number);
                });
            }
        });
        return { grandTotalCount: gtc, workzoneTotals: workzones.map(wz => wt[wz] || 0), grandStatusCounts: gsc };
    }, [data, sortedTechKeys, workzones]);

    return (
        <div className="overflow-x-auto border rounded-lg">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[300px]">Teknisi / SC Order</TableHead>
                        <TableHead>Status</TableHead>
                        {workzones.map(wz => <TableHead key={wz} className="text-right">{workzoneMapping[wz.toUpperCase()] || wz}</TableHead>)}
                        <TableHead className="text-right font-bold">Grand Total</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                   {sortedTechKeys.length > 0 ? (
                       sortedTechKeys.map(techKey => {
                           const techData = data[techKey];
                           const isExpanded = expandedRows[techKey];
                           const statusSummary = techData.statusCounts 
                                ? Object.entries(techData.statusCounts)
                                    .map(([status, count]) => `${status}: ${count}`)
                                    .join(', ')
                                : '';

                           return (
                               <React.Fragment key={techKey}>
                                   <TableRow>
                                       <TableCell className="font-medium">
                                           <div className="flex items-center gap-2">
                                               <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleRow(techKey)}>
                                                   <ChevronRightIcon className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-90")} />
                                               </Button>
                                               <span>{techKey}</span>
                                           </div>
                                       </TableCell>
                                       <TableCell className="text-xs text-muted-foreground">{statusSummary}</TableCell>
                                       {workzones.map(wz => (
                                           <TableCell key={wz} className="text-right font-semibold">
                                               {techData.count[wz] || 0}
                                           </TableCell>
                                       ))}
                                       <TableCell className="text-right font-bold">{techData.count['Grand Total']}</TableCell>
                                   </TableRow>

                                   {isExpanded && techData.orders?.map((order: any, index: number) => (
                                       <TableRow key={`${techKey}-${order.id}-${index}`} className="bg-muted/50">
                                           <TableCell style={{ paddingLeft: '3.5rem' }}>{order.scOrder}</TableCell>
                                           <TableCell>
                                               <Badge variant={order.status === 'completed' ? 'default' : order.status === 'kendala' ? 'destructive' : 'secondary'}>
                                                   {order.status}
                                               </Badge>
                                           </TableCell>
                                           {workzones.map(wz => (
                                               <TableCell key={wz} className="text-right">{order.workzone === wz ? 1 : ''}</TableCell>
                                           ))}
                                           <TableCell className="text-right font-bold"></TableCell>
                                       </TableRow>
                                   ))}
                               </React.Fragment>
                           );
                       })
                   ) : (
                       <TableRow><TableCell colSpan={workzones.length + 3} className="h-24 text-center">Silakan impor file Excel atau buat order manual untuk melihat rekap.</TableCell></TableRow>
                   )}
                </TableBody>
                 <TableFooter>
                    <TableRow className="font-bold bg-muted">
                        <TableCell>Grand Total</TableCell>
                         <TableCell className="text-xs text-muted-foreground font-normal">
                           {Object.entries(grandStatusCounts).map(([status, count]) => `${status}: ${count}`).join(', ')}
                        </TableCell>
                        {workzoneTotals.map((total, index) => (
                            <TableCell key={index} className="text-right">{total}</TableCell>
                        ))}
                        <TableCell className="text-right">{grandTotalCount}</TableCell>
                    </TableRow>
                 </TableFooter>
            </Table>
        </div>
    );
}

function BotPlottingCard({ plottingData }: { plottingData: any[] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Bot /> Bot Ploting Teknisi</CardTitle>
                <CardDescription>Daftar alokasi pekerjaan yang sedang aktif hari ini.</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[70vh] rounded-md border p-4 font-mono text-sm">
                    {plottingData.length > 0 ? (
                        plottingData.map(({ teamName, orders }) => (
                            <div key={teamName} className="mb-6 last:mb-0">
                                <h3 className="font-bold text-base mb-2 pb-1 border-b border-dashed">{teamName}</h3>
                                <div className="space-y-1">
                                    {orders.map((order: any, i: number) => (
                                        <p key={i}>{order.statusEmoji} {order.statusText} {order.scOrder} {order.productName}</p>
                                    ))}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            Tidak ada order aktif untuk di-plot.
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    );
}


// --- Main Component ---
export default function ProvisioningDashboardPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [isManualFormOpen, setIsManualFormOpen] = useState(false);
  const [orderToAssign, setOrderToAssign] = useState<ProvisioningRecord | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  
  const [orderToEdit, setOrderToEdit] = useState<ProvisioningRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [orderToCancel, setOrderToCancel] = useState<ProvisioningRecord | null>(null);
  
  const [isSendingRekap, setIsSendingRekap] = useState(false);
  const [isSendingPlotting, setIsSendingPlotting] = useState(false);

  // Data fetching
  const recordsQuery = useMemoFirebase(() => query(collection(firestore, 'provisioning-records'), orderBy('dateCreated', 'desc')), [firestore]);
  const { data, isLoading: areRecordsLoading } = useCollection<ProvisioningRecord>(recordsQuery);
  
  const usersQuery = useMemoFirebase(() => query(collection(firestore, 'users'), where('role', '==', 'teknisi'), where('registrationStatus', '==', 'approved')), [firestore]);
  const { data: technicians, isLoading: areTechniciansLoading } = useCollection<UserProfile>(usersQuery);
  
  const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  const [workzones, setWorkzones] = useState<string[]>([]);
  const [selectedWorkzone, setSelectedWorkzone] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTechnician, setSelectedTechnician] = useState('all');
  
  const [filterMode, setFilterMode] = useState<'month' | 'range' | 'all'>('month');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  
  // States for pagination
  const [unassignedPage, setUnassignedPage] = useState(1);
  const [inProgressPage, setInProgressPage] = useState(1);
  const [completedPage, setCompletedPage] = useState(1);
  const [cancelledPage, setCancelledPage] = useState(1);

  const safeToDate = (timestamp: any): Date | null => {
      if (!timestamp) return null;
      if (timestamp.toDate) return timestamp.toDate();
      if (timestamp instanceof Date) return timestamp;
      const d = new Date(timestamp);
      return d instanceof Date && !isNaN(d.valueOf()) ? d : null;
  };

  const monthYearOptions = useMemo(() => {
    const periods = new Set<string>();
    const allRecords = data || [];

    allRecords.forEach(order => {
        const date = safeToDate(order.dateCreated);
        if (date) {
            periods.add(format(date, 'yyyy-MM'));
        }
    });
    
    const now = new Date();
    for (let i = -3; i <= 3; i++) { 
        const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
        periods.add(format(date, 'yyyy-MM'));
    }

    return Array.from(periods)
      .sort((a, b) => b.localeCompare(a)) 
      .map(period => {
          const [year, month] = period.split('-');
          const date = new Date(Number(year), Number(month) - 1);
          return {
              value: period,
              label: format(date, 'MMMM yyyy', { locale: idLocale })
          }
      });
  }, [data]);
  
  useEffect(() => {
    if (monthYearOptions.length > 0 && !selectedMonth) {
        const currentMonthYYYYMM = format(new Date(), 'yyyy-MM');
        const defaultPeriod = monthYearOptions.find(opt => opt.value === currentMonthYYYYMM) || monthYearOptions[0];
        setSelectedMonth(defaultPeriod.value);
    }
  }, [monthYearOptions, selectedMonth]);
  
  useEffect(() => {
    if (data) {
      const uniqueWorkzones = [...new Set(data.map((item) => {
        const wzRaw = (item.workzone || 'N/A').toUpperCase();
        if (wzRaw === 'KDS' || wzRaw === 'N/A') return 'KUD';
        return wzRaw;
      }))].sort();
      setWorkzones(uniqueWorkzones);
    }
  }, [data]);

  const assignedTechnicians = useMemo(() => {
    if (!data || !technicians) return [];
    const assignedIds = new Set(data.map(order => order.assignedTo_userId).filter(Boolean));
    return technicians.filter(tech => assignedIds.has(tech.id)).sort((a,b) => (a.displayName || '').localeCompare(b.displayName || ''));
  }, [data, technicians]);
  
  const findHeader = (headers: string[], aliases: string[]): string | undefined => {
    const lowerAliases = aliases.map(a => a.toLowerCase().trim());
    for (const header of headers) {
        if (header && lowerAliases.some(alias => header.toLowerCase().trim().includes(alias))) {
            return header;
        }
    }
    return undefined;
  };
  
  const handleDeleteAll = async () => {
    setIsDeleting(true);
    toast({ title: 'Menghapus data...', description: 'Mohon tunggu.' });
    try {
        const recordsCollection = collection(firestore, 'provisioning-records');
        const querySnapshot = await getDocs(recordsCollection);
        if (querySnapshot.empty) {
            toast({ title: 'Tidak ada data untuk dihapus.' });
            setIsDeleting(false);
            return;
        }

        const batchSize = 400;
        let batch = writeBatch(firestore);
        let count = 0;

        for (const docSnapshot of querySnapshot.docs) {
            batch.delete(docSnapshot.ref);
            count++;
            if (count % batchSize === 0) {
                await batch.commit();
                batch = writeBatch(firestore);
            }
        }
        
        if (count % batchSize !== 0) {
            await batch.commit();
        }

        toast({ title: 'Sukses', description: `Semua ${querySnapshot.size} data provisioning telah dihapus.` });

    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Gagal Menghapus', description: error.message });
    } finally {
        setIsDeleting(false);
    }
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportProgress(0);
    toast({ title: "Memulai impor...", description: "Membaca file Excel dan data yang ada." });

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const XLSX = await import('xlsx');
        const existingRecordsSnap = await getDocs(collection(firestore, 'provisioning-records'));
        const existingScOrders = new Set(existingRecordsSnap.docs.map(doc => doc.id));
        
        const arrayBuffer = e.target?.result;
        const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        const dataAsArray: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        
        let headerRowIndex = -1;
        let headers: string[] = [];

        for (let i = 0; i < dataAsArray.length; i++) {
            const row = dataAsArray[i] || [];
            const lowercasedRow = row.map(cell => String(cell || '').toLowerCase().trim());
            
            if (lowercasedRow.includes('workorder') && lowercasedRow.some(h => h.includes('customer'))) {
                headerRowIndex = i;
                headers = row.map(cell => String(cell || '').trim());
                break;
            }
        }

        if (headerRowIndex === -1) {
            throw new Error("Header tidak ditemukan. Pastikan file Excel memiliki baris header yang benar (Contoh: 'Workorder', 'Customer Name').");
        }

        const dataRows = dataAsArray.slice(headerRowIndex + 1);
        const jsonData = dataRows.map(row => {
            const obj: Record<string, any> = {};
            headers.forEach((header, index) => {
                obj[header] = row[index];
            });
            return obj;
        });

        if (jsonData.length === 0) {
          throw new Error("File Excel kosong atau format tidak didukung.");
        }
        
        const scOrderHeader = findHeader(headers, ['sc order', 'id/csrm no']);
        if (!scOrderHeader) throw new Error("Kolom 'SC Order' atau 'ID/CSRM No' tidak ditemukan.");

        const headerMapping = {
            workorder: findHeader(headers, ['workorder']),
            workorderBaru: findHeader(headers, ['wo baru', 'workorder baru', 'new workorder']),
            scOrder: scOrderHeader,
            serviceNo: findHeader(headers, ['service no']),
            crmOrder: findHeader(headers, ['crm', 'order type']),
            status: findHeader(headers, ['status']),
            customerName: findHeader(headers, ['customer name']),
            contactNumber: findHeader(headers, ['contact number']),
            address: findHeader(headers, ['address']),
            description: findHeader(headers, ['description']),
            dateCreated: findHeader(headers, ['date created']),
            bookingDate: findHeader(headers, ['booking date']),
            productName: findHeader(headers, ['product name', 'paket', 'nama paket']),
            productType: findHeader(headers, ['product type']),
            workzone: findHeader(headers, ['workzone']),
            odpName: findHeader(headers, ['odp', 'odp name', 'nama odp']),
        };
        
        const recordsCollection = collection(firestore, 'provisioning-records');
        const batchSize = 400;
        let batch = writeBatch(firestore);
        let writeCount = 0;
        let skippedCount = 0;
        let newRecordsCount = 0;
        const scOrdersInThisBatch = new Set<string>();
        
        const formatDateValue = (dateValue: any) => {
            if (!dateValue) return '-';
            const date = new Date(dateValue);
            return date instanceof Date && !isNaN(date.valueOf()) ? format(date, 'dd-MM-yyyy HH:mm') : String(dateValue);
        };

        for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            
            const scOrderValue = String(row[headerMapping.scOrder] || '').trim();
            let finalScOrder = '';
            
            if (!scOrderValue) continue;

            const aoMoMatch = scOrderValue.match(/(?:AOk|AOi|AOs|MOk|MOi|PDAk)[a-z0-9]+/i);

            if (aoMoMatch?.[0]) {
                finalScOrder = aoMoMatch[0];
            } else if (scOrderValue.startsWith('SC') && scOrderValue.includes('_')) {
                 finalScOrder = scOrderValue.split('_')[0];
            } else {
                 finalScOrder = scOrderValue;
            }
            
            if (!finalScOrder) {
                continue;
            }

            if (existingScOrders.has(finalScOrder) || scOrdersInThisBatch.has(finalScOrder)) {
                skippedCount++;
                continue;
            }
            
            let workzoneValue = row[headerMapping.workzone!] || 'N/A';
            const upperWz = String(workzoneValue).toUpperCase();
            if (upperWz === 'KDS' || upperWz === 'N/A') {
                workzoneValue = 'KUD';
            }

            const newRecord: Omit<ProvisioningRecord, 'id'> = {
              workorder: row[headerMapping.workorder!] || '-',
              workorderBaru: headerMapping.workorderBaru ? (row[headerMapping.workorderBaru] || '') : '',
              scOrder: finalScOrder,
              serviceNo: row[headerMapping.serviceNo!]?.toString() || '-',
              crmOrder: row[headerMapping.crmOrder!] || '-',
              status: row[headerMapping.status!] || '-',
              customerName: row[headerMapping.customerName!] || '-',
              contactNumber: row[headerMapping.contactNumber!]?.toString() || '-',
              address: row[headerMapping.address!] || '-',
              description: headerMapping.description ? (row[headerMapping.description] || '-') : '-',
              dateCreated: serverTimestamp(),
              bookingDate: formatDateValue(row[headerMapping.bookingDate!]),
              productName: headerMapping.productName ? (row[headerMapping.productName] || '-') : '-',
              productType: row[headerMapping.productType!] || '-',
              workzone: workzoneValue,
              odpName: headerMapping.odpName ? (row[headerMapping.odpName] || '') : '',
              provisioningStatus: 'unassigned',
            };
            
            const docRef = doc(recordsCollection, finalScOrder); // Use SC Order as ID
            batch.set(docRef, { ...newRecord, id: finalScOrder });
            scOrdersInThisBatch.add(finalScOrder);
            writeCount++;
            newRecordsCount++;

            if (writeCount === batchSize) {
                await batch.commit();
                batch = writeBatch(firestore);
                writeCount = 0;
                scOrdersInThisBatch.clear();
            }
            
            setImportProgress(((i + 1) / jsonData.length) * 100);
        }
        
        if (writeCount > 0) {
            await batch.commit();
        }

        toast({ title: "Impor Selesai!", description: `${newRecordsCount} baris data baru telah diunggah. ${skippedCount} baris dilewati karena sudah ada.` });
        
    } catch (error: any) {
        console.error("Import error:", error);
        toast({ variant: 'destructive', title: "Impor Gagal", description: error.message });
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };
  
  const handleManualSave = async (orderData: Partial<ProvisioningRecord>) => {
    const scOrder = orderData.scOrder;
    if (!scOrder) throw new Error("SC Order tidak boleh kosong.");

    const docRef = doc(firestore, 'provisioning-records', scOrder);
    const existingDocSnap = await getDoc(docRef);

    if (existingDocSnap.exists()) {
        throw new Error(`Order dengan SC Order ${scOrder} sudah ada.`);
    }

    const dataToSave: Partial<ProvisioningRecord> = {
        ...orderData,
        id: scOrder,
        dateCreated: serverTimestamp(),
    };
    
    await setDoc(docRef, dataToSave);
    toast({ title: "Order Manual Disimpan", description: `Order untuk ${orderData.customerName} berhasil dibuat.` });
    setIsManualFormOpen(false);
  };

  const handleAssign = async (technicianId: string, crewId: string) => {
    if (!orderToAssign || !technicianId) return;
    setIsAssigning(true);

    const technician = technicians?.find(t => t.id === technicianId);
    if (!technician) {
        setIsAssigning(false);
        return;
    };
    
    const crewMember = crewId ? technicians?.find(t => t.id === crewId) : null;

    const docRef = doc(firestore, 'provisioning-records', orderToAssign.id);
    try {
        const updateData: Partial<ProvisioningRecord> = {
            assignedTo_userId: technician.id,
            assignedTo_userName: technician.displayName,
            assignedAt: Timestamp.now(),
            provisioningStatus: 'assigned',
            kendalaNotes: '',
            kendalaPhotos: [],
            kendalaCategory: null,
            kendalaAt: null,
            assignedTo_crew_userId: crewMember ? crewMember.id : '',
            assignedTo_crew_userName: crewMember ? crewMember.displayName : '',
        };
        await updateDoc(docRef, updateData);
        let description = `Order ditugaskan kepada ${technician.displayName}.`;
        if (crewMember) {
            description += ` bersama ${crewMember.displayName}.`
        }

        toast({ title: 'Sukses', description });
        setOrderToAssign(null);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Gagal Menugaskan', description: error.message });
    } finally {
        setIsAssigning(false);
    }
  }
  
  const handleCancelOrder = async () => {
    if (!orderToCancel) return;
    setIsAssigning(true); // Re-use assigning state for loading
    const docRef = doc(firestore, 'provisioning-records', orderToCancel.id);
    try {
        await updateDoc(docRef, { provisioningStatus: 'cancelled', cancelledAt: serverTimestamp() });
        toast({ title: 'Order Dibatalkan', description: `Order untuk ${orderToCancel.customerName} telah dibatalkan.`});
        setOrderToCancel(null);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Gagal Membatalkan', description: error.message });
    } finally {
        setIsAssigning(false);
    }
  };

  const handleUpdate = async (data: Partial<ProvisioningRecord>) => {
    if (!orderToEdit) return;
    setIsSaving(true);
    const docRef = doc(firestore, 'provisioning-records', orderToEdit.id);
    try {
        await updateDoc(docRef, data);
        toast({ title: "Order Diperbarui" });
        setOrderToEdit(null); // close dialog on success
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Gagal Memperbarui', description: (e as Error).message });
    } finally {
        setIsSaving(false);
    }
  };
  
    const { unassignedOrders, inProgressOrders, completedOrders, kendalaOrders, cancelledOrders, allFilteredOrders } = useMemo(() => {
        if (!data) return { unassignedOrders: [], inProgressOrders: [], completedOrders: [], kendalaOrders: [], cancelledOrders: [], allFilteredOrders: [] };

        const baseFiltered = data.filter(o => {
            if (selectedWorkzone !== 'all') {
                const orderWz = (o.workzone || 'N/A').toUpperCase();
                const upperSelectedWorkzone = selectedWorkzone.toUpperCase();
                if (!(orderWz === upperSelectedWorkzone || (upperSelectedWorkzone === 'KUD' && (orderWz === 'KDS' || orderWz === 'N/A')))) {
                    return false;
                }
            }
            if (searchQuery) {
                const lowerQuery = searchQuery.toLowerCase();
                if (!Object.values(o).some(val => String(val).toLowerCase().includes(lowerQuery))) {
                    return false;
                }
            }
            if (selectedTechnician !== 'all') {
                if (o.assignedTo_userId !== selectedTechnician && o.assignedTo_crew_userId !== selectedTechnician) {
                    return false;
                }
            }
            return true;
        });

        // 1. Unassigned orders are always shown, regardless of date filter.
        const unassigned = baseFiltered.filter(o => !o.provisioningStatus || o.provisioningStatus === 'unassigned');
        
        const getFilteredByDate = (orders: ProvisioningRecord[], dateField: keyof ProvisioningRecord) => {
            if (filterMode === 'all') return orders;

            return orders.filter(o => {
                const relevantDate = safeToDate((o as any)[dateField]);
                if (!relevantDate) return false;
                
                if (filterMode === 'month') {
                    if (!selectedMonth) return false;
                    const [year, month] = selectedMonth.split('-').map(Number);
                    const startDate = startOfMonth(new Date(year, month - 1));
                    const endDate = endOfMonth(startDate);
                    return relevantDate >= startDate && relevantDate <= endDate;
                }
                
                if (filterMode === 'range') {
                    if (!dateRange?.from) return false;
                    const startDate = startOfDay(dateRange.from);
                    const endDate = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
                    return relevantDate >= startDate && relevantDate <= endDate;
                }
                return false;
            });
        };

        const inProgressAll = baseFiltered.filter(o => ['assigned', 'picked_up', 'departed', 'arrived', 'wip_odp_done'].includes(o.provisioningStatus || ''));
        const completedAll = baseFiltered.filter(o => o.provisioningStatus === 'completed');
        const kendalaAll = baseFiltered.filter(o => o.provisioningStatus === 'kendala');
        const cancelledAll = baseFiltered.filter(o => o.provisioningStatus === 'cancelled');

        const inProgress = getFilteredByDate(inProgressAll, 'assignedAt');
        const completed = getFilteredByDate(completedAll, 'completedAt');
        const kendala = getFilteredByDate(kendalaAll, 'kendalaAt');
        const cancelled = getFilteredByDate(cancelledAll, 'cancelledAt');

        const allFiltered = [...unassigned, ...inProgress, ...completed, ...kendala, ...cancelled];

        return {
            unassignedOrders: unassigned,
            inProgressOrders: inProgress,
            completedOrders: completed,
            kendalaOrders: kendala,
            cancelledOrders: cancelled,
            allFilteredOrders: allFiltered,
        };
    }, [data, filterMode, selectedMonth, dateRange, selectedWorkzone, searchQuery, selectedTechnician]);

  const getShortName = (fullName?: string): string => {
    if (!fullName) return '';
    const parts = fullName.trim().split(' ').filter(p => p);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0].toUpperCase();
  
    for (let i = parts.length - 1; i >= 0; i--) {
        if (parts[i].length > 1) {
            return parts[i].toUpperCase();
        }
    }
    
    return parts[parts.length - 1].toUpperCase();
  };

  const getStatusInfo = (status: ProvisioningRecord['provisioningStatus']) => {
      switch (status) {
          case 'unassigned': return { emoji: '⌛', text: 'Antri' };
          case 'assigned': return { emoji: '➡️', text: 'Ditugaskan' };
          case 'picked_up': return { emoji: '✅', text: 'Pickup' };
          case 'departed': return { emoji: '🚚', text: 'Berangkat' };
          case 'arrived': return { emoji: '📍', text: 'Tiba' };
          case 'wip_odp_done': return { emoji: '🛠️', text: 'Progres' };
          case 'kendala': return { emoji: '⚠️', text: 'Kendala' };
          case 'completed': return { emoji: '🏁', text: 'Selesai' };
          default: return { emoji: '⌛', text: 'Antri' };
      }
  };

  const pivotData = useMemo(() => {
    const pivot: Record<string, { count: Record<string, number>, orders: {id: string, scOrder: string, status: string, workzone: string}[], statusCounts: Record<string, number>, fullOrders: any[] }> = {};
    const dataToProcess = allFilteredOrders.filter(item => {
        if (selectedTechnician !== 'all' && (item.assignedTo_userId !== selectedTechnician && item.assignedTo_crew_userId !== selectedTechnician)) {
            return false;
        }
        return true;
    });

    dataToProcess.forEach(item => {
        const { scOrder, provisioningStatus, workzone, assignedTo_userName, assignedTo_crew_userName } = item;
        const wzRaw = (workzone || 'N/A').toUpperCase();
        const wz = (wzRaw === 'KDS' || wzRaw === 'N/A') ? 'KUD' : wzRaw;
        
        const mainTechName = getShortName(assignedTo_userName);
        const crewTechName = getShortName(assignedTo_crew_userName);
        
        let teamMembers: string[] = [];
        if(mainTechName) teamMembers.push(mainTechName);
        if(crewTechName) teamMembers.push(crewTechName);

        const techGroupKey = teamMembers.length > 0 ? teamMembers.sort().join('-') : 'Unassigned';
        
        if (!pivot[techGroupKey]) {
            pivot[techGroupKey] = {
              count: { 'Grand Total': 0 }, 
              orders: [],
              statusCounts: {},
              fullOrders: [],
            };
        }
        
        pivot[techGroupKey].count[wz] = (pivot[techGroupKey].count[wz] || 0) + 1;
        pivot[techGroupKey].count['Grand Total']++;
        
        const status = provisioningStatus || 'unassigned';
        pivot[techGroupKey].statusCounts[status] = (pivot[techGroupKey].statusCounts[status] || 0) + 1;

        pivot[techGroupKey].orders.push({
            id: item.id,
            scOrder: scOrder || 'N/A-' + item.id,
            status: status,
            workzone: wz,
        });
        pivot[techGroupKey].fullOrders.push(item);
    });

    return pivot;
  }, [allFilteredOrders, selectedTechnician]);
  
  const plottingCardData = useMemo(() => {
    if (!data) return [];
    
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const relevantOrders = data.filter(o => {
        if (o.provisioningStatus === 'completed') {
            const completedDate = safeToDate(o.completedAt);
            return completedDate && completedDate >= todayStart && completedDate <= todayEnd;
        }
        return o.provisioningStatus &&
            ['unassigned', 'assigned', 'picked_up', 'departed', 'arrived', 'wip_odp_done', 'kendala'].includes(o.provisioningStatus);
    });
  
    const teams: Record<string, { teamName: string; orders: { scOrder: string; productName: string; statusEmoji: string; statusText: string; }[] }> = {};
  
    relevantOrders.forEach(order => {
      let teamName: string;
      if (order.assignedTo_userName) {
          const mainTechName = getShortName(order.assignedTo_userName);
          teamName = mainTechName;
          if (order.assignedTo_crew_userName) {
              const crewName = getShortName(order.assignedTo_crew_userName);
              teamName += `-${crewName}`;
          }
      } else {
          teamName = "ANTRIAN"; // Group for unassigned orders
      }
  
      if (!teams[teamName]) {
        teams[teamName] = { teamName, orders: [] };
      }
      
      const { emoji, text } = getStatusInfo(order.provisioningStatus);

      teams[teamName].orders.push({
        scOrder: order.scOrder || 'NO_SC',
        productName: order.productName || 'No Product Info',
        statusEmoji: emoji,
        statusText: text
      });
    });
  
    const sortedTeamNames = Object.keys(teams).sort((a, b) => {
        if (a === 'ANTRIAN') return 1;
        if (b === 'ANTRIAN') return -1;
        return a.localeCompare(b);
    });

    return sortedTeamNames.map(name => teams[name]);
  }, [data]);
  
  const dateHeader = useMemo(() => {
    if (filterMode === 'all') return 'Semua Waktu';
    if (filterMode === 'month' && selectedMonth) {
        const [year, month] = selectedMonth.split('-');
        const date = new Date(Number(year), Number(month) - 1);
        return format(date, 'MMMM yyyy', { locale: idLocale });
    }
    if (filterMode === 'range' && dateRange?.from) {
        if (dateRange.to) {
            return `${format(dateRange.from, "dd LLL, yy")} - ${format(dateRange.to, "dd LLL, yy")}`;
        }
        return format(dateRange.from, "dd LLL, yy");
    }
    return 'Memuat...';
  }, [filterMode, selectedMonth, dateRange]);

  const handleSendRekap = async () => {
      setIsSendingRekap(true);
      try {
          if (!allFilteredOrders || allFilteredOrders.length === 0) {
            throw new Error("Tidak ada data rekap untuk filter yang dipilih.");
          }
          
          const payload = {
              allOrders: allFilteredOrders,
              sektor: selectedWorkzone === 'all' ? 'KDS' : selectedWorkzone,
              dateHeader: dateHeader,
          };

          const result = await triggerProvisioningRekapAction(payload);

          if (result.success) {
              toast({ title: "Sukses", description: result.message });
          } else {
              throw new Error(result.message);
          }
      } catch (error: any) {
          toast({
              variant: "destructive",
              title: "Gagal Mengirim Rekap",
              description: error.message || "Terjadi kesalahan saat mengirim laporan.",
          });
      } finally {
          setIsSendingRekap(false);
      }
  };

  const handleSendPlotting = async () => {
      setIsSendingPlotting(true);
      try {
        if (!data) {
            throw new Error("Data order belum termuat.");
        }
        const todayStart = startOfDay(new Date());
        const todayEnd = endOfDay(new Date());
  
        const activeOrders = data.filter(o => {
          if (o.provisioningStatus === 'completed') {
            const completedDate = safeToDate(o.completedAt);
            return completedDate && completedDate >= todayStart && completedDate <= todayEnd;
          }
          return o.provisioningStatus &&
            ['unassigned', 'assigned', 'picked_up', 'departed', 'arrived', 'wip_odp_done', 'kendala'].includes(o.provisioningStatus);
        });
          
          const payload = {
              allOrders: activeOrders,
              dateHeader: format(new Date(), 'dd/MM/yyyy HH:mm', { locale: idLocale }),
          };

          const result = await triggerPlottingRekapAction(payload);

          if (result.success) {
              toast({ title: "Sukses", description: result.message });
          } else {
              throw new Error(result.message);
          }
      } catch (error: any) {
          toast({
              variant: "destructive",
              title: "Gagal Mengirim Plotting",
              description: error.message || "Terjadi kesalahan saat mengirim laporan.",
          });
      } finally {
          setIsSendingPlotting(false);
      }
  };


  const paginatedUnassigned = useMemo(() => {
    const startIndex = (unassignedPage - 1) * ITEMS_PER_PAGE;
    return unassignedOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [unassignedOrders, unassignedPage]);
  const totalUnassignedPages = Math.ceil(unassignedOrders.length / ITEMS_PER_PAGE);
  
  const paginatedInProgress = useMemo(() => {
    const startIndex = (inProgressPage - 1) * ITEMS_PER_PAGE;
    return inProgressOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [inProgressOrders, inProgressPage]);
  const totalInProgressPages = Math.ceil(inProgressOrders.length / ITEMS_PER_PAGE);
  
  const paginatedCompleted = useMemo(() => {
    const startIndex = (completedPage - 1) * ITEMS_PER_PAGE;
    return completedOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [completedOrders, completedPage]);
  const totalCompletedPages = Math.ceil(completedOrders.length / ITEMS_PER_PAGE);
  
  const paginatedCancelled = useMemo(() => {
      const startIndex = (cancelledPage - 1) * ITEMS_PER_PAGE;
      return cancelledOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [cancelledOrders, cancelledPage]);
  const totalCancelledPages = Math.ceil(cancelledOrders.length / ITEMS_PER_PAGE);
  
  const [activeTab, setActiveTab] = useState('unassigned');
  
  useEffect(() => {
    if (unassignedOrders.length > 0) setActiveTab('unassigned');
    else if (inProgressOrders.length > 0) setActiveTab('in-progress');
    else if (completedOrders.length > 0) setActiveTab('completed');
    else if (cancelledOrders.length > 0) setActiveTab('cancelled');
    else setActiveTab('unassigned');
  }, [unassignedOrders.length, inProgressOrders.length, completedOrders.length, cancelledOrders.length]);
  
  const isDataLoading = areRecordsLoading || areTechniciansLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Provisioning</h1>
        <div className="flex gap-2">
            <Button onClick={handleSendPlotting} disabled={isSendingPlotting}>
                {isSendingPlotting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
                Kirim Plotting Harian
            </Button>
            <Button onClick={handleSendRekap} disabled={isSendingRekap}>
                {isSendingRekap ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Kirim Rekap Sesuai Filter
            </Button>
        </div>
      </div>
      
      <KendalaDetailsCard 
          kendalaOrders={kendalaOrders || []} 
          isLoading={isDataLoading}
          onAssign={setOrderToAssign}
          onCancel={setOrderToCancel}
      />
      
      <Card>
        <CardHeader>
          <CardTitle>Impor & Kelola Data</CardTitle>
          <CardDescription>Unggah file Excel berisi data provisioning atau tambahkan order secara manual.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="excel-file">Unggah File Excel Baru</Label>
            <Input id="excel-file" type="file" accept=".xlsx, .xls" onChange={handleFileImport} disabled={isImporting || isDeleting} />
             {isImporting && (
                <div className="mt-2">
                    <Progress value={importProgress} />
                    <p className="text-sm text-muted-foreground mt-1">Mengunggah {Math.round(importProgress)}%...</p>
                </div>
            )}
          </div>
          <div className="md:ml-auto md:self-end flex gap-2">
            <Dialog open={isManualFormOpen} onOpenChange={setIsManualFormOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline"><PlusCircle className="mr-2 h-4 w-4" /> Tambah Order Manual</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Buat Order Provisioning Manual</DialogTitle>
                        <DialogDescription>Isi detail order baru di bawah ini.</DialogDescription>
                    </DialogHeader>
                    <ManualOrderForm users={technicians || []} onSave={handleManualSave} onCancel={() => setIsManualFormOpen(false)} currentUserProfile={userProfile} />
                </DialogContent>
            </Dialog>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={isImporting || isDeleting || !data || data.length === 0}>
                        {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Hapus Semua Data
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Anda Yakin?</AlertDialogTitle>
                        <AlertDialogDescription>Tindakan ini akan menghapus semua data provisioning secara permanen. Pastikan Anda memiliki cadangan.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteAll} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                            {isDeleting ? 'Menghapus...' : 'Ya, Hapus Semua'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
      
      <Card>
          <CardHeader>
              <CardTitle>Filter & Cari Laporan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="workzone-filter">Filter Workzone</Label>
                        <Select value={selectedWorkzone} onValueChange={setSelectedWorkzone} disabled={!data || data.length === 0}>
                          <SelectTrigger id="workzone-filter"><SelectValue placeholder="Pilih Workzone" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Semua Workzone</SelectItem>
                            {workzones.map(wz => <SelectItem key={wz} value={wz}>{wz}</SelectItem>)}
                          </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="technician-filter">Filter Teknisi</Label>
                      <Select value={selectedTechnician} onValueChange={setSelectedTechnician} disabled={assignedTechnicians.length === 0}>
                        <SelectTrigger id="technician-filter">
                          <SelectValue placeholder="Filter Teknisi..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Semua Teknisi</SelectItem>
                          {assignedTechnicians.map(tech => (
                            <SelectItem key={tech.id} value={tech.id}>{tech.displayName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="search-input">Cari (di semua kolom)</Label>
                        <Input id="search-input" placeholder="Ketik kata kunci..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} disabled={!data || data.length === 0} />
                    </div>
                </div>
                <div className="pt-4 border-t">
                  <Label>Filter Berdasarkan Tanggal</Label>
                  <Tabs value={filterMode} onValueChange={(value) => {
                      setFilterMode(value as any);
                  }} className="w-full mt-2">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="month">Per Bulan</TabsTrigger>
                      <TabsTrigger value="range">Rentang Tanggal</TabsTrigger>
                      <TabsTrigger value="all">Semua</TabsTrigger>
                    </TabsList>
                    <TabsContent value="month" className="pt-2">
                      <Select onValueChange={setSelectedMonth} value={selectedMonth}>
                        <SelectTrigger className="w-[280px]"><SelectValue placeholder="Pilih bulan..." /></SelectTrigger>
                        <SelectContent>
                          {monthYearOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TabsContent>
                    <TabsContent value="range" className="pt-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant={"outline"} className={cn("w-[280px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange?.from ? ( dateRange.to ? (<>{format(dateRange.from, "dd LLL, yy")} - {format(dateRange.to, "dd LLL, yy")}</>) : (format(dateRange.from, "dd LLL, yy"))) : (<span>Pilih rentang</span>)}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2}/>
                        </PopoverContent>
                      </Popover>
                    </TabsContent>
                  </Tabs>
                </div>
            </div>
          </CardContent>
      </Card>
      
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
            <CardHeader>
                <CardTitle>Tabel Rekapitulasi</CardTitle>
                <CardDescription>Ringkasan order dikelompokkan berdasarkan teknisi, status, dan SC order.</CardDescription>
            </CardHeader>
            <CardContent>
                <PivotTable data={pivotData} workzones={workzones} />
            </CardContent>
        </Card>
        <BotPlottingCard plottingData={plottingCardData} />
      </div>


      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="unassigned">
            <Package className="mr-2" />
            Antrian ({unassignedOrders.length})
          </TabsTrigger>
          <TabsTrigger value="in-progress">
            <Truck className="mr-2" />
            Dikerjakan ({inProgressOrders.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            <PackageCheck className="mr-2" />
            Selesai ({completedOrders.length})
          </TabsTrigger>
           <TabsTrigger value="cancelled" className="text-destructive">
            <X className="mr-2" />
            Batal ({cancelledOrders.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="unassigned">
          <Card>
            <CardContent className="pt-6">
                <Table>
                    <TableHeader><TableRow>
                        <TableHead>WO Lama</TableHead>
                        <TableHead>WO Baru</TableHead>
                        <TableHead>SC Order</TableHead>
                        <TableHead>Customer Name</TableHead><TableHead>Contact</TableHead>
                        <TableHead>Address</TableHead><TableHead className="text-right">Aksi</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                        {areRecordsLoading ? <TableRow><TableCell colSpan={7}><Skeleton className="h-10 w-full" /></TableCell></TableRow> : paginatedUnassigned.length > 0 ? (
                            paginatedUnassigned.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell>{item.workorder}</TableCell>
                                    <TableCell>{item.workorderBaru || '-'}</TableCell>
                                    <TableCell>{item.scOrder}</TableCell>
                                    <TableCell>{item.customerName}</TableCell>
                                    <TableCell>
                                        <a href={formatWaNumber(item.contactNumber)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                            <Phone className="h-3 w-3" /> {item.contactNumber}
                                        </a>
                                    </TableCell>
                                    <TableCell className="max-w-xs truncate">{item.address}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent><DropdownMenuLabel>Aksi</DropdownMenuLabel>
                                                <DropdownMenuItem onSelect={() => setOrderToEdit(item)}><Edit className="mr-2 h-4 w-4" />Edit Data</DropdownMenuItem>
                                                <DropdownMenuItem onSelect={() => setOrderToAssign(item)} disabled={areTechniciansLoading}><User className="mr-2 h-4 w-4" />Tugaskan Teknisi</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : <TableRow><TableCell colSpan={7} className="h-24 text-center">Tidak ada order baru.</TableCell></TableRow>}
                    </TableBody>
                </Table>
            </CardContent>
            {totalUnassignedPages > 1 && <CardFooter>
                <div className="text-xs text-muted-foreground">Halaman <strong>{unassignedPage}</strong> dari <strong>{totalUnassignedPages}</strong></div>
                <div className="flex items-center gap-2 ml-auto">
                    <Button variant="outline" size="sm" onClick={() => setUnassignedPage(p => Math.max(p - 1, 1))} disabled={unassignedPage === 1}><ChevronLeft className="h-4 w-4" /> Sebelumnya</Button>
                    <Button variant="outline" size="sm" onClick={() => setUnassignedPage(p => Math.min(p + 1, totalUnassignedPages))} disabled={unassignedPage === totalUnassignedPages}>Berikutnya <ChevronRight className="h-4 w-4" /></Button>
                </div>
            </CardFooter>}
          </Card>
        </TabsContent>

        <TabsContent value="in-progress">
          <Card><CardContent className="pt-6">
            <Table><TableHeader><TableRow>
                <TableHead>WO Lama</TableHead>
                <TableHead>WO Baru</TableHead>
                <TableHead>SC Order</TableHead>
                <TableHead>Customer</TableHead><TableHead>Teknisi</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
                <TableBody>
                    {areRecordsLoading ? <TableRow><TableCell colSpan={7}><Skeleton className="h-10 w-full" /></TableCell></TableRow> : paginatedInProgress.length > 0 ? (
                        paginatedInProgress.map(item => (
                            <TableRow key={item.id}>
                                <TableCell>{item.workorder}</TableCell>
                                <TableCell>{item.workorderBaru || '-'}</TableCell>
                                <TableCell>{item.scOrder}</TableCell>
                                <TableCell>{item.customerName}</TableCell>
                                <TableCell>{item.assignedTo_userName}</TableCell>
                                <TableCell><Badge variant="secondary">{item.provisioningStatus}</Badge></TableCell>
                                <TableCell className="text-right"><Button asChild variant="outline" size="sm"><Link href={`/dashboard/provi-orders/${item.id}`}>Lihat Detail</Link></Button></TableCell>
                            </TableRow>
                        ))
                    ) : <TableRow><TableCell colSpan={7} className="h-24 text-center">Tidak ada order yang sedang dikerjakan.</TableCell></TableRow>}
                </TableBody>
            </Table>
          </CardContent>
            {totalInProgressPages > 1 && <CardFooter>
                <div className="text-xs text-muted-foreground">Halaman <strong>{inProgressPage}</strong> dari <strong>{totalInProgressPages}</strong></div>
                <div className="flex items-center gap-2 ml-auto">
                    <Button variant="outline" size="sm" onClick={() => setInProgressPage(p => Math.max(p - 1, 1))} disabled={inProgressPage === 1}><ChevronLeft className="h-4 w-4" /> Sebelumnya</Button>
                    <Button variant="outline" size="sm" onClick={() => setInProgressPage(p => Math.min(p + 1, totalInProgressPages))} disabled={inProgressPage === totalInProgressPages}>Berikutnya <ChevronRight className="h-4 w-4" /></Button>
                </div>
            </CardFooter>}
          </Card>
        </TabsContent>

        <TabsContent value="completed">
           <Card><CardContent className="pt-6">
                <Table><TableHeader><TableRow>
                    <TableHead>WO Lama</TableHead>
                    <TableHead>WO Baru</TableHead>
                    <TableHead>SC Order</TableHead>
                    <TableHead>Customer</TableHead><TableHead>Teknisi</TableHead><TableHead>Tanggal PS</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
                    <TableBody>
                         {areRecordsLoading ? <TableRow><TableCell colSpan={7}><Skeleton className="h-10 w-full" /></TableCell></TableRow> : paginatedCompleted.length > 0 ? (
                            paginatedCompleted.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell>{item.workorder}</TableCell>
                                    <TableCell>{item.workorderBaru || '-'}</TableCell>
                                    <TableCell>{item.scOrder}</TableCell>
                                    <TableCell>{item.customerName}</TableCell>
                                    <TableCell>{item.assignedTo_userName}</TableCell>
                                    <TableCell>{item.completedAt?.toDate ? format(item.completedAt.toDate(), 'dd MMM yyyy') : '-'}</TableCell>
                                    <TableCell className="text-right"><Button asChild variant="outline" size="sm"><Link href={`/dashboard/provi-orders/${item.id}`}>Lihat Detail</Link></Button></TableCell>
                                </TableRow>
                            ))
                        ) : <TableRow><TableCell colSpan={7} className="h-24 text-center">Tidak ada order yang selesai.</TableCell></TableRow>}
                    </TableBody>
                </Table>
            </CardContent>
             {totalCompletedPages > 1 && <CardFooter>
                <div className="text-xs text-muted-foreground">Halaman <strong>{completedPage}</strong> dari <strong>{totalCompletedPages}</strong></div>
                <div className="flex items-center gap-2 ml-auto">
                    <Button variant="outline" size="sm" onClick={() => setCompletedPage(p => Math.max(p - 1, 1))} disabled={completedPage === 1}><ChevronLeft className="h-4 w-4" /> Sebelumnya</Button>
                    <Button variant="outline" size="sm" onClick={() => setCompletedPage(p => Math.min(p + 1, totalCompletedPages))} disabled={completedPage === totalCompletedPages}>Berikutnya <ChevronRight className="h-4 w-4" /></Button>
                </div>
            </CardFooter>}
            </Card>
        </TabsContent>

        <TabsContent value="cancelled">
           <Card><CardContent className="pt-6">
                <Table><TableHeader><TableRow>
                    <TableHead>WO Lama</TableHead>
                    <TableHead>WO Baru</TableHead>
                    <TableHead>SC Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Alasan</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                    {areRecordsLoading ? <TableRow><TableCell colSpan={6}><Skeleton className="h-10 w-full" /></TableCell></TableRow> : paginatedCancelled.length > 0 ? (
                        paginatedCancelled.map(item => (
                            <TableRow key={item.id} className="bg-muted/30">
                                <TableCell>{item.workorder}</TableCell>
                                <TableCell>{item.workorderBaru || '-'}</TableCell>
                                <TableCell>{item.scOrder}</TableCell>
                                <TableCell>{item.customerName}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{item.kendalaNotes || 'Dibatalkan tanpa alasan.'}</TableCell>
                                <TableCell className="text-right">
                                    {(userProfile?.role === 'admin') && (
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Hapus Order Ini?</AlertDialogTitle>
                                                    <AlertDialogDescription>Tindakan ini akan menghapus order yang dibatalkan secara permanen. Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Batal</AlertDialogCancel>
                                                    <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={async () => {
                                                        await deleteDoc(doc(firestore, 'provisioning-records', item.id));
                                                        toast({ title: "Order Dihapus", description: "Order yang dibatalkan telah dihapus permanen." });
                                                    }}>Hapus Permanen</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))
                    ) : <TableRow><TableCell colSpan={6} className="h-24 text-center">Tidak ada order yang dibatalkan.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
            {totalCancelledPages > 1 && (
              <CardFooter>
                <div className="text-xs text-muted-foreground">Halaman <strong>{cancelledPage}</strong> dari <strong>{totalCancelledPages}</strong></div>
                <div className="flex items-center gap-2 ml-auto">
                    <Button variant="outline" size="sm" onClick={() => setCancelledPage(p => Math.max(p - 1, 1))} disabled={cancelledPage === 1}><ChevronLeft className="h-4 w-4" /> Sebelumnya</Button>
                    <Button variant="outline" size="sm" onClick={() => setCancelledPage(p => Math.min(p + 1, totalCancelledPages))} disabled={cancelledPage === totalCancelledPages}>Berikutnya <ChevronRight className="h-4 w-4" /></Button>
                </div>
              </CardFooter>
            )}
            </Card>
        </TabsContent>
      </Tabs>
      
      {orderToAssign && technicians && (
        <AssignTechnicianDialog 
          order={orderToAssign}
          users={technicians}
          isOpen={!!orderToAssign}
          onOpenChange={(open) => !open && setOrderToAssign(null)}
          onAssign={handleAssign}
          isAssigning={isAssigning}
        />
      )}

      {orderToEdit && (
        <Dialog open={!!orderToEdit} onOpenChange={(open) => !open && setOrderToEdit(null)}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>Edit Data Order</DialogTitle>
                    <DialogDescription>Perbarui data untuk WO: {orderToEdit.workorder}</DialogDescription>
                </DialogHeader>
                <EditOrderForm 
                    order={orderToEdit}
                    onSave={handleUpdate}
                    onCancel={() => setOrderToEdit(null)}
                    isSaving={isSaving}
                />
            </DialogContent>
        </Dialog>
      )}

      {orderToCancel && (
        <AlertDialog open={!!orderToCancel} onOpenChange={(open) => !open && setOrderToCancel(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Batalkan Order Ini?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Order untuk <strong>{orderToCancel.customerName}</strong> akan ditandai sebagai "dibatalkan" dan tidak akan muncul di antrian lagi.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Tidak</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCancelOrder} className="bg-destructive hover:bg-destructive/90">Ya, Batalkan Order</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
