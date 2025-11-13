import { simulateRetryReliability } from '../performance-utils';

/**
 * T120 (Phase 9) - Reliability test for SC-011
 *
 * Validates that exponential backoff with three attempts keeps permanent
 * failures below the 1% threshold even when transient failures occur 20%
 * of the time.
 */
describe('SC-011 Retry Reliability Validation (T120)', () => {
  it('keeps permanent failure rate under 1% with three retry attempts', () => {
    const result = simulateRetryReliability({
      totalJobs: 10_000,
      transientFailureRate: 0.2,
      maxAttempts: 3,
    });

    expect(result.permanentFailureRate).toBeLessThan(0.01);
    expect(result.permanentFailures).toBeLessThan(100);
  });
});
