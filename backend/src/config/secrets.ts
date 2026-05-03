import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export class SecretsManager {
  private client: SecretManagerServiceClient;
  private cache: Map<string, { value: string; expiresAt: number }> = new Map();
  private TTL_MS = 60 * 60 * 1000; // 1 hour

  constructor() {
    this.client = new SecretManagerServiceClient();
    
    // Rotate cache on SIGHUP
    process.on('SIGHUP', () => {
      console.log('[SecretsManager] SIGHUP received. Clearing secrets cache.');
      this.cache.clear();
    });
  }

  /**
   * Fetch secret from GCP or cache
   */
  public async getSecret(secretName: string): Promise<string> {
    const cached = this.cache.get(secretName);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    try {
      const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT;
      if (!projectId) {
         // Fallback to process.env if explicitly permitted (local dev only)
         if (process.env.NODE_ENV !== 'production' && process.env[secretName]) {
            return this.validateAndCache(secretName, process.env[secretName] as string);
         }
         throw new ConfigurationError('Project ID is missing. Cannot fetch secrets.');
      }

      const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;
      const [version] = await this.client.accessSecretVersion({ name });
      
      const payload = version.payload?.data?.toString();
      if (!payload) {
        throw new ConfigurationError(`Secret ${secretName} is empty.`);
      }

      return this.validateAndCache(secretName, payload);
      
    } catch (error) {
      if (error instanceof ConfigurationError) throw error;
      throw new ConfigurationError(`Failed to fetch secret ${secretName}: ${(error as Error).message}`);
    }
  }

  /**
   * Validate format and store in cache
   */
  private validateAndCache(secretName: string, value: string): string {
    // Format Validation
    if (secretName === 'GEMINI_API_KEY') {
      if (!/^AIza[0-9A-Za-z-_]{35}$/.test(value)) {
        throw new ConfigurationError(`${secretName} has an invalid format.`);
      }
    } else if (secretName === 'FIREBASE_SERVICE_ACCOUNT') {
      try {
        const parsed = JSON.parse(value);
        if (!parsed.project_id || !parsed.private_key || !parsed.client_email) {
          throw new ConfigurationError(`${secretName} is missing required fields.`);
        }
      } catch (e) {
        throw new ConfigurationError(`${secretName} is not valid JSON.`);
      }
    }

    // Cache the secret
    this.cache.set(secretName, {
      value,
      expiresAt: Date.now() + this.TTL_MS
    });

    console.log(`[SecretsManager] Secret ${secretName} loaded successfully.`);
    return value;
  }
}

export const secretsManager = new SecretsManager();
