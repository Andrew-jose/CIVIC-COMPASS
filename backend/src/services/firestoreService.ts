import * as admin from 'firebase-admin';
import { LRUCache } from 'lru-cache';

// Cache Firestore reads with 30-second TTL for static civic data
const civicDataCache = new LRUCache<string, any>({
  max: 1000,
  ttl: 30 * 1000, // 30 seconds
});

export class FirestoreService {
  private db: admin.firestore.Firestore;

  constructor() {
    // Assumes firebase admin is initialized
    this.db = admin.firestore();
  }

  /**
   * Use select() to fetch only needed fields (not full docs)
   * Cache Firestore reads with 30-second TTL for static civic data
   */
  public async getCivicData(state: string, county: string): Promise<any> {
    const cacheKey = `${state}_${county}`;
    const cached = civicDataCache.get(cacheKey);
    if (cached) return cached;

    const snapshot = await this.db.collection('civicData')
      .where('state', '==', state)
      .where('county', '==', county)
      .select('registrationDeadline', 'electionDay', 'pollingHours', 'officialWebsite') // Selective fetch
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    
    const data = snapshot.docs[0].data();
    civicDataCache.set(cacheKey, data);
    return data;
  }

  /**
   * Batch all Firestore reads in single batched get()
   */
  public async getBatchDocuments(collection: string, docIds: string[]): Promise<any[]> {
    if (docIds.length === 0) return [];
    
    // Never call get() in a loop — always batch
    const refs = docIds.map(id => this.db.collection(collection).doc(id));
    const snapshots = await this.db.getAll(...refs);
    
    return snapshots
      .filter(snap => snap.exists)
      .map(snap => ({ id: snap.id, ...snap.data() }));
  }

  /**
   * Implement cursor-based pagination for message history
   */
  public async getMessageHistory(userId: string, sessionId: string, lastVisible?: admin.firestore.DocumentSnapshot): Promise<any> {
    let query = this.db.collection('users')
      .doc(userId)
      .collection('sessions')
      .doc(sessionId)
      .collection('messages')
      .orderBy('timestamp', 'asc')
      .limit(20);

    if (lastVisible) {
      query = query.startAfter(lastVisible);
    }

    const snapshot = await query.get();
    return {
      messages: snapshot.docs.map(d => ({ id: d.id, ...d.data() })),
      lastVisible: snapshot.docs[snapshot.docs.length - 1] || null
    };
  }
}

export const firestoreService = new FirestoreService();
