import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { useEffect, useState } from 'react';
import type { AccessLevel } from '../types';
import { auth } from './firebase';

export function useAuthUser(): { user: User | null; loading: boolean } {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  return { user, loading };
}

export async function login(email: string, password: string) {
  await signInWithEmailAndPassword(auth, email, password);
}

export async function signup(email: string, password: string, name: string) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  if (name.trim()) await updateProfile(credential.user, { displayName: name.trim() });
}

export async function resetPassword(email: string) {
  await sendPasswordResetEmail(auth, email);
}

export async function logout() {
  await signOut(auth);
}

/** Fixed test accounts, one per role — for the login screen's debug shortcut
 * only. Signs in if the account already exists, otherwise creates it on the
 * fly (handy the first time this runs against a fresh project/emulator). */
const DEBUG_ACCOUNTS: Record<AccessLevel, { email: string; password: string }> = {
  admin: { email: 'debug-admin@gestionprod.local', password: 'debug1234' },
  responsable: { email: 'debug-responsable@gestionprod.local', password: 'debug1234' },
  user: { email: 'debug-user@gestionprod.local', password: 'debug1234' },
};

export async function debugLogin(role: AccessLevel) {
  const { email, password } = DEBUG_ACCOUNTS[role];
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    const code = (err as { code?: string } | undefined)?.code;
    if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
      await createUserWithEmailAndPassword(auth, email, password);
    } else {
      throw err;
    }
  }
}

/** Translates a Firebase Auth error into a short French message for display. */
export function authErrorMessage(err: unknown): string {
  const code = (err as { code?: string } | undefined)?.code ?? '';
  switch (code) {
    case 'auth/invalid-email':
      return 'Adresse email invalide.';
    case 'auth/user-disabled':
      return 'Ce compte a été désactivé.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Email ou mot de passe incorrect.';
    case 'auth/email-already-in-use':
      return 'Un compte existe déjà avec cet email.';
    case 'auth/weak-password':
      return 'Le mot de passe doit contenir au moins 6 caractères.';
    case 'auth/too-many-requests':
      return 'Trop de tentatives — réessayez dans quelques instants.';
    case 'auth/network-request-failed':
      return 'Problème réseau — vérifiez votre connexion.';
    default:
      return 'Une erreur est survenue. Réessayez.';
  }
}
