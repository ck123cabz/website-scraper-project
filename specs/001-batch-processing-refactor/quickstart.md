# Quickstart: Batch Processing Workflow Refactor

**Date**: 2025-11-13
**Branch**: `001-batch-processing-refactor`
**Estimated Duration**: 8-12 working days (2-3 weeks)

## Overview

This quickstart provides a high-level implementation roadmap for transforming the website scraper from manual review queue to pure batch processing. Implementation follows Test-Driven Development (TDD) principles: write tests first, watch them fail, implement to make them pass.

---

## Prerequisites

Before starting implementation:

1. ✅ All design artifacts complete (research.md, data-model.md, contracts/)
2. ✅ Constitution Check passed (no violations)
3. ✅ Feature spec reviewed and approved (spec.md)
4. ✅ Development environment running (API + Web + Supabase local)
5. ✅ Git branch created: `001-batch-processing-refactor`

**Verify prerequisites:**
```bash
# Check branch
git branch --show-current  # Should show: 001-batch-processing-refactor

# Verify services running
npm run dev  # Both API (3001) and Web (3000) should start

# Test database connection
npx supabase db ping  # Should return "Database is reachable"
```

---

## Implementation Phases

### Phase 1: Database Migrations (Day 1)
**Goal**: Enhance database schema to support JSONB factor storage and job lifecycle management

**Tasks**:
1. Create migration: Add JSONB columns to `url_results`
2. Create migration: Add GIN indexes on JSONB columns
3. Create migration: Add retry tracking columns (`retry_count`, `last_error`)
4. Create migration: Add `archived_at` to `jobs`, update status enum
5. Run migrations locally and verify schema changes
6. Test rollback to ensure reversibility

**Validation**:
```bash
# Apply migrations
npx supabase db push

# Verify new columns exist
npx supabase db query "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'url_results' AND column_name LIKE 'layer%_factors';"

# Verify indexes created
npx supabase db query "SELECT indexname FROM pg_indexes WHERE tablename = 'url_results';"
```

**Location**: `supabase/migrations/`

---

### Phase 2: Shared Types (Day 1-2)
**Goal**: Define TypeScript interfaces for Layer 1/2/3 factors in shared package

**Tasks**:
1. Create `packages/shared/src/types/url-results.ts` with factor interfaces
2. Create `packages/shared/src/types/jobs.ts` with job interfaces
3. Export types from `packages/shared/src/index.ts`
4. Write unit tests for type guards/validators (if needed)

**Tests** (if type guards added):
```typescript
// packages/shared/src/types/__tests__/url-results.spec.ts
describe('isLayer1Factors', () => {
  it('should return true for valid Layer1Factors', () => {
    const factors = { tld_type: 'gtld', /* ... */ };
    expect(isLayer1Factors(factors)).toBe(true);
  });
});
```

**Location**: `packages/shared/src/types/`

---

### Phase 3: Layer Processors Enhancement (Day 2-3)
**Goal**: Update Layer 1/2/3 processors to return complete factor structures

**TDD Process for each layer**:

1. **Write Test** (Layer 1 example):
```typescript
// apps/api/src/queue/__tests__/layer1-processor.spec.ts
describe('Layer1Processor', () => {
  it('should return Layer1Factors structure with all required fields', async () => {
    const result = await processor.processLayer1('https://example.com');

    expect(result.layer1_factors).toMatchObject({
      tld_type: expect.stringMatching(/^(gtld|cctld|custom)$/),
      tld_value: expect.any(String),
      domain_classification: expect.stringMatching(/^(commercial|personal|institutional|spam)$/),
      pattern_matches: expect.any(Array),
      target_profile: {
        type: expect.any(String),
        confidence: expect.any(Number)
      },
      reasoning: expect.any(String),
      passed: expect.any(Boolean)
    });
  });
});
```

