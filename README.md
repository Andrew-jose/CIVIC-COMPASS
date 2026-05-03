# 🧭 CIVIC COMPASS — AI Election Intelligence Assistant

> **Every citizen. Every election. Zero confusion.**

CIVIC COMPASS is a Gemini 3-powered civic intelligence platform that transforms the complex election process into a personalized, step-by-step interactive journey. Built with the latest Google AI stack (May 2026).

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CIVIC COMPASS                             │
├────────────────────┬────────────────────────────────────────┤
│   FRONTEND (SPA)   │         BACKEND (API)                  │
│                    │                                        │
│  React 18 + TS     │  Node.js 20 + Express                 │
│  Tailwind CSS      │  TypeScript                           │
│  Zustand           │  @google/genai SDK                    │
│  Framer Motion     │                                        │
│  React Router v6   │  ┌──────────────────────┐             │
│  react-i18next     │  │   Gemini 3.1 Pro     │             │
│  (8 languages)     │  │   Gemini 3 Flash     │             │
│                    │  │   Gemini Embedding 2 │             │
│  Firebase Auth     │  └──────┬───────────────┘             │
│  Firebase Hosting  │         │                              │
│                    │  ┌──────▼───────────────┐             │
├────────────────────┤  │  AI Pipeline Flows   │             │
│   PAGES            │  │  (Genkit-style)      │             │
│                    │  ├──────────────────────┤             │
│  / Landing         │  │ Google Search Ground │             │
│  /journey Chat     │  │ URL Context Tool     │             │
│  /timeline         │  │ Function Calling     │             │
│  /ballot           │  │ Structured Output    │             │
│  /checklist        │  │ Thought Signatures   │             │
│  /factcheck        │  └──────┬───────────────┘             │
│  /history          │         │                              │
│                    │  ┌──────▼───────────────┐             │
├────────────────────┤  │  Firebase Firestore  │             │
│   9 COMPONENTS     │  │  Cloud Storage       │             │
│                    │  │  Cloud Run           │             │
│  ConversationThread│  │  Secret Manager      │             │
│  ElectionTimeline  │  └──────────────────────┘             │
│  VoterChecklist    │                                        │
│  BallotExplainer   │  API Endpoints:                        │
│  JurisdictionInput │  POST /api/v1/session                  │
│  LanguageSelector  │  POST /api/v1/jurisdiction             │
│  ConfidenceBar     │  POST /api/v1/chat (SSE)               │
│  SourceCitationPanel│ POST /api/v1/timeline                  │
│  FactChecker       │  POST /api/v1/checklist                │
│                    │  POST /api/v1/ballot/upload             │
│                    │  POST /api/v1/ballot/explain            │
│                    │  POST /api/v1/factcheck                │
└────────────────────┴────────────────────────────────────────┘
```

## ✨ Features

| Feature | Powered By | Description |
|---------|-----------|-------------|
| **AI Election Journey** | Gemini 3 Flash | SSE streaming conversation with grounded civic guidance |
| **Election Timeline** | Gemini 3.1 Pro + Structured Output | Interactive timeline with color-coded milestones |
| **Ballot Explainer** | Gemini 3.1 Pro (thinkingLevel: high) | PDF upload → plain-language breakdown |
| **Voter Checklist** | Gemini 3.1 Pro + Structured Output | Personalized readiness checklist with deadlines |
| **Fact Checker** | Gemini 3.1 Pro + Google Search + URL Context | Claim verification with structured verdicts |
| **8-Language Support** | react-i18next | EN, ES, FR, ZH, HI, AR, PT, VI + RTL |

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- npm 10+
- A [Gemini API key](https://ai.google.dev/gemini-api/docs/api-key)

### 1. Clone & Install

```bash
git clone https://github.com/Andrew-jose/CIVIC-COMPASS.git
cd CIVIC-COMPASS

# Install frontend
cd frontend && npm install

# Install backend
cd ../backend && npm install
```

### 2. Configure Environment

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your API keys:
#   GEMINI_API_KEY=your_gemini_api_key
#   PORT=3001
```

### 3. Run Development Servers

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

Frontend: `http://localhost:5173`
Backend: `http://localhost:3001`

## 🔑 Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | ✅ | Google AI Studio API key |
| `PORT` | ❌ | Server port (default: 3001) |
| `NODE_ENV` | ❌ | `development` or `production` |
| `FIREBASE_PROJECT_ID` | ❌ | Firebase project ID |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | ❌ | Path to service account JSON |
| `VERTEX_AI_PROJECT_ID` | ❌ | For production Vertex AI |
| `VERTEX_AI_LOCATION` | ❌ | Vertex AI region |
| `GOOGLE_PLACES_API_KEY` | ❌ | Google Places for address autocomplete |
| `GOOGLE_CIVIC_API_KEY` | ❌ | Google Civic Information API |
| `CLOUD_STORAGE_BUCKET_NAME` | ❌ | GCS bucket for ballot uploads |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_FIREBASE_API_KEY` | ❌ | Firebase Web API key |
| `VITE_FIREBASE_PROJECT_ID` | ❌ | Firebase project ID |
| `VITE_FIREBASE_AUTH_DOMAIN` | ❌ | Firebase Auth domain |

## 📁 Project Structure

```
civic-compass/
├── frontend/
│   ├── src/
│   │   ├── components/     # 9 interactive UI components
│   │   ├── pages/          # 7 page routes
│   │   ├── store/          # Zustand global state
│   │   ├── lib/            # Firebase, Firestore, i18n
│   │   ├── locales/        # 8 language JSON files
│   │   ├── App.tsx         # Router & layout
│   │   └── index.css       # Design system
│   └── vite.config.ts
├── backend/
│   ├── src/
│   │   ├── routes/         # 7 API endpoints
│   │   ├── services/       # Gemini, Genkit, Confidence, etc.
│   │   ├── prompts/        # System + feature prompts
│   │   ├── schemas/        # Structured Output JSON schemas
│   │   ├── tools/          # Function calling declarations
│   │   └── middleware/     # Auth + error handling
│   └── Dockerfile
├── firebase.json           # Hosting + Firestore config
├── firestore.rules         # Security rules
└── README.md
```

## 🛡️ Anti-Hallucination Protocol

Every Gemini call enforces 8 layers of grounding:

1. **Prompt Grounding** — Jurisdiction JSON in system prompt
2. **Google Search Grounding** — Built-in tool with groundingMetadata
3. **URL Context** — Reads official election websites directly
4. **Structured Output** — JSON schema enforcement
5. **Thought Signatures** — Reasoning chain integrity
6. **Post-Validation** — Cross-check dates vs jurisdiction data
7. **Confidence Display** — Every response shows 0-100 score
8. **Safe Fallback** — Low confidence → link to official source

## 🚢 Deployment

### Firebase Hosting (Frontend)
```bash
cd frontend && npm run build
firebase deploy --only hosting
```

### Cloud Run (Backend)
```bash
cd backend
gcloud run deploy civic-compass-api \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production"
```

## ♿ Accessibility (WCAG 2.2 AA)

- Keyboard navigable (Tab, Enter, Space)
- Skip navigation link
- All inputs with `<label>`, all images with `alt`
- Focus indicator 3px outline
- `aria-live="polite"` on AI output
- Color contrast ≥ 4.5:1
- RTL support for Arabic
- `prefers-reduced-motion` support

## 📜 License

MIT
