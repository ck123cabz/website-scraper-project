# Website Scraper Platform - Epic Breakdown

**Author:** CK
**Date:** 2025-10-13
**Project Level:** Level 2 - Small Complete System
**Target Scale:** 1-2 epics, 5-15 stories, 8-12 week timeline

---

## Epic Overview

This Level 2 project focuses on modernizing an existing Python scraper into a production-ready NestJS platform with **PRIMARY emphasis on real-time UI/UX transparency**. The two epics are designed for overlapping development: Epic 1 (Dashboard) begins first to establish UI foundation, Epic 2 (Pipeline) builds backend in parallel.

**Total Stories:** 15 stories across 3 epics
**Estimated Timeline:** 12-14 weeks
**Key Constraint:** Solo developer with AI assistance, no authentication required

---

## Epic Details

## Epic 1: Real-Time Transparency Dashboard

**Epic Goal:** Create comprehensive real-time monitoring dashboard where multiple team members can simultaneously view scraping operations with live logs, progress indicators, current URL display, and historical results - providing complete transparency into system operations.

**Priority:** P0 (Must Have)
**Timeline:** Weeks 1-6
**Story Count:** 7 stories
**Story Points:** ~21 points

**Why This Epic Matters:**
This is the PRIMARY differentiator from the old Python system. Team needs visibility into operations - not just final results. Real-time transparency enables team collaboration, faster debugging, and trust in the system.

**Technical Foundation:**
- React + TypeScript + shadcn/ui
- Supabase Realtime subscriptions for live updates
- WebSocket connections for log streaming
- Optimistic UI updates for responsive feel

---

### Story 1.1: Job Dashboard Foundation

**As a** team member
**I want to** see a clean dashboard showing all current and past scraping jobs
**So that** I can quickly understand system state and access any job

**Acceptance Criteria:**
- [ ] Dashboard displays list of all jobs (active, paused, completed)
- [ ] Each job card shows: name, status badge, start time, progress percentage, URL count
- [ ] Active jobs appear at top with visual distinction (color, animation)
- [ ] Clicking job card navigates to detailed job view
- [ ] "New Job" button prominently displayed (primary CTA)
- [ ] Empty state shown when no jobs exist with helpful onboarding message
- [ ] Dashboard updates automatically when job status changes (via Supabase Realtime)

**Story Points:** 3
**Dependencies:** None (foundation story)

---

### Story 1.2: Live Progress Tracking

**As a** team member
**I want to** see real-time progress indicators for active jobs
**So that** I can monitor processing without refreshing or wondering if system is working

**Acceptance Criteria:**
- [ ] Progress bar shows percentage complete (0-100%) updating in real-time
- [ ] Counter displays: "Processed: X / Y URLs"
- [ ] Processing rate displayed: "XX URLs/min" (calculated from recent throughput)
- [ ] Time indicators: "Elapsed: HH:MM:SS" and "Est. Remaining: HH:MM:SS"
- [ ] Success/failure counters: "Success: X | Failed: Y"
- [ ] All metrics update every 1-2 seconds via Supabase subscription
- [ ] Visual "pulse" indicator shows system is actively processing
- [ ] Progress bar color changes based on success rate (green >95%, yellow >80%, red <80%)

**Story Points:** 3
**Dependencies:** Story 1.1

---

### Story 1.3: Current URL Display Panel

**As a** team member
**I want to** see exactly which URL is currently being processed with its status
**So that** I can track progress at granular level and identify any stuck URLs

**Acceptance Criteria:**
- [ ] Dedicated panel shows: "Currently Processing: [URL]"
- [ ] Processing stage displayed: "Stage: Fetching | Filtering | Classifying"
- [ ] Stage indicator uses visual icons (spinner, filter icon, AI icon)
- [ ] Time on current URL displayed: "Processing for: XX seconds"
- [ ] Previous 3 URLs shown below current with final status (✓ or ✗)
- [ ] URL truncated if too long with tooltip showing full URL
- [ ] Panel updates immediately when URL changes (<500ms latency)
- [ ] Empty state: "Waiting to start..." when job paused or not started

**Story Points:** 2
**Dependencies:** Story 1.2

---

### Story 1.4: Live Activity Log Streaming

**As a** team member
**I want to** see a live scrolling log of all system activities
**So that** I can understand exactly what's happening and debug issues in real-time

