# Story 2.5: 3-Tier Pipeline Orchestration & Real-Time Updates (REFACTORED)

Status: Ready for Integration Testing

## Story

As a system,
I want to orchestrate the 3-tier progressive filtering pipeline (Layer 1 → Layer 2 → Layer 3) with real-time updates,
so that URLs are efficiently filtered at each layer with transparency and cost optimization.

## Acceptance Criteria

### AC1: Layer 1 Integration (Domain Analysis - NO HTTP)
- [ ] Layer1DomainAnalysisService integrated into worker pipeline
- [ ] Domain patterns checked BEFORE any HTTP requests
- [ ] Elimination reasoning persisted: `elimination_layer = 'layer1'`, `layer1_reasoning`
- [ ] Layer 1 counter updated: `layer1_eliminated_count++` on jobs table
- [ ] Real-time update: `current_layer = 1` during Layer 1 processing
- [ ] Target elimination rate: 40-60% of total URLs eliminated at Layer 1

### AC2: Layer 2 Integration (Homepage Scraping + Operational Validation)
- [ ] Layer 2 service called ONLY if Layer 1 PASS
- [ ] Homepage-only scraping (not full site) for operational checks
- [ ] Company page detection, blog freshness analysis, tech stack validation
- [ ] Layer 2 signals stored in `layer2_signals` JSONB field
- [ ] Elimination reasoning persisted: `elimination_layer = 'layer2'`
- [ ] Layer 2 counter updated: `layer2_eliminated_count++` on jobs table
- [ ] Real-time update: `current_layer = 2` during Layer 2 processing
- [ ] Target elimination rate: 30% of Layer 1 survivors eliminated at Layer 2

### AC3: Layer 3 Integration (LLM Classification with Confidence Scoring)
- [ ] Layer 3 service called ONLY if Layer 2 PASS
- [ ] Full site scraping (not just homepage) for comprehensive content analysis
- [ ] LLM classification with Gemini primary, GPT fallback
- [ ] Confidence scoring and band calculation (high/medium/low/auto_reject)
- [ ] Manual review routing for medium/low confidence results
- [ ] All Layer 3 fields stored: `confidence_band`, `manual_review_required`, `classification_score`, `classification_reasoning`, `llm_provider`, `llm_cost`
- [ ] Real-time update: `current_layer = 3` during Layer 3 processing
- [ ] Target: 10-15 URLs/minute Layer 3 processing rate

