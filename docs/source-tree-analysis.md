# Source Tree Analysis

Complete annotated directory structure for the Website Scraper Project monorepo.

## Project Root Structure

```
website-scraper-project/
├── apps/                          # Application workspaces
│   ├── api/                       # ⭐ Backend API (NestJS)
│   └── web/                       # ⭐ Frontend Web App (Next.js)
├── packages/                      # Shared code
│   └── shared/                    # ⭐ Shared types & schemas
├── supabase/                      # Database & migrations
│   └── migrations/                # SQL migration files
├── specs/                         # Feature specifications
│   ├── 001-batch-processing-refactor/  # Active feature specs
│   └── 002-manual-review-system/       # Deprecated specs
├── docs/                          # 📄 Generated documentation (YOU ARE HERE)
├── bmad/                          # BMAD workflow system
├── test-data/                     # Test fixtures & sample data
├── test-screenshots/              # E2E test artifacts
├── .github/                       # GitHub Actions CI/CD
│   └── workflows/                 # CI pipeline definitions
├── .claude/                       # Claude AI agent configurations
├── .cursor/                       # Cursor IDE rules
├── package.json                   # Root monorepo config
├── turbo.json                     # ⚙️ Turborepo build orchestration
├── .nvmrc                         # Node version (v20+)
└── README.md                      # Project documentation
```

## Part 1: API Backend (`apps/api/`)

**Project Type:** Backend Service
**Framework:** NestJS 10.3
**Entry Point:** `src/main.ts`

```
apps/api/
├── src/
│   ├── main.ts                    # 🚀 Application entry point
│   │                              # - Environment validation
│   │                              # - NestJS bootstrap
│   │                              # - Swagger setup (/api/docs)
│   │                              # - Bull Board setup (/admin/queues)
│   │                              # - CORS configuration
│   │
│   ├── app.module.ts              # Root module (imports all feature modules)
│   │
│   ├── jobs/                      # 📋 Job Management Module
│   │   ├── jobs.controller.ts    # REST API: POST /jobs/create, GET /jobs/:id
│   │   ├── jobs.service.ts       # Core job orchestration logic
│   │   ├── jobs.module.ts        # Module definition
│   │   ├── dto/                  # Data Transfer Objects
│   │   │   ├── create-job.dto.ts
│   │   │   └── update-job.dto.ts
│   │   └── services/             # Sub-services for job processing
│   │       ├── export.service.ts           # CSV export (48 columns)
│   │       ├── layer1-domain-analysis.service.ts  # Domain filtering
│   │       ├── layer2-operational-filter.service.ts  # Operational signals
│   │       ├── layer3-sophistication-analysis.service.ts  # AI analysis
│   │       ├── file-parser.service.ts      # CSV/TXT parsing
│   │       ├── url-validation.service.ts   # URL validation & normalization
│   │       ├── prefilter.service.ts        # Pre-filtering rules
│   │       ├── confidence-scoring.service.ts  # Confidence band calculation
│   │       ├── llm.service.ts              # AI provider integration
│   │       ├── archival.service.ts         # Job archival (cron)
│   │       └── cleanup.service.ts          # Cleanup service (cron)
│   │
│   ├── queue/                     # 🔄 Queue Processing Module
│   │   ├── queue.service.ts      # BullMQ queue management
│   │   ├── queue.module.ts       # Queue configuration
│   │   └── utils/
│   │       └── error-classifier.ts  # Error classification logic
│   │
│   ├── workers/                   # ⚙️ Background Workers Module
│   │   ├── url-worker.processor.ts  # Main worker: processes URLs from queue
│   │   │                             # - Fetches URL
│   │   │                             # - Runs Layer 1/2/3 analysis
│   │   │                             # - Stores results in DB
│   │   └── workers.module.ts      # Worker registration
│   │
│   ├── scraper/                   # 🕷️ Web Scraping Module
│   │   ├── scraper.service.ts    # HTTP fetching + content extraction
│   │   │                         # - Uses ScrapingBee API
│   │   │                         # - Cheerio for HTML parsing
│   │   └── scraper.module.ts
│   │
│   ├── settings/                  # ⚙️ Settings Management Module
│   │   ├── settings.controller.ts  # GET/PATCH /settings
│   │   ├── settings.service.ts   # Settings CRUD operations
│   │   ├── settings.module.ts
│   │   └── dto/
│   │       ├── update-settings.dto.ts
│   │       └── manual-review-settings.dto.ts  # @deprecated
│   │
│   ├── supabase/                  # 🗄️ Database Module
│   │   ├── supabase.service.ts   # Supabase client wrapper
│   │   └── supabase.module.ts    # Global database module
│   │
│   ├── health/                    # 🏥 Health Check Module
│   │   └── health.controller.ts  # GET /health
│   │
│   ├── common/                    # 🔧 Common Utilities
│   │   ├── decorators/
│   │   │   └── stream-monitor.decorator.ts  # Performance monitoring
│   │   └── types/
│   │
│   ├── config/                    # ⚙️ Configuration
│   │   └── layer-weights.json    # Layer 1/2/3 weighting config
│   │
│   └── __tests__/                 # 🧪 Integration & unit tests
│       ├── integration/
│       │   ├── open-access.spec.ts
│       │   └── csv-export-performance.spec.ts
│       └── load/
│           └── phase9-final-validation.spec.ts
│
├── dist/                          # 📦 Build output (compiled JS)
├── coverage/                      # 📊 Test coverage reports
├── docs/                          # API-specific documentation
├── .env                           # ⚠️ Environment variables (not in git)
├── .env.example                   # Template for .env
├── package.json                   # API dependencies
├── nest-cli.json                  # NestJS configuration
├── tsconfig.json                  # TypeScript configuration
└── jest.config.js                 # Jest test configuration
```

