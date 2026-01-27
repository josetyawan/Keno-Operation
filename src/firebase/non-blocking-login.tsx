'use client';
import {
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  UserCredential,
} from 'firebase/auth';

interface SignUpDetails {
    email: string;
}

/**
 * Signs up a user with email and password.
 * This function ONLY creates the authentication user. The corresponding Firestore
 * document will be created by the logic in the DashboardLayout when the user first visits.
 */
export async function signUpWithEmail(auth: Auth, password: string, details: SignUpDetails): Promise<UserCredential> {
  const userCredential = await createUserWithEmailAndPassword(auth, details.email, password);
  return userCredential;
}

/**
 * Signs in a user with email and password.
 */
export async function signInWithEmail(auth: Auth, email: string, password: string): Promise<UserCredential> {
  return signInWithEmailAndPassword(auth, email, password);
}
