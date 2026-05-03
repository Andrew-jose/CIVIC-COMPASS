import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { chatRouter } from './routes/chat';
import { timelineRouter } from './routes/timeline';
import { checklistRouter } from './routes/checklist';
import { ballotRouter } from './routes/ballot';
import { factcheckRouter } from './routes/factcheck';
import { jurisdictionRouter } from './routes/jurisdiction';
import { sessionRouter } from './routes/session';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// ── Health Check ─────────────────────────────────────
app.get('/api/v1/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'civic-compass-backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ── API Routes ───────────────────────────────────────
app.use('/api/v1/session', sessionRouter);
app.use('/api/v1/jurisdiction', jurisdictionRouter);
app.use('/api/v1/chat', chatRouter);
app.use('/api/v1/timeline', timelineRouter);
app.use('/api/v1/checklist', checklistRouter);
app.use('/api/v1/ballot', ballotRouter);
app.use('/api/v1/factcheck', factcheckRouter);

// ── Error Handling ───────────────────────────────────
app.use(errorHandler);

// ── Start Server ─────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🧭 CIVIC COMPASS Backend`);
  console.log(`   Port: ${PORT}`);
  console.log(`   Env:  ${process.env.NODE_ENV || 'development'}`);
  console.log(`   API:  http://localhost:${PORT}/api/v1\n`);
});

export default app;
