# CIVIC COMPASS

An AI-powered election assistant designed to provide localized, non-partisan voting information, ballot explanations, and fact-checking.

## Architecture Overview

```text
+-------------------+        +--------------------+       +----------------------+
|                   |        |                    |       |                      |
|  React 18 / Vite  | <----> | Node.js / Express  | <---> | Gemini 3.1 Pro/Flash |
|  (Frontend App)   |  SSE   | (Cloud Run Backend)|       | (AI Intelligence)    |
|                   |        |                    |       |                      |
+--------+----------+        +---------+----------+       +----------------------+
         |                             |                              |
         | JWT Auth                    | Firebase Admin               | Grounding
         v                             v                              v
+-------------------+        +--------------------+       +----------------------+
|                   |        |                    |       |                      |
| Firebase Auth     |        | Firestore Database |       | Google Search / URLs |
|                   |        |                    |       |                      |
+-------------------+        +--------------------+       +----------------------+
```

## Local Development Setup

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd CIVIC-COMPASS
   ```

2. **Install Dependencies:**
   ```bash
   npm install            # Root orchestrator
   cd backend && npm install
   cd ../frontend && npm install
   ```

3. **Configure Environment:**
   Copy `.env.example` to `.env` in the `backend` directory and fill in your keys.

4. **Run the Application Locally:**
   ```bash
   # From the root directory, you can run services
   npm run dev:backend
   npm run dev:frontend
   ```
   *Note: Ensure Redis is running locally if you want to test rate limits and caching, or let the app fallback to memory.*

## Environment Variables Reference

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `GEMINI_API_KEY` | Your Google Gemini API Key | Yes | |
| `GOOGLE_CLOUD_PROJECT` | GCP Project ID for Secrets/Monitoring | Yes | |
| `REDIS_URL` | Connection string for Rate Limiting/Caching | No | (Memory Fallback) |
| `PORT` | Backend Express Port | No | 8080 |
| `NODE_ENV` | Development or Production flag | No | `development` |

## API Endpoint Reference

### `POST /api/v1/chat`
Streams a conversation response based on user input.

**Request:**
```json
{
  "message": "Do I need an ID to vote in Texas?",
  "sessionId": "abc-123",
  "jurisdiction": { "state": "TX", "county": "Travis", "fips": "48453" },
  "language": "en"
}
```

**Response (SSE Stream):**
```text
data: {"text": "Yes, you need a photo ID..."}
data: {"done": true, "confidence": 95}
```

## Testing Guide

Our testing is strictly segregated into 5 layers.

```bash
npm run test:unit         # Layer 1: Isolated functions
npm run test:integration  # Layer 2: API routes & middleware
npm run test:components   # Layer 3: React components (Vitest)
npm run test:e2e          # Layer 4: Full flow (Playwright)
npm run test:ai           # Layer 5: Live Gemini responses
npm run test:all          # Run the entire suite
```

## Deployment Guide

We deploy to Google Cloud Run. 

1. **Build the production container:**
   ```bash
   docker build -t gcr.io/[PROJECT_ID]/civic-compass-backend ./backend
   ```
2. **Deploy to Cloud Run:**
   ```bash
   gcloud run deploy civic-compass-backend \
     --image gcr.io/[PROJECT_ID]/civic-compass-backend \
     --platform managed \
     --allow-unauthenticated
   ```
3. **Deploy Frontend to Firebase Hosting:**
   ```bash
   cd frontend && npm run build
   firebase deploy --only hosting
   ```
