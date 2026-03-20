'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/components/auth-layout';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, signUpWithEmail, useFirestore, signInWithGoogle } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { FirebaseError } from 'firebase/app';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { deleteUser, type User } from 'firebase/auth';

const GoogleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35 11.1h-9.1v2.7h5.1c-.2 1-1.3 3.3-5.1 3.3-3.1 0-5.6-2.5-5.6-5.6s2.5-5.6 5.6-5.6c1.8 0 2.9.8 3.5 1.4l2.1-2.1C16.9 3.2 14.7 2 12.2 2 7.1 2 3 6.1 3 11.2s4.1 9.2 9.2 9.2c5.4 0 9-3.6 9-9.4c0-.6 0-1.1-.1-1.7z"></path></svg>
);

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signupError, setSignupError] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setSignupError(null);
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
              duration: 9000,
            });
             if (auth.currentUser) await auth.signOut();
             router.push('/login');
        } else {
            // User already exists, treat as a normal login
             toast({
              title: 'Login Berhasil',
              description: 'Selamat datang kembali!',
            });
            router.push('/dashboard');
        }
    } catch (error) {
        console.error("Google Sign-In Error", error);
        setSignupError('Tidak dapat masuk dengan Google. Silakan coba lagi.');
    } finally {
        setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError(null);
    setIsLoading(true);

    let authUser: User | undefined; 

    try {
      const userCredential = await signUpWithEmail(auth, password, { email });
      authUser = userCredential.user;

      const newUserDocRef = doc(firestore, 'users', authUser.uid);
      const newUserProfileData: UserProfile = {
          id: authUser.uid,
          email: authUser.email!,
          role: 'teknisi',
          registrationStatus: 'pending',
          appAccess: 'nota',
          displayName: authUser.email?.split('@')[0] || 'User Baru',
          firstName: '',
          lastName: '',
          nik: '',
          paymentInfo: '',
          jabatan: '',
      };
      
      await setDoc(newUserDocRef, newUserProfileData);

      if (auth.currentUser) {
        await auth.signOut();
      }

      toast({
        title: 'Pendaftaran Berhasil!',
        description: 'Akun Anda telah dibuat. Silakan login setelah akun Anda disetujui oleh admin.',
        duration: 9000,
      });

      router.push('/login');

    } catch (error: any) {
        let errorMessage = 'Terjadi kesalahan yang tidak diketahui.';
        if (error instanceof FirebaseError) {
            switch(error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'Email ini sudah terdaftar. Silakan gunakan email lain atau login.';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'Password terlalu lemah. Harap gunakan minimal 6 karakter.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Format email tidak valid.';
                    break;
                default:
                    errorMessage = `Pendaftaran gagal: ${error.message}`;
                    break;
            }
        } else {
            errorMessage = `Pendaftaran gagal: ${error.message}`;
        }

        if (authUser) {
            await deleteUser(authUser).catch(delErr => {
                console.error("Gagal membersihkan user:", delErr);
                errorMessage += " Gagal melakukan pembersihan otomatis, harap hubungi admin."
            });
        }
        
        setSignupError(errorMessage);
        console.error("SIGNUP_PAGE_ERROR:", error);
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
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Mendaftarkan...' : 'Buat Akun'}
          </Button>
           <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                      Atau
                  </span>
              </div>
            </div>
            <Button variant="outline" type="button" onClick={handleGoogleLogin} disabled={isLoading}>
                <GoogleIcon /> Daftar dengan Google
            </Button>
        </div>
      </form>
      <div className="mt-4 text-center text-sm">
        Sudah punya akun?{' '}
        <Link href="/login" className="underline">
          Masuk
        </Link>
      </div>
    </AuthLayout>
  );
}
