/**
 * ═══════════════════════════════════════════════════════════════
 * CIVIC COMPASS — Civic Data Tool (Function Declarations)
 *
 * Function declarations for Gemini 3 Function Calling.
 * These allow the AI to query jurisdiction-specific civic data
 * during conversation without leaving the API call.
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * Function declaration for looking up civic data by jurisdiction.
 * Gemini can call this to retrieve real election data mid-conversation.
 */
export const getCivicDataDeclaration = {
  name: 'getCivicData',
  description:
    'Look up official election data for a specific jurisdiction. Returns registration deadlines, voting dates, ID requirements, polling hours, and official resource URLs.',
  parameters: {
    type: 'object',
    properties: {
      state: {
        type: 'string',
        description: 'US state name or two-letter abbreviation (e.g., "Texas" or "TX").',
      },
      county: {
        type: 'string',
        description: 'County name within the state (e.g., "Travis County").',
      },
      dataType: {
        type: 'string',
        enum: [
          'registration',
          'voting_dates',
          'id_requirements',
          'polling_locations',
          'mail_voting',
          'all',
        ],
        description: 'Type of civic data to retrieve.',
      },
    },
    required: ['state', 'dataType'],
  },
};

/**
 * Function declaration for checking voter registration status.
 */
export const checkRegistrationDeclaration = {
  name: 'checkRegistrationStatus',
  description:
    'Check if a voter registration portal exists for the given state and return the official URL to check registration status.',
  parameters: {
    type: 'object',
    properties: {
      state: {
        type: 'string',
        description: 'US state name or abbreviation.',
      },
    },
    required: ['state'],
  },
};

/**
 * Function declaration for getting official election office contact info.
 */
export const getElectionOfficeDeclaration = {
  name: 'getElectionOfficeInfo',
  description:
    'Get contact information for the local election office in a specific jurisdiction.',
  parameters: {
    type: 'object',
    properties: {
      state: {
        type: 'string',
        description: 'US state name or abbreviation.',
      },
      county: {
        type: 'string',
        description: 'County name.',
      },
    },
    required: ['state'],
  },
};

/**
 * Handle function calls from Gemini by looking up the requested civic data.
 * In production, these would query real APIs (Google Civic Information API, etc.)
 */
export async function handleCivicDataFunctionCall(
  functionName: string,
  args: Record<string, any>
): Promise<Record<string, any>> {
  switch (functionName) {
    case 'getCivicData':
      return getCivicData(args.state, args.county, args.dataType);
    case 'checkRegistrationStatus':
      return getRegistrationPortal(args.state);
    case 'getElectionOfficeInfo':
      return getElectionOfficeInfo(args.state, args.county);
    default:
      return { error: `Unknown function: ${functionName}` };
  }
}

/** Look up civic data — routes to real APIs in production */
async function getCivicData(
  state: string,
  county?: string,
  dataType?: string
): Promise<Record<string, any>> {
  // In production, this queries the Google Civic Information API
  // and/or Firestore civic data collection
  return {
    state,
    county: county || 'statewide',
    dataType: dataType || 'all',
    note: 'Connect GOOGLE_CIVIC_API_KEY to enable real-time data.',
    officialWebsite: `https://www.sos.${state.toLowerCase().replace(/\s/g, '')}.gov`,
    message: `Civic data for ${state}${county ? `, ${county}` : ''} — configure Google Civic Information API for live data.`,
  };
}

/** Get voter registration portal URL */
async function getRegistrationPortal(
  state: string
): Promise<Record<string, any>> {
  return {
    state,
    registrationCheckUrl: 'https://www.vote.org/am-i-registered-to-vote/',
    registerUrl: 'https://www.vote.org/register-to-vote/',
    note: 'These are fallback URLs. State-specific portals available with Civic API integration.',
  };
}

/** Get election office contact information */
async function getElectionOfficeInfo(
  state: string,
  county?: string
): Promise<Record<string, any>> {
  return {
    state,
    county: county || 'statewide',
    lookupUrl: 'https://www.usvotefoundation.org/vote/eoddomestic.htm',
    note: 'Use Google Civic Information API for exact office details.',
  };
}

/** All civic data function declarations for use in Gemini tool config */
export const civicDataFunctionDeclarations = [
  getCivicDataDeclaration,
  checkRegistrationDeclaration,
  getElectionOfficeDeclaration,
];
