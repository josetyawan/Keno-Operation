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
  const [signupError, setSignupError] = useState<string | null>(null); // New state for error message
  
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
    setSignupError(null); // Reset error on new attempt
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
    } catch (error) {
        let title = 'Pendaftaran Gagal';
        let description = 'Terjadi kesalahan. Silakan coba lagi.';
        if (error instanceof FirebaseError) {
          switch (error.code) {
            case 'auth/email-already-in-use':
              title = 'Email Sudah Terdaftar';
              description = 'Email ini sudah digunakan. Silakan login.';
              // Special case for toast with action
              toast({
                  variant: 'destructive',
                  title: title,
                  description: description,
                  action: ( <ToastAction altText="Login"><Link href="/login">Login</Link></ToastAction> ),
              });
              setIsLoading(false);
              return; // Exit early
            case 'auth/weak-password':
              title = 'Password Lemah';
              description = 'Password harus terdiri dari minimal 6 karakter.';
              break;
            case 'auth/invalid-email':
              title = 'Email Tidak Valid';
              description = 'Mohon masukkan alamat email yang valid.';
              break;
            case 'auth/user-document-creation-failed':
              title = 'Gagal Membuat Profil di Database';
              description = `Akun Anda berhasil dibuat di sistem otentikasi, tetapi gagal disimpan ke database. Ini hampir pasti disebabkan oleh Aturan Keamanan (Security Rules) Firestore yang salah atau belum diperbarui. Pastikan aturan telah diterapkan dengan benar di Firebase Console. Pesan error asli: ${(error as FirebaseError).message}`;
              break;
            default:
              description = `Terjadi kesalahan saat pendaftaran. (${error.code})`;
              break;
          }
        } else if (error instanceof Error) {
            description = error.message;
        }

        // Set the state to display the error prominently on the page
        setSignupError(description);
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
