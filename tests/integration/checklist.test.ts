import request from 'supertest';
import express from 'express';
import { checklistController } from '../../backend/src/routes/api';

const app = express();
app.use(express.json());
app.post('/api/v1/checklist', checklistController);

describe('POST /api/v1/checklist', () => {
  it('Returns tiered object', async () => {
    const response = await request(app)
      .post('/api/v1/checklist')
      .send({ state: 'TX', profile: {} });
      
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('critical');
    expect(response.body).toHaveProperty('important');
    expect(response.body).toHaveProperty('optional');
    
    if (response.body.important.length > 0) {
      const item = response.body.important[0];
      expect(item).toHaveProperty('action');
      expect(item).toHaveProperty('deadline');
      expect(item).toHaveProperty('timeNeeded');
      expect(item).toHaveProperty('officialUrl');
      expect(item).toHaveProperty('consequence');
    }
  });

  it('Unregistered Georgia voter always has >= 1 critical item', async () => {
    const response = await request(app)
      .post('/api/v1/checklist')
      .send({ state: 'GA', profile: { isFirstTimeVoter: true } });
      
    expect(response.status).toBe(200);
    expect(response.body.critical.length).toBeGreaterThanOrEqual(1);
  });

  it('Returns 400 if state is not a valid US state code', async () => {
    const response = await request(app)
      .post('/api/v1/checklist')
      .send({ state: 'invalid', profile: {} });
      
    expect(response.status).toBe(400);
  });
});
