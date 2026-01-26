'use client';

import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/lib/types';
import { useState, useEffect } from 'react';

export default function ProfilePage() {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [nik, setNik] = useState('');
  const [phone, setPhone] = useState('');

  // Memoize the document reference to prevent re-renders
  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile, isLoading: isFirestoreLoading } = useDoc<UserProfile>(userDocRef);

  // Populate form when user profile loads
  useEffect(() => {
    if (userProfile) {
      setFirstName(userProfile.firstName || '');
      setLastName(userProfile.lastName || '');
      setDisplayName(userProfile.displayName || '');
      setNik(userProfile.nik || '');
      setPhone(userProfile.phone || '');
    }
  }, [userProfile]);

  const isLoading = isAuthLoading || isFirestoreLoading;

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userDocRef) return;

    setIsSaving(true);
    const updatedData: Partial<UserProfile> = {
      firstName,
      lastName,
      displayName,
      nik,
      phone,
    };

    try {
      // Using updateDoc directly here since non-blocking isn't as crucial for a profile save
      await updateDoc(userDocRef, updatedData);
      toast({
        title: 'Profile Updated',
        description: 'Your profile information has been saved.',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Could not save your profile. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };


  if (isLoading) {
    return (
        <div className="mx-auto grid max-w-2xl flex-1 auto-rows-max gap-6">
             <div className="flex items-center gap-4">
                <Skeleton className="h-7 w-7 rounded-md" />
                <Skeleton className="h-7 w-48" />
             </div>
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-1/2" />
                    <Skeleton className="h-4 w-3/4" />
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="space-y-2">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                     <div className="space-y-2">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </CardContent>
            </Card>
        </div>
    )
  }

  return (
    <div className="mx-auto grid max-w-2xl flex-1 auto-rows-max gap-6">
        <div className="flex items-center gap-4">
            <Link href="/dashboard">
            <Button variant="outline" size="icon" className="h-7 w-7">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back</span>
            </Button>
            </Link>
            <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0 font-headline">
                Edit Profile
            </h1>
            {userProfile?.role === 'admin' && <Badge variant="secondary" className="ml-auto sm:ml-0">Admin</Badge>}
        </div>
      <Card>
        <form onSubmit={handleProfileUpdate}>
          <CardHeader>
            <CardTitle>Your Profile</CardTitle>
            <CardDescription>
              Update your personal details here.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="John" />
                  </div>
                   <div className="grid gap-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input id="lastName" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Doe" />
                  </div>
              </div>
               <div className="grid gap-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input id="displayName" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="john.doe" required />
              </div>
              <div className="grid gap-2">
                  <Label htmlFor="nik">NIK (Nomor Induk Pegawai)</Label>
                  <Input id="nik" value={nik} onChange={e => setNik(e.target.value)} placeholder="e.g. 12345678" />
              </div>

              <div className="grid gap-2">
                  <Label htmlFor="phone">No. HP</Label>
                  <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 08123456789" />
              </div>
              <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={user?.email || ''} readOnly disabled />
              </div>
              <Button type="submit" className="w-full" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
