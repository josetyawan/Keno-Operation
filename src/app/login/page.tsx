'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/components/auth-layout';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useUser, signInWithEmail } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { FirebaseError } from 'firebase/app';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signInWithEmail(auth, email, password);
      // Successful login will trigger onAuthStateChanged, and the useEffect will redirect.
    } catch (error) {
      let title = 'Login Gagal';
      let description = 'Terjadi kesalahan yang tidak terduga. Silakan coba lagi.';
      
      if (error instanceof FirebaseError) {
        switch (error.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
            title = 'Email atau Password Salah';
            description = 'Kombinasi email dan password tidak cocok. Silakan coba lagi.';
            break;
          case 'auth/user-disabled':
            title = 'Akun Dinonaktifkan';
            description = 'Akun ini telah dinonaktifkan oleh administrator.';
            break;
          case 'auth/too-many-requests':
            title = 'Terlalu Banyak Percobaan';
            description = 'Akses ke akun ini diblokir sementara karena terlalu banyak percobaan login. Coba lagi nanti atau reset password Anda.';
            break;
          case 'auth/network-request-failed':
            title = 'Kesalahan Jaringan';
            description = 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.';
            break;
          default:
            title = 'Login Gagal';
            description = `Terjadi kesalahan: ${error.message} (kode: ${error.code})`;
            break;
        }
      }
      toast({
        variant: 'destructive',
        title,
        description,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <form onSubmit={handleLogin}>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="m@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center">
              <Label htmlFor="password">Password</Label>
              <Link href="/forgot-password" className="ml-auto inline-block text-sm underline">
                Lupa password?
              </Link>
            </div>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={isUserLoading || isLoading}>
            {isLoading ? 'Masuk...' : 'Masuk'}
          </Button>
        </div>
      </form>
      <div className="mt-4 text-center text-sm">
        Belum punya akun?{' '}
        <Link href="/signup" className="underline">
          Daftar
        </Link>
      </div>
    </AuthLayout>
  );
}
