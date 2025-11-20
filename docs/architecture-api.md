# Architecture Documentation - API Backend

**Part:** API (Backend)
**Type:** Backend Service
**Framework:** NestJS 10.3
**Language:** TypeScript 5.5
**Root Path:** `apps/api/`
**Last Updated:** 2025-01-18

---

## Executive Summary

The API backend is a **NestJS-based RESTful service** that orchestrates batch URL processing through a **3-tier progressive filtering pipeline**. It processes uploaded URL lists through sequential layers of analysis (Domain → Operational → LLM Classification), achieving **40-60% cost reduction** by eliminating unsuitable URLs before expensive scraping and AI classification.

### Key Characteristics

- **Architecture Pattern:** Layered Service-Oriented with Event-Driven Job Processing
- **Processing Model:** Asynchronous batch processing with BullMQ queue
- **Data Strategy:** PostgreSQL (Supabase) with JSONB columns for factor transparency
- **Concurrency:** 5 concurrent URL processors with intelligent retry logic
- **Cost Optimization:** Progressive filtering eliminates 70%+ URLs before expensive operations
- **Real-time Updates:** Live job progress tracking with per-layer timing metrics

---

## Technology Stack

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Framework** | NestJS | 10.3 | Modular TypeScript backend framework |
| **Queue** | BullMQ | 5.0 | Redis-based job queue for async processing |
| **Database** | PostgreSQL | - | Primary data store via Supabase |
| **ORM/Client** | Supabase Client | 2.39 | Database client + RLS + real-time |
| **AI/LLM** | Google Gemini AI | 0.24 | Primary content classification |
| **AI/LLM** | OpenAI GPT | 6.3 | Fallback classification engine |
| **Scraping** | ScrapingBee API | - | Managed web scraping service |
| **Parser** | Cheerio | 1.1 | HTML parsing and data extraction |
| **Cache** | Redis | - | Queue backend + caching layer |
| **Scheduler** | @nestjs/schedule | 6.0 | Cron jobs for archival/cleanup |
| **API Docs** | Swagger/OpenAPI | 7.4 | Auto-generated API documentation |
| **Monitoring** | Bull Board | 6.13 | Queue dashboard and monitoring |
| **Validation** | class-validator | 0.14 | DTO validation |
| **File Parsing** | Papaparse | 5.5 | CSV/TXT file parsing |

### Development & Testing

- **TypeScript:** 5.5 (strict mode enabled)
- **Testing:** Jest 30.2 (unit, integration, load tests)
- **HTTP Client:** Axios 1.12 (external API calls)
- **Type Safety:** Zod 3.25 + class-validator
- **Code Quality:** ESLint + Prettier

---

## Architecture Pattern

