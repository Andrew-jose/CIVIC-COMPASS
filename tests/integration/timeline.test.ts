import request from 'supertest';
import express from 'express';
import { timelineController } from '../../backend/src/routes/api';

const app = express();
app.use(express.json());
app.get('/api/v1/timeline', timelineController);

describe('GET /api/v1/timeline', () => {
  it('Returns exactly 10 milestone objects with required fields', async () => {
    const response = await request(app)
      .get('/api/v1/timeline?state=TX&county=travis&election=2025-general');
      
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(10);
    
    const milestone = response.body[0];
    expect(milestone).toHaveProperty('name');
    expect(milestone).toHaveProperty('date');
    expect(milestone).toHaveProperty('status');
    expect(milestone).toHaveProperty('plainEnglish');
    expect(milestone).toHaveProperty('actionRequired');
    
    // Check ISO 8601
    expect(!isNaN(Date.parse(milestone.date))).toBe(true);
    
    // Check status
    expect(['UPCOMING', 'URGENT', 'TODAY', 'PASSED']).toContain(milestone.status);
  });

  it('Returns 400 for unknown state/county combination', async () => {
    const response = await request(app)
      .get('/api/v1/timeline?state=invalid&county=invalid');
      
    expect(response.status).toBe(400);
  });
});