**Acceptance Criteria:**
- [ ] Scrollable log panel displays activity feed with auto-scroll to latest
- [ ] Each log entry shows: timestamp, severity icon, message
- [ ] Severity levels: SUCCESS (✓ green), INFO (ℹ blue), WARNING (⚠ yellow), ERROR (✗ red)
- [ ] Log entries include:
  - URL fetch started/completed
  - Pre-filter decisions with reasoning ("PASS - Sending to LLM", "REJECT - Blog platform")
  - LLM API calls ("Gemini classification: SUITABLE (score: 0.87)")
  - Errors with details ("ScrapingBee 429 - Rate limit, retrying in 30s")
  - Cost updates ("$0.045 - GPT fallback used")
- [ ] Logs stream in real-time with <1 second latency
- [ ] Auto-scroll can be paused by user scroll, resume with "Jump to latest" button
- [ ] Log entries persist during session, cleared when job completed and viewed
- [ ] Filter controls: "Show: All | Errors Only | Info Only"

**Story Points:** 5
**Dependencies:** Story 1.3

---

### Story 1.5: Cost Tracking Display

**As a** team member
**I want to** see real-time cost tracking for LLM API usage
**So that** I can monitor budget and understand cost per job

**Acceptance Criteria:**
- [ ] Cost panel displays: "Total Cost: $XX.XX"
- [ ] Cost per URL displayed: "$X.XXXXX/URL"
- [ ] Provider breakdown: "Gemini: $XX.XX | GPT: $XX.XX"
- [ ] Projected total cost: "Projected: $XX.XX" (based on remaining URLs × avg cost/URL)
- [ ] Savings indicator: "40% saved vs GPT-only" (if pre-filtering working)
- [ ] Cost updates in real-time as URLs processed
- [ ] Historical job costs shown in job list
- [ ] Warning shown if projected cost exceeds $50 (configurable threshold)

**Story Points:** 3
**Dependencies:** Story 1.2

---

### Story 1.6: Historical Results Table

**As a** team member
**I want to** view searchable table of all processed URLs with results
**So that** I can review classifications and reference past results

**Acceptance Criteria:**
- [ ] Data table shows columns: URL, Status, Classification, Score, Cost, Processing Time, Timestamp
- [ ] Table supports sorting by any column (ascending/descending)
- [ ] Search/filter bar: search by URL text
- [ ] Filter dropdowns: Status (All | Success | Failed), Classification (All | SUITABLE | NOT_SUITABLE)
- [ ] Pagination: 50 results per page with page controls
- [ ] Table updates in real-time as new URLs processed
- [ ] Row click expands to show: full URL, classification reasoning, API calls made, error details (if failed)
- [ ] "Export" button to download filtered results
- [ ] Table persists across page refreshes (data from Supabase)

**Story Points:** 4
**Dependencies:** Story 1.4

---

### Story 1.7: Job Control Actions

**As a** team member
**I want to** pause, resume, or cancel active jobs
**So that** I can control processing and respond to issues

**Acceptance Criteria:**
- [ ] Control buttons displayed for active jobs: "Pause", "Cancel"
- [ ] Paused jobs show: "Resume", "Cancel"
- [ ] Pause button immediately stops processing new URLs (current URL completes)
- [ ] UI updates to "Paused" state instantly with optimistic update
- [ ] Resume button continues from last processed URL
- [ ] Cancel button shows confirmation: "Cancel job? Processed results will be saved."
- [ ] Cancelled jobs marked as "Cancelled" with results preserved
- [ ] All control actions broadcast via Supabase - all connected users see state change
- [ ] Disabled states: can't pause/resume when system is already transitioning
- [ ] Tooltips explain what each action does

**Story Points:** 3
**Dependencies:** Story 1.1, 1.2

---

## Epic 2: Production-Grade Processing Pipeline

**Epic Goal:** Implement robust NestJS + BullMQ queue architecture with intelligent pre-filtering, cost-optimized LLM classification (Gemini primary, GPT fallback), and reliable job processing with automatic retries and persistence.

**Priority:** P0 (Must Have)
**Timeline:** Weeks 3-8 (overlaps with Epic 1 after UI foundation)
**Story Count:** 5 stories
**Story Points:** ~18 points

**Why This Epic Matters:**
Replaces basic Python threading with production-grade queue system. Enables scalability, reliability, cost optimization through pre-filtering, and proper error handling. Foundation for all processing features.

