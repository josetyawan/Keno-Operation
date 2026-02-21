'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/firebase';
import { Adsense } from '@/components/adsense';
import { Loader2 } from 'lucide-react';
import { Logo } from '@/components/logo';

export default function GoodbyePage() {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    const performLogout = async () => {
      if (auth.currentUser) {
        await auth.signOut();
      }
      // Redirect to login after a short delay to allow the ad to be seen
      setTimeout(() => {
        router.push('/login');
      }, 3000); // 3-second delay
    };

    performLogout();
  }, [auth, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center">
      <Logo />
      <h1 className="text-2xl font-bold mt-8 mb-2">Terima Kasih!</h1>
      <p className="text-muted-foreground mb-6">Anda sedang dalam proses keluar dari aplikasi.</p>
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-8" />
      
      <div className="w-full max-w-lg">
        <p className="text-sm text-muted-foreground mb-2">Iklan:</p>
        <div className="border p-2 rounded-md">
            <Adsense
                data-ad-client="ca-pub-6478281232505590"
                data-ad-slot="YOUR_AD_SLOT_ID_GOODBYE"
                data-ad-format="auto"
                data-full-width-responsive="true"
            />
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-8">
        Anda akan diarahkan ke halaman login secara otomatis.
      </p>
    </div>
  );
}
