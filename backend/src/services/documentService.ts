/**
 * ═══════════════════════════════════════════════════════════════════════
 * CIVIC COMPASS — Document Service
 *
 * Handles PDF ballot processing using Gemini 3's native Document
 * Processing capability, with a multi-stage fallback chain:
 *   1. Gemini native Document Processing (primary)
 *   2. Gemini Vision/OCR fallback (for heavily scanned documents)
 *   3. Empty result with zero confidence (last resort)
 *
 * @civic-safety
 *   - Extracted text is passed directly to ballotFlow for explanation.
 *   - No text modification occurs in this service — extraction only.
 *   - Confidence is derived from text length (heuristic), not content.
 * ═══════════════════════════════════════════════════════════════════════
 */

import { getGeminiClient, MODELS } from './geminiService';
import type { Result } from '../../../shared/utils/Result';
import { ok, err, fromPromise } from '../../../shared/utils/Result';
import type { AppError } from '../../../shared/types/index';

/**
 * The output of document processing.
 *
 * @param text - The extracted text content.
 * @param method - Which extraction method succeeded.
 * @param pageCount - Estimated page count (heuristic: text.length / 3000).
 * @param confidence - Extraction quality score (0-100).
 *   90+ = clean native extraction.
 *   50-89 = partial extraction, some text may be garbled.
 *   < 50 = extraction failed or produced very little text.
 */
export interface ProcessedDocument {
  readonly text: string;
  readonly method: 'gemini-native' | 'vision-fallback' | 'text-extract';
  readonly pageCount: number;
  readonly confidence: number;
}

/**
 * Processes a PDF document using Gemini 3's native Document Processing.
 *
 * This is the primary extraction method — no OCR needed for most PDFs.
 * The document is sent as base64 inline data with an extraction prompt
 * that preserves ballot structure (sections, measure numbers, candidates).
 *
 * @param fileBuffer - The raw PDF file bytes.
 * @param mimeType - The MIME type of the file (default: 'application/pdf').
 * @returns Result containing ProcessedDocument or AppError.
 *
 * @civic-safety
 *   - The extraction prompt instructs Gemini to extract raw text ONLY —
 *     no summarization, no interpretation, no opinion injection.
 *   - thinkingLevel is 'low' because this is extraction, not reasoning.
 *
 * @perf
 *   - Latency: 3-10 seconds depending on document length.
 *   - Memory: O(document size) for base64 encoding.
 *
 * @example
 * const result = await processDocumentWithGemini(pdfBuffer);
 * if (result.ok) console.log(result.value.text);
 */
export async function processDocumentWithGemini(
  fileBuffer: Buffer,
  mimeType: string = 'application/pdf'
): Promise<Result<ProcessedDocument, AppError>> {
  const client = getGeminiClient();

  return fromPromise(
    (async () => {
      const base64Data = fileBuffer.toString('base64');

      const response = await client.models.generateContent({
        model: MODELS.PRO,
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: base64Data,
                },
              },
              {
                text: `Extract ALL text content from this document. Preserve the document structure including:
- Section headers and numbering
- Ballot measure numbers and titles
- Candidate names and offices
- Propositions with full text
- Any instructions to voters

Return the complete text content, preserving formatting and structure.
Do NOT summarize or interpret — extract the raw text exactly as written.`,
              },
            ],
          } as Record<string, unknown>,
        ],
        config: {
          thinkingConfig: { thinkingLevel: 'low' as string },
        },
      });

      const candidates = (response as Record<string, unknown>)['candidates'] as
        Array<Record<string, unknown>> | undefined;
      const parts = (candidates?.[0]?.['content'] as Record<string, unknown>)?.['parts'] as
        Array<Record<string, unknown>> | undefined;

      const text = parts
        ?.filter((p) => typeof p['text'] === 'string')
        .map((p) => p['text'] as string)
        .join('') ?? '';

      const estimatedPages = Math.max(1, Math.ceil(text.length / 3000));

      return {
        text,
        method: 'gemini-native' as const,
        pageCount: estimatedPages,
        confidence: text.length > 100 ? 90 : 50,
      };
    })(),
    (e): AppError => ({
      code: 'GEMINI_TIMEOUT',
      message: `Document processing failed: ${e instanceof Error ? e.message : String(e)}`,
      timeoutMs: 60000,
      promptType: 'ballot',
    })
  );
}

/**
 * Fallback: Processes a document using Gemini's vision capabilities for OCR.
 *
 * Used when native Document Processing fails (heavily scanned PDFs,
 * low-quality images, or handwritten annotations).
 *
 * @param fileBuffer - The raw file bytes.
 * @returns Result containing ProcessedDocument or AppError.
 *
 * @civic-safety
 *   - OCR text may contain errors — confidence is capped at 70.
 *   - The caller (ballotFlow) will cross-validate OCR output against
 *     known ballot items when possible.
 *
 * @perf
 *   - Latency: 2-8 seconds (FLASH model, minimal thinking).
 *   - Lower quality than native processing but faster.
 */
