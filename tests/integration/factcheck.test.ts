import request from 'supertest';
import express from 'express';
import { factcheckController } from '../../backend/src/routes/api';

const app = express();
app.use(express.json());
app.post('/api/v1/factcheck', factcheckController);

describe('POST /api/v1/factcheck', () => {
  it('Returns verdict field and disenfranchisementRisk', async () => {
    const response = await request(app)
      .post('/api/v1/factcheck')
      .send({ claim: 'You cannot vote if you have a felony in Texas' });
      
    expect(response.status).toBe(200);
    expect(['TRUE', 'FALSE', 'PARTIALLY_TRUE', 'UNVERIFIABLE']).toContain(response.body.verdict);
    expect(['HIGH', 'MEDIUM', 'LOW']).toContain(response.body.disenfranchisementRisk);
    expect(response.body).toHaveProperty('explanation');
  });

  it('Returns structured error response when claim is missing', async () => {
    const response = await request(app)
      .post('/api/v1/factcheck')
      .send({});
      
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });
});
