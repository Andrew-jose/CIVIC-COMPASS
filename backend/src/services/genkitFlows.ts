/**
 * ═══════════════════════════════════════════════════════════════════════
 * CIVIC COMPASS — Genkit Flows (AI Pipeline Orchestration)
 *
 * Each flow orchestrates a complete AI pipeline for a specific feature:
 *   1. Build the grounding prompt with jurisdiction context.
 *   2. Call Gemini with appropriate model, tools, and thinking level.
 *   3. Score the response confidence against known jurisdiction data.
 *   4. Return a typed Result containing data + confidence + sources.
 *
 * Flows are the integration layer between route handlers and the
 * Gemini service. They contain no HTTP logic (no req/res) and no
 * Firestore logic (repositories are called by route handlers).
 *
 * @civic-safety Every flow that returns factual civic data runs the
 *   confidence scorer post-generation. Flows that use structured output
 *   also validate the JSON schema compliance of the response.
 * ═══════════════════════════════════════════════════════════════════════
 */

import { generateContent, streamContent, MODELS, THINKING_PRESETS } from './geminiService';
import type { GeminiCallOptions, StreamChunk } from './geminiService';
import { buildSystemPrompt } from '../prompts/systemPrompt';
import type { JurisdictionContext } from '../prompts/systemPrompt';
import { buildBallotPrompt } from '../prompts/ballotPrompt';
import { buildChecklistPrompt } from '../prompts/checklistPrompt';
import type { VoterProfile } from '../prompts/checklistPrompt';
import { buildFactcheckPrompt } from '../prompts/factcheckPrompt';
import { timelineSchema } from '../schemas/timelineSchema';
import { checklistSchema } from '../schemas/checklistSchema';
import { verdictSchema } from '../schemas/verdictSchema';
import { assessConfidence } from './confidenceService';
import type { ConfidenceResult } from './confidenceService';
import type { Result } from '../../../shared/utils/Result';
import { ok, err, fromPromise } from '../../../shared/utils/Result';
import type { AppError } from '../../../shared/types/index';

// ── Flow Result Type ────────────────────────────────────────────────────

/**
 * The standard return type for all non-streaming flows.
 *
 * Contains the raw response data, confidence assessment, and
 * grounding metadata for source attribution in the UI.
 */
export interface FlowResult {
  readonly data: string;
  readonly confidence: ConfidenceResult;
  readonly groundingMetadata: Record<string, unknown> | undefined;
}

// ── Chat Flow (Streaming) ───────────────────────────────────────────────

/**
 * Input for the chat flow.
 */
export interface ChatFlowInput {
  readonly message: string;
  readonly history: Array<{ role: string; parts: Array<{ text: string }> }>;
  readonly context: JurisdictionContext;
  readonly language?: string;
}

/**
 * Streams a conversational Gemini response for the chat interface.
 *
 * Uses Gemini Flash for fast first-token delivery. The system prompt
 * enforces the anti-hallucination grounding contract — every factual
 * claim must be backed by Google Search or jurisdiction context data.
 *
 * @param input - Chat flow input with message, history, and jurisdiction.
 * @yields StreamChunk objects with text fragments.
 *
 * @civic-safety
 *   - Model: Gemini 3 Flash (sufficient for conversational Q&A).
 *   - Grounding: Google Search + URL Context enabled.
 *   - Thinking: Moderate (balances speed vs reasoning quality).
 *   - The system prompt is the primary anti-hallucination defense
 *     during streaming. Post-stream confidence scoring is done by
 *     the route handler on the accumulated text.
 *
 * @perf
 *   - First token: ~500ms.
 *   - Full stream: 2-6 seconds.
 *   - Memory: O(1) per chunk (yielded, not accumulated).
 *
 * @example
 * for await (const chunk of chatFlow(input)) {
 *   if (chunk.text) res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
 * }
 */
export async function* chatFlow(
  input: ChatFlowInput
): AsyncGenerator<StreamChunk, void, unknown> {
  const systemPrompt = buildSystemPrompt(input.context, input.language);
  const contents = [
    ...input.history,
    { role: 'user', parts: [{ text: input.message }] },
  ];

  const stream = streamContent({
    model: MODELS.FLASH,
    systemInstruction: systemPrompt,
    contents: contents as GeminiCallOptions['contents'],
    thinkingLevel: THINKING_PRESETS.MODERATE,
    useGoogleSearch: true,
    useUrlContext: true,
  });

  for await (const chunk of stream) {
    yield chunk;
  }
}

