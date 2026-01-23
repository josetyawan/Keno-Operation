'use client';
import {
  Auth, // Import Auth type for type hinting
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  // Assume getAuth and app are initialized elsewhere
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';

type ToastFunction = (options: {
  variant?: 'default' | 'destructive';
  title: string;
  description: string;
}) => void;


/** Initiate anonymous sign-in (non-blocking). */
export function initiateAnonymousSignIn(authInstance: Auth): void {
  // CRITICAL: Call signInAnonymously directly. Do NOT use 'await signInAnonymously(...)'.
  signInAnonymously(authInstance);
  // Code continues immediately. Auth state change is handled by onAuthStateChanged listener.
}

/** Initiate email/password sign-up (non-blocking). */
export function initiateEmailSignUp(authInstance: Auth, email: string, password: string, toast: ToastFunction): void {
  // CRITICAL: Call createUserWithEmailAndPassword directly. Do NOT use 'await createUserWithEmailAndPassword(...)'.
  createUserWithEmailAndPassword(authInstance, email, password)
    .catch((error: FirebaseError) => {
        let title = 'Sign Up Failed';
        let description = 'An unexpected error occurred. Please try again.';
        if (error.code === 'auth/email-already-in-use') {
            title = 'Email Already in Use';
            description = 'This email address is already registered. Please login or use a different email.';
        } else if (error.code === 'auth/weak-password') {
            title = 'Weak Password';
            description = 'The password must be at least 6 characters long.';
        }
        toast({
            variant: 'destructive',
            title,
            description,
        });
    });
}

/** Initiate email/password sign-in (non-blocking). */
export function initiateEmailSignIn(authInstance: Auth, email: string, password: string, toast: ToastFunction): void {
  // CRITICAL: Call signInWithEmailAndPassword directly. Do NOT use 'await signInWithEmailAndPassword(...)'.
  signInWithEmailAndPassword(authInstance, email, password)
    .catch((error: FirebaseError) => {
        let title = 'Login Failed';
        let description = 'An unexpected error occurred. Please try again.';
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            title = 'Invalid Credentials';
            description = 'The email or password you entered is incorrect. Please check your credentials and try again.';
        }
        toast({
            variant: 'destructive',
            title,
            description,
        });
    });
}
