# Quickstart: Manual Review System Implementation

**Feature**: Complete Settings Implementation (Manual Review System)
**Date**: 2025-11-11
**For**: Engineers implementing this feature

## Overview

This quickstart provides the minimal set of information needed to start implementing the manual review system. It assumes you have zero context on the codebase but understand NestJS, Next.js, and PostgreSQL.

**What you're building**: A complete manual review queue system where URLs requiring human judgment are queued, reviewed via UI, and routed according to configurable confidence band actions.

**Time estimate**: 3-5 days for full implementation (backend + frontend + tests)

---

## Prerequisites

1. **Local environment setup**:
   ```bash
   # Install dependencies
   pnpm install

   # Start development servers
   pnpm dev  # Runs both apps/api (port 3001) and apps/web (port 3000) in parallel via turbo

   # Or individually:
   # cd apps/api && npm run dev
   # cd apps/web && npm run dev
   ```

2. **Database configuration**:
   - Database: PostgreSQL via Supabase
   - Supabase Studio: http://localhost:54323 (if running locally)
   - Environment: Set DATABASE_URL in `.env.local` files for each app
   - Migrations: Located in `supabase/migrations/` directory

3. **Tools required**:
   - Node.js 18+ (for TypeScript/NestJS/Next.js)
   - pnpm (package manager for monorepo)
   - Supabase CLI (optional, for running local database)
   - Docker (optional, for local Supabase instance)

---

## Architecture Summary

**Monorepo structure**:
```
apps/api/          → NestJS backend (port 3001)
apps/web/          → Next.js frontend (port 3000)
packages/shared/   → Shared TypeScript types
supabase/          → Database migrations
```

**Data flow**:
```
URL Processing → Confidence Scoring → Router Service → Manual Review Queue (if action='manual_review')
                                                     → URL Results (if action='auto_approve' or 'reject')

Manual Review Queue → API Endpoints → Frontend UI → Review Decision → URL Results (soft-delete queue entry)
```

**Key files** (locations to implement):
- Database: `supabase/migrations/[timestamp]_create_manual_review_queue.sql`
- Shared types: `packages/shared/src/types/manual-review.ts`
- API module: `apps/api/src/manual-review/` (service, controller, DTOs)
- Router service: `apps/api/src/jobs/services/manual-review-router.service.ts` (new file)
- Frontend page: `apps/web/app/manual-review/page.tsx`
- UI components: `apps/web/components/manual-review/` (FactorBreakdown, QueueTable, ReviewDialog)

---

## Implementation Sequence (TDD)

### Phase 1: Database & Types (Day 1)

**Step 1.1**: Create Supabase migration
- File: `supabase/migrations/[timestamp]_create_manual_review_queue.sql`
- Content: See [data-model.md](./data-model.md) for full schema
- Key elements:
  - `manual_review_queue` table with JSONB columns for layer results
  - Indexes on `reviewed_at`, `is_stale`, `job_id`
  - Foreign keys to `jobs` and `urls` with ON DELETE CASCADE
  - Add 'approved', 'queue_overflow' to url_results.status enum

**Step 1.2**: Run migration
```bash
supabase migration up
```

**Step 1.3**: Create shared types
- File: `packages/shared/src/types/manual-review.ts`
- Export: `ManualReviewQueueEntry`, `Layer1Results`, `Layer2Results`, `Layer3Results`, `ReviewDecision`
- See [data-model.md](./data-model.md) TypeScript section for complete interfaces

**Test**: Query database directly to verify schema
```sql
\d manual_review_queue;
```

---

### Phase 2: Confidence Band Action Routing (Day 1-2)

**Step 2.1**: Modify ConfidenceScoringService
- File: `apps/api/src/jobs/services/confidence-scoring.service.ts`
- Add method: `getConfidenceBandAction(score: number): Promise<{band: string, action: string}>`
- Load confidence bands from settings (with 5-minute cache)
- Return matching band and action based on score

