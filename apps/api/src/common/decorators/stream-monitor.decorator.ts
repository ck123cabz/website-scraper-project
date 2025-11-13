/**
 * Stream Monitoring Decorator
 * Task T107 [Phase 8 - Polish]
 *
 * Monitors streaming operations (CSV export) by tracking throughput and progress.
 * Cannot use simple method decorator due to streaming nature.
 *
 * Usage:
 * const monitor = new StreamMonitor('CSV Export', 2000);
 * return stream.pipe(monitor).pipe(output);
 *
 * Logs:
 * - Progress updates every N milliseconds
 * - Final throughput on completion
 * - Row count and rows/second metrics
 */

import { Logger } from '@nestjs/common';
import { Transform } from 'stream';

export class StreamMonitor extends Transform {
  private readonly logger = new Logger('StreamMonitor');
  private rowCount = 0;
  private startTime = Date.now();
  private lastLogTime = Date.now();

  /**
   * @param operationName - Name of operation for logging
   * @param logInterval - Interval in ms between progress logs (default: 1000)
   */
  constructor(
    private operationName: string,
    private logInterval: number = 1000,
  ) {
    super();
  }

  _transform(chunk: any, encoding: string, callback: Function) {
    this.rowCount++;

    // Log progress at intervals
    const now = Date.now();
    if (now - this.lastLogTime > this.logInterval) {
      const elapsed = now - this.startTime;
      const throughput = ((this.rowCount / elapsed) * 1000).toFixed(0);

      this.logger.debug(
        `${this.operationName}: ${this.rowCount} rows, ${throughput} rows/sec`,
      );

      this.lastLogTime = now;
    }

    callback(null, chunk);
  }

  _flush(callback: Function) {
    const duration = Date.now() - this.startTime;
    const throughput = ((this.rowCount / duration) * 1000).toFixed(0);

    this.logger.log(
      `${this.operationName} completed: ${this.rowCount} rows in ${duration}ms (${throughput} rows/sec)`,
    );

    callback();
  }
}
