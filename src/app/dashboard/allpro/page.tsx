
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
import { useMemo, useEffect } from 'react';
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

// This mapping defines which STO codes belong to which Service Area.
const SA_CODE_MAPPING: Record<string, NetworkAsset['serviceArea']> = {
    'PWB': 'SA PURWODADI', 'PURWODADI': 'SA PURWODADI', 'WRO': 'SA PURWODADI', 'WIROSARI': 'SA PURWODADI', 'TRO': 'SA PURWODADI', 'TOROH': 'SA PURWODADI', 'GBU': 'SA PURWODADI', 'GUBUNG': 'SA PURWODADI', 'GDO': 'SA PURWODADI', 'GODONG': 'SA PURWODADI',
    'CEP': 'SA BLORA', 'CEPU': 'SA BLORA', 'BLO': 'SA BLORA', 'BLORA': 'SA BLORA', 'NGA': 'SA BLORA', 'NGAWEN': 'SA BLORA', 'RDB': 'SA BLORA', 'RANDUBLATUNG': 'SA BLORA',
    'KMJ': 'SA JEPARA', 'JEPARA': 'SA JEPARA', 'JPR': 'SA JEPARA', 'BAN': 'SA JEPARA', 'BANGSRI': 'SA JEPARA', 'KEL': 'SA JEPARA', 'KELING': 'SA JEPARA', 'PEC': 'SA JEPARA', 'PECANGAAN': 'SA JEPARA',
    'KUD': 'SA KUDUS', 'KUDUS': 'SA KUDUS', 'DMA': 'SA KUDUS', 'DEMAK': 'SA KUDUS',
    'PAT': 'SA PATI', 'PATI': 'SA PATI', 'TAY': 'SA PATI', 'JWN': 'SA PATI',
    'LSE': 'SA REMBANG', 'LASEM': 'SA REMBANG', 'RBN': 'SA REMBANG', 'REMBANG': 'SA REMBANG'
};

/**
 * Determines the correct Service Area for an asset by intelligently checking its name and STO property.
 * This function is robust and handles various naming conventions.
 */
const getAssetServiceArea = (asset: NetworkAsset): NetworkAsset['serviceArea'] => {
    const upperAssetName = (asset.name || '').toUpperCase();
    const upperSto = (asset.sto || '').toUpperCase().trim();

    // Priority 1: Check if asset name contains any known STO code.
    // This is more reliable as asset names often contain the STO.
    for (const code in SA_CODE_MAPPING) {
        // Use a regex to find the code as a whole word or surrounded by common delimiters.
        const regex = new RegExp(`[\\s-_]${code}[\\s-_]|^${code}[\\s-_]|[\\s-_]${code}$|^${code}$`);
        if (regex.test(upperAssetName)) {
            return SA_CODE_MAPPING[code];
        }
    }

    // Priority 2: Check the dedicated 'sto' column from the database if name check fails.
    if (upperSto) {
       for (const code in SA_CODE_MAPPING) {
            if (upperSto.includes(code)) {
                return SA_CODE_MAPPING[code];
            }
        }
    }

    // Default fallback if no match is found anywhere.
    return 'SA KUDUS';
};


