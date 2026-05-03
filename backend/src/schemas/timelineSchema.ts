/**
 * ═══════════════════════════════════════════════════════════════
 * CIVIC COMPASS — Timeline Schema (Structured Output)
 *
 * JSON schema for election timeline milestones. Enforced via
 * Gemini Structured Output to prevent hallucinated dates.
 * ═══════════════════════════════════════════════════════════════
 */

export const timelineSchema = {
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
    electionType: {
      type: 'string',
      description: 'Type of election (e.g., General, Primary, Runoff, Special).',
    },
    milestones: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Unique identifier for this milestone.',
          },
          title: {
            type: 'string',
            description: 'Short title of the milestone event.',
          },
          date: {
            type: 'string',
            description: 'ISO date string (YYYY-MM-DD) from official sources only.',
          },
          description: {
            type: 'string',
            description: 'Plain-language explanation of what this milestone means.',
          },
          actionRequired: {
            type: 'string',
            description: 'What the voter needs to do, if anything.',
          },
          status: {
            type: 'string',
            enum: ['upcoming', 'urgent', 'today', 'passed'],
            description: 'Current status relative to today.',
          },
          category: {
            type: 'string',
            enum: ['registration', 'voting', 'ballot', 'results', 'other'],
            description: 'Category of milestone for visual grouping.',
          },
          officialSource: {
            type: 'string',
            description: 'URL of the official source for this date.',
          },
        },
        required: ['id', 'title', 'date', 'description', 'status', 'category'],
      },
    },
    confidence: {
      type: 'number',
      description: 'Overall confidence 0-100 in timeline accuracy.',
    },
    lastUpdated: {
      type: 'string',
      description: 'ISO timestamp of when this data was last verified.',
    },
  },
  required: ['jurisdiction', 'milestones', 'confidence'],
};

/** TypeScript type matching the timeline schema */
export interface TimelineResponse {
  jurisdiction: {
    state: string;
    county: string;
  };
  electionType?: string;
  milestones: Array<{
    id: string;
    title: string;
    date: string;
    description: string;
    actionRequired?: string;
    status: 'upcoming' | 'urgent' | 'today' | 'passed';
    category: 'registration' | 'voting' | 'ballot' | 'results' | 'other';
    officialSource?: string;
  }>;
  confidence: number;
  lastUpdated?: string;
}
