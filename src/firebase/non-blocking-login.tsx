'use client';
import {
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  UserCredential,
  type User,
} from 'firebase/auth';
import { doc, setDoc, Firestore } from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';


interface SignUpDetails {
    email: string;
}

async function createUserDocument(firestore: Firestore, user: User, details: SignUpDetails) {
    const userDocRef = doc(firestore, 'users', user.uid);
    
    // Create a minimal user document that satisfies security rules and basic app functionality.
    const userData = {
        email: user.email, // Use the email from the created Auth user for consistency.
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
  } catch (firestoreError: any) {
    console.error("--- KESALAHAN KRITIS: Gagal membuat dokumen pengguna di Firestore ---");
    console.error("Pengguna Auth berhasil dibuat dengan UID:", userCredential.user.uid);
    console.error("Namun, penulisan ke path 'users/" + userCredential.user.uid + "' GAGAL.");
    console.error("Error Asli dari Firestore:", firestoreError.message);
    console.error("Ini hampir pasti disebabkan oleh Aturan Keamanan Firestore yang menolak penulisan.");
    console.error("------------------------------------------------------------------");
    
    // Hapus pengguna auth jika pembuatan dokumen gagal untuk menghindari akun yatim piatu.
    await userCredential.user.delete();
    
    // Buat error yang lebih informatif untuk dilempar kembali ke UI
    const customError = new FirebaseError(
        'auth/user-document-creation-failed',
        'Gagal membuat profil pengguna di database setelah otentikasi berhasil. Ini kemungkinan besar disebabkan oleh masalah Aturan Keamanan Firestore. Silakan hubungi admin.'
    );
    throw customError;
  }
  return userCredential;
}

/**
 * Signs in a user with email and password.
 */
export async function signInWithEmail(auth: Auth, email: string, password: string): Promise<UserCredential> {
  return signInWithEmailAndPassword(auth, email, password);
}
