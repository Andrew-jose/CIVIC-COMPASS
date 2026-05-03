import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';
import { Request } from 'express';

// Initialize Redis client. If REDIS_URL is not provided, it will gracefully fallback or fail depending on setup.
const redisClient = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : undefined;

// Helper to determine if we should use Redis or Memory Store
const getStore = (prefix: string) => {
  if (redisClient) {
    return new RedisStore({
      sendCommand: async (...args: string[]) => {
        const reply = await redisClient.call(args[0], ...args.slice(1));
        return reply as any;
      },
      prefix: `rate-limit:${prefix}:`,
    });
  }
  // Falls back to MemoryStore automatically when store is undefined
  return undefined; 
};

// Custom key generator to differentiate between authenticated and anonymous users
const keyGenerator = (req: Request): string => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return `auth:${req.headers.authorization.split(' ')[1]}`;
  }
  return `ip:${req.ip}`;
};

const bypassHealthCheck = (req: Request) => req.path === '/api/v1/health';

// Tier 1 — Chat endpoint (/api/v1/chat)
export const chatRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute sliding window
  limit: async (req: Request) => {
    if (req.headers.authorization) return 10;
    return 3;
  },
  keyGenerator,
  skip: bypassHealthCheck,
  store: getStore('chat'),
  message: {
    error: "Too many chat requests.",
    code: "RATE_LIMIT_EXCEEDED"
  },
  standardHeaders: true, 
  legacyHeaders: false,
});

// Tier 2 — Ballot upload (/api/v1/ballot/upload)
export const ballotUploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: async (req: Request) => {
    if (req.headers.authorization) return 5;
    return 2;
  },
  keyGenerator,
  skip: bypassHealthCheck,
  store: getStore('ballot'),
  message: {
    error: "Ballot upload limit reached. Please wait before uploading again.",
    code: "UPLOAD_LIMIT_EXCEEDED"
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Tier 3 — Fact-checker (/api/v1/factcheck)
export const factcheckRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  limit: async (req: Request) => {
    if (req.headers.authorization) return 20;
    return 5;
  },
  keyGenerator,
  skip: bypassHealthCheck,
  store: getStore('factcheck'),
  message: {
    error: "Fact-check rate limit exceeded.",
    code: "RATE_LIMIT_EXCEEDED"
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Tier 4 — General API catch-all
export const generalApiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100,
  keyGenerator: (req: Request) => req.ip as string,
  skip: bypassHealthCheck,
  store: getStore('general'),
  message: {
    error: "Too many requests to the API. Please try again later.",
    code: "RATE_LIMIT_EXCEEDED"
  },
  standardHeaders: true,
  legacyHeaders: false,
});
