/**
 * ═══════════════════════════════════════════════════════════════
 * CIVIC COMPASS — Civic Data Service
 *
 * Fetches and manages jurisdiction-specific election data.
 * In production, integrates with Google Civic Information API.
 * ═══════════════════════════════════════════════════════════════
 */

import type { JurisdictionContext } from '../prompts/systemPrompt';

// ── State election website registry ──────────────────

const STATE_ELECTION_SITES: Record<string, string> = {
  AL: 'https://www.sos.alabama.gov/alabama-votes',
  AK: 'https://www.elections.alaska.gov',
  AZ: 'https://azsos.gov/elections',
  AR: 'https://www.sos.arkansas.gov/elections',
  CA: 'https://www.sos.ca.gov/elections',
  CO: 'https://www.coloradosos.gov/pubs/elections',
  CT: 'https://portal.ct.gov/sots/election-services',
  DE: 'https://elections.delaware.gov',
  FL: 'https://dos.fl.gov/elections',
  GA: 'https://sos.ga.gov/elections-division',
  HI: 'https://elections.hawaii.gov',
  ID: 'https://sos.idaho.gov/elections-division',
  IL: 'https://www.elections.il.gov',
  IN: 'https://www.in.gov/sos/elections',
  IA: 'https://sos.iowa.gov/elections',
  KS: 'https://www.sos.ks.gov/elections',
  KY: 'https://elect.ky.gov',
  LA: 'https://www.sos.la.gov/ElectionsAndVoting',
  ME: 'https://www.maine.gov/sos/cec/elec',
  MD: 'https://elections.maryland.gov',
  MA: 'https://www.sec.state.ma.us/divisions/elections',
  MI: 'https://mvic.sos.state.mi.us',
  MN: 'https://www.sos.state.mn.us/elections-voting',
  MS: 'https://www.sos.ms.gov/elections-voting',
  MO: 'https://www.sos.mo.gov/elections',
  MT: 'https://sosmt.gov/elections',
  NE: 'https://sos.nebraska.gov/elections',
  NV: 'https://www.nvsos.gov/sos/elections',
  NH: 'https://sos.nh.gov/elections',
  NJ: 'https://www.nj.gov/state/elections',
  NM: 'https://www.sos.nm.gov/voting-and-elections',
  NY: 'https://www.elections.ny.gov',
  NC: 'https://www.ncsbe.gov',
  ND: 'https://vip.sos.nd.gov',
  OH: 'https://www.ohiosos.gov/elections-voting',
  OK: 'https://oklahoma.gov/elections.html',
  OR: 'https://sos.oregon.gov/voting',
  PA: 'https://www.vote.pa.gov',
  RI: 'https://vote.ri.gov',
  SC: 'https://www.scvotes.gov',
  SD: 'https://sdsos.gov/elections-voting',
  TN: 'https://sos.tn.gov/elections',
  TX: 'https://www.sos.texas.gov/elections',
  UT: 'https://voteinfo.utah.gov',
  VT: 'https://sos.vermont.gov/elections',
  VA: 'https://www.elections.virginia.gov',
  WA: 'https://www.sos.wa.gov/elections',
  WV: 'https://sos.wv.gov/elections',
  WI: 'https://elections.wi.gov',
  WY: 'https://sos.wyo.gov/Elections',
  DC: 'https://www.dcboe.org',
};

// ── State abbreviation mapping ───────────────────────

const STATE_ABBREVIATIONS: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR',
  california: 'CA', colorado: 'CO', connecticut: 'CT', delaware: 'DE',
  florida: 'FL', georgia: 'GA', hawaii: 'HI', idaho: 'ID',
  illinois: 'IL', indiana: 'IN', iowa: 'IA', kansas: 'KS',
  kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD',
  massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS',
  missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM',
  'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND',
  ohio: 'OH', oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA',
  'rhode island': 'RI', 'south carolina': 'SC', 'south dakota': 'SD',
  tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT',
  virginia: 'VA', washington: 'WA', 'west virginia': 'WV',
  wisconsin: 'WI', wyoming: 'WY', 'district of columbia': 'DC',
};

/**
 * Resolve a state name to its abbreviation.
 */
export function resolveStateAbbreviation(input: string): string {
  const normalized = input.trim().toLowerCase();
  if (normalized.length === 2 && /^[a-z]{2}$/i.test(normalized)) {
    return normalized.toUpperCase();
  }
  return STATE_ABBREVIATIONS[normalized] || input.toUpperCase().slice(0, 2);
}

/**
 * Get the official election website for a state.
 */
export function getStateElectionWebsite(stateAbbr: string): string {
  return STATE_ELECTION_SITES[stateAbbr.toUpperCase()] || 'https://www.vote.org';
}

/**
 * Resolve an address to jurisdiction context.
 * In production, this calls the Google Civic Information API.
 */
export async function resolveJurisdiction(
  address: string
): Promise<JurisdictionContext> {
  // Parse state from address (simple heuristic — production uses Places API)
  const parts = address.split(',').map((p) => p.trim());
  const statePart = parts.length >= 2 ? parts[parts.length - 1].split(' ')[0] : '';
  const stateAbbr = resolveStateAbbreviation(statePart || 'TX');
  const county = parts.length >= 2 ? parts[parts.length - 2] : 'Unknown County';
  const officialWebsite = getStateElectionWebsite(stateAbbr);

  return {
    state: stateAbbr,
    county,
    officialWebsite,
    registrationUrl: 'https://www.vote.org/register-to-vote/',
    registrationDeadline: undefined, // Populated by Civic API
    electionDay: undefined,
    idRequirements: undefined,
    pollingHours: undefined,
  };
}

/**
 * Fetch detailed civic data from Google Civic Information API.
 * Requires GOOGLE_CIVIC_API_KEY environment variable.
 */
export async function fetchCivicData(
  address: string
): Promise<Record<string, any>> {
  const apiKey = process.env.GOOGLE_CIVIC_API_KEY;

  if (!apiKey) {
    console.warn('[CivicData] GOOGLE_CIVIC_API_KEY not set — returning fallback data.');
    return {
      status: 'fallback',
      message: 'Configure GOOGLE_CIVIC_API_KEY for live civic data.',
      registerUrl: 'https://www.vote.org/register-to-vote/',
    };
  }

  try {
    const url = new URL('https://www.googleapis.com/civicinfo/v2/voterinfo');
    url.searchParams.set('key', apiKey);
    url.searchParams.set('address', address);
    url.searchParams.set('electionId', '0'); // 0 = next upcoming election

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Civic API error: ${response.status}`);
    }
    return await response.json() as Record<string, any>;
  } catch (error) {
    console.error('[CivicData] API error:', error);
    return {
      status: 'error',
      message: 'Could not fetch civic data. Check API key and address.',
    };
  }
}
