/**
 * ═══════════════════════════════════════════════════════════════════════
 * CIVIC COMPASS — Global Error Handler Middleware
 *
 * Catches ALL errors (sync + async) from Express route handlers and
 * maps them to consistent JSON responses. Never leaks stack traces
 * or internal implementation details to the client.
 *
 * Error Flow:
 *   1. Route handler calls next(appError) with a typed AppError.
 *   2. This middleware maps the AppError.code to an HTTP status code.
 *   3. A consistent JSON response is sent to the client.
 *   4. In production, unexpected errors are logged to Cloud Error Reporting.
 *
 * @civic-safety
 *   - Error messages shown to voters are always human-readable and
 *     non-technical ("Something went wrong" vs "ECONNREFUSED").
 *   - PII is NEVER included in error responses — not even the
 *     user's jurisdiction or input text.
 *   - Stack traces are only included in development mode.
 * ═══════════════════════════════════════════════════════════════════════
 */

import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { isAppError } from '../../../shared/utils/typeGuards';
import type { AppError } from '../../../shared/types/index';

/**
 * Maps AppError.code to HTTP status codes.
 *
 * This mapping is intentionally explicit (not a formula) because:
 * - JURISDICTION_NOT_FOUND is 404 (resource not found), not 400.
 * - GEMINI_TIMEOUT is 504 (gateway timeout), not 500.
 * - PROMPT_INJECTION_DETECTED is 403 (forbidden), not 400.
 *
 * Each mapping is a deliberate REST semantic decision.
 */
const ERROR_STATUS_MAP: Record<AppError['code'], number> = {
  JURISDICTION_NOT_FOUND: 404,
  INVALID_INPUT: 400,
  GEMINI_TIMEOUT: 504,
  RATE_LIMITED: 429,
  BALLOT_TOO_LARGE: 413,
  UNVERIFIABLE_CLAIM: 422,
  PROMPT_INJECTION_DETECTED: 403,
  FIREBASE_UNAVAILABLE: 503,
};

/**
 * Global Express error handler middleware.
 *
 * Handles three categories of errors:
 * 1. **Typed AppErrors** — from Result.err() in our service layer.
 *    These are operational and have specific HTTP mappings.
 * 2. **Zod validation errors** — from input validation middleware.
 *    These are always 400 Bad Request.
 * 3. **Unexpected errors** — anything else (SDK crashes, null refs).
 *    These are always 500 Internal Server Error with generic message.
 *
 * @param error - The error thrown or passed to next(). May be any type
 *   due to JavaScript's untyped throw. We narrow using isAppError().
 * @param _req - The Express request (unused but required by signature).
 * @param res - The Express response.
 * @param _next - The next middleware (unused — this is the terminal handler).
 *
 * @civic-safety
 *   - The response message is always the AppError.message (voter-safe).
 *   - Stack traces are NEVER included in production responses.
 *   - Unexpected errors get a generic message to prevent information leakage.
 *
 * @example
 * // In route handler:
 * match(result, {
 *   ok: (value) => res.json(value),
 *   err: (error) => next(error), // error is AppError
 * });
 */
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // ── 1. Typed AppError (from our service layer) ──────────────────────
  if (isAppError(error)) {
    const statusCode = ERROR_STATUS_MAP[error.code] ?? 500;

    if (process.env['NODE_ENV'] === 'development') {
      console.error(`[ERROR] ${error.code}: ${error.message}`);
    }

    res.status(statusCode).json({
      error: error.message,
      code: error.code,
      // Include retry-after header for rate limiting
      ...(error.code === 'RATE_LIMITED' && {
        retryAfter: error.retryAfterSeconds,
      }),
    });
    return;
  }

  // ── 2. Zod validation errors ────────────────────────────────────────
  if (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as Record<string, unknown>)['name'] === 'ZodError'
  ) {
    res.status(400).json({
      error: 'Invalid input parameters',
      code: 'VALIDATION_ERROR',
    });
    return;
  }

  // ── 3. Unexpected errors ────────────────────────────────────────────
  const isDev = process.env['NODE_ENV'] === 'development';

  if (isDev) {
    console.error('💥 Unexpected error:', error);
  } else {
    // In production, log to structured logging for Cloud Error Reporting
    console.error(
      '[CRITICAL] Uncaught exception:',
      error instanceof Error ? error.message : String(error)
    );
  }

  res.status(500).json({
    error: 'Something went wrong processing your request.',
    code: 'INTERNAL_ERROR',
    // NEVER leak stack traces to client in production
    ...(isDev && error instanceof Error && { stack: error.stack }),
  });
}

/**
 * Wraps an async Express route handler to catch rejected promises
 * and forward them to the error handler middleware.
 *
 * Prevents unhandled promise rejections from crashing the server.
 * Every async route handler MUST be wrapped with this.
 *
 * @param fn - The async route handler function.
 * @returns A wrapped handler that catches and forwards errors.
 *
 * @example
 * router.post('/', asyncHandler(async (req, res) => {
 *   const result = await service.process(req.body);
 *   match(result, {
 *     ok: (v) => res.json(v),
 *     err: (e) => { throw e; }, // caught by asyncHandler → errorHandler
 *   });
 * }));
 */
export function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
