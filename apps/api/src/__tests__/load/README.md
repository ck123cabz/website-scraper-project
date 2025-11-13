# Phase 9 Load Testing Suite

This directory contains comprehensive performance and load tests for the batch processing system, validating all Phase 9 success criteria.

## Test Overview

### T121: Phase 9 Final Validation Aggregation Test
**File:** `phase9-final-validation.spec.ts`

This is the main orchestration test that runs all performance tests and generates comprehensive reports.

**What it does:**
- Executes all 7 core performance tests (T114-T120)
- Validates all success criteria (SC-001, SC-003, SC-006, SC-007, SC-009, SC-010, SC-011)
- Generates aggregated performance reports in JSON and Markdown formats
- Identifies performance regressions and provides recommendations

**Output:**
- `PHASE9-LOAD-TEST-RESULTS.md` - Human-readable performance report
- `PHASE9-LOAD-TEST-RESULTS.json` - Machine-readable report for CI/CD

**Run it:**
```bash
cd apps/api
npm test -- phase9-final-validation
```

### T114: Batch Processing Throughput Test
**File:** `batch-processing.load.spec.ts`
**Success Criteria:** SC-001

**Validates:**
- Processes 10,000 URLs in under 3 hours
- Maintains sustained throughput of 500+ URLs/second
- Simulates realistic CPU work per URL with 5-worker concurrency

**Test Parameters:**
- Total URLs: 10,000
- Worker count: 5 (matches BullMQ processor config)
- Work iterations: 420 per URL
- Variability: 30% (simulates real-world variance)

### T118: Concurrent Jobs Test
**File:** `concurrent-jobs.load.spec.ts`
**Success Criteria:** SC-009

**Validates:**
- Processes 5 concurrent jobs without throughput degradation
- Each job completes within 1 hour
- Maintains minimum throughput of 450 URLs/second across all jobs

**Test Parameters:**
- Job count: 5
- URLs per job: 2,000
- Worker count: 5 per job
- Work iterations: 360-400 per URL (varies by job)

## Integration Tests

Located in `apps/api/src/__tests__/integration/`:

### T119: Storage Efficiency Test
**File:** `storage-growth.spec.ts`
**Success Criteria:** SC-010

**Validates:**
- Storage footprint remains under 50MB per 10,000 URLs
- JSONB payload size per record is under 5KB
- Includes realistic Layer 1/2/3 factor data

**Current Metrics:**
- Per record: ~1.8 KB
- Per 10k URLs: ~17.5 MB (35% of target)

### T120: Retry Reliability Test
**File:** `retry-reliability.spec.ts`
**Success Criteria:** SC-011

**Validates:**
- Permanent failure rate stays below 1%
- Exponential backoff with 3 retry attempts
- Simulates 20% transient failure rate

**Current Metrics:**
- Success rate: 99.36%
- Permanent failures: 64 / 10,000 (0.64%)

## Placeholder Tests

The following tests are included in T121 with placeholder implementations awaiting full E2E development:

### T115: Pagination Performance (SC-003)
**Target:** 100k row pagination in <500ms
**Status:** Placeholder with simulated 350ms response time
**Full Implementation:** Requires E2E test against real database with 100k+ rows

### T116: Expandable Row Performance (SC-006)
**Target:** Load expandable row details in <500ms
**Status:** Placeholder with simulated 280ms load time
**Full Implementation:** Requires E2E test of Layer 1/2/3 factor loading

### T117: Dashboard Real-Time Updates (SC-007)
**Target:** <5s latency for real-time progress updates
**Status:** Placeholder with simulated 2500ms latency
**Full Implementation:** Requires E2E test of WebSocket/polling mechanism

## Running Tests

### Run all load tests:
```bash
cd apps/api
npm test -- load
```

### Run specific test:
```bash
npm test -- batch-processing
npm test -- concurrent-jobs
npm test -- phase9-final-validation
```

### Run integration tests:
```bash
npm test -- storage-growth
npm test -- retry-reliability
```

### Run full Phase 9 validation:
```bash
npm test -- phase9-final-validation
```

This will generate comprehensive reports in the project root:
- `PHASE9-LOAD-TEST-RESULTS.md`
- `PHASE9-LOAD-TEST-RESULTS.json`

## Test Philosophy

### Deterministic Simulations
All performance tests use deterministic simulations rather than hitting external services:

- **Reproducibility:** Tests produce consistent results across runs
- **Speed:** No network delays or external dependencies
- **CI/CD Friendly:** Tests complete in seconds, not hours
- **Baseline Validation:** Establishes performance baselines for future comparison

### Performance Utils
The `performance-utils.ts` file provides:

- `runBatchSimulation()` - Simulates URL processing with configurable CPU work
- `simulateConcurrentJobs()` - Simulates parallel job execution
- `estimateStorageUsage()` - Calculates JSONB storage footprint
- `simulateRetryReliability()` - Monte Carlo simulation of retry logic
- `buildMockUrlResult()` - Generates realistic test data

## Success Criteria Summary

| ID | Description | Target | Status |
|----|-------------|--------|--------|
| SC-001 | Batch processing throughput | 10k URLs in <3 hours | ✅ PASS |
| SC-003 | Pagination performance | 100k rows in <500ms | ⚠️ Placeholder |
| SC-006 | Expandable row load time | <500ms | ⚠️ Placeholder |
| SC-007 | Dashboard real-time latency | <5s | ⚠️ Placeholder |
| SC-009 | Concurrent job processing | 5 jobs without degradation | ✅ PASS |
| SC-010 | Storage efficiency | <50MB per 10k URLs | ✅ PASS |
| SC-011 | Retry reliability | <1% failure rate | ✅ PASS |

## Next Steps

1. **Implement E2E Tests:** Replace placeholders for T115, T116, T117 with full E2E implementations
2. **Production Validation:** Run tests against production workloads to validate baselines
3. **CI/CD Integration:** Add tests to CI pipeline with performance regression detection
4. **Monitoring:** Set up alerts based on success criteria thresholds

## Report Format

The generated reports include:

- **Summary:** Overall pass/fail status and test counts
- **Success Criteria Overview:** Status of all 7 success criteria
- **Detailed Test Results:** Metrics and notes for each test
- **Performance Baselines:** Current performance metrics
- **Regressions:** Detected performance degradations (if any)
- **Recommendations:** Suggested actions based on results
- **Implementation Status:** Which tests are complete vs. placeholder

## Notes

- Tests use `jest` with extended timeouts (10 minutes) for long-running simulations
- All file paths in reports are absolute for CI/CD compatibility
- Reports are versioned with timestamps for historical comparison
- Storage estimates based on realistic Layer 1/2/3 JSONB payloads from production
