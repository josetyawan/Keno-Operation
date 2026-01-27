'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/components/auth-layout';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useFirestore, useUser, signUpWithEmail } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { FirebaseError } from 'firebase/app';
import { ToastAction } from '@/components/ui/toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signupError, setSignupError] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError(null);
    if (!email || !password) {
        setSignupError('Mohon isi Email dan Password.');
        return;
    }
    setIsLoading(true);
    try {
      await signUpWithEmail(auth, firestore, password, { email });
      toast({
        title: 'Pendaftaran Berhasil!',
        description: 'Akun Anda sedang menunggu persetujuan dari admin. Anda akan dialihkan ke halaman login.',
      });
      router.push('/login');
    } catch (error: any) {
        // Log the full error to the console for debugging
        console.error("SIGNUP_PAGE_ERROR:", error);

        // Always display the error message directly in the UI
        setSignupError(error.message || 'Terjadi kesalahan yang tidak diketahui.');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <form onSubmit={handleSignUp}>
        <div className="grid gap-4">
          
          {signupError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Pendaftaran Gagal</AlertTitle>
              <AlertDescription>
                {signupError}
              </AlertDescription>
            </Alert>
          )}
          
          <div className="grid gap-2">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" type="email" placeholder="email@contoh.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password *</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={isUserLoading || isLoading}>
            {isLoading ? 'Mendaftarkan...' : 'Daftar Akun'}
          </Button>
        </div>
      </form>
      <div className="mt-4 text-center text-sm">
        Sudah punya akun?{' '}
        <Link href="/login" className="underline">
          Login
        </Link>
      </div>
    </AuthLayout>
  );
}
