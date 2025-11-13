# Research: Batch Processing Workflow Refactor

**Date**: 2025-11-13
**Branch**: `001-batch-processing-refactor`

## Overview

This document consolidates research findings for transforming the system from in-app manual review to pure batch processing. Key areas researched: JSONB schema design for Layer 1/2/3 factors, CSV streaming for large exports, job concurrency management, and manual review system cleanup strategy.

---

## R1: JSONB Column Design for Layer Factor Data

### Decision

Add 3 JSONB columns to `url_results` table:
- `layer1_factors` - Domain analysis factors
- `layer2_factors` - Publication detection factors
- `layer3_factors` - LLM sophistication analysis factors

Use GIN indexes for filtering: `CREATE INDEX idx_url_results_layer1 ON url_results USING GIN (layer1_factors);`

### Rationale

**Why JSONB over normalized tables:**
- Layer factor structures are flexible and evolve with classification logic improvements
- Deep nesting (e.g., Layer 3 sophistication signals with sub-scores) would require 5+ normalized tables
- Query patterns prioritize filtering on top-level fields (decision, confidence, layer) not deep factor searches
- GIN indexes provide sufficient performance for anticipated filtering needs (10k-100k rows per job)

**Performance characteristics:**
- PostgreSQL JSONB stores data in binary format (faster than JSON text)
- GIN indexes support containment queries (`@>`, `?`, `?|`, `?&` operators)
- Can extract frequently-accessed fields to regular columns later if hot paths identified
- Storage overhead: ~2-5KB per URL with full factor data (acceptable for 100k URL jobs)

**Trade-offs:**
- Looser schema validation compared to normalized columns (mitigated by TypeScript types + class-validator)
- Cannot enforce foreign key constraints on nested data (not needed for factor data)
- More complex SQL queries for deep filtering (users will filter in Excel instead)

### Alternatives Considered

**Alternative 1: Normalized tables (layer1_factors, layer2_factors, layer3_factors)**
- Rejected: Requires complex joins for every results query
- Rejected: Schema rigidity makes factor structure evolution painful (requires migrations for every field change)
- Rejected: Overkill for data that's primarily write-once-read-many with limited filtering

**Alternative 2: Single JSONB column `analysis_factors`**
- Rejected: Single column mixes concerns (Layer 1 domain analysis vs Layer 3 LLM reasoning)
- Rejected: Harder to add layer-specific GIN indexes for filtering
- Rejected: Less clear TypeScript types (one big union type vs 3 clear interfaces)

### Implementation Notes

Each JSONB column will store a complete structured object:

```typescript
// layer1_factors structure
{
  tld_type: 'gtld' | 'cctld' | 'custom',
  domain_classification: 'commercial' | 'personal' | 'institutional',
  pattern_matches: string[],
  target_profile: { type: string, confidence: number },
  reasoning: string
}

// layer2_factors structure
{
  publication_score: number,
  module_scores: {
    product_offering: number,
    layout_quality: number,
    navigation_complexity: number,
    monetization_indicators: number
  },
  keywords_found: string[],
  ad_networks_detected: string[],
  reasoning: string
}

// layer3_factors structure
{
  classification: 'accepted' | 'rejected',
  sophistication_signals: {
    design_quality: { score: number, indicators: string[] },
    authority_indicators: { score: number, indicators: string[] },
    professional_presentation: { score: number, indicators: string[] },
    content_originality: { score: number, indicators: string[] }
  },
  llm_provider: string,
  cost_usd: number,
  reasoning: string
}
```

---

## R2: CSV Streaming for Large Exports

### Decision

Use Node.js streaming with `papaparse` (already in dependencies) for CSV generation:
- Stream data from database using Supabase pagination
- Transform rows to CSV format in-memory (small batches of 100 rows)
- Stream output directly to HTTP response with proper headers

