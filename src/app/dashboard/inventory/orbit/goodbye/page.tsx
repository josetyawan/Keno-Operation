'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Adsense } from '@/components/adsense';
import { Loader2 } from 'lucide-react';
import { Logo } from '@/components/logo';

export default function OrbitGoodbyePage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/dashboard');
    }, 4000); // 4-second delay

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center">
      <Logo />
      <h1 className="text-2xl font-bold mt-8 mb-2">Terima Kasih!</h1>
      <p className="text-muted-foreground mb-6">Anda akan diarahkan kembali ke Dashboard.</p>
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-8" />
      
      <div className="w-full max-w-lg">
        <p className="text-sm text-muted-foreground mb-2">Iklan:</p>
        <div className="border p-2 rounded-md">
            <Adsense
                data-ad-client="ca-pub-6478281232505590"
                data-ad-slot="GANTI_DENGAN_ID_SLOT_GOODBYE"
                data-ad-format="auto"
                data-full-width-responsive="true"
            />
        </div>
      </div>
    </div>
  );
}
