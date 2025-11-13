import { simulateConcurrentJobs } from '../performance-utils';

/**
 * T118 (Phase 9) - Concurrency test for SC-009
 *
 * Verifies system can process 5 concurrent jobs without throughput degradation.
 * Each simulated job contains 2,000 URLs and uses the same 5-worker concurrency
 * as the production BullMQ queue.
 */
describe('SC-009 Concurrency Test - Five simultaneous jobs (T118)', () => {
  it('keeps per-job completion time well below the SLA when five jobs run in parallel', async () => {
    const { results, maxDurationMs, minThroughput } = await simulateConcurrentJobs({
      jobCount: 5,
      urlsPerJob: 2_000,
      workerCount: 5,
      workIterations: 360,
    });

    const targetMsPerJob = 60 * 60 * 1000; // 1 hour guard rail per job

    expect(maxDurationMs).toBeLessThan(targetMsPerJob);
    expect(minThroughput).toBeGreaterThanOrEqual(450);

    // Document the distribution for debugging if this ever regresses.
    expect(results).toHaveLength(5);
  });
});
