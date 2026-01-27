'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/components/auth-layout';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useUser, signUpWithEmail, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { FirebaseError } from 'firebase/app';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { deleteUser } from 'firebase/auth';

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
      // Step 1: Create the authentication user
      const userCredential = await signUpWithEmail(auth, password, { email });
      const authUser = userCredential.user;

      // Step 2: Directly create the user document in Firestore
      const newUserDocRef = doc(firestore, 'users', authUser.uid);
      const newUserProfileData: UserProfile = {
          id: authUser.uid,
          email: authUser.email!,
          role: 'user',
          registrationStatus: 'pending',
          displayName: authUser.email?.split('@')[0] || 'New User',
          firstName: '',
          lastName: '',
          nik: '',
          phone: '',
      };
      
      await setDoc(newUserDocRef, newUserProfileData);

      // If both succeed, the useEffect will handle the redirect to the dashboard
      // where the user will see the pending approval message.

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
                    // This will now catch Firestore errors too, like 'permission-denied'
                    errorMessage = `Pendaftaran gagal: ${error.message}`;
                    break;
            }
        } else {
            errorMessage = `Pendaftaran gagal: ${error.message}`;
        }

        // Cleanup: If doc creation fails, delete the auth user so they can try again.
        if (auth.currentUser) {
            await deleteUser(auth.currentUser).catch(delErr => {
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
