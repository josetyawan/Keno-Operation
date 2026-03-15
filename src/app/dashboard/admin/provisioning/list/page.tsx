'use client';

import { Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, type QueryConstraint } from 'firebase/firestore';
import type { ProvisioningRecord } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

function ProvisioningList() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const firestore = useFirestore();

    const filters = useMemo(() => {
        const f: { key: string; value: string }[] = [];
        if (searchParams.get('productName')) f.push({ key: 'productName', value: searchParams.get('productName')! });
        if (searchParams.get('status')) f.push({ key: 'status', value: searchParams.get('status')! });
        if (searchParams.get('crmOrder')) f.push({ key: 'crmOrder', value: searchParams.get('crmOrder')! });
        if (searchParams.get('description')) f.push({ key: 'description', value: searchParams.get('description')! });
        if (searchParams.get('workzone')) f.push({ key: 'workzone', value: searchParams.get('workzone')! });
        return f;
    }, [searchParams]);

    const recordsQuery = useMemoFirebase(() => {
        if (filters.length === 0) return null;
        const constraints: QueryConstraint[] = filters.map(f => where(f.key, '==', f.value));
        return query(collection(firestore, 'provisioning-records'), ...constraints);
    }, [firestore, filters]);

    const { data: records, isLoading } = useCollection<ProvisioningRecord>(recordsQuery);
    
    const title = `Detail Laporan untuk ${filters.map(f => f.value).join(', ')}`;
    const description = `Menampilkan ${records?.length || 0} hasil.`;

    return (
        <div className="mx-auto grid w-full flex-1 auto-rows-max gap-6">
            <div className="flex items-center gap-4">
                <Button onClick={() => router.back()} variant="outline" size="icon" className="h-8 w-8">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Kembali</span>
                </Button>
                <div>
                    <h1 className="text-xl font-bold tracking-tight">{title}</h1>
                    <p className="text-muted-foreground text-sm">{description}</p>
                </div>
            </div>
            <Card>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Workorder</TableHead>
                                    <TableHead>SC Order</TableHead>
                                    <TableHead>Service No.</TableHead>
                                    <TableHead>Customer Name</TableHead>
                                    <TableHead>Address</TableHead>
                                    <TableHead>Date Created</TableHead>
                                    <TableHead>Booking Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell colSpan={7}><Skeleton className="h-5 w-full" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : records && records.length > 0 ? (
                                    records.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell>{item.workorder}</TableCell>
                                            <TableCell>{item.scOrder}</TableCell>
                                            <TableCell>{item.serviceNo}</TableCell>
                                            <TableCell>{item.customerName}</TableCell>
                                            <TableCell className="max-w-xs truncate">{item.address}</TableCell>
                                            <TableCell>{item.dateCreated}</TableCell>
                                            <TableCell>{item.bookingDate}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center">
                                            Tidak ada data yang cocok dengan filter ini.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default function ProvisioningListPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-full"><Loader2 className="animate-spin h-8 w-8" /></div>}>
            <ProvisioningList />
        </Suspense>
    );
}