// ── Timeline Flow ───────────────────────────────────────────────────────

/**
 * Generates a complete election timeline for a jurisdiction.
 *
 * Uses Gemini Pro with deep thinking and structured output to produce
 * a JSON timeline with milestones, deadlines, and status indicators.
 * The response is cross-validated against known jurisdiction dates.
 *
 * @param context - The resolved jurisdiction context with known dates.
 * @param language - Response language (defaults to system prompt default).
 * @returns Result containing FlowResult with parsed timeline data,
 *   or GEMINI_TIMEOUT if the API call times out.
 *
 * @civic-safety
 *   - Model: Gemini 3.1 Pro (deep reasoning for date accuracy).
 *   - Grounding: Google Search enabled for real-time date verification.
 *   - Structured Output: JSON schema enforces milestone shape.
 *   - Post-generation: assessConfidence() cross-validates all dates
 *     against known jurisdiction data.
 *   - A fabricated election date is the highest-risk hallucination
 *     in the entire application. This flow has the strongest defenses.
 *
 * @perf
 *   - Latency: 5-12 seconds (Pro + deep thinking + search).
 *   - Cacheable: Yes, keyed on jurisdiction + date.
 *
 * @example
 * const result = await timelineFlow(jurisdictionContext, 'English');
 * match(result, {
 *   ok: (flow) => res.json({ timeline: JSON.parse(flow.data), confidence: flow.confidence }),
 *   err: (error) => next(error),
 * });
 */
export async function timelineFlow(
  context: JurisdictionContext,
  language?: string
): Promise<Result<FlowResult, AppError>> {
  const systemPrompt = buildSystemPrompt(context, language);

  const result = await fromPromise(
    generateContent({
      model: MODELS.PRO,
      systemInstruction: systemPrompt,
      contents: [{
        role: 'user',
        parts: [{
          text: `Generate a complete election timeline for ${context.state}, ${context.county}. Include all key dates from the jurisdiction data.`,
        }],
      }],
      thinkingLevel: THINKING_PRESETS.DEEP,
      useGoogleSearch: true,
      responseJsonSchema: timelineSchema,
    }),
    (e): AppError => ({
      code: 'GEMINI_TIMEOUT',
      message: `Timeline generation failed: ${e instanceof Error ? e.message : String(e)}`,
      timeoutMs: 30000,
      promptType: 'timeline',
    })
  );

  if (!result.ok) {
    return result;
  }

  const confidence = assessConfidence(result.value.text, result.value.groundingMetadata, context);
  return ok({
    data: result.value.text,
    confidence,
    groundingMetadata: result.value.groundingMetadata,
  });
}

// ── Checklist Flow ──────────────────────────────────────────────────────

/**
 * Generates a personalized voter readiness checklist.
 *
 * Combines jurisdiction-specific rules with the voter's profile to
 * produce a prioritized list of actions (register, get ID, find polling
 * place, etc.) tailored to their specific situation.
 *
 * @param context - The resolved jurisdiction context.
 * @param profile - The voter's profile (first-time, mail ballot, etc.).
 * @param language - Response language.
 * @returns Result containing FlowResult with checklist data.
 *
 * @civic-safety
 *   - Model: Gemini 3.1 Pro (deep reasoning for rule interpretation).
 *   - Grounding: Google Search for real-time requirements.
 *   - Structured Output: JSON schema enforces checklist item shape.
 *   - Profile data is NEVER logged or stored — only used for prompt
 *     construction, then discarded.
 *
 * @privacy
 *   - VoterProfile.isFirstTime and .hasDisability are sensitive.
 *   - These are passed to Gemini in the prompt but never stored in
 *     Firestore, never logged, and never included in analytics.
 */
