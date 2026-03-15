
'use client';

import * as React from 'react';
import { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Upload, FileSpreadsheet, ChevronLeft, ChevronRight, Trash2, ChevronRight as ChevronRightIcon, User, AlertTriangle, Phone, MoreHorizontal, Edit, Save } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, doc, writeBatch, orderBy, getDocs, setDoc, updateDoc, serverTimestamp, where } from 'firebase/firestore';
import type { ProvisioningRecord, UserProfile } from '@/lib/types';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';

const ITEMS_PER_PAGE = 5;

const jenisOrderOptions = [
  "PSB DATIN", "PSB OLO", "PSB WIFI", "PDA DATIN", "PDA WIFI",
  "REPLACEMENT", "Instalasi IP Camera", "Instalasi SD-WAN",
  "Instalasi Router", "Install AP WIFI (1 AP)", "Install AP WIFI (2 AP)",
  "Install AP WIFI(3 AP)", "Install AP WIFI (4 AP)",
  "Pembuatan BAI (Satkomindo,BRI MPLS)", "Provisioning MyRep", "PSB Surge",
  "Provisioning 5 Menara Bintang", "PSB IBU - FTTR",
  "PT Anagata Cipta Teknologi (KerjainAja)", "PSB TBG", "Provisioning Hypernet",
  "2ND STB", "UPSELLING", "DISMANTLING EBIS",
].sort();

const typeOrderOptions: Record<string, string[]> = {
    'DISMANTLING EBIS': ['ONT', 'STB', 'AP', 'IP CAMERA'],
    'REPLACEMENT': ['ONT', 'STB'],
};


// --- Helper Functions ---
const formatWaNumber = (phone: string) => {
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
        cleanPhone = '62' + cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith('62')) {
        cleanPhone = '62' + cleanPhone;
    }
    return `https://wa.me/${cleanPhone}`;
};

// --- Child Components ---

