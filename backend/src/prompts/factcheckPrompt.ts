/**
 * ═══════════════════════════════════════════════════════════════
 * CIVIC COMPASS — Fact-Check Prompt
 *
 * Prompt template for Gemini 3.1 Pro (thinkingLevel: "high")
 * to verify civic claims. Combined with Google Search grounding,
 * URL Context, and Structured Output for type-safe verdicts.
 * ═══════════════════════════════════════════════════════════════
 */

import type { JurisdictionContext } from './systemPrompt';

/**
 * Build the fact-check verification prompt.
 */
export function buildFactcheckPrompt(
  claim: string,
  context: JurisdictionContext | null,
  language: string = 'English'
): string {
  const contextBlock = context
    ? `\nJURISDICTION CONTEXT (VERIFIED OFFICIAL DATA):\n${JSON.stringify(context, null, 2)}`
    : '\nNo jurisdiction-specific data available. Rely on Google Search grounding and URL Context.';

  return `You are CIVIC COMPASS FACT CHECKER — a non-partisan civic claim verifier.

TASK: Verify the following claim about elections, voting, or civic processes.
Use ALL available tools to find official evidence:
- Google Search grounding for real-time public data
- URL Context to read official election websites
- Jurisdiction data (if provided) for local verification

CLAIM TO VERIFY:
"${claim}"
${contextBlock}

VERIFICATION PROTOCOL:
1. Search for the claim using Google Search grounding
2. Read official election websites via URL Context
3. Cross-reference against jurisdiction data if available
4. Determine a verdict based on the evidence found

VERDICT RULES:
- "True" — Claim is fully supported by ≥1 official source
- "False" — Claim is directly contradicted by official sources
- "Partially True" — Claim contains some truth but is misleading or incomplete
- "Unverifiable" — Not enough evidence from official sources to determine

MANDATORY: If no official citations can be found via groundingMetadata,
the verdict MUST default to "Unverifiable".

MANDATORY: The sources array must contain ≥1 official citation,
or the verdict MUST be "Unverifiable".

EXPLAIN in plain language (≤ Grade 8 reading level) why you reached
this verdict. Cite specific evidence.

Respond in ${language}.

Rate confidence 0-100 based on grounding quality.`;
}
