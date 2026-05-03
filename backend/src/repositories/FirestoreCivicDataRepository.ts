import { ICivicDataRepository } from './ICivicDataRepository';
import { Jurisdiction, BallotItem, ChecklistItem, AppError } from '../../../shared/types';
import { Result, ok, err } from '../../../shared/utils/Result';
import { Firestore } from 'firebase-admin/firestore';

// In-memory LRU Cache type
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class FirestoreCivicDataRepository implements ICivicDataRepository {
  private jurisdictionCache: Map<string, CacheEntry<Jurisdiction>> = new Map();
  // 6 hours in milliseconds
  private readonly CACHE_TTL = 6 * 60 * 60 * 1000;
  // simple limits for LRU
  private readonly MAX_CACHE_SIZE = 1000;

  constructor(private readonly db: Firestore) {}

  async getJurisdiction(id: string): Promise<Result<Jurisdiction, AppError>> {
    // Check cache
    const cached = this.jurisdictionCache.get(id);
    if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL)) {
      return ok(cached.data);
    }

    try {
      const doc = await this.db.collection('jurisdictions').doc(id).get();
      if (!doc.exists) {
        return err({
          code: 'JURISDICTION_NOT_FOUND',
          message: 'Jurisdiction not found',
          searchedJurisdiction: id
        });
      }

      const data = doc.data()!;
      const jurisdiction: Jurisdiction = {
        id: doc.id,
        state: data.state,
        county: data.county,
        municipality: data.municipality,
        nextElectionDate: data.nextElectionDate.toDate()
      };

      // Add to cache
      if (this.jurisdictionCache.size >= this.MAX_CACHE_SIZE) {
        // Simple LRU: delete first key
        const firstKey = this.jurisdictionCache.keys().next().value;
        if (firstKey) this.jurisdictionCache.delete(firstKey);
      }
      this.jurisdictionCache.set(id, { data: jurisdiction, timestamp: Date.now() });

      return ok(jurisdiction);
    } catch (e: unknown) {
      return err({
        code: 'FIREBASE_UNAVAILABLE',
        message: 'Could not fetch jurisdiction',
        operationAttempted: 'getJurisdiction'
      });
    }
  }

  async getBallotItems(jurisdictionId: string): Promise<Result<BallotItem[], AppError>> {
    try {
      // Benefit from compound indexes: e.g. jurisdictionId + type
      const snapshot = await this.db.collection('ballotItems')
        .where('jurisdictionId', '==', jurisdictionId)
        .get();

      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BallotItem));
      return ok(items);
    } catch (e: unknown) {
      return err({
        code: 'FIREBASE_UNAVAILABLE',
        message: 'Could not fetch ballot items',
        operationAttempted: 'getBallotItems'
      });
    }
  }

  async getChecklistItems(jurisdictionId: string): Promise<Result<ChecklistItem[], AppError>> {
    try {
      const snapshot = await this.db.collection('checklistItems')
        .where('jurisdictionId', '==', jurisdictionId)
        .get();

      const items = snapshot.docs.map(doc => {
        const data = doc.data();
        let deadline = data.deadline;
        if (data.deadline && data.deadline.kind === 'date') {
          deadline = { kind: 'date', value: data.deadline.value.toDate() };
        }
        return { id: doc.id, ...data, deadline } as ChecklistItem;
      });
      return ok(items);
    } catch (e: unknown) {
      return err({
        code: 'FIREBASE_UNAVAILABLE',
        message: 'Could not fetch checklist items',
        operationAttempted: 'getChecklistItems'
      });
    }
  }
}
