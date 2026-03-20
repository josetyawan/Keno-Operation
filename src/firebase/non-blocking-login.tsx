'use client';
import {
  Auth,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  UserCredential,
  confirmPasswordReset,
  ActionCodeSettings,
  GoogleAuthProvider,
  signInWithPopup,
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

/**
 * Signs in a user with Google.
 */
export async function signInWithGoogle(auth: Auth): Promise<UserCredential> {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
}

/**
 * Sends a password reset email to the given email address.
 */
export async function sendPasswordReset(auth: Auth, email: string, actionCodeSettings?: ActionCodeSettings): Promise<void> {
  return sendPasswordResetEmail(auth, email, actionCodeSettings);
}

/**
 * Completes the password reset process using the code from the email.
 */
export async function confirmPasswordResetWithCode(auth: Auth, code: string, newPassword: string):Promise<void> {
    return confirmPasswordReset(auth, code, newPassword);
}
