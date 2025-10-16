# Technical Specification: Production-Grade Processing Pipeline

Date: 2025-10-13
Author: CK
Epic ID: epic-2
Status: Draft

---

## Overview

Epic 2 focuses on building the **Production-Grade Processing Pipeline** - the backend infrastructure that powers the scraping operations. This epic delivers a robust NestJS + BullMQ queue architecture with intelligent pre-filtering, cost-optimized LLM classification (Gemini 2.0 Flash primary, GPT-4o-mini fallback), and reliable job processing with automatic retries and persistence.

This epic encompasses the entire backend application (NestJS + BullMQ + Redis + Supabase) and implements 5 user stories focused on scalable, reliable URL processing. It provides the REST API endpoints and real-time database updates that Epic 1's dashboard consumes.

## Objectives and Scope

### In Scope
- ✅ Complete NestJS 10 backend application with TypeScript
- ✅ BullMQ job queue with Redis for reliable job processing
- ✅ Supabase PostgreSQL database schema with 4 tables
- ✅ Bulk URL upload endpoint (CSV, TXT, JSON, up to 10K URLs)
- ✅ Intelligent pre-filtering engine (40-60% cost reduction via regex rules)
- ✅ LLM classification service (Gemini 2.0 Flash primary, GPT-4o-mini fallback)
- ✅ ScrapingBee integration for URL content fetching with JS rendering
- ✅ BullMQ worker processing with 5 concurrent URL processing
- ✅ Real-time database updates triggering Supabase Realtime events
- ✅ Job control endpoints (pause, resume, cancel)
- ✅ Automatic retry logic with exponential backoff (3 attempts)
- ✅ Cost tracking and calculation per URL
- ✅ Comprehensive error handling and logging (Pino logger)
- ✅ Railway deployment configuration

### Out of Scope (Deferred to Phase 2 or Later)
- ❌ Frontend UI implementation (Epic 1)
- ❌ Authentication/authorization (MVP: no auth)
- ❌ ML-based pre-filtering (using regex rules for MVP)
- ❌ Custom classification prompts (fixed prompt for MVP)
- ❌ Scheduled/cron jobs
- ❌ REST API for external tools
- ❌ Email/webhook notifications
- ❌ Advanced caching strategies beyond Redis

## System Architecture Alignment

This epic implements the **Backend Application** component of the solution architecture:

### Architecture Pattern
- **Monorepo Structure**: `apps/api/` (NestJS backend)
- **Shared Package**: `packages/shared/` for TypeScript types, Zod schemas, utilities
- **Repository**: Turborepo for monorepo management

### Backend Stack (from Architecture)
- **Framework**: NestJS 10.3+ with TypeScript
- **Queue System**: BullMQ 5.10+ with Redis 7+
- **Database**: Supabase PostgreSQL (via `@supabase/supabase-js`)
- **HTTP Client**: Axios 1.7+ for external API calls
- **Logger**: Pino 9.3+ (structured JSON logging)
- **Validation**: Zod 3.23+ for request/response validation
- **Type Safety**: TypeScript 5.5+ with strict mode

### Integration Points
1. **Frontend Application** (Epic 1): Serves REST API endpoints consumed by Next.js app
2. **Supabase Database**: Direct write access, triggers Realtime events for Epic 1
3. **Redis**: BullMQ job queue storage, managed by Railway
4. **ScrapingBee API**: Web scraping service with JS rendering
5. **Google Gemini API**: Primary LLM classification (2.0 Flash)
6. **OpenAI GPT API**: Fallback LLM classification (GPT-4o-mini)

### Deployment Target
- **Platform**: Railway (backend deployed separately from frontend)
- **Services**: NestJS app + Redis (managed by Railway)
- **Environment Variables**: `DATABASE_URL`, `REDIS_URL`, `SCRAPINGBEE_API_KEY`, `GEMINI_API_KEY`, `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`

## Detailed Design

### Services and Modules

