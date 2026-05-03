import { Result } from '../../../shared/utils/Result';
import { BallotItem } from '../../../shared/types';

export interface IBallotProcessor {
  /**
   * Processes an uploaded ballot image.
   */
  processImage(documentId: string): Promise<Result<BallotItem[]>>;

  /**
   * Extracts text from the ballot.
   */
  extractText(documentId: string): Promise<Result<string>>;

  /**
   * Parses text into structured ballot items.
   */
  parseItems(text: string): Result<BallotItem[]>;

  /**
   * Matches items with civic data.
   */
  matchWithCivicData(items: BallotItem[], jurisdiction: any): Promise<Result<BallotItem[]>>;

  /**
   * Generates plain language summaries for measures.
   */
  summarizeMeasures(items: BallotItem[]): Promise<Result<BallotItem[]>>;

  /**
   * Validates parsed ballot.
   */
  validateBallot(items: BallotItem[]): Result<boolean>;
}
