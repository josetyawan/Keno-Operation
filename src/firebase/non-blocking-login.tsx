'use client';
import {
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  UserCredential,
  type User,
} from 'firebase/auth';
import { doc, setDoc, Firestore } from 'firebase/firestore';

interface SignUpDetails {
    email: string;
    nik?: string; // Now optional
    phone?: string; // Now optional
}

async function createUserDocument(firestore: Firestore, user: User, details: SignUpDetails) {
    const userDocRef = doc(firestore, 'users', user.uid);
    
    // Create a minimal user document, only with fields required by security rules
    // to ensure the creation process is robust.
    const userData = {
        id: user.uid,
        email: user.email || '',
        displayName: user.email?.split('@')[0] || 'User Baru', // Set a default display name
        role: 'user', // Default role
        registrationStatus: 'pending', // Always start as 'pending'
    };

    await setDoc(userDocRef, userData);
}

/**
 * Signs up a user with email and password and creates their user document.
 */
export async function signUpWithEmail(auth: Auth, firestore: Firestore, password: string, details: SignUpDetails): Promise<UserCredential> {
  const userCredential = await createUserWithEmailAndPassword(auth, details.email, password);
  try {
    // Creates the user document with minimal information
    await createUserDocument(firestore, userCredential.user, details);
  } catch (firestoreError) {
    console.error("Kritis: Gagal membuat dokumen pengguna di Firestore setelah pembuatan pengguna di Auth.", firestoreError);
    // Hapus pengguna auth jika pembuatan dokumen gagal untuk menghindari akun yatim piatu.
    await userCredential.user.delete();
    throw firestoreError;
  }
  return userCredential;
}

/**
 * Signs in a user with email and password.
 */
export async function signInWithEmail(auth: Auth, email: string, password: string): Promise<UserCredential> {
  return signInWithEmailAndPassword(auth, email, password);
}
