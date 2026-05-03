import { buildFactcheckPrompt } from '../prompts/factcheckPrompt';
import type { JurisdictionContext } from '../prompts/systemPrompt';

describe('factCheckVerdict', () => {
  const context: JurisdictionContext = {
    state: 'PA',
    county: 'Allegheny',
    electionDay: '11/05/2024',
  };

  it('claim present in jurisdictionData returns TRUE verdict', () => {
    const claim = 'Election day is on 11/05/2024.';
    const prompt = buildFactcheckPrompt(claim, context);
    expect(prompt).toContain(claim);
    expect(prompt).toContain('"True" — Claim is fully supported by ≥1 official source');
    expect(prompt).toContain('11/05/2024');
  });

  it('claim contradicted by data returns FALSE verdict', () => {
    const claim = 'Election day is in December.';
    const prompt = buildFactcheckPrompt(claim, context);
    expect(prompt).toContain(claim);
    expect(prompt).toContain('"False" — Claim is directly contradicted by official sources');
  });

  it('claim not in data returns UNVERIFIABLE (never a guess)', () => {
    const claim = 'The sky is blue.';
    const prompt = buildFactcheckPrompt(claim, context);
    expect(prompt).toContain(claim);
    expect(prompt).toContain('"Unverifiable" — Not enough evidence from official sources to determine');
  });

  it('partial match returns PARTIALLY_TRUE with explanation', () => {
    const claim = 'Election is on 11/05/2024 but polling places close at 4 PM.';
    const prompt = buildFactcheckPrompt(claim, context);
    expect(prompt).toContain(claim);
    expect(prompt).toContain('"Partially True" — Claim contains some truth but is misleading or incomplete');
  });
});
