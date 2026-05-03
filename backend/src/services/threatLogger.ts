import * as admin from 'firebase-admin';

// Note: Ensure firebase-admin is initialized somewhere in your app (e.g. index.ts)

export type ThreatType = 'PROMPT_INJECTION' | 'VOTER_SUPPRESSION' | 'PARTISAN_ENDORSEMENT' | 'LANGUAGE_OVERRIDE';

export interface ThreatLogEntry {
  userId: string;
  type: ThreatType;
  originalMessage: string;
  timestamp: string;
}

export const logThreat = async (logEntry: ThreatLogEntry): Promise<void> => {
  try {
    // We only attempt to log if Firebase is initialized and connected
    if (admin.apps.length > 0) {
      const db = admin.firestore();
      await db.collection('securityLogs').add(logEntry);
      console.log(`[SECURITY THREAT LOGGED] Type: ${logEntry.type}, User: ${logEntry.userId}`);
    } else {
      console.warn('[SECURITY] Firebase Admin not initialized. Threat not logged to DB.');
      console.log(`[SECURITY THREAT DETECTED] Type: ${logEntry.type}, User: ${logEntry.userId}`);
    }
  } catch (error) {
    console.error('[SECURITY ERROR] Failed to log threat to Firestore:', error);
  }
};
