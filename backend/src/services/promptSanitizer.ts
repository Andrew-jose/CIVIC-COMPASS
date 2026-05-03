import { logThreat, ThreatType } from './threatLogger';

export type ThreatTypeEnum = 'PROMPT_INJECTION' | 'VOTER_SUPPRESSION' | 'PARTISAN_ENDORSEMENT' | 'LANGUAGE_OVERRIDE';

export interface ThreatLog {
  type: ThreatTypeEnum;
  match: string;
}

export interface SanitizedMessage {
  sanitized: string;
  threats: ThreatLog[];
  safe: boolean;
}

/**
 * Filters out prompt injections and voter suppression heuristics.
 * 
 * Intercepts every inbound message to ensure no malicious context shifting,
 * language overriding, or partisan endorsement traps reach the Gemini model.
 * 
 * @example
 * const sanitizer = new PromptSanitizer();
 * const safeMessage = sanitizer.sanitizeUserMessage("Who should I vote for?");
 * // safeMessage.safe: false
 */
export class PromptSanitizer {
  // Jailbreak patterns
  private static readonly JAILBREAK_PATTERNS = [
    /ignore previous instructions/i,
    /disregard your rules/i,
    /you are now/i,
    /new persona/i,
    /system override/i,
    /developer mode/i
  ];

  // Partisan endorsement patterns
  private static readonly ENDORSEMENT_PATTERNS = [
    /who should i vote for/i,
    /is [a-zA-Z\s]+ better than/i,
    /endorse candidate/i,
    /who is the best candidate/i
  ];

  // Language override patterns
  private static readonly LANGUAGE_PATTERNS = [
    /speak in a different language/i,
    /switch language to/i,
    /respond in [a-zA-Z]+/i
  ];

  /**
   * Sanitizes user message by stripping system overrides and detecting threats.
   */
  public sanitizeUserMessage(message: string, userId: string = 'anonymous'): SanitizedMessage {
    let safe = true;
    const threats: ThreatLog[] = [];
    
    // 1. Strip content after system keywords
    let sanitized = message;
    const splitMatch = sanitized.match(/(SYSTEM:|CONTEXT:|INSTRUCTIONS:)/i);
    if (splitMatch && splitMatch.index !== undefined) {
      sanitized = sanitized.substring(0, splitMatch.index).trim();
      threats.push({ type: 'PROMPT_INJECTION', match: splitMatch[0] });
      safe = false;
    }

    // 2. Detect Jailbreak Patterns
    for (const pattern of PromptSanitizer.JAILBREAK_PATTERNS) {
      if (pattern.test(sanitized)) {
        threats.push({ type: 'PROMPT_INJECTION', match: pattern.source });
        safe = false;
      }
    }

    // 3. Detect Partisan Endorsements
    for (const pattern of PromptSanitizer.ENDORSEMENT_PATTERNS) {
      if (pattern.test(sanitized)) {
        threats.push({ type: 'PARTISAN_ENDORSEMENT', match: pattern.source });
        safe = false; // We can block it, or just flag it
      }
    }

    // 4. Detect Voter Suppression
    if (this.detectVoterSuppressionAttempt(sanitized)) {
      threats.push({ type: 'VOTER_SUPPRESSION', match: 'suppression_heuristic' });
      safe = false;
    }

    // 5. Detect Language Override
    for (const pattern of PromptSanitizer.LANGUAGE_PATTERNS) {
      if (pattern.test(sanitized)) {
        threats.push({ type: 'LANGUAGE_OVERRIDE', match: pattern.source });
        safe = false;
      }
    }

    if (!safe) {
      // Log threats
      threats.forEach(t => logThreat({
        userId,
        type: t.type as ThreatType,
        originalMessage: message,
        timestamp: new Date().toISOString()
      }));
    }

    return { sanitized, threats, safe };
  }

  /**
   * Detect attempts to suppress voting
   */
  public detectVoterSuppressionAttempt(message: string): boolean {
    const patterns = [
      /tell (.*) they can't vote/i,
      /say polling places are closed/i,
      /voting has been cancelled/i,
      /you need (a passport|vaccine card|fee) to vote/i,
      /don't vote/i,
      /stay home on election day/i
    ];

    for (const pattern of patterns) {
      if (pattern.test(message)) return true;
    }

    return false;
  }

  /**
   * Generate polite refusal
   */
  public generateSafeRefusal(threatType: ThreatTypeEnum): string {
    switch (threatType) {
      case 'PARTISAN_ENDORSEMENT':
        return "I am a non-partisan assistant and cannot endorse or evaluate specific candidates. I can, however, provide you with factual information about what's on your ballot.";
      case 'VOTER_SUPPRESSION':
        return "I am committed to providing accurate, official information to help citizens vote. I cannot generate messages that discourage voting or provide false requirements.";
      case 'PROMPT_INJECTION':
      case 'LANGUAGE_OVERRIDE':
      default:
        return "I cannot fulfill that request. My purpose is to help you with factual, non-partisan election and voting information. How else can I assist you with your voting plan today?";
    }
  }
}

export const promptSanitizer = new PromptSanitizer();
