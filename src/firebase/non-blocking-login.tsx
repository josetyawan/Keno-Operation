'use client';
import {
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  UserCredential,
  type User,
} from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { getApp } from 'firebase/app';

interface SignUpDetails {
    email: string;
    nik: string;
    phone: string;
}

async function createUserDocument(user: User, details: SignUpDetails) {
    const app = getApp();
    const db = getFirestore(app);
    const userDocRef = doc(db, 'users', user.uid);
    
    const userData = {
        id: user.uid,
        email: user.email || '',
        nik: details.nik,
        phone: details.phone,
        firstName: '',
        lastName: '',
        displayName: user.email?.split('@')[0] || 'User Baru',
        role: 'user',
        registrationStatus: 'pending', // Pengguna baru dimulai sebagai 'pending'
    };

    await setDoc(userDocRef, userData);
}

/**
 * Signs up a user with email and password and creates their user document.
 */
export async function signUpWithEmail(auth: Auth, password: string, details: SignUpDetails): Promise<UserCredential> {
  const userCredential = await createUserWithEmailAndPassword(auth, details.email, password);
  try {
    await createUserDocument(userCredential.user, details);
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
