import { Result } from '../../../shared/utils/Result';
import { FactCheckRequest, FactCheckResponse } from '../../../shared/types';

export interface IFactChecker {
  /**
   * Verifies a specific claim.
   */
  verifyClaimResult(request: FactCheckRequest): Promise<Result<FactCheckResponse>>;

  /**
   * Searches for authoritative sources.
   */
  findSources(claim: string): Promise<Result<string[]>>;

  /**
   * Analyzes risk of disenfranchisement.
   */
  analyzeRisk(claim: string): Promise<Result<string>>;

  /**
   * Formats the final explanation.
   */
  formatExplanation(verdict: string, sources: string[]): Result<string>;
}
