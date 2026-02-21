
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
    const allSAs = new Set<string>(baseServiceAreas);
    if (mancoreLinks) mancoreLinks.forEach(link => allSAs.add(link.serviceArea));
    if (mapLinks) mapLinks.forEach(link => allSAs.add(link.serviceArea));
    return Array.from(allSAs).filter(sa => sa.toUpperCase() !== 'MITRATEL').sort();
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
    if (!canSearch || !currentUserProfile || searchName.trim() === '') {
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
  }, [firestore, currentUserProfile, canSearch, searchServiceArea, searchName]);

  const { data: queriedAssets, isLoading: areAssetsLoading } = useCollection<NetworkAsset>(assetsQuery);

  const filteredAssets = useMemo(() => {
    if (!queriedAssets) return [];
    
    const lowercasedSearchName = searchName.toLowerCase().trim();
    if (lowercasedSearchName) {
        return queriedAssets.filter(asset => {
            const nameMatch = asset.name.toLowerCase().includes(lowercasedSearchName);
            const siteIdMatch = asset.siteId?.toLowerCase().includes(lowercasedSearchName);
            return nameMatch || !!siteIdMatch;
        });
    }
    
    return queriedAssets;
  }, [queriedAssets, searchName]);

  const totalPages = Math.ceil(filteredAssets.length / ITEMS_PER_PAGE);

  const paginatedAssets = useMemo(() => {
      const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE;
      return filteredAssets.slice(startIndex, endIndex);
  }, [filteredAssets, currentPage]);
  
  const isNodeBSearch = useMemo(() => {
    const upperSearch = searchName.toUpperCase().trim();
    if (upperSearch.startsWith('NODE-B')) return true;

    const siteIdPatterns = ['JPA', 'KDS', 'DMK', 'PAT', 'RBG', 'GRO', 'BLA'];
    // Check if the search query looks like a site ID
    if (siteIdPatterns.some(p => upperSearch.includes(p))) {
        // To avoid false positives (e.g., searching for a person named 'Pat'), check if it contains numbers.
        if (/\d/.test(upperSearch)) {
            return true;
        }
    }
    
    // Also consider if the found assets are of type NODE-B, even if search term is ambiguous
    if (paginatedAssets.length > 0 && paginatedAssets.every(a => a.assetType === 'NODE-B')) {
        return true;
    }

    return false;
}, [searchName, paginatedAssets]);
  
  const isMitratelSearch = useMemo(() => paginatedAssets?.[0]?.assetType === 'MITRATEL', [paginatedAssets]);


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
                    <Label htmlFor="search-name">2. Cari Nama Aset atau Site ID</Label>
                    <Input id="search-name" placeholder="Ketik nama aset (e.g., ODP-KUD-FA/001) atau Site ID..." value={searchName} onChange={(e) => setSearchName(e.target.value)} disabled={!canSearch}/>
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
            {hasSearched ? `Menampilkan ${paginatedAssets.length} dari ${filteredAssets.length} aset yang cocok.` : (canSearch ? 'Ketik nama aset untuk memulai pencarian.' : 'Pilih Service Area untuk melihat data.')}
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
                      ? "Silakan pilih Service Area untuk memulai." 
                      : !hasSearched 
                      ? "Ketik nama aset atau Site ID di atas untuk mencari." 
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
