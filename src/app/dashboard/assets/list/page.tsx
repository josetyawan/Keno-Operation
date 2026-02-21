
'use client';

import { Suspense, useMemo, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ChevronLeft, ChevronRight, Search, MapPin } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, type QueryConstraint } from 'firebase/firestore';
import type { UserProfile, NetworkAsset } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

function AssetListSkeleton() {
    return (
        <div className="mx-auto grid w-full flex-1 auto-rows-max gap-6">
            <div className="flex items-center gap-4">
                <Skeleton className="h-8 w-8 rounded-md" />
                <div>
                    <Skeleton className="h-6 w-72 mb-1" />
                    <Skeleton className="h-4 w-96" />
                </div>
            </div>
            <Card>
                <CardHeader>
                    <Skeleton className="h-7 w-48" />
                     <div className="pt-2">
                        <Skeleton className="h-10 w-full" />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="p-6">
                        <Skeleton className="h-10 w-full mb-2" />
                        <Skeleton className="h-10 w-full mb-2" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}


function AssetList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const assetType = searchParams.get('assetType');
  const serviceArea = searchParams.get('serviceArea');
  const subType = searchParams.get('subType');
  
  const [searchName, setSearchName] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  
  const isNodeB = assetType === 'NODE-B';
  const isMitratel = assetType === 'MITRATEL';

  const userProfileRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  // The query now filters by both type and service area on the server.
  const assetsQuery = useMemoFirebase(() => {
    if (isUserLoading || isProfileLoading || !user || !userProfile || userProfile.registrationStatus !== 'approved' || !assetType) {
        return null;
    }

    const constraints: QueryConstraint[] = [];
    constraints.push(where('assetType', '==', assetType));
    
    if (serviceArea) {
      constraints.push(where('serviceArea', '==', serviceArea));
    }

    if (subType) {
        constraints.push(where('subType', '==', subType));
    }

    const collectionRef = collection(firestore, 'network-assets');
    return query(collectionRef, ...constraints);

  }, [firestore, isUserLoading, isProfileLoading, user, userProfile, assetType, serviceArea, subType]);

  const { data: assets, isLoading: areAssetsLoading } = useCollection<NetworkAsset>(assetsQuery);
  
  const clientFilteredAssets = useMemo(() => {
      if (!assets) return [];

      const lowercasedSearchName = searchName.toLowerCase().trim();
      if (searchName && lowercasedSearchName.length > 0) {
        return assets.filter(asset => {
            const nameMatch = asset.name.toLowerCase().includes(lowercasedSearchName);
            const siteIdMatch = asset.siteId && asset.siteId.toLowerCase().includes(lowercasedSearchName);
            const tenantIdMatch = asset.tenantSiteId && asset.tenantSiteId.toLowerCase().includes(lowercasedSearchName);
            return nameMatch || siteIdMatch || tenantIdMatch;
        });
      }
      
      return assets;

  }, [assets, searchName]);

  const totalPages = Math.ceil(clientFilteredAssets.length / ITEMS_PER_PAGE);

  const paginatedAssets = useMemo(() => {
      const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE;
      return clientFilteredAssets.slice(startIndex, endIndex);
  }, [clientFilteredAssets, currentPage]);

  useEffect(() => {
      setCurrentPage(1);
  }, [searchName, serviceArea]);


  const isLoading = isUserLoading || isProfileLoading || areAssetsLoading;
  
  const title = `Detail Aset: ${assetType || ''}${serviceArea ? ` di ${serviceArea}` : ''}${subType ? ` (${subType})` : ''}`;
  const description = `Menampilkan ${paginatedAssets.length} dari ${clientFilteredAssets.length} aset yang cocok.`;

  return (
    <div className="mx-auto grid w-full flex-1 auto-rows-max gap-6">
       <div className="flex items-center gap-4">
        <Button onClick={() => router.back()} variant="outline" size="icon" className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Kembali</span>
        </Button>
        <div>
          <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-bold tracking-tight sm:grow-0">
            {title}
          </h1>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filter Nama
          </CardTitle>
           <div className="pt-2">
            <Label htmlFor="search-name" className="sr-only">Nama Aset</Label>
            <Input id="search-name" placeholder={isNodeB ? `Cari berdasarkan Site ID...` : isMitratel ? `Cari berdasarkan Tenant ID...` : `Cari nama ${assetType || 'aset'}...`} value={searchName} onChange={(e) => setSearchName(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && paginatedAssets.length === 0 ? (
            <div className="p-6">
               <Skeleton className="h-10 w-full mb-2" />
               <Skeleton className="h-10 w-full mb-2" />
               <Skeleton className="h-10 w-full" />
            </div>
          ) : paginatedAssets.length > 0 ? (
            <Table>
              <TableHeader>
                {isNodeB ? (
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
                        <TableHead>{isMitratel ? 'Site Name' : 'Name'}</TableHead>
                        <TableHead>Type</TableHead>
                        {!isMitratel && <TableHead>Sub-Type</TableHead>}
                        <TableHead>Service Area</TableHead>
                        {!isMitratel && <TableHead>STO</TableHead>}
                        <TableHead>Coordinates</TableHead>
                        {isMitratel && <TableHead>Mitratel ID</TableHead>}
                        {isMitratel && <TableHead>Tenant ID</TableHead>}
                        {!isMitratel && <TableHead>Avail</TableHead>}
                        {!isMitratel && <TableHead>Used</TableHead>}
                        <TableHead className="text-right">Lokasi</TableHead>
                    </TableRow>
                )}
              </TableHeader>
              <TableBody>
                {paginatedAssets.map(a => {
                    const coords = a.coordinates?.split(',').map(c => c.trim());
                    const googleMapsUrl = coords && coords.length === 2 ? `https://www.google.com/maps/search/?api=1&query=${coords[0]},${coords[1]}` : null;
                    return isNodeB ? (
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
                        {!isMitratel && <TableCell>{a.subType}</TableCell>}
                        <TableCell>{a.serviceArea}</TableCell>
                        {!isMitratel && <TableCell>{a.sto}</TableCell>}
                        <TableCell>{a.coordinates || '-'}</TableCell>
                        {isMitratel && <TableCell>{a.mitratelSiteId || '-'}</TableCell>}
                        {isMitratel && <TableCell>{a.tenantSiteId || '-'}</TableCell>}
                        {!isMitratel && <TableCell>{a.portAvai || '-'}</TableCell>}
                        {!isMitratel && <TableCell>{a.portUsed || '-'}</TableCell>}
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
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-16 px-6">
                <h2 className="text-xl font-semibold">Tidak Ada Aset Ditemukan</h2>
                <p className="text-muted-foreground mt-2">
                    {searchName ? "Tidak ada aset yang cocok dengan pencarian Anda." : "Tidak ada aset yang cocok dengan filter yang Anda pilih."}
                </p>
                 <Button onClick={() => router.back()} variant="outline" className="mt-4">
                    Kembali ke Rekap
                </Button>
            </div>
          )}
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
    </div>
  );
}

// Wrap with Suspense because useSearchParams must be used in a child of <Suspense>
export default function AssetListPage() {
    return (
        <Suspense fallback={<AssetListSkeleton />}>
            <AssetList />
        </Suspense>
    );
}

    
