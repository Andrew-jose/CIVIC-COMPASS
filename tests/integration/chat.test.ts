import request from 'supertest';
import express from 'express';
import { chatController } from '../../backend/src/routes/api';

const app = express();
app.use(express.json());
// Mock auth middleware
app.use((req, res, next) => {
  const auth = req.headers.authorization;
  if (auth === 'Bearer invalid') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});
app.post('/api/v1/chat', chatController);

describe('POST /api/v1/chat', () => {
  it('Returns 200 with SSE stream when valid message sent', async () => {
    const response = await request(app)
      .post('/api/v1/chat')
      .send({ message: 'Hello' })
      .set('Authorization', 'Bearer valid');
      
    expect(response.status).toBe(200);
    expect(response.header['content-type']).toContain('text/event-stream');
    expect(response.text).toContain('confidence');
  });

  it('Returns 400 when message is empty', async () => {
    const response = await request(app)
      .post('/api/v1/chat')
      .send({})
      .set('Authorization', 'Bearer valid');
      
    expect(response.status).toBe(400);
  });

  it('Returns 401 when Firebase token is invalid', async () => {
    const response = await request(app)
      .post('/api/v1/chat')
      .send({ message: 'Hello' })
      .set('Authorization', 'Bearer invalid');
      
    expect(response.status).toBe(401);
  });

  it('Returns 200 but UNVERIFIABLE when question is out-of-scope', async () => {
    const response = await request(app)
      .post('/api/v1/chat')
      .send({ message: 'out-of-scope' })
      .set('Authorization', 'Bearer valid');
      
    expect(response.status).toBe(200);
    expect(response.text).toContain('UNVERIFIABLE');
  });
});
