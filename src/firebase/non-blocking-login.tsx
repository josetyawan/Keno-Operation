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
    displayName: string;
    nik?: string;
    phone?: string;
}

async function createUserDocument(firestore: Firestore, user: User, details: SignUpDetails) {
    const userDocRef = doc(firestore, 'users', user.uid);
    
    // This now includes all the information from the new signup form.
    const userData = {
        id: user.uid,
        email: details.email,
        displayName: details.displayName,
        role: 'user', // Default role
        registrationStatus: 'pending', // Always start as 'pending'
        nik: details.nik || '', // Use provided nik or empty string
        phone: details.phone || '', // Use provided phone or empty string
    };

    // Firestore does not allow 'undefined' values.
    // The || '' ensures we always write a string.
    await setDoc(userDocRef, userData);
}

/**
 * Signs up a user with email and password and creates their user document.
 */
export async function signUpWithEmail(auth: Auth, firestore: Firestore, password: string, details: SignUpDetails): Promise<UserCredential> {
  const userCredential = await createUserWithEmailAndPassword(auth, details.email, password);
  try {
    // Creates the user document with all the details from the form
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
