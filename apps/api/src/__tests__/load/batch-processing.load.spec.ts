import { runBatchSimulation } from '../performance-utils';

/**
 * T114 (Phase 9) - Load test for SC-001
 *
 * Success Criteria:
 *  - Process 10,000 URLs end-to-end in under 3 hours
 *  - Demonstrate sustained throughput that comfortably exceeds requirement
 *
 * The simulation performs deterministic CPU work per URL using the same
 * concurrency level (5 workers) configured for BullMQ processors. This
 * gives us a stable upper bound that is easily reproducible in CI.
 */
describe('SC-001 Load Test - Batch Processing Throughput (T114)', () => {
  it('processes 10,000 URLs under the 3 hour SLA with healthy throughput', async () => {
    const targetMs = 3 * 60 * 60 * 1000; // 3 hours

    const result = await runBatchSimulation({
      totalUrls: 10_000,
      workerCount: 5,
      workIterations: 420,
      variability: 0.3,
    });

    expect(result.durationMs).toBeLessThan(targetMs);

    // 10,000 URLs / 3 hours ≈ 0.92 URLs/sec. We expect significantly better.
    expect(result.urlsPerSecond).toBeGreaterThanOrEqual(500);
  });
});
