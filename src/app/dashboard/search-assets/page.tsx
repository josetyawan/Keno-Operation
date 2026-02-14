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
import { Search, ChevronLeft, ChevronRight, MapPin, Map } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc, where, limit } from 'firebase/firestore';
import type { UserProfile, NetworkAsset } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';


const assetTypes = ['OLT', 'ODC', 'ODP', 'FTM'];
const serviceAreas = ['SA KUDUS', 'SA PATI', 'SA JEPARA', 'SA PURWODADI', 'SA BLORA', 'SA REMBANG'];


export default function SearchAssetsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  
  const [searchName, setSearchName] = useState('');
  const [searchAssetType, setSearchAssetType] = useState('all');
  const [searchServiceArea, setSearchServiceArea] = useState('all');
  const [mapLink, setMapLink] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;


  const { data: currentUserProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(
    useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore])
  );

  useEffect(() => {
    if (!isUserLoading && !isProfileLoading) {
      const isApproved = currentUserProfile?.registrationStatus === 'approved';
      const hasAccess = currentUserProfile?.role === 'admin' || currentUserProfile?.appAccess === 'allpro' || currentUserProfile?.appAccess === 'all';
      if (!user || !isApproved || !hasAccess) {
        router.push('/dashboard');
      }
    }
  }, [user, currentUserProfile, isUserLoading, isProfileLoading, router]);

  const filteredAssetsQuery = useMemoFirebase(() => {
    if (isUserLoading || isProfileLoading || !user || !currentUserProfile) {
      return null;
    }
    const constraints: any[] = [];
    if (searchAssetType !== 'all') {
      constraints.push(where('assetType', '==', searchAssetType));
    }
    if (searchServiceArea !== 'all') {
      constraints.push(where('serviceArea', '==', searchServiceArea));
    }
    constraints.push(limit(500)); 
    
    return query(collection(firestore, 'network-assets'), ...constraints);
  }, [firestore, currentUserProfile, isUserLoading, isProfileLoading, searchAssetType, searchServiceArea]);

  const { data: queriedAssets, isLoading: areAssetsLoading } = useCollection<NetworkAsset>(filteredAssetsQuery);

  const filteredAssetsByName = useMemo(() => {
    if (!queriedAssets) return [];
    const lowercasedSearchName = searchName.toLowerCase().trim();
    
    return queriedAssets.filter(asset => {
      return searchName ? asset.name.toLowerCase().includes(lowercasedSearchName) : true;
    });
  }, [queriedAssets, searchName]);

  const totalPages = Math.ceil(filteredAssetsByName.length / ITEMS_PER_PAGE);

  const paginatedAssets = useMemo(() => {
      const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE;
      return filteredAssetsByName.slice(startIndex, endIndex);
  }, [filteredAssetsByName, currentPage]);

  useEffect(() => {
      setCurrentPage(1);
  }, [searchName, searchAssetType, searchServiceArea]);
  
  const handleOpenMap = () => {
    if (mapLink && (mapLink.startsWith('http://') || mapLink.startsWith('https://'))) {
      window.open(mapLink, '_blank');
    }
  };


  const isLoading = isUserLoading || isProfileLoading || areAssetsLoading;

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
          <h1 className="text-3xl font-bold tracking-tight">Pencarian Aset Jaringan</h1>
          <p className="text-muted-foreground mt-1">
            Cari dan lihat detail aset jaringan di semua service area.
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
            Gunakan filter untuk menemukan aset spesifik. Halaman ini hanya menampilkan sebagian data untuk performa.
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
                        {serviceAreas.map(sa => <SelectItem key={sa} value={sa}>{sa}</SelectItem>)}
                    </SelectContent>
                    </Select>
                </div>
            </div>
             <div className="mt-4 border-t pt-4">
                <div className="grid gap-1.5 max-w-lg">
                    <Label htmlFor="map-link">Link Google My Maps</Label>
                    <div className="flex gap-2">
                        <Input id="map-link" placeholder="Tempel link Google My Maps di sini..." value={mapLink} onChange={(e) => setMapLink(e.target.value)} />
                        <Button onClick={handleOpenMap} disabled={!mapLink}>
                            <Map className="mr-2 h-4 w-4" />
                            Buka Peta
                        </Button>
                    </div>
                </div>
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Aset</CardTitle>
          <CardDescription>
            Menampilkan {paginatedAssets.length} dari {filteredAssetsByName.length} aset yang cocok.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Sub-Type</TableHead>
                <TableHead>Service Area</TableHead>
                <TableHead>STO</TableHead>
                <TableHead>Coordinates</TableHead>
                <TableHead>Kapasitas</TableHead>
                <TableHead>Spesifikasi</TableHead>
                <TableHead>Avail</TableHead>
                <TableHead>Used</TableHead>
                <TableHead>Rsv</TableHead>
                <TableHead>Rsk</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {areAssetsLoading && paginatedAssets.length === 0 ? (
                 Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                        <TableCell colSpan={13}><Skeleton className="h-6 w-full" /></TableCell>
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
                    <TableCell>{a.subType}</TableCell>
                    <TableCell>{a.serviceArea}</TableCell>
                    <TableCell>{a.sto}</TableCell>
                    <TableCell>{a.coordinates || '-'}</TableCell>
                    <TableCell>{a.kapasitas || '-'}</TableCell>
                    <TableCell>{a.spec || '-'}</TableCell>
                    <TableCell>{a.portAvai || '-'}</TableCell>
                    <TableCell>{a.portUsed || '-'}</TableCell>
                    <TableCell>{a.portRsv || '-'}</TableCell>
                    <TableCell>{a.portRsk || '-'}</TableCell>
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
                  <TableCell colSpan={13} className="h-24 text-center">
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
