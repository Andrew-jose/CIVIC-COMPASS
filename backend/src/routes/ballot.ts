import { Router, Request, Response } from 'express';
import { generateContent, MODELS, THINKING_PRESETS } from '../services/geminiService';

export const ballotRouter = Router();

/**
 * POST /api/v1/ballot/upload
 * Accept a PDF ballot upload. Uses Gemini 3's native Document Processing
 * to extract text directly (Cloud Vision API as fallback).
 */
ballotRouter.post('/upload', async (req: Request, res: Response): Promise<void> => {
  try {
    // In production: use multer middleware for file upload
    // Then pass PDF bytes to Gemini 3 for native document processing
    res.json({
      status: 'ready',
      message: 'Ballot upload endpoint ready. PDF processing via Gemini 3 Document Processing.',
    });
  } catch (error: any) {
    console.error('[BALLOT] Upload error:', error);
    res.status(500).json({ error: { message: 'Failed to process ballot' } });
  }
});

/**
 * POST /api/v1/ballot/explain
 * Generate plain-language ballot breakdown using Gemini 3.1 Pro.
 */
ballotRouter.post('/explain', async (req: Request, res: Response): Promise<void> => {
  try {
    const { ballotText, language = 'English' } = req.body;

    if (!ballotText?.trim()) {
      res.status(400).json({ error: { message: 'Ballot text is required' } });
      return;
    }

    const response = await generateContent({
      model: MODELS.PRO,
      systemInstruction: `You are CIVIC COMPASS ballot explainer. Break down each ballot item into plain language (Grade 8 reading level or below). Be strictly non-partisan: no recommendations, no endorsements, no framing bias. For each item provide: plain-language summary, what it means if it passes/fails, and any stated fiscal impact. Respond in ${language}.`,
      contents: [{
        role: 'user',
        parts: [{
          text: `Explain this ballot in plain language:\n\n${ballotText}`,
        }],
      }],
      thinkingLevel: THINKING_PRESETS.DEEP,
      useGoogleSearch: true,
    });

    res.json({
      explanation: response.text,
      groundingMetadata: response.groundingMetadata,
      confidence: response.confidence,
    });
  } catch (error: any) {
    console.error('[BALLOT] Explain error:', error);
    res.status(500).json({ error: { message: 'Failed to explain ballot' } });
  }
});
