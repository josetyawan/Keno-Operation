'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/components/auth-layout';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useUser, signUpWithEmail } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { FirebaseError } from 'firebase/app';

export default function SignupPage() {
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signUpWithEmail(auth, email, password);
      // Successful sign-up will trigger onAuthStateChanged, and the useEffect will redirect.
    } catch (error) {
        let title = 'Sign Up Failed';
        let description = 'An unexpected error occurred. Please try again.';
        if (error instanceof FirebaseError) {
          switch (error.code) {
            case 'auth/email-already-in-use':
              title = 'Email Already in Use';
              description =
                'This email address is already registered. Please login or use a different email.';
              break;
            case 'auth/weak-password':
              title = 'Weak Password';
              description = 'The password must be at least 6 characters long.';
              break;
            case 'auth/invalid-email':
              title = 'Invalid Email';
              description = 'Please enter a valid email address.';
              break;
            default:
              // This will catch other errors, like Firestore permission errors during createUserDocument
              description = `An error occurred during sign up. (${error.code})`;
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
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="m@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={isUserLoading || isLoading}>
            {isLoading ? 'Creating Account...' : 'Create an account'}
          </Button>
        </div>
      </form>
      <div className="mt-4 text-center text-sm">
        Already have an account?{' '}
        <Link href="/login" className="underline">
          Login
        </Link>
      </div>
    </AuthLayout>
  );
}
