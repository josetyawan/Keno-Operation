'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase/init';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { Storage } from 'firebase/storage';
import { Skeleton } from '@/components/ui/skeleton';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

interface FirebaseServices {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  storage: Storage;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const [firebaseServices, setFirebaseServices] = useState<FirebaseServices | null>(null);

  useEffect(() => {
    // This effect runs only on the client, after the component has mounted.
    // This is the safe place to initialize Firebase.
    setFirebaseServices(initializeFirebase());
  }, []);

  if (!firebaseServices) {
    // On the server, and on the initial client render, show a loader.
    // This ensures the server and client render the same thing initially,
    // preventing a hydration mismatch error.
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4 w-full max-w-md p-8">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2 w-full">
            <Skeleton className="h-6 w-3/4 mx-auto" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
      </div>
    );
  }

  // Once Firebase is initialized on the client, render the actual app.
  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
      storage={firebaseServices.storage}
    >
      {children}
    </FirebaseProvider>
  );
}
