/**
 * ═══════════════════════════════════════════════════════════════════════
 * CIVIC COMPASS — Gemini Service
 *
 * Wraps the @google/genai SDK to provide the two core operations used
 * across the application: generateContent (request/response) and
 * streamContent (SSE streaming). Every Gemini call in the codebase
 * goes through this module.
 *
 * Anti-hallucination contract:
 * - Every response includes groundingMetadata from Google Search.
 * - Confidence scores are extracted from grounding support data.
 * - If no grounding sources are found, confidence defaults to 30/100.
 * - The system prompt (injected by callers) enforces citation requirements.
 *
 * This module does NOT make prompt engineering decisions — it is a
 * transport layer. Prompt construction happens in /prompts/*.ts.
 * ═══════════════════════════════════════════════════════════════════════
 */

import { GoogleGenAI } from '@google/genai';
import type { Result } from '../../../shared/utils/Result';
import { ok, err, fromPromise } from '../../../shared/utils/Result';
import type { AppError } from '../../../shared/types/index';

// ── Client Singleton ────────────────────────────────────────────────────

let clientInstance: GoogleGenAI | null = null;

/**
 * Returns the singleton GoogleGenAI client.
 *
 * Lazily initialized on first call using the GEMINI_API_KEY environment
 * variable. Throws immediately if the key is missing — this is a startup
 * failure, not a runtime error.
 *
 * @returns The GoogleGenAI client instance.
 * @throws {Error} If GEMINI_API_KEY is not set in the environment.
 *
 * @perf Zero-cost after first call (singleton).
 */
export function getGeminiClient(): GoogleGenAI {
  if (!clientInstance) {
    const apiKey = process.env['GEMINI_API_KEY'];
    if (!apiKey) {
      throw new Error(
        'GEMINI_API_KEY environment variable is required. ' +
        'Set it in .env or via Secret Manager.'
      );
    }
    clientInstance = new GoogleGenAI({ apiKey });
  }
  return clientInstance;
}

// ── Constants ───────────────────────────────────────────────────────────

/**
 * Gemini model identifiers used across the application.
 *
 * FLASH: Fast, lower-cost model for conversational chat (SSE streaming).
 * PRO: Deep-reasoning model for fact-checking, timelines, checklists.
 * EMBEDDING: Text embedding model for RAG similarity search.
 *
 * @civic-safety Model selection is a safety decision:
 *   - PRO is required for fact-checking because it has deeper reasoning.
 *   - FLASH is acceptable for chat because the system prompt enforces
 *     grounding and the confidence scorer post-validates.
 */
export const MODELS = {
  FLASH: 'gemini-3-flash',
  PRO: 'gemini-3.1-pro',
  EMBEDDING: 'gemini-embedding-002',
} as const;

/**
 * Thinking level presets for Gemini's reasoning capabilities.
 *
 * MINIMAL: No extended thinking (fastest, for embeddings/OCR).
 * MODERATE: Balanced reasoning (chat, simple lookups).
 * DEEP: Full reasoning chain (fact-checking, legal interpretation).
 */
export const THINKING_PRESETS = {
  MINIMAL: 'minimal',
  MODERATE: 'medium',
  DEEP: 'high',
} as const;

// ── Types ───────────────────────────────────────────────────────────────

/**
 * A single message in a Gemini conversation.
 * Matches the shape expected by the @google/genai SDK.
 */
