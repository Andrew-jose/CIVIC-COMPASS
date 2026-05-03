/**
 * CIVIC COMPASS — Firestore Service
 * Handles all Firestore reads/writes for sessions, conversations,
 * checklists, and user data.
 */

import {
  collection, doc, getDoc, setDoc, updateDoc,
  getDocs, query, orderBy, limit, serverTimestamp,
  type DocumentData,
} from 'firebase/firestore';
import { getFirebaseFirestore } from './firebase';

// ── Sessions ─────────────────────────────────────────

export async function saveSession(
  userId: string,
  sessionData: Record<string, any>
): Promise<void> {
  const db = getFirebaseFirestore();
  if (!db) return;
  const ref = doc(db, 'sessions', userId);
  await setDoc(ref, { ...sessionData, updatedAt: serverTimestamp() }, { merge: true });
}

export async function getSession(userId: string): Promise<DocumentData | null> {
  const db = getFirebaseFirestore();
  if (!db) return null;
  const snap = await getDoc(doc(db, 'sessions', userId));
  return snap.exists() ? snap.data() : null;
}

// ── Conversations ────────────────────────────────────

export async function saveConversation(
  userId: string,
  conversationId: string,
  messages: any[]
): Promise<void> {
  const db = getFirebaseFirestore();
  if (!db) return;
  const ref = doc(db, 'sessions', userId, 'conversations', conversationId);
  await setDoc(ref, {
    messages,
    messageCount: messages.length,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function getConversations(
  userId: string,
  maxResults: number = 20
): Promise<Array<{ id: string; data: DocumentData }>> {
  const db = getFirebaseFirestore();
  if (!db) return [];
  const ref = collection(db, 'sessions', userId, 'conversations');
  const q = query(ref, orderBy('updatedAt', 'desc'), limit(maxResults));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, data: d.data() }));
}

// ── Checklists ───────────────────────────────────────

export async function saveChecklist(
  userId: string,
  items: any[]
): Promise<void> {
  const db = getFirebaseFirestore();
  if (!db) return;
  const ref = doc(db, 'sessions', userId, 'checklists', 'current');
  await setDoc(ref, {
    items,
    completedCount: items.filter((i: any) => i.completed).length,
    totalCount: items.length,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function getChecklist(userId: string): Promise<any[] | null> {
  const db = getFirebaseFirestore();
  if (!db) return null;
  const snap = await getDoc(doc(db, 'sessions', userId, 'checklists', 'current'));
  return snap.exists() ? snap.data().items : null;
}

// ── Jurisdiction ─────────────────────────────────────

export async function saveJurisdiction(
  userId: string,
  jurisdiction: Record<string, any>
): Promise<void> {
  const db = getFirebaseFirestore();
  if (!db) return;
  await updateDoc(doc(db, 'sessions', userId), {
    jurisdiction,
    updatedAt: serverTimestamp(),
  });
}