### AC4: Pipeline Orchestration Flow
- [ ] Sequential layer processing: Layer 1 → (if PASS) → Layer 2 → (if PASS) → Layer 3
- [ ] STOP processing immediately on elimination (don't proceed to next layer)
- [ ] Update `current_layer` field for real-time dashboard tracking
- [ ] Track per-layer timing: `layer1_processing_time_ms`, `layer2_processing_time_ms`, `layer3_processing_time_ms`
- [ ] Aggregate job-level metrics: total eliminations per layer, pass rates, cost savings

### AC5: Real-Time Database Updates (Supabase Realtime)
- [ ] Database updates trigger Supabase Realtime events
- [ ] Job status updates: "pending" → "processing" → "completed"
- [ ] Current layer tracking: Update `current_layer` (1/2/3) for in-progress URLs
- [ ] Result inserts: Real-time visibility of processed URLs
- [ ] Activity logging: All layer decisions logged with timestamps
- [ ] Dashboard receives updates <500ms after database writes

### AC6: Cost Tracking Per Layer
- [ ] Layer 1 cost: $0 (no API calls, rule-based only)
- [ ] Layer 2 cost: ScrapingBee homepage requests (~$0.0001/URL)
- [ ] Layer 3 cost: ScrapingBee full site + LLM (~$0.002-0.004/URL)
- [ ] Calculate estimated savings: `(layer1_eliminated × layer2_cost) + ((layer1_eliminated + layer2_eliminated) × layer3_cost)`
- [ ] Store savings in `estimated_savings` field on jobs table
- [ ] Real-time cost tracking visible in dashboard

### AC7: Worker Concurrency and Rate Limiting
- [ ] BullMQ worker concurrency: 5 concurrent URLs (respects ScrapingBee rate limits)
- [ ] Layer 1: Process at 100+ URLs/min (no HTTP, instant domain checks)
- [ ] Layer 2: Process at 20-30 URLs/min (homepage scraping only)
- [ ] Layer 3: Process at 10-15 URLs/min (full site + LLM)
- [ ] Overall throughput: 20+ URLs/min through complete pipeline

### AC8: Error Handling Per Layer
- [ ] Layer 1 errors: Log warning, proceed (fail-open strategy)
- [ ] Layer 2 scraping errors: Retry 3 times, mark failed if all retries exhausted
- [ ] Layer 3 LLM errors: Retry 3 times with exponential backoff, fallback to GPT
- [ ] Isolated error handling: Failed URLs don't crash entire job
- [ ] ScrapingBee 429 handling: Pause 30s, retry

### AC9: Job Controls (Pause/Resume/Cancel)
- [ ] Pause job: Worker checks status before processing next URL
- [ ] Resume job: Worker continues from last processed URL
- [ ] Cancel job: Preserve all processed results, stop processing
- [ ] Graceful shutdown: Finish current layer for active URL before stopping

### AC10: Metrics and Reporting
- [ ] Job-level aggregates: `layer1_eliminated_count`, `layer2_eliminated_count`, manual review queue size
- [ ] Per-layer pass rates: `layer1_pass_rate`, `layer2_pass_rate`, `layer3_pass_rate`
- [ ] Cost breakdown: `scraping_cost`, `llm_cost`, `estimated_savings`
- [ ] Processing efficiency: Average time per layer, throughput metrics
- [ ] Real-time progress tracking: Current URL, current layer, progress percentage

## Tasks / Subtasks

- [ ] Task 1: Refactor Worker Pipeline for 3-Tier Architecture (AC: 1, 2, 3, 4)
  - [ ] 1.1: Review existing url-worker.processor.ts from Story 2.5
  - [ ] 1.2: Inject Layer1DomainAnalysisService (Story 2.3-refactored)
  - [ ] 1.3: Inject Layer2OperationalFilterService (Story 2.6 - pending)
  - [ ] 1.4: Inject ClassificationService, ConfidenceScoringService, ManualReviewRouterService (Story 2.4-refactored)
  - [ ] 1.5: Inject ScraperService (existing from Story 2.5)
  - [ ] 1.6: Implement Layer 1 → Layer 2 → Layer 3 sequential flow
  - [ ] 1.7: Add STOP logic on elimination (don't proceed to next layer)
  - [ ] 1.8: Update `current_layer` field at each layer transition

- [ ] Task 2: Layer 1 Integration (AC: 1)
  - [ ] 2.1: Call `layer1Service.analyzeUrl(url)` FIRST (before any HTTP)
  - [ ] 2.2: If Layer 1 REJECT: Persist elimination (`elimination_layer = 'layer1'`, `layer1_reasoning`)
  - [ ] 2.3: Update job counter: `layer1_eliminated_count++`
  - [ ] 2.4: Update `current_layer = 1` for real-time tracking
  - [ ] 2.5: Insert activity log: "Layer 1 REJECT - {reasoning}"
  - [ ] 2.6: STOP processing (return from worker, don't proceed to Layer 2)

- [ ] Task 3: Layer 2 Integration (AC: 2)
  - [ ] 3.1: Call `layer2Service.validateOperational(url)` ONLY if Layer 1 PASS
  - [ ] 3.2: Homepage-only scraping (ScraperService with `fullSite: false` flag)
  - [ ] 3.3: If Layer 2 REJECT: Persist elimination (`elimination_layer = 'layer2'`, layer2 signals in JSONB)
  - [ ] 3.4: Update job counter: `layer2_eliminated_count++`
  - [ ] 3.5: Update `current_layer = 2` for real-time tracking
  - [ ] 3.6: Insert activity log: "Layer 2 REJECT - {reasoning}"
  - [ ] 3.7: STOP processing (return from worker, don't proceed to Layer 3)

- [ ] Task 4: Layer 3 Integration (AC: 3)
  - [ ] 4.1: Call Layer 3 services ONLY if Layer 2 PASS
  - [ ] 4.2: Full site scraping (ScraperService with `fullSite: true` flag)
  - [ ] 4.3: Extract comprehensive content (title, meta, body, structured data)
  - [ ] 4.4: Call `classificationService.classifyUrl(url, content)`
  - [ ] 4.5: Call `confidenceScoringService.calculateBand(confidence)`
  - [ ] 4.6: Call `manualReviewRouter.shouldRoute(confidenceBand)`
  - [ ] 4.7: Store all Layer 3 fields in results table
  - [ ] 4.8: Update `current_layer = 3` for real-time tracking
  - [ ] 4.9: Insert activity log: "Layer 3 CLASSIFIED - {classification} (confidence: {score})"

- [ ] Task 5: Current Layer Tracking (AC: 4, 5)
  - [ ] 5.1: Add `current_layer` field to jobs table (migration if needed)
  - [ ] 5.2: Update `current_layer` at start of each layer (1/2/3)
  - [ ] 5.3: Real-time dashboard displays current layer for in-progress URLs
  - [ ] 5.4: Track per-layer timing: Start timer at layer entry, log duration on exit
  - [ ] 5.5: Store timing fields: `layer1_processing_time_ms`, `layer2_processing_time_ms`, `layer3_processing_time_ms`

- [ ] Task 6: Cost Tracking and Savings Calculation (AC: 6)
  - [ ] 6.1: Calculate Layer 2 cost: `layer2_eliminated_count × 0` (Layer 1 saved these scrapes)
  - [ ] 6.2: Calculate Layer 3 cost: `(layer1_eliminated_count + layer2_eliminated_count) × layer3_avg_cost`
  - [ ] 6.3: Aggregate total savings: Layer 2 savings + Layer 3 savings
  - [ ] 6.4: Store in `estimated_savings` field on jobs table
  - [ ] 6.5: Update savings in real-time as URLs are eliminated
  - [ ] 6.6: Display savings breakdown in dashboard

- [ ] Task 7: Worker Concurrency Optimization (AC: 7)
  - [ ] 7.1: Layer 1 processes at max speed (no HTTP, no rate limits)
  - [ ] 7.2: Layer 2/3 respect ScrapingBee rate limits (10 req/sec, 5 concurrent workers)
  - [ ] 7.3: Configure worker to handle mixed throughput (fast Layer 1, slower Layer 2/3)
  - [ ] 7.4: Monitor queue depth per layer (if Layer 1 creates backlog for Layer 2)
  - [ ] 7.5: Target overall throughput: 20+ URLs/min

- [ ] Task 8: Error Handling Per Layer (AC: 8)
  - [ ] 8.1: Layer 1 errors: Log warning, continue to Layer 2 (fail-open)
  - [ ] 8.2: Layer 2 scraping errors: Retry logic with exponential backoff
  - [ ] 8.3: Layer 3 LLM errors: Retry 3 times, Gemini → GPT fallback
  - [ ] 8.4: ScrapingBee 429 handling: Detect rate limit, pause 30s
  - [ ] 8.5: Failed URL isolation: Mark as failed, continue with next URL
  - [ ] 8.6: All errors logged with layer context, severity, retry count

- [ ] Task 9: Job Controls Integration (AC: 9)
  - [ ] 9.1: Pause job: Check status before starting any layer
  - [ ] 9.2: Resume job: Continue from last completed URL
  - [ ] 9.3: Cancel job: Preserve all results, stop immediately
  - [ ] 9.4: Graceful shutdown: Finish current layer processing before exit
  - [ ] 9.5: Test pause/resume across layer boundaries

- [ ] Task 10: Metrics Aggregation (AC: 10)
  - [ ] 10.1: Aggregate job-level counters: `layer1_eliminated_count`, `layer2_eliminated_count`
  - [ ] 10.2: Calculate pass rates: `layer1_pass_rate = 1 - (layer1_eliminated / total_urls)`
  - [ ] 10.3: Cost breakdown: `scraping_cost`, `llm_cost`, `estimated_savings`
  - [ ] 10.4: Real-time metrics update on each URL completion
  - [ ] 10.5: Display metrics in dashboard with layer-specific breakdowns

- [ ] Task 11: Database Schema Updates (AC: 1, 2, 3, 4, 5, 6)
  - [ ] 11.1: Verify all layer fields exist in results table (from Stories 2.3/2.4/2.6)
  - [ ] 11.2: Verify `current_layer` field exists on jobs table
  - [ ] 11.3: Verify layer timing fields exist (layer1/2/3_processing_time_ms)
  - [ ] 11.4: Verify cost tracking fields exist (`scraping_cost`, `estimated_savings`)
  - [ ] 11.5: Create migration if any fields missing
  - [ ] 11.6: Apply migration via Supabase MCP, verify with SELECT query

- [ ] Task 12: Unit Testing (AC: ALL)
  - [ ] 12.1: Test Layer 1 REJECT flow (elimination persisted, Layer 2/3 not called)
  - [ ] 12.2: Test Layer 1 PASS → Layer 2 REJECT flow
  - [ ] 12.3: Test Layer 2 PASS → Layer 3 flow (full pipeline)
  - [ ] 12.4: Test current_layer tracking updates
  - [ ] 12.5: Test cost savings calculation
  - [ ] 12.6: Test error handling per layer (fail-open Layer 1, retry Layer 2/3)
  - [ ] 12.7: Test pause/resume across layer boundaries
  - [ ] 12.8: Achieve >85% coverage for refactored worker

- [ ] Task 13: Integration Testing (AC: ALL)
  - [ ] 13.1: End-to-end test: 100 URLs → Layer 1 eliminates 50 → Layer 2 eliminates 15 → Layer 3 classifies 35
  - [ ] 13.2: Verify layer counters correct: `layer1_eliminated_count = 50`, `layer2_eliminated_count = 15`
  - [ ] 13.3: Verify cost savings calculated correctly
  - [ ] 13.4: Verify real-time updates: current_layer changes visible in dashboard
  - [ ] 13.5: Verify throughput: 20+ URLs/min overall, 100+ URLs/min Layer 1
  - [ ] 13.6: Verify manual review queue populated with Layer 3 medium/low confidence results

## Dev Notes

### Refactoring Overview

This story refactors Story 2.5 (Worker Processing & Real-Time Updates) to orchestrate the **3-tier progressive filtering architecture** introduced in the sprint change proposal (2025-10-16). The original Story 2.5 focused on ScrapingBee integration and BullMQ worker setup. The refactored version coordinates all three filtering layers with real-time transparency and cost optimization.

**Key Changes from Original Story 2.5:**
1. **Architecture Shift**: Single-layer processing → 3-tier progressive filtering (Layer 1 → Layer 2 → Layer 3)
2. **Layer Integration**: Integrate Layer1DomainAnalysisService (2.3-refactored), Layer2OperationalFilter (2.6), ClassificationService (2.4-refactored)
3. **Elimination Strategy**: STOP processing immediately on elimination (don't proceed to next layer)
4. **Current Layer Tracking**: Real-time `current_layer` field for dashboard visibility
5. **Cost Savings**: Track estimated savings from Layer 1 and Layer 2 eliminations
6. **Per-Layer Metrics**: Separate counters, pass rates, processing times per layer

### 3-Tier Pipeline Architecture

**Layer Processing Flow:**

```
┌─────────────────────────────────────────────────────────────────┐
│                        LAYER 1: Domain Analysis                 │
│                         (NO HTTP REQUESTS)                       │
├─────────────────────────────────────────────────────────────────┤
│ • Pattern matching: blog platforms, social media, forums        │
│ • Domain reputation checks                                      │
│ • URL structure analysis                                        │
│ • Target: Eliminate 40-60% of total URLs                       │
│ • Cost: $0 (rule-based, instant)                                │
│ • Throughput: 100+ URLs/min                                     │
└────────────────┬────────────────────────────────────────────────┘
                 │ PASS (40-60% of URLs)
                 ↓
┌─────────────────────────────────────────────────────────────────┐
│           LAYER 2: Homepage Scraping + Operational Validation    │
│                    (HOMEPAGE ONLY, NOT FULL SITE)                │
├─────────────────────────────────────────────────────────────────┤
│ • Company page detection (About Us, Contact, Team)              │
│ • Blog freshness analysis (recent posts in last 90 days)        │
│ • Tech stack validation (CMS, frameworks, hosting)              │
│ • Store signals in layer2_signals JSONB                         │
│ • Target: Eliminate 30% of Layer 1 survivors                    │
│ • Cost: ~$0.0001/URL (ScrapingBee homepage request)             │
│ • Throughput: 20-30 URLs/min                                    │
└────────────────┬────────────────────────────────────────────────┘
                 │ PASS (70% of Layer 1 survivors)
                 ↓
┌─────────────────────────────────────────────────────────────────┐
│       LAYER 3: Full Site Scraping + LLM Classification          │
│              (FULL SITE, NOT JUST HOMEPAGE)                      │
├─────────────────────────────────────────────────────────────────┤
│ • Full site content extraction (title, meta, body, structured)  │
│ • LLM classification: Gemini primary, GPT fallback              │
│ • Confidence scoring: high/medium/low/auto_reject               │
│ • Manual review routing for medium/low confidence               │
│ • Store all Layer 3 fields (confidence_band, etc.)              │
│ • Target: Classify remaining ~28% of original URLs              │
│ • Cost: ~$0.002-0.004/URL (ScrapingBee + LLM)                   │
│ • Throughput: 10-15 URLs/min                                    │
└─────────────────────────────────────────────────────────────────┘
```

**Cost Optimization Example (10,000 URLs):**

- **Without filtering (V1 approach):**
  - 10,000 URLs × $0.004 = **$40 total cost**
  - Full scraping + LLM for every URL

- **With 3-tier filtering (V2 approach):**
  - Layer 1 eliminates 5,000 URLs × $0 = **$0**
  - Layer 2 scrapes 5,000 URLs × $0.0001 = **$0.50**
  - Layer 2 eliminates 1,500 URLs (30% of 5,000)
  - Layer 3 classifies 3,500 URLs × $0.003 = **$10.50**
  - **Total cost: $11.00** (72.5% savings)
  - **Estimated savings: $29.00**

### Worker Pipeline Implementation

**url-worker.processor.ts orchestration logic:**

```typescript
async processUrl(job: Job<UrlJobData>): Promise<void> {
  const { jobId, url, urlId } = job.data;

  try {
    // ─────────────────────────────────────────────────────────
    // LAYER 1: Domain Analysis (NO HTTP)
    // ─────────────────────────────────────────────────────────
    await this.updateJob(jobId, { current_layer: 1, current_url: url });

    const layer1Start = Date.now();
    const layer1Result = await this.layer1Service.analyzeUrl(url);
    const layer1Time = Date.now() - layer1Start;

    if (!layer1Result.passed) {
      await this.persistElimination(jobId, urlId, {
        elimination_layer: 'layer1',
        layer1_reasoning: layer1Result.reasoning,
        layer1_processing_time_ms: layer1Time
      });
      await this.incrementCounter(jobId, 'layer1_eliminated_count');
      await this.logActivity(jobId, 'info', `Layer 1 REJECT - ${layer1Result.reasoning}`);
      return; // STOP - eliminated at Layer 1
    }

    await this.logActivity(jobId, 'info', `Layer 1 PASS - ${layer1Result.reasoning}`);

    // ─────────────────────────────────────────────────────────
    // LAYER 2: Homepage Scraping + Operational Validation
    // ─────────────────────────────────────────────────────────
    await this.updateJob(jobId, { current_layer: 2 });

    const layer2Start = Date.now();
    const homepageContent = await this.scraperService.fetchUrl(url, { fullSite: false });
    const layer2Result = await this.layer2Service.validateOperational(url, homepageContent);
    const layer2Time = Date.now() - layer2Start;

    if (!layer2Result.passed) {
      await this.persistElimination(jobId, urlId, {
        elimination_layer: 'layer2',
        layer2_signals: layer2Result.signals,
        layer2_processing_time_ms: layer2Time
      });
      await this.incrementCounter(jobId, 'layer2_eliminated_count');
      await this.logActivity(jobId, 'info', `Layer 2 REJECT - ${layer2Result.reasoning}`);
      return; // STOP - eliminated at Layer 2
    }

    await this.logActivity(jobId, 'info', `Layer 2 PASS - ${layer2Result.reasoning}`);

    // ─────────────────────────────────────────────────────────
    // LAYER 3: Full Site Scraping + LLM Classification
    // ─────────────────────────────────────────────────────────
    await this.updateJob(jobId, { current_layer: 3 });

    const layer3Start = Date.now();
    const fullSiteContent = await this.scraperService.fetchUrl(url, { fullSite: true });
    const classificationResult = await this.classificationService.classifyUrl(url, fullSiteContent);
    const confidenceBand = await this.confidenceScoringService.calculateBand(classificationResult.confidence);
    const requiresManualReview = await this.manualReviewRouter.shouldRoute(confidenceBand);
    const layer3Time = Date.now() - layer3Start;

    await this.persistResult(jobId, urlId, {
      classification: classificationResult.suitable ? 'suitable' : 'not_suitable',
      classification_score: classificationResult.confidence,
      confidence_band: confidenceBand,
      classification_reasoning: classificationResult.reasoning,
      llm_provider: classificationResult.provider,
      manual_review_required: requiresManualReview,
      llm_cost: classificationResult.cost,
      layer3_processing_time_ms: layer3Time
    });

    await this.logActivity(jobId, 'success',
      `Layer 3 CLASSIFIED - ${classificationResult.suitable ? 'SUITABLE' : 'NOT_SUITABLE'} (confidence: ${classificationResult.confidence})`
    );

    // Update cost savings
    await this.updateCostSavings(jobId);

  } catch (error) {
    await this.handleError(jobId, urlId, error);
  }
}
```

### Database Schema Requirements

**Fields Required Across Tables:**

**results table:**
- Existing from Story 2.5: `url`, `status`, `processing_time_ms`, `scraped_title`, `scraped_meta`
- From Story 2.3-refactored (Layer 1): `elimination_layer`, `layer1_reasoning`
- From Story 2.6 (Layer 2): `layer2_signals` (JSONB)
- From Story 2.4-refactored (Layer 3): `confidence_band`, `manual_review_required`, `classification_score`, `classification_reasoning`, `llm_provider`, `llm_cost`
- NEW for 2.5-refactored: `layer1_processing_time_ms`, `layer2_processing_time_ms`, `layer3_processing_time_ms`

**jobs table:**
- Existing from Story 2.5: `status`, `total_urls`, `processed_urls`, `successful_urls`, `failed_urls`, `progress_percentage`, `current_url`
- NEW from Story 2.3-refactored: `layer1_eliminated_count`
- NEW from Story 2.6: `layer2_eliminated_count`
- NEW for 2.5-refactored: `current_layer` (INTEGER 1-3), `scraping_cost`, `estimated_savings`

**Migration Required:**
```sql
-- Add current layer tracking and per-layer timing
ALTER TABLE jobs
  ADD COLUMN current_layer INTEGER DEFAULT NULL CHECK (current_layer IN (1, 2, 3)),
  ADD COLUMN scraping_cost DECIMAL(10, 6) DEFAULT 0,
  ADD COLUMN estimated_savings DECIMAL(10, 6) DEFAULT 0;

ALTER TABLE results
  ADD COLUMN layer1_processing_time_ms INTEGER DEFAULT NULL,
  ADD COLUMN layer2_processing_time_ms INTEGER DEFAULT NULL,
  ADD COLUMN layer3_processing_time_ms INTEGER DEFAULT NULL;

COMMENT ON COLUMN jobs.current_layer IS 'Current processing layer for in-progress URLs (1: domain analysis, 2: homepage scraping, 3: LLM classification)';
COMMENT ON COLUMN jobs.estimated_savings IS 'Estimated cost savings from Layer 1 and Layer 2 eliminations (USD)';
```

### Real-Time Dashboard Integration

**Dashboard Displays:**

1. **Current Layer Indicator**: Shows which layer is currently processing (visual: "Layer 1 → Layer 2 → Layer 3" with active layer highlighted)
2. **Layer Elimination Counters**:
   - Layer 1: 5,000 eliminated (50%)
   - Layer 2: 1,500 eliminated (30% of Layer 1 survivors)
   - Layer 3: 3,500 classified (70% of Layer 2 survivors)
3. **Cost Breakdown**:
   - Scraping cost: $0.50
   - LLM cost: $10.50
   - Total: $11.00
   - Estimated savings: $29.00 (72.5% saved)
4. **Per-Layer Throughput**:
   - Layer 1: 120 URLs/min (instant domain checks)
   - Layer 2: 25 URLs/min (homepage scraping)
   - Layer 3: 12 URLs/min (full site + LLM)
5. **Progress Bar**: Multi-segment showing Layer 1 pass, Layer 2 pass, Layer 3 classified

### Project Structure Notes

**Files to Modify:**
- `apps/api/src/workers/url-worker.processor.ts` - **Primary refactor target** (orchestrate 3-tier flow)
- `apps/api/src/workers/workers.module.ts` - Inject all layer services
- `apps/api/src/scraper/scraper.service.ts` - Add `fullSite` flag (homepage vs full site scraping)

**Services to Inject:**
- `Layer1DomainAnalysisService` (Story 2.3-refactored)
- `Layer2OperationalFilterService` (Story 2.6 - pending)
- `ClassificationService` (Story 2.4-refactored - LLM service)
- `ConfidenceScoringService` (Story 2.4-refactored)
- `ManualReviewRouterService` (Story 2.4-refactored)
- `ScraperService` (existing from Story 2.5)
- `JobsService` (existing)
- `SupabaseService` (existing)

**Migration Files to Create:**
- `supabase/migrations/20251016XXXXXX_add_3tier_pipeline_tracking.sql`

### Lessons Learned from Story 2.3-refactored

**Critical Integration Patterns (MUST APPLY):**

1. **✅ Service Registration in Module**
   - Add ALL new services to `providers` AND `exports` arrays in WorkersModule
   - Verify dependency injection works via integration test

2. **✅ Database Migration Application**
   - Create migration file AND apply via Supabase MCP
   - Verify schema changes with SELECT query (don't assume it worked)

3. **✅ Worker Integration Testing**
   - Test ACTUAL integration with worker processing (not just unit tests)
   - Use real Supabase test project for Realtime events

4. **✅ Fail-Open Strategy for Layer 1**
   - Layer 1 errors should LOG WARNING and continue to Layer 2
   - Don't block processing if Layer 1 fails (safety fallback)

**From Story 2.5 Review (Already Addressed):**

5. **✅ Graceful Shutdown**
   - Already implemented in Story 2.5 (`await worker.close()`)
   - Verify still works with 3-tier refactor

6. **✅ Environment Variable Validation**
   - Already implemented in Story 2.5 (startup validation)
   - No changes needed

7. **✅ Pause/Resume Database Integration**
   - Already implemented in Story 2.5 (Supabase updates)
   - Test pause/resume across layer boundaries

### Testing Standards Summary

**Unit Test Coverage:**
- Layer 1 REJECT flow (elimination persisted, Layer 2/3 not called)
- Layer 1 PASS → Layer 2 REJECT flow (Layer 3 not called)
- Layer 2 PASS → Layer 3 flow (full pipeline execution)
- Current layer tracking updates (1 → 2 → 3)
- Cost savings calculation accuracy
- Error handling per layer (fail-open Layer 1, retry Layer 2/3)
- Pause/resume across layer boundaries
- Target: >85% coverage for refactored worker

**Integration Test Scenarios:**
1. **3-Tier Pipeline**: 100 URLs → Layer 1 eliminates 50 → Layer 2 eliminates 15 → Layer 3 classifies 35
2. **Layer Counters**: Verify `layer1_eliminated_count = 50`, `layer2_eliminated_count = 15`
3. **Cost Savings**: Verify calculation matches expected savings
4. **Real-Time Updates**: Verify `current_layer` changes visible in dashboard
5. **Throughput**: Verify 20+ URLs/min overall, 100+ URLs/min Layer 1, 20-30 URLs/min Layer 2, 10-15 URLs/min Layer 3
6. **Manual Review Queue**: Verify Layer 3 medium/low confidence results routed correctly

**Performance Benchmarks:**
- **Layer 1 throughput**: 100+ URLs/min (no HTTP, instant domain checks)
- **Layer 2 throughput**: 20-30 URLs/min (homepage scraping only)
- **Layer 3 throughput**: 10-15 URLs/min (full site + LLM)
- **Overall pipeline**: 20+ URLs/min (bottleneck: Layer 3)
- **Elimination efficiency**: 40-60% at Layer 1, 30% at Layer 2, 10% remaining for Layer 3

### References

**Technical Specifications:**
- [Source: docs/tech-spec-epic-2.md#Story 2.5 (lines 411-422)] - Original worker processing requirements
- [Source: docs/PRD.md#FR008 (lines 99-125)] - 3-tier progressive filtering specification
- [Source: docs/sprint-change-proposal-3tier-architecture-2025-10-16.md] - Architecture refactor rationale
- [Source: docs/PRD.md#NFR002 (lines 125-129)] - Performance requirements (20 URLs/min)
- [Source: docs/PRD.md#NFR003 (lines 130-137)] - Cost efficiency requirements (60-70% reduction)

**Architecture Documents:**
- [Source: docs/solution-architecture.md#Worker Processing Pipeline] - Pipeline architecture
- [Source: docs/tech-spec-epic-2.md#Workflow: Process URL Job (lines 207-243)] - Original workflow

**Story Dependencies:**
- **Depends on: Story 2.3-refactored** (Layer 1 Domain Analysis service)
- **Depends on: Story 2.4-refactored** (Layer 3 LLM Classification with confidence scoring)
- **Depends on: Story 2.6** (Layer 2 Operational Filter - PENDING, may need stub for testing)
- **Depends on: Story 2.5** (Original ScraperService, BullMQ worker setup, graceful shutdown)
- **Enables: Epic 1** (Real-time dashboard with layer-specific visibility)

**Lessons Learned:**
- [Source: docs/stories/story-2.3-refactored.md#Senior Developer Review] - Critical integration patterns
- [Source: docs/stories/story-2.5.md#Senior Developer Review] - Worker processing best practices

## Dev Agent Record

### Context Reference

- [Story Context 2.5-refactored](/Users/s0mebody/Desktop/dev/projects/website-scraper-project/docs/story-context-2.5-refactored.xml) - Generated 2025-10-16

### Agent Model Used

claude-sonnet-4-5-20250929

### Debug Log References

### Completion Notes List

**Implementation Summary (2025-10-16):**

This story implemented the 3-tier progressive filtering pipeline orchestration for URL processing. The refactored worker successfully coordinates Layer 1 (domain analysis), Layer 2 (operational filtering), and Layer 3 (LLM classification) with real-time tracking and cost optimization.

**Key Accomplishments:**

1. **Database Schema Migration** - Created and applied `20251016040000_add_3tier_pipeline_tracking.sql`:
   - Added `current_layer`, `scraping_cost`, `estimated_savings`, `layer2_eliminated_count` to jobs table
   - Added per-layer timing fields (`layer1/2/3_processing_time_ms`) and `layer2_signals` to results table
   - Updated `increment_job_counters` RPC function to support Layer 2 counters and scraping cost tracking

2. **Layer 2 Stub Service** - Created `layer2-operational-filter.service.ts`:
   - Temporary pass-through implementation until Story 2.6 is complete
   - Allows testing of 3-tier pipeline without blocking on pending dependencies
   - Returns PASS for all URLs with placeholder signals structure

3. **Worker Refactor** - Completely rewrote `url-worker.processor.ts`:
   - Implemented sequential 3-tier processing (Layer 1 → Layer 2 → Layer 3)
   - STOP logic on elimination (don't proceed to next layer if rejected)
   - Real-time `current_layer` tracking for dashboard visibility
   - Per-layer timing measurement and persistence
   - Cost savings calculation: `(layer1_eliminated + layer2_eliminated) × layer3_avg_cost`
   - Layer 1 fail-open strategy (errors log warning, continue to Layer 2)
   - Retry logic for Layer 2 scraping and Layer 3 LLM calls
   - Graceful shutdown preserved from original Story 2.5

4. **Module Integration** - Updated `jobs.module.ts`:
   - Added Layer2OperationalFilterService to providers and exports
   - All layer services now properly injectable via dependency injection

**Remaining Work:**

- **Integration Tests**: End-to-end testing with real URLs to verify throughput targets (20+ URLs/min) and elimination rates (Layer 1: 40-60%, Layer 2: 30%)
- **Performance Testing**: Validate Layer 1 throughput (100+ URLs/min), Layer 2 (20-30 URLs/min), Layer 3 (10-15 URLs/min)
- **Story 2.6 Dependency**: Replace Layer 2 stub with real operational filtering logic when Story 2.6 is complete

**Technical Debt:**

- ScraperService currently doesn't differentiate between homepage vs full-site scraping (no `fullSite` flag). This optimization can be added in a follow-up story if needed.

**Verification Status (2025-10-16):**
- ✅ **Build**: TypeScript compiles with 0 errors
- ✅ **Unit Tests**: 7/7 passing (100% pass rate)
  - ✅ Process through all 3 layers when all PASS
  - ✅ STOP at Layer 1 if REJECT
  - ✅ STOP at Layer 2 if scraping fails
  - ✅ STOP at Layer 2 if operational filter REJECT
  - ✅ Skip processing when job paused/cancelled
  - ✅ Graceful shutdown
- ✅ **Regression Tests**: 184/184 API tests passing (no regressions)
- ✅ **Database Migration**: Applied successfully to Supabase
- ✅ **Git Commit**: 2228089 (feature/story-3.0-settings-management)

### File List

**Created:**
- `supabase/migrations/20251016040000_add_3tier_pipeline_tracking.sql` - Database schema for 3-tier pipeline tracking
- `apps/api/src/jobs/services/layer2-operational-filter.service.ts` - Layer 2 stub service (passes all URLs until Story 2.6)
- `apps/api/src/workers/url-worker.processor.old.ts` - Backup of original worker implementation

**Modified:**
- `apps/api/src/workers/url-worker.processor.ts` - Complete refactor for 3-tier progressive filtering
- `apps/api/src/jobs/jobs.module.ts` - Added Layer2OperationalFilterService registration
- `apps/api/src/workers/__tests__/url-worker.processor.spec.ts` - Added Layer 2 service mock (test cases need completion)
