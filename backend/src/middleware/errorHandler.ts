import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AppError } from '../utils/AppError';

// Ensure you have a reporting tool like @google-cloud/error-reporting
// import { ErrorReporting } from '@google-cloud/error-reporting';
// const errors = new ErrorReporting();

/**
 * Global Express error handler middleware.
 * Catches ALL errors (sync + async).
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let error = { ...err };
  error.message = err.message;
  error.name = err.name;
  error.stack = err.stack;

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('💥 ERROR:', err);
  }

  // Fallback operational errors
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Something went wrong processing your request.';
  let field: string | undefined;
  let retryAfter: number | undefined;

  if (err instanceof AppError) {
    statusCode = err.status;
    code = err.code;
    message = err.message;
    field = err.field;
    retryAfter = err.retryAfter;
  } else if (err.name === 'ZodError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Invalid input parameters';
  } else if (err.status === 429) {
    // Catch generic rate limiters
    statusCode = 429;
    code = 'RATE_LIMITED';
    message = err.message || 'Too many requests';
  } else if (err.message && err.message.includes('GoogleGenerativeAIError')) {
    statusCode = 502;
    code = 'GEMINI_API_ERROR';
    message = 'AI provider experienced an error.';
    if (err.message.includes('safety')) {
       statusCode = 403;
       code = 'SAFETY_BLOCK';
       message = 'Content flagged by safety filters.';
    }
  } else {
    // Unexpected Error - Log to Cloud Error Reporting
    if (process.env.NODE_ENV === 'production') {
       console.error('[CRITICAL] Uncaught exception:', err);
       // errors.report(err); // Google Cloud Error Reporting
    }
  }

  // Consistent JSON response
  res.status(statusCode).json({
    error: message,
    code,
    ...(field && { field }),
    ...(retryAfter && { retryAfter }),
    // NEVER leak stack traces to client in production
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};

/**
 * asyncHandler wrapper
 * Prevents unhandled promise rejections from crashing the server
 */
export const asyncHandler = (fn: RequestHandler): RequestHandler => 
  (req: Request, res: Response, next: NextFunction) => 
    Promise.resolve(fn(req, res, next)).catch(next);