**Technical Foundation:**
- NestJS + TypeScript backend
- BullMQ + Redis for job queue
- Supabase PostgreSQL for persistence
- ScrapingBee API for scraping
- Gemini 2.0 Flash + GPT-4o-mini APIs

---

### Story 2.1: NestJS Backend Foundation & Job Queue Setup

**As a** developer
**I want to** set up NestJS backend with BullMQ queue integration
**So that** we have production-grade architecture for job processing

**Acceptance Criteria:**
- [ ] NestJS application initialized with TypeScript
- [ ] BullMQ configured with Redis connection (Railway managed Redis)
- [ ] Job queue created: "url-processing-queue"
- [ ] Bull Board dashboard configured for dev monitoring (at /admin/queues)
- [ ] Supabase client configured with environment variables
- [ ] Database tables created:
  - `jobs` (id, status, created_at, updated_at, url_count, processed_count, etc.)
  - `urls` (id, job_id, url, status, classification, cost, processing_time, etc.)
  - `logs` (id, job_id, timestamp, severity, message)
- [ ] Health check endpoint: GET /health
- [ ] Basic job endpoints: POST /jobs (create), GET /jobs/:id (status)
- [ ] Deployed to Railway with auto-deployment on git push
- [ ] Environment variables configured in Railway

**Story Points:** 5
**Dependencies:** None (foundation story for Epic 2)

---

### Story 2.2: Bulk URL Upload & Job Creation

**As a** team member
**I want to** upload URLs via file or textarea and create scraping job
**So that** I can start processing my URL list

**Acceptance Criteria:**
- [ ] POST /jobs/create endpoint accepts:
  - File upload (CSV, TXT) via multipart/form-data
  - JSON body with `urls` array
  - Text body with line-separated URLs
- [ ] CSV parser handles: single column, multi-column (auto-detect URL column), headers/no headers
- [ ] URL validation: basic format check, remove empty lines, trim whitespace
- [ ] Deduplication: remove duplicate URLs within job
- [ ] Job record created in database with status "pending"
- [ ] URLs bulk inserted into database linked to job
- [ ] Response returns: job_id, url_count, duplicates_removed_count
- [ ] Large uploads (10K+ URLs) processed efficiently (<5 seconds)
- [ ] Error handling: invalid file format, no URLs found, file too large (>10MB)

**Story Points:** 3
**Dependencies:** Story 2.1

---

### Story 2.3: Intelligent Pre-Filtering Engine

**As a** system
**I want to** filter URLs before sending to LLM using regex patterns
**So that** we reduce LLM API costs by 40-60%

**Acceptance Criteria:**
- [ ] Pre-filter service with configurable regex rules
- [ ] Default rules filter out:
  - Known blog platforms: `wordpress.com/*/`, `blogspot.com`, `medium.com/@*`, `substack.com`
  - Social media: `facebook.com`, `twitter.com`, `linkedin.com/in/`
  - E-commerce: `amazon.com`, `ebay.com`, `shopify.com`
  - Forums: `reddit.com`, `quora.com`
  - Large aggregators: `wikipedia.org`, `youtube.com`
- [ ] Each rule has reasoning logged: "REJECT - Blog platform domain"
- [ ] URLs passing pre-filter marked: "PASS - Sending to LLM"
- [ ] Pre-filtering executes in <100ms per URL
- [ ] Filter decisions logged to database
- [ ] Configuration endpoint to update rules (admin only - can be file-based for MVP)
- [ ] Metrics tracked: pre-filter pass rate, estimated cost savings

**Story Points:** 3
**Dependencies:** Story 2.2

---

### Story 2.4: LLM Classification with Gemini Primary & GPT Fallback

**As a** system
**I want to** classify URLs using Gemini primary and GPT fallback
**So that** we get reliable classifications at lowest cost

**Acceptance Criteria:**
- [ ] LLM service configured with:
  - Primary: Google Gemini 2.0 Flash API
  - Fallback: OpenAI GPT-4o-mini API
