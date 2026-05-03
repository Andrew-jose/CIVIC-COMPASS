import {
  Jurisdiction,
  GroundedResponse,
  AppError,
  BallotItem,
  FactCheckVerdict,
  CandidateRace,
  BallotMeasure,
  ConstitutionalAmendment,
  BondMeasure,
  Confidence
} from '../types';

/**
 * Checks if a value is a valid Jurisdiction object.
 * Checks all required fields rigorously.
 */
export function isJurisdiction(value: unknown): value is Jurisdiction {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;

  if (typeof obj.id !== 'string') return false;
  if (typeof obj.state !== 'string') return false;
  if (typeof obj.county !== 'string') return false;
  if (!(obj.nextElectionDate instanceof Date) && typeof obj.nextElectionDate !== 'string') return false;
  
  // Optional string validation
  if ('municipality' in obj && typeof obj.municipality !== 'string' && obj.municipality !== undefined) return false;

  return true;
}

/**
 * Checks if a value is a valid GroundedResponse object.
 */
export function isGroundedResponse(value: unknown): value is GroundedResponse {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;

  if (typeof obj.answer !== 'string') return false;
  
  // Check sources
  if (!Array.isArray(obj.sources) || obj.sources.length === 0) return false;
  if (!obj.sources.every(s => typeof s === 'string')) return false;

  // Check confidence
  if (typeof obj.confidence !== 'number' || obj.confidence < 0 || obj.confidence > 100) return false;

  return true;
}

/**
 * Checks if a value is a valid AppError.
 */
export function isAppError(value: unknown): value is AppError {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;

  if (typeof obj.message !== 'string') return false;

  switch (obj.code) {
    case 'JURISDICTION_NOT_FOUND':
      return typeof obj.searchedJurisdiction === 'string';
    case 'INVALID_INPUT':
      return typeof obj.fieldName === 'string' && typeof obj.constraintViolated === 'string';
    case 'GEMINI_TIMEOUT':
      return typeof obj.timeoutDurationMs === 'number' && typeof obj.promptType === 'string';
    case 'RATE_LIMITED':
      return typeof obj.retryAfterSeconds === 'number' && 
             ['ip', 'user', 'global'].includes(obj.limitType as string);
    case 'BALLOT_TOO_LARGE':
      return typeof obj.actualSizeBytes === 'number' && typeof obj.maxSizeBytes === 'number';
    case 'UNVERIFIABLE_CLAIM':
      return typeof obj.claimText === 'string' && typeof obj.whyUnverifiable === 'string';
    case 'PROMPT_INJECTION_DETECTED':
      return ['jailbreak', 'system_override', 'pii_leak'].includes(obj.threatType as string) &&
             typeof obj.sanitizedInput === 'string';
    case 'FIREBASE_UNAVAILABLE':
      return typeof obj.operationAttempted === 'string';
    default:
      return false;
  }
}

/**
 * Checks if a value is a valid FactCheckVerdict.
 */
export function isFactCheckVerdict(value: unknown): value is FactCheckVerdict {
  return typeof value === 'string' && ['TRUE', 'FALSE', 'MISLEADING', 'UNVERIFIABLE'].includes(value);
}

/**
 * Checks if a value is a valid BallotItem.
 */
export function isBallotItem(value: unknown): value is BallotItem {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;

  if (typeof obj.id !== 'string') return false;

  switch (obj.type) {
    case 'candidate_race': {
      if (typeof obj.officeName !== 'string') return false;
      if (!Array.isArray(obj.candidates)) return false;
      return obj.candidates.every(c => 
        c && typeof c === 'object' &&
        typeof (c as any).id === 'string' &&
        typeof (c as any).name === 'string' &&
        typeof (c as any).party === 'string' &&
        typeof (c as any).incumbent === 'boolean'
      );
    }
    case 'ballot_measure': {
      return typeof obj.title === 'string' &&
             typeof obj.description === 'string' &&
             typeof obj.yesVoteMeaning === 'string' &&
             typeof obj.noVoteMeaning === 'string';
    }
    case 'constitutional_amendment': {
      return typeof obj.article === 'string' &&
             typeof obj.proposedText === 'string';
    }
    case 'bond_measure': {
      return typeof obj.amount === 'number' &&
             typeof obj.purpose === 'string';
    }
    default:
      return false;
  }
}
