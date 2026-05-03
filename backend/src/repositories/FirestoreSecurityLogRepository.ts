/**
 * ═══════════════════════════════════════════════════════════════════════
 * CIVIC COMPASS — Firestore Security Log Repository
 * ═══════════════════════════════════════════════════════════════════════
 */

import * as admin from 'firebase-admin';
import { ok, err } from '../../../shared/utils/Result';
import type { Result } from '../../../shared/utils/Result';
import type { AppError } from '../../../shared/types/index';
import { firebaseUnavailable } from '../../../shared/types/index';
import type { ISecurityLogRepository, SecurityLogEntry } from './ISecurityLogRepository';

export class FirestoreSecurityLogRepository implements ISecurityLogRepository {
  private readonly db: admin.firestore.Firestore;

  constructor(firestore: admin.firestore.Firestore) {
    this.db = firestore;
  }

  async logThreat(entry: SecurityLogEntry): Promise<Result<void, AppError>> {
    try {
      await this.db.collection('securityLogs').add({
        userId: entry.userId,
        threatType: entry.threatType,
        originalInput: entry.originalInput,
        sanitizedInput: entry.sanitizedInput,
        endpoint: entry.endpoint,
        timestamp: entry.timestamp,
        ipHash: entry.ipHash,
      });
      return ok(undefined);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[FirestoreSecurityLogRepository] logThreat failed:', message);
      return err(firebaseUnavailable('logThreat'));
    }
  }
}
