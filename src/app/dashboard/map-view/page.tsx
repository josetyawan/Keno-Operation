'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { NetworkAsset } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { useMemo } from 'react';

const MAX_MARKERS = 200; // Limit to prevent overly long URLs

const getMarkerStyle = (assetType: NetworkAsset['assetType'], subType: NetworkAsset['subType']) => {
    if (assetType === 'OLT') {
        return subType === 'Mini OLT' 
            ? { color: 'purple', label: 'M' } 
            : { color: 'red', label: 'L' };
    }
    switch (assetType) {
        case 'ODP': return { color: 'blue', label: 'P' };
        case 'ODC': return { color: 'green', label: 'C' };
        case 'FTM': return { color: 'yellow', label: 'F' };
        default: return { color: 'gray', label: 'X' };
    }
};

function MapView() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const firestore = useFirestore();

    const serviceArea = searchParams.get('serviceArea');

    const assetsQuery = useMemoFirebase(() => {
        if (!serviceArea) return null;
        // Query only for assets in the selected service area to improve performance and reduce cost.
        return query(collection(firestore, 'network-assets'), where('serviceArea', '==', serviceArea));
    }, [firestore, serviceArea]);

    const { data: allAssets, isLoading } = useCollection<NetworkAsset>(assetsQuery);

    const { mapUrl, displayedAssets, truncated } = useMemo(() => {
        if (!allAssets || !serviceArea) {
            return { mapUrl: '', displayedAssets: [], truncated: false };
        }

        // The query now pre-filters by serviceArea, so we only need to filter for coordinates.
        const filteredAssets = allAssets.filter(asset => asset.coordinates);

        const assetsForMap = filteredAssets.slice(0, MAX_MARKERS);
        const wasTruncated = filteredAssets.length > MAX_MARKERS;

        if (assetsForMap.length === 0) {
            return { mapUrl: '', displayedAssets: [], truncated: false };
        }
        
        const markers = assetsForMap.map(asset => {
            const style = getMarkerStyle(asset.assetType, asset.subType);
            return `markers=color:${style.color}|label:${style.label}|${asset.coordinates}`;
        }).join('&');

        const url = `https://maps.googleapis.com/maps/api/staticmap?size=640x480&maptype=roadmap&${markers}`;
        
        return { mapUrl: url, displayedAssets: assetsForMap, truncated: wasTruncated };

    }, [allAssets, serviceArea]);

    if (isLoading) {
        return <MapViewSkeleton />;
    }

    if (!serviceArea) {
        return (
            <div className="text-center py-10">
                <h2 className="text-xl font-semibold">Service Area Belum Dipilih</h2>
                <p className="text-muted-foreground mt-2">
                    Silakan kembali dan pilih Service Area untuk melihat peta.
                </p>
                <Button onClick={() => router.back()} variant="outline" className="mt-4">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
                </Button>
            </div>
        );
    }
    
    return (
        <div className="mx-auto grid w-full flex-1 auto-rows-max gap-6">
            <div className="flex items-center gap-4">
                <Button onClick={() => router.back()} variant="outline" size="icon" className="h-8 w-8">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Kembali</span>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Peta Aset: {serviceArea}</h1>
                    <p className="text-muted-foreground">Tampilan visual lokasi aset jaringan.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Peta Lokasi</CardTitle>
                    {truncated && (
                        <Alert variant="destructive">
                           <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Peringatan</AlertTitle>
                            <AlertDescription>
                                Jumlah aset di area ini melebihi batas {MAX_MARKERS} untuk ditampilkan di peta. Hanya {MAX_MARKERS} aset pertama yang ditampilkan.
                            </AlertDescription>
                        </Alert>
                    )}
                </CardHeader>
                <CardContent className="flex justify-center items-center bg-muted/50">
                    {mapUrl ? (
                         <Image src={mapUrl} alt={`Peta untuk ${serviceArea}`} width={640} height={480} className="rounded-md" />
                    ) : (
                         <div className="flex flex-col items-center justify-center h-[480px] text-muted-foreground">
                            <p>Tidak ada aset dengan koordinat yang valid untuk ditampilkan di peta.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Detail Aset di Peta</CardTitle>
                    <CardDescription>Menampilkan detail untuk {displayedAssets.length} aset yang ada di peta.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tanda</TableHead>
                                <TableHead>Nama Aset</TableHead>
                                <TableHead>Tipe</TableHead>
                                <TableHead>Detail</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {displayedAssets.length > 0 ? displayedAssets.map(asset => {
                                const style = getMarkerStyle(asset.assetType, asset.subType);
                                let details = `-`;
                                if (asset.assetType === 'ODP') {
                                    details = `Kapasitas: ${asset.kapasitas || '-'} | Terpakai: ${asset.portUsed || '-'} | Kosong: ${asset.portAvai || '-'} | Cadangan: ${asset.portRsv || '-'}`;
                                } else if (asset.assetType === 'ODC') {
                                    details = `Spesifikasi: ${asset.spec || '-'}`;
                                }

                                return (
                                    <TableRow key={asset.id}>
                                        <TableCell>
                                            <div className="flex items-center justify-center w-6 h-6 rounded-full text-white font-bold text-xs" style={{ backgroundColor: style.color }}>
                                                {style.label}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-medium">{asset.name}</TableCell>
                                        <TableCell>{asset.subType !== 'N/A' ? `${asset.assetType} (${asset.subType})` : asset.assetType}</TableCell>
                                        <TableCell>{details}</TableCell>
                                    </TableRow>
                                );
                            }) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        Tidak ada data aset untuk ditampilkan.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

        </div>
    );
}

function MapViewSkeleton() {
    return (
        <div className="mx-auto grid w-full flex-1 auto-rows-max gap-6">
            <div className="flex items-center gap-4">
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-7 w-64" />
            </div>
            <Card>
                <CardHeader><Skeleton className="h-7 w-32" /></CardHeader>
                <CardContent className="flex justify-center items-center">
                    <Skeleton className="h-[480px] w-[640px]" />
                </CardContent>
            </Card>
            <Card>
                <CardHeader><Skeleton className="h-7 w-48" /></CardHeader>
                <CardContent><Skeleton className="h-32 w-full" /></CardContent>
            </Card>
        </div>
    );
}


export default function MapViewPage() {
    return (
        <Suspense fallback={<MapViewSkeleton />}>
            <MapView />
        </Suspense>
    );
}
