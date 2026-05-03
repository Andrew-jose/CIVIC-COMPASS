import { Router, Request, Response } from 'express';
import { generateContent, MODELS, THINKING_PRESETS } from '../services/geminiService';
import { buildSystemPrompt, JurisdictionContext } from '../prompts/systemPrompt';

export const timelineRouter = Router();

const TIMELINE_SCHEMA = {
  type: 'object',
  properties: {
    milestones: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          date: { type: 'string', description: 'ISO 8601 date' },
          description: { type: 'string' },
          actionRequired: { type: 'string' },
          status: { type: 'string', enum: ['upcoming', 'urgent', 'today', 'passed'] },
          priority: { type: 'string', enum: ['critical', 'important', 'optional'] },
        },
        required: ['id', 'title', 'date', 'description', 'status'],
      },
    },
    nextDeadline: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        date: { type: 'string' },
        daysUntil: { type: 'number' },
      },
    },
  },
  required: ['milestones'],
};

/**
 * POST /api/v1/timeline
 * Generate a personalized election timeline using Gemini 3 with Structured Output.
 */
timelineRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { jurisdictionContext, language = 'English' } = req.body as {
      jurisdictionContext: JurisdictionContext;
      language?: string;
    };

    if (!jurisdictionContext?.state) {
      res.status(400).json({ error: { message: 'Jurisdiction context is required' } });
      return;
    }

    const systemInstruction = buildSystemPrompt(jurisdictionContext, language);

    const response = await generateContent({
      model: MODELS.FLASH,
      systemInstruction,
      contents: [{
        role: 'user',
        parts: [{
          text: `Generate a complete election timeline for ${jurisdictionContext.county}, ${jurisdictionContext.state}. Include all key dates: registration deadline, early voting, Election Day, mail-in ballot deadline, and any other relevant dates from the CONTEXT. For each milestone, provide a plain-language description of what it means and what the voter needs to do. Mark each milestone's status based on today's date (${new Date().toISOString().split('T')[0]}).`,
        }],
      }],
      thinkingLevel: THINKING_PRESETS.MODERATE,
      useGoogleSearch: true,
      responseJsonSchema: TIMELINE_SCHEMA,
    });

    const timeline = JSON.parse(response.text);
    res.json({
      timeline,
      groundingMetadata: response.groundingMetadata,
      confidence: response.confidence,
    });
  } catch (error: any) {
    console.error('[TIMELINE] Generation error:', error);
    res.status(500).json({ error: { message: 'Failed to generate timeline' } });
  }
});
