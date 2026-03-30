
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
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, RefreshCw, Loader2, Info } from 'lucide-react';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { collection, doc, getDocs, setDoc, serverTimestamp } from 'firebase/firestore';
import type { NetworkAsset, UserProfile, NetworkStats, ServiceAreaStats } from '@/lib/types';
import { useMemo, useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { getAssetServiceArea } from '@/lib/asset-utils';
import { Adsense } from '@/components/adsense';

const PREFERRED_ORDER: NetworkAsset['serviceArea'][] = ['SA KUDUS', 'SA PATI', 'SA JEPARA', 'SA PURWODADI', 'SA BLORA', 'SA REMBANG'];

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
  const { toast } = useToast();
  const [isRecalculating, setIsRecalculating] = useState(false);

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

  const summaryDocRef = useMemoFirebase(
    () => doc(firestore, 'network-stats', 'summary'),
    [firestore]
  );
  const { data: networkStats, isLoading: areStatsLoading } = useDoc<NetworkStats>(summaryDocRef);

  const handleRecalculate = async () => {
    if (userProfile?.role !== 'admin' || userProfile?.nik !== '876858') return;
    setIsRecalculating(true);
    toast({ title: 'Memulai penghitungan ulang...', description: 'Ini mungkin membutuhkan waktu beberapa saat.' });

    try {
        const assetsCollectionRef = collection(firestore, 'network-assets');
        const assetsSnapshot = await getDocs(assetsCollectionRef);
        const allAssets = assetsSnapshot.docs.map(doc => doc.data() as NetworkAsset);
        
        const initialStats: { [key: string]: ServiceAreaStats } = PREFERRED_ORDER.reduce((acc, sa) => {
            acc[sa] = {
                olt: { miniOlt: 0, olt: 0 },
                ftm: { ea: 0, oa: 0 },
                odc: { jumlah: 0 },
                odp: { jumlah: 0 },
                mitratel: { jumlah: 0 },
                nodeB: { jumlah: 0 },
            };
            return acc;
        }, {} as { [key: string]: ServiceAreaStats });

        const newStatsByServiceArea = allAssets.reduce((acc, asset) => {
            const correctAssetSA = getAssetServiceArea(asset);
            if (correctAssetSA !== 'Unmap' && acc[correctAssetSA]) {
                const assetTypeUpper = (asset.assetType || '').toUpperCase();
                const subTypeUpper = (asset.subType || '').toUpperCase().trim();
                switch (assetTypeUpper) {
                    case 'OLT':
                        if (subTypeUpper.includes('MINI')) acc[correctAssetSA].olt.miniOlt++;
                        else acc[correctAssetSA].olt.olt++;
                        break;
                    case 'FTM':
                        if (subTypeUpper === 'EA') {
                            acc[correctAssetSA].ftm.ea++;
                        } else { // Assume if not EA, it's OA or a passive equivalent
                            acc[correctAssetSA].ftm.oa++;
                        }
                        break;
                    case 'ODC': 
                        if (acc[correctAssetSA].odc) {
                          acc[correctAssetSA].odc.jumlah++;
                        }
                        break;
                    case 'ODP': 
                        if (acc[correctAssetSA].odp) {
                          acc[correctAssetSA].odp.jumlah++; 
                        }
                        break;
                    case 'MITRATEL': 
                        if (acc[correctAssetSA].mitratel) {
                           acc[correctAssetSA].mitratel.jumlah++;
                        }
                        break;
                    case 'NODE-B': 
                        if (acc[correctAssetSA].nodeB) {
                            acc[correctAssetSA].nodeB.jumlah++;
                        }
                        break;
                }
            }
            return acc;
        }, initialStats);

        const newSummaryData: NetworkStats = {
            id: 'summary',
            lastUpdated: serverTimestamp(),
            statsByServiceArea: newStatsByServiceArea,
        };

        await setDoc(summaryDocRef, newSummaryData);

        toast({ title: 'Statistik Diperbarui!', description: `Total ${allAssets.length} aset telah dihitung ulang.` });
    } catch (error: any) {
        console.error("Failed to recalculate statistics:", error);
        toast({ variant: 'destructive', title: 'Gagal Menghitung Ulang', description: error.message });
    } finally {
        setIsRecalculating(false);
    }
  };


  const rekapData = useMemo(() => {
    const stats = networkStats?.statsByServiceArea;

    const results = {
      olt: { title: "OLT All", headers: ["Service Area", "Mini OLT", "OLT", "Grand Total"], rows: [] as any[], totals: { miniOlt: 0, olt: 0, grandTotal: 0 }},
      ftm: { title: "FTM All", headers: ["Service Area", "EA", "OA", "Grand Total"], rows: [] as any[], totals: { ea: 0, oa: 0, grandTotal: 0 }},
      odc: { title: "ODC All", headers: ["Service Area", "Jumlah ODC"], rows: [] as any[], totals: { jumlah: 0 }},
      odp: { title: "ODP All", headers: ["Service Area", "Jumlah ODP"], rows: [] as any[], totals: { jumlah: 0 }},
      mitratel: { title: "Mitratel All", headers: ["Service Area", "Jumlah Site"], rows: [] as any[], totals: { jumlah: 0 }},
      nodeB: { title: "NODE-B All", headers: ["Service Area", "Site ID"], rows: [] as any[], totals: { jumlah: 0 }},
    };
    
    if (!stats) return results;

    for (const sa of PREFERRED_ORDER) {
        const data = stats[sa];
        if (!data) continue;
        
        // OLT
        const oltMiniOlt = data.olt?.miniOlt || 0;
        const oltOlt = data.olt?.olt || 0;
        const oltRow = { serviceArea: sa, miniOlt: oltMiniOlt, olt: oltOlt, grandTotal: oltMiniOlt + oltOlt };
        results.olt.rows.push(oltRow);
        results.olt.totals.miniOlt += oltRow.miniOlt;
        results.olt.totals.olt += oltRow.olt;
        results.olt.totals.grandTotal += oltRow.grandTotal;

        // FTM
        const ftmEa = data.ftm?.ea || 0;
        const ftmOa = data.ftm?.oa || 0;
        const ftmRow = { serviceArea: sa, ea: ftmEa, oa: ftmOa, grandTotal: ftmEa + ftmOa };
        results.ftm.rows.push(ftmRow);
        results.ftm.totals.ea += ftmRow.ea;
        results.ftm.totals.oa += ftmRow.oa;
        results.ftm.totals.grandTotal += ftmRow.grandTotal;
        
        // ODC
        const odcJumlah = data.odc?.jumlah || 0;
        const odcRow = { serviceArea: sa, jumlah: odcJumlah };
        results.odc.rows.push(odcRow);
        results.odc.totals.jumlah += odcRow.jumlah;
        
        // ODP
        const odpJumlah = data.odp?.jumlah || 0;
        const odpRow = { serviceArea: sa, jumlah: odpJumlah };
        results.odp.rows.push(odpRow);
        results.odp.totals.jumlah += odpRow.jumlah;

        // Mitratel
        const mitratelJumlah = data.mitratel?.jumlah || 0;
        const mitratelRow = { serviceArea: sa, jumlah: mitratelJumlah };
        results.mitratel.rows.push(mitratelRow);
        results.mitratel.totals.jumlah += mitratelRow.jumlah;

        // NODE-B
        const nodeBJumlah = data.nodeB?.jumlah || 0;
        const nodeBRow = { serviceArea: sa, jumlah: nodeBJumlah };
        results.nodeB.rows.push(nodeBRow);
        results.nodeB.totals.jumlah += nodeBRow.jumlah;
    }
    
    return results;
  }, [networkStats]);
  
  const { olt, odc, odp, ftm, mitratel, nodeB } = rekapData;

  const isLoading = isUserLoading || isProfileLoading || areStatsLoading;
  const lastUpdated = networkStats?.lastUpdated?.toDate();
  const lastUpdatedString = lastUpdated ? formatDistanceToNow(lastUpdated, { addSuffix: true, locale: idLocale }) : 'belum pernah';

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
        <Button onClick={() => router.push('/dashboard/allpro/goodbye')} variant="outline" size="icon" className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Kembali</span>
        </Button>
        <div className="flex-grow">
          <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-bold tracking-tight sm:grow-0">
            Network Service Area
          </h1>
          <p className="text-muted-foreground text-sm">Ringkasan data OLT, ODC, ODP, dan FTM per Service Area.</p>
        </div>
         {userProfile?.role === 'admin' && userProfile?.nik === '876858' && (
            <Button onClick={handleRecalculate} disabled={isRecalculating}>
                {isRecalculating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                {isRecalculating ? 'Menghitung...' : 'Hitung Ulang Statistik'}
            </Button>
         )}
      </div>

       <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Informasi Data</AlertTitle>
          <AlertDescription>
            Data yang ditampilkan adalah ringkasan yang terakhir diperbarui: <strong>{lastUpdatedString}</strong>. Admin dapat memperbarui data menggunakan tombol "Hitung Ulang Statistik".
          </AlertDescription>
        </Alert>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Mitratel Card */}
        <Card>
          <CardHeader>
            <CardTitle>{mitratel.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  {mitratel.headers.map(h => <TableHead key={h}>{h}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {mitratel.totals.jumlah > 0 ? (
                    mitratel.rows.map(row => (
                      <TableRow key={row.serviceArea}>
                        <TableCell className="font-medium">{row.serviceArea}</TableCell>
                        <TableCell className="font-bold">
                          <Link href={`/dashboard/assets/list?assetType=MITRATEL&serviceArea=${encodeURIComponent(row.serviceArea)}`} className="hover:underline">
                            {row.jumlah}
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                ) : (
                    <TableRow><TableCell colSpan={2} className="text-center h-24">{!networkStats ? "Statistik belum dihitung." : "Tidak ada data Mitratel."}</TableCell></TableRow>
                )}
              </TableBody>
               <TableFooter>
                <TableRow>
                    <TableCell className="font-bold">Grand Total</TableCell>
                    <TableCell className="font-bold">
                      <Link href={`/dashboard/assets/list?assetType=MITRATEL`} className="hover:underline">
                        {mitratel.totals.jumlah}
                      </Link>
                    </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>
        
        {/* NODE-B Card */}
        <Card>
          <CardHeader>
            <CardTitle>{nodeB.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  {nodeB.headers.map(h => <TableHead key={h}>{h}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {nodeB.totals.jumlah > 0 ? (
                    nodeB.rows.map(row => (
                      <TableRow key={row.serviceArea}>
                        <TableCell className="font-medium">{row.serviceArea}</TableCell>
                        <TableCell className="font-bold">
                          <Link href={`/dashboard/assets/list?assetType=NODE-B&serviceArea=${encodeURIComponent(row.serviceArea)}`} className="hover:underline">
                            {row.jumlah}
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                ) : (
                    <TableRow><TableCell colSpan={2} className="text-center h-24">{!networkStats ? "Statistik belum dihitung." : "Tidak ada data NODE-B."}</TableCell></TableRow>
                )}
              </TableBody>
               <TableFooter>
                <TableRow>
                    <TableCell className="font-bold">Grand Total</TableCell>
                    <TableCell className="font-bold">
                      <Link href={`/dashboard/assets/list?assetType=NODE-B`} className="hover:underline">
                        {nodeB.totals.jumlah}
                      </Link>
                    </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>

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
                {olt.totals.grandTotal > 0 ? (
                    olt.rows.map(row => (
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
                    ))
                ) : (
                    <TableRow><TableCell colSpan={4} className="text-center h-24">{!networkStats ? "Statistik belum dihitung." : "Tidak ada data OLT."}</TableCell></TableRow>
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
                {ftm.totals.grandTotal > 0 ? (
                    ftm.rows.map(row => (
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
                    ))
                ) : (
                    <TableRow><TableCell colSpan={4} className="text-center h-24">{!networkStats ? "Statistik belum dihitung." : "Tidak ada data FTM."}</TableCell></TableRow>
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
                {odc.totals.jumlah > 0 ? (
                    odc.rows.map(row => (
                      <TableRow key={row.serviceArea}>
                        <TableCell className="font-medium">{row.serviceArea}</TableCell>
                        <TableCell className="font-bold">
                          <Link href={`/dashboard/assets/list?assetType=ODC&serviceArea=${encodeURIComponent(row.serviceArea)}`} className="hover:underline">
                            {row.jumlah}
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                ) : (
                    <TableRow><TableCell colSpan={2} className="text-center h-24">{!networkStats ? "Statistik belum dihitung." : "Tidak ada data ODC."}</TableCell></TableRow>
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
                {odp.totals.jumlah > 0 ? (
                    odp.rows.map(row => (
                      <TableRow key={row.serviceArea}>
                        <TableCell className="font-medium">{row.serviceArea}</TableCell>
                        <TableCell className="font-bold">
                          <Link href={`/dashboard/assets/list?assetType=ODP&serviceArea=${encodeURIComponent(row.serviceArea)}`} className="hover:underline">
                            {row.jumlah}
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                ) : (
                    <TableRow><TableCell colSpan={2} className="text-center h-24">{!networkStats ? "Statistik belum dihitung." : "Tidak ada data ODP."}</TableCell></TableRow>
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
      <div className="mt-8 w-full overflow-hidden">
        <Adsense
          data-ad-client="ca-pub-6478281232505590"
          data-ad-slot="5734427659"
          data-ad-format="auto"
          className="block"
          data-full-width-responsive="true"
        />
      </div>
    </div>
  );
}
