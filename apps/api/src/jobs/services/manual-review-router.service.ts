import { Injectable, Logger } from '@nestjs/common';
import type { ConfidenceBand } from '@website-scraper/shared';

/**
 * Manual review router service for Layer 3 classification results
 * Story 2.4-refactored: Routes medium/low confidence results to manual review queue
 *
 * Routing Logic:
 * - high confidence (0.8-1.0): Auto-approve, no manual review
 * - medium confidence (0.5-0.79): Route to manual review queue
 * - low confidence (0.3-0.49): Route to manual review queue
 * - auto_reject (0-0.29): Auto-reject, no manual review
 */
@Injectable()
export class ManualReviewRouterService {
  private readonly logger = new Logger(ManualReviewRouterService.name);

  // Track queue size in memory (could be moved to Redis/database for persistence)
  private manualReviewQueueSize = 0;

  /**
   * Determine if a result should be routed to manual review queue
   * Based on confidence band
   *
   * @param confidenceBand - Calculated confidence band
   * @param confidence - Original confidence score (for logging)
   * @param url - URL being classified (for logging)
   * @returns True if result requires manual review
   */
  shouldRouteToManualReview(
    confidenceBand: ConfidenceBand,
    confidence: number,
    url: string,
  ): boolean {
    const requiresReview = confidenceBand === 'medium' || confidenceBand === 'low';

    if (requiresReview) {
      this.manualReviewQueueSize++;
      this.logger.log(
        `${confidenceBand.toUpperCase()} confidence (${confidence.toFixed(2)}) - Routed to manual review. ` +
        `URL: ${url}. Queue size: ${this.manualReviewQueueSize}`,
      );
    } else {
      this.logger.debug(
        `${confidenceBand.toUpperCase()} confidence (${confidence.toFixed(2)}) - No manual review required. URL: ${url}`,
      );
    }

    return requiresReview;
  }

  /**
   * Mark a result as requiring manual review
   * This method prepares the data structure for database persistence
   *
   * @param url - URL requiring review
   * @param confidence - Confidence score
   * @param confidenceBand - Confidence band
   * @param reasoning - Classification reasoning
   * @param sophisticationSignals - Detected signals (optional)
   * @returns Manual review queue entry data
   */
  createManualReviewEntry(
    url: string,
    confidence: number,
    confidenceBand: ConfidenceBand,
    reasoning: string,
    sophisticationSignals?: string[],
  ): {
    url: string;
    confidence: number;
    confidence_band: ConfidenceBand;
    reasoning: string;
    sophistication_signals?: string[];
    manual_review_required: boolean;
    queued_at: string;
  } {
    const entry = {
      url,
      confidence,
      confidence_band: confidenceBand,
      reasoning,
      sophistication_signals: sophisticationSignals,
      manual_review_required: true,
      queued_at: new Date().toISOString(),
    };

    this.logger.debug(
      `Manual review entry created for ${url}. ` +
      `Band: ${confidenceBand}, Confidence: ${confidence.toFixed(2)}`,
    );

    return entry;
  }

  /**
   * Get current manual review queue size
   * @returns Number of items in manual review queue
   */
  getQueueSize(): number {
    return this.manualReviewQueueSize;
  }

  /**
   * Reset queue size counter
   * Useful for testing or after queue processing
   */
  resetQueueSize(): void {
    this.logger.debug(`Resetting manual review queue size from ${this.manualReviewQueueSize} to 0`);
    this.manualReviewQueueSize = 0;
  }

  /**
   * Get routing decision summary for logging
   * @param confidenceBand - Confidence band
   * @param confidence - Confidence score
   * @returns Summary string
   */
  getRoutingDecisionSummary(confidenceBand: ConfidenceBand, confidence: number): string {
    const action = this.shouldRouteToManualReview(confidenceBand, confidence, 'test-url')
      ? 'MANUAL REVIEW'
      : confidenceBand === 'high'
        ? 'AUTO-APPROVE'
        : 'AUTO-REJECT';

    // Decrement queue size since we called shouldRouteToManualReview just for testing
    if (action === 'MANUAL REVIEW') {
      this.manualReviewQueueSize--;
    }

    return `[${confidenceBand.toUpperCase()}] Confidence: ${confidence.toFixed(2)} → ${action}`;
  }

  /**
   * Calculate manual review routing percentage
   * Used for metrics and reporting (Story 2.4-refactored AC10)
   *
   * @param totalClassified - Total URLs classified
   * @returns Percentage of URLs routed to manual review
   */
  calculateManualReviewPercentage(totalClassified: number): number {
    if (totalClassified === 0) {
      return 0;
    }

    const percentage = (this.manualReviewQueueSize / totalClassified) * 100;
    return Math.round(percentage * 10) / 10; // Round to 1 decimal place
  }

  /**
   * Log manual review routing metrics
   * @param totalClassified - Total URLs classified in current batch/job
   */
  logRoutingMetrics(totalClassified: number): void {
    const percentage = this.calculateManualReviewPercentage(totalClassified);

    this.logger.log(
      `Manual Review Routing Metrics: ` +
      `${this.manualReviewQueueSize}/${totalClassified} URLs (${percentage}%) routed to manual review. ` +
      `Target: ~35% of Layer 2 survivors.`,
    );
  }
}
