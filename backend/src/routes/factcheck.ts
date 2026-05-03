import { Router, Request, Response } from 'express';
import { generateContent, MODELS, THINKING_PRESETS } from '../services/geminiService';
import { buildSystemPrompt, JurisdictionContext } from '../prompts/systemPrompt';

export const factcheckRouter = Router();

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['True', 'False', 'Partially True', 'Unverifiable'] },
    explanation: { type: 'string', description: '2-4 sentence plain-language explanation' },
    sources: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          url: { type: 'string' },
          retrievedDate: { type: 'string' },
        },
        required: ['title', 'url'],
      },
    },
    confidence: { type: 'number', minimum: 0, maximum: 100 },
    contextField: { type: 'string', description: 'Which CONTEXT field the verdict is based on' },
  },
  required: ['verdict', 'explanation', 'sources', 'confidence'],
};

/**
 * POST /api/v1/factcheck
 * Verify a civic claim using Gemini 3.1 Pro with deep reasoning,
 * Google Search grounding, URL Context, and Structured Output.
 */
factcheckRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      claim,
      jurisdictionContext,
      language = 'English',
    } = req.body as {
      claim: string;
      jurisdictionContext?: JurisdictionContext;
      language?: string;
    };

    if (!claim?.trim()) {
      res.status(400).json({ error: { message: 'Claim text is required' } });
      return;
    }

    const systemInstruction = jurisdictionContext
      ? buildSystemPrompt(jurisdictionContext, language)
      : `You are CIVIC COMPASS, a non-partisan civic fact-checker. Verify claims using ONLY Google Search grounding and URL Context results. If a claim cannot be verified, return verdict "Unverifiable". Respond in ${language}.`;

    const response = await generateContent({
      model: MODELS.PRO,
      systemInstruction,
      contents: [{
        role: 'user',
        parts: [{
          text: `FACT-CHECK THIS CIVIC CLAIM:
"${claim}"

Instructions:
1. Search for official sources that confirm or deny this claim
2. Check the CONTEXT data if available
3. Return a verdict: True, False, Partially True, or Unverifiable
4. Provide a 2-4 sentence plain-language explanation
5. List all sources used with URLs
6. If you cannot verify the claim from official sources, the verdict MUST be "Unverifiable"
7. You must NEVER invent a verdict without supporting evidence`,
        }],
      }],
      thinkingLevel: THINKING_PRESETS.DEEP,
      useGoogleSearch: true,
      useUrlContext: true,
      responseJsonSchema: VERDICT_SCHEMA,
    });

    const verdict = JSON.parse(response.text);
    res.json({
      verdict,
      groundingMetadata: response.groundingMetadata,
    });
  } catch (error: any) {
    console.error('[FACTCHECK] Error:', error);
    res.status(500).json({ error: { message: 'Failed to verify claim' } });
  }
});
