import { Result } from '../../../shared/utils/Result';
import { ChecklistItem, VoterProfile, Jurisdiction } from '../../../shared/types';

export interface IChecklistGenerator {
  /**
   * Generates a checklist based on profile and jurisdiction.
   */
  generate(profile: VoterProfile, jurisdiction: Jurisdiction): Promise<Result<ChecklistItem[]>>;

  /**
   * Prioritizes checklist items.
   */
  prioritizeItems(items: ChecklistItem[]): Result<ChecklistItem[]>;

  /**
   * Filters items by deadline.
   */
  filterByDeadline(items: ChecklistItem[], date: string): Result<ChecklistItem[]>;

  /**
   * Localizes checklist items.
   */
  localizeItems(items: ChecklistItem[], language: string): Promise<Result<ChecklistItem[]>>;

  /**
   * Validates a generated checklist.
   */
  validateChecklist(items: ChecklistItem[]): Result<boolean>;
}
