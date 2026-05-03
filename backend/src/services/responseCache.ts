import Redis from 'ioredis';
import { LRUCache } from 'lru-cache';
import crypto from 'crypto';
import zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

export type CacheType = 'ELECTION_DATE' | 'BALLOT_EXPLANATION' | 'FACT_CHECK' | 'JOURNEY' | 'CHECKLIST';

export interface CacheMetrics {
  hits: number;
  misses: number;
  totalTimeSavedMs: number;
}

/**
 * Manages caching for expensive AI generation calls.
 * 
 * Utilizes a Redis primary store with an in-memory LRU fallback.
 * Employs payload compression and automated TTL tiering depending on the
 * civic data type to maximize performance without serving stale guidelines.
 * 
 * @example
 * const cache = new ResponseCache();
 * await cache.setCached(q, state, lang, 'FACT_CHECK', 'True');
 */
export class ResponseCache {
  private redis: Redis | null = null;
  private memoryCache: LRUCache<string, Buffer>;
  private metrics: CacheMetrics = { hits: 0, misses: 0, totalTimeSavedMs: 0 };
  
  private readonly COMPRESSION_THRESHOLD = 1024; // 1KB

  constructor() {
    if (process.env.REDIS_URL) {
      try {
        this.redis = new Redis(process.env.REDIS_URL);
        this.redis.on('error', (err) => {
          console.warn('[Cache] Redis error, falling back to memory cache', err.message);
          this.redis = null;
        });
      } catch (err) {
        console.warn('[Cache] Could not connect to Redis, falling back to memory cache');
      }
    }

    // In-memory LRU fallback
    this.memoryCache = new LRUCache<string, Buffer>({
      max: 500, // Max 500 items in memory
      maxSize: 50 * 1024 * 1024, // 50MB
      sizeCalculation: (value) => value.length,
    });
  }

  private getTTLSeconds(type: CacheType): number {
    switch (type) {
      case 'ELECTION_DATE': return 24 * 60 * 60; // 24 hours
      case 'BALLOT_EXPLANATION': return 7 * 24 * 60 * 60; // 7 days
      case 'FACT_CHECK': return 48 * 60 * 60; // 48 hours
      case 'CHECKLIST': return 6 * 60 * 60; // 6 hours
      case 'JOURNEY': return 0; // NO CACHE
      default: return 0;
    }
  }

  private generateKey(question: string, jurisdiction: string, language: string): string {
    const normalized = question.trim().toLowerCase();
    const payload = `${normalized}|${jurisdiction.toLowerCase()}|${language.toLowerCase()}`;
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  public async getCached(
    question: string, 
    jurisdiction: string, 
    language: string, 
    type: CacheType
  ): Promise<string | null> {
    if (type === 'JOURNEY') return null;

    const key = `civic:${jurisdiction}:${this.generateKey(question, jurisdiction, language)}`;
    const startTime = Date.now();
    let rawBuffer: Buffer | null = null;

    try {
      if (this.redis) {
        const data = await this.redis.getBuffer(key);
        if (data) rawBuffer = data;
      } else {
        rawBuffer = this.memoryCache.get(key) || null;
      }

      if (rawBuffer) {
        this.metrics.hits++;
        // The latency of AI generation saved
        this.metrics.totalTimeSavedMs += (Date.now() - startTime) + 3000; // rough 3s saved per hit
        
        // Decompress if needed
        const unzipped = await gunzip(rawBuffer);
        return unzipped.toString('utf-8');
      }
    } catch (err) {
      console.error('[Cache] Read error', err);
    }

    this.metrics.misses++;
    return null;
  }

  public async setCached(
    question: string, 
    jurisdiction: string, 
    language: string, 
    type: CacheType, 
    value: string
  ): Promise<void> {
    const ttl = this.getTTLSeconds(type);
    if (ttl <= 0) return;

    const key = `civic:${jurisdiction}:${this.generateKey(question, jurisdiction, language)}`;

    try {
      let bufferToStore = Buffer.from(value, 'utf-8');
      
      // Compress if over threshold
      if (bufferToStore.length > this.COMPRESSION_THRESHOLD) {
        bufferToStore = await gzip(bufferToStore);
      } else {
        // We still gzip everything for consistency in retrieving
        bufferToStore = await gzip(bufferToStore);
      }

      if (this.redis) {
        await this.redis.setex(key, ttl, bufferToStore);
      } else {
        this.memoryCache.set(key, bufferToStore, { ttl: ttl * 1000 });
      }
    } catch (err) {
      console.error('[Cache] Write error', err);
    }
  }

  public async invalidateJurisdiction(jurisdiction: string): Promise<void> {
    const pattern = `civic:${jurisdiction}:*`;
    if (this.redis) {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } else {
      // For memory cache, we have to iterate
      for (const key of this.memoryCache.keys()) {
        if (key.startsWith(`civic:${jurisdiction}:`)) {
          this.memoryCache.delete(key);
        }
      }
    }
  }

  public getMetrics(): CacheMetrics & { hitRate: string } {
    const total = this.metrics.hits + this.metrics.misses;
    const hitRate = total === 0 ? '0%' : `${((this.metrics.hits / total) * 100).toFixed(2)}%`;
    return { ...this.metrics, hitRate };
  }
}

export const responseCache = new ResponseCache();
