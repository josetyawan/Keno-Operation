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

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nik, setNik] = useState('');
  const [phone, setPhone] = useState('');
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
    if (!nik || !phone || !email || !password) {
        toast({
            variant: 'destructive',
            title: 'Form Belum Lengkap',
            description: 'Mohon isi semua kolom yang diperlukan.',
        });
        return;
    }
    setIsLoading(true);
    try {
      await signUpWithEmail(auth, firestore, password, { email, nik, phone });
      toast({
        title: 'Pendaftaran Berhasil!',
        description: 'Akun Anda sedang menunggu persetujuan dari admin. Anda akan dialihkan ke halaman login.',
      });
      router.push('/login');
    } catch (error) {
        let title = 'Pendaftaran Gagal';
        let description = 'Terjadi kesalahan. Silakan coba lagi.';
        if (error instanceof FirebaseError) {
          switch (error.code) {
            case 'auth/email-already-in-use':
                toast({
                    variant: 'destructive',
                    title: 'Email Sudah Terdaftar',
                    description: 'Email ini sudah digunakan. Silakan login.',
                    action: (
                        <ToastAction altText="Login">
                            <Link href="/login">Login</Link>
                        </ToastAction>
                    ),
                });
                setIsLoading(false);
                return;
            case 'auth/weak-password':
              title = 'Password Lemah';
              description = 'Password harus terdiri dari minimal 6 karakter.';
              break;
            case 'auth/invalid-email':
              title = 'Email Tidak Valid';
              description = 'Mohon masukkan alamat email yang valid.';
              break;
            default:
              description = `Terjadi kesalahan saat pendaftaran. (${error.code})`;
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
      <form onSubmit={handleSignUp}>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="nik">NIK</Label>
            <Input id="nik" type="text" placeholder="Nomor Induk Kependudukan" required value={nik} onChange={(e) => setNik(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">No. HP</Label>
            <Input id="phone" type="tel" placeholder="081234567890" required value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="email@contoh.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
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
