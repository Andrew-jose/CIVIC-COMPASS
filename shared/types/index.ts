/**
 * Core Domain and API types for CIVIC COMPASS
 */

// ── Domain Types ────────────────────────────────────────────────────────

/**
 * Represents a geographical jurisdiction for voting rules.
 */
export type Jurisdiction = {
  readonly state: string;
  readonly county: string;
  readonly fips: string;
};

/**
 * A critical date or deadline in the election cycle.
 */
export type ElectionMilestone = {
  readonly name: string;
  readonly date: string; // ISO 8601
  readonly type: 'REGISTRATION' | 'EARLY_VOTING' | 'MAIL_BALLOT' | 'ELECTION_DAY';
  readonly isUrgent: boolean;
};

/**
 * Represents the profile of a voter to tailor checklists.
 */
export type VoterProfile = {
  readonly isFirstTime: boolean;
  readonly needsMailBallot: boolean;
  readonly hasDisability: boolean;
  readonly language: SupportedLanguage;
};

/**
 * An item on the personalized voter checklist.
 */
export type ChecklistItem = {
  readonly id: string;
  readonly action: string;
  readonly tier: 'CRITICAL' | 'IMPORTANT' | 'OPTIONAL';
  readonly status: 'PENDING' | 'COMPLETED';
};

/**
 * Represents a candidate or measure on a ballot.
 */
export type BallotItem = 
  | { readonly type: 'CANDIDATE'; readonly office: string; readonly name: string; readonly party: string; readonly description: string; }
  | { readonly type: 'MEASURE'; readonly measureId: string; readonly title: string; readonly description: string; readonly implications: string[]; };

/**
 * Output verdict of a fact-check request.
 */
export type FactCheckVerdict = 'TRUE' | 'FALSE' | 'PARTIALLY_TRUE' | 'UNVERIFIABLE';

/**
 * Risk level of voter disenfranchisement based on a claim.
 */
export type DisenfranchisementRisk = 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * Allowed language codes for localization.
 */
export type SupportedLanguage = 'en' | 'es' | 'fr' | 'zh' | 'hi' | 'ar' | 'pt' | 'vi';

/**
 * Threat categories for prompt injection/suppression.
 */
export type ThreatType = 'PROMPT_INJECTION' | 'VOTER_SUPPRESSION' | 'PARTISAN_ENDORSEMENT' | 'LANGUAGE_OVERRIDE';

/**
 * Result from the prompt sanitizer.
 */
export type SanitizedMessage = {
  readonly sanitized: string;
  readonly threats: ReadonlyArray<{ type: ThreatType; match: string }>;
  readonly safe: boolean;
};

// ── API Request / Response Types ─────────────────────────────────────────

export type ChatRequest = {
  readonly message: string;
  readonly sessionId: string;
  readonly jurisdiction: Jurisdiction;
  readonly language: SupportedLanguage;
};

export type ChatResponse = {
  readonly reply: string;
  readonly confidence: number;
  readonly sources: ReadonlyArray<string>;
};

export type TimelineResponse = {
  readonly jurisdiction: Jurisdiction;
  readonly milestones: ReadonlyArray<ElectionMilestone>;
};

export type ChecklistResponse = {
  readonly items: ReadonlyArray<ChecklistItem>;
};

export type FactCheckRequest = {
  readonly claim: string;
  readonly jurisdiction: Jurisdiction;
};

export type FactCheckResponse = {
  readonly verdict: FactCheckVerdict;
  readonly explanation: string;
  readonly riskLevel: DisenfranchisementRisk;
  readonly sources: ReadonlyArray<string>;
};

export type BallotUploadResponse = {
  readonly ballotId: string;
  readonly items: ReadonlyArray<BallotItem>;
};

// ── Error Types (Discriminated Union) ───────────────────────────────────

export type AppErrorPayload = 
  | { readonly code: 'JURISDICTION_NOT_FOUND'; readonly missingState: string; }
  | { readonly code: 'INVALID_INPUT'; readonly field: string; readonly message: string; }
  | { readonly code: 'GEMINI_TIMEOUT'; readonly ms: number; }
  | { readonly code: 'RATE_LIMITED'; readonly retryAfter: number; readonly endpoint: string; }
  | { readonly code: 'BALLOT_TOO_LARGE'; readonly maxSize: number; readonly actualSize: number; }
  | { readonly code: 'UNVERIFIABLE_CLAIM'; readonly claim: string; };

// ── Gemini Service Types ────────────────────────────────────────────────

export type GeminiConfig = {
  readonly model: string;
  readonly maxTokens: number;
  readonly temperature: number;
  readonly stopSequences: ReadonlyArray<string>;
};

export type GroundedResponse = {
  readonly text: string;
  readonly confidence: number;
  readonly sources: ReadonlyArray<string>;
};
