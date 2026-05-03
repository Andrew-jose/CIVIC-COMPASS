/**
 * ═══════════════════════════════════════════════════════════════════════
 * CIVIC COMPASS — Dependency Injection Container
 *
 * The single place where all concrete classes are instantiated and
 * wired together via constructor injection. No service instantiates
 * its own dependencies. Every service is testable in isolation by
 * passing mock dependencies.
 *
 * Wiring order (each layer depends only on layers above it):
 *   1. Configuration
 *   2. Infrastructure (Firestore, Redis, SecretsManager)
 *   3. Repositories (depend on Firestore)
 *   4. Domain Services (depend on Repositories + Infrastructure)
 *   5. Container (exposes everything to route handlers)
 *
 * Usage in routes:
 *   const container = createContainer(config);
 *   app.post('/api/v1/chat', (req, res, next) => {
 *     const result = await container.chatService.respond(req.body);
 *     match(result, {
 *       ok: (response) => res.json(response),
 *       err: (error) => next(error),
 *     });
 *   });
 * ═══════════════════════════════════════════════════════════════════════
 */

import * as admin from 'firebase-admin';
import type { IUserRepository } from './repositories/IUserRepository';
import type { ICivicDataRepository } from './repositories/ICivicDataRepository';
import type { ISecurityLogRepository } from './repositories/ISecurityLogRepository';
import { FirestoreUserRepository } from './repositories/FirestoreUserRepository';
import { FirestoreCivicDataRepository } from './repositories/FirestoreCivicDataRepository';
import { FirestoreSecurityLogRepository } from './repositories/FirestoreSecurityLogRepository';
import { SecretsManager } from './config/secrets';

// ── Configuration ───────────────────────────────────────────────────────

export interface AppConfig {
  readonly environment: 'development' | 'production' | 'test';
  readonly port: number;
  readonly frontendUrl: string;
  readonly geminiApiKey: string;
  readonly redisUrl: string;
}

// ── Container Interface ─────────────────────────────────────────────────

/**
 * The typed container interface. Every service and repository that
 * the application uses is listed here. Route handlers receive this
 * interface — they never construct services themselves.
 */
export interface Container {
  readonly config: AppConfig;
  readonly userRepository: IUserRepository;
  readonly civicDataRepository: ICivicDataRepository;
  readonly securityLogRepository: ISecurityLogRepository;
  readonly secretsManager: SecretsManager;
}

// ── Factory Function ────────────────────────────────────────────────────

/**
 * Creates and wires the full application container.
 *
 * This is the only place where concrete classes are instantiated.
 * All services receive their dependencies via constructor parameters.
 *
 * @param config - Application configuration.
 * @returns A fully wired Container ready for use by route handlers.
 *
 * @example
 * // Production wiring (in index.ts):
 * const container = createContainer({
 *   environment: 'production',
 *   port: 3001,
 *   frontendUrl: 'https://civic-compass.web.app',
 *   geminiApiKey: process.env.GEMINI_API_KEY ?? '',
 *   redisUrl: process.env.REDIS_URL ?? '',
 * });
 *
 * // Test wiring (in test setup):
 * // Import MockUserRepository, MockCivicDataRepository directly
 * // and construct a test container without Firestore.
 */
export function createContainer(config: AppConfig): Container {
  // ── 1. Infrastructure ───────────────────────────────────────────────

  // Initialize Firebase Admin if not already initialized
  if (admin.apps.length === 0) {
    admin.initializeApp();
  }
  const firestore = admin.firestore();

  const secretsManager = new SecretsManager();

  // ── 2. Repositories ─────────────────────────────────────────────────
  // Each repository receives only the Firestore instance it needs.
  // No repository knows about other repositories.

  const userRepository: IUserRepository = new FirestoreUserRepository(firestore);

  const civicDataRepository: ICivicDataRepository = new FirestoreCivicDataRepository(firestore);

  const securityLogRepository: ISecurityLogRepository = new FirestoreSecurityLogRepository(firestore);

  // ── 3. Assemble Container ───────────────────────────────────────────

  return {
    config,
    userRepository,
    civicDataRepository,
    securityLogRepository,
    secretsManager,
  };
}

// ── Route Handler Pattern ───────────────────────────────────────────────
//
// BEFORE (hidden dependencies, untestable):
//
//   app.post('/api/v1/chat', async (req, res) => {
//     const gemini = new GeminiService(); // hidden dependency
//     const result = await gemini.chat(req.body.message);
//     res.json(result);
//   });
//
// AFTER (explicit dependencies via container, fully testable):
//
//   import { match } from '../../shared/utils/Result';
//
//   export function createChatHandler(container: Container) {
//     return async (req: Request, res: Response, next: NextFunction) => {
//       const sanitized = sanitizeInput(req.body.message);
//       if (!sanitized.ok) {
//         return next(sanitized.error);
//       }
//
//       // Use container services — all injected, all mockable
//       const result = await generateGroundedResponse(
//         sanitized.value,
//         container.civicDataRepository,
//       );
//
//       match(result, {
//         ok: (response) => res.json(response),
//         err: (error) => next(error),
//       });
//     };
//   }
//
// In tests:
//   const mockContainer = {
//     civicDataRepository: new MockCivicDataRepository(),
//     ...
//   };
//   const handler = createChatHandler(mockContainer as Container);
//   // Test handler with mock request/response
