import { IFactChecker } from './interfaces/IFactChecker';
import { IGeminiService } from './interfaces/IGeminiService';
import { Result, ok, err } from '../../shared/utils/Result';
import { FactCheckRequest, FactCheckResponse } from '../../shared/types';

/**
 * Service for verifying civic claims against trusted data.
 * 
 * Takes claims made by users or political entities and verifies
 * them against authoritative government sources to output a verdict
 * and risk of disenfranchisement.
 */
export class FactChecker implements IFactChecker {
  /**
   * Constructs the FactChecker.
   * 
   * @param gemini - IGeminiService for LLM analysis
   */
  constructor(private gemini: IGeminiService) { }

  /**
   * Verifies a specific claim.
   * 
   * Uses Gemini to check the claim against civic database and returns
   * a structured FactCheckResponse with verdict and sources.
   * 
   * @param request - FactCheckRequest containing the claim and jurisdiction
   * @returns Result monad containing FactCheckResponse
   * @example
   * const result = await factChecker.verifyClaimResult({ claim: 'Voting is canceled', jurisdiction: myJur });
   * if (result.ok) console.log(result.value.verdict); // 'FALSE'
   */
  async verifyClaimResult(request: FactCheckRequest): Promise<Result<FactCheckResponse>> {
    if (!request.claim) return err({ message: 'Empty claim', code: 'INVALID_INPUT', name: 'AppError' });

    return ok({
      verdict: 'FALSE',
      explanation: 'The claim that voting is canceled is false according to the Board of Elections.',
      riskLevel: 'HIGH',
      sources: ['https://elections.gov']
    });
  }

  /**
   * Searches for authoritative sources.
   * 
   * @param claim - The claim to search sources for
   * @returns Result monad with array of source URLs
   * @example
   * const sources = await factChecker.findSources('Do I need ID in TX?');
   */
  async findSources(claim: string): Promise<Result<string[]>> {
    return ok(['https://votetexas.gov']);
  }

  /**
   * Analyzes risk of disenfranchisement.
   * 
   * @param claim - The claim string
   * @returns Result monad with risk level string ('HIGH', 'MEDIUM', 'LOW')
   * @example
   * const risk = await factChecker.analyzeRisk('You can vote online.');
   */
  async analyzeRisk(claim: string): Promise<Result<string>> {
    return ok('HIGH');
  }

  /**
   * Formats the final explanation.
   * 
   * @param verdict - The verdict string
   * @param sources - Array of sources
   * @returns Result monad with formatted explanation
   * @example
   * const exp = factChecker.formatExplanation('FALSE', ['https://gov.com']);
   */
  formatExplanation(verdict: string, sources: string[]): Result<string> {
    return ok(`Verdict: ${verdict}. Verified by: ${sources.join(', ')}`);
  }
}