### Layered Service-Oriented Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    API Layer (Controllers)                   │
│  - HTTP Request Handling                                     │
│  - DTO Validation (class-validator)                          │
│  - Response Formatting                                       │
│  - Error Handling & HTTP Status Mapping                      │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────┴─────────────────────────────────────┐
│                   Service Layer (Business Logic)             │
│  - JobsService: Job lifecycle management                    │
│  - QueueService: BullMQ orchestration                        │
│  - ExportService: CSV generation & streaming                 │
│  - Layer1/2 Analysis Services: Rule-based filtering          │
│  - LLmService: AI classification orchestration               │
│  - ScraperService: Web scraping coordination                 │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────┴─────────────────────────────────────┐
│                   Data Layer (Repositories)                  │
│  - SupabaseService: Database client wrapper                 │
│  - Direct SQL queries via Supabase client                    │
│  - JSONB factor storage & retrieval                          │
│  - Transaction management                                    │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────┴─────────────────────────────────────┐
│                   Worker Layer (Background Jobs)             │
│  - UrlWorkerProcessor: Async URL processing                 │
│  - BullMQ Queue Management                                   │
│  - 3-Tier Progressive Filtering Pipeline                     │
│  - Real-time Progress Updates                                │
└──────────────────────────────────────────────────────────────┘
```

### Module Structure (NestJS)

**Core Modules:**
- `AppModule` - Root module, configuration, scheduling
- `JobsModule` - Job management, export, results retrieval
- `QueueModule` - BullMQ queue setup and management
- `WorkersModule` - Background job processors
- `ScraperModule` - Web scraping orchestration
- `SupabaseModule` - Database client and queries
- `SettingsModule` - Settings management and persistence

---

## 3-Tier Progressive Filtering Pipeline

The core innovation of this architecture is the **3-tier progressive filtering** approach that eliminates unsuitable URLs at each layer before invoking expensive operations.

### Pipeline Overview

```
Input: URL Batch (100-10,000 URLs)
   │
   ├──> LAYER 1: Domain Analysis (100% processed)
   │    ├─ Pattern matching (blog platforms, social media)
   │    ├─ URL structure validation
   │    ├─ Domain reputation checks
   │    ├─ Cost: $0 (rule-based, instant)
   │    ├─ Throughput: 100+ URLs/min
   │    ├─ Elimination Rate: 40-60%
   │    └─> REJECT 40-60% → Skip to final storage
   │
   ├──> LAYER 2: Operational Filter (40-60% processed)
   │    ├─ Homepage scraping (single HTTP request)
   │    ├─ Company page detection (About, Contact, Team)
   │    ├─ Blog freshness (posts in last 90 days)
   │    ├─ Tech stack validation (CMS, frameworks)
   │    ├─ Cost: ~$0.0001/URL (ScrapingBee)
   │    ├─ Throughput: 20-30 URLs/min
   │    ├─ Elimination Rate: 30% of Layer 1 survivors
   │    └─> REJECT 30% → Skip to final storage
   │
   └──> LAYER 3: LLM Classification (28% processed)
        ├─ Full site content extraction
        ├─ AI classification (Gemini/GPT)
        ├─ Confidence scoring (high/medium/low)
        ├─ Cost: ~$0.002-0.004/URL (scraping + LLM)
        ├─ Throughput: 10-15 URLs/min
        └─> APPROVE/REJECT with confidence → Final storage