- [ ] Classification prompt: "Analyze this website content and determine if it accepts guest posts. Consider: author bylines, guest post guidelines, contributor sections, writing opportunities pages. Respond with JSON: {suitable: boolean, confidence: 0-1, reasoning: string}"
- [ ] Gemini API called first for each URL
- [ ] GPT fallback triggered on: Gemini API error, timeout (>30s), rate limit
- [ ] Fallback logged: "GPT fallback used - Gemini timeout"
- [ ] Classification result stored: classification (SUITABLE/NOT_SUITABLE), confidence score, reasoning, provider used
- [ ] Cost calculated and stored per URL (based on token usage)
- [ ] Retry logic: 3 attempts with exponential backoff (1s, 2s, 4s) for transient errors
- [ ] Permanent failures marked: status "failed", error message stored
- [ ] Processing time tracked per URL

**Story Points:** 5
**Dependencies:** Story 2.3

---

### Story 2.5: Worker Processing & Real-Time Updates

**As a** system
**I want to** process URLs via BullMQ workers with real-time database updates
**So that** dashboard shows live progress and logs

**Acceptance Criteria:**
- [ ] BullMQ worker configured to process jobs from queue
- [ ] Worker concurrency: 5 concurrent URLs (respects ScrapingBee rate limits)
- [ ] Processing flow per URL:
  1. Fetch URL via ScrapingBee API (with JS rendering)
  2. Extract content (title, meta description, body text)
  3. Run pre-filter rules
  4. If PASS: Call LLM classification
  5. Store result in database
  6. Update job progress counters
  7. Insert log entries
- [ ] Database updates trigger Supabase Realtime events (dashboard listens)
- [ ] Job status auto-updates: "pending" → "processing" → "completed"
- [ ] Pause/resume support: check job status before processing next URL
- [ ] Graceful shutdown: finish current URLs before stopping
- [ ] Error handling: failed URLs don't stop job, logged with details
- [ ] ScrapingBee rate limit handling: 429 error → pause 30s, retry
- [ ] Job completion: status "completed", completion timestamp, summary stats

**Story Points:** 5
**Dependencies:** Story 2.4

---

## Epic 3: Local Testing & Production Deployment

**Epic Goal:** Enable user configuration of classification parameters, validate complete system functionality through comprehensive local end-to-end testing with real external APIs, then deploy to Railway production environment with proper configuration, monitoring, and production validation.

**Priority:** P0 (Must Have - blocks production launch)
**Timeline:** Weeks 13-15 (after Epic 2 completion)
**Story Count:** 4 stories
**Story Points:** ~17 points

**Why This Epic Matters:**
MVP implementation (Epic 1 & 2) is code-complete but untested with real external services and not deployed to production. This epic ensures the system works end-to-end with actual APIs (ScrapingBee, Gemini, GPT, Supabase Realtime) in local environment before deploying to Railway, then validates production deployment. Without this epic, the team cannot use the system for actual work.

**Technical Foundation:**
- Local testing with real API credentials
- Chrome DevTools MCP for UI testing and validation
- Railway MCP for automated deployment
- Supabase MCP for database validation
- Production environment configuration and secrets management
- Health checks and monitoring setup

---

### Story 3.0: Classification Settings Management

**As a** team member
**I want to** configure classification parameters through a settings UI
**So that** I can optimize pre-filtering and LLM classification without code changes

**Acceptance Criteria:**

**Backend - Settings Persistence:**
- [ ] Database table created: `classification_settings` with fields:
  - id (UUID, primary key)
  - prefilter_rules (JSONB) - array of {category, pattern, reasoning, enabled}
  - classification_indicators (JSONB) - array of indicator strings
  - llm_temperature (decimal, 0-1, default 0.3)
  - confidence_threshold (decimal, 0-1, default 0.0)
  - content_truncation_limit (integer, default 10000)
  - updated_at (timestamp)
- [ ] GET /api/settings endpoint returns current settings (with defaults if none exist)
- [ ] PUT /api/settings endpoint updates settings with validation
- [ ] Settings validation: regex patterns checked with safe-regex, temperature/confidence 0-1 range
- [ ] Migration created to seed default settings from current hardcoded values

**Backend - Service Integration:**
- [ ] PreFilterService refactored to load rules from database (fallback to defaults if DB unavailable)
- [ ] LLMService refactored to build prompt from database indicators (fallback to defaults)
- [ ] LLMService uses temperature from settings
- [ ] Classification results filtered by confidence_threshold setting
- [ ] Settings cached in-memory with TTL, refreshed on PUT

