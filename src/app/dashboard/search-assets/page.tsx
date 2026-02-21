
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, ChevronLeft, ChevronRight, MapPin, FolderGit2 } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc, where, type QueryConstraint } from 'firebase/firestore';
import type { UserProfile, NetworkAsset, MancoreLink, MapLink } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';


const baseServiceAreas = ['SA KUDUS', 'SA PATI', 'SA JEPARA', 'SA PURWODADI', 'SA BLORA', 'SA REMBANG'];


export default function SearchAssetsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  
  const [searchName, setSearchName] = useState('');
  const [searchServiceArea, setSearchServiceArea] = useState('all');
  
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const canSearch = searchServiceArea !== 'all';
  const hasSearched = canSearch && searchName.trim() !== '';
  
  const { data: currentUserProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(
    useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore])
  );
  
  const mancoreLinksQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'mancore-links'));
  }, [firestore]);

  const { data: mancoreLinks, isLoading: areMancoreLinksLoading } = useCollection<MancoreLink>(mancoreLinksQuery);
  
  const mapLinksQuery = useMemoFirebase(() => {
      if (!firestore) return null;
      return query(collection(firestore, 'map-links'));
  }, [firestore]);

  const { data: mapLinks, isLoading: areMapLinksLoading } = useCollection<MapLink>(mapLinksQuery);

  const mitratelMapUrl = useMemo(() => {
    if (!mapLinks) return null;
    const mitratelLink = mapLinks.find(link => link.serviceArea.toUpperCase() === 'MITRATEL');
    return mitratelLink?.url || null;
  }, [mapLinks]);
  
  const dynamicServiceAreas = useMemo(() => {
    const standardSAs = new Set<string>(baseServiceAreas);
    if (mancoreLinks) mancoreLinks.forEach(link => {
        if (!link.serviceArea.toLowerCase().includes('mitratel')) {
            standardSAs.add(link.serviceArea)
        }
    });
    if (mapLinks) mapLinks.forEach(link => {
        if (!link.serviceArea.toLowerCase().includes('mitratel')) {
            standardSAs.add(link.serviceArea)
        }
    });
    // Remove NODE-B if it exists to prevent duplication before prepending it.
    standardSAs.delete('NODE-B');
    
    // Add special search categories
    return ['MITRATEL', 'NODE-B', ...Array.from(standardSAs).sort()];
  }, [mancoreLinks, mapLinks]);

  const mancoreLinksBySA = useMemo(() => {
    if (!mancoreLinks) return new Map<string, MancoreLink[]>();
    return mancoreLinks.reduce((acc, link) => {
        if (!acc.has(link.serviceArea)) {
            acc.set(link.serviceArea, []);
        }
        acc.get(link.serviceArea)!.push(link);
        return acc;
    }, new Map<string, MancoreLink[]>());
  }, [mancoreLinks]);

  const mapUrlBySA = useMemo(() => {
      if (!mapLinks) return new Map<string, string>();
      return new Map(mapLinks.map(link => [link.serviceArea, link.url]));
  }, [mapLinks]);

  const currentMancoreLinks = useMemo(() => {
    if (searchServiceArea === 'all') return [];
    return mancoreLinksBySA.get(searchServiceArea) || [];
  }, [searchServiceArea, mancoreLinksBySA]);

  const currentMapUrl = useMemo(() => {
      if (searchServiceArea === 'all') return null;
      return mapUrlBySA.get(searchServiceArea) || null;
  }, [searchServiceArea, mapUrlBySA]);


  useEffect(() => {
    if (!isUserLoading && !isProfileLoading) {
      const isApproved = currentUserProfile?.registrationStatus === 'approved';
      const hasAccess = currentUserProfile?.role === 'admin' || currentUserProfile?.appAccess === 'allpro' || currentUserProfile?.appAccess === 'all';
      if (!user || !isApproved || !hasAccess) {
        router.push('/dashboard');
      }
    }
  }, [user, currentUserProfile, isUserLoading, isProfileLoading, router]);

  const assetsQuery = useMemoFirebase(() => {
    if (!canSearch || !currentUserProfile) {
      return null;
    }
    const collectionRef = collection(firestore, 'network-assets');
    const constraints: QueryConstraint[] = [];

    if (searchServiceArea === 'MITRATEL' || searchServiceArea === 'NODE-B') {
        constraints.push(where('assetType', '==', searchServiceArea));
    } else {
        constraints.push(where('serviceArea', '==', searchServiceArea));
    }
    
    return query(collectionRef, ...constraints);
  }, [firestore, currentUserProfile, canSearch, searchServiceArea]);

  const { data: queriedAssets, isLoading: areAssetsLoading } = useCollection<NetworkAsset>(assetsQuery);

  const filteredAssets = useMemo(() => {
    if (!queriedAssets) return [];
    
    const searchTerm = searchName.trim().toUpperCase();

    if (searchTerm.length < 3) {
        if (!searchTerm.startsWith('ODP') && !searchTerm.startsWith('ODC') && !searchTerm.startsWith('FTM')) {
            return [];
        }
    }

    return queriedAssets.filter(asset => {
        const assetName = asset.name.toUpperCase();
        const assetType = asset.assetType;

        // --- Node B ---
        if (assetType === 'NODE-B') {
            return asset.siteId?.toUpperCase().includes(searchTerm) ?? false;
        }
        
        // --- Mitratel ---
        if (assetType === 'MITRATEL') {
            return asset.tenantSiteId?.toUpperCase().includes(searchTerm) ?? false;
        }

        // --- ODP ---
        if (assetType === 'ODP') {
            if (searchTerm.startsWith('ODP') && searchTerm.includes('/')) {
                return assetName.startsWith(searchTerm);
            }
            return assetName.includes(searchTerm); 
        }

        // --- ODC ---
        if (assetType === 'ODC') {
            if (searchTerm.startsWith('ODC-')) {
                const parts = searchTerm.split('-');
                if (parts.length >= 3 && parts[2]) {
                     return assetName.startsWith(searchTerm);
                }
                return false;
            }
            return assetName.includes(searchTerm);
        }
        
        // --- FTM ---
        if (assetType === 'FTM') {
            if (searchTerm.startsWith('FTM-')) {
                return assetName.startsWith(searchTerm);
            }
            return assetName.includes(searchTerm);
        }

        // --- Mini OLT ---
        if (asset.assetType === 'OLT' && asset.subType === 'Mini OLT') {
            return assetName.includes(searchTerm);
        }

        // Fallback for any other asset types (e.g. regular OLT)
        return assetName.includes(searchTerm);
    });
    
  }, [queriedAssets, searchName]);

  const totalPages = Math.ceil(filteredAssets.length / ITEMS_PER_PAGE);

  const paginatedAssets = useMemo(() => {
      const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE;
      return filteredAssets.slice(startIndex, endIndex);
  }, [filteredAssets, currentPage]);
  
  const isNodeBSearch = searchServiceArea === 'NODE-B';
  const isMitratelSearch = searchServiceArea === 'MITRATEL';


  useEffect(() => {
      setCurrentPage(1);
  }, [searchName, searchServiceArea]);


  const isLoading = isUserLoading || isProfileLoading || areAssetsLoading || areMancoreLinksLoading || areMapLinksLoading;
  
  if (isLoading && canSearch) {
      return (
          <div>
              <div className="flex items-center justify-between mb-8"><Skeleton className="h-8 w-64 mb-2" /></div>
              <Card><CardHeader><Skeleton className="h-7 w-32" /></CardHeader>
                  <CardContent className="p-6"><Skeleton className="h-10 w-full mb-2" /><Skeleton className="h-10 w-full" /></CardContent>
              </Card>
          </div>
      )
  }

  return (
    <>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Network Cek</h1>
          <p className="text-muted-foreground mt-1">Cek dan cari detail aset jaringan di semua service area.</p>
        </div>
      </div>

       <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Search className="h-5 w-5" />Cari Aset</CardTitle>
          <CardDescription>Pilih Service Area untuk memulai pencarian dan melihat tautan terkait.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid sm:grid-cols-1 md:grid-cols-3 gap-4">
                 <div className="grid gap-1.5 md:col-span-1">
                    <Label htmlFor="search-area">1. Pilih Kategori/Area *</Label>
                    <Select value={searchServiceArea} onValueChange={setSearchServiceArea}>
                        <SelectTrigger id="search-area"><SelectValue placeholder="Pilih untuk memulai..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Pilih Kategori/Area...</SelectItem>
                            {dynamicServiceAreas.map(sa => <SelectItem key={sa} value={sa}>{sa}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-1.5 md:col-span-2">
                    <Label htmlFor="search-name">2. Cari Nama, Site ID, atau Tenant ID</Label>
                    <Input id="search-name" placeholder="Ketik nama aset, Site ID, atau Tenant ID..." value={searchName} onChange={(e) => setSearchName(e.target.value)} disabled={!canSearch}/>
                </div>
            </div>
             {(currentMancoreLinks.length > 0 || currentMapUrl || (isMitratelSearch && mitratelMapUrl)) && (
                <div className="mt-4 border-t pt-4">
                     <h4 className="text-sm font-medium mb-2">Tautan Eksternal {searchServiceArea !== 'all' && `untuk ${searchServiceArea}`}</h4>
                     <div className="max-w-2xl">
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {currentMapUrl && (
                                 <Button asChild key={currentMapUrl} variant="outline">
                                    <Link href={currentMapUrl} target="_blank" rel="noopener noreferrer">
                                        <MapPin className="mr-2 h-4 w-4" />
                                        {`Buka Peta ALLPRO ${searchServiceArea}`}
                                    </Link>
                                </Button>
                            )}
                            {isMitratelSearch && mitratelMapUrl && (
                                <Button asChild key="mitratel-map" variant="outline">
                                    <Link href={mitratelMapUrl} target="_blank" rel="noopener noreferrer">
                                        <MapPin className="mr-2 h-4 w-4" />
                                        Buka Peta Mitratel
                                    </Link>
                                </Button>
                            )}
                            {currentMancoreLinks.map(link => (
                                <Button asChild key={link.id} variant="secondary">
                                    <Link href={link.url} target="_blank" rel="noopener noreferrer">
                                        <FolderGit2 className="mr-2 h-4 w-4" />
                                        {`Mancore & KML ${link.label}`}
                                    </Link>
                                </Button>
                            ))}
                        </div>
                     </div>
                </div>
            )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Aset</CardTitle>
          <CardDescription>
            {hasSearched ? `Menampilkan ${paginatedAssets.length} dari ${filteredAssets.length} aset yang cocok.` : (canSearch ? 'Ketik nama aset, Site ID, atau Tenant ID di atas untuk mencari.' : 'Pilih Kategori/Area untuk melihat data.')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
               {isNodeBSearch ? (
                     <TableRow>
                        <TableHead>Site ID</TableHead>
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
                        <TableHead>{isMitratelSearch ? 'Tenant ID' : 'Name'}</TableHead>
                        <TableHead>Type</TableHead>
                        {!isMitratelSearch && <TableHead>Sub-Type</TableHead>}
                        <TableHead>Service Area</TableHead>
                        {!isMitratelSearch && <TableHead>STO</TableHead>}
                        <TableHead>Coordinates</TableHead>
                        {isMitratelSearch && <TableHead>Mitratel ID</TableHead>}
                        {!isMitratelSearch && <TableHead>Avail</TableHead>}
                        {!isMitratelSearch && <TableHead>Used</TableHead>}
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                )}
            </TableHeader>
            <TableBody>
              {areAssetsLoading && hasSearched ? (
                 Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}><TableCell colSpan={isNodeBSearch ? 12 : 10}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
                ))
              ) : paginatedAssets.length > 0 && hasSearched ? (
                paginatedAssets.map(a => {
                  const coords = a.coordinates?.split(',').map(c => c.trim());
                  const googleMapsUrl = coords && coords.length === 2 ? `https://www.google.com/maps/search/?api=1&amp;query=${coords[0]},${coords[1]}` : null;
                  return isNodeBSearch ? (
                     <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.siteId}</TableCell>
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
                    <TableCell className="font-medium">{isMitratelSearch ? a.tenantSiteId : a.name}</TableCell>
                    <TableCell>{a.assetType}</TableCell>
                    {!isMitratelSearch && <TableCell>{a.subType}</TableCell>}
                    <TableCell>{a.serviceArea}</TableCell>
                    {!isMitratelSearch && <TableCell>{a.sto}</TableCell>}
                    <TableCell>{a.coordinates || '-'}</TableCell>
                    {isMitratelSearch && <TableCell>{a.mitratelSiteId || '-'}</TableCell>}
                    {!isMitratelSearch && <TableCell>{a.portAvai || '-'}</TableCell>}
                    {!isMitratelSearch && <TableCell>{a.portUsed || '-'}</TableCell>}
                    <TableCell className="text-right">
                       {googleMapsUrl && (
                        <Button asChild variant="ghost" size="icon" title="Lihat di Google Maps">
                          <Link href={googleMapsUrl} target="_blank" rel="noopener noreferrer"><MapPin className="h-4 w-4 text-blue-600" /></Link>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )})
              ) : (
                <TableRow>
                  <TableCell colSpan={isNodeBSearch ? 12 : 10} className="h-24 text-center">
                    {!canSearch 
                      ? "Silakan pilih Kategori/Area untuk memulai." 
                      : !hasSearched 
                      ? "Ketik nama aset, Site ID, atau Tenant ID di atas untuk mencari." 
                      : "Tidak ada aset yang cocok dengan filter Anda."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
         <CardFooter>
            <div className="text-xs text-muted-foreground">Halaman <strong>{totalPages > 0 ? currentPage : 0}</strong> dari <strong>{totalPages}</strong></div>
            <div className="flex items-center gap-2 ml-auto">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1 || totalPages === 0}>
                    <ChevronLeft className="h-4 w-4" /> Sebelumnya
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0}>
                    Berikutnya <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </CardFooter>
      </Card>
    </>
  );
}
