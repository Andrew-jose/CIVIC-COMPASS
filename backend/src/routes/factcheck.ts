/**
 * ═══════════════════════════════════════════════════════════════════════
 * CIVIC COMPASS — Fact-Check Route Handler
 *
 * Verifies civic claims against official sources using Gemini 3.1 Pro
 * with Google Search grounding, URL Context, and Structured Output.
 *
 * @civic-safety
 *   - This is the highest-risk endpoint: a false "True" verdict on a
 *     false claim about ID requirements could prevent someone from voting.
 *   - Uses factcheckFlow which defaults to "Unverifiable" if no
 *     grounding sources are found.
 * ═══════════════════════════════════════════════════════════════════════
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { factcheckFlow } from '../services/genkitFlows';
import { match } from '../../../shared/utils/Result';
import type { JurisdictionContext } from '../prompts/systemPrompt';
import { asyncHandler } from '../middleware/errorHandler';

export const factcheckRouter = Router();

/**
 * POST /api/v1/factcheck
 *
 * Verifies a civic claim using Gemini 3.1 Pro with structured verdicts.
 *
 * @civic-safety
 *   - Model: Gemini 3.1 Pro (maximum reasoning for legal accuracy).
 *   - Grounding: Google Search + URL Context (mandatory).
 *   - Structured Output: JSON schema enforces verdict enum.
 *   - Default: "Unverifiable" when grounding metadata has zero .gov sources.
 */
factcheckRouter.post('/', asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const body = req.body as {
    claim: string;
    jurisdictionContext?: JurisdictionContext;
    language?: string;
  };

  const claim = body.claim;
  const jurisdictionContext = body.jurisdictionContext ?? null;
  const language = body.language ?? 'English';

  if (!claim?.trim()) {
    res.status(400).json({ error: { message: 'Claim text is required' } });
    return;
  }

  const result = await factcheckFlow(claim, jurisdictionContext, language);

  match(result, {
    ok: (flow) => {
      const verdict = JSON.parse(flow.data) as Record<string, unknown>;
      res.json({
        verdict,
        groundingMetadata: flow.groundingMetadata,
        confidence: flow.confidence,
      });
    },
    err: (error) => {
      next(error);
    },
  });
}));
