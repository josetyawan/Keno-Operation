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

async function createUserDocument(user: User) {
    const app = getApp();
    const db = getFirestore(app);
    const userDocRef = doc(db, 'users', user.uid);
    
    // Corresponds to the 'User' entity in backend.json
    const userData = {
        id: user.uid,
        email: user.email || '',
        firstName: '',
        lastName: '',
    };

    // Await this to ensure the signup process is complete before the user is redirected.
    // If this fails, the catch block on the signup page will handle the error.
    await setDoc(userDocRef, userData);
}

/**
 * Signs up a user with email and password and creates their user document.
 */
export async function signUpWithEmail(auth: Auth, email: string, password: string): Promise<UserCredential> {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  try {
    await createUserDocument(userCredential.user);
  } catch (firestoreError) {
    // If document creation fails, we inform the developer.
    // The UI's catch block will show a generic error to the user.
    console.error("Critical: Failed to create user document in Firestore after user creation in Auth.", firestoreError);
    // This makes the signup fail, and the UI will show an error.
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
