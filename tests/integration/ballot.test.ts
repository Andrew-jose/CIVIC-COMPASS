import request from 'supertest';
import express from 'express';
import multer from 'multer';
import { ballotController } from '../../backend/src/routes/api';

const app = express();
const upload = multer();
app.post('/api/v1/ballot/upload', upload.single('file'), ballotController);

describe('POST /api/v1/ballot/upload', () => {
  it('Returns 200 with extracted text for valid PDF under 10MB', async () => {
    const response = await request(app)
      .post('/api/v1/ballot/upload')
      .attach('file', Buffer.from('fake pdf content'), {
        filename: 'test.pdf',
        contentType: 'application/pdf',
      });
      
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('Returns 413 for PDF over 10MB', async () => {
    const largeBuffer = Buffer.alloc(11 * 1024 * 1024);
    const response = await request(app)
      .post('/api/v1/ballot/upload')
      .attach('file', largeBuffer, {
        filename: 'large.pdf',
        contentType: 'application/pdf',
      });
      
    expect(response.status).toBe(413);
  });

  it('Returns 400 for non-PDF file upload', async () => {
    const response = await request(app)
      .post('/api/v1/ballot/upload')
      .attach('file', Buffer.from('fake image content'), {
        filename: 'test.png',
        contentType: 'image/png',
      });
      
    expect(response.status).toBe(400);
  });
});