**Frontend - Settings UI:**
- [ ] Settings page accessible from dashboard navigation ("Settings" link in header)
- [ ] Form sections: (1) Pre-filter Rules, (2) Classification Indicators, (3) LLM Parameters, (4) Confidence Threshold
- [ ] Pre-filter rules: Expandable list with enable/disable toggles, edit pattern/reasoning, add new rule, delete rule
- [ ] Classification indicators: Multi-line textarea with one indicator per line
- [ ] LLM parameters: Temperature slider (0-1, step 0.1), content limit input (1000-50000)
- [ ] Confidence threshold: Slider (0-1, step 0.05) with explanation text
- [ ] "Save Settings" button with optimistic UI update
- [ ] "Reset to Defaults" button with confirmation dialog
- [ ] Form validation: Invalid regex shows error, temperature/confidence range validated
- [ ] Success/error toast notifications on save

**Testing:**
- [ ] Unit tests: Settings service CRUD operations
- [ ] Integration tests: Services use database settings correctly
- [ ] E2E test: Update settings via UI, create job, verify new settings applied to classification
- [ ] Test fallback behavior: Settings service unavailable → uses hardcoded defaults

**Story Points:** 5
**Dependencies:** Story 2.5 complete (requires existing classification services)

---

### Story 3.1: Local End-to-End Testing with Real APIs

**As a** developer
**I want to** test the complete system locally with real external APIs
**So that** I can verify all integrations work before deploying to production

**Acceptance Criteria:**
- [ ] Environment configured with real API keys: SCRAPINGBEE_API_KEY, GEMINI_API_KEY, OPENAI_API_KEY
- [ ] Local Redis running and connected to BullMQ queue
- [ ] Local Supabase instance configured with Realtime enabled
- [ ] Test job created with 10-20 real URLs spanning different site types (blogs, news, social media, e-commerce, forums)
- [ ] Worker processes URLs successfully: ScrapingBee fetches content, pre-filter rules applied, LLM classification executes
- [ ] Gemini primary usage verified with successful classifications
- [ ] GPT fallback tested by temporarily disabling Gemini or triggering timeout
- [ ] Pre-filter correctly rejects known platforms (WordPress, Medium, social media) - 40-60% rejection rate
- [ ] Supabase Realtime events firing: job updates, result inserts, activity log streaming
- [ ] Dashboard updates in real-time: progress bars, current URL, live logs, cost tracking, results table
- [ ] Job controls tested: pause job mid-processing, resume successfully, verify state persistence
- [ ] Cost tracking validated: Gemini vs GPT costs calculated correctly, projected costs accurate
- [ ] Error handling tested: API timeouts, rate limits (429), failed URLs don't crash job
- [ ] Chrome DevTools MCP used to verify UI: screenshot dashboard, test button clicks, verify real-time updates
- [ ] All acceptance criteria from Epic 1 & 2 validated end-to-end in local environment

**Story Points:** 5
**Dependencies:** Story 2.5 complete

---

### Story 3.2: Railway Production Deployment & Configuration

**As a** developer
**I want to** deploy the application to Railway production environment
**So that** the team can use the system for actual URL classification work

**Acceptance Criteria:**
- [ ] Railway project created and linked to GitHub repository
- [ ] Railway services configured: NestJS API, Redis (managed), Frontend (if applicable)
- [ ] Supabase production database configured with proper schema (migrations applied)
- [ ] Environment variables configured in Railway:
  - SCRAPINGBEE_API_KEY (production credits)
  - GEMINI_API_KEY (production quota)
  - OPENAI_API_KEY (production tier)
  - REDIS_URL (Railway managed Redis)
  - DATABASE_URL (Supabase production)
  - SUPABASE_URL, SUPABASE_SERVICE_KEY
