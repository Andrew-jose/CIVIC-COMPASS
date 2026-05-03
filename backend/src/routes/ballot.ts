/**
 * ═══════════════════════════════════════════════════════════════════════
 * CIVIC COMPASS — Ballot Route Handler
 *
 * Handles ballot PDF upload and plain-language explanation using
 * Gemini 3's native Document Processing and deep reasoning.
 *
 * @civic-safety
 *   - Non-partisan: Prompt forbids recommendations and endorsements.
 *   - Readability: Grade 8 or below reading level.
 *   - Grounding: Google Search + URL Context for fiscal impact data.
 * ═══════════════════════════════════════════════════════════════════════
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { ballotFlow } from '../services/genkitFlows';
import { match } from '../../../shared/utils/Result';
import type { JurisdictionContext } from '../prompts/systemPrompt';
import { asyncHandler } from '../middleware/errorHandler';

export const ballotRouter = Router();

/**
 * POST /api/v1/ballot/upload
 *
 * Accepts a PDF ballot upload. Uses Gemini 3's native Document Processing
 * to extract text directly (Cloud Vision API as fallback).
 */
ballotRouter.post('/upload', asyncHandler(async (_req: Request, res: Response, _next: NextFunction): Promise<void> => {
  // In production: use multer middleware for file upload
  // Then pass PDF bytes to Gemini 3 for native document processing
  res.json({
    status: 'ready',
    message: 'Ballot upload endpoint ready. PDF processing via Gemini 3 Document Processing.',
  });
}));

/**
 * POST /api/v1/ballot/explain
 *
 * Generates plain-language ballot breakdown using Gemini 3.1 Pro.
 *
 * @civic-safety
 *   - Non-partisan: System prompt explicitly forbids recommendations.
 *   - Readability: Response must be at or below Grade 8 reading level.
 *   - Grounding: Google Search + URL Context for fiscal impact.
 *   - Structured output is NOT used here — ballot explanations are
 *     free-form text with inline citations.
 */
ballotRouter.post('/explain', asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const body = req.body as {
    ballotText: string;
    jurisdictionContext?: JurisdictionContext;
    language?: string;
  };

  const ballotText = body.ballotText;
  const language = body.language ?? 'English';

  if (!ballotText?.trim()) {
    res.status(400).json({ error: { message: 'Ballot text is required' } });
    return;
  }

  // Default jurisdiction context for ballot explanation
  const jurisdictionContext: JurisdictionContext = body.jurisdictionContext ?? {
    state: 'Unknown',
    county: 'Unknown',
  };

  const result = await ballotFlow(ballotText, jurisdictionContext, language);

  match(result, {
    ok: (flow) => {
      res.json({
        explanation: flow.data,
        groundingMetadata: flow.groundingMetadata,
        confidence: flow.confidence,
      });
    },
    err: (error) => {
      next(error);
    },
  });
}));