**Step 2.2**: Create ManualReviewRouterService
- File: `apps/api/src/jobs/services/manual-review-router.service.ts`
- Methods:
  - `routeUrl(urlEvaluation, layer1Results, layer2Results, layer3Results): Promise<void>`
  - `enqueueForReview(...)`: Check queue size limit, insert to manual_review_queue
  - `finalizeResult(url, status, reason)`: Insert to url_results
  - `countActiveQueue()`: Count WHERE reviewed_at IS NULL
- Inject dependencies: ManualReviewQueueRepo, UrlResultsRepo, SettingsService, ActivityLogService

**Step 2.3**: Update URLWorker processor
- File: `apps/api/src/workers/url-worker.processor.ts`
- After Layer 3 processing:
  - Call `confidenceScoringService.getConfidenceBandAction(score)`
  - Pass action to `manualReviewRouterService.routeUrl(...)`
- Pass structured layer1/2/3 results (not just LLM output)

**Test**: Write integration test
```typescript
// apps/api/src/jobs/__tests__/manual-review-routing.spec.ts
describe('Manual Review Routing', () => {
  it('should route to manual review queue when action=manual_review', async () => {
    // Configure confidence band: medium (0.5-0.79) → action='manual_review'
    // Process URL with score 0.67
    // Assert: URL appears in manual_review_queue, NOT in url_results
  });

  it('should auto-approve when action=auto_approve', async () => {
    // Configure confidence band: high (0.8-1.0) → action='auto_approve'
    // Process URL with score 0.92
    // Assert: URL appears in url_results with status='approved', NOT in queue
  });

  it('should reject when queue size limit reached', async () => {
    // Configure queue_size_limit = 10
    // Fill queue with 10 items
    // Process URL requiring manual review
    // Assert: URL in url_results with status='queue_overflow'
  });
});
```

---

### Phase 3: API Endpoints (Day 2)

**Step 3.1**: Create ManualReviewModule
- File: `apps/api/src/manual-review/manual-review.module.ts`
- Register: ManualReviewService, ManualReviewController

**Step 3.2**: Create ManualReviewService
- File: `apps/api/src/manual-review/manual-review.service.ts`
- Methods:
  - `getQueue(filters, pagination)`: Query WHERE reviewed_at IS NULL
  - `getQueueStatus()`: Return total_count, stale_count, oldest_queued_at
  - `getQueueEntry(id)`: Find by ID
  - `getFactorBreakdown(id)`: Return layer1/2/3 results
  - `reviewEntry(id, decision)`: Transaction - insert to url_results, update reviewed_at

**Step 3.3**: Create ManualReviewController
- File: `apps/api/src/manual-review/manual-review.controller.ts`
- Endpoints: See [contracts/manual-review-api.yaml](./contracts/manual-review-api.yaml)
  - `GET /api/manual-review` → getQueue
  - `GET /api/manual-review/status` → getQueueStatus
  - `GET /api/manual-review/:id` → getQueueEntry
  - `GET /api/manual-review/:id/factors` → getFactorBreakdown
  - `POST /api/manual-review/:id/review` → reviewEntry

**Step 3.4**: Create DTOs
- File: `apps/api/src/manual-review/dto/review-decision.dto.ts`
- Validation: `@IsIn(['approved', 'rejected'])`, optional notes

**Test**: Write controller tests
```typescript
// apps/api/src/manual-review/__tests__/manual-review.controller.spec.ts
describe('ManualReviewController', () => {
  it('GET /api/manual-review should return paginated queue', async () => {
    // Seed 5 queue items
    // Request GET /api/manual-review?page=1&limit=3
    // Assert: Response has 3 items, pagination metadata
  });

  it('POST /api/manual-review/:id/review should approve URL', async () => {
    // Seed queue item
    // Request POST /api/manual-review/{id}/review { decision: 'approved', notes: 'Looks good' }
    // Assert: url_results has new entry with status='approved', queue entry has reviewed_at set
  });
});
```

---

### Phase 4: Frontend UI (Day 3)