- [ ] Railway auto-deploy configured: git push to main triggers deployment
- [ ] Build succeeds in Railway environment (nixpacks.toml configuration verified)
- [ ] Health check endpoint accessible: GET /health returns 200
- [ ] Application starts successfully with all services connected (database, Redis, Supabase)
- [ ] Environment validation runs at startup: fails fast if required env vars missing
- [ ] Railway logs accessible and structured (Pino logger output in JSON format)
- [ ] Domain generated for API access (Railway provided domain or custom domain)
- [ ] CORS configured for production domain
- [ ] Graceful shutdown tested: Railway SIGTERM handling verified (deploys don't interrupt mid-processing)

**Story Points:** 4
**Dependencies:** Story 3.1 complete

---

### Story 3.3: Production Validation & Monitoring Setup

**As a** developer
**I want to** validate production deployment and set up monitoring
**So that** I can ensure system reliability and quickly identify issues

**Acceptance Criteria:**
- [ ] Production smoke test: Create job with 5 URLs, verify complete processing end-to-end
- [ ] Supabase Realtime validated in production: events firing correctly to dashboard
- [ ] Dashboard tested in production: all real-time features working (progress, logs, cost tracking)
- [ ] ScrapingBee production API verified: successful fetches, rate limits respected
- [ ] Gemini production API tested: classifications working, costs tracked accurately
- [ ] GPT fallback verified in production environment
- [ ] Worker concurrency performing as expected: 20 URLs/min target met
- [ ] Database performance validated: <200ms insert/update latency
- [ ] Railway metrics reviewed: memory usage stable (<512MB), CPU usage normal
- [ ] Railway logs validated: structured logs accessible, no critical errors
- [ ] Error scenarios tested: API failures handled gracefully, retry logic working
- [ ] Job pause/resume tested in production environment
- [ ] Cost tracking validated: real production costs match projections
- [ ] Health check endpoint monitored (set up uptime monitoring if needed)
- [ ] Production deployment runbook documented (deployment steps, rollback procedure, common issues)
- [ ] Team access verified: multiple users can access dashboard simultaneously and see same real-time state

**Story Points:** 3
**Dependencies:** Story 3.2 complete

---

## Out of Scope (Phase 2)

Features explicitly deferred to future phases:

**Phase 2 Features:**
- Scheduled jobs (cron-based execution)
- API access (REST API for external tools)
- Advanced filtering (ML-based pre-filtering)
- Email/webhook notifications on completion
- User authentication and multi-tenancy (separate workspaces)
- Excel export format (CSV and JSON are MVP)
- Bulk edit URLs (remove, re-process selected URLs)
- Custom classification prompts (currently fixed prompt)
- Historical job comparison ("Compare Job A vs Job B")
- Advanced analytics dashboard (charts, trends over time)

---

## Epic Sequencing & Timeline

**Weeks 1-2:** Epic 1 Stories 1.1, 1.2, 1.3 (Dashboard foundation + progress tracking)
**Weeks 3-4:** Epic 2 Stories 2.1, 2.2 (Backend setup + URL upload)
**Weeks 5-6:** Epic 1 Stories 1.4, 1.5, 1.6 (Logs, costs, results table) + Epic 2 Story 2.3 (Pre-filtering)
**Weeks 7-8:** Epic 2 Stories 2.4, 2.5 (LLM classification + worker processing)
**Weeks 9-10:** Epic 1 Story 1.7 (Job controls) + Integration testing
**Weeks 11-12:** Bug fixes, polish, final Epic 2 integration testing ✅ COMPLETE
**Week 13:** Epic 3 Story 3.1 (Local E2E testing with real APIs) 🔄 NEXT
**Week 14:** Epic 3 Stories 3.2, 3.3 (Railway deployment + production validation)

**Total Estimated Effort:** 51 story points (~12-14 weeks for solo developer with AI assistance)

---

## Success Criteria

**MVP is considered successful when:**
- ✅ Team can upload 5K+ URLs and start processing (Epic 2 ✅)
- ✅ Dashboard shows real-time progress with <1s latency (Epic 1 ✅)
- ✅ Live logs stream all processing activities (Epic 1 ✅)
- ✅ Multiple team members can view same job simultaneously (Epic 1 ✅)
- ✅ LLM costs reduced by 40%+ through pre-filtering (Epic 2 ✅)
- ✅ Jobs complete reliably with <5% failure rate (Epic 2 ✅)
- ✅ Results exportable to CSV/JSON (Epic 1 ✅)
- [ ] Local E2E testing passes with real APIs (ScrapingBee, Gemini, GPT) (Epic 3 🔄)
- [ ] Application deployed successfully to Railway production (Epic 3 🔄)
- [ ] Production validation complete: 5+ URL batch processed successfully (Epic 3 🔄)
- [ ] Monitoring and health checks operational (Epic 3 🔄)
- [ ] Team can access production dashboard and create jobs (Epic 3 🔄)

---

_This epic breakdown provides clear implementation path for Level 2 project, emphasizing UI/UX transparency while building production-grade backend._
