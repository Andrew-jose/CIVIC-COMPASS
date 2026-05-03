import * as monitoring from '@google-cloud/monitoring';
import { Request, Response } from 'express';

// In-memory stats for quick /metrics readout (reset periodically or on fetch)
interface MemoryStats {
  latencies: { [endpoint: string]: number[] };
  cacheStats: { [endpoint: string]: { hits: number; misses: number } };
  firestoreReads: { [endpoint: string]: number };
  streams: { completed: number; abandoned: number };
}

const stats: MemoryStats = {
  latencies: {},
  cacheStats: {},
  firestoreReads: {},
  streams: { completed: 0, abandoned: 0 },
};

class PerformanceMonitor {
  private client: monitoring.MetricServiceClient;
  private projectId: string;

  constructor() {
    // Requires GOOGLE_APPLICATION_CREDENTIALS to be set in environment
    this.client = new monitoring.MetricServiceClient();
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT || 'your-project-id';
  }

  /**
   * Track Gemini API latency per prompt type
   */
  public recordLatency(promptType: string, latencyMs: number) {
    if (!stats.latencies[promptType]) stats.latencies[promptType] = [];
    stats.latencies[promptType].push(latencyMs);
    
    // Asynchronously push to Google Cloud Monitoring
    this.writeMetric('custom.googleapis.com/gemini/latency', latencyMs, { promptType });
  }

  /**
   * Track Cache hit rate per endpoint
   */
  public recordCacheHit(endpoint: string, isHit: boolean) {
    if (!stats.cacheStats[endpoint]) stats.cacheStats[endpoint] = { hits: 0, misses: 0 };
    if (isHit) stats.cacheStats[endpoint].hits++;
    else stats.cacheStats[endpoint].misses++;
  }

  /**
   * Track Firestore read count per request
   */
  public recordFirestoreReads(endpoint: string, count: number) {
    if (!stats.firestoreReads[endpoint]) stats.firestoreReads[endpoint] = 0;
    stats.firestoreReads[endpoint] += count;
  }

  /**
   * Track SSE stream completion vs abandonment
   */
  public recordStreamCompletion(completed: boolean) {
    if (completed) stats.streams.completed++;
    else stats.streams.abandoned++;
  }

  /**
   * Detect and log slow requests (> 5 seconds)
   */
  public recordSlowRequest(endpoint: string, durationMs: number) {
    if (durationMs > 5000) {
      console.warn(`[SLOW REQUEST] Endpoint: ${endpoint} took ${durationMs}ms`);
      this.writeMetric('custom.googleapis.com/api/slow_requests', 1, { endpoint });
    }
  }

  /**
   * Internal helper to push time series data to GCP
   */
  private async writeMetric(metricType: string, value: number, labels: Record<string, string>) {
    // Only attempt if we are in production and have a project ID
    if (process.env.NODE_ENV !== 'production' || this.projectId === 'your-project-id') return;

    try {
      const dataPoint = {
        interval: {
          endTime: { seconds: Date.now() / 1000 },
        },
        value: { doubleValue: value },
      };

      const timeSeriesData = {
        metric: { type: metricType, labels },
        resource: { type: 'global', labels: { project_id: this.projectId } },
        points: [dataPoint],
      };

      const request = {
        name: this.client.projectPath(this.projectId),
        timeSeries: [timeSeriesData],
      };

      await this.client.createTimeSeries(request);
    } catch (err) {
      console.error(`[PerformanceMonitor] Failed to write metric ${metricType}`, err);
    }
  }

  /**
   * Calculate p50, p95, p99 from raw array
   */
  private calculatePercentiles(latencies: number[]) {
    if (latencies.length === 0) return { p50: 0, p95: 0, p99: 0 };
    const sorted = [...latencies].sort((a, b) => a - b);
    
    const getP = (p: number) => {
      const idx = Math.floor(p * sorted.length);
      return sorted[idx];
    };

    return {
      p50: getP(0.50),
      p95: getP(0.95),
      p99: getP(0.99),
    };
  }

  /**
   * Endpoint handler for /api/v1/metrics
   */
  public handleMetricsEndpoint = (req: Request, res: Response) => {
    // Calculate final metrics from memory stats
    const report: any = {
      latencies: {},
      cacheHitRates: {},
      firestoreReads: stats.firestoreReads,
      streamHealth: {
        completed: stats.streams.completed,
        abandoned: stats.streams.abandoned,
        completionRate: (stats.streams.completed / (stats.streams.completed + stats.streams.abandoned) || 0).toFixed(2)
      }
    };

    for (const [type, times] of Object.entries(stats.latencies)) {
      report.latencies[type] = this.calculatePercentiles(times);
    }

    for (const [endpoint, data] of Object.entries(stats.cacheStats)) {
      const total = data.hits + data.misses;
      report.cacheHitRates[endpoint] = total > 0 ? (data.hits / total).toFixed(2) : 0;
    }

    res.json(report);
  };
}

export const performanceMonitor = new PerformanceMonitor();

// Expose single helper functions for ease of use across the app
export const recordLatency = (type: string, ms: number) => performanceMonitor.recordLatency(type, ms);
export const recordCacheHit = (endpoint: string, isHit: boolean) => performanceMonitor.recordCacheHit(endpoint, isHit);
export const recordFirestoreReads = (endpoint: string, count: number) => performanceMonitor.recordFirestoreReads(endpoint, count);
export const recordStreamCompletion = (completed: boolean) => performanceMonitor.recordStreamCompletion(completed);
export const recordSlowRequest = (endpoint: string, ms: number) => performanceMonitor.recordSlowRequest(endpoint, ms);