| Module/Service | Responsibility | Location | Key Exports |
|---|---|---|---|
| **Jobs Module** | Job CRUD operations, job control (pause/resume/cancel) | `apps/api/src/jobs/` | `JobsController`, `JobsService` |
| **Queue Module** | BullMQ queue configuration, job dispatching | `apps/api/src/queue/` | `QueueService`, `QueueProcessor` |
| **Worker Module** | URL processing worker, orchestrates scraping → filtering → classification | `apps/api/src/workers/` | `UrlWorker`, `WorkerService` |
| **Scraper Service** | ScrapingBee API integration, content extraction | `apps/api/src/scraper/` | `ScraperService` |
| **Filter Service** | Intelligent pre-filtering with regex rules | `apps/api/src/filter/` | `FilterService`, `FilterRules` |
| **LLM Service** | Gemini + GPT classification with fallback logic | `apps/api/src/llm/` | `LLMService`, `GeminiProvider`, `GPTProvider` |
| **Cost Service** | LLM cost calculation and tracking | `apps/api/src/cost/` | `CostService` |
| **Database Module** | Supabase client, database operations | `apps/api/src/database/` | `DatabaseService`, `supabaseClient` |
| **Logger Module** | Pino structured logging configuration | `apps/api/src/logger/` | `LoggerService` |
| **Health Module** | Health check endpoints for Railway | `apps/api/src/health/` | `HealthController` |

### Data Models and Contracts

Database schema defined in solution-architecture.md, implemented via Supabase SQL.

**Database Tables**:
- `jobs` - Job metadata with real-time updates
- `results` - Individual URL processing results
- `activity_logs` - Detailed activity logs for transparency
- `url_queue` (optional) - Only if not using BullMQ Redis

**TypeScript Types** (shared with Epic 1 via `packages/shared/`):
- See Epic 1 tech spec for Job, Result, ActivityLog interfaces

**Request/Response DTOs**:

```typescript
// apps/api/src/jobs/dto/create-job.dto.ts
export class CreateJobDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(10000)
  urls: string[];
}

// apps/api/src/jobs/dto/job-response.dto.ts
export class JobResponseDto {
  id: string;
  name: string | null;
  status: JobStatus;
  totalUrls: number;
  processedUrls: number;
  // ... (matches Job interface from shared package)
}
```

### APIs and Interfaces

**REST API Endpoints** (NestJS Controllers):

**Jobs Controller** (`apps/api/src/jobs/jobs.controller.ts`):
- `POST /jobs` - Create new job with URL list
- `GET /jobs` - List all jobs (pagination, filtering)
- `GET /jobs/:id` - Get job details
- `PATCH /jobs/:id/pause` - Pause active job
- `PATCH /jobs/:id/resume` - Resume paused job
- `DELETE /jobs/:id/cancel` - Cancel job (soft delete, preserve results)

**Results Controller** (`apps/api/src/results/results.controller.ts`):
- `GET /jobs/:id/results` - Get job results (pagination, search, filtering)
- `GET /jobs/:id/results/export` - Export results (CSV/JSON)

**Logs Controller** (`apps/api/src/logs/logs.controller.ts`):
- `GET /jobs/:id/logs` - Get activity logs (pagination, severity filtering)

**Health Controller** (`apps/api/src/health/health.controller.ts`):
- `GET /health` - Health check for Railway (checks Redis, Supabase, APIs)

**BullMQ Queue Interface**:

```typescript
// apps/api/src/queue/queue.service.ts
export class QueueService {
  async addUrlToQueue(jobId: string, url: string): Promise<Job>
  async pauseJob(jobId: string): Promise<void>
  async resumeJob(jobId: string): Promise<void>
  async getQueueStats(): Promise<QueueStats>
}

// apps/api/src/workers/url-worker.ts
@Processor('url-processing-queue')
export class UrlWorker {
  @Process()
  async processUrl(job: BullJob<UrlJobData>): Promise<void>
}
```

**Service Interfaces**:

```typescript
// Scraper Service
export interface ScraperResult {
  url: string;
  content: string;
  title: string;
  metaDescription: string;
  contentLength: number;
  success: boolean;
  error?: string;
}

// Filter Service
export interface FilterResult {
  passed: boolean;
  reasoning: string;
  rule?: string; // Which rule triggered rejection
}

// LLM Service
export interface ClassificationResult {
  suitable: boolean;
  confidence: number; // 0-1
  reasoning: string;
  provider: 'gemini' | 'gpt';
  cost: number;
  tokensUsed: number;
}
```

### Workflows and Sequencing

**Workflow: Process URL Job**

1. **Job Creation**:
   - User uploads URLs via `POST /jobs`
   - `JobsService` validates URLs, removes duplicates
   - Job record created in `jobs` table with status "pending"
   - URLs dispatched to BullMQ queue: `QueueService.addUrlToQueue()`
   - Job status updated to "processing", `started_at` timestamp set
   - Response returned to client with job ID

2. **Worker Processing** (per URL):
   - BullMQ worker picks URL from queue
   - Update job: `current_url`, `current_stage = 'fetching'`
   - **Fetch Content**: `ScraperService.fetchUrl()` → ScrapingBee API call
     - If fails: Log error, retry (max 3 attempts), mark as "failed" if all retries exhausted
   - Update `current_stage = 'filtering'`
   - **Pre-Filter**: `FilterService.checkUrl()` → Apply regex rules
     - If REJECT: Log decision, insert to `results` table with `classification_result = 'rejected_prefilter'`, skip LLM
     - If PASS: Continue to classification
   - Update `current_stage = 'classifying'`
   - **LLM Classification**: `LLMService.classify()`
     - Try Gemini API first
     - If Gemini fails (timeout, error, rate limit): Fall back to GPT
     - Calculate cost: `CostService.calculateCost(tokensUsed, provider)`
   - **Store Result**: Insert to `results` table
   - **Update Job Counters**: Increment `processed_urls`, update `progress_percentage`, calculate `processing_rate`, `estimated_time_remaining`
   - **Log Activity**: Insert to `activity_logs` table
   - **Trigger Realtime**: Database changes automatically broadcast via Supabase Realtime

3. **Job Completion**:
   - When `processed_urls === total_urls`:
     - Update job status to "completed"
     - Set `completed_at` timestamp
     - Calculate final costs (`total_cost`, `gemini_cost`, `gpt_cost`)
     - Log completion message
     - Realtime broadcasts completion to all connected clients

**Workflow: Pause Job**

1. User clicks "Pause" in dashboard → `PATCH /jobs/:id/pause`
2. `JobsService.pauseJob()` updates job status to "paused" in database
3. BullMQ queue checks job status before processing each URL
4. Current URL completes processing, next URL not started
5. Realtime broadcasts status change to all clients
6. Worker stops picking new jobs with "paused" status

**Workflow: Error Handling & Retry**

1. URL processing fails (ScrapingBee timeout, network error, LLM API error)
2. Worker catches error, logs to `activity_logs` with severity "error"
3. Check retry count: if < 3, retry with exponential backoff (1s, 2s, 4s)
4. If retries exhausted: Mark URL as "failed" in `results` table, store error message
5. Increment `failed_urls` counter, continue with next URL
6. Job does NOT fail - continues processing remaining URLs

## Non-Functional Requirements

### Performance

- **NFR002-P1**: Process minimum 20 URLs per minute (average, accounting for rate limits)
- **NFR002-P2**: Complete 10K URL batch in <8 hours (includes 2s delays between requests)
- **NFR002-P3**: BullMQ worker concurrency: 5 concurrent URLs (respects ScrapingBee limits)
- **NFR002-P4**: Pre-filtering executes in <100ms per URL
- **NFR002-P5**: Database write operations <200ms (inserts/updates)
- **NFR002-P6**: API endpoint response time <500ms (excluding long-running job processing)
- **NFR002-P7**: Redis queue operations <50ms
- **NFR002-P8**: LLM API calls timeout after 30 seconds, trigger fallback

### Security