Implementation pattern:
```typescript
async streamCSVExport(jobId: string, format: ExportFormat): Promise<Readable> {
  const stream = new Readable();
  const batchSize = 100;
  let offset = 0;

  // Stream CSV header
  stream.push(this.generateCSVHeader(format));

  // Fetch and stream rows in batches
  while (true) {
    const rows = await this.fetchResultsBatch(jobId, offset, batchSize);
    if (rows.length === 0) break;

    const csvChunk = this.rowsToCSV(rows, format);
    stream.push(csvChunk);

    offset += batchSize;
  }

  stream.push(null); // End stream
  return stream;
}
```

### Rationale

**Why streaming over in-memory generation:**
- Memory safety: 10,000-row job with 48 columns = ~50MB uncompressed CSV (unsafe to build entirely in memory)
- Perceived performance: Browser starts download immediately as data streams (feels faster than waiting for full file)
- Scalability: Supports future 100k+ URL jobs without code changes
- Simple implementation: papaparse handles CSV formatting, we just stream row batches

**Performance target**: <5 seconds for 10k rows
- Database query: ~1s (indexed queries, pagination)
- CSV formatting: ~2s (papaparse transformation)
- Network transfer: ~2s (streaming to browser)

### Alternatives Considered

**Alternative 1: Generate full CSV in memory, then send**
- Rejected: Memory exhaustion risk for 100k+ URL jobs
- Rejected: User waits longer for first byte (no progressive download)
- Rejected: Requires temporary file storage for very large exports

**Alternative 2: Background job + download link**
- Rejected: Adds complexity (job queue, file storage, cleanup)
- Rejected: Worse UX (user must wait, then download separately)
- Accepted for future: If exports regularly exceed 100k rows, revisit this pattern

### Implementation Notes

HTTP response headers for Excel compatibility:
```typescript
res.setHeader('Content-Type', 'text/csv; charset=utf-8');
res.setHeader('Content-Disposition', `attachment; filename="job-${jobId}-results.csv"`);
res.setHeader('Transfer-Encoding', 'chunked');
res.write('\uFEFF'); // UTF-8 BOM for Excel
```

CSV formatting requirements:
- UTF-8 with BOM (Excel recognizes encoding)
- CRLF line endings (`\r\n`)
- RFC 4180 quoting (escape commas, quotes, newlines in text fields)
- No scientific notation for cost fields (format as strings: `"0.00015"`)

---

## R3: Job Concurrency Management (Max 5 Active)

### Decision

Implement simple system-wide job limit using Redis-backed semaphore in BullMQ:
- Global concurrency set to 5 in BullMQ queue configuration
- Jobs beyond limit automatically queue (FIFO order)
- Frontend displays queue position and estimated wait time

Implementation:
```typescript
// Queue configuration
const jobQueue = new Queue('url-processing', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 }
  }
});

// Worker with concurrency limit
const worker = new Worker('url-processing', processJob, {
  connection: redisConnection,
  concurrency: 5, // System-wide max active jobs
  limiter: {
    max: 5,
    duration: 1000 // Process max 5 jobs per second
  }
});
```

### Rationale

**Why max 5 concurrent jobs:**
- Resource management: Each job spawns 5-10 concurrent URL processors (Layer 1/2/3 processing)
- API rate limits: External APIs (ScrapingBee, OpenAI) have rate limits (5 jobs * 10 URLs/job = 50 concurrent external requests)
- Database connections: Supabase connection pool limit (100 connections, reserve 50 for jobs, 50 for API requests)
- Memory: Each job maintains in-memory state (URL queue, processing results) - 5 jobs ~500MB RAM

**Why FIFO queue vs priority:**
- Fairness: All users equal priority (open access model, no user accounts)
- Simplicity: No priority logic, no gaming the system
- Predictability: Clear queue position display

### Alternatives Considered

**Alternative 1: Unlimited concurrency with dynamic scaling**
- Rejected: Requires auto-scaling infrastructure (beyond Railway free tier)
- Rejected: Risk of thundering herd (10 simultaneous job uploads crash system)
- Rejected: Complex resource management (dynamic connection pool sizing, memory monitoring)