### API Key Directories

| Directory | Purpose | Integration Points |
|-----------|---------|-------------------|
| `jobs/` | Job management & orchestration | → Queue, Workers, DB |
| `queue/` | BullMQ queue management | → Workers, Redis |
| `workers/` | Background URL processing | → Scraper, Layer services, DB |
| `scraper/` | HTTP fetching & content extraction | → ScrapingBee API, Cheerio |
| `settings/` | Configuration management | → DB (settings table) |
| `supabase/` | Database client | → PostgreSQL via Supabase |

## Part 2: Web Frontend (`apps/web/`)

**Project Type:** Web Application
**Framework:** Next.js 14.2 (App Router)
**Entry Point:** `app/layout.tsx`

```
apps/web/
├── app/                           # 📱 Next.js App Router (routes & pages)
│   ├── layout.tsx                 # 🚀 Root layout (providers, fonts, metadata)
│   ├── page.tsx                   # Home page (redirect to /dashboard)
│   ├── globals.css                # Global styles + Tailwind imports
│   ├── error.tsx                  # Error boundary
│   │
│   ├── dashboard/                 # /dashboard route
│   │   └── page.tsx               # Dashboard page (job overview)
│   │
│   ├── jobs/                      # /jobs route
│   │   ├── page.tsx               # Jobs list page
│   │   └── [id]/                  # /jobs/:id route
│   │       └── page.tsx           # Job detail page (results table)
│   │
│   └── settings/                  # /settings route
│       ├── page.tsx               # Settings page
│       └── [tab]/
│           └── page.tsx           # Settings tab pages
│
├── components/                    # 🧩 React Components (76 total)
│   ├── dashboard/                 # Dashboard-specific components
│   │   ├── JobProgressCard.tsx   # Job progress card with stats
│   │   ├── CompletedJobsSection.tsx  # Completed jobs list
│   │   ├── JobsFilterBar.tsx     # Filter controls
│   │   └── BulkActionsBar.tsx    # Bulk operation controls
│   │
│   ├── jobs/                      # Jobs page components
│   │   ├── create-job-dialog.tsx  # Job creation modal
│   │   ├── job-list.tsx          # Jobs table
│   │   └── job-actions.tsx       # Job action buttons
│   │
│   ├── results-table.tsx          # 📊 Main results data table
│   │                              # - TanStack Table with sorting/filtering
│   │                              # - Expandable rows (layer factors)
│   │                              # - CSV export button
│   │
│   ├── recent-urls-list.tsx       # Recent URLs widget
│   │
│   ├── settings/                  # Settings components
│   │   ├── SettingsForm.tsx      # Settings form container
│   │   └── [various tabs]        # Layer 1/2/3 rule editors
│   │
│   └── ui/                        # 🎨 Reusable UI components (Radix UI wrappers)
│       ├── button.tsx
│       ├── dialog.tsx
│       ├── table.tsx
│       ├── tabs.tsx
│       ├── progress.tsx
│       └── [50+ more components]
│
├── hooks/                         # 🎣 Custom React Hooks
│   ├── use-jobs.ts                # Job data fetching (React Query)
│   ├── use-results.ts             # Results data fetching
│   ├── use-settings.ts            # Settings management
│   ├── use-queue-polling.ts       # Real-time queue status updates
│   └── [more hooks]
│
├── lib/                           # 🔧 Utilities & API Client
│   ├── api-client.ts              # 🌐 API communication layer (Axios)
│   │                              # - All API endpoints defined here
│   │                              # - Type-safe request/response
│   │
│   ├── supabase-client.ts         # 🗄️ Supabase client (direct DB access)
│   ├── realtime-service.ts        # Real-time subscriptions
│   └── utils.ts                   # Utility functions
│
├── __tests__/                     # 🧪 Unit tests (Jest)
│   └── [component tests]
│
├── tests/                         # 🎭 E2E tests (Playwright)
│   ├── dashboard.spec.ts
│   ├── jobs.spec.ts
│   └── results-table.spec.ts
│
├── .next/                         # 📦 Next.js build output
├── coverage/                      # 📊 Test coverage
├── playwright-report/             # Playwright test results
├── public/                        # Static assets
├── package.json                   # Web dependencies
├── next.config.mjs                # Next.js configuration
├── tailwind.config.ts             # Tailwind CSS configuration
├── tsconfig.json                  # TypeScript configuration
├── jest.config.js                 # Jest configuration
└── playwright.config.ts           # Playwright configuration
```

