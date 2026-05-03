import { Router, Request, Response } from 'express';
import {
  streamContent,
  MODELS,
  THINKING_PRESETS,
  ChatMessage,
} from '../services/geminiService';
import { buildSystemPrompt, buildOnboardingPrompt, JurisdictionContext } from '../prompts/systemPrompt';

export const chatRouter = Router();

interface ChatRequestBody {
  message: string;
  conversationHistory?: ChatMessage[];
  jurisdictionContext?: JurisdictionContext;
  language?: string;
  thoughtSignatures?: Record<number, string>;
}

/**
 * POST /api/v1/chat
 * Streams Gemini 3 response via Server-Sent Events (SSE).
 * 
 * Uses:
 *   - Gemini 3 Flash for fast conversational responses
 *   - Google Search grounding for real-time verification
 *   - URL Context for official source reading
 *   - Thought Signatures for reasoning chain persistence
 *   - thinkingLevel: "medium" for balanced speed/quality
 */
chatRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      message,
      conversationHistory = [],
      jurisdictionContext,
      language = 'English',
    } = req.body as ChatRequestBody;

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
      Connection: 'keep-alive',
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
  } catch (error: any) {
    console.error('[CHAT] Stream error:', error);

    // If headers not sent yet, send error as JSON
    if (!res.headersSent) {
      res.status(500).json({ error: { message: 'Failed to generate response' } });
    } else {
      // If already streaming, send error event
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
      res.end();
    }
  }
});
