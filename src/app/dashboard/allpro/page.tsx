'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ArrowLeft, Wrench } from 'lucide-react';

export default function AllproPage() {
  const router = useRouter();

  return (
    <div className="mx-auto grid w-full flex-1 auto-rows-max gap-6">
      <div className="flex items-center gap-4">
        <Button onClick={() => router.push('/dashboard')} variant="outline" size="icon" className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Kembali</span>
        </Button>
        <div>
          <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-bold tracking-tight sm:grow-0">
            Aplikasi ALLPRO
          </h1>
        </div>
      </div>
      <Card className="text-center py-20">
        <CardHeader>
          <div className="mx-auto mb-4 bg-primary/10 text-primary p-4 rounded-full w-fit">
            <Wrench className="h-12 w-12" />
          </div>
          <CardTitle>Segera Hadir</CardTitle>
          <CardDescription className="max-w-md mx-auto">
            Fitur dan fungsionalitas untuk Aplikasi ALLPRO sedang dalam tahap pengembangan. Terima kasih atas kesabaran Anda.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => router.push('/dashboard')}>
            Kembali ke Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
