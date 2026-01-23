'use client';
import {
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  UserCredential
} from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { getApp } from 'firebase/app';


async function createUserDocument(user: { uid: string; email: string | null; }) {
    const app = getApp();
    const db = getFirestore(app);
    const userDocRef = doc(db, 'users', user.uid);
    const userData = {
        id: user.uid,
        email: user.email || '',
        firstName: '',
        lastName: '',
    };
    // This is a non-blocking call, but it's okay here as it's part of the sign-up flow
    // and doesn't need to be awaited for the user to be considered logged in.
    // For critical document creation, you might want to await this.
    await setDoc(userDocRef, userData, { merge: true });
}

/**
 * Signs up a user with email and password and creates a user document.
 */
export async function signUpWithEmail(auth: Auth, email: string, password: string): Promise<UserCredential> {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  // After user is created in Auth, create their document in Firestore.
  await createUserDocument(userCredential.user);
  return userCredential;
}

/**
 * Signs in a user with email and password.
 */
export async function signInWithEmail(auth: Auth, email: string, password: string): Promise<UserCredential> {
  return await signInWithEmailAndPassword(auth, email, password);
}