export interface ChatMessage {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

/**
 * Options for a Gemini API call.
 *
 * @civic-safety
 *   - `useGoogleSearch`: enables real-time grounding against web sources.
 *     Required for any response that includes dates, deadlines, or legal facts.
 *   - `useUrlContext`: enables reading official election websites in full.
 *   - `responseJsonSchema`: enforces structured output for machine-parseable
 *     responses (timelines, verdicts, checklists).
 */
export interface GeminiCallOptions {
  /** Which model to use (FLASH or PRO). */
  readonly model: string;
  /** The system instruction (anti-hallucination prompt). */
  readonly systemInstruction: string;
  /** The conversation contents. */
  readonly contents: ChatMessage[];
  /** The thinking/reasoning level. */
  readonly thinkingLevel?: string;
  /** Enable Google Search grounding for real-time data. */
  readonly useGoogleSearch?: boolean;
  /** Enable URL Context tool for reading web pages. */
  readonly useUrlContext?: boolean;
  /** JSON schema for structured output enforcement. */
  readonly responseJsonSchema?: Record<string, unknown>;
}

/**
 * The processed response from a Gemini call.
 *
 * @civic-safety
 *   - `groundingMetadata` contains the citations that prove grounding.
 *     A response with empty groundingMetadata should be treated as
 *     low-confidence (score ≤ 30).
 *   - `confidence` is extracted from grounding support scores, not
 *     invented by the model. If no grounding support exists, defaults to 30.
 */
export interface GeminiResponse {
  /** The text content of the response. */
  readonly text: string;
  /** Grounding metadata with source citations. */
  readonly groundingMetadata: Record<string, unknown> | undefined;
  /** Confidence score 0-100 derived from grounding quality. */
  readonly confidence: number;
  /** Thought signature for reasoning chain persistence (streaming only). */
  readonly thoughtSignature?: string;
}

/**
 * A chunk emitted during SSE streaming.
 */
export interface StreamChunk {
  /** Text content of this chunk (may be empty for control chunks). */
  readonly text?: string;
  /** True when the stream is complete. */
  readonly done: boolean;
  /** Thought signature emitted on the final chunk. */
  readonly thoughtSignature?: string;
}

// ── Core Functions ──────────────────────────────────────────────────────

/**
 * Generates a complete (non-streaming) response from Gemini.
 *
 * Used for: timelines, checklists, fact-check verdicts, ballot explanations.
 * These require the full response before processing (JSON parsing, confidence
 * scoring, cross-validation against jurisdiction data).
 *
 * @param options - The call configuration including model, prompt, and tools.
 * @returns A GeminiResponse with text, grounding metadata, and confidence.
 *
 * @civic-safety
 *   - Grounding: Controlled by options.useGoogleSearch and options.useUrlContext.
 *   - Structured Output: If responseJsonSchema is provided, the response text
 *     is guaranteed to be valid JSON matching that schema.
 *   - Confidence: Extracted from groundingMetadata.groundingSupports[].confidenceScore.
 *     Defaults to 30 if no grounding supports exist.
 *   - Timeout: The SDK's default timeout applies (~60s). On timeout, the
 *     caller receives a thrown error that should be caught and mapped to
 *     GEMINI_TIMEOUT via fromPromise().
 *
 * @perf
 *   - Latency: 2-8 seconds for FLASH, 5-15 seconds for PRO with deep thinking.
 *   - Firestore reads: 0 (this function does not access Firestore).
 *   - Cacheable: Yes, via ResponseCache keyed on prompt hash.
 *
 * @example
 * const response = await generateContent({
 *   model: MODELS.PRO,
 *   systemInstruction: buildSystemPrompt(context, 'English'),
 *   contents: [{ role: 'user', parts: [{ text: 'When is the registration deadline?' }] }],
 *   thinkingLevel: THINKING_PRESETS.DEEP,
 *   useGoogleSearch: true,
 * });
 * const data = JSON.parse(response.text);
 */
export async function generateContent(options: GeminiCallOptions): Promise<GeminiResponse> {
  const client = getGeminiClient();

  // Build tool configuration
  const tools: Array<Record<string, unknown>> = [];
  if (options.useGoogleSearch) {
    tools.push({ googleSearch: {} });
  }
  if (options.useUrlContext) {
    tools.push({ urlContext: {} });
  }

  // Build config
  const config: Record<string, unknown> = {};
  if (options.thinkingLevel) {
    config['thinkingConfig'] = { thinkingLevel: options.thinkingLevel };
  }
  if (options.responseJsonSchema) {
    config['responseMimeType'] = 'application/json';
    config['responseSchema'] = options.responseJsonSchema;
  }
  if (tools.length > 0) {
    config['tools'] = tools;
  }

  const response = await client.models.generateContent({
    model: options.model,
    contents: options.contents as Array<Record<string, unknown>>,
    config: {
      ...config,
      systemInstruction: options.systemInstruction,
    },
  });

  // Extract text from response candidates
  const candidates = (response as Record<string, unknown>)['candidates'] as
    Array<Record<string, unknown>> | undefined;
  const firstCandidate = candidates?.[0];
  const contentParts = (firstCandidate?.['content'] as Record<string, unknown>)?.['parts'] as
    Array<Record<string, unknown>> | undefined;

  const text = contentParts
    ?.filter((p) => typeof p['text'] === 'string')
    .map((p) => p['text'] as string)
    .join('') ?? '';

  // Extract grounding metadata
  const groundingMetadata = firstCandidate?.['groundingMetadata'] as
    Record<string, unknown> | undefined;

  // Calculate confidence from grounding supports
  let confidence = 30; // Base: no grounding
  if (groundingMetadata) {
    confidence = 40; // Has metadata
    const supports = groundingMetadata['groundingSupports'] as
      Array<Record<string, unknown>> | undefined;
    if (supports && supports.length > 0) {
      const avgConfidence = supports.reduce(
        (sum, s) => sum + ((s['confidenceScore'] as number | undefined) ?? 0),
        0
      ) / supports.length;
      confidence = Math.min(Math.round(40 + avgConfidence * 60), 100);
    }
  }

  return { text, groundingMetadata, confidence };
}

/**
 * Streams a Gemini response as an async generator of chunks.
 *
 * Used for: the main chat interface (SSE streaming to the frontend).
 * Each chunk contains a text fragment that is sent as an SSE event.
 *
 * @param options - The call configuration.
 * @yields StreamChunk objects with text fragments and a final done signal.
 *
 * @civic-safety
 *   - Streaming responses cannot be fully validated before display.
 *     The confidence scorer runs post-stream on the accumulated text.
 *   - The system prompt's grounding contract is the primary defense
 *     during streaming — it instructs the model to cite sources inline.
 *   - Thought signatures enable reasoning chain persistence across turns.
 *
 * @perf
 *   - First token: ~500ms (FLASH), ~2s (PRO).
 *   - Full stream: 2-10 seconds depending on response length.
 *   - Memory: O(1) per chunk — chunks are yielded, not accumulated.
 *
 * @example
 * const stream = streamContent({
 *   model: MODELS.FLASH,
 *   systemInstruction: prompt,
 *   contents: history,
 *   thinkingLevel: THINKING_PRESETS.MODERATE,
 *   useGoogleSearch: true,
 * });
 * for await (const chunk of stream) {
 *   if (chunk.text) res.write(`data: ${JSON.stringify(chunk)}\n\n`);
 *   if (chunk.done) break;
 * }
 */
export async function* streamContent(
  options: GeminiCallOptions
): AsyncGenerator<StreamChunk, void, unknown> {
  const client = getGeminiClient();

  const tools: Array<Record<string, unknown>> = [];
  if (options.useGoogleSearch) {
    tools.push({ googleSearch: {} });
  }
  if (options.useUrlContext) {
    tools.push({ urlContext: {} });
  }

  const config: Record<string, unknown> = {};
  if (options.thinkingLevel) {
    config['thinkingConfig'] = { thinkingLevel: options.thinkingLevel };
  }
  if (tools.length > 0) {
    config['tools'] = tools;
  }

  const response = await client.models.generateContentStream({
    model: options.model,
    contents: options.contents as Array<Record<string, unknown>>,
    config: {
      ...config,
      systemInstruction: options.systemInstruction,
    },
  });

  for await (const chunk of response) {
    const candidates = (chunk as Record<string, unknown>)['candidates'] as
      Array<Record<string, unknown>> | undefined;
    const parts = (candidates?.[0]?.['content'] as Record<string, unknown>)?.['parts'] as
      Array<Record<string, unknown>> | undefined;
    const text = parts
      ?.filter((p) => typeof p['text'] === 'string' && !p['thought'])
      .map((p) => p['text'] as string)
      .join('') ?? '';

    // Extract thought signature if present
    const thoughtPart = parts?.find((p) => p['thought'] === true);
    const thoughtSignature = thoughtPart
      ? (thoughtPart['text'] as string | undefined)
      : undefined;

    if (text) {
      yield { text, done: false };
    }
    if (thoughtSignature) {
      yield { done: false, thoughtSignature };
    }
  }

  yield { done: true };
}

/**
 * Generates a text embedding using Gemini's embedding model.
 *
 * Used for: RAG similarity search across civic data documents.
 *
 * @param text - The text to embed. Should be under 2048 tokens.
 * @returns A number array representing the embedding vector.
 *
 * @perf
 *   - Latency: ~200ms per call.
 *   - Dimensions: 768 (Gemini Embedding 002).
 *   - Batch calls via embedBatch() in embeddingService.ts for efficiency.
 *
 * @example
 * const embedding = await generateEmbedding('voter registration Texas');
 * // embedding.length === 768
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const client = getGeminiClient();
  const response = await client.models.embedContent({
    model: MODELS.EMBEDDING,
    contents: text,
  });
  return ((response as Record<string, unknown>)['embedding'] as Record<string, unknown>)?.['values'] as number[] ?? [];
}
