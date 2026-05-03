import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';

/**
 * Firebase Authentication middleware.
 * Verifies the Bearer token from the Authorization header.
 * In development mode, allows unauthenticated requests with a warning.
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[AUTH] No token provided — allowing in development mode');
      (req as any).userId = 'dev-anonymous';
      return next();
    }
    res.status(401).json({ error: { message: 'Missing authorization token' } });
    return;
  }

  try {
    const token = authHeader.split('Bearer ')[1];
    const decoded = await admin.auth().verifyIdToken(token);
    (req as any).userId = decoded.uid;
    next();
  } catch (error) {
    console.error('[AUTH] Token verification failed:', error);
    res.status(401).json({ error: { message: 'Invalid or expired token' } });
  }
}