### Web Key Directories

| Directory | Purpose | Integration Points |
|-----------|---------|-------------------|
| `app/` | Next.js routes & pages | → Components, Hooks, API |
| `components/` | React UI components | → Hooks, Lib utilities |
| `hooks/` | React Query hooks | → API client, Supabase |
| `lib/` | API & utilities | → Backend API (port 3001) |

## Part 3: Shared Library (`packages/shared/`)

**Project Type:** TypeScript Library
**Purpose:** Type-safe contracts between API & Web

```
packages/shared/
├── src/
│   ├── index.ts                   # 📦 Main export file (all types/schemas)
│   │
│   ├── types/                     # 📘 TypeScript Type Definitions
│   │   ├── job.ts                # Job, JobStatus, ProcessingStage
│   │   ├── result.ts             # Result, ClassificationResult, ConfidenceBand
│   │   ├── url-results.ts        # UrlResult, Layer1/2/3Factors
│   │   ├── jobs.ts               # BatchJob, JobProgress
│   │   ├── activity-log.ts       # ActivityLog, LogSeverity
│   │   ├── layer1.ts             # Layer1AnalysisResult, DomainRules
│   │   ├── layer2.ts             # Layer2FilterResult, Signals
│   │   ├── layer3-analysis.ts    # Layer3AnalysisResult
│   │   ├── settings.ts           # Settings, PreFilterRule, ConfidenceBandConfig
│   │   ├── scraper.ts            # ScraperResult, ContentExtractionResult
│   │   ├── worker.ts             # WorkerStatus, UrlJobData
│   │   ├── prefilter.ts          # PreFilterRule, PreFilterResult
│   │   └── database.types.ts     # Supabase-generated types
│   │
│   ├── schemas/                   # ✅ Zod Validation Schemas
│   │   ├── job.ts                # JobSchema, JobStatusSchema
│   │   ├── result.ts             # resultSchema, resultStatusSchema
│   │   └── activity-log.ts       # ActivityLogSchema
│   │
│   └── utils/                     # 🔧 Shared Utilities
│       └── format.ts             # formatDuration, formatNumber, formatTimestamp
│
├── package.json                   # Shared library config
└── tsconfig.json                  # TypeScript configuration
```

### Shared Library Exports

The shared library provides a single source of truth for:
- **Types:** 30+ TypeScript interfaces/types
- **Schemas:** Zod validation schemas for runtime type checking
- **Utilities:** Common formatting functions

**Key Type Categories:**
1. **Job Management:** Job, JobStatus, JobProgress
2. **URL Processing:** UrlResult, Layer1/2/3Factors
3. **Classification:** Result, ClassificationResult, ConfidenceBand
4. **Settings:** Settings, PreFilterRule, ConfidenceBandConfig
5. **Worker:** WorkerStatus, UrlJobData, WorkerProgress

## Integration Points

### API ↔ Web Communication

```
Web (Frontend)                     API (Backend)
    │                                  │
    ├─── HTTP REST ─────────────────→ │ /jobs/create
    ├─── HTTP REST ─────────────────→ │ /jobs/:id
    ├─── HTTP REST ─────────────────→ │ /jobs/:id/export
    ├─── HTTP REST ─────────────────→ │ /settings
    │                                  │
    └─── Direct DB ───────────────────┤ Supabase (Both access)
                                       │
                                       └─── Redis ──→ BullMQ Queue
                                              │
                                              └──→ Workers
```

### Data Flow

```
1. User uploads CSV → Web → API
2. API validates URLs → Creates Job → Queues URLs
3. Workers process URLs → Layer 1/2/3 → Store results
4. Web polls job status → React Query → Updates UI
5. User exports results → API generates CSV → Download
```

## Critical Folders for Development

**For Backend Changes:**
- `apps/api/src/jobs/services/` - Layer 1/2/3 logic
- `apps/api/src/workers/` - Background processing
- `apps/api/src/queue/` - Queue management

**For Frontend Changes:**
- `apps/web/app/` - Routes & pages
- `apps/web/components/` - UI components
- `apps/web/lib/api-client.ts` - API integration

**For Type Changes:**
- `packages/shared/src/types/` - Type definitions
- `packages/shared/src/schemas/` - Validation schemas

**For Database Changes:**
- `supabase/migrations/` - SQL migrations

## Notes

- **Build Output:** `dist/` and `.next/` directories are generated and git-ignored
- **Test Artifacts:** `coverage/`, `test-results/`, `playwright-report/` are generated
- **Environment Files:** `.env` files are git-ignored (use `.env.example` as template)
- **Deprecated Code:** Some files may reference manual-review features (deprecated)

---

**Generated:** 2025-01-18
**Scan Level:** Exhaustive
**Documentation Version:** 1.0.0