export default function AllproPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const userProfileRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  useEffect(() => {
    if (!isUserLoading && !isProfileLoading) {
      const isApproved = userProfile?.registrationStatus === 'approved';
      const hasAccess = userProfile?.role === 'admin' || userProfile?.appAccess === 'allpro' || userProfile?.appAccess === 'all';
      if (!user || !isApproved || !hasAccess) {
        router.push('/dashboard');
      }
    }
  }, [user, userProfile, isUserLoading, isProfileLoading, router]);

  const assetsQuery = useMemoFirebase(() => {
    if (isUserLoading || isProfileLoading || !user || userProfile?.registrationStatus !== 'approved') return null;
    return collection(firestore, 'network-assets');
  }, [firestore, user, userProfile?.registrationStatus, isUserLoading, isProfileLoading]);

  const { data: assets, isLoading: areAssetsLoading } = useCollection<NetworkAsset>(assetsQuery);

  const rekapData = useMemo(() => {
    const PREFERRED_ORDER: NetworkAsset['serviceArea'][] = ['SA KUDUS', 'SA PATI', 'SA JEPARA', 'SA PURWODADI', 'SA BLORA', 'SA REMBANG'];
    
    // 1. Initialize a stable structure for the dashboard
    const serviceAreaMap = PREFERRED_ORDER.reduce((acc, sa) => {
        acc[sa] = {
            olt: { miniOlt: 0, olt: 0 },
            ftm: { ea: 0, oa: 0 },
            odc: { jumlah: 0 },
            odp: { jumlah: 0 },
        };
        return acc;
    }, {} as Record<string, { olt: any; ftm: any; odc: any; odp: any; }>);

    if (assets) {
        // 2. Iterate through all assets and count them directly into the structure
        for (const asset of assets) {
            const correctAssetSA = getAssetServiceArea(asset);
            
            if (serviceAreaMap[correctAssetSA]) {
                const assetTypeUpper = (asset.assetType || '').toUpperCase();
                const subTypeUpper = (asset.subType || '').toUpperCase().trim();

                switch (assetTypeUpper) {
                    case 'OLT':
                        if (subTypeUpper.includes('MINI')) {
                            serviceAreaMap[correctAssetSA].olt.miniOlt++;
                        } else {
                            serviceAreaMap[correctAssetSA].olt.olt++;
                        }
                        break;
                    case 'FTM':
                        if (subTypeUpper === 'EA') {
                            serviceAreaMap[correctAssetSA].ftm.ea++;
                        } else {
                            // Count anything not 'EA' as 'OA' to ensure all FTMs are counted
                            serviceAreaMap[correctAssetSA].ftm.oa++;
                        }
                        break;
                    case 'ODC':
                        serviceAreaMap[correctAssetSA].odc.jumlah++;
                        break;
                    case 'ODP':
                        serviceAreaMap[correctAssetSA].odp.jumlah++;
                        break;
                }
            }
        }
    }
    
    // 3. Build the final display object from the counted data
    const results = {
      olt: { title: "OLT All", headers: ["Service Area", "Mini OLT", "OLT", "Grand Total"], rows: [] as any[], totals: { miniOlt: 0, olt: 0, grandTotal: 0 }},
      ftm: { title: "FTM All", headers: ["Service Area", "EA", "OA", "Grand Total"], rows: [] as any[], totals: { ea: 0, oa: 0, grandTotal: 0 }},
      odc: { title: "ODC All", headers: ["Service Area", "Jumlah ODC"], rows: [] as any[], totals: { jumlah: 0 }},
      odp: { title: "ODP All", headers: ["Service Area", "Jumlah ODP"], rows: [] as any[], totals: { jumlah: 0 }},
    };
    
    for (const sa of PREFERRED_ORDER) {
        const data = serviceAreaMap[sa];
        
        // OLT
        const oltRow = { serviceArea: sa, miniOlt: data.olt.miniOlt, olt: data.olt.olt, grandTotal: data.olt.miniOlt + data.olt.olt };
        results.olt.rows.push(oltRow);
        results.olt.totals.miniOlt += oltRow.miniOlt;
        results.olt.totals.olt += oltRow.olt;
        results.olt.totals.grandTotal += oltRow.grandTotal;

        // FTM
        const ftmRow = { serviceArea: sa, ea: data.ftm.ea, oa: data.ftm.oa, grandTotal: data.ftm.ea + data.ftm.oa };
        results.ftm.rows.push(ftmRow);
        results.ftm.totals.ea += ftmRow.ea;
        results.ftm.totals.oa += ftmRow.oa;
        results.ftm.totals.grandTotal += ftmRow.grandTotal;
        
        // ODC
        const odcRow = { serviceArea: sa, jumlah: data.odc.jumlah };
        results.odc.rows.push(odcRow);
        results.odc.totals.jumlah += odcRow.jumlah;
        
        // ODP
        const odpRow = { serviceArea: sa, jumlah: data.odp.jumlah };
        results.odp.rows.push(odpRow);
        results.odp.totals.jumlah += odpRow.jumlah;
    }
    
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
