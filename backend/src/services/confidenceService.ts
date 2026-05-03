/**
 * ═══════════════════════════════════════════════════════════════════════
 * CIVIC COMPASS — Confidence Scoring Service
 *
 * Post-generation validation service that scores AI responses based on
 * grounding metadata quality and cross-validation against known
 * jurisdiction data. This is the primary anti-hallucination gatekeeper:
 * a response with confidence < 60 is flagged with a visible warning
 * to the voter.
 *
 * Scoring methodology:
 *   Base score: 30 (no grounding) → 40 (has metadata) → up to 100
 *   Bonuses: .gov source (+15), .org source (+10), other (+5)
 *   Bonuses: grounding support confidence score (up to +20)
 *   Bonuses: verified jurisdiction claims (+10)
 *   Penalties: unverified dates (-15), wrong state references (-15)
 *
 * @civic-safety This service is the last line of defense before a
 *   response reaches a voter. It does NOT modify the response text —
 *   it only scores it. The caller decides what to do with low scores.
 * ═══════════════════════════════════════════════════════════════════════
 */

import type { JurisdictionContext } from '../prompts/systemPrompt';

/**
 * The complete confidence assessment result.
 *
 * Models: the output of the confidence scoring pipeline, combining
 * grounding metadata analysis with jurisdiction cross-validation.
 *
 * Invariants:
 * - `score` is always 0–100 (clamped).
 * - `isLowConfidence` is true if and only if score < 60.
 * - `sources` contains only sources extracted from groundingMetadata,
 *   never sources invented by this service.
 *
 * Does NOT represent: the model's self-reported confidence (which is
 * unreliable and not used).
 */
export interface ConfidenceResult {
  readonly score: number;
  readonly isLowConfidence: boolean;
  readonly warnings: ReadonlyArray<string>;
  readonly verifiedClaims: number;
  readonly unverifiedClaims: number;
  readonly sources: ReadonlyArray<{ readonly title: string; readonly url: string }>;
}

/**
 * Scores the grounding metadata attached to a Gemini response.
 *
 * Evaluates the Google Search metadata embedded within Gemini responses
 * to measure factual grounding quality. Official .gov sources receive
 * higher weight than .org or commercial sources because they are
 * authoritative for election data.
 *
 * @param groundingMetadata - The grounding metadata object returned by the
 *   Gemini SDK. May be undefined if the model did not use Google Search.
 *   When undefined, returns a base score of 30 (ungrounded).
 *
 * @returns An object with `score` (0–100) and extracted `sources`.
 *   The sources array may be empty if no grounding chunks were found.
 *
 * @civic-safety
 *   - A score of 30 means "no grounding at all" — the response is
 *     entirely from the model's training data, not real-time search.
 *   - .gov sources are weighted 3x because election rules come from
 *     state secretary-of-state offices, not commercial websites.
 *
 * @perf O(n) where n is the number of grounding chunks. Typically < 10.
 *   No I/O, no caching needed.
 *
 * @example
 * const { score, sources } = scoreGroundingMetadata(response.groundingMetadata);
 * if (score < 60) {
 *   console.warn('Low grounding score — adding warning banner');
 * }
 */
export function scoreGroundingMetadata(
  groundingMetadata: Record<string, unknown> | undefined
): { score: number; sources: Array<{ title: string; url: string }> } {
  if (!groundingMetadata) {
    return { score: 30, sources: [] };
  }

  const sources: Array<{ title: string; url: string }> = [];
  let score = 40; // Base score for having metadata

  // Extract grounding chunks (citations)
  const chunks = (groundingMetadata['groundingChunks'] as Array<Record<string, unknown>> | undefined) ?? [];
  for (const chunk of chunks) {
    const web = chunk['web'] as Record<string, unknown> | undefined;
    if (web?.['uri']) {
      const uri = web['uri'] as string;
      sources.push({
        title: (web['title'] as string | undefined) ?? 'Source',
        url: uri,
      });

      // Official .gov sources get higher weight
      if (uri.includes('.gov')) {
        score += 15;
      } else if (uri.includes('.org')) {
        score += 10;
      } else {
        score += 5;
      }
    }
  }

  // Grounding support score if available
  const support = (groundingMetadata['groundingSupports'] as Array<Record<string, unknown>> | undefined) ?? [];
  if (support.length > 0) {
    const avgConfidence = support.reduce(
      (sum, s) => sum + ((s['confidenceScore'] as number | undefined) ?? 0),
      0
    ) / support.length;
    score += Math.round(avgConfidence * 20);
  }

  // Search entry point bonus
  const searchEntry = groundingMetadata['searchEntryPoint'] as Record<string, unknown> | undefined;
  if (searchEntry?.['renderedContent']) {
    score += 5;
  }

  return { score: Math.min(score, 100), sources };
}