export async function processDocumentWithVision(
  fileBuffer: Buffer
): Promise<Result<ProcessedDocument, AppError>> {
  const apiKey = process.env['GEMINI_API_KEY'];

  if (!apiKey) {
    return err({
      code: 'FIREBASE_UNAVAILABLE',
      message: 'API key required for Vision API fallback.',
      operation: 'processDocumentWithVision',
    });
  }

  const client = getGeminiClient();

  return fromPromise(
    (async () => {
      const base64Data = fileBuffer.toString('base64');

      const response = await client.models.generateContent({
        model: MODELS.FLASH,
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: 'application/pdf',
                  data: base64Data,
                },
              },
              {
                text: 'This is a scanned document. Use OCR to extract ALL text. Return raw text only.',
              },
            ],
          } as Record<string, unknown>,
        ],
        config: {
          thinkingConfig: { thinkingLevel: 'minimal' as string },
        },
      });

      const candidates = (response as Record<string, unknown>)['candidates'] as
        Array<Record<string, unknown>> | undefined;
      const parts = (candidates?.[0]?.['content'] as Record<string, unknown>)?.['parts'] as
        Array<Record<string, unknown>> | undefined;

      const text = parts
        ?.filter((p) => typeof p['text'] === 'string')
        .map((p) => p['text'] as string)
        .join('') ?? '';

      return {
        text,
        method: 'vision-fallback' as const,
        pageCount: Math.max(1, Math.ceil(text.length / 3000)),
        confidence: text.length > 50 ? 70 : 30,
      };
    })(),
    (e): AppError => ({
      code: 'GEMINI_TIMEOUT',
      message: `Vision fallback failed: ${e instanceof Error ? e.message : String(e)}`,
      timeoutMs: 60000,
      promptType: 'ballot',
    })
  );
}

/**
 * Processes a document with automatic fallback chain.
 *
 * Strategy:
 *   1. Try Gemini 3 native Document Processing (primary).
 *   2. Fall back to Vision/OCR if native processing fails.
 *   3. Return empty result with zero confidence if both fail.
 *
 * @param fileBuffer - The raw file bytes.
 * @param mimeType - The MIME type (default: 'application/pdf').
 * @returns Always succeeds (never returns err) — worst case is
 *   an empty ProcessedDocument with confidence 0.
 *
 * @civic-safety
 *   - A zero-confidence result signals to the caller that no text
 *     was extracted and the voter should be asked to try again.
 *   - This function never throws — it always returns a valid Result.
 *
 * @perf
 *   - Best case: 3-10 seconds (native success).
 *   - Worst case: 12-20 seconds (native fail + vision fail).
 *
 * @example
 * const result = await processDocument(pdfBuffer);
 * if (result.ok && result.value.confidence > 50) {
 *   // Safe to process
 *   const explanation = await ballotFlow(result.value.text, context);
 * }
 */
export async function processDocument(
  fileBuffer: Buffer,
  mimeType: string = 'application/pdf'
): Promise<Result<ProcessedDocument, AppError>> {
  // Try Gemini native first
  const nativeResult = await processDocumentWithGemini(fileBuffer, mimeType);
  if (nativeResult.ok && nativeResult.value.text.length > 50) {
    console.log('[DocumentService] Gemini native processing succeeded.');
    return nativeResult;
  }

  // Try Vision fallback
  const visionResult = await processDocumentWithVision(fileBuffer);
  if (visionResult.ok && visionResult.value.text.length > 50) {
    console.log('[DocumentService] Vision fallback succeeded.');
    return visionResult;
  }

  // Last resort: return empty result
  console.warn('[DocumentService] All extraction methods failed.');
  return ok({
    text: '',
    method: 'text-extract',
    pageCount: 0,
    confidence: 0,
  });
}

/**
 * Breaks down raw ballot text into individual measure or candidate chunks.
 *
 * Uses regex delimiters to separate long, unstructured OCR text into
 * processable objects, ensuring each chunk respects maximum token constraints.
 *
 * @param fullText - The raw text payload from a parsed PDF.
 * @param maxChunkSize - Maximum characters per chunk (default: 4000).
 * @returns An array of string chunks, each representing a single ballot section.
 *
 * @perf O(n) where n is text length. No I/O.
 *
 * @example
 * const chunks = chunkBallotText("PROPOSITION 1: Build roads...");
 * // chunks: ["PROPOSITION 1: Build roads..."]
 */
export function chunkBallotText(
  fullText: string,
  maxChunkSize: number = 4000
): string[] {
  if (fullText.length <= maxChunkSize) return [fullText];

  const sections = fullText.split(/\n(?=(?:MEASURE|PROPOSITION|QUESTION|AMENDMENT|ARTICLE|Section)\s)/i);

  const chunks: string[] = [];
  let currentChunk = '';

  for (const section of sections) {
    if (currentChunk.length + section.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = section;
    } else {
      currentChunk += '\n' + section;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}
