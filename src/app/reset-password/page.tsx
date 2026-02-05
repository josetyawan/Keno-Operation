'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/components/auth-layout';
import { useAuth, confirmPasswordResetWithCode } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { FirebaseError } from 'firebase/app';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';


function ResetPasswordComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();

  const [oobCode, setOobCode] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    const code = searchParams.get('oobCode');
    if (code) {
      setOobCode(code);
      setIsVerifying(false);
    } else {
      setError('Kode reset password tidak ditemukan di URL. Pastikan Anda mengklik link yang benar dari email Anda.');
      setIsVerifying(false);
    }
  }, [searchParams]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oobCode) {
      setError('Kode reset tidak valid. Silakan coba lagi.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Password Tidak Cocok',
        description: 'Pastikan password baru dan konfirmasi password sama.',
      });
      return;
    }

    setIsLoading(true);
    try {
      await confirmPasswordResetWithCode(auth, oobCode, newPassword);
      toast({
        title: 'Password Berhasil Direset',
        description: 'Anda sekarang dapat login dengan password baru Anda.',
      });
      router.push('/login');
    } catch (firebaseError) {
        let title = 'Reset Gagal';
        let description = 'Terjadi kesalahan yang tidak diketahui.';
        if (firebaseError instanceof FirebaseError) {
            switch(firebaseError.code) {
                case 'auth/invalid-action-code':
                    title = 'Kode Tidak Valid';
                    description = 'Kode reset yang Anda gunakan salah atau sudah kedaluwarsa. Silakan minta link reset baru.';
                    break;
                case 'auth/weak-password':
                    title = 'Password Lemah';
                    description = 'Password baru Anda terlalu lemah. Harap gunakan minimal 6 karakter.';
                    break;
                 default:
                    description = `Terjadi kesalahan. (${firebaseError.code})`
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

  if (isVerifying) {
    return (
        <div className="flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-muted-foreground">Memverifikasi link...</p>
        </div>
    );
  }

  if (error) {
    return (
        <div className="text-center">
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Link Tidak Valid</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button asChild className="mt-4">
                <Link href="/forgot-password">Minta Link Baru</Link>
            </Button>
        </div>
    );
  }


  return (
    <form onSubmit={handleReset}>
      <div className="grid gap-2 text-center mb-6">
        <h1 className="text-3xl font-bold">Buat Password Baru</h1>
        <p className="text-balance text-muted-foreground">
          Masukkan password baru yang aman untuk akun Anda.
        </p>
      </div>
      <div className="grid gap-4">
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
      </div>
    </form>
  );
}

export default function ResetPasswordPage() {
    return (
        <AuthLayout>
            <Suspense fallback={<div>Loading...</div>}>
                <ResetPasswordComponent />
            </Suspense>
        </AuthLayout>
    )
}
