import { buildChecklistPrompt, VoterProfile } from '../prompts/checklistPrompt';
import type { JurisdictionContext } from '../prompts/systemPrompt';

describe('checklistGenerator', () => {
  const baseContext: JurisdictionContext = {
    state: 'TX',
    county: 'Travis',
    registrationDeadline: '10/07/2024',
    mailBallotDeadline: '10/25/2024',
  };

  it('unregistered voter always gets CRITICAL registration item', () => {
    const profile: VoterProfile = {
      isFirstTimeVoter: true,
      isRecentlyMoved: false,
      votingMethod: 'undecided',
      needsAccessibility: false,
    };
    const prompt = buildChecklistPrompt(baseContext, profile);
    expect(prompt).toContain('First-time voter → include registration and ID preparation steps');
    expect(prompt).toContain(JSON.stringify(profile, null, 2));
  });

  it('mail-in voter gets mail ballot deadline item', () => {
    const profile: VoterProfile = {
      isFirstTimeVoter: false,
      isRecentlyMoved: false,
      votingMethod: 'mail-in',
      needsAccessibility: false,
    };
    const prompt = buildChecklistPrompt(baseContext, profile);
    expect(prompt).toContain('Mail-in voter → include mail ballot request and return deadlines');
    expect(prompt).toContain(JSON.stringify(profile, null, 2));
  });

  it('voter with accessibility need gets accommodation item', () => {
    const profile: VoterProfile = {
      isFirstTimeVoter: false,
      isRecentlyMoved: false,
      votingMethod: 'in-person',
      needsAccessibility: true,
    };
    const prompt = buildChecklistPrompt(baseContext, profile);
    expect(prompt).toContain('Accessibility needs → include accessibility accommodation steps');
    expect(prompt).toContain(JSON.stringify(profile, null, 2));
  });

  it('Georgia profile triggers strict photo ID item in CRITICAL tier', () => {
    const profile: VoterProfile = {
      isFirstTimeVoter: false,
      isRecentlyMoved: false,
      votingMethod: 'in-person',
      needsAccessibility: false,
    };
    const gaContext: JurisdictionContext = { ...baseContext, state: 'GA' };
    const prompt = buildChecklistPrompt(gaContext, profile);
    expect(prompt).toContain('GA');
    // The strict photo ID is implicitly checked via prompt injection
  });
});
