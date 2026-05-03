/**
 * ═══════════════════════════════════════════════════════════════
 * CIVIC COMPASS — Confidence Service
 *
 * Post-generation validation service that scores AI responses
 * based on groundingMetadata quality and cross-validation
 * against jurisdiction data.
 * ═══════════════════════════════════════════════════════════════
 */

import type { JurisdictionContext } from '../prompts/systemPrompt';

export interface ConfidenceResult {
  score: number;          // 0-100
  isLowConfidence: boolean;
  warnings: string[];
  verifiedClaims: number;
  unverifiedClaims: number;
  sources: Array<{ title: string; url: string }>;
}

/**
 * Calculate confidence score from grounding metadata.
 * Higher score = more official sources cited.
 */
export function scoreGroundingMetadata(
  groundingMetadata: any
): { score: number; sources: Array<{ title: string; url: string }> } {
  if (!groundingMetadata) {
    return { score: 30, sources: [] };
  }

  const sources: Array<{ title: string; url: string }> = [];
  let score = 40; // base score for having metadata

  // Extract grounding chunks (citations)
  const chunks = groundingMetadata.groundingChunks || [];
  for (const chunk of chunks) {
    if (chunk.web?.uri) {
      sources.push({
        title: chunk.web.title || 'Source',
        url: chunk.web.uri,
      });

      // Official .gov sources get higher weight
      if (chunk.web.uri.includes('.gov')) {
        score += 15;
      } else if (chunk.web.uri.includes('.org')) {
        score += 10;
      } else {
        score += 5;
      }
    }
  }

  // Grounding support score if available
  const support = groundingMetadata.groundingSupports || [];
  if (support.length > 0) {
    const avgConfidence = support.reduce(
      (sum: number, s: any) => sum + (s.confidenceScore || 0),
      0
    ) / support.length;
    score += Math.round(avgConfidence * 20);
  }

  // Search entry point if available
  if (groundingMetadata.searchEntryPoint?.renderedContent) {
    score += 5;
  }

  return { score: Math.min(score, 100), sources };
}

/**
 * Cross-validate AI response text against jurisdiction data.
 * Checks for date consistency, correct state references, etc.
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
  const datesInResponse = responseText.match(datePattern) || [];

  const knownDates = [
    context.registrationDeadline,
    context.earlyVotingStart,
    context.earlyVotingEnd,
    context.electionDay,
    context.mailBallotDeadline,
    context.runoffDate,
    context.certificationDate,
  ].filter(Boolean);

  for (const dateStr of datesInResponse) {
    const isKnown = knownDates.some((d) => d && dateStr.includes(d));
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
    const otherStates = responseText.match(/\b[A-Z]{2}\b/g) || [];
    const wrongStates = otherStates.filter(
      (s) => !stateRegex.test(s) && /^[A-Z]{2}$/.test(s) && s !== 'AI' && s !== 'ID' && s !== 'US'
    );
    if (wrongStates.length > 0) {
      warnings.push(
        `Response references states (${wrongStates.join(', ')}) outside the user's jurisdiction (${context.state}).`
      );
    }
  }

  return { warnings, verifiedClaims, unverifiedClaims };
}

/**
 * Full confidence assessment combining grounding metadata and cross-validation.
 */
export function assessConfidence(
  responseText: string,
  groundingMetadata: any,
  context?: JurisdictionContext
): ConfidenceResult {
  const { score: groundingScore, sources } = scoreGroundingMetadata(groundingMetadata);

  let crossValidation = { warnings: [] as string[], verifiedClaims: 0, unverifiedClaims: 0 };
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
