# Website Scraper Platform - Architecture Summary

**Quick Reference** | **Last Updated:** 2025-10-16

This is a lightweight architecture summary for quick reference during story development. For comprehensive details, see [solution-architecture.md](./solution-architecture.md).

---

## Overview

The Website Scraper Platform is a **Level 2 (Small Complete System)** real-time web application that processes large batches of URLs through an automated scraping and classification pipeline. The system provides transparency through live progress tracking, activity logs, and cost monitoring.

**Architecture Pattern:** Monolith + Monorepo
- **Monolith Backend:** Single NestJS application with BullMQ job queue (optimal for solo developer)
- **Monorepo Structure:** Turborepo managing frontend (Next.js), backend (NestJS), and shared packages (Zod schemas)
- **Real-Time Strategy:** Supabase Realtime for collaborative dashboard updates via PostgreSQL change streams

The platform is designed for beginner developers with zero DevOps experience, using managed services (Railway, Supabase) and AI-assistant-friendly tools.

---

## Tech Stack

### Frontend
- **Framework:** Next.js 14+ (App Router, React Server Components)
- **UI Library:** shadcn/ui (New York style, Zinc base)
- **Styling:** Tailwind CSS
- **State Management:** Zustand (client state) + TanStack Query (server state)
- **Form/Validation:** React Hook Form + Zod
- **Real-Time:** Supabase Realtime subscriptions via WebSocket
- **Icons:** Lucide React
- **Notifications:** Sonner toast
- **Testing:** Vitest + React Testing Library

### Backend
- **Framework:** NestJS + TypeScript
- **Task Queue:** BullMQ + Redis (Railway managed)
- **Database:** Supabase (PostgreSQL + Realtime, NO Auth)
- **Validation:** Zod via nestjs-zod
- **Logging:** Pino via nestjs-pino
- **API Docs:** OpenAPI/Swagger (built-in)
- **Testing:** Jest + Supertest

### Infrastructure
- **Monorepo:** Turborepo
- **Deployment:** Railway (automatic deployments, zero config)
- **Redis:** Railway managed service
- **Database:** Supabase Cloud (managed PostgreSQL)
- **Queue Monitoring:** Bull Board

### External Services
- **Web Scraping:** ScrapingBee API (250K credits/month)
- **LLM Primary:** Google Gemini 2.0 Flash
- **LLM Fallback:** OpenAI GPT-4o-mini

---

## Architecture Pattern

### Monorepo Structure
```
website-scraper-project/
├── apps/
│   ├── web/              # Next.js frontend (Railway)
│   └── api/              # NestJS backend (Railway)
├── packages/
│   └── shared/           # Shared Zod schemas & types
└── turbo.json            # Turborepo configuration
```

### Monolith Benefits
- **Simplicity:** Single backend codebase, single deployment
- **Solo-Friendly:** No microservice complexity, no service mesh
- **Rapid Development:** Direct function calls, no inter-service protocols
- **Cost-Effective:** Single Railway service ($5-20/month)

### Real-Time via Supabase
- **PostgreSQL Triggers** → Supabase Realtime → WebSocket → Frontend
- **Zero Backend Code:** No custom WebSocket server required
- **Automatic Scaling:** Supabase handles connection pooling

---

## Key Components

### Frontend Components (Next.js)
```
app/
├── layout.tsx                 # Root layout with providers
├── page.tsx                   # Dashboard (main view)
└── components/
    ├── job-card.tsx          # Active job status display
    ├── job-detail-client.tsx # Job detail view
    ├── job-list.tsx          # Job history table
    ├── live-activity-log.tsx # Real-time log stream
    ├── log-entry.tsx         # Individual log line
    ├── cost-tracker.tsx      # LLM cost display
    ├── current-url-panel.tsx # Current processing URL
    └── ui/                   # shadcn/ui primitives
```

**Key Hooks:**
- `use-jobs.ts` - TanStack Query for job data
- `use-activity-logs.ts` - Real-time log subscription
- `use-current-url-timer.ts` - URL processing timer

