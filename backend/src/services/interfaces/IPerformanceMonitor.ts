export interface IPerformanceMonitor {
  /**
   * Starts a timer for a specific operation.
   * @param operationName - The name of the operation
   * @returns A function to stop the timer and record duration
   */
  startTimer(operationName: string): () => void;

  /**
   * Records a specific metric.
   */
  recordMetric(name: string, value: number): void;
}