- **NFR002-S1**: API keys stored in environment variables, never in code or logs
- **NFR002-S2**: Supabase service key used (not anon key) for server-side operations
- **NFR002-S3**: Input validation on all endpoints (Zod schemas, class-validator)
- **NFR002-S4**: Rate limiting: 100 req/min per IP (NestJS throttler)
- **NFR002-S5**: CORS configured to allow only frontend domain
- **NFR002-S6**: Helmet middleware for security headers
- **NFR002-S7**: No sensitive data logged (mask API keys, only show last 4 chars)

### Reliability/Availability

- **NFR002-R1**: Backend deployed to Railway with 99% uptime SLA
- **NFR002-R2**: Automatic retries: 3 attempts with exponential backoff for transient errors
- **NFR002-R3**: Job state persisted in database - jobs resume after system restart
- **NFR002-R4**: Failed URLs don't crash entire job - isolated error handling
- **NFR002-R5**: Graceful shutdown: Finish processing current URLs before stopping (SIGTERM handling)
- **NFR002-R6**: Redis persistence enabled (AOF + RDB) for queue durability
- **NFR002-R7**: Health check endpoint responds within 2 seconds, checks all dependencies

### Observability

- **NFR002-O1**: Structured JSON logging via Pino (all requests, errors, processing events)
- **NFR002-O2**: Logs sent to Railway logs dashboard (stdout/stderr)
- **NFR002-O3**: Request/response logging: All API calls logged with duration, status code
- **NFR002-O4**: Error tracking: All exceptions logged with stack traces, context
- **NFR002-O5**: BullMQ metrics: Queue depth, processing rate, failed jobs (via Bull Board in dev)
- **NFR002-O6**: LLM API call logging: Provider, tokens used, cost, latency, success/failure
- **NFR002-O7**: Database query logging in development mode

## Dependencies and Integrations

### NPM Dependencies (`apps/api/package.json`)

**Core Framework**:
- `@nestjs/core@^10.3.0` - NestJS framework
- `@nestjs/common@^10.3.0` - Common NestJS utilities
- `@nestjs/platform-express@^10.3.0` - Express adapter
- `reflect-metadata@^0.2.0` - Metadata reflection
- `rxjs@^7.8.0` - Reactive extensions

**Queue & Job Processing**:
- `bullmq@^5.10.0` - Redis-based queue
- `@nestjs/bullmq@^10.1.0` - NestJS BullMQ integration
- `ioredis@^5.4.0` - Redis client (BullMQ dependency)

**Database**:
- `@supabase/supabase-js@^2.45.0` - Supabase client

**HTTP & External APIs**:
- `axios@^1.7.0` - HTTP client for ScrapingBee, Gemini, GPT APIs
- `@nestjs/axios@^3.0.0` - NestJS Axios integration

**Validation & Types**:
- `zod@^3.23.0` - Schema validation
- `class-validator@^0.14.0` - DTO validation
- `class-transformer@^0.5.0` - Transform plain objects to class instances

**Logging**:
- `nestjs-pino@^4.1.0` - Pino logger for NestJS
- `pino@^9.3.0` - Fast JSON logger
- `pino-pretty@^11.2.0` - Pretty print logs in dev

**Utilities**:
- `@nestjs/config@^3.2.0` - Configuration management
- `@nestjs/throttler@^6.0.0` - Rate limiting
- `helmet@^7.1.0` - Security headers

**Development**:
- `@bull-board/express@^5.21.0` - Bull Board UI for queue monitoring
- `typescript@^5.5.0` - Type safety
- `eslint@^8.57.0` - Linting
- `prettier@^3.3.0` - Code formatting

### External Integrations

| Integration | Purpose | Authentication | Rate Limits | Configuration |
|---|---|---|---|---|
| **ScrapingBee API** | Web scraping with JS rendering | API key | 250K credits/month, ~10 req/sec | `SCRAPINGBEE_API_KEY` |
| **Google Gemini API** | Primary LLM classification | API key | 15 RPM (free tier) | `GEMINI_API_KEY` |
| **OpenAI GPT API** | Fallback LLM classification | API key | 500 RPM (tier 1) | `OPENAI_API_KEY` |
| **Supabase PostgreSQL** | Database storage | Service key | Unlimited (managed) | `DATABASE_URL`, `SUPABASE_SERVICE_KEY` |
| **Redis (Railway)** | BullMQ job queue | Connection string | Unlimited (managed) | `REDIS_URL` |
| **Railway** | Deployment platform | Railway CLI | N/A | Automatic via git push |