Result: ~72% cost reduction vs. processing all URLs through Layer 3
```

### Cost Savings Calculation

**Example:** 1,000 URL batch

| Layer | URLs Processed | Cost per URL | Total Cost | Eliminated |
|-------|---------------|--------------|------------|------------|
| Layer 1 | 1,000 | $0.00 | $0.00 | 500 (50%) |
| Layer 2 | 500 | $0.0001 | $0.05 | 150 (30%) |
| Layer 3 | 350 | $0.003 | $1.05 | - |
| **Total** | **1,000** | - | **$1.10** | **650 (65%)** |

**Without Progressive Filtering:** 1,000 × $0.003 = **$3.00**
**Savings:** $1.90 (63% cost reduction)

---

## Data Architecture

### Database Schema

#### Core Tables

**1. `jobs` Table**
```sql
- id (uuid, PK)
- name (text)
- status (enum: 'pending' | 'processing' | 'paused' | 'completed' | 'failed')
- total_urls (integer)
- processed_urls (integer)
- created_at (timestamptz)
- started_at (timestamptz, nullable)
- completed_at (timestamptz, nullable)
- archived_at (timestamptz, nullable) -- T063: Archival support
- is_archived (boolean, default: false)
```

**2. `job_urls` Table** (Junction table)
```sql
- id (uuid, PK)
- job_id (uuid, FK → jobs.id)
- url (text)
- created_at (timestamptz)
```

**3. `url_results` Table** (Analysis results with JSONB factors)
```sql
- id (uuid, PK)
- job_id (uuid, FK → jobs.id)
- url_id (uuid, FK → job_urls.id)
- url (text, indexed)
- current_layer (text: 'layer1' | 'layer2' | 'layer3')
- layer1_status (text: 'pass' | 'reject')
- layer2_status (text: 'pass' | 'reject', nullable)
- layer3_classification (text: 'approved' | 'rejected', nullable)
- confidence_band (text: 'high' | 'medium' | 'low' | 'auto_reject', nullable)
- confidence_score (numeric, nullable)
- layer1_factors (jsonb) -- Domain analysis factors
- layer2_factors (jsonb, nullable) -- Operational signals
- layer3_factors (jsonb, nullable) -- LLM classification factors
- layer1_processing_time_ms (integer)
- layer2_processing_time_ms (integer, nullable)
- layer3_processing_time_ms (integer, nullable)
- total_processing_time_ms (integer)
- layer2_scraping_cost (numeric, nullable)
- layer3_total_cost (numeric, nullable)
- retry_count (integer, default: 0) -- T021: Retry tracking
- last_error (text, nullable)
- created_at (timestamptz)
- processed_at (timestamptz)
```

**4. `classification_settings` Table** (Layer rules and thresholds)
```sql
- id (uuid, PK)
- layer1_rules (jsonb) -- URL patterns, domain rules
- layer2_rules (jsonb) -- Operational validation rules
- layer3_rules (jsonb) -- LLM classification prompts & thresholds
- created_at (timestamptz)
- updated_at (timestamptz)
```

### JSONB Factor Structures

**Layer 1 Factors (layer1_factors column):**
```json
{
  "matched_patterns": ["blog.example.com", "/author/"],
  "domain_category": "corporate_blog",
  "url_structure_score": 0.8,
  "rejection_reasons": ["Subdomain blog platform"]
}
```

**Layer 2 Factors (layer2_factors column):**
```json
{
  "has_about_page": true,
  "has_contact_page": true,
  "recent_post_count": 12,
  "last_post_date": "2025-01-15",
  "blog_freshness_days": 3,
  "detected_cms": "WordPress",
  "tech_stack": ["React", "Node.js"]
}
```

**Layer 3 Factors (layer3_factors column):**
```json
{
  "llm_provider": "gemini",
  "classification_reasoning": "Site focuses on industry news...",
  "content_quality_score": 0.85,
  "relevance_indicators": ["guest post guidelines", "write for us"],
  "red_flags": [],
  "confidence_explanation": "Clear guest posting opportunity"
}
```

### Database Indexes

**Performance Optimization:**
- `url_results.job_id` (B-tree) - Job-based filtering
- `url_results.url` (B-tree) - URL lookups
- `url_results.layer3_classification` (B-tree) - Approval filtering
- `url_results.confidence_band` (B-tree) - Confidence filtering
- `url_results.layer1_factors` (GIN) - JSONB querying
- `url_results.layer2_factors` (GIN) - JSONB querying
- `url_results.layer3_factors` (GIN) - JSONB querying
- `url_results.current_layer` (B-tree) - Layer-based filtering

---

## API Design

### RESTful Endpoints

**Base URL:** `http://localhost:3001` (dev) | `https://api.production.com` (prod)

#### Jobs Management

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| POST | `/jobs/create` | Create job with URLs | Multipart form or JSON | Job metadata + stats |
| GET | `/jobs` | List all jobs | - | Array of jobs |
| GET | `/jobs/:id` | Get job details | - | Job with progress |
| GET | `/jobs/:id/results` | Get job results (paginated) | Query params | Results + pagination |
| GET | `/jobs/:id/results/:resultId` | Get result details | - | Full result + factors |
| POST | `/jobs/:id/export` | Export results to CSV | Query params | CSV stream |
| PATCH | `/jobs/:id/pause` | Pause job processing | - | Updated job |
| PATCH | `/jobs/:id/resume` | Resume job processing | - | Updated job |
| DELETE | `/jobs/:id/cancel` | Cancel job | - | Updated job |

#### Queue Monitoring

| Method | Endpoint | Description | Response |
|--------|----------|-------------|----------|
| GET | `/jobs/queue/status` | Real-time queue status | Active + completed jobs |

#### Settings

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| GET | `/settings` | Get current settings | - | Settings object |
| PATCH | `/settings` | Update settings | Settings DTO | Updated settings |

#### Health Check

| Method | Endpoint | Description | Response |
|--------|----------|-------------|----------|
| GET | `/health` | API health status | `{ status: 'ok' }` |

### Request/Response Examples

**POST /jobs/create** (Multipart Form)
```http
POST /jobs/create
Content-Type: multipart/form-data

name=My Job
file=<urls.csv>
```

