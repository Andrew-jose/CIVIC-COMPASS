/**
 * CIVIC COMPASS — Genkit Flows (Firebase Genkit AI Orchestration)
 * Production-ready AI pipeline orchestration for all features.
 */

import { generateContent, streamContent, MODELS, THINKING_PRESETS } from './geminiService';
import type { GeminiCallOptions } from './geminiService';
import { buildSystemPrompt, type JurisdictionContext } from '../prompts/systemPrompt';
import { buildBallotPrompt } from '../prompts/ballotPrompt';
import { buildChecklistPrompt, type VoterProfile } from '../prompts/checklistPrompt';
import { buildFactcheckPrompt } from '../prompts/factcheckPrompt';
import { timelineSchema } from '../schemas/timelineSchema';
import { checklistSchema } from '../schemas/checklistSchema';
import { verdictSchema } from '../schemas/verdictSchema';
import { assessConfidence } from './confidenceService';

// ── Chat Flow ────────────────────────────────────────

export interface ChatFlowInput {
  message: string;
  history: any[];
  context: JurisdictionContext;
  language?: string;
}

export async function* chatFlow(input: ChatFlowInput) {
  const systemPrompt = buildSystemPrompt(input.context, input.language);
  const contents = [
    ...input.history,
    { role: 'user', parts: [{ text: input.message }] },
  ];

  const stream = streamContent({
    model: MODELS.FLASH,
    systemInstruction: systemPrompt,
    contents,
    thinkingLevel: THINKING_PRESETS.MODERATE,
    useGoogleSearch: true,
    useUrlContext: true,
  });

  for await (const chunk of stream) {
    yield chunk;
  }
}

// ── Timeline Flow ────────────────────────────────────

export async function timelineFlow(context: JurisdictionContext, language?: string) {
  const systemPrompt = buildSystemPrompt(context, language);
  const result = await generateContent({
    model: MODELS.PRO,
    systemInstruction: systemPrompt,
    contents: [{
      role: 'user',
      parts: [{ text: `Generate a complete election timeline for ${context.state}, ${context.county}. Include all key dates from the jurisdiction data.` }],
    }],
    thinkingLevel: THINKING_PRESETS.DEEP,
    useGoogleSearch: true,
    responseJsonSchema: timelineSchema,
  });

  const confidence = assessConfidence(result.text, result.groundingMetadata, context);
  return { data: result.text, confidence, groundingMetadata: result.groundingMetadata };
}

// ── Checklist Flow ───────────────────────────────────

export async function checklistFlow(
  context: JurisdictionContext,
  profile: VoterProfile,
  language?: string
) {
  const systemPrompt = buildChecklistPrompt(context, profile, language);
  const result = await generateContent({
    model: MODELS.PRO,
    systemInstruction: systemPrompt,
    contents: [{
      role: 'user',
      parts: [{ text: 'Generate my personalized voter readiness checklist based on my profile and jurisdiction.' }],
    }],
    thinkingLevel: THINKING_PRESETS.DEEP,
    useGoogleSearch: true,
    responseJsonSchema: checklistSchema,
  });

  const confidence = assessConfidence(result.text, result.groundingMetadata, context);
  return { data: result.text, confidence, groundingMetadata: result.groundingMetadata };
}

// ── Ballot Flow ──────────────────────────────────────

export async function ballotFlow(
  ballotText: string,
  context: JurisdictionContext,
  language?: string
) {
  const systemPrompt = buildBallotPrompt(ballotText, context, language);
  const result = await generateContent({
    model: MODELS.PRO,
    systemInstruction: systemPrompt,
    contents: [{
      role: 'user',
      parts: [{ text: 'Analyze this ballot and explain each item in plain language.' }],
    }],
    thinkingLevel: THINKING_PRESETS.DEEP,
    useGoogleSearch: true,
    useUrlContext: true,
  });

  const confidence = assessConfidence(result.text, result.groundingMetadata, context);
  return { data: result.text, confidence, groundingMetadata: result.groundingMetadata };
}

// ── Fact-Check Flow ──────────────────────────────────

export async function factcheckFlow(
  claim: string,
  context: JurisdictionContext | null,
  language?: string
) {
  const systemPrompt = buildFactcheckPrompt(claim, context, language);
  const result = await generateContent({
    model: MODELS.PRO,
    systemInstruction: systemPrompt,
    contents: [{
      role: 'user',
      parts: [{ text: `Verify this claim: "${claim}"` }],
    }],
    thinkingLevel: THINKING_PRESETS.DEEP,
    useGoogleSearch: true,
    useUrlContext: true,
    responseJsonSchema: verdictSchema,
  });

  const confidence = assessConfidence(
    result.text,
    result.groundingMetadata,
    context || undefined
  );
  return { data: result.text, confidence, groundingMetadata: result.groundingMetadata };
}