function EditOrderForm({ order, onSave, onCancel, isSaving }: { order: ProvisioningRecord, onSave: (data: Partial<ProvisioningRecord>) => void, onCancel: () => void, isSaving: boolean }) {
    const [serviceNo, setServiceNo] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [contactNumber, setContactNumber] = useState('');
    const [address, setAddress] = useState('');
    const [productName, setProductName] = useState('');
    const [crmOrder, setCrmOrder] = useState('');
    const [description, setDescription] = useState('');

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
                            <SelectContent><ScrollArea className="h-72">{jenisOrderOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</ScrollArea></SelectContent>
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

function AssignTechnicianDialog({ order, users, isOpen, onOpenChange, onAssign, isAssigning }: { order: ProvisioningRecord; users: UserProfile[]; isOpen: boolean; onOpenChange: (open: boolean) => void; onAssign: (techId: string) => void; isAssigning: boolean; }) {
  const [selectedTechnician, setSelectedTechnician] = useState('');
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tugaskan Teknisi</DialogTitle>
          <DialogDescription>
            Pilih teknisi untuk menangani order WO: {order.workorder}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih seorang teknisi..." />
            </SelectTrigger>
            <SelectContent>
              {users.map(u => <SelectItem key={u.id} value={u.id}>{u.displayName}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="ghost" disabled={isAssigning}>Batal</Button></DialogClose>
          <Button onClick={() => onAssign(selectedTechnician)} disabled={!selectedTechnician || isAssigning}>
            {isAssigning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isAssigning ? 'Menugaskan...' : 'Tugaskan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function KendalaCard() {
    const firestore = useFirestore();
    const kendalaQuery = useMemoFirebase(() => {
        return query(collection(firestore, 'provisioning-records'), where('provisioningStatus', '==', 'kendala'));
    }, [firestore]);

    const { data: kendalaOrders, isLoading } = useCollection<ProvisioningRecord>(kendalaQuery);

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
                    <ul className="space-y-2">
                        {kendalaOrders.map(order => (
                            <li key={order.id} className="text-sm p-2 bg-destructive/10 rounded-md">
                                <Link href={`/dashboard/provi-orders/${order.id}`} className="font-medium hover:underline">{order.customerName}</Link> ({order.workorder}) - Teknisi: {order.assignedTo_userName}
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-sm text-muted-foreground">Tidak ada order yang berkendala saat ini.</p>}
            </CardContent>
        </Card>
    );
}

function PivotTable({ data, workzones }: { data: any, workzones: string[] }) {
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

    const toggleRow = (key: string) => {
        setExpandedRows(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const renderPivotRows = (node: any, level = 0, prefix = '') => {
        const rows: React.ReactNode[] = [];
        const sortedKeys = Object.keys(node).sort();

        sortedKeys.forEach(key => {
            const currentKey = `${prefix}${key}`;
            const isExpanded = expandedRows[currentKey];
            const hasChildren = Object.keys(node[key].children).length > 0;
            
            rows.push(
                <TableRow key={currentKey} className={cn(level > 0 && "bg-muted/50")}>
                    <TableCell style={{ paddingLeft: `${level * 1.5 + 1}rem` }} className="font-medium">
                        <div className="flex items-center gap-2">
                            {hasChildren && (
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleRow(currentKey)}>
                                    <ChevronRightIcon className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-90")} />
                                </Button>
                            )}
                            <span className={cn(!hasChildren && "ml-8")}>{key}</span>
                        </div>
                    </TableCell>
                    {workzones.map(wz => {
                        const count = node[key].count[wz] || 0;
                        const filters = {
                            workzone: wz,
                            productName: level === 0 ? key : prefix.split('>')[0],
                            status: level === 1 ? key : undefined,
                            crmOrder: level === 2 ? key : undefined,
                            description: level === 3 ? key : undefined
                        };
                        
                        const filteredFilters = Object.entries(filters).filter(([, value]) => value !== undefined);
                        const queryString = new URLSearchParams(filteredFilters as any).toString();

                        return (
                            <TableCell key={wz} className="text-right">
                                {count > 0 ? (
                                    <Link href={`/dashboard/admin/provisioning/list?${queryString}`} className="hover:underline text-blue-600 font-medium">
                                        {count}
                                    </Link>
                                ) : 0}
                            </TableCell>
                        )
                    })}
                    <TableCell className="text-right font-bold">
                        {node[key].count['Grand Total'] || 0}
                    </TableCell>
                </TableRow>
            );

            if (isExpanded && hasChildren) {
                rows.push(...renderPivotRows(node[key].children, level + 1, `${currentKey}>`));
            }
        });

        return rows;
    };
    
    const totalCount = Object.values(data).reduce((acc: number, item: any) => acc + (item.count['Grand Total'] || 0), 0);
    const workzoneTotals = workzones.map(wz => Object.values(data).reduce((acc: number, item: any) => acc + (item.count[wz] || 0), 0));


    return (
        <div className="overflow-x-auto border rounded-lg">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[400px]">Kategori</TableHead>
                        {workzones.map(wz => <TableHead key={wz} className="text-right">{wz}</TableHead>)}
                        <TableHead className="text-right font-bold">Grand Total</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                   {Object.keys(data).length > 0 ? renderPivotRows(data) : (
                       <TableRow><TableCell colSpan={workzones.length + 2} className="h-24 text-center">Silakan impor file Excel untuk melihat rekap.</TableCell></TableRow>
                   )}
                </TableBody>
                 <TableRow className="font-bold bg-muted">
                    <TableCell>Grand Total</TableCell>
                    {workzoneTotals.map((total, index) => (
                        <TableCell key={index} className="text-right">{total}</TableCell>
                    ))}
                    <TableCell className="text-right">{totalCount}</TableCell>
                </TableRow>
            </Table>
        </div>
    )
}


// --- Main Component ---
export default function ProvisioningDashboardPage() {
  const { toast } = useToast();
  const firestore = useFirestore();

  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [orderToAssign, setOrderToAssign] = useState<ProvisioningRecord | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  
  const [orderToEdit, setOrderToEdit] = useState<ProvisioningRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Data fetching
  const recordsQuery = useMemoFirebase(() => query(collection(firestore, 'provisioning-records'), orderBy('dateCreated', 'desc')), [firestore]);
  const { data, isLoading: areRecordsLoading } = useCollection<ProvisioningRecord>(recordsQuery);
  
  const usersQuery = useMemoFirebase(() => query(collection(firestore, 'users'), where('role', '==', 'teknisi'), where('registrationStatus', '==', 'approved')), [firestore]);
  const { data: technicians, isLoading: areTechniciansLoading } = useCollection<UserProfile>(usersQuery);

  const [workzones, setWorkzones] = useState<string[]>([]);
  const [selectedWorkzone, setSelectedWorkzone] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    if (data) {
      const uniqueWorkzones = [...new Set(data.map((item) => item.workzone).filter(Boolean))].sort();
      setWorkzones(uniqueWorkzones);
    }
  }, [data]);
  
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
            productName: findHeader(headers, ['product name']),
            productType: findHeader(headers, ['product type']),
            workzone: findHeader(headers, ['workzone']),
        };

        if (Object.values(headerMapping).some(val => val === undefined)) {
            console.warn("Header mapping incomplete:", headerMapping);
        }
        
        const recordsCollection = collection(firestore, 'provisioning-records');
        const batchSize = 400;
        let batch = writeBatch(firestore);
        let writeCount = 0;
        let skippedCount = 0;
        let newRecordsCount = 0;
        
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

            if (existingScOrders.has(finalScOrder)) {
                skippedCount++;
                continue;
            }

            const formatDateValue = (dateValue: any) => {
              if (!dateValue) return '-';
              const date = new Date(dateValue);
              return isValid(date) ? format(date, 'dd-MM-yyyy HH:mm') : String(dateValue);
            };
            
            const newRecord: Omit<ProvisioningRecord, 'id'> = {
              workorder: row[headerMapping.workorder!] || '-',
              scOrder: finalScOrder,
              serviceNo: row[headerMapping.serviceNo!]?.toString() || '-',
              crmOrder: row[headerMapping.crmOrder!] || '-',
              status: row[headerMapping.status!] || '-',
              customerName: row[headerMapping.customerName!] || '-',
              contactNumber: row[headerMapping.contactNumber!]?.toString() || '-',
              address: row[headerMapping.address!] || '-',
              description: headerMapping.description ? (row[headerMapping.description] || '-') : '-',
              dateCreated: formatDateValue(row[headerMapping.dateCreated!]),
              bookingDate: formatDateValue(row[headerMapping.bookingDate!]),
              productName: row[headerMapping.productName!] || '-',
              productType: row[headerMapping.productType!] || '-',
              workzone: row[headerMapping.workzone!] || 'N/A',
              provisioningStatus: 'unassigned',
            };
            
            const docRef = doc(recordsCollection, finalScOrder); // Use SC Order as ID
            batch.set(docRef, newRecord);
            writeCount++;
            newRecordsCount++;

            if (writeCount === batchSize) {
                await batch.commit();
                batch = writeBatch(firestore);
                writeCount = 0;
            }
            
            setImportProgress(((i + 1) / jsonData.length) * 100);
        }
        
        if (writeCount > 0) {
            await batch.commit();
        }

        toast({ title: "Impor Selesai!", description: `${newRecordsCount} baris data baru telah diunggah. ${skippedCount} baris dilewati karena sudah ada.` });
        setSelectedWorkzone('all');
        setCurrentPage(1);

      } catch (error: any) {
        console.error("Import error:", error);
        toast({ variant: 'destructive', title: "Impor Gagal", description: error.message });
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleAssign = async (technicianId: string) => {
    if (!orderToAssign || !technicianId) return;
    setIsAssigning(true);

    const technician = technicians?.find(t => t.id === technicianId);
    if (!technician) {
        setIsAssigning(false);
        return;
    };

    const docRef = doc(firestore, 'provisioning-records', orderToAssign.id);
    try {
        await updateDoc(docRef, {
            assignedTo_userId: technician.id,
            assignedTo_userName: technician.displayName,
            assignedAt: serverTimestamp(),
            provisioningStatus: 'assigned',
        });
        toast({ title: 'Sukses', description: `Order ditugaskan kepada ${technician.displayName}.` });
        setOrderToAssign(null);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Gagal Menugaskan', description: error.message });
    } finally {
        setIsAssigning(false);
    }
  }

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
  
  const filteredData = useMemo(() => {
    let filtered = selectedWorkzone === 'all'
      ? (data ?? [])
      : (data ?? []).filter(item => item.workzone === selectedWorkzone);

    if (searchQuery) {
        const lowerCaseQuery = searchQuery.toLowerCase();
        filtered = filtered.filter(item => 
            Object.values(item).some(val => 
                String(val).toLowerCase().includes(lowerCaseQuery)
            )
        );
    }
    return filtered;
  }, [data, selectedWorkzone, searchQuery]);

  const pivotData = useMemo(() => {
    const pivot: any = {};

    (data || []).forEach(item => {
        const { productName, status, crmOrder, description, workzone } = item;
        if (!workzone) return;
        
        const keys = [
            productName || 'N/A',
            status || 'N/A',
            crmOrder || 'N/A',
            description || 'N/A'
        ];

        let currentNode = pivot;
        keys.forEach((key, index) => {
            if (!currentNode[key]) {
                currentNode[key] = { count: {}, children: {} };
            }
            // Increment count for the current node
            currentNode[key].count[workzone] = (currentNode[key].count[workzone] || 0) + 1;
            currentNode[key].count['Grand Total'] = (currentNode[key].count['Grand Total'] || 0) + 1;

            if (index < keys.length) {
                currentNode = currentNode[key].children;
            }
        });
    });
    return pivot;
  }, [data]);
  

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);
  
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard Provisioning</h1>
      
      <KendalaCard />
      
      <Card>
        <CardHeader>
          <CardTitle>Impor & Kelola Data</CardTitle>
          <CardDescription>Unggah file Excel berisi data provisioning untuk ditampilkan atau hapus semua data yang ada.</CardDescription>
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
          <div className="md:ml-auto md:self-end">
            <Button variant="destructive" onClick={handleDeleteAll} disabled={isImporting || isDeleting || !data || data.length === 0}>
                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Hapus Semua Data
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Card>
          <CardHeader>
              <CardTitle>Pivot Table Rekap</CardTitle>
              <CardDescription>Ringkasan data provisioning yang dikelompokkan.</CardDescription>
          </CardHeader>
          <CardContent>
              <PivotTable data={pivotData} workzones={workzones} />
          </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle>Data Provisioning</CardTitle>
          <CardDescription>Menampilkan {filteredData.length} dari {data?.length || 0} total baris.</CardDescription>
          <div className="flex flex-col md:flex-row gap-4 pt-4">
            <div className="grid gap-2">
                <Label htmlFor="workzone-filter">Filter Workzone</Label>
                <Select value={selectedWorkzone} onValueChange={setSelectedWorkzone} disabled={!data || data.length === 0}>
                  <SelectTrigger id="workzone-filter" className="w-full md:w-[180px]"><SelectValue placeholder="Pilih Workzone" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Workzone</SelectItem>
                    {workzones.map(wz => <SelectItem key={wz} value={wz}>{wz}</SelectItem>)}
                  </SelectContent>
                </Select>
            </div>
             <div className="grid gap-2 flex-1">
                <Label htmlFor="search-input">Cari</Label>
                <Input id="search-input" placeholder="Cari di semua kolom..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} disabled={!data || data.length === 0} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workorder</TableHead>
                  <TableHead>SC Order</TableHead>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {areRecordsLoading ? (
                    <TableRow><TableCell colSpan={7} className="h-24 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                ) : paginatedData.length > 0 ? (
                  paginatedData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.workorder}</TableCell>
                      <TableCell>{item.scOrder}</TableCell>
                      <TableCell>{item.customerName}</TableCell>
                      <TableCell>
                        <a href={formatWaNumber(item.contactNumber)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                          <Phone className="h-3 w-3"/> {item.contactNumber}
                        </a>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{item.address}</TableCell>
                      <TableCell>
                        <Badge variant={item.provisioningStatus === 'assigned' ? 'default' : item.provisioningStatus === 'kendala' ? 'destructive' : 'secondary'}>
                          {item.provisioningStatus === 'assigned' ? `Ditugaskan ke ${item.assignedTo_userName}` : item.provisioningStatus === 'kendala' ? 'Kendala' : 'Belum Ditugaskan'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                                <DropdownMenuItem onSelect={() => setOrderToEdit(item)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    <span>Edit Data</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => setOrderToAssign(item)} disabled={areTechniciansLoading}>
                                    <User className="mr-2 h-4 w-4" />
                                    <span>Tugaskan Teknisi</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      {data && data.length > 0 ? "Tidak ada data yang cocok dengan filter Anda." : "Silakan impor file Excel untuk menampilkan data."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        {totalPages > 1 && (
            <CardFooter>
                <div className="text-xs text-muted-foreground">Halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong></div>
                <div className="flex items-center gap-2 ml-auto">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /> Sebelumnya</Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>Berikutnya <ChevronRight className="h-4 w-4" /></Button>
                </div>
            </CardFooter>
        )}
      </Card>
      
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
    </div>
  );
}
