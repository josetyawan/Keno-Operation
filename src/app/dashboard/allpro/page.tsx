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
import Link from 'next/link';

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
    if (isUserLoading || isProfileLoading || !user || !userProfile || userProfile.registrationStatus !== 'approved') return null;
    return collection(firestore, 'network-assets');
  }, [firestore, user, userProfile, isUserLoading, isProfileLoading]);

  const { data: assets, isLoading: areAssetsLoading } = useCollection<NetworkAsset>(assetsQuery);

  const rekapData = useMemo(() => {
    const PREFERRED_ORDER = ['SA KUDUS', 'SA PATI', 'SA JEPARA', 'SA PURWODADI', 'SA BLORA', 'SA REMBANG'];

    // 1. Initialize a results object with the final structure, with all counts at 0.
    const results = {
      olt: { title: "OLT All", headers: ["Service Area", "Mini OLT", "OLT", "Grand Total"], rows: PREFERRED_ORDER.map(sa => ({ serviceArea: sa, miniOlt: 0, olt: 0, grandTotal: 0})), totals: { miniOlt: 0, olt: 0, grandTotal: 0 }},
      ftm: { title: "FTM All", headers: ["Service Area", "EA", "OA", "Grand Total"], rows: PREFERRED_ORDER.map(sa => ({ serviceArea: sa, ea: 0, oa: 0, grandTotal: 0})), totals: { ea: 0, oa: 0, grandTotal: 0 }},
      odc: { title: "ODC All", headers: ["Service Area", "Jumlah ODC"], rows: PREFERRED_ORDER.map(sa => ({ serviceArea: sa, jumlah: 0})), totals: { jumlah: 0 }},
      odp: { title: "ODP All", headers: ["Service Area", "Jumlah ODP"], rows: PREFERRED_ORDER.map(sa => ({ serviceArea: sa, jumlah: 0})), totals: { jumlah: 0 }},
    };

    if (assets) {
      // 2. Loop through every asset from the database.
      for (const asset of assets) {
        // Normalize the service area from the asset data to make matching robust.
        const sa = asset.serviceArea?.trim().toUpperCase();
        // Find the index in our predefined order.
        const saIndex = PREFERRED_ORDER.indexOf(sa);
        
        // 3. Only count assets that belong to a known service area.
        if (saIndex !== -1) {
          switch (asset.assetType) {
            case 'OLT':
              if (asset.subType === 'Mini OLT') {
                results.olt.rows[saIndex].miniOlt++;
              } else { // Anything else (OLT, N/A, undefined) is counted as a regular OLT.
                results.olt.rows[saIndex].olt++;
              }
              break;
            case 'FTM':
              if (asset.subType === 'EA') {
                results.ftm.rows[saIndex].ea++;
              } else if (asset.subType === 'OA') {
                results.ftm.rows[saIndex].oa++;
              }
              break;
            case 'ODC':
              results.odc.rows[saIndex].jumlah++;
              break;
            case 'ODP':
              results.odp.rows[saIndex].jumlah++;
              break;
          }
        }
      }
    }
    
    // 4. Calculate grand totals for rows and the final footer.
    for(let i = 0; i < PREFERRED_ORDER.length; i++) {
        // OLT
        const oltRow = results.olt.rows[i];
        oltRow.grandTotal = oltRow.miniOlt + oltRow.olt;
        results.olt.totals.miniOlt += oltRow.miniOlt;
        results.olt.totals.olt += oltRow.olt;
        results.olt.totals.grandTotal += oltRow.grandTotal;

        // FTM
        const ftmRow = results.ftm.rows[i];
        ftmRow.grandTotal = ftmRow.ea + ftmRow.oa;
        results.ftm.totals.ea += ftmRow.ea;
        results.ftm.totals.oa += ftmRow.oa;
        results.ftm.totals.grandTotal += ftmRow.grandTotal;

        // ODC
        const odcRow = results.odc.rows[i];
        results.odc.totals.jumlah += odcRow.jumlah;
        
        // ODP
        const odpRow = results.odp.rows[i];
        results.odp.totals.jumlah += odpRow.jumlah;
    }
    
    // Do not filter out rows. Display all service areas even if the count is zero.
    // This keeps the UI consistent and shows what is empty vs. what has data.

    return results;
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
                    <TableCell>
                      <Link href={`/dashboard/assets/list?assetType=OLT&subType=Mini%20OLT&serviceArea=${encodeURIComponent(row.serviceArea)}`} className="hover:underline">
                        {row.miniOlt}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/dashboard/assets/list?assetType=OLT&subType=OLT&serviceArea=${encodeURIComponent(row.serviceArea)}`} className="hover:underline">
                        {row.olt}
                      </Link>
                    </TableCell>
                    <TableCell className="font-bold">
                      <Link href={`/dashboard/assets/list?assetType=OLT&serviceArea=${encodeURIComponent(row.serviceArea)}`} className="hover:underline">
                        {row.grandTotal}
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                 {olt.rows.filter(r => r.grandTotal > 0).length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center h-24">Tidak ada data OLT</TableCell></TableRow>
                )}
              </TableBody>
              <TableFooter>
                <TableRow>
                    <TableCell className="font-bold">Grand Total</TableCell>
                    <TableCell className="font-bold">
                       <Link href={`/dashboard/assets/list?assetType=OLT&subType=Mini%20OLT`} className="hover:underline">
                        {olt.totals.miniOlt}
                      </Link>
                    </TableCell>
                    <TableCell className="font-bold">
                      <Link href={`/dashboard/assets/list?assetType=OLT&subType=OLT`} className="hover:underline">
                        {olt.totals.olt}
                      </Link>
                    </TableCell>
                    <TableCell className="font-bold">
                      <Link href={`/dashboard/assets/list?assetType=OLT`} className="hover:underline">
                        {olt.totals.grandTotal}
                      </Link>
                    </TableCell>
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
                    <TableCell>
                      <Link href={`/dashboard/assets/list?assetType=FTM&subType=EA&serviceArea=${encodeURIComponent(row.serviceArea)}`} className="hover:underline">
                        {row.ea}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/dashboard/assets/list?assetType=FTM&subType=OA&serviceArea=${encodeURIComponent(row.serviceArea)}`} className="hover:underline">
                        {row.oa}
                      </Link>
                    </TableCell>
                    <TableCell className="font-bold">
                      <Link href={`/dashboard/assets/list?assetType=FTM&serviceArea=${encodeURIComponent(row.serviceArea)}`} className="hover:underline">
                        {row.grandTotal}
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                 {ftm.rows.filter(r => r.grandTotal > 0).length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center h-24">Tidak ada data FTM</TableCell></TableRow>
                )}
              </TableBody>
               <TableFooter>
                <TableRow>
                    <TableCell className="font-bold">Grand Total</TableCell>
                    <TableCell className="font-bold">
                      <Link href={`/dashboard/assets/list?assetType=FTM&subType=EA`} className="hover:underline">
                        {ftm.totals.ea}
                      </Link>
                    </TableCell>
                    <TableCell className="font-bold">
                      <Link href={`/dashboard/assets/list?assetType=FTM&subType=OA`} className="hover:underline">
                        {ftm.totals.oa}
                      </Link>
                    </TableCell>
                    <TableCell className="font-bold">
                      <Link href={`/dashboard/assets/list?assetType=FTM`} className="hover:underline">
                        {ftm.totals.grandTotal}
                      </Link>
                    </TableCell>
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
                    <TableCell className="font-bold">
                      <Link href={`/dashboard/assets/list?assetType=ODC&serviceArea=${encodeURIComponent(row.serviceArea)}`} className="hover:underline">
                        {row.jumlah}
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {odc.rows.filter(r => r.jumlah > 0).length === 0 && (
                    <TableRow><TableCell colSpan={2} className="text-center h-24">Tidak ada data ODC</TableCell></TableRow>
                )}
              </TableBody>
               <TableFooter>
                <TableRow>
                    <TableCell className="font-bold">Grand Total</TableCell>
                    <TableCell className="font-bold">
                      <Link href={`/dashboard/assets/list?assetType=ODC`} className="hover:underline">
                        {odc.totals.jumlah}
                      </Link>
                    </TableCell>
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
                    <TableCell className="font-bold">
                      <Link href={`/dashboard/assets/list?assetType=ODP&serviceArea=${encodeURIComponent(row.serviceArea)}`} className="hover:underline">
                        {row.jumlah}
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {odp.rows.filter(r => r.jumlah > 0).length === 0 && (
                    <TableRow><TableCell colSpan={2} className="text-center h-24">Tidak ada data ODP</TableCell></TableRow>
                )}
              </TableBody>
              <TableFooter>
                <TableRow>
                    <TableCell className="font-bold">Grand Total</TableCell>
                    <TableCell className="font-bold">
                      <Link href={`/dashboard/assets/list?assetType=ODP`} className="hover:underline">
                        {odp.totals.jumlah}
                      </Link>
                    </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
