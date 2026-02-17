
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


const assetTypes = ['OLT', 'ODC', 'ODP', 'FTM', 'MITRATEL'];
const baseServiceAreas = ['SA KUDUS', 'SA PATI', 'SA JEPARA', 'SA PURWODADI', 'SA BLORA', 'SA REMBANG'];


export default function SearchAssetsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  
  const [searchName, setSearchName] = useState('');
  const [searchAssetType, setSearchAssetType] = useState('all');
  const [searchServiceArea, setSearchServiceArea] = useState('all');
  
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // This is the main trigger for enabling search and showing data.
  // We only start searching when a Service Area is selected to keep queries efficient.
  const canSearch = searchServiceArea !== 'all';
  const isMitratelSelectedAsAssetType = searchAssetType === 'MITRATEL';


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
    if (!canSearch || !currentUserProfile) return null;
    
    const constraints: QueryConstraint[] = [];
    
    constraints.push(where('serviceArea', '==', searchServiceArea));
    
    if (searchAssetType !== 'all') {
        constraints.push(where('assetType', '==', searchAssetType));
    }

    return query(collection(firestore, 'network-assets'), ...constraints);
  }, [firestore, currentUserProfile, canSearch, searchServiceArea, searchAssetType]);

  const { data: queriedAssets, isLoading: areAssetsLoading } = useCollection<NetworkAsset>(assetsQuery);

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

  useEffect(() => {
      setCurrentPage(1);
  }, [searchName, searchAssetType, searchServiceArea]);


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
          <CardTitle className="flex items-center gap-2"><Search className="h-5 w-5" />Cari &amp; Filter Aset</CardTitle>
          <CardDescription>Pilih Service Area untuk memulai pencarian dan melihat tautan terkait.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                 <div className="grid gap-1.5">
                    <Label htmlFor="search-area">Service Area *</Label>
                    <Select value={searchServiceArea} onValueChange={setSearchServiceArea}>
                        <SelectTrigger id="search-area"><SelectValue placeholder="Pilih untuk memulai..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Pilih Service Area...</SelectItem>
                            {dynamicServiceAreas.map(sa => <SelectItem key={sa} value={sa}>{sa}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-1.5">
                    <Label htmlFor="search-name">Nama Aset</Label>
                    <Input id="search-name" placeholder="Cari nama aset..." value={searchName} onChange={(e) => setSearchName(e.target.value)} disabled={!canSearch}/>
                </div>
                <div className="grid gap-1.5">
                    <Label htmlFor="search-type">Jenis Aset</Label>
                    <Select value={searchAssetType} onValueChange={setSearchAssetType} disabled={!canSearch}>
                        <SelectTrigger id="search-type"><SelectValue placeholder="Semua Jenis" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Jenis</SelectItem>
                            {assetTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
             {(currentMancoreLinks.length > 0 || currentMapUrl || (isMitratelSelectedAsAssetType && mitratelMapUrl)) && (
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
                            {isMitratelSelectedAsAssetType && mitratelMapUrl && (
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
            {canSearch ? `Menampilkan ${paginatedAssets.length} dari ${filteredAssets.length} aset yang cocok.` : 'Pilih Service Area untuk melihat data.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                {!isMitratelSelectedAsAssetType && <TableHead>Sub-Type</TableHead>}
                <TableHead>Service Area</TableHead>
                {!isMitratelSelectedAsAssetType && <TableHead>STO</TableHead>}
                <TableHead>Coordinates</TableHead>
                {isMitratelSelectedAsAssetType && <TableHead>Mitratel ID</TableHead>}
                {isMitratelSelectedAsAssetType && <TableHead>Tenant ID</TableHead>}
                {!isMitratelSelectedAsAssetType && <TableHead>Avail</TableHead>}
                {!isMitratelSelectedAsAssetType && <TableHead>Used</TableHead>}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {areAssetsLoading && canSearch ? (
                 Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}><TableCell colSpan={11}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
                ))
              ) : paginatedAssets.length > 0 && canSearch ? (
                paginatedAssets.map(a => {
                  const coords = a.coordinates?.split(',').map(c => c.trim());
                  const googleMapsUrl = coords && coords.length === 2 ? `https://www.google.com/maps/search/?api=1&amp;query=${coords[0]},${coords[1]}` : null;
                  return (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell>{a.assetType}</TableCell>
                    {!isMitratelSelectedAsAssetType && <TableCell>{a.subType}</TableCell>}
                    <TableCell>{a.serviceArea}</TableCell>
                    {!isMitratelSelectedAsAssetType && <TableCell>{a.sto}</TableCell>}
                    <TableCell>{a.coordinates || '-'}</TableCell>
                    {isMitratelSelectedAsAssetType && <TableCell>{a.mitratelSiteId || '-'}</TableCell>}
                    {isMitratelSelectedAsAssetType && <TableCell>{a.tenantSiteId || '-'}</TableCell>}
                    {!isMitratelSelectedAsAssetType && <TableCell>{a.portAvai || '-'}</TableCell>}
                    {!isMitratelSelectedAsAssetType && <TableCell>{a.portUsed || '-'}</TableCell>}
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
                  <TableCell colSpan={11} className="h-24 text-center">
                    {!canSearch ? "Silakan pilih Service Area untuk memulai." : "Tidak ada aset yang cocok dengan filter Anda."}
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
