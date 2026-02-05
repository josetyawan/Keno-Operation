'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/components/auth-layout';
import { useAuth, confirmPasswordResetWithCode } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { FirebaseError } from 'firebase/app';

export default function ResetPasswordPage() {
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Password Tidak Cocok',
        description: 'Pastikan password baru dan konfirmasi password sama.',
      });
      return;
    }
    if (!code) {
         toast({
            variant: 'destructive',
            title: 'Kode Diperlukan',
            description: 'Silakan masukkan kode reset dari URL email Anda.',
        });
        return;
    }

    setIsLoading(true);
    try {
      await confirmPasswordResetWithCode(auth, code, newPassword);
      toast({
        title: 'Password Berhasil Direset',
        description: 'Anda sekarang dapat login dengan password baru Anda.',
      });
      router.push('/login');
    } catch (error) {
        let title = 'Reset Gagal';
        let description = 'Terjadi kesalahan yang tidak diketahui.';
        if (error instanceof FirebaseError) {
            switch(error.code) {
                case 'auth/invalid-action-code':
                    title = 'Kode Tidak Valid';
                    description = 'Kode reset yang Anda masukkan salah atau sudah kedaluwarsa. Silakan coba minta link reset baru.';
                    break;
                case 'auth/weak-password':
                    title = 'Password Lemah';
                    description = 'Password baru Anda terlalu lemah. Harap gunakan minimal 6 karakter.';
                    break;
                 default:
                    description = `Terjadi kesalahan. (${error.code})`
                    break;
            }
        }
      toast({
        variant: 'destructive',
        title: title,
        description: description,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <form onSubmit={handleReset}>
        <div className="grid gap-2 text-center mb-6">
          <h1 className="text-3xl font-bold">Reset Password Anda</h1>
          <p className="text-balance text-muted-foreground">
            Salin kode dari link di email Anda dan masukkan password baru.
          </p>
        </div>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="code">Kode Reset</Label>
            <Input
              id="code"
              type="text"
              placeholder="Kode dari URL email"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-password">Password Baru</Label>
            <Input
              id="new-password"
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirm-password">Konfirmasi Password Baru</Label>
            <Input
              id="confirm-password"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Menyimpan...' : 'Set Password Baru'}
          </Button>
           <Button variant="outline" asChild>
                <Link href="/login">Kembali ke Login</Link>
            </Button>
        </div>
      </form>
    </AuthLayout>
  );
}
