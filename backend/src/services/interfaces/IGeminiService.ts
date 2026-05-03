import { Result } from '../../../shared/utils/Result';
import { GroundedResponse, ChatRequest, ChatResponse } from '../../../shared/types';
import { GeminiConfig } from '../../../shared/types';

/**
 * Interface for the Gemini AI service.
 * Handles interaction with Google's Gemini models.
 */
export interface IGeminiService {
  /**
   * Initializes the service with config.
   * @param config - Gemini config
   */
  initialize(config: GeminiConfig): void;

  /**
   * Generates a grounded response using Gemini.
   * @param prompt - The prompt string
   * @param context - Additional context
   * @returns Result monad containing GroundedResponse or Error
   */
  generateGroundedResponse(prompt: string, context: string): Promise<Result<GroundedResponse>>;

  /**
   * Analyzes an uploaded document.
   * @param documentId - The storage ID of the document
   * @returns Result monad with extracted text
   */
  analyzeDocument(documentId: string): Promise<Result<string>>;

  /**
   * Answers a chat query.
   * @param request - ChatRequest object
   * @returns Promise containing ChatResponse
   */
  answerQuery(request: ChatRequest): Promise<Result<ChatResponse>>;

  /**
   * Summarizes a text.
   * @param text - The text to summarize
   */
  summarizeText(text: string): Promise<Result<string>>;

  /**
   * Embeds a given text.
   * @param text - The text to embed
   */
  createEmbedding(text: string): Promise<Result<number[]>>;

  /**
   * Evaluates the safety of a prompt.
   * @param prompt - The text
   */
  evaluateSafety(prompt: string): Promise<Result<boolean>>;

  /**
   * Stream a response.
   * @param prompt - The prompt
   */
  streamResponse(prompt: string): AsyncGenerator<string, void, unknown>;
}