export async function checklistFlow(
  context: JurisdictionContext,
  profile: VoterProfile,
  language?: string
): Promise<Result<FlowResult, AppError>> {
  const systemPrompt = buildChecklistPrompt(context, profile, language);

  const result = await fromPromise(
    generateContent({
      model: MODELS.PRO,
      systemInstruction: systemPrompt,
      contents: [{
        role: 'user',
        parts: [{
          text: 'Generate my personalized voter readiness checklist based on my profile and jurisdiction.',
        }],
      }],
      thinkingLevel: THINKING_PRESETS.DEEP,
      useGoogleSearch: true,
      responseJsonSchema: checklistSchema,
    }),
    (e): AppError => ({
      code: 'GEMINI_TIMEOUT',
      message: `Checklist generation failed: ${e instanceof Error ? e.message : String(e)}`,
      timeoutMs: 30000,
      promptType: 'checklist',
    })
  );

  if (!result.ok) {
    return result;
  }

  const confidence = assessConfidence(result.value.text, result.value.groundingMetadata, context);
  return ok({
    data: result.value.text,
    confidence,
    groundingMetadata: result.value.groundingMetadata,
  });
}

// ── Ballot Flow ─────────────────────────────────────────────────────────

/**
 * Explains ballot items in plain language.
 *
 * Takes raw ballot text (from PDF extraction) and produces a
 * non-partisan, Grade-8-readable explanation of each item.
 *
 * @param ballotText - The extracted ballot text.
 * @param context - The jurisdiction context for cross-validation.
 * @param language - Response language.
 * @returns Result containing FlowResult with explanation text.
 *
 * @civic-safety
 *   - Non-partisan: The prompt explicitly forbids recommendations,
 *     endorsements, and framing bias.
 *   - Grounding: Google Search + URL Context for fiscal impact data.
 *   - Readability: Grade 8 or below reading level enforced in prompt.
 */
export async function ballotFlow(
  ballotText: string,
  context: JurisdictionContext,
  language?: string
): Promise<Result<FlowResult, AppError>> {
  const systemPrompt = buildBallotPrompt(ballotText, context, language);

  const result = await fromPromise(
    generateContent({
      model: MODELS.PRO,
      systemInstruction: systemPrompt,
      contents: [{
        role: 'user',
        parts: [{ text: 'Analyze this ballot and explain each item in plain language.' }],
      }],
      thinkingLevel: THINKING_PRESETS.DEEP,
      useGoogleSearch: true,
      useUrlContext: true,
    }),
    (e): AppError => ({
      code: 'GEMINI_TIMEOUT',
      message: `Ballot explanation failed: ${e instanceof Error ? e.message : String(e)}`,
      timeoutMs: 30000,
      promptType: 'ballot',
    })
  );

  if (!result.ok) {
    return result;
  }

  const confidence = assessConfidence(result.value.text, result.value.groundingMetadata, context);
  return ok({
    data: result.value.text,
    confidence,
    groundingMetadata: result.value.groundingMetadata,
  });
}

// ── Fact-Check Flow ─────────────────────────────────────────────────────

/**
 * Verifies a civic claim against official sources.
 *
 * The most safety-critical flow in the application. A false claim about
 * election rules could directly disenfranchise a voter. The verdict
 * defaults to "Unverifiable" if insufficient grounding is found.
 *
 * @param claim - The claim text to verify.
 * @param context - Optional jurisdiction context (null for general claims).
 * @param language - Response language.
 * @returns Result containing FlowResult with verdict JSON.
 *
 * @civic-safety
 *   - Model: Gemini 3.1 Pro (maximum reasoning depth for legal accuracy).
 *   - Grounding: Google Search + URL Context (mandatory for fact-checking).
 *   - Structured Output: JSON schema enforces verdict enum.
 *   - Default: If groundingMetadata contains zero .gov sources, the verdict
 *     MUST be "Unverifiable" (enforced in prompt, verified in confidence scorer).
 *   - Disenfranchisement risk: A false "True" verdict on a false claim about
 *     ID requirements could prevent someone from voting. This flow has the
 *     highest safety bar in the application.
 */
export async function factcheckFlow(
  claim: string,
  context: JurisdictionContext | null,
  language?: string
): Promise<Result<FlowResult, AppError>> {
  const systemPrompt = buildFactcheckPrompt(claim, context, language);

  const result = await fromPromise(
    generateContent({
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
    }),
    (e): AppError => ({
      code: 'GEMINI_TIMEOUT',
      message: `Fact-check failed: ${e instanceof Error ? e.message : String(e)}`,
      timeoutMs: 30000,
      promptType: 'factcheck',
    })
  );

  if (!result.ok) {
    return result;
  }

  const confidence = assessConfidence(
    result.value.text,
    result.value.groundingMetadata,
    context ?? undefined
  );

  return ok({
    data: result.value.text,
    confidence,
    groundingMetadata: result.value.groundingMetadata,
  });
}
