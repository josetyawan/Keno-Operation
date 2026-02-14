'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/components/auth-layout';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, signUpWithEmail, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { FirebaseError } from 'firebase/app';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { deleteUser, type User } from 'firebase/auth';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signupError, setSignupError] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError(null);
    setIsLoading(true);

    let authUser: User | undefined; // Define here to access in catch block

    try {
      // Step 1: Create the authentication user
      const userCredential = await signUpWithEmail(auth, password, { email });
      authUser = userCredential.user;

      // Step 2: Directly create the user document in Firestore
      const newUserDocRef = doc(firestore, 'users', authUser.uid);
      const newUserProfileData: UserProfile = {
          id: authUser.uid,
          email: authUser.email!,
          role: 'user',
          registrationStatus: 'pending',
          appAccess: 'nota', // Default access level
          displayName: authUser.email?.split('@')[0] || 'New User',
          firstName: '',
          lastName: '',
          nik: '',
          phone: '',
      };
      
      // Await the database write to ensure it completes before proceeding
      await setDoc(newUserDocRef, newUserProfileData);

      // Step 3: If both succeed, sign the user out to prevent auto-login to a pending account
      if (auth.currentUser) {
        await auth.signOut();
      }

      // Step 4: Show a clear success message and redirect to the login page
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

        // Cleanup: If any step fails, delete the created auth user so they can try again.
        if (authUser) {
            await deleteUser(authUser).catch(delErr => {
                console.error("Cleanup failed: Could not delete orphaned auth user.", delErr);
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
