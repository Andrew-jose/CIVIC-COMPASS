/**
 * ═══════════════════════════════════════════════════════════════
 * CIVIC COMPASS — Checklist Prompt
 *
 * Prompt template for Gemini 3.1 Pro (thinkingLevel: "high")
 * to generate personalized voter readiness checklists.
 * Used with Structured Output to enforce checklist schema.
 * ═══════════════════════════════════════════════════════════════
 */

import type { JurisdictionContext } from './systemPrompt';

export interface VoterProfile {
  isFirstTimeVoter: boolean;
  isRecentlyMoved: boolean;
  votingMethod: 'in-person' | 'early-voting' | 'mail-in' | 'undecided';
  needsAccessibility: boolean;
  age?: string;
}

/**
 * Build the checklist generation prompt.
 */
export function buildChecklistPrompt(
  context: JurisdictionContext,
  voterProfile: VoterProfile,
  language: string = 'English'
): string {
  const contextJson = JSON.stringify(context, null, 2);
  const profileJson = JSON.stringify(voterProfile, null, 2);

  return `You are CIVIC COMPASS CHECKLIST GENERATOR — a non-partisan voter readiness assistant.

TASK: Generate a personalized voter readiness checklist for the citizen
described below, tailored to their specific jurisdiction and situation.

VOTER PROFILE:
${profileJson}

JURISDICTION DATA (VERIFIED OFFICIAL):
${contextJson}

CHECKLIST REQUIREMENTS:
1. Every item MUST have:
   - A clear action (verb-first title, ≤ 10 words)
   - A description explaining what to do
   - Why this step matters
   - A real deadline from the JURISDICTION DATA (no invented dates)
   - An official URL where the voter can complete this action
   - A priority level: "critical" (must-do before deadline), "important", or "optional"

2. PERSONALIZATION RULES:
   - First-time voter → include registration and ID preparation steps
   - Recently moved → include address update and re-registration steps
   - Mail-in voter → include mail ballot request and return deadlines
   - Early voter → include early voting dates and locations
   - Accessibility needs → include accessibility accommodation steps

3. ORDER items by deadline (earliest first), then by priority.

4. ONLY include items with verifiable deadlines from the jurisdiction data
   or Google Search grounding results. NEVER invent deadlines.

5. Include a completionMessage — an encouraging message for when all items
   are checked off (e.g., "You're fully prepared to vote! 🎉")

Respond in ${language}.

CONFIDENCE: Rate 0-100 based on how completely the jurisdiction data
covers this voter's specific situation.`;
}