2. **Watch Test Fail**: Run `npm test` - should fail (old processor doesn't return full structure)

3. **Implement**: Update processor to return complete factors

4. **Watch Test Pass**: Run `npm test` - should pass

**Tasks per layer**:
- Layer 1: Return complete `Layer1Factors` structure
- Layer 2: Return complete `Layer2Factors` structure (module scores, keywords, content signals)
- Layer 3: Return complete `Layer3Factors` structure (sophistication signals with indicators, tokens used)

**Location**: `apps/api/src/queue/processors/`

---

### Phase 4: Remove Manual Review Routing (Day 3-4)
**Goal**: Eliminate conditional routing to `manual_review_queue`, always write to `url_results`

**TDD Process**:

1. **Write Test**:
```typescript
// apps/api/src/queue/__tests__/queue.service.spec.ts
describe('QueueService.processUrl', () => {
  it('should write all URLs to url_results, never to manual_review_queue', async () => {
    const lowConfidenceUrl = 'https://example.com';
    await queueService.processUrl(jobId, lowConfidenceUrl);

    // Should write to url_results
    const result = await urlResultsRepo.findOne({ where: { url: lowConfidenceUrl } });
    expect(result).toBeDefined();
    expect(result.final_decision).toMatch(/^(accepted|rejected)$/);

    // Should NOT write to manual_review_queue
    const queueItem = await manualReviewRepo.findOne({ where: { url: lowConfidenceUrl } });
    expect(queueItem).toBeNull();
  });

  it('should store complete layer factors in JSONB columns', async () => {
    await queueService.processUrl(jobId, 'https://example.com');

    const result = await urlResultsRepo.findOne({ where: { url: 'https://example.com' } });
    expect(result.layer1_factors).toBeDefined();
    expect(result.layer2_factors).toBeDefined();
    expect(result.layer3_factors).toBeDefined();
  });
});
```

2. **Watch Test Fail**: Old code routes low confidence to manual review

3. **Implement**: Remove routing logic, always write to `url_results` with factors

4. **Watch Test Pass**

**Key Changes**:
- Remove `shouldRouteToManualReview()` logic
- Remove `manualReviewRepo.save()` calls
- Always call `urlResultsRepo.save()` with complete factors
- Set `final_decision` based on Layer 3 classification (no confidence thresholds)

**Location**: `apps/api/src/queue/queue.service.ts`

---

### Phase 5: Retry Logic with Exponential Backoff (Day 4-5)
**Goal**: Implement automatic retry for transient failures with exponential backoff

**TDD Process**:

1. **Write Test**:
```typescript
describe('UrlProcessor retry logic', () => {
  it('should retry transient errors with exponential backoff', async () => {
    const mockScrapingBee = jest.fn()
      .mockRejectedValueOnce(new Error('timeout'))  // Attempt 1: fail
      .mockRejectedValueOnce(new Error('timeout'))  // Attempt 2: fail
      .mockResolvedValueOnce({ html: '...' });      // Attempt 3: success

    await processor.processUrl(jobId, url);

    expect(mockScrapingBee).toHaveBeenCalledTimes(3);

    const result = await urlResultsRepo.findOne({ where: { url } });
    expect(result.retry_count).toBe(2);  // 2 retries = 3 total attempts
    expect(result.final_decision).toBe('accepted');
  });

  it('should mark URL as permanently failed after 3 attempts', async () => {
    const mockLLM = jest.fn().mockRejectedValue(new Error('rate limit'));

    await processor.processUrl(jobId, url);

    const result = await urlResultsRepo.findOne({ where: { url } });
    expect(result.retry_count).toBe(3);
    expect(result.final_decision).toBe('error');
    expect(result.last_error).toContain('rate limit');
  });
});
```

2. **Implement**: Add retry logic to BullMQ job configuration and error handler

**Key Changes**:
- Configure BullMQ: `{ attempts: 3, backoff: { type: 'exponential', delay: 1000 } }`
- Classify errors: `isTransientError()` helper
- Track retries: Increment `retry_count` in `url_results`
- Store errors: Write `last_error` message

**Location**: `apps/api/src/queue/queue.service.ts`, `apps/api/src/queue/processors/`

---

### Phase 6: Job Concurrency Management (Day 5)
**Goal**: Enforce max 5 concurrent jobs using BullMQ worker concurrency

**TDD Process**:

1. **Write Test**:
```typescript
describe('Job concurrency', () => {
  it('should process max 5 jobs concurrently', async () => {
    const jobs = await Promise.all([
      createJob('Job 1'),
      createJob('Job 2'),
      createJob('Job 3'),
      createJob('Job 4'),
      createJob('Job 5'),
      createJob('Job 6'),  // Should queue
    ]);

    await sleep(1000);  // Let jobs start

    const activeJobs = await jobQueue.getActive();
    expect(activeJobs.length).toBeLessThanOrEqual(5);

    const waitingJobs = await jobQueue.getWaiting();
    expect(waitingJobs.length).toBeGreaterThanOrEqual(1);
  });
});
```

2. **Implement**: Configure BullMQ worker with `concurrency: 5`

**Key Changes**:
- Worker config: `new Worker('url-processing', handler, { concurrency: 5 })`
- Queue status endpoint: Return active/queued job counts
- Queue position calculation: `getQueuePosition(jobId)` helper

**Location**: `apps/api/src/jobs/jobs.module.ts`

---

### Phase 7: CSV Export with Streaming (Day 6-7)
**Goal**: Generate CSV exports with 48 columns using streaming for memory efficiency

**TDD Process**:

1. **Write Test**:
```typescript
describe('CSV Export', () => {
  it('should generate complete CSV with 48 columns', async () => {
    const csv = await exportService.generateCSV(jobId, 'complete');

    const lines = csv.split('\n');
    const headers = lines[0].split(',');
    expect(headers.length).toBe(48);
    expect(headers).toContain('url');
    expect(headers).toContain('layer1_tld_type');
    expect(headers).toContain('layer3_design_quality_score');
  });

  it('should handle 10k rows in under 5 seconds', async () => {
    const startTime = Date.now();
    const stream = await exportService.streamCSV(jobId, 'complete');

    let rowCount = 0;
    await new Promise((resolve) => {
      stream.on('data', () => rowCount++);
      stream.on('end', resolve);
    });

    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(5000);
    expect(rowCount).toBeGreaterThan(10000);
  });

  it('should properly escape commas and quotes in text fields', async () => {
    // Create URL result with reasoning: 'Quality "excellent", score 0.9'
    await createUrlResult({ layer3_factors: { reasoning: 'Quality "excellent", score 0.9' } });

    const csv = await exportService.generateCSV(jobId, 'complete');

    expect(csv).toContain('"Quality ""excellent"", score 0.9"');
  });
});
```

2. **Implement**: CSV streaming service with format options

**Key Changes**:
- Export service: `streamCSVExport(jobId, format, filters)`
- Format handlers: `generateCompleteColumns()`, `generateSummaryColumns()`, etc.
- Streaming: Fetch results in 100-row batches, stream to response
- Excel compatibility: UTF-8 BOM, CRLF line endings, RFC 4180 quoting

**Location**: `apps/api/src/jobs/services/export.service.ts`

---

### Phase 8: Results API Endpoints (Day 7-8)
**Goal**: Implement API endpoints for results retrieval with filtering and pagination

**TDD Process**:

1. **Write Test** (contract test with supertest):
```typescript
describe('GET /jobs/:jobId/results', () => {
  it('should return paginated results', async () => {
    const response = await request(app)
      .get(`/jobs/${jobId}/results?page=1&limit=50`)
      .expect(200);

    expect(response.body.results).toHaveLength(50);
    expect(response.body.pagination).toMatchObject({
      page: 1,
      limit: 50,
      totalPages: expect.any(Number),
      totalCount: expect.any(Number)
    });
  });

  it('should filter by final_decision', async () => {
    const response = await request(app)
      .get(`/jobs/${jobId}/results?finalDecision=accepted`)
      .expect(200);

    expect(response.body.results.every(r => r.finalDecision === 'accepted')).toBe(true);
  });

  it('should filter by confidence range', async () => {
    const response = await request(app)
      .get(`/jobs/${jobId}/results?minConfidence=0.7&maxConfidence=0.9`)
      .expect(200);

    expect(response.body.results.every(r =>
      r.confidenceScore >= 0.7 && r.confidenceScore <= 0.9
    )).toBe(true);
  });
});
```

2. **Implement**: Jobs controller with results endpoints

**Endpoints**:
- `GET /jobs/:jobId/results` - List results with filters
- `GET /jobs/:jobId/results/:resultId` - Get single result with full factors
- `POST /jobs/:jobId/export` - Generate CSV export
- `POST /jobs/:jobId/retry` - Retry failed URLs

**Location**: `apps/api/src/jobs/jobs.controller.ts`, `apps/api/src/jobs/jobs.service.ts`

---

### Phase 9: Frontend Results Table with Expandable Rows (Day 8-10)
**Goal**: Replace manual review UI with expandable results table showing factor breakdowns

**Component Structure**:
```
apps/web/components/results/
├── ResultsTable.tsx          # Main table with pagination
├── ResultRow.tsx             # Collapsible row with expand button
├── FactorBreakdown.tsx       # Layer 1/2/3 factor display
├── Layer1Factors.tsx         # Layer 1 specific display
├── Layer2Factors.tsx         # Layer 2 specific display
├── Layer3Factors.tsx         # Layer 3 specific display
└── __tests__/
    ├── ResultsTable.test.tsx
    └── FactorBreakdown.test.tsx
```

**TDD Process** (React Testing Library):

1. **Write Test**:
```typescript
describe('ResultsTable', () => {
  it('should render paginated results', () => {
    render(<ResultsTable jobId={jobId} />);

    expect(screen.getAllByRole('row')).toHaveLength(51);  // 50 data + 1 header
    expect(screen.getByText('Page 1 of 20')).toBeInTheDocument();
  });

  it('should expand row to show factor breakdown', async () => {
    render(<ResultsTable jobId={jobId} />);

    const expandButton = screen.getAllByRole('button', { name: /expand/i })[0];
    await userEvent.click(expandButton);

    expect(screen.getByText('Layer 1: Domain Analysis')).toBeInTheDocument();
    expect(screen.getByText('Layer 2: Publication Detection')).toBeInTheDocument();
    expect(screen.getByText('Layer 3: Sophistication Analysis')).toBeInTheDocument();
  });

  it('should apply filters and refetch results', async () => {
    render(<ResultsTable jobId={jobId} />);

    const filterSelect = screen.getByLabelText('Filter by decision');
    await userEvent.selectOptions(filterSelect, 'accepted');

    await waitFor(() => {
      const rows = screen.getAllByTestId('result-row');
      expect(rows.every(row => row.textContent.includes('Accepted'))).toBe(true);
    });
  });
});
```

2. **Implement**: React components with React Query for data fetching

**Key Features**:
- Pagination controls (page, limit)
- Filter dropdowns (decision, layer, confidence band)
- Expandable rows with factor breakdowns
- Retry button for failed URLs

**Location**: `apps/web/components/results/`

---

### Phase 10: Dashboard Real-Time Progress (Day 10-11)
**Goal**: Update dashboard to show real-time job progress with React Query polling

**TDD Process**:

1. **Write Test**:
```typescript
describe('JobDashboard', () => {
  it('should display active jobs with progress bars', () => {
    render(<JobDashboard />);

    expect(screen.getByText('Active Jobs (3)')).toBeInTheDocument();
    expect(screen.getAllByRole('progressbar')).toHaveLength(3);
  });

  it('should poll for updates every 5 seconds', async () => {
    const mockFetch = jest.fn().mockResolvedValue({ jobs: [] });
    render(<JobDashboard fetchJobs={mockFetch} />);

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1), { timeout: 1000 });
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2), { timeout: 6000 });
  });

  it('should stop polling when job completes', async () => {
    const mockFetch = jest.fn()
      .mockResolvedValueOnce({ jobs: [{ status: 'running' }] })
      .mockResolvedValueOnce({ jobs: [{ status: 'completed' }] });

    render(<JobDashboard fetchJobs={mockFetch} />);

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2), { timeout: 6000 });
    await sleep(6000);

    expect(mockFetch).toHaveBeenCalledTimes(2);  // No more calls
  });
});
```

2. **Implement**: Dashboard with React Query polling

**Key Features**:
- Active jobs section with progress bars
- Layer elimination counts (Layer 1: X, Layer 2: Y, Layer 3: Z)
- Cost accumulation display
- Estimated time remaining
- Queue position for queued jobs
- Recent completed jobs with quick CSV download

**Location**: `apps/web/app/dashboard/page.tsx`, `apps/web/components/dashboard/`

---

### Phase 11: Manual Review System Cleanup (Day 11-12)
**Goal**: Remove all manual review code, UI, and database tables

**Checklist** (create todos for each):

**Frontend Cleanup**:
- [ ] Remove `/manual-review` route (404 redirect)
- [ ] Delete `ManualReviewQueue` component
- [ ] Delete `ReviewDialog` component
- [ ] Remove manual review badge from nav
- [ ] Remove manual review related imports

**Backend Cleanup**:
- [ ] Comment out `ManualReviewModule` import
- [ ] Comment out `NotificationService` calls
- [ ] Comment out `StaleQueueMarkerProcessor` cron job
- [ ] Verify no routes to manual_review_queue in QueueService

**Database Migration** (after 2 weeks of stability):
- [ ] Create migration: `DROP TABLE manual_review_queue;`
- [ ] Create migration: `DROP TABLE manual_review_activity;`
- [ ] Remove `@slack/webhook` from package.json (if unused)
- [ ] Remove `@nestjs/schedule` from package.json (if unused)

**Location**: Various (use TodoWrite to track)

---

### Phase 12: End-to-End Testing (Day 12)
**Goal**: Verify complete workflow with Playwright E2E tests

**Test Scenarios** (from spec.md):

1. **User Story 1**: Automated batch processing
```typescript
test('should process 100 URLs through all 3 layers automatically', async ({ page }) => {
  await page.goto('/jobs/new');
  await page.setInputFiles('input[type="file"]', 'test-data/100-urls.csv');
  await page.fill('input[name="jobName"]', 'E2E Test Job');
  await page.click('button:text("Create Job")');

  await page.waitForURL(/\/jobs\/[^/]+/);

  // Wait for processing to complete
  await expect(page.locator('text=Status: Completed')).toBeVisible({ timeout: 180000 });

  // Verify all URLs processed
  const stats = page.locator('[data-testid="job-stats"]');
  await expect(stats.locator('text=/Processed: 100/')).toBeVisible();
});
```

2. **User Story 2**: Factor transparency (expandable rows)
3. **User Story 3**: CSV export
4. **User Story 4**: Dashboard real-time progress

**Location**: `apps/web/__tests__/e2e/`

---

## Verification Checklist

Before considering implementation complete:

### Functional Requirements ✅
- [ ] All URLs process through Layer 1/2/3 automatically (no manual review routing)
- [ ] JSONB columns store complete factor data
- [ ] Expandable rows show factor breakdowns
- [ ] CSV export generates 48-column file in <5s for 10k rows
- [ ] Dashboard shows real-time progress with <5s latency
- [ ] Max 5 concurrent jobs enforced
- [ ] Retry logic with exponential backoff works for transient errors
- [ ] Manual review system completely removed

### Tests ✅
- [ ] All unit tests pass (`npm test`)
- [ ] All E2E tests pass (`npm run test:e2e`)
- [ ] API contract tests pass (supertest)
- [ ] Manual exploratory testing completed

### Success Criteria ✅
- [ ] SC-001: 10k URLs process in <3 hours (50% reduction)
- [ ] SC-002: CSV export <5s for 10k rows
- [ ] SC-003: Results table handles 100k+ rows with <500ms page transitions
- [ ] SC-004: Zero `manual_review_queue` references in active code
- [ ] SC-006: Expandable rows load in <500ms
- [ ] SC-007: Dashboard updates with <5s latency
- [ ] SC-008: CSV opens correctly in Excel with no formatting issues

### Code Quality ✅
- [ ] No linting errors (`npm run lint`)
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] All tests documented with clear descriptions
- [ ] API endpoints documented (OpenAPI spec)
- [ ] README updated with new workflow