Response:
```json
{
  "success": true,
  "data": {
    "job_id": "a1b2c3d4-...",
    "url_count": 500,
    "duplicates_removed_count": 23,
    "invalid_urls_count": 12,
    "created_at": "2025-01-18T10:30:00Z",
    "status": "processing"
  }
}
```

**GET /jobs/:id/results** (Filtered + Paginated)
```http
GET /jobs/abc123/results?page=1&pageSize=20&filter=approved&confidence=high
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "result-1",
      "url": "https://example.com",
      "layer3_classification": "approved",
      "confidence_band": "high",
      "confidence_score": 0.92,
      "current_layer": "layer3",
      "total_processing_time_ms": 2341
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalResults": 127,
    "totalPages": 7
  }
}
```

---

## Component Overview

### Service Components

**1. JobsService** (`jobs/jobs.service.ts`)
- Job creation and lifecycle management
- Database operations for jobs and results
- Progress calculation and status updates
- Result retrieval with filtering and pagination

**2. QueueService** (`queue/queue.service.ts`)
- BullMQ queue initialization and management
- Job enqueueing with priority support
- Pause/resume/cancel operations
- Queue metrics and health checks

**3. UrlWorkerProcessor** (`workers/url-worker.processor.ts`)
- Main processing orchestrator (concurrency: 5)
- 3-tier pipeline execution
- Real-time database updates
- Error handling and retry logic
- Cost tracking per layer

**4. Layer1DomainAnalysisService** (`jobs/services/layer1-domain-analysis.service.ts`)
- Rule-based domain pattern matching
- URL structure validation
- Blog platform detection
- Social media filtering
- Zero-cost instant processing

**5. Layer2OperationalFilterService** (`jobs/services/layer2-operational-filter.service.ts`)
- Homepage scraping coordination
- Company page detection (About, Contact, Team)
- Blog freshness analysis (last 90 days)
- Tech stack extraction (CMS, frameworks)
- Layer 2 factor JSONB construction

**6. LlmService** (`jobs/services/llm.service.ts`)
- Multi-provider AI orchestration (Gemini primary, GPT fallback)
- Prompt engineering for classification
- Response parsing and validation
- Cost tracking per provider
- Error handling with fallbacks

**7. ScraperService** (`scraper/scraper.service.ts`)
- ScrapingBee API integration
- Rate limiting and quota management
- HTML content extraction (title, meta, body)
- Structured data parsing
- Retry logic for scraping failures

**8. ExportService** (`jobs/services/export.service.ts`)
- CSV generation with 5 format options
- Streaming export for large datasets
- Factor flattening (48 columns for complete format)
- Filter application (approval, layer, confidence)
- Memory-efficient processing

**9. ConfidenceScoringService** (`jobs/services/confidence-scoring.service.ts`)
- Confidence band calculation (high/medium/low/auto_reject)
- LLM response analysis
- Threshold-based classification
- Scoring transparency for CSV export

**10. FileParserService** (`jobs/services/file-parser.service.ts`)
- CSV/TXT file parsing
- URL extraction and normalization
- Format detection (CSV, plain text, JSON)

**11. UrlValidationService** (`jobs/services/url-validation.service.ts`)
- URL format validation (RFC 3986)
- Protocol normalization (http/https)
- Deduplication logic
- Invalid URL filtering

**12. CleanupService** (`jobs/services/cleanup.service.ts`)
- Scheduled cleanup cron job
- Old result pruning
- Database maintenance

**13. ArchivalService** (`jobs/services/archival.service.ts`)
- Automated job archival (completed jobs > 30 days)
- Cron-based execution
- Soft delete pattern

---

## Entry Points and Bootstrap

### Application Entry Point

**File:** `apps/api/src/main.ts`

**Bootstrap Sequence:**

1. **Environment Validation**
   - Load `.env` file
   - Validate required variables (API keys, Redis URL, Supabase credentials)
   - Fail fast if missing critical config

2. **NestJS Application Creation**
   - Create NestJS app with `rawBody` enabled (for text/plain parsing)
   - Enable shutdown hooks for graceful termination

