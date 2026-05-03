/**
 * ═══════════════════════════════════════════════════════════════════════
 * CIVIC COMPASS — Mock User Repository
 *
 * In-memory Map-based storage for testing. Supports configurable
 * failures via setFailure() to test every error path in services.
 * ═══════════════════════════════════════════════════════════════════════
 */

import { ok, err } from '../../../../shared/utils/Result';
import type { Result } from '../../../../shared/utils/Result';
import type { AppError } from '../../../../shared/types/index';
import { firebaseUnavailable } from '../../../../shared/types/index';
import type {
  IUserRepository,
  UserRecord,
  SessionRecord,
  ChecklistProgress,
  PaginatedResult,
} from '../IUserRepository';

export class MockUserRepository implements IUserRepository {
  public readonly users = new Map<string, UserRecord>();
  public readonly sessions = new Map<string, SessionRecord>();
  public readonly progress = new Map<string, ChecklistProgress>();

  private failures = new Map<string, AppError>();
  private sessionCounter = 0;

  /**
   * Makes the next call to `methodName` return a specific error.
   * The failure is consumed after one use (single-shot).
   *
   * @example
   * repo.setFailure('findById', firebaseUnavailable('findById'));
   * const result = await repo.findById('user1');
   * // result.ok === false, result.error.code === 'FIREBASE_UNAVAILABLE'
   */
  setFailure(methodName: string, error: AppError): void {
    this.failures.set(methodName, error);
  }

  private checkFailure(method: string): AppError | null {
    const failure = this.failures.get(method);
    if (failure) {
      this.failures.delete(method);
      return failure;
    }
    return null;
  }

  async findById(userId: string): Promise<Result<UserRecord | null, AppError>> {
    const failure = this.checkFailure('findById');
    if (failure) return err(failure);

    const user = this.users.get(userId);
    return ok(user ?? null);
  }

  async upsertUser(user: UserRecord): Promise<Result<void, AppError>> {
    const failure = this.checkFailure('upsertUser');
    if (failure) return err(failure);

    this.users.set(user.id, user);
    return ok(undefined);
  }

  async createSession(
    userId: string,
    session: Omit<SessionRecord, 'id'>
  ): Promise<Result<SessionRecord, AppError>> {
    const failure = this.checkFailure('createSession');
    if (failure) return err(failure);

    this.sessionCounter += 1;
    const record: SessionRecord = {
      ...session,
      id: `mock-session-${this.sessionCounter}`,
    };
    this.sessions.set(record.id, record);
    return ok(record);
  }

  async getSessionHistory(
    userId: string,
    limit: number,
    _cursor?: string
  ): Promise<Result<PaginatedResult<SessionRecord>, AppError>> {
    const failure = this.checkFailure('getSessionHistory');
    if (failure) return err(failure);

    const userSessions = Array.from(this.sessions.values())
      .filter((s) => s.userId === userId)
      .sort((a, b) => b.startedAt - a.startedAt);

    const items = userSessions.slice(0, limit);
    return ok({
      items,
      nextCursor: items.length >= limit ? items[items.length - 1]?.id ?? null : null,
      hasMore: userSessions.length > limit,
    });
  }

  async saveChecklistProgress(
    userId: string,
    sessionId: string,
    prog: ChecklistProgress
  ): Promise<Result<void, AppError>> {
    const failure = this.checkFailure('saveChecklistProgress');
    if (failure) return err(failure);

    this.progress.set(`${userId}:${sessionId}`, prog);
    return ok(undefined);
  }

  async getChecklistProgress(
    userId: string,
    sessionId: string
  ): Promise<Result<ChecklistProgress | null, AppError>> {
    const failure = this.checkFailure('getChecklistProgress');
    if (failure) return err(failure);

    const prog = this.progress.get(`${userId}:${sessionId}`);
    return ok(prog ?? null);
  }
}