### Backend Modules (NestJS)
```
src/
├── jobs/
│   ├── jobs.controller.ts    # REST API endpoints
│   └── jobs.service.ts       # Job CRUD + queue management
├── processing/
│   ├── processing.queue.ts   # BullMQ queue definition
│   ├── processing.worker.ts  # URL task consumer (orchestrates 3-tier flow)
│   └── processing.service.ts # Orchestrates URL processing
├── scraping/
│   └── scraping.service.ts   # ScrapingBee integration
├── classification/
│   ├── layer1-domain-analysis.service.ts  # Layer 1: Domain/URL filtering (no HTTP)
│   ├── layer2-operational-filter.service.ts # Layer 2: Homepage scraping + validation
│   ├── classification.service.ts         # Layer 3: LLM orchestrator + confidence scoring
│   ├── manual-review-router.service.ts   # Routes medium-confidence to manual review
│   ├── prefilter.service.ts              # [REFACTORED] Logic moved to Layer 1
│   ├── gemini.service.ts                 # Gemini API client
│   └── gpt.service.ts                    # GPT API client
├── logs/
│   └── logs.service.ts       # Activity log writes
└── results/
    ├── results.controller.ts # Results API + manual review endpoints
    └── results.service.ts    # Results CRUD + export
```

---

## Database Schema

### Core Tables (Supabase PostgreSQL)

**`jobs` table** - Scraping job metadata (Realtime enabled)
- `id` (UUID, PK), `name` (VARCHAR), `status` (enum: pending/processing/paused/completed/failed)
- `total_urls`, `processed_urls`, `successful_urls`, `failed_urls`, `rejected_urls`
- `current_url` (TEXT), `current_stage` (enum: fetching/filtering/classifying)
- `progress_percentage` (DECIMAL), `processing_rate` (URLs/min), `estimated_time_remaining` (seconds)
- `total_cost`, `gemini_cost`, `gpt_cost` (DECIMAL, USD)
- `started_at`, `completed_at`, `created_at`, `updated_at` (TIMESTAMP)
- **NEW:** `layer1_eliminated_count` (INTEGER) - URLs eliminated at Layer 1
- **NEW:** `layer2_eliminated_count` (INTEGER) - URLs eliminated at Layer 2
- **NEW:** `scraping_cost` (DECIMAL) - ScrapingBee API costs
- **NEW:** `estimated_savings` (DECIMAL) - Cost savings from progressive filtering
- **NEW:** `current_layer` (INTEGER: 1/2/3) - Current processing layer

**`results` table** - Individual URL results (Realtime enabled)
- `id` (UUID, PK), `job_id` (UUID, FK → jobs)
- `url` (TEXT), `status` (enum: success/rejected/failed)
- `classification_result` (enum: suitable/not_suitable/rejected_prefilter)
- `classification_score` (DECIMAL 0-1), `classification_reasoning` (TEXT)
- `llm_provider` (enum: gemini/gpt/none), `llm_cost` (DECIMAL)
- `processing_time_ms`, `retry_count`, `error_message`
- `processed_at`, `created_at` (TIMESTAMP)
- **NEW:** `elimination_layer` (ENUM: none/layer1/layer2/layer3) - Which layer eliminated URL
- **NEW:** `manual_review_required` (BOOLEAN) - Flagged for manual review
- **NEW:** `confidence_band` (ENUM: high/medium/low/auto_reject) - Confidence classification
- **NEW:** `layer1_reasoning` (TEXT) - Layer 1 elimination reasoning
- **NEW:** `layer2_signals` (JSONB) - Layer 2 operational signals (blog freshness, tech stack, etc.)

**`activity_logs` table** - Activity log entries (Realtime enabled)
- `id` (UUID, PK), `job_id` (UUID, FK → jobs)
- `severity` (enum: success/info/warning/error)
- `message` (TEXT), `context` (JSONB)
- `created_at` (TIMESTAMP)

**Relationships:**
- `jobs` (1) → (many) `results`
- `jobs` (1) → (many) `activity_logs`

