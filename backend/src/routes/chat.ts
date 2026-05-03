/**
 * ═══════════════════════════════════════════════════════════════════════
 * CIVIC COMPASS — Chat Route Handler
 *
 * Streams Gemini 3 responses via Server-Sent Events (SSE).
 * This is the primary user-facing endpoint — every conversation
 * in the UI flows through this route.
 *
 * Architecture:
 *   Request → Validate → Build prompt → Stream Gemini → SSE events
 *
 * @civic-safety
 *   - System prompt enforces grounding contract (no hallucinated facts).
 *   - Google Search is enabled only when jurisdiction is resolved.
 *   - Without jurisdiction, the onboarding prompt is used (no facts).
 * ═══════════════════════════════════════════════════════════════════════
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import {
  streamContent,
  MODELS,
  THINKING_PRESETS,
} from '../services/geminiService';
import type { ChatMessage } from '../services/geminiService';
import { buildSystemPrompt, buildOnboardingPrompt } from '../prompts/systemPrompt';
import type { JurisdictionContext } from '../prompts/systemPrompt';

export const chatRouter = Router();

/**
 * Shape of the POST body for /api/v1/chat.
 */
interface ChatRequestBody {
  readonly message: string;
  readonly conversationHistory?: ReadonlyArray<ChatMessage>;
  readonly jurisdictionContext?: JurisdictionContext;
  readonly language?: string;
  readonly thoughtSignatures?: Record<number, string>;
}

/**
 * POST /api/v1/chat
 *
 * Streams a Gemini 3 response via Server-Sent Events (SSE).
 *
 * Uses:
 *   - Gemini 3 Flash for fast conversational responses.
 *   - Google Search grounding for real-time verification.
 *   - URL Context for official source reading.
 *   - Thought Signatures for reasoning chain persistence.
 *   - thinkingLevel: "medium" for balanced speed/quality.
 *
 * @civic-safety
 *   - Streaming responses cannot be pre-validated for hallucinations.
 *     The system prompt is the primary defense during streaming.
 *   - Confidence scoring happens post-stream on the accumulated text
 *     (handled by the frontend).
 */
chatRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as ChatRequestBody;
    const message = body.message;
    const conversationHistory = body.conversationHistory ?? [];
    const jurisdictionContext = body.jurisdictionContext;
    const language = body.language ?? 'English';

    if (!message?.trim()) {
      res.status(400).json({ error: { message: 'Message is required' } });
      return;
    }

    // Build system prompt based on whether jurisdiction is resolved
    const systemInstruction = jurisdictionContext
      ? buildSystemPrompt(jurisdictionContext, language)
      : buildOnboardingPrompt(language);

    // Append the new user message to conversation history
    const contents: ChatMessage[] = [
      ...conversationHistory,
      {
        role: 'user',
        parts: [{ text: message }],
      },
    ];

    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    // Stream Gemini response
    const stream = streamContent({
      model: MODELS.FLASH,
      systemInstruction,
      contents,
      thinkingLevel: THINKING_PRESETS.MODERATE,
      useGoogleSearch: !!jurisdictionContext,
      useUrlContext: !!jurisdictionContext,
    });

    for await (const chunk of stream) {
      if (chunk.text) {
        res.write(`data: ${JSON.stringify({ type: 'text', content: chunk.text })}\n\n`);
      }
      if (chunk.done) {
        res.write(`data: ${JSON.stringify({
          type: 'done',
          thoughtSignature: chunk.thoughtSignature,
        })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[CHAT] Stream error:', errorMessage);

    // If headers not sent yet, send error as JSON
    if (!res.headersSent) {
      res.status(500).json({ error: { message: 'Failed to generate response' } });
    } else {
      // If already streaming, send error event
      res.write(`data: ${JSON.stringify({ type: 'error', message: errorMessage })}\n\n`);
      res.end();
    }
  }
});
