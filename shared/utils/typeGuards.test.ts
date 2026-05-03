import { 
  isJurisdiction, 
  isGroundedResponse, 
  isAppError, 
  isBallotItem, 
  isFactCheckVerdict 
} from './typeGuards';

describe('Type Guards', () => {
  describe('isJurisdiction', () => {
    it('rejects null and undefined', () => {
      expect(isJurisdiction(null)).toBe(false);
      expect(isJurisdiction(undefined)).toBe(false);
    });

    it('rejects empty object', () => {
      expect(isJurisdiction({})).toBe(false);
    });

    it('rejects missing required fields', () => {
      expect(isJurisdiction({ state: 'NY', county: 'Kings', nextElectionDate: new Date() })).toBe(false); // missing id
      expect(isJurisdiction({ id: '1', county: 'Kings', nextElectionDate: new Date() })).toBe(false); // missing state
      expect(isJurisdiction({ id: '1', state: 'NY', nextElectionDate: new Date() })).toBe(false); // missing county
      expect(isJurisdiction({ id: '1', state: 'NY', county: 'Kings' })).toBe(false); // missing date
    });

    it('rejects wrong value types', () => {
      expect(isJurisdiction({ id: 1, state: 'NY', county: 'Kings', nextElectionDate: new Date() })).toBe(false);
      expect(isJurisdiction({ id: '1', state: 'NY', county: 'Kings', nextElectionDate: 12345 })).toBe(false);
    });

    it('accepts exact valid object', () => {
      expect(isJurisdiction({
        id: 'juris_1',
        state: 'NY',
        county: 'Kings',
        nextElectionDate: new Date()
      })).toBe(true);
    });
  });

  describe('isGroundedResponse', () => {
    it('rejects null and undefined', () => {
      expect(isGroundedResponse(null)).toBe(false);
      expect(isGroundedResponse(undefined)).toBe(false);
    });

    it('rejects empty object', () => {
      expect(isGroundedResponse({})).toBe(false);
    });

    it('rejects missing fields', () => {
      expect(isGroundedResponse({ answer: 'A', sources: ['B'] })).toBe(false); // missing confidence
      expect(isGroundedResponse({ answer: 'A', confidence: 90 })).toBe(false); // missing sources
      expect(isGroundedResponse({ sources: ['B'], confidence: 90 })).toBe(false); // missing answer
    });

    it('rejects wrong value types', () => {
      expect(isGroundedResponse({ answer: 'A', sources: 'B', confidence: 90 })).toBe(false);
      expect(isGroundedResponse({ answer: 'A', sources: [], confidence: 90 })).toBe(false); // empty sources not allowed
      expect(isGroundedResponse({ answer: 'A', sources: ['B'], confidence: '90' })).toBe(false);
      expect(isGroundedResponse({ answer: 'A', sources: ['B'], confidence: 150 })).toBe(false); // out of range
    });

    it('accepts exact valid object', () => {
      expect(isGroundedResponse({
        answer: 'You can vote.',
        sources: ['https://example.com/vote'],
        confidence: 95
      })).toBe(true);
    });
  });

  describe('isAppError', () => {
    it('rejects null and undefined', () => {
      expect(isAppError(null)).toBe(false);
      expect(isAppError(undefined)).toBe(false);
    });

    it('rejects empty object', () => {
      expect(isAppError({})).toBe(false);
    });

    it('rejects missing fields for specific error', () => {
      expect(isAppError({ code: 'JURISDICTION_NOT_FOUND', message: 'Error' })).toBe(false); // missing searchedJurisdiction
    });

    it('rejects wrong value types', () => {
      expect(isAppError({ code: 'JURISDICTION_NOT_FOUND', message: 'Error', searchedJurisdiction: 123 })).toBe(false);
    });

    it('accepts exact valid object', () => {
      expect(isAppError({
        code: 'JURISDICTION_NOT_FOUND',
        message: 'Could not find the jurisdiction.',
        searchedJurisdiction: 'Gotham'
      })).toBe(true);
    });
  });

  describe('isFactCheckVerdict', () => {
    it('rejects null and undefined', () => {
      expect(isFactCheckVerdict(null)).toBe(false);
      expect(isFactCheckVerdict(undefined)).toBe(false);
    });

    it('rejects invalid strings', () => {
      expect(isFactCheckVerdict('MAYBE')).toBe(false);
      expect(isFactCheckVerdict('')).toBe(false);
    });

    it('accepts exact valid values', () => {
      expect(isFactCheckVerdict('TRUE')).toBe(true);
      expect(isFactCheckVerdict('FALSE')).toBe(true);
      expect(isFactCheckVerdict('MISLEADING')).toBe(true);
      expect(isFactCheckVerdict('UNVERIFIABLE')).toBe(true);
    });
  });

  describe('isBallotItem', () => {
    it('rejects null and undefined', () => {
      expect(isBallotItem(null)).toBe(false);
      expect(isBallotItem(undefined)).toBe(false);
    });

    it('rejects empty object', () => {
      expect(isBallotItem({})).toBe(false);
    });

    it('rejects missing fields', () => {
      expect(isBallotItem({ type: 'bond_measure', id: '1', amount: 1000 })).toBe(false); // missing purpose
    });

    it('rejects wrong value types', () => {
      expect(isBallotItem({ type: 'bond_measure', id: '1', amount: '1000', purpose: 'schools' })).toBe(false);
    });

    it('accepts exact valid object', () => {
      expect(isBallotItem({
        type: 'bond_measure',
        id: 'item_1',
        amount: 5000000,
        purpose: 'Build new school'
      })).toBe(true);
    });
  });
});
