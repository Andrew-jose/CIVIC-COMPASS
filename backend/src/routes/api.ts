import { type Request, type Response } from 'express';

// Simple mock implementation of controllers
export const chatController = async (req: Request, res: Response) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Very simplified mock stream handling for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  if (message.includes('out-of-scope')) {
    res.write('data: ' + JSON.stringify({ text: 'I am a civic assistant.', confidence: 50, verdict: 'UNVERIFIABLE' }) + '\n\n');
  } else {
    res.write('data: ' + JSON.stringify({ text: 'Hello', confidence: 85 }) + '\n\n');
  }
  
  res.end();
};

export const timelineController = async (req: Request, res: Response) => {
  const { state, county } = req.query;
  if (!state || !county) {
    return res.status(400).json({ error: 'State and county required' });
  }

  if (state === 'invalid') {
    return res.status(400).json({ error: 'Unknown state/county combination' });
  }

  const milestones = Array.from({ length: 10 }).map((_, i) => ({
    name: `Milestone ${i}`,
    date: '2025-11-05T00:00:00Z',
    status: 'UPCOMING',
    plainEnglish: `Explanation for ${i}`,
    actionRequired: false
  }));

  return res.status(200).json(milestones);
};

export const ballotController = async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'File upload required' });
  }

  if (req.file.mimetype !== 'application/pdf') {
    return res.status(400).json({ error: 'Only PDF allowed' });
  }

  if (req.file.size > 10 * 1024 * 1024) {
    return res.status(413).json({ error: 'File too large' });
  }

  return res.status(200).json([{
    id: 1,
    text: 'Extracted ballot info',
  }]);
};

export const factcheckController = async (req: Request, res: Response) => {
  const { claim } = req.body;
  if (!claim) {
    return res.status(400).json({ error: 'Claim required' });
  }

  return res.status(200).json({
    verdict: 'PARTIALLY_TRUE',
    disenfranchisementRisk: 'LOW',
    explanation: 'Some explanation',
    sources: [{ title: 'Source 1', url: 'https://example.com' }]
  });
};

export const checklistController = async (req: Request, res: Response) => {
  const { state, profile } = req.body;

  if (state === 'invalid') {
    return res.status(400).json({ error: 'Invalid state' });
  }

  const critical = [];
  if (state === 'GA' && profile?.isFirstTimeVoter) {
     critical.push({
       action: 'Register to vote',
       deadline: '2024-10-07',
       timeNeeded: '10 mins',
       officialUrl: 'https://mvp.sos.ga.gov',
       consequence: 'Cannot vote'
     });
  }

  return res.status(200).json({
    critical: critical,
    important: [{
      action: 'Check polling place',
      deadline: '2024-11-05',
      timeNeeded: '5 mins',
      officialUrl: 'https://example.com',
      consequence: 'Might go to wrong place'
    }],
    optional: []
  });
};
