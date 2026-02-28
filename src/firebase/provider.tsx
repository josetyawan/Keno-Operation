'use client';

import React, { createContext, useContext, useMemo, useState, useEffect, type ReactNode, DependencyList } from 'react';
import { initializeFirebase } from '@/firebase/init';
import type { FirebaseApp } from 'firebase/app';
import type { Auth, User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { Storage } from 'firebase/storage';
import { Skeleton } from '@/components/ui/skeleton';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

// --- Context Shape & Creation ---
interface FirebaseContextState {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  storage: Storage;
  user: User | null;
  isUserLoading: boolean;
}

export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

// --- Provider Component ---
export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [services, setServices] = useState<{ firebaseApp: FirebaseApp; auth: Auth; firestore: Firestore; storage: Storage } | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);

  useEffect(() => {
    const { firebaseApp, auth, firestore, storage } = initializeFirebase();
    setServices({ firebaseApp, auth, firestore, storage });

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsUserLoading(false);
    }, (error) => {
      console.error("Firebase auth error in provider:", error);
      setUser(null);
      setIsUserLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Show a full-page loader if Firebase services aren't initialized yet OR if we are still waiting for the first auth state check.
  // This is the key fix: it prevents the rest of the app from rendering with a temporary "logged out" state.
  if (!services || isUserLoading) {
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

  const contextValue = {
    ...services,
    user,
    isUserLoading,
  };

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
}

// --- Hooks to consume the context ---
function useFirebaseContext() {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase hooks must be used within a FirebaseProvider.');
  }
  return context;
}

export const useFirebaseApp = (): FirebaseApp => useFirebaseContext().firebaseApp;
export const useAuth = (): Auth => useFirebaseContext().auth;
export const useFirestore = (): Firestore => useFirebaseContext().firestore;
export const useStorage = (): Storage => useFirebaseContext().storage;
export const useUser = () => {
  const { user, isUserLoading } = useFirebaseContext();
  return { user, isUserLoading, userError: null };
};

export const useFirebase = () => useFirebaseContext();

type MemoFirebase<T> = T & { __memo?: boolean };
export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | MemoFirebase<T> {
  const memoized = useMemo(factory, deps);
  if (typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  return memoized;
}