**Step 4.1**: Create ManualReviewPage
- File: `apps/web/app/manual-review/page.tsx`
- Use React Query to fetch queue: `useManualReviewQueue()`
- Display table with columns: URL, Confidence Score, Band, Queued At, Stale Flag
- Filters: Stale items only, Search by job ID
- Pagination controls

**Step 4.2**: Create FactorBreakdown component
- File: `apps/web/components/manual-review/FactorBreakdown.tsx`
- Props: `{ layer1, layer2, layer3 }`
- Render three sections (Layer 1, 2, 3) with visual indicators:
  - Layer 1: Domain Age ✓, TLD Type ✗, etc.
  - Layer 2: Contact Page ✓, Author Bio ✗, etc.
  - Layer 3: Design Quality 0.7 ✓, Content Originality 0.6 ✓

**Step 4.3**: Create ReviewDialog component
- File: `apps/web/components/manual-review/ReviewDialog.tsx`
- Modal with:
  - URL preview (iframe or screenshot)
  - FactorBreakdown
  - Decision buttons: Approve / Reject
  - Notes textarea (required for rejection)
- On submit: POST to `/api/manual-review/:id/review`

**Step 4.4**: Add dashboard badge
- File: `apps/web/app/dashboard/page.tsx` or layout
- Fetch queue count from `/api/manual-review/status`
- Display badge next to "Manual Review" nav link
- Only show if `settings.notifications.dashboard_badge` is enabled

**Test**: Write E2E test
```typescript
// apps/web/__tests__/e2e/manual-review.spec.ts
test('complete manual review workflow', async ({ page }) => {
  // Navigate to /manual-review
  // Verify queue table displays items
  // Click on first item to open ReviewDialog
  // Verify FactorBreakdown shows layer results
  // Click "Approve" button
  // Enter notes: "High quality content"
  // Submit
  // Verify item removed from queue table
});
```

---

### Phase 5: Scheduled Jobs & Notifications (Day 4)

**Step 5.1**: Create StaleQueueMarkerProcessor
- File: `apps/api/src/jobs/processors/stale-queue-marker.processor.ts`
- Use `@Cron('0 2 * * *')` for daily at 2 AM
- Query items WHERE reviewed_at IS NULL AND is_stale=FALSE AND queued_at < (NOW() - timeout_days)
- Batch update: SET is_stale=TRUE
- Log activity for each flagged item

**Step 5.2**: Create NotificationService
- File: `apps/api/src/manual-review/services/notification.service.ts`
- Methods:
  - `checkAndSendEmail(queueCount)`: Use nodemailer, track last sent in Redis
  - `sendSlackNotification(queueCount)`: Use @slack/webhook
- Call from ManualReviewRouterService after enqueue

**Step 5.3**: Add notification dependencies
```bash
pnpm add @slack/webhook @nestjs/schedule
pnpm add -D @types/nodemailer  # For email support (optional)
```

**Step 5.4**: Configure environment variables
```env
# .env.local
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=notifications@example.com
SMTP_PASSWORD=secret
SMTP_FROM=noreply@example.com
```

**Test**: Write scheduled job test
```typescript
// apps/api/src/jobs/processors/__tests__/stale-queue-marker.spec.ts
describe('StaleQueueMarkerProcessor', () => {
  it('should flag items older than timeout', async () => {
    // Configure auto_review_timeout_days = 7
    // Seed queue item with queued_at = 8 days ago
    // Run cron job
    // Assert: is_stale = TRUE, activity log created
  });
});
```

---

### Phase 6: Layer Result Capture (Day 5)

**Step 6.1**: Update Layer1DomainAnalysisService
- File: `apps/api/src/jobs/services/layer1-domain-analysis.service.ts`
- Return structured `Layer1Results` object (not just boolean)
- For each check (domain age, TLD, registrar):
  - Set `checked: true`
  - Set `passed: true/false`
  - Include `value` and `threshold` where applicable

