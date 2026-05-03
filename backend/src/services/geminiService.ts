import { GoogleGenAI } from '@google/genai';

/**
 * ═══════════════════════════════════════════════════════════════
 * CIVIC COMPASS — Gemini Service
 * Core AI engine using the unified @google/genai SDK.
 *
 * Models:
 *   - gemini-3.1-pro-preview    → deep reasoning, fact-checking
 *   - gemini-3-flash-preview    → fast conversation, Pro-level IQ
 *   - gemini-3.1-flash-lite-preview → high-volume, cost-efficient
 *
 * Features used:
 *   - Dynamic Thinking (thinkingLevel)
 *   - Thought Signatures (reasoning chain persistence)
 *   - Google Search Grounding ({ googleSearch: {} })
 *   - URL Context ({ urlContext: {} })
 *   - Function Calling (custom civic data tools)
 *   - Structured Output (responseMimeType + responseJsonSchema)
 *   - Streaming responses
 * ═══════════════════════════════════════════════════════════════
 */

// ── SDK Initialization ───────────────────────────────

function createClient(): GoogleGenAI {
  const useVertexAI = process.env.VERTEX_AI_PROJECT_ID && process.env.NODE_ENV === 'production';

  if (useVertexAI) {
    return new GoogleGenAI({
      vertexai: true,
      project: process.env.VERTEX_AI_PROJECT_ID!,
      location: process.env.VERTEX_AI_LOCATION || 'us-central1',
    });
  }

  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is required. Set it in your .env file.');
  }

  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

let _client: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!_client) {
    _client = createClient();
  }
  return _client;
}

// ── Model Constants ──────────────────────────────────

export const MODELS = {
  /** Deep reasoning, fact-checking, ballot analysis */
  PRO: 'gemini-3.1-pro-preview',
  /** Fast conversation with Pro-level intelligence */
  FLASH: 'gemini-3-flash-preview',
  /** High-volume, cost-efficient tasks */
  LITE: 'gemini-3.1-flash-lite-preview',
  /** Multimodal embedding for RAG */
  EMBEDDING: 'gemini-embedding-2',
} as const;

export type ModelName = typeof MODELS[keyof typeof MODELS];

// ── Thinking Levels ──────────────────────────────────

export type ThinkingLevel = 'minimal' | 'low' | 'medium' | 'high';

export const THINKING_PRESETS = {
  /** Quick Q&A, simple lookups */
  SIMPLE: 'low' as ThinkingLevel,
  /** General conversation, timeline explanations */
  MODERATE: 'medium' as ThinkingLevel,
  /** Fact-checking, ballot analysis, complex reasoning */
  DEEP: 'high' as ThinkingLevel,
  /** Cost-optimized high-volume tasks */
  MINIMAL: 'minimal' as ThinkingLevel,
} as const;

// ── Tool Definitions ─────────────────────────────────

/**
 * Built-in Gemini tools for grounding and context.
 * These can be combined with custom function calling tools in a single API call.
 */
export const GROUNDING_TOOLS = {
  /** Google Search for real-time public data verification */
  googleSearch: { googleSearch: {} },
  /** URL Context for reading official election web pages */
  urlContext: { urlContext: {} },
} as const;

// ── Chat Types ───────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'model';
  parts: Array<{
    text?: string;
    thoughtSignature?: string;
    functionCall?: any;
    functionResponse?: any;
  }>;
}

export interface GeminiCallOptions {
  model?: ModelName;
  systemInstruction: string;
  contents: ChatMessage[];
  thinkingLevel?: ThinkingLevel;
  useGoogleSearch?: boolean;
  useUrlContext?: boolean;
  functionDeclarations?: any[];
  responseJsonSchema?: Record<string, any>;
  stream?: boolean;
}

export interface GeminiResponse {
  text: string;
  thoughtSignature?: string;
  groundingMetadata?: any;
  confidence?: number;
  functionCalls?: any[];
}

// ── Generate Content ─────────────────────────────────

export async function generateContent(
  options: GeminiCallOptions
): Promise<GeminiResponse> {
  const client = getGeminiClient();
  const model = options.model || MODELS.FLASH;

  // Build tools array — combine built-in and custom tools
  const tools: any[] = [];
  if (options.useGoogleSearch) tools.push(GROUNDING_TOOLS.googleSearch);
  if (options.useUrlContext) tools.push(GROUNDING_TOOLS.urlContext);
  if (options.functionDeclarations?.length) {
    tools.push({ functionDeclarations: options.functionDeclarations });
  }

  // Build config — systemInstruction goes inside config per SDK API
  const config: any = {
    systemInstruction: options.systemInstruction,
    thinkingConfig: {
      thinkingLevel: options.thinkingLevel || 'medium',
    },
  };

  if (tools.length > 0) config.tools = tools;

  if (options.responseJsonSchema) {
    config.responseMimeType = 'application/json';
    config.responseJsonSchema = options.responseJsonSchema;
  }

  const response = await client.models.generateContent({
    model,
    contents: options.contents as any,
    config,
  });

  // Extract response data
  const candidate = response.candidates?.[0];
  const parts = candidate?.content?.parts || [];
  const textParts = parts.filter((p: any) => p.text);
  const text = textParts.map((p: any) => p.text).join('');

  // Extract Thought Signature if present
  const thoughtSignature = parts.find((p: any) => p.thoughtSignature)?.thoughtSignature;

  // Extract function calls if present
  const functionCalls = parts.filter((p: any) => p.functionCall).map((p: any) => ({
    name: p.functionCall.name,
    args: p.functionCall.args,
    id: p.functionCall.id,
    thoughtSignature: p.thoughtSignature,
  }));

  // Extract grounding metadata
  const groundingMetadata = candidate?.groundingMetadata;

  return {
    text,
    thoughtSignature,
    groundingMetadata,
    functionCalls: functionCalls.length > 0 ? functionCalls : undefined,
  };
}

// ── Stream Content ───────────────────────────────────

export async function* streamContent(
  options: GeminiCallOptions
): AsyncGenerator<{ text?: string; done?: boolean; thoughtSignature?: string }> {
  const client = getGeminiClient();
  const model = options.model || MODELS.FLASH;

  // Build tools array
  const tools: any[] = [];
  if (options.useGoogleSearch) tools.push(GROUNDING_TOOLS.googleSearch);
  if (options.useUrlContext) tools.push(GROUNDING_TOOLS.urlContext);
  if (options.functionDeclarations?.length) {
    tools.push({ functionDeclarations: options.functionDeclarations });
  }

  const config: any = {
    systemInstruction: options.systemInstruction,
    thinkingConfig: {
      thinkingLevel: options.thinkingLevel || 'medium',
    },
  };

  if (tools.length > 0) config.tools = tools;

  const response = await client.models.generateContentStream({
    model,
    contents: options.contents as any,
    config,
  });

  let lastThoughtSignature: string | undefined;

  for await (const chunk of response) {
    const parts = chunk.candidates?.[0]?.content?.parts || [];

    for (const part of parts) {
      if ((part as any).thoughtSignature) {
        lastThoughtSignature = (part as any).thoughtSignature;
      }
      if ((part as any).text) {
        yield { text: (part as any).text };
      }
    }
  }

  yield { done: true, thoughtSignature: lastThoughtSignature };
}

// ── Generate Embeddings ──────────────────────────────

export async function generateEmbedding(text: string): Promise<number[]> {
  const client = getGeminiClient();

  const response = await client.models.embedContent({
    model: MODELS.EMBEDDING,
    contents: text,
  });

  return (response as any).embedding?.values || [];
}
