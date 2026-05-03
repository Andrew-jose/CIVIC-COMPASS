/**
 * CIVIC COMPASS — Firebase Initialization
 * Configures Firebase Auth, Firestore, and Analytics.
 */

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

function isConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
}

export function getFirebaseApp(): FirebaseApp | null {
  if (!isConfigured()) {
    console.warn('[Firebase] Not configured — set VITE_FIREBASE_* env vars.');
    return null;
  }
  if (!app) app = initializeApp(firebaseConfig);
  return app;
}

export function getFirebaseAuth(): Auth | null {
  const fbApp = getFirebaseApp();
  if (!fbApp) return null;
  if (!auth) auth = getAuth(fbApp);
  return auth;
}

export function getFirebaseFirestore(): Firestore | null {
  const fbApp = getFirebaseApp();
  if (!fbApp) return null;
  if (!db) db = getFirestore(fbApp);
  return db;
}

/** Sign in anonymously for session persistence */
export async function signInAnon(): Promise<string | null> {
  const fbAuth = getFirebaseAuth();
  if (!fbAuth) return null;
  try {
    const cred = await signInAnonymously(fbAuth);
    return cred.user.uid;
  } catch (error) {
    console.error('[Firebase] Anonymous sign-in failed:', error);
    return null;
  }
}

export { isConfigured };