## Acceptance Criteria (Authoritative)

Extracted from Epic 2 stories (5 stories, ~37 acceptance criteria):

### Story 2.1: NestJS Backend Foundation & Job Queue Setup
- AC2.1.1: NestJS application initialized with TypeScript
- AC2.1.2: BullMQ configured with Redis connection (Railway managed Redis)
- AC2.1.3: Job queue created: "url-processing-queue"
- AC2.1.4: Bull Board dashboard configured for dev monitoring (at /admin/queues)
- AC2.1.5: Supabase client configured with environment variables
- AC2.1.6: Database tables created: jobs, results (urls), activity_logs
- AC2.1.7: Health check endpoint: GET /health
- AC2.1.8: Basic job endpoints: POST /jobs (create), GET /jobs/:id (status)
- AC2.1.9: Deployed to Railway with auto-deployment on git push
- AC2.1.10: Environment variables configured in Railway

### Story 2.2: Bulk URL Upload & Job Creation
- AC2.2.1: POST /jobs/create endpoint accepts file upload (CSV, TXT) via multipart/form-data
- AC2.2.2: POST /jobs/create endpoint accepts JSON body with `urls` array
- AC2.2.3: POST /jobs/create endpoint accepts text body with line-separated URLs
- AC2.2.4: CSV parser handles: single column, multi-column (auto-detect URL column), headers/no headers
- AC2.2.5: URL validation: basic format check, remove empty lines, trim whitespace
- AC2.2.6: Deduplication: remove duplicate URLs within job
- AC2.2.7: Job record created in database with status "pending"
- AC2.2.8: URLs bulk inserted into database linked to job
- AC2.2.9: Response returns: job_id, url_count, duplicates_removed_count
- AC2.2.10: Large uploads (10K+ URLs) processed efficiently (<5 seconds)
- AC2.2.11: Error handling: invalid file format, no URLs found, file too large (>10MB)

### Story 2.3: Intelligent Pre-Filtering Engine
- AC2.3.1: Pre-filter service with configurable regex rules
- AC2.3.2: Default rules filter out known blog platforms, social media, e-commerce, forums, aggregators
- AC2.3.3: Each rule has reasoning logged: "REJECT - Blog platform domain"
- AC2.3.4: URLs passing pre-filter marked: "PASS - Sending to LLM"
- AC2.3.5: Pre-filtering executes in <100ms per URL
- AC2.3.6: Filter decisions logged to database (activity_logs table)
- AC2.3.7: Configuration endpoint to update rules (admin only - can be file-based for MVP)
- AC2.3.8: Metrics tracked: pre-filter pass rate, estimated cost savings

### Story 2.4: LLM Classification with Gemini Primary & GPT Fallback
- AC2.4.1: LLM service configured with Gemini 2.0 Flash (primary) and GPT-4o-mini (fallback)
- AC2.4.2: Classification prompt defined and implemented
- AC2.4.3: Gemini API called first for each URL
- AC2.4.4: GPT fallback triggered on: Gemini API error, timeout (>30s), rate limit
- AC2.4.5: Fallback logged: "GPT fallback used - Gemini timeout"
- AC2.4.6: Classification result stored: classification (SUITABLE/NOT_SUITABLE), confidence score, reasoning, provider used
- AC2.4.7: Cost calculated and stored per URL (based on token usage)
- AC2.4.8: Retry logic: 3 attempts with exponential backoff (1s, 2s, 4s) for transient errors
- AC2.4.9: Permanent failures marked: status "failed", error message stored
- AC2.4.10: Processing time tracked per URL

