/**
 * Performance Monitoring Decorator
 * Task T107 [Phase 8 - Polish]
 *
 * Monitors method execution time and logs performance metrics.
 * Supports warn/error thresholds for alerting on slow operations.
 *
 * Usage:
 * @PerfMonitor({ warn: 5000, error: 30000 })
 * async exportData() { ... }
 *
 * Performance Targets:
 * - CSV export: <5 seconds for 10k rows
 * - Database queries: <500ms
 * - Streaming throughput: >2,000 rows/second
 */

import { Logger } from '@nestjs/common';

export interface PerfMonitorOptions {
  warn?: number; // Warn threshold in milliseconds
  error?: number; // Error threshold in milliseconds
}

export function PerfMonitor(options?: PerfMonitorOptions) {
  const warnThreshold = options?.warn || 5000; // 5 seconds default
  const errorThreshold = options?.error || 30000; // 30 seconds default

  return function (
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<any>,
  ): TypedPropertyDescriptor<any> | void {
    const originalMethod = descriptor.value;
    const logger = new Logger(`PerfMonitor:${target.constructor.name}`);

    descriptor.value = async function (...args: any[]) {
      const start = performance.now();
      const methodName = propertyKey;

      try {
        // Handle both async and sync methods
        const result = await originalMethod.apply(this, args);
        const duration = performance.now() - start;

        // Log based on threshold
        if (duration > errorThreshold) {
          logger.error(
            `${methodName} exceeded error threshold: ${duration.toFixed(0)}ms > ${errorThreshold}ms`,
          );
        } else if (duration > warnThreshold) {
          logger.warn(
            `${methodName} exceeded warn threshold: ${duration.toFixed(0)}ms > ${warnThreshold}ms`,
          );
        } else {
          logger.log(`${methodName} completed in ${duration.toFixed(0)}ms`);
        }

        return result;
      } catch (error) {
        const duration = performance.now() - start;
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`${methodName} failed after ${duration.toFixed(0)}ms: ${errorMessage}`);
        throw error;
      }
    };

    return descriptor;
  };
}
