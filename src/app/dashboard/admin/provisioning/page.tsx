
'use client';

import { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Upload, FileSpreadsheet, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, doc, writeBatch, orderBy, getDocs } from 'firebase/firestore';
import type { ProvisioningRecord } from '@/lib/types';
import { Progress } from '@/components/ui/progress';

const ITEMS_PER_PAGE = 10;

export default function ProvisioningDashboardPage() {
  const { toast } = useToast();
  const firestore = useFirestore();

  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  // Data fetching from Firestore
  const recordsQuery = useMemoFirebase(() => query(collection(firestore, 'provisioning-records'), orderBy('dateCreated', 'desc')), [firestore]);
  const { data, isLoading: areRecordsLoading } = useCollection<ProvisioningRecord>(recordsQuery);

  const [workzones, setWorkzones] = useState<string[]>([]);
  const [selectedWorkzone, setSelectedWorkzone] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  // Update workzones when data changes
  useEffect(() => {
    if (data) {
      const uniqueWorkzones = [...new Set(data.map((item) => item.workzone))].sort();
      setWorkzones(uniqueWorkzones);
    }
  }, [data]);

  const findHeader = (headers: string[], aliases: string[]): string | undefined => {
    const lowerAliases = aliases.map(a => a.toLowerCase().trim());
    for (const header of headers) {
        if (lowerAliases.includes(header.toLowerCase().trim())) {
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

        for (const doc of querySnapshot.docs) {
            batch.delete(doc.ref);
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
    toast({ title: "Memulai impor...", description: "Membaca file Excel Anda." });

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result;
        const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const jsonData: any[] = XLSX.utils.sheet_to_json(ws);
        
        if (jsonData.length === 0) {
          throw new Error("File Excel kosong atau format tidak didukung.");
        }

        const headers = Object.keys(jsonData[0]);

        const headerMapping = {
          workorder: findHeader(headers, ['workorder']),
          scOrder: findHeader(headers, ['sc order no/track', 'id/csrm no']),
          serviceNo: findHeader(headers, ['service no.']),
          crmOrder: findHeader(headers, ['crm, order type']),
          status: findHeader(headers, ['status']),
          customerName: findHeader(headers, ['customer name']),
          contactNumber: findHeader(headers, ['contact number']),
          address: findHeader(headers, ['address']),
          dateCreated: findHeader(headers, ['date created']),
          bookingDate: findHeader(headers, ['booking date']),
          productName: findHeader(headers, ['product name']),
          productType: findHeader(headers, ['product type']),
          workzone: findHeader(headers, ['workzone']),
        };
        
        const recordsCollection = collection(firestore, 'provisioning-records');
        const batchSize = 400; // Firestore limit is 500 writes per batch
        let batch = writeBatch(firestore);
        let writeCount = 0;
        
        for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            
            const scOrderValue = row[headerMapping.scOrder!]?.toString() || '';
            let finalScOrder = scOrderValue;

            if (scOrderValue) {
                const aoMatch = scOrderValue.match(/(AOk[a-zA-Z0-9]+)/);
                const moMatch = scOrderValue.match(/(MOk[a-zA-Z0-9]+)/);

                if (aoMatch && aoMatch[0]) {
                    finalScOrder = aoMatch[0];
                } else if (moMatch && moMatch[0]) {
                    finalScOrder = moMatch[0];
                } else if (scOrderValue.startsWith('SC')) {
                    finalScOrder = scOrderValue.split('_')[0];
                }
            } else {
                finalScOrder = '-';
            }

            const formatDateValue = (dateValue: any) => {
              if (!dateValue) return '-';
              const date = new Date(dateValue);
              return isValid(date) ? format(date, 'dd-MM-yyyy HH:mm') : String(dateValue);
            };
            
            const newRecord: Omit<ProvisioningRecord, 'id'> = {
              workorder: row[headerMapping.workorder!] || '-',
              scOrder: finalScOrder,
              serviceNo: row[headerMapping.serviceNo!] || '-',
              crmOrder: row[headerMapping.crmOrder!] || '-',
              status: row[headerMapping.status!] || '-',
              customerName: row[headerMapping.customerName!] || '-',
              contactNumber: row[headerMapping.contactNumber!] || '-',
              address: row[headerMapping.address!] || '-',
              dateCreated: formatDateValue(row[headerMapping.dateCreated!]),
              bookingDate: formatDateValue(row[headerMapping.bookingDate!]),
              productName: row[headerMapping.productName!] || '-',
              productType: row[headerMapping.productType!] || '-',
              workzone: row[headerMapping.workzone!] || 'N/A',
            };
            
            const docRef = doc(recordsCollection);
            batch.set(docRef, newRecord);
            writeCount++;

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

        toast({ title: "Impor Berhasil!", description: `${jsonData.length} baris data telah diunggah ke database.` });
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

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);
  
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard Provisioning</h1>
      
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
                  <TableHead>Service No.</TableHead>
                  <TableHead>CRM Order Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>Contact Number</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Date Created</TableHead>
                  <TableHead>Booking Date</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Product Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {areRecordsLoading ? (
                    <TableRow><TableCell colSpan={12} className="h-24 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                ) : paginatedData.length > 0 ? (
                  paginatedData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.workorder}</TableCell>
                      <TableCell>{item.scOrder}</TableCell>
                      <TableCell>{item.serviceNo}</TableCell>
                      <TableCell>{item.crmOrder}</TableCell>
                      <TableCell>{item.status}</TableCell>
                      <TableCell>{item.customerName}</TableCell>
                      <TableCell>{item.contactNumber}</TableCell>
                      <TableCell className="max-w-xs truncate">{item.address}</TableCell>
                      <TableCell>{item.dateCreated}</TableCell>
                      <TableCell>{item.bookingDate}</TableCell>
                      <TableCell>{item.productName}</TableCell>
                      <TableCell>{item.productType}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={12} className="h-24 text-center">
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
    </div>
  );
}
