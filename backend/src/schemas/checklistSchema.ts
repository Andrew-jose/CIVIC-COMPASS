/**
 * ═══════════════════════════════════════════════════════════════
 * CIVIC COMPASS — Checklist Schema (Structured Output)
 *
 * JSON schema for voter readiness checklist items. Enforced via
 * Gemini Structured Output so every item has an action, reason,
 * deadline, and official resource URL.
 * ═══════════════════════════════════════════════════════════════
 */

export const checklistSchema = {
  type: 'object',
  properties: {
    jurisdiction: {
      type: 'object',
      properties: {
        state: { type: 'string' },
        county: { type: 'string' },
      },
      required: ['state', 'county'],
    },
    voterProfile: {
      type: 'object',
      properties: {
        isFirstTimeVoter: { type: 'boolean' },
        isRecentlyMoved: { type: 'boolean' },
        votingMethod: {
          type: 'string',
          enum: ['in-person', 'early-voting', 'mail-in', 'undecided'],
        },
        needsAccessibility: { type: 'boolean' },
      },
    },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Unique identifier for this checklist item.',
          },
          title: {
            type: 'string',
            description: 'Action item title (verb-first, ≤10 words).',
          },
          description: {
            type: 'string',
            description: 'Detailed explanation of what to do and why.',
          },
          whyItMatters: {
            type: 'string',
            description: 'Why this step is important for the voter.',
          },
          deadline: {
            type: 'string',
            description: 'ISO date string (YYYY-MM-DD) — from official sources only.',
          },
          officialUrl: {
            type: 'string',
            description: 'Official government URL for completing this action.',
          },
          priority: {
            type: 'string',
            enum: ['critical', 'important', 'optional'],
            description: 'Priority level based on deadline urgency.',
          },
          category: {
            type: 'string',
            enum: ['registration', 'id', 'polling', 'ballot', 'other'],
            description: 'Category for grouping checklist items.',
          },
          estimatedTime: {
            type: 'string',
            description: 'How long this action typically takes (e.g., "5 minutes").',
          },
        },
        required: ['id', 'title', 'description', 'deadline', 'officialUrl', 'priority'],
      },
    },
    confidence: {
      type: 'number',
      description: 'Overall confidence 0-100 in checklist accuracy.',
    },
    completionMessage: {
      type: 'string',
      description: 'Encouraging message shown when all items are completed.',
    },
  },
  required: ['jurisdiction', 'items', 'confidence'],
};

/** TypeScript type matching the checklist schema */
export interface ChecklistResponse {
  jurisdiction: {
    state: string;
    county: string;
  };
  voterProfile?: {
    isFirstTimeVoter?: boolean;
    isRecentlyMoved?: boolean;
    votingMethod?: 'in-person' | 'early-voting' | 'mail-in' | 'undecided';
    needsAccessibility?: boolean;
  };
  items: Array<{
    id: string;
    title: string;
    description: string;
    whyItMatters?: string;
    deadline: string;
    officialUrl: string;
    priority: 'critical' | 'important' | 'optional';
    category?: 'registration' | 'id' | 'polling' | 'ballot' | 'other';
    estimatedTime?: string;
  }>;
  confidence: number;
  completionMessage?: string;
}