**Step 6.2**: Update Layer2RulesService
- File: `apps/api/src/jobs/services/layer2-rules.service.ts`
- Return structured `Layer2Results` object
- For each guest post red flag:
  - Set `checked: true`
  - Set `detected: true/false`

**Step 6.3**: Update LLMService
- File: `apps/api/src/jobs/services/llm.service.ts`
- Return structured `Layer3Results` object
- For each sophistication signal:
  - Set `score: 0.0-1.0`
  - Set `detected: true/false` (score above threshold)
  - Include `reasoning` from LLM

**Step 6.4**: Update ManualReviewRouterService
- Accept layer1/2/3 results as parameters
- Pass to `manual_review_queue` insert

**Test**: Write unit tests for layer result structure
```typescript
// apps/api/src/jobs/__tests__/layer1-results.spec.ts
describe('Layer1DomainAnalysisService', () => {
  it('should return structured results with all factors', async () => {
    const results = await service.analyze('https://example.com');
    expect(results).toHaveProperty('domain_age.checked', true);
    expect(results).toHaveProperty('domain_age.passed');
    expect(results).toHaveProperty('domain_age.value');
  });
});
```

---

## Running Tests

**Unit tests** (service logic):
```bash
cd apps/api
npm test -- manual-review
```

**Integration tests** (database + API):
```bash
cd apps/api
npm test -- --detectOpenHandles
```

**E2E tests** (full workflow):
```bash
cd apps/web
npm run test:e2e
```

---

## Common Pitfalls

1. **Forgetting soft-delete pattern**: Always query `WHERE reviewed_at IS NULL` for active queue
2. **Not handling queue overflow**: Must check queue size before insert, insert to url_results if full
3. **Missing layer results**: All three layers must return structured results, not just booleans
4. **Blocking on notifications**: Email/Slack send must be async, failures must not block processing
5. **Stale flag idempotency**: Cron job must only flag items transitioning from fresh to stale (WHERE is_stale=FALSE)

---

## Verification Checklist

Before claiming "done", verify:

- [ ] Migration applied, table exists with indexes
- [ ] Confidence band action routing works (integration test passes)
- [ ] Queue size limit enforced (overflow URLs get status='queue_overflow')
- [ ] API endpoints return expected data (Postman/curl manual test)
- [ ] Frontend page displays queue with factor breakdown
- [ ] Approve/reject decisions persist to url_results and soft-delete queue entry
- [ ] Dashboard badge shows queue count
- [ ] Stale-flagging cron job runs and marks old items
- [ ] Email/Slack notifications send when threshold reached (test with mock)
- [ ] All tests pass (unit, integration, E2E)

---

## Getting Help

**Reference documents**:
- [spec.md](./spec.md) - Full requirements and user stories
- [research.md](./research.md) - Technical decisions and rationale
- [data-model.md](./data-model.md) - Complete entity definitions
- [contracts/manual-review-api.yaml](./contracts/manual-review-api.yaml) - OpenAPI spec

**Architecture questions**:
- Monorepo: See `.specify/memory/constitution.md` Principle I
- Database-first: See `.specify/memory/constitution.md` Principle II
- Queue jobs: See `.specify/memory/constitution.md` Principle III

**Code patterns**:
- Settings access: See `apps/api/src/settings/settings.service.ts`
- BullMQ processors: See `apps/api/src/workers/url-worker.processor.ts`
- React Query hooks: See `apps/web/hooks/useJobs.ts`

**Debugging**:
- API logs: `apps/api/logs/` (structured JSON)
- Database: Supabase Studio at http://localhost:54323
- Queue dashboard: BullMQ board at http://localhost:3001/admin/queues (if enabled)

---

## Next Steps After Implementation

1. **Generate tasks.md**: Run `/speckit.tasks` to break down implementation into bite-sized tasks
2. **Start TDD workflow**: Write first test, watch it fail, implement minimal code to pass
3. **Submit for review**: Use superpowers:requesting-code-review skill after completing major milestones

Good luck! Remember: Database first, tests first, ship incrementally.
