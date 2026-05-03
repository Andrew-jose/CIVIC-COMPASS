import { Jurisdiction, BallotItem, ChecklistItem, AppError } from '../../../shared/types';
import { Result } from '../../../shared/utils/Result';

export interface ICivicDataRepository {
  /**
   * Finds a jurisdiction by ID.
   * Can utilize an LRU cache to reduce Firestore reads.
   */
  getJurisdiction(id: string): Promise<Result<Jurisdiction, AppError>>;
  
  /**
   * Queries ballot items for a specific jurisdiction.
   * Implementation should use batched queries or `in` constraints where applicable.
   */
  getBallotItems(jurisdictionId: string): Promise<Result<BallotItem[], AppError>>;
  
  /**
   * Retrieves checklist items relevant to a jurisdiction.
   */
  getChecklistItems(jurisdictionId: string): Promise<Result<ChecklistItem[], AppError>>;
}
