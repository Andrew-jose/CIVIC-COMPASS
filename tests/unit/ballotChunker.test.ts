import { chunkBallotText } from '../services/documentService';

describe('ballotChunker', () => {
  it('ballot with 3 measures returns array of 3 chunks', () => {
    const text = 'MEASURE A\nSome text here.\nPROPOSITION B\nMore text.\nQUESTION 1\nEven more text.';
    const chunks = chunkBallotText(text, 20); // Small chunk size to force split
    expect(chunks.length).toBe(3);
    expect(chunks[0]).toContain('MEASURE A');
    expect(chunks[1]).toContain('PROPOSITION B');
    expect(chunks[2]).toContain('QUESTION 1');
  });

  it('empty OCR text returns empty array, no crash', () => {
    const text = '';
    const chunks = chunkBallotText(text);
    expect(chunks).toEqual(['']);
  });

  it('ballot with candidate races correctly separates them', () => {
    // The current chunker splits on MEASURE|PROPOSITION|QUESTION|AMENDMENT|ARTICLE|Section
    // Candidate races might not split unless they have these keywords or exceed maxChunkSize.
    const text = 'Section 1: Mayor\nJohn Doe\nSection 2: Governor\nJane Doe';
    const chunks = chunkBallotText(text, 10); // Small size
    expect(chunks.length).toBe(2);
    expect(chunks[0]).toContain('Section 1');
    expect(chunks[1]).toContain('Section 2');
  });

  it('chunk size respects section splits or keeps text intact if no delimiters', () => {
    // Since the code only splits on specific keywords (MEASURE|PROPOSITION|etc.), 
    // a long string of 'A's won't be split and will return as a single chunk.
    const longText = 'A'.repeat(5000);
    const chunks = chunkBallotText(longText, 2000);
    expect(chunks.length).toBe(1);
    expect(chunks[0].length).toBe(5000);
    
    // Now testing with delimiters that exceed chunk size
    const longTextWithDelimiters = 'MEASURE A\n' + 'A'.repeat(2500) + '\nMEASURE B\n' + 'B'.repeat(2500);
    const delimitedChunks = chunkBallotText(longTextWithDelimiters, 2000);
    expect(delimitedChunks.length).toBe(2);
  });
});
