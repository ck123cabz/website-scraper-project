/**
 * Utility functions for seeding test data for manual review E2E tests
 * Creates test jobs with URLs in various confidence bands
 *
 * Note: This file provides helper utilities for test data seeding.
 * For actual usage, implement these functions with your data access layer.
 */

import {
  createMockQueueEntry,
  createHighConfidenceQueueEntry,
  createLowConfidenceQueueEntry,
  createStaleQueueEntry,
} from './test-utils';

/**
 * Configuration options for seeding test data
 */
export interface SeedOptions {
  highCount?: number;
  mediumCount?: number;
  lowCount?: number;
  staleCount?: number;
}

/**
 * Generate test URL data for the specified confidence band
 */
export function generateTestUrlData(
  band: 'high' | 'medium' | 'low',
  index: number,
  jobId: string,
): {
  url: string;
  status: string;
  band: 'high' | 'medium' | 'low';
  score: number;
} {
  const url = `https://example-${band}-${index}.com/test-page`;
  return {
    url,
    status: band === 'high' ? 'approved' : 'pending',
    band,
    score: band === 'high' ? 0.85 : band === 'medium' ? 0.65 + index * 0.01 : 0.4,
  };
}

/**
 * Generate stale queue entry test data
 */
export function generateStaleTestData(
  index: number,
  jobId: string,
  daysAgo = 8,
): {
  url: string;
  status: string;
  queuedAt: Date;
} {
  const url = `https://example-stale-${index}.com/test-page`;
  const queuedAt = new Date();
  queuedAt.setDate(queuedAt.getDate() - (daysAgo + index));

  return {
    url,
    status: 'pending',
    queuedAt,
  };
}

/**
 * Helper to generate test job configuration
 */
export function generateTestJobConfig(options?: SeedOptions) {
  const { highCount = 5, mediumCount = 10, lowCount = 5, staleCount = 2 } = options || {};

  return {
    name: `Test Job - ${new Date().toISOString()}`,
    status: 'completed',
    created_at: new Date(),
    counts: {
      high: highCount,
      medium: mediumCount,
      low: lowCount,
      stale: staleCount,
    },
  };
}

/**
 * Helper to generate queue statistics structure
 */
export function generateQueueStats(total: number, active: number, stale: number, reviewed: number) {
  return {
    total,
    active,
    stale,
    reviewed,
  };
}
