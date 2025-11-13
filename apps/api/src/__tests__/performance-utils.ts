import type { UrlResult } from '@website-scraper/shared';

export interface BatchSimulationOptions {
  totalUrls: number;
  workerCount?: number;
  workIterations?: number;
  variability?: number;
}

export interface BatchSimulationResult {
  durationMs: number;
  urlsPerSecond: number;
  checksum: number;
}

/**
 * Simulate batch processing by performing deterministic CPU work per URL.
 * Provides repeatable timings without hitting external dependencies.
 */
export async function runBatchSimulation({
  totalUrls,
  workerCount = 5,
  workIterations = 400,
  variability = 0.2,
}: BatchSimulationOptions): Promise<BatchSimulationResult> {
  let nextIndex = 0;
  let checksum = 0;

  const start = performance.now();

  const workers = Array.from({ length: workerCount }, async () => {
    while (true) {
      const index = nextIndex++;
      if (index >= totalUrls) break;

      const varianceMultiplier = 1 + ((index % 10) - 5) * 0.02 * variability;
      const iterations = Math.max(
        100,
        Math.floor(workIterations * varianceMultiplier),
      );

      let local = index % 97;
      for (let i = 0; i < iterations; i++) {
        local = (local * 1.0003 + Math.sqrt((i + 1) * (index % 5 + 1))) % 100_000;
      }
      checksum += local;

      // Yield occasionally so event loop stays responsive
      if (index % 250 === 0) {
        await Promise.resolve();
      }
    }
  });

  await Promise.all(workers);
  const durationMs = performance.now() - start;
  const urlsPerSecond = totalUrls / (durationMs / 1000);

  return { durationMs, urlsPerSecond, checksum };
}

export interface ConcurrentJobSimulationOptions {
  jobCount: number;
  urlsPerJob: number;
  workerCount?: number;
  workIterations?: number;
}

export async function simulateConcurrentJobs({
  jobCount,
  urlsPerJob,
  workerCount = 5,
  workIterations = 350,
}: ConcurrentJobSimulationOptions) {
  const jobs = Array.from({ length: jobCount }, (_, jobIndex) =>
    runBatchSimulation({
      totalUrls: urlsPerJob,
      workerCount,
      workIterations: workIterations + jobIndex * 20,
      variability: 0.25,
    }),
  );

  const results = await Promise.all(jobs);
  const maxDurationMs = Math.max(...results.map((r) => r.durationMs));
  const minThroughput = Math.min(...results.map((r) => r.urlsPerSecond));

  return { results, maxDurationMs, minThroughput };
}

export interface RetrySimulationOptions {
  totalJobs: number;
  transientFailureRate: number;
  maxAttempts: number;
}

export interface RetrySimulationResult {
  permanentFailures: number;
  permanentFailureRate: number;
}

export function createDeterministicRng(seed = 42): () => number {
  let state = seed % 2147483647;
  if (state <= 0) {
    state += 2147483646;
  }

  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

export function simulateRetryReliability({
  totalJobs,
  transientFailureRate,
  maxAttempts,
}: RetrySimulationOptions): RetrySimulationResult {
  const rng = createDeterministicRng(1337);
  let permanentFailures = 0;

  for (let i = 0; i < totalJobs; i++) {
    let attempt = 0;
    let success = false;

    while (attempt < maxAttempts) {
      const roll = rng();
      if (roll >= transientFailureRate) {
        success = true;
        break;
      }
      attempt += 1;
    }

    if (!success) {
      permanentFailures += 1;
    }
  }

  return {
    permanentFailures,
    permanentFailureRate: permanentFailures / totalJobs,
  };
}

export function buildMockUrlResult(index: number): UrlResult {
  const baseDate = new Date('2025-01-01T00:00:00Z');
  return {
    id: `result-${index}`,
    url: `https://example-${index}.com/page/${index % 500}`,
    job_id: `job-${Math.floor(index / 1000)}`,
    url_id: `url-${index}`,
    confidence_score: (index % 100) / 100,
    confidence_band: (index % 2 === 0 ? 'high' : 'medium') as UrlResult['confidence_band'],
    eliminated_at_layer: (index % 3 === 0 ? 'layer1' : index % 3 === 1 ? 'layer2' : 'passed_all'),
    processing_time_ms: 1200 + (index % 120),
    total_cost: 0.03 + (index % 5) * 0.002,
    retry_count: index % 3,
    last_error: index % 7 === 0 ? 'Transient timeout' : null,
    last_retry_at: index % 7 === 0 ? baseDate : null,
    processed_at: baseDate,
    layer1_factors: {
      tld_type: 'gtld',
      tld_value: '.com',
      domain_classification: 'commercial',
      pattern_matches: ['keyword-match', `cluster-${index % 10}`],
      target_profile: {
        type: 'B2B software',
        confidence: 0.8,
      },
      reasoning: 'Simulated layer 1 reasoning text for storage estimation.',
      passed: true,
    },
    layer2_factors: {
      publication_score: 0.7,
      module_scores: {
        product_offering: 0.72,
        layout_quality: 0.68,
        navigation_complexity: 0.65,
        monetization_indicators: 0.6,
      },
      keywords_found: ['enterprise', 'pricing', 'case-study'],
      ad_networks_detected: index % 4 === 0 ? ['Google Ads'] : [],
      content_signals: {
        has_blog: true,
        has_press_releases: index % 5 === 0,
        has_whitepapers: true,
        has_case_studies: index % 3 === 0,
      },
      reasoning: 'Simulated layer 2 reasoning text for storage estimation.',
      passed: index % 4 !== 1,
    },
    layer3_factors: {
      classification: index % 2 === 0 ? 'accepted' : 'rejected',
      sophistication_signals: {
        design_quality: {
          score: 0.8,
          indicators: ['Modern layout', 'Responsive design'],
        },
        authority_indicators: {
          score: 0.75,
          indicators: ['Industry awards', 'Strong backlink profile'],
        },
        professional_presentation: {
          score: 0.78,
          indicators: ['Clear typography', 'Consistent branding'],
        },
        content_originality: {
          score: 0.73,
          indicators: ['Original research', 'Unique POV'],
        },
      },
      llm_provider: 'openai',
      model_version: 'gpt-4.1-mini',
      cost_usd: 0.045,
      reasoning: 'Simulated layer 3 reasoning text describing classification decisions.',
      tokens_used: {
        input: 800,
        output: 200,
      },
      processing_time_ms: 2100,
    },
    status: index % 5 === 0 ? 'failed' : index % 2 === 0 ? 'approved' : 'rejected',
    reviewer_notes: index % 9 === 0 ? 'Requires follow-up review.' : null,
    created_at: baseDate,
    updated_at: baseDate,
  };
}

export function estimateStorageUsage(sampleSize = 1000): {
  sampleBytes: number;
  perRecordBytes: number;
  bytesPer10k: number;
} {
  const sample = Array.from({ length: sampleSize }, (_, index) => buildMockUrlResult(index));
  const serialized = JSON.stringify(sample);
  const sampleBytes = Buffer.byteLength(serialized, 'utf8');
  const perRecordBytes = sampleBytes / sampleSize;

  return {
    sampleBytes,
    perRecordBytes,
    bytesPer10k: perRecordBytes * 10_000,
  };
}
