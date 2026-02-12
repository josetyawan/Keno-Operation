
'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
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
import { ArrowLeft } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, type QueryConstraint } from 'firebase/firestore';
import type { UserProfile, NetworkAsset } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

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
                <CardContent className="p-0">
                    <div className="p-6">
                        <Skeleton className="h-12 w-full mb-4" />
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
  
  const userProfileRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

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

  const isLoading = isUserLoading || isProfileLoading || areAssetsLoading;
  
  const title = `Detail Aset: ${assetType || ''}${serviceArea ? ` di ${serviceArea}` : ''}${subType ? ` (${subType})` : ''}`;
  const description = `Menampilkan daftar semua aset yang cocok dengan filter yang dipilih. Total: ${assets?.length || 0} aset.`;

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
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <Skeleton className="h-12 w-full mb-4" />
              <Skeleton className="h-10 w-full mb-2" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : assets && assets.length > 0 ? (
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map(a => (
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-16 px-6">
                <h2 className="text-xl font-semibold">Tidak Ada Aset Ditemukan</h2>
                <p className="text-muted-foreground mt-2">
                    Tidak ada aset yang cocok dengan filter yang Anda pilih.
                </p>
                 <Button onClick={() => router.back()} variant="outline" className="mt-4">
                    Kembali ke Rekap
                </Button>
            </div>
          )}
        </CardContent>
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