3. **CORS Configuration**
   - Allow frontend URLs (localhost:3000 + production URL)
   - Credentials support enabled

4. **Bull Board Dashboard Setup**
   - Mount queue monitoring UI at `/admin/queues`
   - Connect to `url-processing-queue`
   - Provides real-time queue visibility

5. **Swagger/OpenAPI Documentation**
   - Auto-generate API docs from decorators
   - Mount at `/api/docs`
   - Interactive API testing UI

6. **Server Listen**
   - Port: 3001 (configurable via `PORT` env var)
   - Log startup URLs (API, Bull Board, Swagger)

7. **Graceful Shutdown**
   - Listen for SIGTERM (Railway deployment signal)
   - Close server gracefully
   - 10-second shutdown window

### Module Initialization Order

```
AppModule (root)
  ├─ ConfigModule (global)
  ├─ ScheduleModule (cron jobs enabled)
  ├─ SupabaseModule
  ├─ QueueModule (BullMQ initialization)
  ├─ SettingsModule
  ├─ JobsModule
  │   ├─ Layer1DomainAnalysisService (onModuleInit: load rules from DB)
  │   ├─ Layer2OperationalFilterService
  │   ├─ LlmService
  │   └─ ExportService
  ├─ ScraperModule
  └─ WorkersModule
      └─ UrlWorkerProcessor (starts listening to queue)
```

---

## Development Workflow

### Local Development Setup

**Prerequisites:**
- Node.js 20+ (see `../.nvmrc`)
- Redis running on port 6379
- Supabase project configured

**Environment Variables** (`apps/api/.env`):
```bash
# External APIs
SCRAPINGBEE_API_KEY=your_key
GEMINI_API_KEY=your_key
OPENAI_API_KEY=your_key

# Infrastructure
REDIS_URL=redis://localhost:6379
SUPABASE_URL=your_project_url
SUPABASE_SERVICE_KEY=your_service_key

# Server Config
PORT=3001
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

**Development Commands:**
```bash
cd apps/api

# Install dependencies (from monorepo root)
npm install

# Start in watch mode
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Watch tests
npm run test:watch

# Coverage report
npm run test:cov

# Type check
npm run type-check

