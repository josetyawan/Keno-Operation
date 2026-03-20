'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/components/auth-layout';
import { useState } from 'react';
import { useAuth, sendPasswordReset } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { FirebaseError } from 'firebase/app';
import { MailCheck } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const auth = useAuth();
  const { toast } = useToast();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
        toast({
            variant: 'destructive',
            title: 'Email Diperlukan',
            description: 'Silakan masukkan alamat email Anda.',
        });
        return;
    }
    setIsLoading(true);
    try {
      await sendPasswordReset(auth, email);
      setIsSuccess(true);
    } catch (error) {
      let title = 'Gagal Mengirim Email';
      let description = 'Terjadi kesalahan yang tidak diketahui. Silakan coba lagi.';
      if (error instanceof FirebaseError) {
        switch (error.code) {
            case 'auth/user-not-found':
                title = 'Pengguna Tidak Ditemukan';
                description = 'Tidak ada akun yang terdaftar dengan email ini.';
                break;
            case 'auth/invalid-email':
                title = 'Email Tidak Valid';
                description = 'Format alamat email yang Anda masukkan tidak benar.';
                break;
            case 'auth/network-request-failed':
                title = 'Kesalahan Jaringan';
                description = 'Tidak dapat terhubung ke layanan kami. Periksa koneksi internet Anda.';
                break;
            default:
                description = `Terjadi kesalahan. (${error.code})`;
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
      {isSuccess ? (
        <div className="text-center">
            <MailCheck className="mx-auto h-12 w-12 text-green-500 mb-4" />
          <h1 className="text-2xl font-bold mb-4">Periksa Email Anda</h1>
          <p className="text-muted-foreground mb-6">
            Kami telah mengirimkan email ke <span className="font-bold">{email}</span>. Silakan salin kode dari link di email tersebut dan gunakan di halaman reset password.
          </p>
          <Button asChild>
            <Link href="/reset-password">Ke Halaman Reset Password</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={handleReset}>
          <div className="grid gap-2 text-center mb-6">
             <h1 className="text-3xl font-bold">Lupa Password?</h1>
            <p className="text-balance text-muted-foreground">
              Masukkan email Anda dan kami akan mengirimkan tautan untuk mereset password Anda.
            </p>
          </div>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Mengirim...' : 'Kirim Tautan Reset'}
            </Button>
             <Button variant="outline" asChild>
                <Link href="/login">Kembali ke Login</Link>
            </Button>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}