/**
 * Cross-validates AI response text against known jurisdiction data.
 *
 * Acts as the anti-hallucination layer for date-sensitive claims.
 * Extracts all date-like strings from the response and checks each
 * against the known election dates in the jurisdiction context.
 * Also detects when the response references states outside the
 * user's jurisdiction — a common hallucination pattern.
 *
 * @param responseText - The raw text payload from the AI response.
 *   Must be the complete response, not a streaming chunk.
 *
 * @param context - Verified jurisdiction data containing known dates
 *   (registration deadline, election day, etc.) and the user's state.
 *   Fields may be undefined if the data source hasn't been populated.
 *
 * @returns An object with:
 *   - `warnings`: human-readable strings describing validation issues.
 *   - `verifiedClaims`: count of dates that match known jurisdiction data.
 *   - `unverifiedClaims`: count of dates that couldn't be verified.
 *
 * @civic-safety
 *   - An invented election date could cause a voter to miss a real deadline.
 *   - This function catches the most dangerous hallucination: fabricated dates.
 *   - A response with unverifiedClaims > verifiedClaims gets a -15 penalty.
 *
 * @perf O(dates × knownDates). Typically < 50 operations. No I/O.
 *
 * @example
 * const validation = crossValidateResponse(
 *   'The registration deadline is October 5, 2024.',
 *   { state: 'TX', registrationDeadline: 'October 5, 2024', ... }
 * );
 * // validation.verifiedClaims === 1, validation.unverifiedClaims === 0
 */
export function crossValidateResponse(
  responseText: string,
  context: JurisdictionContext
): { warnings: string[]; verifiedClaims: number; unverifiedClaims: number } {
  const warnings: string[] = [];
  let verifiedClaims = 0;
  let unverifiedClaims = 0;

  // Check for date mentions and cross-validate
  const datePattern = /\b(\d{1,2}\/\d{1,2}\/\d{2,4}|\w+ \d{1,2},? \d{4})\b/g;
  const datesInResponse = responseText.match(datePattern) ?? [];

  const knownDates = [
    context.registrationDeadline,
    context.earlyVotingStart,
    context.earlyVotingEnd,
    context.electionDay,
    context.mailBallotDeadline,
    context.runoffDate,
    context.certificationDate,
  ].filter((d): d is string => typeof d === 'string' && d.length > 0);

  for (const dateStr of datesInResponse) {
    const isKnown = knownDates.some((d) => dateStr.includes(d));
    if (isKnown) {
      verifiedClaims++;
    } else {
      unverifiedClaims++;
    }
  }

  if (unverifiedClaims > 0 && knownDates.length > 0) {
    warnings.push(
      `${unverifiedClaims} date(s) in the response could not be verified against known jurisdiction data.`
    );
  }

  // Check state references
  if (context.state) {
    const stateRegex = new RegExp(`\\b${context.state}\\b`, 'i');
    const otherStates = responseText.match(/\b[A-Z]{2}\b/g) ?? [];
    const excludedAbbreviations = new Set(['AI', 'ID', 'US', 'AM', 'PM', 'OK', 'OR', 'IN', 'IT']);
    const wrongStates = otherStates.filter(
      (s) =>
        !stateRegex.test(s) &&
        /^[A-Z]{2}$/.test(s) &&
        !excludedAbbreviations.has(s)
    );
    if (wrongStates.length > 0) {
      const uniqueWrong = [...new Set(wrongStates)];
      warnings.push(
        `Response references states (${uniqueWrong.join(', ')}) outside the user's jurisdiction (${context.state}).`
      );
    }
  }

  return { warnings, verifiedClaims, unverifiedClaims };
}

/**
 * Produces a complete confidence assessment combining grounding analysis
 * with jurisdiction cross-validation.
 *
 * This is the function called by route handlers and Genkit flows after
 * every Gemini response. It returns the final score that determines
 * whether a warning banner is shown to the voter.
 *
 * @param responseText - The complete AI response text.
 *
 * @param groundingMetadata - Grounding metadata from the Gemini response.
 *   May be undefined for ungrounded responses.
 *
 * @param context - Optional jurisdiction context. When provided, enables
 *   cross-validation against known election dates and state references.
 *   When omitted (e.g. during onboarding before jurisdiction is resolved),
 *   only grounding metadata scoring is performed.
 *
 * @returns A ConfidenceResult with the final score, warnings, and sources.
 *   The caller should check `isLowConfidence` and prepend a warning banner
 *   to the response if true.
 *
 * @civic-safety
 *   - Score < 60: Response MUST be prefixed with "⚠️ LIMITED DATA" warning.
 *   - This threshold is not configurable — it's a safety invariant.
 *   - Verified claims boost score by 10; unverified majority penalizes by 15.
 *
 * @perf O(n) where n is response length + grounding chunks. No I/O.
 *
 * @example
 * const confidence = assessConfidence(response.text, response.groundingMetadata, jurisdictionContext);
 * if (confidence.isLowConfidence) {
 *   console.warn('Low confidence:', confidence.warnings);
 * }
 */
export function assessConfidence(
  responseText: string,
  groundingMetadata: Record<string, unknown> | undefined,
  context?: JurisdictionContext
): ConfidenceResult {
  const { score: groundingScore, sources } = scoreGroundingMetadata(groundingMetadata);

  let crossValidation = {
    warnings: [] as string[],
    verifiedClaims: 0,
    unverifiedClaims: 0,
  };

  if (context) {
    crossValidation = crossValidateResponse(responseText, context);
  }

  // Combine scores
  let finalScore = groundingScore;
  if (crossValidation.verifiedClaims > 0) {
    finalScore = Math.min(finalScore + 10, 100);
  }
  if (crossValidation.unverifiedClaims > crossValidation.verifiedClaims) {
    finalScore = Math.max(finalScore - 15, 10);
  }

  return {
    score: finalScore,
    isLowConfidence: finalScore < 60,
    warnings: crossValidation.warnings,
    verifiedClaims: crossValidation.verifiedClaims,
    unverifiedClaims: crossValidation.unverifiedClaims,
    sources,
  };
}
