'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/components/auth-layout';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useUser, signInWithEmail, signInWithGoogle, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { FirebaseError } from 'firebase/app';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';

const GoogleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35 11.1h-9.1v2.7h5.1c-.2 1-1.3 3.3-5.1 3.3-3.1 0-5.6-2.5-5.6-5.6s2.5-5.6 5.6-5.6c1.8 0 2.9.8 3.5 1.4l2.1-2.1C16.9 3.2 14.7 2 12.2 2 7.1 2 3 6.1 3 11.2s4.1 9.2 9.2 9.2c5.4 0 9-3.6 9-9.4c0-.6 0-1.1-.1-1.7z"></path></svg>
);

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
        const userCredential = await signInWithGoogle(auth);
        const user = userCredential.user;

        const userDocRef = doc(firestore, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
            const newUserProfileData: UserProfile = {
              id: user.uid,
              email: user.email!,
              role: 'teknisi',
              registrationStatus: 'pending',
              appAccess: 'nota',
              displayName: user.displayName || user.email?.split('@')[0],
              photoURL: user.photoURL || '',
              firstName: '',
              lastName: '',
              nik: '',
              paymentInfo: '',
              jabatan: '',
            };
            await setDoc(userDocRef, newUserProfileData);
            toast({
              title: 'Akun Dibuat',
              description: 'Akun Anda telah dibuat dan sedang menunggu persetujuan admin untuk bisa login.',
            });
        }
        // Let the main useEffect handle the redirect to dashboard
    } catch (error) {
        console.error("Google Sign-In Error", error);
        toast({
            variant: 'destructive',
            title: 'Google Sign-In Gagal',
            description: 'Tidak dapat masuk dengan Google. Silakan coba lagi.',
        });
    } finally {
        setIsLoading(false);
    }
  };

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
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                      Atau lanjutkan dengan
                  </span>
              </div>
            </div>
            <Button variant="outline" type="button" onClick={handleGoogleLogin} disabled={isLoading}>
                <GoogleIcon /> Masuk dengan Google
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
