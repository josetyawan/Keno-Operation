'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Loader2, AlertTriangle } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { NetworkAsset } from '@/lib/types';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

function MapView() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const firestore = useFirestore();
    const [statusMessage, setStatusMessage] = useState('Mempersiapkan peta...');

    const serviceArea = searchParams.get('serviceArea');

    const assetsQuery = useMemoFirebase(() => {
        if (!serviceArea || serviceArea === 'all') {
            setStatusMessage('Pilih Service Area terlebih dahulu untuk melihat peta.');
            return null;
        };
        return query(collection(firestore, 'network-assets'), where('serviceArea', '==', serviceArea));
    }, [firestore, serviceArea]);

    const { data: allAssets, isLoading } = useCollection<NetworkAsset>(assetsQuery);

    useEffect(() => {
        if (isLoading) {
            setStatusMessage('Memuat data aset...');
            return;
        }

        if (!allAssets) return;
        
        const assetsWithCoords = allAssets.filter(asset => asset.coordinates && asset.coordinates.includes(','));
        
        if (assetsWithCoords.length === 0) {
            setStatusMessage(`Tidak ditemukan aset dengan data koordinat di Service Area ${serviceArea}.`);
            return;
        }

        setStatusMessage(`Mengarahkan Anda ke Google Maps untuk ${assetsWithCoords.length} aset...`);

        const baseUrl = 'https://www.google.com/maps/dir/';

        const coordsString = assetsWithCoords
            .map(asset => asset.coordinates?.replace(/\s/g, ''))
            .join('/');

        const finalUrl = baseUrl + coordsString;
        
        window.open(finalUrl, '_blank');
        router.back();

    }, [allAssets, isLoading, serviceArea, router]);

    return (
        <div className="mx-auto grid w-full flex-1 auto-rows-max gap-6">
            <div className="flex items-center gap-4">
                <Button onClick={() => router.back()} variant="outline" size="icon" className="h-8 w-8">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Kembali</span>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Membuka Peta Aset: {serviceArea}</h1>
                </div>
            </div>
            <Card>
                <CardContent className="flex flex-col items-center justify-center p-10 text-center gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="text-muted-foreground">{statusMessage}</p>
                    <p className="text-sm text-muted-foreground mt-4">
                        Jika tab baru tidak terbuka, pastikan browser Anda mengizinkan pop-up.
                    </p>
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
