import compression from 'compression';
import { Request, Response, NextFunction } from 'express';

// Exported standard gzip compression middleware
export const responseCompression = compression({
  threshold: 1024, // Compress all responses > 1KB with gzip
  filter: (req: Request, res: Response) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Compress SSE streams dynamically
    if (res.getHeader('Content-Type') === 'text/event-stream') {
      return true;
    }
    return compression.filter(req, res);
  }
});

// Middleware to set Vary: Accept-Encoding
export const varyAcceptEncoding = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Vary', 'Accept-Encoding');
  next();
};

export const applyOptimizationMiddleware = [varyAcceptEncoding, responseCompression];
