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
}

async function createUserDocument(firestore: Firestore, user: User, details: SignUpDetails) {
    const userDocRef = doc(firestore, 'users', user.uid);
    
    // Create a minimal user document that satisfies security rules and basic app functionality.
    const userData = {
        email: user.email, // Use the email from the created Auth user for consistency.
        displayName: user.email, // Default display name to email, essential for UI.
        role: 'user', // Required by rule
        registrationStatus: 'pending', // Required by rule
    };

    await setDoc(userDocRef, userData);
}

/**
 * Signs up a user with email and password and creates their user document.
 */
export async function signUpWithEmail(auth: Auth, firestore: Firestore, password: string, details: SignUpDetails): Promise<UserCredential> {
  const userCredential = await createUserWithEmailAndPassword(auth, details.email, password);
  try {
    // Creates the minimal user document.
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
