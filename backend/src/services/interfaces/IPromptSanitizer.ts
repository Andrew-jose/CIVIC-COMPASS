import { Result } from '../../../shared/utils/Result';
import { SanitizedMessage } from '../../../shared/types';

export interface IPromptSanitizer {
  /**
   * Sanitizes user input.
   * @param input - The raw input
   * @returns Promise resolving to SanitizedMessage
   */
  sanitize(input: string): Promise<Result<SanitizedMessage>>;

  /**
   * Detects prompt injection attempts.
   */
  detectInjection(input: string): Promise<Result<boolean>>;

  /**
   * Removes PII from prompt.
   */
  redactPII(input: string): Result<string>;

  /**
   * Checks for disallowed topics.
   */
  checkAllowedTopics(input: string): Result<boolean>;

  /**
   * Standardizes the prompt format.
   */
  standardizeFormat(input: string): Result<string>;
}