**Alternative 2: Per-user job limit (max 2 jobs per user)**
- Rejected: No user authentication in open access model
- Rejected: Could be bypassed with IP rotation
- Future consideration: If multi-tenant deployment adds auth, implement per-user limits

### Implementation Notes

Queue position calculation:
```typescript
async getQueuePosition(jobId: string): Promise<number> {
  const allJobs = await jobQueue.getJobs(['waiting', 'delayed']);
  const position = allJobs.findIndex(job => job.id === jobId);
  return position + 1; // 1-indexed for user display
}
```

Estimated wait time (based on historical average):
```typescript
async getEstimatedWaitTime(jobId: string): Promise<number> {
  const position = await this.getQueuePosition(jobId);
  const avgJobDuration = await this.getAverageJobDuration(); // From job history
  return position * avgJobDuration; // Simple linear estimate
}
```

---

## R4: Manual Review System Cleanup Strategy

### Decision

**Phased removal approach:**

**Phase 1 (Immediate - before batch processing launch):**
- Remove UI routes: `/manual-review` returns 404
- Remove React components: `ManualReviewQueue`, `ReviewDialog`, `FactorBreakdown` (reusable parts extracted)
- Remove backend routing: `QueueService.processUrl()` always writes to `url_results`, never `manual_review_queue`
- Disable notifications: Comment out `NotificationService` calls (don't remove code yet)
- Disable cron jobs: Comment out `StaleQueueMarkerProcessor` cron trigger

**Phase 2 (After 2 weeks of stable batch processing):**
- Remove backend code: `ManualReviewModule`, `NotificationService`, `StaleQueueMarkerProcessor`
- Remove dependencies: `@slack/webhook`, `@nestjs/schedule` (if only used for manual review)
- Remove database tables: `DROP TABLE manual_review_queue; DROP TABLE manual_review_activity;`
- Remove database functions: `fn_route_to_manual_review()` and related triggers

### Rationale

**Why phased removal:**
- Risk mitigation: If batch processing has critical issues, can temporarily re-enable manual review as fallback
- Data preservation: Gives 2 weeks to migrate/export any pending manual review queue items
- User confidence: Demonstrates system stability before permanent removal

**Why not immediate removal:**
- Unknown unknowns: Batch processing may reveal edge cases not caught in testing
- Data loss risk: Some URLs might be stuck in manual review queue (need migration script)

### Alternatives Considered

**Alternative 1: Keep manual review system as optional feature**
- Rejected: Maintenance burden (two parallel systems)
- Rejected: Configuration complexity (flags to enable/disable)
- Rejected: User confusion (which workflow to use?)

**Alternative 2: Archive manual review code to separate branch**
- Rejected: Branch becomes stale quickly, won't work if restored
- Rejected: False sense of security (archived code rarely usable)
- Accepted: Git history sufficient for reference (can always revert commits)

### Implementation Notes

Migration script for pending manual review items:
```sql
-- Move pending manual review items to url_results with special flag
INSERT INTO url_results (
  url, job_id, final_decision, eliminated_at_layer,
  layer1_factors, layer2_factors, layer3_factors,
  processing_time_ms, total_cost, processed_at
)
SELECT
  url, job_id, 'pending_migration', 'passed_all',
  layer1_result, layer2_result, layer3_result,
  0, 0, NOW()
FROM manual_review_queue
WHERE reviewed_at IS NULL;

-- Log migration for audit
INSERT INTO manual_review_activity (queue_id, action_type, notes)
SELECT id, 'migrated_to_batch', 'Automated migration to batch processing workflow'
FROM manual_review_queue
WHERE reviewed_at IS NULL;
```

Deprecation timeline:
- **Week 0**: Deploy Phase 1 (disable UI, routing to manual review)
- **Week 1**: Monitor for issues, user feedback
- **Week 2**: If stable, deploy Phase 2 (remove code, drop tables)
- **Week 3**: Verify no errors, remove deprecation comments

---

## R5: BullMQ Retry Strategy (Exponential Backoff)

### Decision

Implement automatic retry with exponential backoff for transient failures:
- Retry transient errors only (timeouts, rate limits, 5xx errors)
- Max 3 retry attempts per URL
- Backoff: 1s → 2s → 4s delays between retries
- Track `retry_count` in `url_results` table

BullMQ configuration:
```typescript
await urlQueue.add('process-url', { url, jobId }, {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1000 // 1s base delay
  },
  removeOnComplete: true,
  removeOnFail: 100 // Keep last 100 failures for debugging
});
```

Error classification:
```typescript
function isTransientError(error: Error): boolean {
  return (
    error.message.includes('timeout') ||
    error.message.includes('rate limit') ||
    error.message.includes('ECONNRESET') ||
    (error instanceof HttpError && error.status >= 500)
  );
}
```

### Rationale

**Why automatic retry:**
- ScrapingBee API occasionally times out (30s timeout, heavy pages)
- OpenAI/Anthropic APIs have rate limits (10 req/s)
- Network blips cause intermittent failures (~1-2% of requests)

**Why exponential backoff:**
- Linear backoff ineffective for rate limits (retry immediately = hit limit again)
- Exponential gives API time to recover (1s → 2s → 4s)
- Total retry time acceptable: 1s + 2s + 4s = 7s max additional wait

**Why max 3 attempts:**
- Balance: Recover from transients without infinite retries
- User control: After 3 fails, URL marked as permanently failed, user can manually retry
- Cost control: Layer 3 LLM calls cost money, limit automated retries

### Alternatives Considered

**Alternative 1: No automatic retry, all retries manual**
- Rejected: Poor UX (user must monitor job, manually retry timeouts)
- Rejected: Wastes time (transient errors resolve within seconds)
- Rejected: Lower success rate (1-2% transient failures become permanent)

**Alternative 2: Unlimited retries with circuit breaker**
- Rejected: Complex (requires failure rate monitoring per API)
- Rejected: Cost risk (infinite LLM retries for misconfigured API keys)
- Rejected: Overkill for current scale (5 jobs * 100 URLs = low risk of cascading failures)

### Implementation Notes

Retry tracking in database:
```sql
ALTER TABLE url_results ADD COLUMN retry_count INTEGER DEFAULT 0;
ALTER TABLE url_results ADD COLUMN last_error TEXT;
```

Manual retry button logic:
```typescript
async retrySelectedUrls(jobId: string, urlIds: string[]) {
  // Fetch URLs with retry_count < 3
  const urls = await this.fetchUrls(urlIds).where('retry_count', '<', 3);

  // Re-queue for processing
  for (const url of urls) {
    await urlQueue.add('process-url', {
      url: url.url,
      jobId,
      retryCount: url.retry_count + 1
    });
  }

  // Update status to 'retrying'
  await this.updateUrlStatus(urlIds, 'retrying');
}
```

Error display in UI:
- Show retry count badge: "Failed (2/3 retries)"
- Display last error message: "Timeout after 30s waiting for ScrapingBee response"
- Disable "Retry Selected" for URLs at max retries (3/3)

---

## R6: Real-Time Progress Updates (React Query Polling)

### Decision

Use React Query polling for dashboard real-time updates:
- Poll job status every 5 seconds for active jobs
- Use `staleTime: 5000` and `refetchInterval: 5000`
- Disable polling when job reaches terminal state (completed/failed/archived)

Implementation:
```typescript
const { data: job } = useQuery({
  queryKey: ['job', jobId],
  queryFn: () => fetchJob(jobId),
  refetchInterval: (data) => {
    // Stop polling if job finished
    return data?.status === 'completed' || data?.status === 'failed'
      ? false
      : 5000;
  },
  staleTime: 5000,
});
```

Progress calculation:
```typescript
function calculateProgress(job: Job): ProgressData {
  const processed = job.layer1_eliminated + job.layer2_eliminated + job.layer3_classified;
  const percentage = (processed / job.total_urls) * 100;

  return {
    percentage: Math.round(percentage),
    processed,
    total: job.total_urls,
    layerCounts: {
      layer1: job.layer1_eliminated,
      layer2: job.layer2_eliminated,
      layer3: job.layer3_classified
    },
    costSoFar: job.total_cost,
    estimatedTimeRemaining: this.estimateTimeRemaining(job)
  };
}
```

### Rationale

**Why polling over WebSocket/Supabase Realtime:**
- Simplicity: React Query handles polling out-of-box (no additional infrastructure)
- Reliability: Polling works behind corporate firewalls (WebSockets often blocked)
- Resource efficiency: 5s polling = 12 requests/minute per active job (acceptable load)
- Battery friendly: 5s interval sufficient for progress visibility without draining mobile batteries

**Why 5-second interval:**
- Responsive enough: Users see progress update within 5s
- Server-friendly: 5 concurrent jobs * 12 req/min = 60 req/min (negligible load)
- Bandwidth-friendly: ~1KB JSON response * 60/min = 60KB/min (negligible)

**Why conditional polling (stop when complete):**
- Prevents wasted requests: No point polling completed jobs
- Reduces server load: Only active jobs generate traffic
- Battery friendly: Mobile devices stop polling when jobs finish

### Alternatives Considered

**Alternative 1: Supabase Realtime subscriptions**
- Rejected: Requires Realtime enabled (currently disabled)
- Rejected: More complex error handling (connection drops, reconnects)
- Rejected: Overkill for 5s update granularity (realtime = <1s updates)
- Future consideration: If Realtime already enabled for other features, migrate to subscriptions

**Alternative 2: Server-Sent Events (SSE)**
- Rejected: More complex server implementation (requires persistent connections)
- Rejected: Browser compatibility issues (IE11, some corporate proxies)
- Rejected: Connection management complexity (handle disconnects, reconnects)

### Implementation Notes

Optimistic updates for user actions:
```typescript
const retryMutation = useMutation({
  mutationFn: retrySelectedUrls,
  onMutate: async (variables) => {
    // Cancel ongoing queries
    await queryClient.cancelQueries(['job', variables.jobId]);

    // Optimistically update UI
    queryClient.setQueryData(['job', variables.jobId], (old) => ({
      ...old,
      status: 'processing',
      processed_urls: old.processed_urls - variables.urlIds.length
    }));
  },
  onError: (err, variables, context) => {
    // Rollback on error
    queryClient.setQueryData(['job', variables.jobId], context.previousData);
  },
  onSettled: () => {
    // Refetch to sync with server
    queryClient.invalidateQueries(['job']);
  }
});
```

Progress estimation algorithm:
```typescript
function estimateTimeRemaining(job: Job): number {
  const processed = job.layer1_eliminated + job.layer2_eliminated + job.layer3_classified;
  const remaining = job.total_urls - processed;

  const elapsed = Date.now() - job.started_at.getTime();
  const avgTimePerUrl = elapsed / processed; // ms per URL

  return Math.round(remaining * avgTimePerUrl / 1000); // seconds remaining
}
```

---

## Summary

All research areas resolved with clear technical decisions:
1. ✅ JSONB columns for Layer 1/2/3 factors (flexible, performant, evolvable schema)
2. ✅ Streaming CSV export (memory-safe, progressive download, Excel-compatible)
3. ✅ Max 5 concurrent jobs (FIFO queue, resource-bounded, simple)
4. ✅ Phased manual review removal (risk-mitigated, data-safe, gradual transition)
5. ✅ Exponential backoff retry (automatic transient recovery, cost-controlled, user override)
6. ✅ React Query polling (simple, reliable, battery-friendly real-time updates)

No NEEDS CLARIFICATION items remaining. Ready for Phase 1: Design & Contracts.