# Lint
npm run lint
```

### Testing Strategy

**1. Unit Tests** (`**/__tests__/*.spec.ts`)
- Service method testing
- Isolated logic validation
- Mocked dependencies
- Examples:
  - `layer1-domain-analysis.service.spec.ts`
  - `export.service.spec.ts`
  - `confidence-scoring.service.spec.ts`

**2. Integration Tests** (`__tests__/integration/*.spec.ts`)
- End-to-end workflow validation
- Real database connections (test Supabase)
- Queue integration testing
- Examples:
  - `csv-export-performance.spec.ts`
  - `open-access.spec.ts`

**3. Load Tests** (`__tests__/load/*.spec.ts`)
- High-volume URL processing
- Concurrency validation
- Performance benchmarks
- Example: `phase9-final-validation.spec.ts`

**Test Coverage Targets:**
- Services: 80%+
- Controllers: 70%+
- Critical paths (Layer 1/2/3): 90%+

---

## Deployment Architecture

### Railway Deployment

**Platform:** Railway (Platform-as-a-Service)

**Services:**
- **API Service:** NestJS app on dynamic port
- **Redis:** Managed Redis addon
- **PostgreSQL:** Supabase (external)

**Configuration:**
- Health checks: `/health` endpoint
- Graceful shutdown: SIGTERM handling (10s window)
- Build command: `npm run build`
- Start command: `npm run start:prod`
- Auto-deploy: On push to `main` branch

**Environment Variables** (Railway):
```
SCRAPINGBEE_API_KEY (secret)
GEMINI_API_KEY (secret)
OPENAI_API_KEY (secret)
REDIS_URL (provided by addon)
SUPABASE_URL (secret)
SUPABASE_SERVICE_KEY (secret)
PORT (provided by Railway)
FRONTEND_URL (production URL)
NODE_ENV=production
```

### Performance Characteristics

**Throughput:**
- Layer 1 (Domain Analysis): 100+ URLs/min
- Layer 2 (Homepage Scraping): 20-30 URLs/min
- Layer 3 (Full Scraping + LLM): 10-15 URLs/min
- **Overall (3-tier pipeline):** 60-80 URLs/min (accounting for progressive filtering)

**Concurrency:**
- BullMQ Workers: 5 concurrent jobs
- ScrapingBee Rate Limit: 10 req/sec
- LLM Rate Limits: Gemini 15 RPM, GPT 60 RPM

**Latency:**
- Layer 1 Processing: <50ms per URL
- Layer 2 Processing: 1-2 seconds per URL (scraping time)
- Layer 3 Processing: 2-5 seconds per URL (scraping + LLM)

**Cost Efficiency:**
- Progressive filtering eliminates 65-75% of URLs before Layer 3
- Cost per URL (averaged): $0.0011 (vs. $0.003 without filtering)
- **63% cost reduction**

---

## Integration Points

### External Services

**1. ScrapingBee API**
- **Purpose:** Managed web scraping (bypasses anti-bot measures)
- **Rate Limit:** 10 requests/second
- **Cost:** ~$0.0001 per request
- **Integration:** `ScraperService` via Axios

**2. Google Gemini AI**
- **Purpose:** Primary LLM for content classification
- **Model:** `gemini-1.5-flash`
- **Rate Limit:** 15 requests/minute
- **Cost:** ~$0.001-0.002 per classification
- **Integration:** `LlmService` via `@google/generative-ai`

**3. OpenAI GPT**
- **Purpose:** Fallback LLM (when Gemini fails/unavailable)
- **Model:** `gpt-4o-mini`
- **Rate Limit:** 60 requests/minute
- **Cost:** ~$0.002-0.003 per classification
- **Integration:** `LlmService` via `openai` SDK

**4. Redis**
- **Purpose:** BullMQ queue backend
- **Connection:** `REDIS_URL` environment variable
- **Usage:** Job queue persistence, worker coordination

**5. Supabase (PostgreSQL)**
- **Purpose:** Primary database (jobs, results, settings)
- **Connection:** Supabase client via `SUPABASE_URL` + `SUPABASE_SERVICE_KEY`
- **Features:** RLS (disabled for service role), real-time subscriptions (unused)

### Internal Integration (with Web Frontend)

**API → Web Communication:**
- RESTful JSON API over HTTP
- CORS enabled for frontend origin
- Real-time updates via polling (`/jobs/queue/status`)
- CSV export streaming (`/jobs/:id/export`)

---

## Security Patterns

### Authentication & Authorization

**Current State:** No authentication (internal tool)

**Future Considerations:**
- API key authentication for external access
- JWT-based user sessions
- Role-based access control (RBAC)

### Input Validation

**Layer 1: DTO Validation**
- `class-validator` decorators on DTOs
- Type validation via `class-transformer`
- Custom validation rules (URL format, file size)

**Layer 2: Service-Level Validation**
- URL format validation (RFC 3986)
- File type validation (CSV, TXT only)
- Deduplication checks

**Layer 3: Database Constraints**
- Foreign key constraints
- NOT NULL constraints on critical fields
- Check constraints on enums

### Error Handling

**Strategy:**
- Generic error messages to client (avoid data leakage)
- Detailed error logging server-side (console + future logging service)
- HTTP status code mapping (400, 404, 500, etc.)
- Retry logic for transient errors (rate limits, timeouts)
- No retry for permanent errors (401, 403, 400)

### Environment Variable Security

**Best Practices:**
- All secrets in `.env` (never committed)
- Environment validation at startup
- Fail-fast on missing critical vars
- Railway secret storage for production

---

## Monitoring & Observability

### Built-in Monitoring

**1. Bull Board Dashboard**
- URL: `http://localhost:3001/admin/queues`
- Real-time queue visualization
- Job status tracking (active, completed, failed)
- Retry monitoring
- Worker health checks

**2. Swagger API Docs**
- URL: `http://localhost:3001/api/docs`
- Interactive API testing
- Request/response schemas
- Endpoint documentation

**3. Console Logging**
- Structured logs per service (NestJS Logger)
- Error stack traces
- Processing time metrics
- Cost tracking logs

### Performance Metrics (Tracked)

**Per-URL Metrics:**
- `layer1_processing_time_ms`
- `layer2_processing_time_ms`
- `layer3_processing_time_ms`
- `total_processing_time_ms`
- `layer2_scraping_cost`
- `layer3_total_cost`

**Job-Level Metrics:**
- Total URLs processed
- URLs per layer (elimination tracking)
- Total processing time
- Total cost
- Throughput (URLs/min)

### Future Enhancements

- Structured logging (Winston/Pino)
- APM integration (New Relic, DataDog)
- Custom metrics dashboard (Grafana)
- Alert system (Slack, PagerDuty)

---

## Configuration Management

### Settings System

**Storage:** `classification_settings` table (PostgreSQL)

**Structure:**
```json
{
  "id": "uuid",
  "layer1_rules": {
    "url_pattern_exclusions": [
      {
        "id": "rule-1",
        "pattern": "blog\\.example\\.com",
        "category": "blog_platform",
        "enabled": true,
        "description": "WordPress.com hosted blogs"
      }
    ]
  },
  "layer2_rules": {
    "blog_freshness_threshold_days": 90,
    "minimum_about_page_length": 100,
    "required_company_pages": ["about", "contact"]
  },
  "layer3_rules": {
    "confidence_thresholds": {
      "high": 0.85,
      "medium": 0.65,
      "low": 0.45
    },
    "auto_reject_threshold": 0.30,
    "prompts": {
      "classification_system": "You are an expert...",
      "classification_user": "Analyze this website..."
    }
  },
  "created_at": "2025-01-18T00:00:00Z",
  "updated_at": "2025-01-18T12:00:00Z"
}
```

**Access:**
- `SettingsService.getSettings()` - Load from DB
- `SettingsService.updateSettings(dto)` - Update and persist
- Fallback to JSON defaults if DB unavailable

---

## Source Tree Reference

```
apps/api/
├── src/
│   ├── main.ts                         # Application entry point & bootstrap
│   ├── app.module.ts                   # Root NestJS module
│   │
│   ├── jobs/                           # Jobs module (primary business logic)
│   │   ├── jobs.controller.ts          # REST endpoints for jobs
│   │   ├── jobs.service.ts             # Job lifecycle management
│   │   ├── jobs.module.ts              # Module definition
│   │   ├── dto/                        # Data transfer objects
│   │   │   ├── create-job.dto.ts       # Job creation validation
│   │   │   └── ...
│   │   ├── services/                   # Business logic services
│   │   │   ├── layer1-domain-analysis.service.ts  # Layer 1 filtering
│   │   │   ├── layer2-operational-filter.service.ts  # Layer 2 filtering
│   │   │   ├── llm.service.ts          # AI classification orchestration
│   │   │   ├── confidence-scoring.service.ts  # Confidence calculation
│   │   │   ├── export.service.ts       # CSV export & streaming
│   │   │   ├── file-parser.service.ts  # File upload parsing
│   │   │   ├── url-validation.service.ts  # URL validation
│   │   │   ├── cleanup.service.ts      # Scheduled cleanup cron
│   │   │   └── archival.service.ts     # Job archival cron
│   │   └── __tests__/                  # Unit tests
│   │       ├── export.service.spec.ts
│   │       ├── jobs.controller.spec.ts
│   │       └── ...
│   │
│   ├── queue/                          # BullMQ queue management
│   │   ├── queue.service.ts            # Queue operations (add, pause, resume)
│   │   ├── queue.module.ts             # Module with BullMQ config
│   │   └── __tests__/
│   │       ├── queue.service.spec.ts
│   │       ├── layer1-processor.spec.ts
│   │       └── layer3-processor.spec.ts
│   │
│   ├── workers/                        # Background job processors
│   │   ├── url-worker.processor.ts     # Main 3-tier processing worker
│   │   ├── workers.module.ts           # Worker module definition
│   │   └── __tests__/
│   │
│   ├── scraper/                        # Web scraping module
│   │   ├── scraper.service.ts          # ScrapingBee integration
│   │   └── scraper.module.ts
│   │
│   ├── supabase/                       # Database client module
│   │   ├── supabase.service.ts         # Supabase client wrapper
│   │   └── supabase.module.ts
│   │
│   ├── settings/                       # Settings management
│   │   ├── settings.controller.ts      # Settings REST endpoints
│   │   ├── settings.service.ts         # Settings CRUD operations
│   │   ├── settings.module.ts
│   │   └── dto/
│   │       ├── update-settings.dto.ts
│   │       └── ...
│   │
│   ├── health/                         # Health check endpoint
│   │   └── health.controller.ts        # GET /health
│   │
│   └── __tests__/                      # Integration & load tests
│       ├── integration/
│       │   ├── csv-export-performance.spec.ts
│       │   └── open-access.spec.ts
│       └── load/
│           └── phase9-final-validation.spec.ts
│
├── dist/                               # Compiled JavaScript output
├── package.json                        # Dependencies & scripts
├── tsconfig.json                       # TypeScript configuration
├── nest-cli.json                       # NestJS CLI configuration
└── .env                                # Environment variables (gitignored)
```

---

## Additional Technical Notes

### BullMQ Configuration

**Queue Name:** `url-processing-queue`

**Worker Options:**
```typescript
{
  concurrency: 5,  // Process 5 jobs simultaneously
  connection: {
    url: process.env.REDIS_URL
  }
}
```

**Job Options:**
```typescript
{
  attempts: 3,  // Max 3 retry attempts
  backoff: {
    type: 'exponential',
    delay: 1000  // 1s → 2s → 4s
  },
  removeOnComplete: false,  // Keep completed jobs for monitoring
  removeOnFail: false  // Keep failed jobs for debugging
}
```

**Retry Strategy:**
- **Transient Errors:** Retry (timeouts, rate limits, 503)
- **Permanent Errors:** No retry (401, 403, 400, validation errors)
- **Tracked in DB:** `retry_count` + `last_error` columns

### Cost Tracking

**Per-URL Cost Calculation:**
- Layer 2: ScrapingBee request = $0.0001 (stored in `layer2_scraping_cost`)
- Layer 3: ScrapingBee + LLM = $0.002-0.004 (stored in `layer3_total_cost`)
- Layer 1: $0 (rule-based, no external calls)

**Aggregation:**
- Job-level cost: SUM of all URL costs
- Savings calculation: Eliminated URLs × Layer 3 average cost

---

## Future Roadmap

### Planned Enhancements

1. **Authentication System**
   - JWT-based user authentication
   - API key support for external integrations
   - Role-based access control

2. **Advanced Monitoring**
   - Structured logging with Winston/Pino
   - APM integration (New Relic, DataDog)
   - Custom metrics dashboard
   - Alert system (Slack, email)

3. **Performance Optimizations**
   - Database query optimization (EXPLAIN ANALYZE)
   - Redis caching layer for settings
   - Batch database writes (bulk inserts)
   - Connection pooling tuning

4. **Feature Enhancements**
   - Webhook support (job completion notifications)
   - Scheduled job execution (cron-based)
   - Multi-format export (JSON, Excel, Parquet)
   - Real-time WebSocket updates (vs. polling)

5. **Testing Improvements**
   - E2E test automation (Supertest + Jest)
   - Load testing automation (Artillery, k6)
   - Contract testing (Pact)
   - Mutation testing (Stryker)

---

## Related Documentation

- **[Data Models - API](./data-models-api.md)** - Database schema details
- **[API Contracts - API](./api-contracts-api.md)** - Endpoint specifications
- **[Development Guide - API](./development-guide-api.md)** - Setup and development workflow
- **[Integration Architecture](./integration-architecture.md)** - API ↔ Web communication
- **[Project Overview](./project-overview.md)** - High-level project context

---

**Documentation Generated:** 2025-01-18
**Architecture Version:** 1.0
**Last Major Update:** Batch Processing Refactor (spec-001)
