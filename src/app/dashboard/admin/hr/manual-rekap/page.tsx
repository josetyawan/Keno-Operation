'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { triggerDailyRekapAction } from '@/app/actions/triggerDailyRekapAction';
import { Bot, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function ManualRekapPage() {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const router = useRouter();
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();

    const { data: currentUserProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(
        useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore])
    );

    useEffect(() => {
        if (!isUserLoading && !isProfileLoading) {
            const isAdminOrKorlap = currentUserProfile?.role === 'admin' || currentUserProfile?.role === 'korlap';
            if (!user || !isAdminOrKorlap) {
                router.push('/dashboard');
            }
        }
    }, [user, currentUserProfile, isUserLoading, isProfileLoading, router]);

    const handleTrigger = async () => {
        setIsLoading(true);
        try {
            const result = await triggerDailyRekapAction();
            if (result.success) {
                toast({
                    title: 'Sukses',
                    description: result.message,
                });
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
             toast({
                variant: 'destructive',
                title: 'Gagal Mengirim Rekap',
                description: error.message || 'Terjadi kesalahan yang tidak diketahui.',
            });
        }
        setIsLoading(false);
    };

    if (isUserLoading || isProfileLoading) {
        return <div>Memuat...</div>;
    }

    return (
        <div className="mx-auto grid w-full max-w-2xl flex-1 auto-rows-max gap-6">
            <h1 className="text-3xl font-bold tracking-tight">Trigger Rekap Manual</h1>
             <Card>
                <CardHeader>
                    <CardTitle>Kirim Laporan Rekap Harian</CardTitle>
                    <CardDescription>
                        Gunakan tombol ini untuk mengirimkan rekap absensi harian secara manual ke grup Telegram.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Perhatian</AlertTitle>
                        <AlertDescription>
                           Fungsi ini akan mengambil data absensi hari ini, membuat rekap, dan langsung mengirimkannya. Pastikan Anda hanya menekannya saat diperlukan untuk menghindari spam di grup.
                        </AlertDescription>
                    </Alert>
                    <Button onClick={handleTrigger} disabled={isLoading} className="w-full mt-6" size="lg">
                        {isLoading ? <Loader2 className="mr-2 animate-spin" /> : <Bot className="mr-2" />}
                        {isLoading ? 'Mengirim...' : 'Kirim Rekap Hari Ini ke Telegram'}
                    </Button>
                </CardContent>
             </Card>
        </div>
    );
}
