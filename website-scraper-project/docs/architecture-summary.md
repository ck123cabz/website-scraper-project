# Website Scraper Platform - Architecture Summary

**Quick Reference** | **Last Updated:** 2025-10-14

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
│   ├── processing.worker.ts  # URL task consumer
│   └── processing.service.ts # Orchestrates URL processing
├── scraping/
│   └── scraping.service.ts   # ScrapingBee integration
├── classification/
│   ├── classification.service.ts # LLM orchestrator
│   ├── prefilter.service.ts      # Regex-based filtering
│   ├── gemini.service.ts         # Gemini API client
│   └── gpt.service.ts            # GPT API client
├── logs/
│   └── logs.service.ts       # Activity log writes
└── results/
    ├── results.controller.ts # Results API
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

**`results` table** - Individual URL results (Realtime enabled)
- `id` (UUID, PK), `job_id` (UUID, FK → jobs)
- `url` (TEXT), `status` (enum: success/rejected/failed)
- `classification_result` (enum: suitable/not_suitable/rejected_prefilter)
- `classification_score` (DECIMAL 0-1), `classification_reasoning` (TEXT)
- `llm_provider` (enum: gemini/gpt/none), `llm_cost` (DECIMAL)
- `processing_time_ms`, `retry_count`, `error_message`
- `processed_at`, `created_at` (TIMESTAMP)

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

### Results API
- `GET /jobs/:id/results` - Get job results (query: `page, limit, status, classification, search`)
- `GET /jobs/:id/export` - Export results (query: `format=csv|json|xlsx, columns[]`)

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

### URL Processing Stages

1. **Job Creation** (Frontend → API)
   - User uploads URLs → `POST /jobs` → Job created in DB
   - URLs enqueued to BullMQ (Redis)

2. **Queue Processing** (BullMQ Worker)
   - Worker dequeues URL task
   - Updates `jobs.current_url` and `jobs.current_stage`

3. **Scraping** (ScrapingService)
   - Calls ScrapingBee API with JS rendering
   - Extracts HTML content
   - Handles rate limits (429 → retry)

4. **Pre-Filtering** (PreFilterService)
   - Applies regex rules (e.g., reject `/tag/`, `/author/` URLs)
   - Fast rejection before LLM call
   - Saves cost on obvious non-matches

5. **Classification** (ClassificationService)
   - Primary: Gemini API call
   - Fallback: GPT API on Gemini failure
   - Returns: suitable/not_suitable + score + reasoning

6. **Result Storage** (ResultsService)
   - Writes to `results` table
   - Updates job counters (`successful_urls`, `rejected_urls`)
   - Calculates progress percentage

7. **Activity Logging** (LogsService)
   - Writes to `activity_logs` for each stage
   - Real-time broadcast to frontend

8. **Cost Tracking** (CostTrackerService)
   - Tracks Gemini/GPT API costs
   - Updates `jobs.gemini_cost`, `jobs.gpt_cost`, `jobs.total_cost`

### Retry Strategy
- **Max 3 retries** per URL (exponential backoff: 5s, 15s, 45s)
- **Failures logged** to `activity_logs` with error details
- **Job continues** processing remaining URLs on individual failures

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
