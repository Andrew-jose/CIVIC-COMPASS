/**
 * Base custom error class for CIVIC COMPASS.
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

export class ValidationError extends AppError {
  constructor(message: string, field: string) {
    super(message, 'INVALID_INPUT', 400, true, { field });
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'UNAUTHORIZED', 401, true);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string, retryAfter: number) {
    super(message, 'RATE_LIMITED', 429, true, { retryAfter });
  }
}

export class GeminiError extends AppError {
  constructor(message: string, code: string = 'GEMINI_ERROR', status: number = 502) {
    super(message, code, status, true);
  }
}

export class JurisdictionError extends AppError {
  constructor(message: string) {
    super(message, 'JURISDICTION_NOT_FOUND', 404, true);
  }
}

export class BallotProcessingError extends AppError {
  constructor(message: string, code: string = 'BALLOT_ERROR') {
    super(message, code, 422, true);
  }
}
