import { ICivicDataRepository, ElectionTimeline, VoterRequirements, PollingInfo, CivicData } from '../ICivicDataRepository';
import { Jurisdiction } from '../../../../shared/types';
import { AppError } from '../FirestoreUserRepository';

export class MockCivicDataRepository implements ICivicDataRepository {
  public data = new Map<string, CivicData>();
  public reqs = new Map<string, VoterRequirements>();
  public delayMs: number = 0;

  private async delay() {
    if (this.delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delayMs));
    }
  }

  private getKey(j: Jurisdiction) {
    return `${j.state}:${j.county}:${j.fips}`;
  }

  async getElectionTimeline(jurisdiction: Jurisdiction): Promise<ElectionTimeline | null> {
    await this.delay();
    const cd = this.data.get(this.getKey(jurisdiction));
    return cd ? cd.timeline : null;
  }

  async getVoterRequirements(state: string): Promise<VoterRequirements> {
    await this.delay();
    const req = this.reqs.get(state);
    if (!req) throw new AppError('Requirements not found', 'NOT_FOUND');
    return req;
  }

  async getPollingInfo(jurisdiction: Jurisdiction): Promise<PollingInfo | null> {
    await this.delay();
    const cd = this.data.get(this.getKey(jurisdiction));
    return cd ? cd.polling : null;
  }

  async upsertCivicData(jurisdiction: Jurisdiction, data: CivicData): Promise<void> {
    await this.delay();
    this.data.set(this.getKey(jurisdiction), data);
  }
}
