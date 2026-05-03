import helmet from 'helmet';
import cors from 'cors';
import { RequestHandler } from 'express';

export const securityHeaders: RequestHandler[] = [
  // 1. Helmet Security Headers
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"], // No unsafe-inline or unsafe-eval
        styleSrc: ["'self'", "fonts.googleapis.com"],
        fontSrc: ["fonts.gstatic.com"],
        connectSrc: ["'self'", "*.googleapis.com", "*.firebaseio.com"],
        imgSrc: ["'self'", "data:", "blob:"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
    xFrameOptions: { action: "deny" },
    xContentTypeOptions: true, // nosniff is the default and only option
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    xssFilter: true, // X-XSS-Protection: 1; mode=block
  }),
  
  // Custom Permissions-Policy Header
  (req, res, next) => {
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  },

  // 2. CORS Configuration
  cors({
    origin: (origin, callback) => {
      // Explicit allowed list
      const allowedOrigins = [
        'https://civiccompass.app', // Production
        'http://localhost:5173',    // Local dev
        'http://localhost:3000'
      ];
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true, // Assuming client sends Firebase token via Authorization header but if they need cookies:
    methods: ['GET', 'POST'],
    maxAge: 86400, // 24 hours
  })
];
