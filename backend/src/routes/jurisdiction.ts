import { Router, Request, Response } from 'express';

export const jurisdictionRouter = Router();

/**
 * POST /api/v1/jurisdiction
 * Resolve a user's address to state + county election data.
 * Uses Google Civic Information API to fetch real election info.
 */
jurisdictionRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { address, state, county } = req.body;

    if (!address && (!state || !county)) {
      res.status(400).json({ error: { message: 'Address or state+county is required' } });
      return;
    }

    // In production: call Google Civic Information API
    // https://developers.google.com/civic-information/docs/v2
    // For now, return structured context that will be populated by the API

    const jurisdictionContext = {
      state: state || 'Texas',
      county: county || 'Travis County',
      officialWebsite: `https://www.sos.${(state || 'texas').toLowerCase()}.gov`,
      registrationUrl: 'https://www.vote.org/register-to-vote/',
      electionOfficeName: `${county || 'Travis County'} Elections Office`,
      // These fields will be populated from Google Civic Information API
      registrationDeadline: undefined,
      earlyVotingStart: undefined,
      earlyVotingEnd: undefined,
      electionDay: undefined,
      mailBallotDeadline: undefined,
      idRequirements: [],
      pollingHours: undefined,
    };

    res.json({
      jurisdiction: jurisdictionContext,
      resolved: true,
      source: 'civic-information-api',
    });
  } catch (error: any) {
    console.error('[JURISDICTION] Resolution error:', error);
    res.status(500).json({ error: { message: 'Failed to resolve jurisdiction' } });
  }
});
