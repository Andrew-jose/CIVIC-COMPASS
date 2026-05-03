# CIVIC COMPASS

## CIVIC COMPASS
Civic Compass is a highly accessible, AI-powered election navigation platform designed to combat voter disenfranchisement. By leveraging the advanced reasoning capabilities of Gemini 3 Pro within a strict, anti-hallucination agentic framework, the platform provides voters with personalized election timelines, localized voting requirements, and verifiable civic fact-checking. Built with a focus on WCAG 2.2 accessibility and rigorous data grounding, Civic Compass ensures every citizen has clear, accurate, and actionable guidance to successfully cast their ballot.

## Architecture

```text
+-----------------------------------------------------------------------------------+
|                                 CIVIC COMPASS                                     |
|                                                                                   |
|  [ Frontend (React 18 + TypeScript + Vite) ]                                      |
|    |                                                                              |
|    +-- [ Components: Journey | Timeline | Checklist | Chat | FactCheck ]          |
|    |                                                                              |
|  [ Firebase SDK ]                                                                 |
|    |                                                                              |
|    v                                                                              |
|  [ Firebase Authentication ] === (JWT Bearer Token)                               |
|    |                                                                              |
|    v                                                                              |
|  [ Backend API (Node.js + Express + Cloud Run) ]                                  |
|    |                                                                              |
|    +-- [ Route Handlers ] ---> [ Dependency Injection Container ]                 |
|    |                                      |                                       |
|    |                                      v                                       |
|    |     +------------------------------------------------------------------+     |
|    |     |                        SERVICE LAYER                             |     |
|    |     |                                                                  |     |
|    |     |  +--------------------+ +--------------------+ +--------------+  |     |
|    |     |  | GeminiService      | | ConfidenceScorer   | | FactChecker  |  |     |
|    |     |  +--------------------+ +--------------------+ +--------------+  |     |
|    |     |                                                                  |     |
|    |     |  +--------------------+ +--------------------+ +--------------+  |     |
|    |     |  | ChecklistGenerator | | BallotProcessor    | | Sanitizer    |  |     |
|    |     |  +--------------------+ +--------------------+ +--------------+  |     |
|    |     |                                                                  |     |
|    |     |  +--------------------+ +--------------------+ +--------------+  |     |
|    |     |  | JurisdictionResolver| | PerformanceMonitor | | Cache        |  |     |
|    |     |  +--------------------+ +--------------------+ +--------------+  |     |
|    |     +------------------------------------------------------------------+     |
|    |                                      |                                       |
|    |                                      v                                       |
|    |     +------------------------------------------------------------------+     |
|    |     |                     REPOSITORY LAYER                             |     |
|    |     |                                                                  |     |
|    |     |  +-----------------------+       +----------------------------+  |     |
|    |     |  | FirestoreUserRepository|       | FirestoreCivicDataRepository|  |     |
|    |     |  +-----------------------+       +----------------------------+  |     |
|    |     +------------------------------------------------------------------+     |
|    |                                      |                                       |
|    v                                      v                                       |
|  [ External Services ]                    |                                       |
|    +-- Gemini 3 API  <--------------------+                                       |
|    +-- Cloud Firestore DB <---------------+                                       |
|    +-- Redis / Memory Cache <-------------+                                       |
+-----------------------------------------------------------------------------------+
```

## Features
- **TypeScript Strict Mode:** The entire codebase operates under the strictest possible TypeScript configuration to ensure type safety, minimizing runtime errors and undefined behaviors.
- **Repository Pattern:** Database interactions are fully abstracted through a clean Repository pattern, enabling easy testing, mocking, and future database migrations.
- **Dependency Injection:** A lightweight, constructor-based DI container wires up all services and repositories, making the application modular and highly testable.
- **Result Monad Pattern:** The architecture relies on a robust `Result<T, E>` monad for explicit error handling, entirely eliminating silent failures and scattered `try/catch` blocks.
- **Comprehensive Documentation:** Every service, interface, and method is fully documented with standard JSDoc comments to support auto-generated documentation via TypeDoc.