### Story 2.5: Worker Processing & Real-Time Updates
- AC2.5.1: BullMQ worker configured to process jobs from queue
- AC2.5.2: Worker concurrency: 5 concurrent URLs (respects ScrapingBee rate limits)
- AC2.5.3: Processing flow per URL: Fetch → Extract → Pre-filter → Classify (if PASS) → Store → Update → Log
- AC2.5.4: Database updates trigger Supabase Realtime events (dashboard listens)
- AC2.5.5: Job status auto-updates: "pending" → "processing" → "completed"
- AC2.5.6: Pause/resume support: check job status before processing next URL
- AC2.5.7: Graceful shutdown: finish current URLs before stopping
- AC2.5.8: Error handling: failed URLs don't stop job, logged with details
- AC2.5.9: ScrapingBee rate limit handling: 429 error → pause 30s, retry
- AC2.5.10: Job completion: status "completed", completion timestamp, summary stats

## Traceability Mapping

| AC ID | Spec Section | Component(s) | Test Idea |
|---|---|---|---|
| AC2.1.1-2.1.10 | Story 2.1 | `JobsModule`, `QueueModule`, `DatabaseModule`, `HealthController` | Integration: Initialize app, verify Redis connection, database tables exist, health endpoint responds |
| AC2.2.1-2.2.11 | Story 2.2 | `JobsController`, `JobsService`, CSV parser | Unit: URL validation, deduplication logic, Integration: Upload 1K URLs, verify job created, E2E: Test CSV/TXT/JSON formats |
| AC2.3.1-2.3.8 | Story 2.3 | `FilterService`, `FilterRules` | Unit: Each regex rule tested, Integration: Filter 100 URLs, verify pass rate matches expectations |
| AC2.4.1-2.4.10 | Story 2.4 | `LLMService`, `GeminiProvider`, `GPTProvider`, `CostService` | Unit: Cost calculation, Integration: Mock Gemini failure → verify GPT fallback, E2E: Real API call with test URL |
| AC2.5.1-2.5.10 | Story 2.5 | `UrlWorker`, `WorkerService`, `ScraperService` | Integration: Process single URL end-to-end, E2E: Process 10 URLs, verify results in database, Realtime events fired |

## Risks, Assumptions, Open Questions

### Risks
- **RISK-1**: ScrapingBee rate limits (10 req/sec) may cause processing slowdowns with 5 concurrent workers
  - **Mitigation**: Implement intelligent rate limiting (track requests per second), pause worker when approaching limit, retry with 429 handling

- **RISK-2**: Gemini API rate limits (15 RPM free tier) too restrictive for 10K URL batches
  - **Mitigation**: Upgrade to Gemini paid tier (300 RPM), implement request queuing, fallback to GPT more aggressively

- **RISK-3**: BullMQ Redis memory usage with 10K URL queues may exceed Railway free tier limits
  - **Mitigation**: Monitor Redis memory usage, upgrade Railway plan if needed (~$5/month), implement queue cleanup for completed jobs

- **RISK-4**: Supabase Realtime event delivery may be delayed under high write volume (20 URLs/min = 20 writes/min)
  - **Mitigation**: Batch database updates where possible (update job every 10 URLs instead of every URL), test Realtime latency under load

- **RISK-5**: LLM API costs may exceed budget ($130-150/month) if pre-filtering pass rate is higher than expected
  - **Mitigation**: Monitor actual costs in first week, adjust pre-filter rules to be more aggressive if needed, implement cost alerts

### Assumptions
- **ASSUME-1**: ScrapingBee API will successfully scrape 90%+ of URLs (accounting for 404s, timeouts)
- **ASSUME-2**: Gemini 2.0 Flash classification quality is acceptable (no need to use more expensive models)
- **ASSUME-3**: 40-60% pre-filter rejection rate is achievable with regex rules
- **ASSUME-4**: Railway managed Redis is sufficient for BullMQ queue (no custom Redis configuration needed)
- **ASSUME-5**: Supabase database can handle 10K result inserts without performance degradation
- **ASSUME-6**: No need for database migrations tool (Prisma) for MVP - SQL scripts sufficient

