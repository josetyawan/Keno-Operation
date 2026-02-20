
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Upload, Search, Loader2, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { useUser, useFirestore, useCollection, useMemoFirebase, deleteDocumentNonBlocking, useDoc, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { collection, query, doc, serverTimestamp, writeBatch, where, getDocs, limit, type QueryConstraint } from 'firebase/firestore';
import type { UserProfile, NetworkAsset, MancoreLink, MapLink } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import Link from 'next/link';


const assetTypes = ['OLT', 'ODC', 'ODP', 'FTM', 'Mini OLT', 'MITRATEL', 'NODE-B'];
const baseServiceAreas = ['SA KUDUS', 'SA PATI', 'SA JEPARA', 'SA PURWODADI', 'SA BLORA', 'SA REMBANG'];


export default function AdminAssetsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importAssetType, setImportAssetType] = useState('');
  const [progress, setProgress] = useState(0);

  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const [searchName, setSearchName] = useState('');
  const [searchServiceArea, setSearchServiceArea] = useState('all');
  
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const canSearch = searchServiceArea !== 'all';
  const hasSearched = canSearch && searchName.trim() !== '';
  
  const { data: currentUserProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(
    useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore])
  );
  
    // Fetch links to create dynamic service area list
  const mancoreLinksQuery = useMemoFirebase(() => collection(firestore, 'mancore-links'), [firestore]);
  const { data: mancoreLinks, isLoading: areMancoreLinksLoading } = useCollection<MancoreLink>(mancoreLinksQuery);

  const mapLinksQuery = useMemoFirebase(() => collection(firestore, 'map-links'), [firestore]);
  const { data: mapLinks, isLoading: areMapLinksLoading } = useCollection<MapLink>(mapLinksQuery);
  
  const dynamicServiceAreas = useMemo(() => {
    const allSAs = new Set<string>(baseServiceAreas);
    if (mancoreLinks) mancoreLinks.forEach(link => allSAs.add(link.serviceArea));
    if (mapLinks) mapLinks.forEach(link => allSAs.add(link.serviceArea));
    return Array.from(allSAs).filter(sa => !sa.toLowerCase().includes('mitratel')).sort();
  }, [mancoreLinks, mapLinks]);

  useEffect(() => {
    if (!isUserLoading && !isProfileLoading && (!user || currentUserProfile?.role !== 'admin')) {
        router.push('/dashboard');
    }
  }, [user, currentUserProfile, isUserLoading, isProfileLoading, router]);

  // Fetch assets from server with server-side filtering
  const assetsQuery = useMemoFirebase(() => {
    if (isUserLoading || isProfileLoading || !user || currentUserProfile?.role !== 'admin' || !hasSearched) {
      return null;
    }
    
    const constraints: QueryConstraint[] = [];
    
    constraints.push(where('serviceArea', '==', searchServiceArea));

    const upperSearch = searchName.toUpperCase().trim();
    const assetPrefixes = ['ODP', 'ODC', 'OLT', 'FTM', 'MITRATEL', 'NODE-B'];
    let inferredType: string | null = null;
    
    for (const prefix of assetPrefixes) {
        if (upperSearch.startsWith(prefix)) {
            inferredType = prefix;
            break;
        }
    }

    if (inferredType) {
        constraints.push(where('assetType', '==', inferredType));
    }
    
    return query(collection(firestore, 'network-assets'), ...constraints);

  }, [firestore, currentUserProfile, isUserLoading, isProfileLoading, hasSearched, searchServiceArea, searchName]);


  const { data: queriedAssets, isLoading: areAssetsLoading } = useCollection<NetworkAsset>(assetsQuery);

  // Perform client-side filtering for name only, on the smaller dataset from server
  const filteredAssets = useMemo(() => {
    if (!queriedAssets) return [];
    
    const lowercasedSearchName = searchName.toLowerCase().trim();
    if (lowercasedSearchName) {
        return queriedAssets.filter(asset => asset.name.toLowerCase().includes(lowercasedSearchName));
    }
    
    return queriedAssets;
  }, [queriedAssets, searchName]);


  const totalPages = Math.ceil(filteredAssets.length / ITEMS_PER_PAGE);

  const paginatedAssets = useMemo(() => {
      const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE;
      return filteredAssets.slice(startIndex, endIndex);
  }, [filteredAssets, currentPage]);

  const isNodeBSearch = useMemo(() => paginatedAssets?.[0]?.assetType === 'NODE-B', [paginatedAssets]);
  const isMitratelSearch = useMemo(() => paginatedAssets?.[0]?.assetType === 'MITRATEL', [paginatedAssets]);


  // Reset to page 1 when filters change
  useEffect(() => {
      setCurrentPage(1);
  }, [searchName, searchServiceArea]);


  const handleDeleteAsset = (assetId: string, assetName: string) => {
    if (!firestore) return;
    const assetDocRef = doc(firestore, 'network-assets', assetId);
    deleteDocumentNonBlocking(assetDocRef);
    toast({
      title: 'Aset Dihapus',
      description: `Aset "${assetName}" telah dihapus.`,
    });
  };

  const confirmDeleteAll = async () => {
    if (!firestore) return;
    
    setIsDeletingAll(true);
    toast({
        title: 'Memulai Proses Penghapusan',
        description: `Mulai menghapus semua aset jaringan... Ini mungkin butuh waktu.`,
    });

    try {
        const assetsCollection = collection(firestore, 'network-assets');
        const batchSize = 400; // Firestore limit is 500
        let docsDeleted = 0;
        
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const q = query(assetsCollection, limit(batchSize));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.size === 0) {
                break; // No more documents to delete
            }

            const batch = writeBatch(firestore);
            querySnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            docsDeleted += querySnapshot.size;

            // Optional: brief pause to prevent overwhelming the browser's event loop or hitting rate limits
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        toast({
            title: 'Semua Aset Dihapus',
            description: `Semua ${docsDeleted} aset jaringan telah berhasil dihapus dari database.`,
        });
        setIsDeletingAll(false);
        setIsDeleteAllDialogOpen(false);

    } catch (error) {
        console.error("Failed to delete all assets: ", error);
        toast({ variant: "destructive", title: "Gagal Menghapus Aset", description: "Terjadi kesalahan saat proses penghapusan massal. Silakan coba lagi."});
        setIsDeletingAll(false);
    }
  };


  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!importAssetType) {
        toast({ variant: "destructive", title: "Pilih Jenis Aset", description: "Anda harus memilih jenis aset sebelum mengunggah file." });
        return;
    }
    if (!event.target.files || event.target.files.length === 0) {
        toast({ variant: "destructive", title: "Tidak ada file dipilih." });
        return;
    }
    if (!firestore) {
        toast({ variant: "destructive", title: "Database Error", description: "Koneksi database belum siap." });
        return;
    }

    setIsImporting(true);
    setProgress(0);
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = async (e) => {
        try {
            const mapStoToServiceArea = (sto: string): NetworkAsset['serviceArea'] => {
                const upperSto = sto.toUpperCase().trim();
                if (['PWB', 'WRO', 'TRO', 'GBU', 'GDO'].some(code => upperSto.includes(code))) return 'SA PURWODADI';
                if (['CEP', 'BLO', 'NGA', 'RDB'].some(code => upperSto.includes(code))) return 'SA BLORA';
                if (['KMJ', 'BAN', 'KEL', 'PEC'].some(code => upperSto.includes(code))) return 'SA JEPARA';
                if (['KUD', 'DMA'].some(code => upperSto.includes(code))) return 'SA KUDUS';
                if (['PAT', 'TAY', 'JWN'].some(code => upperSto.includes(code))) return 'SA PATI';
                if (['LSE', 'RBN'].some(code => upperSto.includes(code))) return 'SA REMBANG';
                return 'SA KUDUS';
            };

            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'binary' });

            let sheetName = workbook.SheetNames.find(
                name => name.toLowerCase().trim() === importAssetType.toLowerCase().trim()
            );
            
            if (!sheetName) {
                sheetName = workbook.SheetNames[0];
                 toast({
                    title: "Sheet Tidak Sesuai",
                    description: `Tidak ditemukan sheet untuk "${importAssetType}". Membaca sheet pertama: "${sheetName}".`,
                    duration: 7000
                });
            }

            if (!sheetName) {
                throw new Error("File Excel tidak memiliki sheet.");
            }
            const worksheet = workbook.Sheets[sheetName];
            const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

            if (jsonData.length === 0) {
                 throw new Error(`Sheet "${sheetName}" di file Excel kosong.`);
            }

            const findColumn = (keys: string[], aliases: string[]): string | undefined => {
                const lowerCaseAliases = aliases.map(a => a.toLowerCase().trim());
                for (const key of keys) {
                    if (lowerCaseAliases.includes(key.toLowerCase().trim())) {
                        return key;
                    }
                }
                return undefined;
            };

            const firstRowKeys = Object.keys(jsonData[0] || {});
            const totalRows = jsonData.length;
            const chunkSize = 200;
            let currentIndex = 0;
            
            const assetNameCol = findColumn(firstRowKeys, ['olt', 'odc', 'odp', 'ftm', 'gpon', 'nama', 'name', `nama ${importAssetType.toLowerCase()}`, 'device name', 'asset name', 'nama aset', 'nama perangkat', 'odp name', 'site_name', 'site name']);
            const stoCol = findColumn(firstRowKeys, ['sto', 'lokasi sto', 'telkom sto', 'telkom sto odc 2', 'lokasi', 'sto location', 'area sto', 'kode sto', 'sto/lokasi']);
            const coordinatesCol = findColumn(firstRowKeys, ['koordinat', 'coordinate', 'location', 'lokasi', 'gps']);
            const latCol = findColumn(firstRowKeys, ['lat', 'latitude']);
            const longCol = findColumn(firstRowKeys, ['long', 'longitude', 'longitud']);
            const kapasitasCol = findColumn(firstRowKeys, ['kapasitas', 'capacity', 'port', 'core', 'kap', 'is total']);
            const specCol = findColumn(firstRowKeys, ['spec', 'spesifikasi', 'spec odc', 'jenis odc', 'tipe', 'spec_odc']);
            const avaiCol = findColumn(firstRowKeys, ['avai', 'availability', 'port avai']);
            const usedCol = findColumn(firstRowKeys, ['used', 'port used']);
            const rsvCol = findColumn(firstRowKeys, ['rsv', 'port rsv']);
            const rskCol = findColumn(firstRowKeys, ['rsk', 'port rsk']);
            const mitratelSiteIdCol = findColumn(firstRowKeys, ['site_id_mitratel']);
            const tenantSiteIdCol = findColumn(firstRowKeys, ['site_id_tenant']);


            if (!assetNameCol) {
                throw new Error(`Kolom nama aset (misalnya 'ODP NAME', 'Site_Name', 'Nama') tidak ditemukan di sheet '${sheetName}'. Mohon periksa nama kolom di file Excel Anda.`);
            }
            
            if (importAssetType === 'Mini OLT') {
                const gponCol = findColumn(firstRowKeys, ['gpon', 'nama', 'name', 'device name', 'asset name']);

                if (!gponCol || !latCol || !longCol) {
                    throw new Error(`Kolom wajib (GPON, LAT, LONG) tidak ditemukan di sheet '${sheetName}'. Mohon periksa file Excel.`);
                }
                
                toast({ title: "Memuat data OLT...", description: "Mempersiapkan data OLT yang ada untuk diperbarui." });
                const oltQuery = query(collection(firestore, "network-assets"), where("assetType", "==", "OLT"));
                const oltSnapshot = await getDocs(oltQuery);
                const existingOltAssetsMap = new Map(oltSnapshot.docs.map(doc => [doc.data().name.trim(), doc.id]));
                
                let totalUpdated = 0;
                let notFoundCount = 0;

                const processMiniOltChunk = async () => {
                    try {
                        const end = Math.min(currentIndex + chunkSize, totalRows);
                        const batch = writeBatch(firestore);

                        for (let i = currentIndex; i < end; i++) {
                            const row = jsonData[i];
                            const gponName = row[gponCol]?.toString().trim();
                            if (!gponName) continue;

                            const existingAssetId = existingOltAssetsMap.get(gponName);

                            if (existingAssetId) {
                                const latValue = row[latCol]?.toString().replace(',', '.');
                                const longValue = row[longCol]?.toString().replace(',', '.');
                                
                                const assetDataToUpdate: Partial<NetworkAsset> = {
                                    subType: 'Mini OLT',
                                    coordinates: `${latValue}, ${longValue}`,
                                };

                                const assetDocRef = doc(firestore, 'network-assets', existingAssetId);
                                batch.update(assetDocRef, assetDataToUpdate);
                                totalUpdated++;
                            } else {
                                notFoundCount++;
                            }
                        }
                        
                        await batch.commit();

                        currentIndex = end;
                        const currentProgress = (currentIndex / totalRows) * 100;
                        setProgress(currentProgress);

                        if (currentIndex < totalRows) {
                            setTimeout(processMiniOltChunk, 3000); // Slower delay for Mini-OLT update
                        } else {
                            toast({
                                title: 'Impor Selesai',
                                description: `Berhasil memperbarui ${totalUpdated} Mini OLT dengan koordinat. ${notFoundCount > 0 ? `${notFoundCount} nama GPON tidak ditemukan.` : ''}`,
                                duration: 9000
                            });
                            setIsImporting(false);
                            setIsImportDialogOpen(false);
                            setImportAssetType('');
                            setProgress(0);
                            const fileInput = document.getElementById('excel-file') as HTMLInputElement;
                            if (fileInput) fileInput.value = '';
                        }
                    } catch (chunkError: any) {
                        console.error("Failed to process Mini OLT data chunk:", chunkError);
                        toast({
                            variant: "destructive",
                            title: 'Proses Impor Mini OLT Gagal',
                            description: `Error pada baris sekitar ${currentIndex}: ${chunkError.message}`,
                        });
                        setIsImporting(false);
                        setProgress(0);
                    }
                };
                
                processMiniOltChunk();
                return;
            }

            if (importAssetType === 'MITRATEL') {
                if (!assetNameCol || !latCol || !longCol || !tenantSiteIdCol) {
                    throw new Error(`Kolom wajib (Site_Name, Latitude, Longitude, Site_ID_Tenant) untuk impor Mitratel tidak ditemukan.`);
                }

                const mapMitratelToServiceArea = (siteName: string, tenantId: string): string => {
                    const upperName = siteName.toUpperCase();
                    const upperTenant = tenantId.toUpperCase();
                    const tenantCode = upperTenant.length >= 5 ? upperTenant.substring(2, 5) : '';
            
                    if (upperName.includes('KDS') || tenantCode === 'KDS') return 'SA KUDUS';
                    if (upperName.includes('PAT') || tenantCode === 'PAT') return 'SA PATI';
                    if (upperName.includes('JPA') || tenantCode === 'JPA') return 'SA JEPARA';
                    if (upperName.includes('GRO') || tenantCode === 'GRO') return 'SA PURWODADI';
                    if (upperName.includes('BLO') || tenantCode === 'BLO') return 'SA BLORA'; 
                    if (upperName.includes('RBN') || tenantCode === 'RBN') return 'SA REMBANG'; 
                    return 'SA KUDUS'; // Default fallback
                };
                
                let totalCreated = 0;
                let totalUpdated = 0;
                const assetsCollection = collection(firestore, 'network-assets');

                const processMitratelChunk = async () => {
                    try {
                        const end = Math.min(currentIndex + chunkSize, totalRows);
                        const chunkRows = jsonData.slice(currentIndex, end);
                        const tenantIdsInChunk = chunkRows.map(row => row[tenantSiteIdCol]?.toString().trim()).filter(Boolean);

                        if (tenantIdsInChunk.length === 0) {
                            currentIndex = end;
                            if (currentIndex < totalRows) setTimeout(processMitratelChunk, 50);
                            return;
                        }

                        const existingAssetsMap = new Map<string, { id: string }>();
                        const queryChunks: string[][] = [];
                        for (let i = 0; i < tenantIdsInChunk.length; i += 30) {
                            queryChunks.push(tenantIdsInChunk.slice(i, i + 30));
                        }

                        for (const idChunk of queryChunks) {
                            if (idChunk.length > 0) {
                                const q = query(assetsCollection, where('tenantSiteId', 'in', idChunk));
                                const querySnapshot = await getDocs(q);
                                querySnapshot.forEach(doc => {
                                    existingAssetsMap.set(doc.data().tenantSiteId.trim(), { id: doc.id });
                                });
                            }
                        }

                        const batch = writeBatch(firestore);

                        for (const row of chunkRows) {
                            const siteName = row[assetNameCol]?.toString().trim();
                            const tenantId = row[tenantSiteIdCol]?.toString().trim();
                            if (!siteName || !tenantId) continue;
                            
                            const latValue = row[latCol]?.toString().replace(',', '.');
                            const longValue = row[longCol]?.toString().replace(',', '.');

                            const assetData: Partial<NetworkAsset> = {
                                name: siteName,
                                assetType: 'MITRATEL',
                                serviceArea: mapMitratelToServiceArea(siteName, tenantId),
                                sto: 'MITRATEL',
                                subType: 'N/A',
                                coordinates: `${latValue}, ${longValue}`,
                                tenantSiteId: tenantId,
                                mitratelSiteId: row[mitratelSiteIdCol]?.toString().trim() || '-',
                            };
                            
                            const existingAsset = existingAssetsMap.get(tenantId);
                            if (existingAsset) {
                                const assetDocRef = doc(assetsCollection, existingAsset.id);
                                batch.update(assetDocRef, assetData);
                                totalUpdated++;
                            } else {
                                const newAssetDocRef = doc(assetsCollection);
                                const newAsset = { ...assetData, id: newAssetDocRef.id, dateAdded: serverTimestamp() };
                                batch.set(newAssetDocRef, newAsset);
                                totalCreated++;
                            }
                        }
                        
                        await batch.commit();
                        
                        currentIndex = end;
                        setProgress((currentIndex / totalRows) * 100);

                        if (currentIndex < totalRows) {
                            setTimeout(processMitratelChunk, 1500); 
                        } else {
                            toast({
                                title: 'Impor Selesai',
                                description: `Berhasil membuat ${totalCreated} aset Mitratel baru dan memperbarui ${totalUpdated} aset.`,
                                duration: 9000
                            });
                            setIsImporting(false);
                            setIsImportDialogOpen(false);
                            setImportAssetType('');
                            setProgress(0);
                            const fileInput = document.getElementById('excel-file') as HTMLInputElement;
                            if (fileInput) fileInput.value = '';
                        }
                    } catch (chunkError: any) {
                        console.error("Failed to process Mitratel data chunk:", chunkError);
                        toast({ variant: "destructive", title: 'Proses Impor Mitratel Gagal', description: `Error: ${chunkError.message}` });
                        setIsImporting(false);
                        setProgress(0);
                    }
                };

                processMitratelChunk();
                return;
            }

            if (importAssetType === 'NODE-B') {
                const siteIdCol = findColumn(firstRowKeys, ['site id', 'site_id']);
                const siteNameCol = findColumn(firstRowKeys, ['site name', 'site_name']);
                const oltMerkCol = findColumn(firstRowKeys, ['olt merk']);
                const splitterOltCol = findColumn(firstRowKeys, ['splitter olt']);
                const snOntCol = findColumn(firstRowKeys, ['sn ont']);
                const eqpPortCol = findColumn(firstRowKeys, ['eqp port']);
                const cascadeCol = findColumn(firstRowKeys, ['cascade']);
                const cascadeAtCol = findColumn(firstRowKeys, ['cascade at']);
                const catbtsCol = findColumn(firstRowKeys, ['catbts']);
                const rncBscCol = findColumn(firstRowKeys, ['rnc/bsc']);
                const routerRanCol = findColumn(firstRowKeys, ['router/ran']);
                const alamatCol = findColumn(firstRowKeys, ['alamat']);

                if (!siteIdCol || !siteNameCol) {
                    throw new Error("Kolom wajib (SITE ID, SITE NAME) untuk impor NODE-B tidak ditemukan.");
                }

                let totalCreated = 0;
                let totalUpdated = 0;
                const assetsCollection = collection(firestore, 'network-assets');

                const processNodeBChunk = async () => {
                    try {
                        const end = Math.min(currentIndex + chunkSize, totalRows);
                        const chunkRows = jsonData.slice(currentIndex, end);
                        const siteIdsInChunk = chunkRows.map(row => row[siteIdCol]?.toString().trim()).filter(Boolean);

                        if (siteIdsInChunk.length === 0) {
                            currentIndex = end;
                            if (currentIndex < totalRows) setTimeout(processNodeBChunk, 50);
                            return;
                        }

                        const existingAssetsMap = new Map<string, { id: string }>();
                        const queryChunks: string[][] = [];
                        for (let i = 0; i < siteIdsInChunk.length; i += 30) {
                            queryChunks.push(siteIdsInChunk.slice(i, i + 30));
                        }
                        for (const idChunk of queryChunks) {
                            if (idChunk.length > 0) {
                                const q = query(assetsCollection, where('siteId', 'in', idChunk), where('assetType', '==', 'NODE-B'));
                                const querySnapshot = await getDocs(q);
                                querySnapshot.forEach(doc => {
                                    existingAssetsMap.set(doc.data().siteId.trim(), { id: doc.id });
                                });
                            }
                        }

                        const batch = writeBatch(firestore);

                        for (const row of chunkRows) {
                            const siteId = row[siteIdCol]?.toString().trim();
                            if (!siteId) continue;
                            
                            const latValue = row[latCol!]?.toString().replace(',', '.');
                            const longValue = row[longCol!]?.toString().replace(',', '.');
                            const sto = row[stoCol!]?.toString().trim() || 'N/A';

                            const assetData: Partial<NetworkAsset> = {
                                name: row[siteNameCol!]?.toString().trim() || siteId,
                                assetType: 'NODE-B',
                                subType: 'N/A',
                                serviceArea: sto ? mapStoToServiceArea(sto) : 'SA KUDUS',
                                sto: sto,
                                coordinates: latValue && longValue ? `${latValue}, ${longValue}` : undefined,
                                siteId: siteId,
                                siteName: row[siteNameCol!]?.toString().trim(),
                                oltMerk: row[oltMerkCol!]?.toString(),
                                splitterOlt: row[splitterOltCol!]?.toString(),
                                snOnt: row[snOntCol!]?.toString(),
                                eqpPort: row[eqpPortCol!]?.toString(),
                                cascade: row[cascadeCol!]?.toString(),
                                cascadeAt: row[cascadeAtCol!]?.toString(),
                                catbts: row[catbtsCol!]?.toString(),
                                rncBsc: row[rncBscCol!]?.toString(),
                                routerRan: row[routerRanCol!]?.toString(),
                                alamat: row[alamatCol!]?.toString(),
                            };

                            const existingAsset = existingAssetsMap.get(siteId);
                            if (existingAsset) {
                                batch.update(doc(assetsCollection, existingAsset.id), assetData);
                                totalUpdated++;
                            } else {
                                const newAssetDocRef = doc(assetsCollection);
                                batch.set(newAssetDocRef, { ...assetData, id: newAssetDocRef.id, dateAdded: serverTimestamp() });
                                totalCreated++;
                            }
                        }
                        
                        await batch.commit();
                        
                        currentIndex = end;
                        setProgress((currentIndex / totalRows) * 100);

                        if (currentIndex < totalRows) {
                            setTimeout(processNodeBChunk, 1500); 
                        } else {
                            toast({
                                title: 'Impor Selesai',
                                description: `Berhasil membuat ${totalCreated} aset NODE-B baru dan memperbarui ${totalUpdated} aset.`,
                                duration: 9000
                            });
                            setIsImporting(false);
                            setIsImportDialogOpen(false);
                            setImportAssetType('');
                            setProgress(0);
                            const fileInput = document.getElementById('excel-file') as HTMLInputElement;
                            if (fileInput) fileInput.value = '';
                        }
                    } catch (chunkError: any) {
                        console.error("Failed to process NODE-B data chunk:", chunkError);
                        toast({ variant: "destructive", title: 'Proses Impor NODE-B Gagal', description: `Error: ${chunkError.message}` });
                        setIsImporting(false);
                        setProgress(0);
                    }
                };

                processNodeBChunk();
                return;
            }
            
            // --- Default import logic for other asset types ---
            const assetsCollection = collection(firestore, 'network-assets');
            let totalCreated = 0;
            let totalUpdated = 0;

            const processChunk = async () => {
                try {
                    const end = Math.min(currentIndex + chunkSize, totalRows);
                    const chunkRows = jsonData.slice(currentIndex, end);
                    const assetNamesInChunk = chunkRows.map(row => row[assetNameCol]?.toString().trim()).filter(Boolean);

                    if (assetNamesInChunk.length === 0) {
                        currentIndex = end;
                        if (currentIndex < totalRows) setTimeout(processChunk, 50);
                        return;
                    }

                    const existingAssetsMap = new Map<string, { id: string }>();
                    const queryChunks: string[][] = [];
                    for (let i = 0; i < assetNamesInChunk.length; i += 30) {
                        queryChunks.push(assetNamesInChunk.slice(i, i + 30));
                    }

                    for (const nameChunk of queryChunks) {
                        if (nameChunk.length > 0) {
                            const q = query(assetsCollection, where('name', 'in', nameChunk));
                            const querySnapshot = await getDocs(q);
                            querySnapshot.forEach(doc => {
                                existingAssetsMap.set(doc.data().name.trim(), { id: doc.id });
                            });
                        }
                    }

                    const batch = writeBatch(firestore);

                    for (const row of chunkRows) {
                        const assetName = row[assetNameCol]?.toString().trim();
                        if (!assetName) continue;

                        let stoValue = '';
                        const nameParts = assetName.split('-');
                        if (nameParts.length > 1) stoValue = nameParts[1];
                        if (!stoValue && stoCol && row[stoCol]) stoValue = row[stoCol].toString().trim();

                        const finalServiceArea = stoValue ? mapStoToServiceArea(stoValue) : 'SA KUDUS';

                        const assetData: Partial<NetworkAsset> = {
                            name: assetName,
                            assetType: importAssetType as NetworkAsset['assetType'],
                            serviceArea: finalServiceArea,
                            sto: stoValue || 'N/A',
                        };
                        
                        const latValue = latCol ? row[latCol] : null;
                        const longValue = longCol ? row[longCol] : null;
                        if (latValue && longValue) assetData.coordinates = `${latValue.toString().replace(',', '.')}, ${longValue.toString().replace(',', '.')}`;
                        else if (coordinatesCol && row[coordinatesCol]) assetData.coordinates = row[coordinatesCol].toString();
                        
                        if (importAssetType === 'OLT' || importAssetType === 'FTM') {
                            const keteranganCol = findColumn(firstRowKeys, ['keterangan', 'jenis', 'type', 'sub type', 'description', 'keterangan_sto', 'subtype']);
                            let subType: NetworkAsset['subType'] = 'N/A';
                            if (importAssetType === 'OLT') {
                                subType = 'OLT';
                                if (keteranganCol && row[keteranganCol]?.toString().toLowerCase().includes('mini')) subType = 'Mini OLT';
                            } else if (importAssetType === 'FTM') {
                                const keterangan = keteranganCol ? row[keteranganCol]?.toString().toLowerCase() : '';
                                if (keterangan.includes('ea')) subType = 'EA';
                                else if (keterangan.includes('oa')) subType = 'OA';
                            }
                            assetData.subType = subType;
                        } else if (importAssetType === 'ODP') {
                            if (kapasitasCol && row[kapasitasCol] != null) assetData.kapasitas = row[kapasitasCol].toString();
                            if (avaiCol && row[avaiCol] != null) assetData.portAvai = row[avaiCol].toString();
                            if (usedCol && row[usedCol] != null) assetData.portUsed = row[usedCol].toString();
                            if (rsvCol && row[rsvCol] != null) assetData.portRsv = row[rsvCol].toString();
                            if (rskCol && row[rskCol] != null) assetData.portRsk = row[rskCol].toString();
                            assetData.subType = 'N/A';
                        } else if (importAssetType === 'ODC') {
                            if (specCol && row[specCol] != null) assetData.spec = row[specCol].toString();
                            assetData.subType = 'N/A';
                        }

                        const existingAsset = existingAssetsMap.get(assetName);
                        if (existingAsset) {
                            batch.update(doc(assetsCollection, existingAsset.id), assetData);
                            totalUpdated++;
                        } else {
                            const newAssetDocRef = doc(assetsCollection);
                            const newAsset = { ...assetData, id: newAssetDocRef.id, dateAdded: serverTimestamp() };
                            batch.set(newAssetDocRef, newAsset);
                            totalCreated++;
                        }
                    }
                    
                    await batch.commit();
                    
                    currentIndex = end;
                    setProgress((currentIndex / totalRows) * 100);

                    if (currentIndex < totalRows) {
                        setTimeout(processChunk, 1500); 
                    } else {
                        toast({ title: 'Import Selesai', description: `Berhasil membuat ${totalCreated} aset baru dan memperbarui ${totalUpdated} aset.` });
                        setIsImporting(false);
                        setIsImportDialogOpen(false);
                        setImportAssetType('');
                        setProgress(0);
                        const fileInput = document.getElementById('excel-file') as HTMLInputElement;
                        if (fileInput) fileInput.value = '';
                    }
                } catch (chunkError: any) {
                    console.error("Failed to process data chunk:", chunkError);
                    toast({ variant: "destructive", title: 'Proses Impor Gagal', description: `Error: ${chunkError.message}` });
                    setIsImporting(false);
                    setProgress(0);
                }
            }
            processChunk();
           
        } catch (error: any) {
            console.error("Failed to import Excel file:", error);
            toast({ variant: "destructive", title: 'Import Gagal', description: error.message });
            setIsImporting(false);
            setProgress(0);
        }
    };
    reader.readAsBinaryString(file);
};


  const isLoading = isUserLoading || isProfileLoading || areAssetsLoading || areMancoreLinksLoading || areMapLinksLoading;

  if (isLoading && !queriedAssets) {
      return (
          <div>
              <div className="flex items-center justify-between mb-8">
                  <Skeleton className="h-8 w-64 mb-2" />
                  <div className="flex gap-2">
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-10 w-32" />
                  </div>
              </div>
              <Card>
                  <CardHeader>
                        <Skeleton className="h-7 w-32" />
                  </CardHeader>
                  <CardContent className="p-6">
                      <Skeleton className="h-10 w-full mb-2" />
                      <Skeleton className="h-10 w-full" />
                  </CardContent>
              </Card>
          </div>
      )
  }

  return (
    <>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manajemen Aset Jaringan</h1>
          <p className="text-muted-foreground mt-1">
            Impor massal dari Excel, cari, dan kelola aset jaringan.
          </p>
        </div>
        <div className="flex gap-2">
            <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                <DialogTrigger asChild>
                    <Button>
                        <Upload className="mr-2 h-4 w-4"/>
                        Import dari Excel
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Import Aset dari Excel</DialogTitle>
                        <DialogDescription>
                           Sistem ini akan memperbarui aset yang ada jika nama asetnya cocok, dan membuat aset baru jika tidak ditemukan. Ini tidak akan menghapus aset yang ada di database tetapi tidak ada di file Excel Anda.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 grid gap-4">
                        <div className="grid gap-2">
                           <Label htmlFor="import-asset-type">Jenis Aset</Label>
                           <Select value={importAssetType} onValueChange={(value) => setImportAssetType(value as any)}>
                               <SelectTrigger id="import-asset-type">
                                   <SelectValue placeholder="Pilih jenis aset..." />
                               </SelectTrigger>
                               <SelectContent>
                                   {assetTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                               </SelectContent>
                           </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="excel-file">Pilih File</Label>
                            <Input id="excel-file" type="file" accept=".xlsx, .xls, .csv" onChange={(e) => handleFileImport(e)} disabled={isImporting || !importAssetType} />
                        </div>
                        {isImporting && (
                            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                                <p>Mengimpor {progress.toFixed(0)}%... Ini mungkin memakan waktu sejenak untuk file besar.</p>
                                <Progress value={progress} className="w-full" />
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
            <AlertDialog open={isDeleteAllDialogOpen} onOpenChange={setIsDeleteAllDialogOpen}>
                <AlertDialogTrigger asChild>
                     <Button variant="destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Hapus Semua
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Anda yakin?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tindakan ini akan menghapus **SEMUA** aset jaringan secara permanen dari database. Tindakan ini tidak dapat dibatalkan. Pastikan Anda memiliki cadangan data di file Excel.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteAll} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" disabled={isDeletingAll}>
                            {isDeletingAll ? <Loader2 className="mr-2 animate-spin" /> : null}
                            {isDeletingAll ? 'Menghapus...' : 'Ya, hapus semua'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
      </div>

       <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Search className="h-5 w-5" />Cari Aset</CardTitle>
          <CardDescription>Pilih Service Area untuk mengaktifkan pencarian, lalu ketik nama aset.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid sm:grid-cols-1 md:grid-cols-3 gap-4">
                 <div className="grid gap-1.5 md:col-span-1">
                    <Label htmlFor="search-area">1. Pilih Service Area *</Label>
                    <Select value={searchServiceArea} onValueChange={setSearchServiceArea}>
                        <SelectTrigger id="search-area"><SelectValue placeholder="Pilih untuk memulai..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Pilih Service Area...</SelectItem>
                            {dynamicServiceAreas.map(sa => <SelectItem key={sa} value={sa}>{sa}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-1.5 md:col-span-2">
                    <Label htmlFor="search-name">2. Cari Nama Aset</Label>
                    <Input id="search-name" placeholder="Ketik nama aset (e.g., ODP-KDS-FA/001)..." value={searchName} onChange={(e) => setSearchName(e.target.value)} disabled={!canSearch}/>
                </div>
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Aset</CardTitle>
          <CardDescription>
            {hasSearched ? `Menampilkan ${paginatedAssets.length} dari ${filteredAssets.length} aset yang cocok.` : (canSearch ? 'Ketik nama aset untuk memulai pencarian.' : 'Pilih Service Area untuk mengaktifkan pencarian.')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
                {isNodeBSearch ? (
                     <TableRow>
                        <TableHead>Site ID</TableHead>
                        <TableHead>Site Name</TableHead>
                        <TableHead>OLT Merk</TableHead>
                        <TableHead>Splitter OLT</TableHead>
                        <TableHead>SN ONT</TableHead>
                        <TableHead>EQP Port</TableHead>
                        <TableHead>Cascade</TableHead>
                        <TableHead>Cascade At</TableHead>
                        <TableHead>CATBTS</TableHead>
                        <TableHead>RNC/BSC</TableHead>
                        <TableHead>Router/RAN</TableHead>
                        <TableHead>Alamat</TableHead>
                        <TableHead className="text-right">Lokasi</TableHead>
                    </TableRow>
                ) : (
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        {!isMitratelSearch && <TableHead>Sub-Type</TableHead>}
                        <TableHead>Service Area</TableHead>
                        {!isMitratelSearch && <TableHead>STO</TableHead>}
                        <TableHead>Coordinates</TableHead>
                        {isMitratelSearch && <TableHead>Mitratel ID</TableHead>}
                        {isMitratelSearch && <TableHead>Tenant ID</TableHead>}
                        {!isMitratelSearch && <TableHead>Avail</TableHead>}
                        {!isMitratelSearch && <TableHead>Used</TableHead>}
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                )}
            </TableHeader>
            <TableBody>
              {areAssetsLoading && hasSearched ? (
                 Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                        <TableCell colSpan={isNodeBSearch ? 13 : 11}><Skeleton className="h-6 w-full" /></TableCell>
                    </TableRow>
                ))
              ) : paginatedAssets.length > 0 && hasSearched ? (
                paginatedAssets.map(a => {
                  const coords = a.coordinates?.split(',').map(c => c.trim());
                  const googleMapsUrl = coords && coords.length === 2 ? `https://www.google.com/maps/search/?api=1&query=${coords[0]},${coords[1]}` : null;
                  return isNodeBSearch ? (
                     <TableRow key={a.id}>
                        <TableCell>{a.siteId}</TableCell>
                        <TableCell>{a.siteName}</TableCell>
                        <TableCell>{a.oltMerk}</TableCell>
                        <TableCell>{a.splitterOlt}</TableCell>
                        <TableCell>{a.snOnt}</TableCell>
                        <TableCell>{a.eqpPort}</TableCell>
                        <TableCell>{a.cascade}</TableCell>
                        <TableCell>{a.cascadeAt}</TableCell>
                        <TableCell>{a.catbts}</TableCell>
                        <TableCell>{a.rncBsc}</TableCell>
                        <TableCell>{a.routerRan}</TableCell>
                        <TableCell>{a.alamat}</TableCell>
                        <TableCell className="text-right">
                           {googleMapsUrl && (
                            <Button asChild variant="ghost" size="icon" title="Lihat di Google Maps">
                              <Link href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
                                <MapPin className="h-4 w-4 text-blue-600" />
                              </Link>
                            </Button>
                          )}
                        </TableCell>
                    </TableRow>
                  ) : (
                    <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.name}</TableCell>
                        <TableCell>{a.assetType}</TableCell>
                        {!isMitratelSearch && <TableCell>{a.subType}</TableCell>}
                        <TableCell>{a.serviceArea}</TableCell>
                        {!isMitratelSearch && <TableCell>{a.sto}</TableCell>}
                        <TableCell>{a.coordinates || '-'}</TableCell>
                        {isMitratelSearch && <TableCell>{a.mitratelSiteId || '-'}</TableCell>}
                        {isMitratelSearch && <TableCell>{a.tenantSiteId || '-'}</TableCell>}
                        {!isMitratelSearch && <TableCell>{a.portAvai || '-'}</TableCell>}
                        {!isMitratelSearch && <TableCell>{a.portUsed || '-'}</TableCell>}
                        <TableCell className="text-right">
                        {googleMapsUrl && (
                            <Button asChild variant="ghost" size="icon" title="Lihat di Google Maps">
                            <Link href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
                                <MapPin className="h-4 w-4 text-blue-600" />
                            </Link>
                            </Button>
                        )}
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Anda yakin?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Ini akan menghapus aset "{a.name}" secara permanen.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteAsset(a.id, a.name)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                    Hapus
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                            </AlertDialog>
                        </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={isNodeBSearch ? 13 : 11} className="h-24 text-center">
                     {!canSearch 
                      ? "Silakan pilih Service Area untuk memulai." 
                      : !hasSearched 
                      ? "Ketik nama aset di atas untuk mencari." 
                      : "Tidak ada aset yang cocok dengan pencarian Anda."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
         <CardFooter>
            <div className="text-xs text-muted-foreground">
                Halaman <strong>{totalPages > 0 ? currentPage : 0}</strong> dari <strong>{totalPages}</strong>
            </div>
            <div className="flex items-center gap-2 ml-auto">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1 || totalPages === 0}
                >
                    <ChevronLeft className="h-4 w-4" />
                    Sebelumnya
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages || totalPages === 0}
                >
                    Berikutnya
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </CardFooter>
      </Card>
    </>
  );
}
