'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
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
  TableFooter,
} from '@/components/ui/table';
import { ArrowLeft } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { NetworkAsset, UserProfile } from '@/lib/types';
import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';


const serviceAreas = ['SA KUDUS', 'SA PATI', 'SA JEPARA', 'SA PURWODADI', 'SA BLORA', 'SA REMBANG'];

const skeletonCard = (
  <Card>
    <CardHeader>
      <Skeleton className="h-6 w-24" />
    </CardHeader>
    <CardContent>
      <div className="space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    </CardContent>
  </Card>
);

export default function AllproPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const userProfileRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const assetsQuery = useMemoFirebase(() => {
    if (!userProfile || userProfile.registrationStatus !== 'approved') return null;
    return collection(firestore, 'network-assets');
  }, [firestore, userProfile]);

  const { data: assets, isLoading: areAssetsLoading } = useCollection<NetworkAsset>(assetsQuery);

  const rekapData = useMemo(() => {
    const emptyRekap = {
      olt: { title: "OLT All", headers: ["Service Area", "Mini OLT", "OLT", "Grand Total"], rows: [], totals: { miniOlt: 0, olt: 0, grandTotal: 0 }},
      ftm: { title: "FTM All", headers: ["Service Area", "EA", "OA", "Grand Total"], rows: [], totals: { ea: 0, oa: 0, grandTotal: 0 }},
      odc: { title: "ODC All", headers: ["Service Area", "Jumlah ODC"], rows: [], totals: { jumlah: 0 }},
      odp: { title: "ODP All", headers: ["Service Area", "Jumlah ODP"], rows: [], totals: { jumlah: 0 }},
    };

    if (!assets) return emptyRekap;

    const dataBySA = serviceAreas.reduce((acc, sa) => {
      acc[sa] = { miniOlt: 0, olt: 0, odc: 0, odp: 0, ea: 0, oa: 0 };
      return acc;
    }, {} as Record<string, { miniOlt: number, olt: number, odc: number, odp: number, ea: number, oa: number }>);

    for (const asset of assets) {
      if (dataBySA[asset.serviceArea]) {
        switch (asset.assetType) {
          case 'OLT':
            if (asset.subType === 'Mini OLT') dataBySA[asset.serviceArea].miniOlt++;
            if (asset.subType === 'OLT') dataBySA[asset.serviceArea].olt++;
            break;
          case 'ODC':
            dataBySA[asset.serviceArea].odc++;
            break;
          case 'ODP':
            dataBySA[asset.serviceArea].odp++;
            break;
          case 'FTM':
            if (asset.subType === 'EA') dataBySA[asset.serviceArea].ea++;
            if (asset.subType === 'OA') dataBySA[asset.serviceArea].oa++;
            break;
        }
      }
    }
    
    const oltRows = serviceAreas.map(sa => ({ serviceArea: sa, miniOlt: dataBySA[sa].miniOlt, olt: dataBySA[sa].olt, grandTotal: dataBySA[sa].miniOlt + dataBySA[sa].olt }));
    const ftmRows = serviceAreas.map(sa => ({ serviceArea: sa, ea: dataBySA[sa].ea, oa: dataBySA[sa].oa, grandTotal: dataBySA[sa].ea + dataBySA[sa].oa }));
    const odcRows = serviceAreas.map(sa => ({ serviceArea: sa, jumlah: dataBySA[sa].odc }));
    const odpRows = serviceAreas.map(sa => ({ serviceArea: sa, jumlah: dataBySA[sa].odp }));

    return {
      olt: {
        title: "OLT All",
        headers: ["Service Area", "Mini OLT", "OLT", "Grand Total"],
        rows: oltRows,
        totals: {
          miniOlt: oltRows.reduce((sum, row) => sum + row.miniOlt, 0),
          olt: oltRows.reduce((sum, row) => sum + row.olt, 0),
          grandTotal: oltRows.reduce((sum, row) => sum + row.grandTotal, 0),
        }
      },
      ftm: {
        title: "FTM All",
        headers: ["Service Area", "EA", "OA", "Grand Total"],
        rows: ftmRows,
        totals: {
          ea: ftmRows.reduce((sum, row) => sum + row.ea, 0),
          oa: ftmRows.reduce((sum, row) => sum + row.oa, 0),
          grandTotal: ftmRows.reduce((sum, row) => sum + row.grandTotal, 0),
        }
      },
      odc: {
        title: "ODC All",
        headers: ["Service Area", "Jumlah ODC"],
        rows: odcRows,
        totals: {
          jumlah: odcRows.reduce((sum, row) => sum + row.jumlah, 0)
        }
      },
      odp: {
        title: "ODP All",
        headers: ["Service Area", "Jumlah ODP"],
        rows: odpRows,
        totals: {
          jumlah: odpRows.reduce((sum, row) => sum + row.jumlah, 0)
        }
      }
    };
  }, [assets]);
  
  const { olt, odc, odp, ftm } = rekapData;

  const isLoading = isUserLoading || isProfileLoading || areAssetsLoading;

  if (isLoading) {
    return (
       <div className="mx-auto grid w-full flex-1 auto-rows-max gap-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8 rounded-md" />
          <div>
            <Skeleton className="h-6 w-72 mb-1" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
         <div className="grid gap-6 md:grid-cols-2">
            {skeletonCard}
            {skeletonCard}
            {skeletonCard}
            {skeletonCard}
         </div>
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full flex-1 auto-rows-max gap-6">
      <div className="flex items-center gap-4">
        <Button onClick={() => router.push('/dashboard')} variant="outline" size="icon" className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Kembali</span>
        </Button>
        <div>
          <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-bold tracking-tight sm:grow-0">
            Rekapitulasi Data Jaringan
          </h1>
          <p className="text-muted-foreground text-sm">Ringkasan data OLT, ODC, ODP, dan FTM per Service Area.</p>
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        {/* OLT Card */}
        <Card>
          <CardHeader>
            <CardTitle>{olt.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  {olt.headers.map(h => <TableHead key={h}>{h}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {olt.rows.map(row => (
                  <TableRow key={row.serviceArea}>
                    <TableCell className="font-medium">{row.serviceArea}</TableCell>
                    <TableCell>{row.miniOlt}</TableCell>
                    <TableCell>{row.olt}</TableCell>
                    <TableCell className="font-bold">{row.grandTotal}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                    <TableCell className="font-bold">Grand Total</TableCell>
                    <TableCell className="font-bold">{olt.totals.miniOlt}</TableCell>
                    <TableCell className="font-bold">{olt.totals.olt}</TableCell>
                    <TableCell className="font-bold">{olt.totals.grandTotal}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>

        {/* FTM Card */}
        <Card>
          <CardHeader>
            <CardTitle>{ftm.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                   {ftm.headers.map(h => <TableHead key={h}>{h}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {ftm.rows.map(row => (
                  <TableRow key={row.serviceArea}>
                    <TableCell className="font-medium">{row.serviceArea}</TableCell>
                    <TableCell>{row.ea}</TableCell>
                    <TableCell>{row.oa}</TableCell>
                    <TableCell className="font-bold">{row.grandTotal}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
               <TableFooter>
                <TableRow>
                    <TableCell className="font-bold">Grand Total</TableCell>
                    <TableCell className="font-bold">{ftm.totals.ea}</TableCell>
                    <TableCell className="font-bold">{ftm.totals.oa}</TableCell>
                    <TableCell className="font-bold">{ftm.totals.grandTotal}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>

        {/* ODC Card */}
        <Card>
          <CardHeader>
            <CardTitle>{odc.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  {odc.headers.map(h => <TableHead key={h}>{h}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {odc.rows.map(row => (
                  <TableRow key={row.serviceArea}>
                    <TableCell className="font-medium">{row.serviceArea}</TableCell>
                    <TableCell className="font-bold">{row.jumlah}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
               <TableFooter>
                <TableRow>
                    <TableCell className="font-bold">Grand Total</TableCell>
                    <TableCell className="font-bold">{odc.totals.jumlah}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>
        
        {/* ODP Card */}
        <Card>
          <CardHeader>
            <CardTitle>{odp.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                   {odp.headers.map(h => <TableHead key={h}>{h}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {odp.rows.map(row => (
                  <TableRow key={row.serviceArea}>
                    <TableCell className="font-medium">{row.serviceArea}</TableCell>
                    <TableCell className="font-bold">{row.jumlah}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                    <TableCell className="font-bold">Grand Total</TableCell>
                    <TableCell className="font-bold">{odp.totals.jumlah}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
