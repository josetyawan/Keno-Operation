'use client';

import { Suspense, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Loader2, AlertTriangle } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { NetworkAsset } from '@/lib/types';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

// Google Maps URL can get very long. Let's set a reasonable limit.
const MAX_WAYPOINTS = 100; 

function MapView() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const firestore = useFirestore();

    const serviceArea = searchParams.get('serviceArea');

    const assetsQuery = useMemoFirebase(() => {
        if (!serviceArea) return null;
        return query(collection(firestore, 'network-assets'), where('serviceArea', '==', serviceArea));
    }, [firestore, serviceArea]);

    const { data: allAssets, isLoading } = useCollection<NetworkAsset>(assetsQuery);

    useEffect(() => {
        if (isLoading || !allAssets || !serviceArea) {
            return; // Wait until data is loaded
        }

        const assetsWithCoords = allAssets.filter(asset => asset.coordinates && asset.coordinates.includes(','));
        
        if (assetsWithCoords.length === 0) {
            // No assets to show, don't redirect. The component will render a message.
            return;
        }

        // Take a slice to respect the waypoint limit
        const assetsForMap = assetsWithCoords.slice(0, MAX_WAYPOINTS);

        // The base URL for Google Maps directions. This will show all points on the map.
        const baseUrl = 'https://www.google.com/maps/dir/';

        // Create the path string with all coordinates.
        // Format: /lat,lng/lat,lng/lat,lng
        const coordsString = assetsForMap
            .map(asset => asset.coordinates?.replace(/\s/g, '')) // "lat, lng" -> "lat,lng"
            .join('/');

        const finalUrl = baseUrl + coordsString;

        // Redirect the user to the Google Maps URL in a new tab.
        window.open(finalUrl, '_blank');

        // Go back to the previous page in the current tab.
        router.back();

    }, [allAssets, isLoading, serviceArea, router]);

    // This content will be shown briefly while redirecting, or if there's no data.
    return (
        <div className="mx-auto grid w-full flex-1 auto-rows-max gap-6">
            <div className="flex items-center gap-4">
                <Button onClick={() => router.back()} variant="outline" size="icon" className="h-8 w-8">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Kembali</span>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Membuka Peta Aset: {serviceArea}</h1>
                    <p className="text-muted-foreground">Mengarahkan Anda ke Google Maps...</p>
                </div>
            </div>
            <Card>
                <CardContent className="flex flex-col items-center justify-center p-10 text-center gap-4">
                    {isLoading ? (
                        <>
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                            <p className="text-muted-foreground">Memuat data aset...</p>
                        </>
                    ) : (!allAssets || allAssets.filter(a => a.coordinates && a.coordinates.includes(',')).length === 0) ? (
                        <>
                             <AlertTriangle className="h-12 w-12 text-destructive" />
                             <p className="font-semibold">Tidak Ada Data Lokasi</p>
                             <p className="text-muted-foreground">
                                Tidak ditemukan aset dengan data koordinat di Service Area ini.
                            </p>
                        </>
                    ) : (
                         <>
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                            <p className="text-muted-foreground">
                                Jika tab baru tidak terbuka, pastikan browser Anda mengizinkan pop-up.
                            </p>
                             {allAssets.filter(a => a.coordinates && a.coordinates.includes(',')).length > MAX_WAYPOINTS && (
                                 <Alert variant="destructive" className="mt-4">
                                     <AlertTriangle className="h-4 w-4" />
                                     <AlertTitle>Peringatan</AlertTitle>
                                     <AlertDescription>
                                         Jumlah aset melebihi batas {MAX_WAYPOINTS}. Hanya {MAX_WAYPOINTS} aset pertama yang akan ditampilkan di Google Maps.
                                     </AlertDescription>
                                 </Alert>
                             )}
                         </>
                    )}
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
                <CardContent className="flex justify-center items-center p-10">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </CardContent>
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