### Open Questions
- **Q1**: Should we implement job priority levels (e.g., urgent jobs processed first)?
  - **Decision**: No for MVP. All jobs FIFO. Defer to Phase 2.

- **Q2**: How should we handle URL redirects? Follow them or treat as separate URLs?
  - **Proposed**: ScrapingBee follows redirects automatically. Log final URL in results table.

- **Q3**: Should we implement a "dry run" mode (pre-filter only, no LLM classification)?
  - **Decision**: Yes, useful for testing filter rules. Add `dryRun: boolean` param to POST /jobs endpoint.

- **Q4**: What is the acceptable LLM API timeout before fallback?
  - **Proposed**: 30 seconds for Gemini, then fallback to GPT. If GPT also fails, mark as failed after 3 retries.

- **Q5**: Should we cache LLM classification results for duplicate URLs across different jobs?
  - **Decision**: No for MVP (adds complexity). Defer to Phase 2 with Redis caching layer.

## Test Strategy Summary

### Testing Approach
- **Unit Tests**: Jest for isolated service logic (filters, cost calculation, URL validation)
- **Integration Tests**: Test module interactions (worker → scraper → LLM → database)
- **E2E Tests**: Full job processing flow with test database and mock external APIs
- **Load Tests**: Artillery/k6 for queue performance with 1K URL batch

### Test Levels

**Unit Tests** (Jest):
- `FilterService`: Each regex rule tested independently
- `CostService`: Cost calculation formulas (Gemini vs GPT pricing)
- `JobsService`: URL validation, deduplication logic
- `LLMService`: Fallback logic (mock Gemini failure → GPT called)
- Utility functions: URL parsing, content extraction

**Integration Tests** (Jest + Test Database):
- `UrlWorker.processUrl()`: Full processing flow with mocked external APIs
- `JobsController`: Create job → verify database records
- `QueueService`: Add jobs to queue → verify worker picks them up
- Database operations: Insert/update/query with test Supabase instance

**E2E Tests** (Jest + Test Database + Mock APIs):
1. **Happy Path**: Create job with 10 URLs → Process all → Verify results in database
2. **Pre-Filter**: Submit 50 URLs (25 should be filtered) → Verify 25 classifications, 25 rejections
3. **LLM Fallback**: Mock Gemini timeout → Verify GPT called, cost correctly calculated
4. **Job Controls**: Create job → Pause mid-processing → Verify stops → Resume → Completes
5. **Error Handling**: Mock ScrapingBee 429 → Verify retry with backoff → Success on retry 2

**Load Tests** (Artillery):
- Submit 1K URL job → Monitor processing rate, queue depth, memory usage
- Target: Complete in <1 hour, no worker crashes, Redis memory <500MB

### Coverage Targets
- **Unit Test Coverage**: >85% for services, utilities
- **Integration Test Coverage**: All API endpoints, all worker processing steps
- **E2E Test Coverage**: All 5 user stories have at least 1 E2E test

### Test Data Strategy
- **Mock URLs**: 100 test URLs across different categories (blog platforms, social media, valid targets, 404s)
- **Mock ScrapingBee Responses**: Predefined HTML content for classification testing
- **Mock LLM Responses**: Predefined suitable/not_suitable responses for deterministic testing
- **Test Database**: Separate Supabase project for testing (isolated from production)

### External API Mocking
- **ScrapingBee**: Mock with `nock` (intercept HTTP requests), return predefined HTML
- **Gemini API**: Mock with `nock`, test both success and failure scenarios
- **GPT API**: Mock with `nock`, verify fallback triggered correctly
- **Supabase Realtime**: Test with real Supabase test project (Realtime hard to mock effectively)

### Performance Testing
- **Queue Performance**: Verify BullMQ processes 20 URLs/min minimum
- **Database Write Performance**: Verify <200ms per insert/update under load
- **Memory Usage**: Monitor NestJS app memory <512MB, Redis <500MB during 10K URL job
- **API Response Times**: Health check <2s, job creation <500ms, job status <300ms

---

## Post-Review Follow-ups

### Story 2.5 Review Action Items (2025-10-15)

