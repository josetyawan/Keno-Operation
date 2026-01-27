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
    
    const userData = {
        email: user.email,
        role: 'user',
        registrationStatus: 'pending',
    };

    await setDoc(userDocRef, userData);
}

/**
 * Signs up a user with email and password and creates their user document.
 */
export async function signUpWithEmail(auth: Auth, firestore: Firestore, password: string, details: SignUpDetails): Promise<UserCredential> {
  const userCredential = await createUserWithEmailAndPassword(auth, details.email, password);
  try {
    await createUserDocument(firestore, userCredential.user, details);
  } catch (firestoreError: any) {
    // Log the detailed error to the console for debugging
    console.error("---Firestore Document Creation Failed---");
    console.error("Auth User UID:", userCredential.user.uid);
    console.error("Firestore Path:", 'users/' + userCredential.user.uid);
    console.error("Original Firestore Error:", firestoreError);
    
    // Attempt to delete the orphaned auth user
    try {
        await userCredential.user.delete();
        console.log("Orphaned auth user successfully deleted.");
    } catch (deleteError) {
        console.error("CRITICAL: Failed to delete orphaned auth user. UID:", userCredential.user.uid, deleteError);
    }
    
    // Create a user-friendly and informative error to throw to the UI
    const customError = new FirebaseError(
        'auth/user-document-creation-failed',
        `Gagal menyimpan data pengguna ke database setelah otentikasi berhasil. Ini hampir selalu disebabkan oleh Aturan Keamanan Firestore yang salah. Pesan asli: ${firestoreError.message}`
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
