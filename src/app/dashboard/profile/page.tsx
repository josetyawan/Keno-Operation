'use client';

import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { UserProfile } from '@/lib/types';

export default function ProfilePage() {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();

  // Memoize the document reference to prevent re-renders
  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile, isLoading: isFirestoreLoading } = useDoc<UserProfile>(userDocRef);

  const isLoading = isAuthLoading || isFirestoreLoading;

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
                        <Skeleton className="h-5 w-full" />
                    </div>
                     <div className="space-y-2">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-5 w-full" />
                    </div>
                     <div className="space-y-2">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-5 w-full" />
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
            User Profile
            </h1>
        </div>
      <Card>
        <CardHeader>
          <CardTitle>Authentication & Database Details</CardTitle>
          <CardDescription>
            This page demonstrates the connection between Firebase Authentication and Firestore Database.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
            <div className="py-4">
                <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
                    Firebase Authentication
                    <Badge variant="secondary">Source</Badge>
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                    This data comes directly from the logged-in user object provided by Firebase Authentication.
                </p>
                <div className="space-y-1 text-sm">
                    <p><strong>User ID (UID):</strong> {user?.uid || 'N/A'}</p>
                    <p><strong>Email:</strong> {user?.email || 'N/A'}</p>
                    <p><strong>Email Verified:</strong> {user?.emailVerified ? 'Yes' : 'No'}</p>
                </div>
            </div>
             <div className="py-4">
                <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
                    Firestore Database
                    <Badge variant="secondary">Source</Badge>
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                   This data is fetched from the `/users/{user.uid}` document in your Firestore database.
                </p>
                {userProfile ? (
                     <div className="space-y-1 text-sm">
                        <p><strong>Document ID:</strong> {userProfile.id}</p>
                        <p><strong>Email:</strong> {userProfile.email}</p>
                        <p><strong>First Name:</strong> {userProfile.firstName || <span className="text-muted-foreground italic">Not set</span>}</p>
                        <p><strong>Last Name:</strong> {userProfile.lastName || <span className="text-muted-foreground italic">Not set</span>}</p>
                        <p><strong>Role:</strong> <Badge variant={userProfile.role === 'admin' ? 'default' : 'secondary'}>{userProfile.role}</Badge></p>
                    </div>
                ): (
                    <p className="text-sm text-destructive">Could not find a user profile document in Firestore.</p>
                )}
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
