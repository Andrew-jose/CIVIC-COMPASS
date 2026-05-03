import { Result } from '../../../shared/utils/Result';

export interface IResponseCache {
  /**
   * Retrieves a cached response.
   */
  get(key: string): Promise<Result<string | null>>;

  /**
   * Sets a cached response.
   */
  set(key: string, value: string, ttl?: number): Promise<Result<void>>;

  /**
   * Invalidates a cache key.
   */
  invalidate(key: string): Promise<Result<void>>;

  /**
   * Generates a cache key for a prompt.
   */
  generateKey(prompt: string, context: string): string;

  /**
   * Clears all cache.
   */
  clear(): Promise<Result<void>>;

  /**
   * Gets cache statistics.
   */
  getStats(): Promise<Result<{ hits: number; misses: number }>>;
}