**Critical Production Readiness Issues:**

1. **[HIGH] Complete Graceful Shutdown Implementation** - Story 2.5 worker doesn't actually wait for jobs to finish on shutdown. Must call `await this.worker.close()` in `onModuleDestroy()` to prevent Railway deployments from interrupting mid-processing URLs. See ISSUE-1 in Story 2.5 review.

2. **[HIGH] Add Environment Variable Validation at Startup** - Application starts successfully but fails at runtime when processing jobs if environment variables are missing. Must validate SCRAPINGBEE_API_KEY, GEMINI_API_KEY, OPENAI_API_KEY, REDIS_URL, SUPABASE_URL before `app.listen()`. See ISSUE-2 in Story 2.5 review.

3. **[HIGH] Enable NestJS Shutdown Hooks** - Must call `app.enableShutdownHooks()` in main.ts for Railway SIGTERM handling. Without this, graceful shutdown won't work. See ISSUE-4 in Story 2.5 review.

**High Priority for Production:**

4. **[MED] Implement Pause/Resume Database Updates** - QueueService pause/resume methods are stubbed with console.log. Dashboard pause/resume buttons won't work without Supabase client updates to jobs table. See ISSUE-3 in Story 2.5 review.

5. **[MED] Add Supabase Realtime Integration Test** - AC2.5.4 requires verification that Realtime events fire on database updates, but no integration test exists. Need test with test Supabase project. See ISSUE-5 in Story 2.5 review.

**Technical Debt:**

6. Make worker concurrency configurable via environment variable (CODE-1)
7. Consolidate retry logic to shared utility to eliminate duplication (CODE-3)
8. Replace console.log with Logger service in QueueService (CODE-2)

_All action items tracked in docs/backlog.md and Story 2.5 tasks section._

---

### Story 2.3-refactored Review Action Items (2025-10-16)

**Critical Integration Issues (BLOCKING):**

1. **[HIGH] Register Layer1DomainAnalysisService in JobsModule** - Service not registered in any NestJS module providers array. Will never be instantiated by dependency injection, making all implementation code unreachable. Must add to apps/api/src/jobs/jobs.module.ts providers and exports. See Action Item #1 in Story 2.3-refactored review.

2. **[HIGH] Integrate Layer1DomainAnalysisService into Worker Pipeline** - No code calls analyzeUrl() from URL processing worker. Service exists in isolation but is never invoked during actual URL processing. Must inject into worker and call before scraping. See Action Item #2 in Story 2.3-refactored review.

3. **[HIGH] Verify Database Migration Applied to Supabase** - Migration file exists but no evidence of application to production database. Runtime errors will occur when code attempts to persist elimination_layer, layer1_reasoning fields. Must run supabase db push and verify. See Action Item #3 in Story 2.3-refactored review.

4. **[HIGH] Fix Configuration File Path Resolution for Production** - File path uses __dirname which may fail in Railway production builds. Service will fail-open and eliminate cost savings. Must use ConfigModule and copy config to dist/ during build. See Action Item #4 in Story 2.3-refactored review.

**High Priority:**

5. **[MED] Add Integration Tests** - Only unit tests exist; no tests verify Layer 1 service works with JobsModule, worker, or database persistence. See Action Item #5 in Story 2.3-refactored review.

6. **[MED] Implement Safe-Regex Validation** - AC1 requires safe-regex validation but implementation lacks this security feature. Malformed patterns could cause ReDoS vulnerabilities. See Action Item #6 in Story 2.3-refactored review.

7. **[MED] Regenerate Story Context** - Current context describes original PreFilterService, not refactored Layer1DomainAnalysisService. Future developers will get outdated information. See Action Item #7 in Story 2.3-refactored review.

_All action items tracked in docs/backlog.md and Story 2.3-refactored tasks section._

---

**Status**: Draft
**Next Steps**: **BLOCKED** - Story 2.3-refactored requires 4 CRITICAL integration fixes before service becomes functional. Story 2.5 also requires critical fixes (graceful shutdown, env validation) before production deployment.
