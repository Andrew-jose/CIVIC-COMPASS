/**
 * ═══════════════════════════════════════════════════════════════
 * CIVIC COMPASS — Verdict Schema (Structured Output)
 *
 * JSON schema enforced via Gemini Structured Output to guarantee
 * type-safe, consistent fact-check verdicts. Used with
 * responseMimeType: "application/json" + responseJsonSchema.
 * ═══════════════════════════════════════════════════════════════
 */

export const verdictSchema = {
  type: 'object',
  properties: {
    claim: {
      type: 'string',
      description: 'The original claim submitted for verification.',
    },
    verdict: {
      type: 'string',
      enum: ['True', 'False', 'Partially True', 'Unverifiable'],
      description:
        'The factual verdict. Must be one of: True, False, Partially True, or Unverifiable.',
    },
    explanation: {
      type: 'string',
      description:
        'A plain-language explanation (≤ Grade 8 reading level) of why this verdict was reached. Must cite specific evidence.',
    },
    sources: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Title of the source document or page.',
          },
          url: {
            type: 'string',
            description: 'URL of the official source.',
          },
          retrievedDate: {
            type: 'string',
            description: 'ISO date when the source was last accessed.',
          },
        },
        required: ['title', 'url'],
      },
      description:
        'List of official sources used to verify the claim. Must contain ≥1 citation or verdict defaults to Unverifiable.',
    },
    confidence: {
      type: 'number',
      description:
        'Confidence score 0-100 based on grounding quality and source reliability.',
    },
    jurisdictionMatch: {
      type: 'boolean',
      description:
        'Whether the claim was verified against the user\'s specific jurisdiction data.',
    },
    warnings: {
      type: 'array',
      items: { type: 'string' },
      description:
        'Any caveats or warnings about the verification (e.g., "Rules may vary by county").',
    },
  },
  required: ['claim', 'verdict', 'explanation', 'sources', 'confidence'],
};

/** TypeScript type matching the verdict schema */
export interface VerdictResponse {
  claim: string;
  verdict: 'True' | 'False' | 'Partially True' | 'Unverifiable';
  explanation: string;
  sources: Array<{
    title: string;
    url: string;
    retrievedDate?: string;
  }>;
  confidence: number;
  jurisdictionMatch?: boolean;
  warnings?: string[];
}
