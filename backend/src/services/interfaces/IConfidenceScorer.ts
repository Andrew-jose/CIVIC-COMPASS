import { Result } from '../../../shared/utils/Result';

export interface IConfidenceScorer {
  /**
   * Scores the response confidence.
   * @param response - The generated text
   * @param context - The context used
   * @returns Result monad with confidence score 0-1
   */
  scoreResponse(response: string, context: string): Promise<Result<number>>;

  /**
   * Evaluates factual accuracy.
   */
  evaluateAccuracy(text: string): Promise<Result<number>>;

  /**
   * Evaluates source reliability.
   */
  evaluateSources(sources: string[]): Promise<Result<number>>;

  /**
   * Adjusts score based on domain context.
   */
  adjustForDomain(baseScore: number, domain: string): Result<number>;
}