**Realtime Setup:**
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE results;
ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;
```

See [solution-architecture.md#Database Schema](./solution-architecture.md) for full schema with indexes.

---

## API Endpoints

### Jobs API
- `POST /jobs` - Create new job (body: `{ name?, urls[] }`)
- `GET /jobs` - List all jobs (query: `page, limit, status`)
- `GET /jobs/:id` - Get job details
- `PATCH /jobs/:id/pause` - Pause active job
- `PATCH /jobs/:id/resume` - Resume paused job
- `DELETE /jobs/:id/cancel` - Cancel job
- **NEW:** `GET /jobs/:id/layer-stats` - Per-layer elimination metrics and cost tracking

### Results API
- `GET /jobs/:id/results` - Get job results (query: `page, limit, status, classification, search`)
- `GET /jobs/:id/export` - Export results (query: `format=csv|json|xlsx, columns[]`)
- **NEW:** `GET /jobs/:id/manual-review` - Fetch manual review queue (medium-confidence results)
- **NEW:** `PATCH /results/:id/manual-decision` - Submit manual classification decision

### Logs API
- `GET /jobs/:id/logs` - Get activity logs (query: `page, limit, severity, since`)

See [solution-architecture.md#API Specifications](./solution-architecture.md) for full request/response schemas.

---

## Real-Time Integration

### How Supabase Realtime Works

1. **Backend writes to PostgreSQL** → PostgreSQL triggers change event
2. **Supabase Realtime server** detects change → Broadcasts via WebSocket to subscribed clients
3. **Frontend receives update** → Updates TanStack Query cache → React re-renders UI

### Frontend Subscription Pattern
```typescript
// hooks/use-realtime-subscription.ts
export function useJobRealtimeSubscription(jobId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`job-${jobId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'jobs',
        filter: `id=eq.${jobId}`
      }, (payload) => {
        queryClient.setQueryData(['job', jobId], payload.new);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [jobId, queryClient]);
}
```

### Backend Real-Time Flow
- **ProcessingWorker** updates `jobs.current_url` → Realtime broadcasts → Dashboard updates instantly
- **ProcessingService** inserts into `activity_logs` → Realtime broadcasts → Log stream updates
- **ResultsService** inserts into `results` → Realtime broadcasts → Results table updates

**Zero Backend WebSocket Code Required** - Supabase handles all real-time infrastructure.

See [solution-architecture.md#Real-Time Integration](./solution-architecture.md) for detailed implementation.

---

## Source Tree Reference

### Key Directories

**Frontend (`apps/web/`):**
```
apps/web/
├── app/                      # Next.js App Router pages
├── components/               # React components
├── hooks/                    # Custom hooks (TanStack Query + Realtime)
├── lib/                      # Utilities (supabase-client.ts, realtime-service.ts)
└── package.json
```

**Backend (`apps/api/`):**
```
apps/api/
├── src/
│   ├── jobs/                # Jobs module
│   ├── processing/          # Queue & worker
│   ├── scraping/            # ScrapingBee service
│   ├── classification/      # LLM services
│   ├── logs/                # Activity logs
│   └── results/             # Results module
└── package.json
```

**Shared (`packages/shared/`):**
```
packages/shared/
└── src/
    ├── schemas/             # Zod schemas (job.ts, activity-log.ts)
    ├── types/               # TypeScript types
    └── utils/               # Shared utilities (format.ts)
```

See [solution-architecture.md#Proposed Source Tree](./solution-architecture.md) for complete directory structure.

---

## Processing Pipeline Flow

### 3-Tier Progressive Filtering Architecture

The pipeline implements **cost-optimized progressive elimination** with early rejection to minimize scraping and LLM costs.

#### Layer 1: Domain Analysis (No HTTP)
**Service:** `layer1-domain-analysis.service.ts`
- Analyzes domain and URL patterns **without HTTP requests**
- Applies TLD filtering (e.g., reject `.gov`, `.edu`, `.mil`)
- Checks industry keywords in domain/path
- Applies URL pattern exclusions (e.g., `/tag/`, `/author/`, `/category/`)
- **Target:** Eliminate 40-60% of URLs
- **Cost:** Zero (no API calls)

**Outcomes:**
- **Eliminated → Skip to Result Storage** (mark as `elimination_layer: layer1`)
- **Pass → Proceed to Layer 2**

#### Layer 2: Operational Filter (Homepage Scraping)
**Service:** `layer2-operational-filter.service.ts`
- Scrapes **homepage only** (1 HTTP request per URL)
- Validates company infrastructure:
  - Active blog (recent posts in last 6-12 months)
  - Tech stack signals (WordPress, custom CMS, etc.)
  - Required pages (About, Contact, Blog)
- Detects operational signals (company size indicators, content freshness)
- **Target:** 70% pass rate of Layer 1 survivors
- **Cost:** ScrapingBee API (1 request per URL)

**Outcomes:**
- **Eliminated → Skip to Result Storage** (mark as `elimination_layer: layer2`, store `layer2_signals`)
- **Pass → Proceed to Layer 3**

#### Layer 3: LLM Classification + Confidence Routing
**Service:** `classification.service.ts` + `manual-review-router.service.ts`
- Performs full LLM classification (Gemini primary, GPT fallback)
- **Confidence scoring:** Returns 0-1 score with classification
- **Confidence bands:**
  - **High (0.7-1.0):** Auto-accept suitable, auto-reject not_suitable
  - **Medium (0.4-0.7):** Route to manual review queue
  - **Low (0.2-0.4):** Route to manual review queue
  - **Auto-reject (<0.2):** Auto-reject

**Outcomes:**
- **High confidence → Result Storage** (mark as `confidence_band: high`)
- **Medium/Low confidence → Manual Review Queue** (mark as `manual_review_required: true`)
- **Auto-reject → Result Storage** (mark as `confidence_band: auto_reject`)

### URL Processing Flow

1. **Job Creation** (Frontend → API)
   - User uploads URLs → `POST /jobs` → Job created in DB
   - URLs enqueued to BullMQ (Redis)

2. **Queue Processing** (BullMQ Worker)
   - Worker dequeues URL task
   - Sets `jobs.current_layer = 1`
   - Updates `jobs.current_url` and `jobs.current_stage`

3. **Layer 1: Domain Analysis**
   - No HTTP requests
   - If eliminated → Jump to step 7 (Result Storage)
   - If pass → Increment `jobs.current_layer = 2`

4. **Layer 2: Operational Filter**
   - Scrape homepage only
   - If eliminated → Jump to step 7 (Result Storage)
   - If pass → Increment `jobs.current_layer = 3`

5. **Layer 3: LLM Classification**
   - Full LLM classification with confidence scoring
   - If medium/low confidence → Mark for manual review
   - High confidence or auto-reject → Proceed to storage

6. **Activity Logging** (LogsService)
   - Writes to `activity_logs` for each layer
   - Real-time broadcast to frontend

7. **Result Storage** (ResultsService)
   - Writes to `results` table with layer-specific fields
   - Updates job counters (`layer1_eliminated_count`, `layer2_eliminated_count`, etc.)
   - Calculates progress percentage and cost savings

8. **Cost Tracking**
   - Tracks ScrapingBee costs (`jobs.scraping_cost`)
   - Tracks Gemini/GPT API costs (`jobs.gemini_cost`, `jobs.gpt_cost`)
   - Calculates savings from eliminated URLs (`jobs.estimated_savings`)
   - Updates `jobs.total_cost`

### Retry Strategy
- **Max 3 retries** per URL (exponential backoff: 5s, 15s, 45s)
- **Layer-specific retries:** Retry at the failed layer (don't restart from Layer 1)
- **Failures logged** to `activity_logs` with error details
- **Job continues** processing remaining URLs on individual failures

### Performance Targets
- **Layer 1 elimination:** 40-60% of total URLs
- **Layer 2 elimination:** 20-30% of Layer 1 survivors
- **Layer 3 processing:** 10-40% of original URLs
- **Manual review rate:** 20% of Layer 3 processed URLs (medium/low confidence)
- **Overall throughput:** 20+ URLs/min
- **Cost savings:** 60-70% LLM costs, 40-60% scraping costs

---

## Full Documentation

For comprehensive technical details, see:

- **[solution-architecture.md](./solution-architecture.md)** - Complete 49K token architecture
  - Technology Stack Decisions (with rationale)
  - System Architecture Diagrams (Mermaid)
  - Complete Database Schema (with indexes, triggers)
  - Full API Specifications (request/response schemas)
  - Component Architecture (detailed service responsibilities)
  - Cross-Cutting Concerns (error handling, logging, monitoring)
  - Implementation Guidance (step-by-step setup)

- **[PRD.md](./PRD.md)** - Product Requirements (12 FRs, 5 NFRs, 12 stories)
- **[ux-specification.md](./ux-specification.md)** - UI/UX Design System
- **[tech-spec-epic-1.md](./tech-spec-epic-1.md)** - Epic 1 Technical Specifications
- **[tech-spec-epic-2.md](./tech-spec-epic-2.md)** - Epic 2 Technical Specifications

---

**Document Purpose:** Quick reference for story development workflows. Use Grep to search `solution-architecture.md` for specific implementation details.
