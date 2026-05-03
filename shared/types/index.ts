/**
 * Domain Type System for Civic Compass
 * 
 * Defines all bounded context models, ensuring strict data shapes across
 * the UI, Backend, and AI Service boundaries.
 */

/**
 * A branded type for Confidence scores.
 * Valid range: 0.0 to 100.0.
 * Using a branded type ensures that numbers cannot be arbitrarily passed 
 * as confidence scores unless they have been explicitly validated.
 */
export type Confidence = number & { readonly __brand: 'Confidence' };

/**
 * Constructor for Confidence branded type that enforces invariants.
 * @param value The raw number
 * @returns The branded Confidence score
 * @throws If the value is outside the 0-100 range.
 */
export function makeConfidence(value: number): Confidence {
  if (value < 0 || value > 100) {
    throw new Error(`Confidence must be between 0 and 100, got ${value}`);
  }
  return value as Confidence;
}

// -----------------------------------------------------------------------------
// Ballot Items
// -----------------------------------------------------------------------------
// Decision: Used a discriminated union on `type` instead of a flat type with optional fields.
// Justification: Each ballot item type requires vastly different fields (e.g., candidates 
// need party affiliations, measures need text). A flat type would make all these optional, 
// forcing runtime checks. A discriminated union allows TypeScript to enforce the exact required 
// shape based on the `type` discriminant at compile time.

/**
 * Represents a race between candidates for a specific office.
 */
export interface CandidateRace {
  type: 'candidate_race';
  id: string;
  officeName: string;
  candidates: Array<{
    id: string;
    name: string;
    party: string;
    incumbent: boolean;
  }>;
}

/**
 * Represents a ballot measure, proposition, or local issue.
 */
export interface BallotMeasure {
  type: 'ballot_measure';
  id: string;
  title: string;
  description: string;
  yesVoteMeaning: string;
  noVoteMeaning: string;
}

/**
 * Represents a proposed constitutional amendment.
 */
export interface ConstitutionalAmendment {
  type: 'constitutional_amendment';
  id: string;
  article: string;
  proposedText: string;
}

/**
 * Represents a municipal or state bond measure.
 */
export interface BondMeasure {
  type: 'bond_measure';
  id: string;
  amount: number;
  purpose: string;
}

/**
 * A discriminated union of all possible items on a voter's ballot.
 */
export type BallotItem = 
  | CandidateRace 
  | BallotMeasure 
  | ConstitutionalAmendment 
  | BondMeasure;

// -----------------------------------------------------------------------------
// Checklist Items
// -----------------------------------------------------------------------------
// Decision: Model deadline as a discriminated union (`DeadlineDate` | `ElectionDay`).
// Justification: "Election Day" is a semantic date that varies by jurisdiction.
// Using `Date | string` is too broad; someone could pass "Tomorrow" or "ASAP".
// A discriminated union prevents arbitrary strings while cleanly representing the two states.

export type Deadline = 
  | { kind: 'date'; value: Date }
  | { kind: 'election_day' };

/**
 * Represents a specific action a voter must take to be ready for an election.
 */
export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  deadline: Deadline;
  completed: boolean;
}

// -----------------------------------------------------------------------------
// Fact Checking
// -----------------------------------------------------------------------------
// Decision: Used a string literal union instead of a const enum.
// Justification: String literals serialize natively to JSON (and Firestore) without mapping.
// Const enums disappear at runtime, which can cause subtle bugs if compiled with `--isolatedModules`
// or in transpilers like babel/swc (vite). String literals are safer and equally strict.

export type FactCheckVerdict = 'TRUE' | 'FALSE' | 'MISLEADING' | 'UNVERIFIABLE';

// -----------------------------------------------------------------------------
// AI Integration
// -----------------------------------------------------------------------------

/**
 * Represents a response from the AI that has been checked for grounding.
 * 
 * Invariants:
 * - `sources` must contain at least one source (represented as a tuple of `[string, ...string[]]`).
 * - `confidence` is a validated number between 0 and 100.
 * 
 * This explicitly does NOT represent raw, unchecked LLM output.
 */
export interface GroundedResponse {
  answer: string;
  sources: [string, ...string[]]; // Enforces non-empty array
  confidence: Confidence;
}

// -----------------------------------------------------------------------------
// Application Errors
// -----------------------------------------------------------------------------
// Decision: Discriminated union on `code` with highly specific payloads.
// Justification: Avoids a generic `details: unknown` field. By specifying the exact payload
// for each error type, the type system guides the developer (or the UI) on what context
// is available to render a helpful error message or initiate a recovery flow.

export interface JurisdictionNotFoundError {
  code: 'JURISDICTION_NOT_FOUND';
  message: string;
  searchedJurisdiction: string;
}

export interface InvalidInputError {
  code: 'INVALID_INPUT';
  message: string;
  fieldName: string;
  constraintViolated: string;
}

export interface GeminiTimeoutError {
  code: 'GEMINI_TIMEOUT';
  message: string;
  timeoutDurationMs: number;
  promptType: string;
}

export interface RateLimitedError {
  code: 'RATE_LIMITED';
  message: string;
  retryAfterSeconds: number;
  limitType: 'ip' | 'user' | 'global';
}

export interface BallotTooLargeError {
  code: 'BALLOT_TOO_LARGE';
  message: string;
  actualSizeBytes: number;
  maxSizeBytes: number;
}

export interface UnverifiableClaimError {
  code: 'UNVERIFIABLE_CLAIM';
  message: string;
  claimText: string;
  whyUnverifiable: string;
}

export interface PromptInjectionDetectedError {
  code: 'PROMPT_INJECTION_DETECTED';
  message: string;
  threatType: 'jailbreak' | 'system_override' | 'pii_leak';
  sanitizedInput: string;
}

export interface FirebaseUnavailableError {
  code: 'FIREBASE_UNAVAILABLE';
  message: string;
  operationAttempted: string;
}

/**
 * A discriminated union of all expected application errors.
 */
export type AppError = 
  | JurisdictionNotFoundError
  | InvalidInputError
  | GeminiTimeoutError
  | RateLimitedError
  | BallotTooLargeError
  | UnverifiableClaimError
  | PromptInjectionDetectedError
  | FirebaseUnavailableError;

/**
 * User and Jurisdiction basic types
 */
export interface Jurisdiction {
  id: string;
  state: string;
  county: string;
  municipality?: string;
  nextElectionDate: Date;
}

export interface UserProfile {
  id: string;
  jurisdictionId: string;
  languagePreference: string;
}

export interface SecurityLog {
  id: string;
  timestamp: Date;
  eventType: string;
  userId?: string;
  details: Record<string, unknown>;
}
