/**
 * ═══════════════════════════════════════════════════════════════════════
 * CIVIC COMPASS — Mock Civic Data Repository
 *
 * In-memory Map-based storage for testing. Supports configurable
 * failures and pre-seeded data for specific jurisdictions.
 * ═══════════════════════════════════════════════════════════════════════
 */

import { ok, err } from '../../../../shared/utils/Result';
import type { Result } from '../../../../shared/utils/Result';
import type { AppError, Jurisdiction } from '../../../../shared/types/index';
import type {
  ICivicDataRepository,
  ElectionTimeline,
  VoterRequirements,
  PollingInfo,
  CivicDataBundle,
} from '../ICivicDataRepository';

export class MockCivicDataRepository implements ICivicDataRepository {
  public readonly timelines = new Map<string, ElectionTimeline>();
  public readonly requirements = new Map<string, VoterRequirements>();
  public readonly polling = new Map<string, PollingInfo>();

  private failures = new Map<string, AppError>();

  /**
   * Makes the next call to `methodName` return a specific error.
   * Single-shot — consumed after one use.
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

  private key(j: Jurisdiction): string {
    return `${j.state}:${j.county}`;
  }

  /**
   * Seeds test data for a jurisdiction.
   */
  seedData(jurisdiction: Jurisdiction, bundle: CivicDataBundle): void {
    const k = this.key(jurisdiction);
    this.timelines.set(k, bundle.timeline);
    this.requirements.set(jurisdiction.state, bundle.requirements);
    this.polling.set(k, bundle.polling);
  }

  async getElectionTimeline(
    jurisdiction: Jurisdiction
  ): Promise<Result<ElectionTimeline | null, AppError>> {
    const failure = this.checkFailure('getElectionTimeline');
    if (failure) return err(failure);

    const timeline = this.timelines.get(this.key(jurisdiction));
    return ok(timeline ?? null);
  }

  async getVoterRequirements(
    state: string
  ): Promise<Result<VoterRequirements | null, AppError>> {
    const failure = this.checkFailure('getVoterRequirements');
    if (failure) return err(failure);

    const reqs = this.requirements.get(state);
    return ok(reqs ?? null);
  }

  async getPollingInfo(
    jurisdiction: Jurisdiction
  ): Promise<Result<PollingInfo | null, AppError>> {
    const failure = this.checkFailure('getPollingInfo');
    if (failure) return err(failure);

    const info = this.polling.get(this.key(jurisdiction));
    return ok(info ?? null);
  }

  async upsertCivicData(
    jurisdiction: Jurisdiction,
    data: CivicDataBundle
  ): Promise<Result<void, AppError>> {
    const failure = this.checkFailure('upsertCivicData');
    if (failure) return err(failure);

    this.seedData(jurisdiction, data);
    return ok(undefined);
  }
}
