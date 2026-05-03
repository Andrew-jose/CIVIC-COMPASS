/**
 * ═══════════════════════════════════════════════════════════════════════
 * CIVIC COMPASS — Timeline Route Handler
 *
 * Generates personalized election timelines using Gemini 3 with
 * Structured Output and Google Search grounding.
 *
 * @civic-safety
 *   - Uses timelineFlow which wraps generateContent in fromPromise().
 *   - All errors are typed AppError variants.
 *   - Confidence scoring validates dates against jurisdiction data.
 * ═══════════════════════════════════════════════════════════════════════
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { timelineFlow } from '../services/genkitFlows';
import { match } from '../../../shared/utils/Result';
import type { JurisdictionContext } from '../prompts/systemPrompt';
import { asyncHandler } from '../middleware/errorHandler';

export const timelineRouter = Router();

/**
 * POST /api/v1/timeline
 *
 * Generates a complete election timeline using Gemini 3 with Structured Output.
 * Uses the timelineFlow which returns Result<FlowResult, AppError>.
 *
 * @civic-safety
 *   - Model: Gemini 3.1 Pro with deep thinking for date accuracy.
 *   - Grounding: Google Search for real-time date verification.
 *   - Post-generation: assessConfidence() cross-validates dates.
 *   - If confidence < 60, the response includes a warning.
 */
timelineRouter.post('/', asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const body = req.body as {
    jurisdictionContext: JurisdictionContext;
    language?: string;
  };

  const jurisdictionContext = body.jurisdictionContext;
  const language = body.language ?? 'English';

  if (!jurisdictionContext?.state) {
    res.status(400).json({ error: { message: 'Jurisdiction context is required' } });
    return;
  }

  const result = await timelineFlow(jurisdictionContext, language);

  match(result, {
    ok: (flow) => {
      const timeline = JSON.parse(flow.data) as Record<string, unknown>;
      res.json({
        timeline,
        groundingMetadata: flow.groundingMetadata,
        confidence: flow.confidence,
      });
    },
    err: (error) => {
      next(error);
    },
  });
}));
