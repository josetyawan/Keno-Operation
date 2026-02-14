
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
import { collection, query, doc } from 'firebase/firestore';
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

  const isMitratelView = searchAssetType === 'MITRATEL';


  const { data: currentUserProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(
    useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore])
  );
  
  // Mancore links fetching
  const mancoreLinksQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'mancore-links'));
  }, [firestore]);

  const { data: mancoreLinks, isLoading: areMancoreLinksLoading } = useCollection<MancoreLink>(mancoreLinksQuery);
  
  // Map links fetching
  const mapLinksQuery = useMemoFirebase(() => {
      if (!firestore) return null;
      return query(collection(firestore, 'map-links'));
  }, [firestore]);

  const { data: mapLinks, isLoading: areMapLinksLoading } = useCollection<MapLink>(mapLinksQuery);

  const mitratelMapUrl = useMemo(() => {
    if (!mapLinks) return null;
    // Find a map link specifically for Mitratel
    const mitratelLink = mapLinks.find(link => link.serviceArea.toUpperCase() === 'MITRATEL');
    return mitratelLink?.url || null;
  }, [mapLinks]);
  
  const dynamicServiceAreas = useMemo(() => {
    const allSAs = new Set<string>(baseServiceAreas);
    if (mancoreLinks) {
        mancoreLinks.forEach(link => allSAs.add(link.serviceArea));
    }
    if (mapLinks) {
        mapLinks.forEach(link => allSAs.add(link.serviceArea));
    }
    // Filter out the special MITRATEL service area from the dropdown
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

  // Create map of SA to map URL
  const mapUrlBySA = useMemo(() => {
      if (!mapLinks) return new Map<string, string>();
      return new Map(mapLinks.map(link => [link.serviceArea, link.url]));
  }, [mapLinks]);

  const currentMancoreLinks = useMemo(() => {
    if (searchServiceArea === 'all') return [];
    return mancoreLinksBySA.get(searchServiceArea) || [];
  }, [searchServiceArea, mancoreLinksBySA]);

  // Get current map URL
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

  // Fetch all assets from server, filter on client
  const assetsQuery = useMemoFirebase(() => {
    if (isUserLoading || isProfileLoading || !user || !currentUserProfile) {
      return null;
    }
    // Fetch ALL assets. Filtering will happen on the client for consistency.
    return query(collection(firestore, 'network-assets'));
  }, [firestore, currentUserProfile, isUserLoading, isProfileLoading]);

  const { data: queriedAssets, isLoading: areAssetsLoading } = useCollection<NetworkAsset>(assetsQuery);

  // Perform client-side filtering for all filters
  const filteredAssets = useMemo(() => {
    if (!queriedAssets) return [];
    
    let assets = queriedAssets;

    // Filter by Asset Type
    if (searchAssetType !== 'all') {
        assets = assets.filter(asset => asset.assetType === searchAssetType);
    }
    
    // Filter by Service Area
    if (searchServiceArea !== 'all') {
        assets = assets.filter(asset => asset.serviceArea === searchServiceArea);
    }

    // Filter by name
    const lowercasedSearchName = searchName.toLowerCase().trim();
    if (lowercasedSearchName) {
        assets = assets.filter(asset => asset.name.toLowerCase().includes(lowercasedSearchName));
    }
    
    return assets;
  }, [queriedAssets, searchAssetType, searchServiceArea, searchName]);

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

  if (isLoading && !queriedAssets) {
      return (
          <div>
              <div className="flex items-center justify-between mb-8">
                  <Skeleton className="h-8 w-64 mb-2" />
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
          <h1 className="text-3xl font-bold tracking-tight">Network Cek</h1>
          <p className="text-muted-foreground mt-1">
            Cek dan cari detail aset jaringan di semua service area.
          </p>
        </div>
      </div>

       <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Cari & Filter Aset
          </CardTitle>
          <CardDescription>
            Gunakan filter untuk menemukan aset spesifik.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="grid gap-1.5">
                    <Label htmlFor="search-name">Nama Aset</Label>
                    <Input id="search-name" placeholder="Cari nama aset..." value={searchName} onChange={(e) => setSearchName(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                    <Label htmlFor="search-type">Jenis Aset</Label>
                    <Select value={searchAssetType} onValueChange={setSearchAssetType}>
                    <SelectTrigger id="search-type"><SelectValue placeholder="Semua Jenis" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Semua Jenis</SelectItem>
                        {assetTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-1.5">
                    <Label htmlFor="search-area">Service Area</Label>
                    <Select value={searchServiceArea} onValueChange={setSearchServiceArea}>
                    <SelectTrigger id="search-area"><SelectValue placeholder="Semua Area" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Semua Area</SelectItem>
                        {dynamicServiceAreas.map(sa => <SelectItem key={sa} value={sa}>{sa}</SelectItem>)}
                    </SelectContent>
                    </Select>
                </div>
            </div>
             {(currentMancoreLinks.length > 0 || currentMapUrl || (isMitratelView && mitratelMapUrl)) && (
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
                            {isMitratelView && mitratelMapUrl && (
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
            Menampilkan {paginatedAssets.length} dari {filteredAssets.length} aset yang cocok.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                {!isMitratelView && <TableHead>Sub-Type</TableHead>}
                <TableHead>Service Area</TableHead>
                {!isMitratelView && <TableHead>STO</TableHead>}
                <TableHead>Coordinates</TableHead>
                {isMitratelView && <TableHead>Mitratel ID</TableHead>}
                {isMitratelView && <TableHead>Tenant ID</TableHead>}
                {!isMitratelView && <TableHead>Avail</TableHead>}
                {!isMitratelView && <TableHead>Used</TableHead>}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {areAssetsLoading && paginatedAssets.length === 0 ? (
                 Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                        <TableCell colSpan={11}><Skeleton className="h-6 w-full" /></TableCell>
                    </TableRow>
                ))
              ) : paginatedAssets.length > 0 ? (
                paginatedAssets.map(a => {
                  const coords = a.coordinates?.split(',').map(c => c.trim());
                  const googleMapsUrl = coords && coords.length === 2 ? `https://www.google.com/maps/search/?api=1&query=${coords[0]},${coords[1]}` : null;
                  return (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell>{a.assetType}</TableCell>
                    {!isMitratelView && <TableCell>{a.subType}</TableCell>}
                    <TableCell>{a.serviceArea}</TableCell>
                    {!isMitratelView && <TableCell>{a.sto}</TableCell>}
                    <TableCell>{a.coordinates || '-'}</TableCell>
                    {isMitratelView && <TableCell>{a.mitratelSiteId || '-'}</TableCell>}
                    {isMitratelView && <TableCell>{a.tenantSiteId || '-'}</TableCell>}
                    {!isMitratelView && <TableCell>{a.portAvai || '-'}</TableCell>}
                    {!isMitratelView && <TableCell>{a.portUsed || '-'}</TableCell>}
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
                )})
              ) : (
                <TableRow>
                  <TableCell colSpan={11} className="h-24 text-center">
                    {(searchName || searchAssetType !== 'all' || searchServiceArea !== 'all') 
                        ? "Tidak ada aset yang cocok dengan filter Anda." 
                        : "Gunakan filter di atas untuk mencari aset."
                    }
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
         <CardFooter>
            <div className="text-xs text-muted-foreground">
                Halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong>
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
