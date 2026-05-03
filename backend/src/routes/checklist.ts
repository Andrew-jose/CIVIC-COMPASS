import { Router, Request, Response } from 'express';
import { generateContent, MODELS, THINKING_PRESETS } from '../services/geminiService';
import { buildSystemPrompt, JurisdictionContext } from '../prompts/systemPrompt';

export const checklistRouter = Router();

const CHECKLIST_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          whyItMatters: { type: 'string' },
          deadline: { type: 'string' },
          officialUrl: { type: 'string' },
          priority: { type: 'string', enum: ['critical', 'important', 'optional'] },
          completed: { type: 'boolean' },
        },
        required: ['id', 'title', 'description', 'priority'],
      },
    },
  },
  required: ['items'],
};

/**
 * POST /api/v1/checklist
 * Generate a personalized voter readiness checklist using Gemini 3.1 Pro
 * with Structured Output and deep reasoning (thinkingLevel: "high").
 */
checklistRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      jurisdictionContext,
      userAnswers,
      language = 'English',
    } = req.body as {
      jurisdictionContext: JurisdictionContext;
      userAnswers: {
        isRegistered: boolean;
        hasMovedRecently: boolean;
        votingMethod: 'in-person' | 'mail' | 'undecided';
        needsAccessibility: boolean;
        isFirstTimeInState: boolean;
      };
      language?: string;
    };

    if (!jurisdictionContext?.state || !userAnswers) {
      res.status(400).json({ error: { message: 'Jurisdiction context and user answers are required' } });
      return;
    }

    const systemInstruction = buildSystemPrompt(jurisdictionContext, language);
    const answersJson = JSON.stringify(userAnswers, null, 2);

    const response = await generateContent({
      model: MODELS.PRO,
      systemInstruction,
      contents: [{
        role: 'user',
        parts: [{
          text: `Based on the user's situation below and the CONTEXT data, generate a personalized voter readiness checklist. Each item must include a clear action, why it matters, a deadline (from CONTEXT), and a link to the official resource.

USER SITUATION:
${answersJson}

Assign priority levels:
- "critical" = must complete or the user cannot vote
- "important" = strongly recommended for a smooth experience
- "optional" = nice to have but not required

Generate 6–12 items tailored to this specific voter's situation.`,
        }],
      }],
      thinkingLevel: THINKING_PRESETS.DEEP,
      useGoogleSearch: true,
      responseJsonSchema: CHECKLIST_SCHEMA,
    });

    const checklist = JSON.parse(response.text);
    res.json({
      checklist,
      groundingMetadata: response.groundingMetadata,
      confidence: response.confidence,
    });
  } catch (error: any) {
    console.error('[CHECKLIST] Generation error:', error);
    res.status(500).json({ error: { message: 'Failed to generate checklist' } });
  }
});
