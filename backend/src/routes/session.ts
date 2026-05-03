import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const sessionRouter = Router();

/**
 * POST /api/v1/session
 * Create or restore a user session.
 */
sessionRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.body;

    if (sessionId) {
      // Restore existing session — in production, fetch from Firestore
      res.json({
        sessionId,
        restored: true,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Create new session
    const newSessionId = uuidv4();
    res.json({
      sessionId: newSessionId,
      restored: false,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: { message: 'Failed to manage session' } });
  }
});
