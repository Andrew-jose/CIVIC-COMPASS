/**
 * ═══════════════════════════════════════════════════════════════════════
 * CIVIC COMPASS — Checklist Route Handler
 *
 * Generates personalized voter readiness checklists using Gemini 3.1 Pro
 * with Structured Output and deep reasoning.
 *
 * @civic-safety
 *   - Uses checklistFlow which wraps generateContent in fromPromise().
 *   - VoterProfile data is never logged or stored.
 *   - Confidence scoring validates against jurisdiction dates.
 * ═══════════════════════════════════════════════════════════════════════
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { checklistFlow } from '../services/genkitFlows';
import { match } from '../../../shared/utils/Result';
import type { JurisdictionContext } from '../prompts/systemPrompt';
import type { VoterProfile } from '../prompts/checklistPrompt';
import { asyncHandler } from '../middleware/errorHandler';

export const checklistRouter = Router();

/**
 * POST /api/v1/checklist
 *
 * Generates a personalized voter readiness checklist using Gemini 3.1 Pro
 * with Structured Output and deep reasoning (thinkingLevel: "high").
 *
 * @civic-safety
 *   - Model: Gemini 3.1 Pro with deep thinking for rule interpretation.
 *   - Grounding: Google Search for real-time requirements.
 *   - Structured Output: JSON schema enforces checklist item shape.
 *
 * @privacy
 *   - userAnswers (VoterProfile) are used only for prompt construction.
 *   - They are NOT logged, NOT stored in Firestore, NOT included in analytics.
 */
checklistRouter.post('/', asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const body = req.body as {
    jurisdictionContext: JurisdictionContext;
    userAnswers: {
      isRegistered: boolean;
      hasMovedRecently: boolean;
      votingMethod: 'in-person' | 'mail' | 'undecided';
      needsAccessibility: boolean;
      isFirstTimeInState: boolean;
    };
    language?: string;
  };

  const jurisdictionContext = body.jurisdictionContext;
  const userAnswers = body.userAnswers;
  const language = body.language ?? 'English';

  if (!jurisdictionContext?.state || !userAnswers) {
    res.status(400).json({ error: { message: 'Jurisdiction context and user answers are required' } });
    return;
  }

  // Map request body to VoterProfile
  const profile: VoterProfile = {
    isRegistered: userAnswers.isRegistered,
    hasMovedRecently: userAnswers.hasMovedRecently,
    votingMethod: userAnswers.votingMethod,
    needsAccessibility: userAnswers.needsAccessibility,
    isFirstTimeInState: userAnswers.isFirstTimeInState,
  };

  const result = await checklistFlow(jurisdictionContext, profile, language);

  match(result, {
    ok: (flow) => {
      const checklist = JSON.parse(flow.data) as Record<string, unknown>;
      res.json({
        checklist,
        groundingMetadata: flow.groundingMetadata,
        confidence: flow.confidence,
      });
    },
    err: (error) => {
      next(error);
    },
  });
}));