---

## Rollback Plan

If critical issues discovered post-deployment:

1. **Revert git commits**: `git revert <commit-range>`
2. **Rollback migrations**: `npx supabase db reset` (local) or manual rollback (prod)
3. **Re-enable manual review** (if disabled but not deleted):
   - Uncomment `ManualReviewModule` import
   - Restore routing logic in `QueueService`
   - Re-deploy frontend with manual review route

**Data recovery**: JSONB columns remain populated even if code reverted, so data is not lost.

---

## Post-Launch Monitoring

**Week 1-2 after launch**:
- Monitor job completion rates (target: 99%+ success rate)
- Track CSV export performance (target: <5s for 10k rows)
- Monitor database storage growth (target: <50MB per 10k URLs)
- Check for manual review references (should be zero in logs/errors)
- Collect user feedback on external review workflow

**If stable after 2 weeks**: Execute Phase 2 cleanup (drop manual review tables, remove dependencies)

---

## Next Steps

After this quickstart, proceed to detailed implementation tasks:

1. Run `/speckit.tasks` to generate dependency-ordered tasks.md
2. Review tasks.md for bite-sized implementation steps
3. Use TodoWrite to track progress through tasks
4. Follow TDD: Write test → Watch fail → Implement → Watch pass
5. Commit frequently with descriptive messages
6. Request code review after each major phase

**Estimated Total Duration**: 8-12 working days (2-3 weeks for one developer)

Good luck! 🚀
