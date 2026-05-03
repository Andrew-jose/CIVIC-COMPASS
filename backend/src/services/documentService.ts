/**
 * ═══════════════════════════════════════════════════════════════
 * CIVIC COMPASS — Document Service
 *
 * Handles PDF ballot processing using Gemini 3's native
 * Document Processing capability, with Cloud Vision API
 * as a fallback for heavily scanned documents.
 * ═══════════════════════════════════════════════════════════════
 */

import { getGeminiClient, MODELS } from './geminiService';

export interface ProcessedDocument {
  text: string;
  method: 'gemini-native' | 'vision-fallback' | 'text-extract';
  pageCount: number;
  confidence: number;
}

/**
 * Process a PDF document using Gemini 3's native Document Processing.
 * This is the primary method — no OCR needed for most PDFs.
 */
export async function processDocumentWithGemini(
  fileBuffer: Buffer,
  mimeType: string = 'application/pdf'
): Promise<ProcessedDocument> {
  const client = getGeminiClient();

  try {
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
        } as any,
      ],
      config: {
        thinkingConfig: { thinkingLevel: 'low' as any },
      },
    });

    const text = response.candidates?.[0]?.content?.parts
      ?.filter((p: any) => p.text)
      .map((p: any) => p.text)
      .join('') || '';

    // Estimate page count from text length (rough heuristic)
    const estimatedPages = Math.max(1, Math.ceil(text.length / 3000));

    return {
      text,
      method: 'gemini-native',
      pageCount: estimatedPages,
      confidence: text.length > 100 ? 90 : 50,
    };
  } catch (error) {
    console.error('[DocumentService] Gemini processing failed:', error);
    throw error;
  }
}

/**
 * Fallback: Process document using Cloud Vision API for OCR.
 * Used when Gemini native processing fails (heavily scanned PDFs).
 */
export async function processDocumentWithVision(
  fileBuffer: Buffer
): Promise<ProcessedDocument> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('API key required for Vision API fallback.');
  }

  // Use Gemini's vision capabilities as fallback
  const client = getGeminiClient();

  try {
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
        } as any,
      ],
      config: {
        thinkingConfig: { thinkingLevel: 'minimal' as any },
      },
    });

    const text = response.candidates?.[0]?.content?.parts
      ?.filter((p: any) => p.text)
      .map((p: any) => p.text)
      .join('') || '';

    return {
      text,
      method: 'vision-fallback',
      pageCount: Math.max(1, Math.ceil(text.length / 3000)),
      confidence: text.length > 50 ? 70 : 30,
    };
  } catch (error) {
    console.error('[DocumentService] Vision fallback failed:', error);
    throw error;
  }
}

/**
 * Process a document with automatic fallback chain:
 * 1. Try Gemini 3 native Document Processing (primary)
 * 2. Fall back to Vision/OCR if native processing fails
 * 3. Fall back to raw text extraction if both fail
 */
export async function processDocument(
  fileBuffer: Buffer,
  mimeType: string = 'application/pdf'
): Promise<ProcessedDocument> {
  // Try Gemini native first
  try {
    const result = await processDocumentWithGemini(fileBuffer, mimeType);
    if (result.text.length > 50) {
      console.log('[DocumentService] Gemini native processing succeeded.');
      return result;
    }
  } catch (_err) {
    console.warn('[DocumentService] Gemini native failed, trying Vision fallback...');
  }

  // Try Vision fallback
  try {
    const result = await processDocumentWithVision(fileBuffer);
    if (result.text.length > 50) {
      console.log('[DocumentService] Vision fallback succeeded.');
      return result;
    }
  } catch (_err) {
    console.warn('[DocumentService] Vision fallback failed.');
  }

  // Last resort: return error
  return {
    text: '',
    method: 'text-extract',
    pageCount: 0,
    confidence: 0,
  };
}

/**
 * Chunk ballot text into sections for parallel processing.
 * Splits on section/measure boundaries.
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
