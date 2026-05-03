/**
 * ═══════════════════════════════════════════════════════════════════════
 * CIVIC COMPASS — AppError Classes (Legacy Compatibility Layer)
 *
 * These class-based errors are used by Express middleware and third-party
 * integrations that use `instanceof` checks. For service-layer code,
 * prefer the discriminated union AppError type from shared/types/index.ts
 * with Result monads.
 *
 * Migration path:
 *   1. Route handlers use Result<T, AppError> (discriminated union).
 *   2. The errorHandler middleware accepts both styles.
 *   3. These classes remain for throw-based code paths (middleware, hooks).
 * ═══════════════════════════════════════════════════════════════════════
 */

/**
 * Base custom error class for CIVIC COMPASS.
 *
 * @param message - Human-readable error message safe to display to voters.
 * @param code - Machine-readable error code for programmatic handling.
 * @param status - HTTP status code this error maps to.
 * @param isOperational - True if this is an expected business error.
 *   Operational errors are logged at warn level. Non-operational errors
 *   (bugs) are logged at error level and may trigger alerts.
 * @param extras - Additional context fields (retryAfter, field).
 *
 * @example
 * throw new AppError('Jurisdiction not found', 'JURISDICTION_NOT_FOUND', 404);
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly isOperational: boolean;
  public readonly retryAfter?: number;
  public readonly field?: string;

  constructor(
    message: string,
    code: string,
    status: number,
    isOperational: boolean = true,
    extras?: { retryAfter?: number; field?: string }
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.status = status;
    this.isOperational = isOperational;
    this.retryAfter = extras?.retryAfter;
    this.field = extras?.field;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Input validation error (400 Bad Request).
 *
 * @param message - What is wrong with the input.
 * @param field - Which field failed validation.
 */
export class ValidationError extends AppError {
  constructor(message: string, field: string) {
    super(message, 'INVALID_INPUT', 400, true, { field });
  }
}

/**
 * Authentication error (401 Unauthorized).
 *
 * @param message - Defaults to 'Authentication required'.
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'UNAUTHORIZED', 401, true);
  }
}

/**
 * Rate limit error (429 Too Many Requests).
 *
 * @param message - Human-readable rate limit explanation.
 * @param retryAfter - Seconds until the client can retry.
 */
export class RateLimitError extends AppError {
  constructor(message: string, retryAfter: number) {
    super(message, 'RATE_LIMITED', 429, true, { retryAfter });
  }
}

/**
 * Gemini API error (502 Bad Gateway by default).
 *
 * @param message - What went wrong with the Gemini call.
 * @param code - Specific error code (GEMINI_ERROR, SAFETY_BLOCK, etc.).
 * @param status - HTTP status (502 for API errors, 403 for safety blocks).
 */
export class GeminiError extends AppError {
  constructor(message: string, code: string = 'GEMINI_ERROR', status: number = 502) {
    super(message, code, status, true);
  }
}

/**
 * Jurisdiction not found error (404).
 *
 * @param message - Describes which jurisdiction was not found.
 */
export class JurisdictionError extends AppError {
  constructor(message: string) {
    super(message, 'JURISDICTION_NOT_FOUND', 404, true);
  }
}

/**
 * Ballot processing error (422 Unprocessable Entity).
 *
 * @param message - What went wrong during ballot processing.
 * @param code - Specific code (BALLOT_ERROR, BALLOT_TOO_LARGE, etc.).
 */
export class BallotProcessingError extends AppError {
  constructor(message: string, code: string = 'BALLOT_ERROR') {
    super(message, code, 422, true);
  }
}
