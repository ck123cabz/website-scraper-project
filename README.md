# Website Scraper - Batch Processing System

Automated system for processing large-scale URL analysis using a three-layer evaluation framework. Transform raw URL lists into comprehensive analysis reports through intelligent filtering and LLM-powered classification.

## Features

### Automated Batch Processing
- Queue-based architecture: URLs processed in efficient batches
- Distributed evaluation: Three-layer elimination funnel for comprehensive analysis
- Real-time monitoring: Live dashboard showing job progress and queue status
- Scalable infrastructure: Process 10,000+ URLs per job

### Layer Analysis Framework

**Layer 1: TLD & Domain Classification**
- Analyzes domain structure and TLD characteristics
- Classifies domain commercial viability
- Fast pre-filtering (eliminates ~20% of URLs)

**Layer 2: Pattern & Sophistication Detection**
- Detects specific URL patterns (phishing, spam indicators)
- Analyzes organizational sophistication signals
- Eliminates ~30% of remaining URLs

**Layer 3: Deep Content Analysis**
- Analyzes page content and structure
- Detects SEO manipulation and keyword stuffing
- Final decision based on comprehensive LLM-powered analysis

### CSV Export & Analytics
- Export results in multiple formats (complete, summary, layer-specific)
- Filter by decision, confidence level, elimination layer
- Excel/Google Sheets/LibreOffice compatible
- RFC 4180 compliant with UTF-8 BOM

### Job Management
- Automatic progress tracking
- Queue position visibility for waiting jobs
- Job archival after 90 days (auto-delete after 180 days)
- Full audit trail and error tracking

## Quick Start

### Prerequisites

- Node.js 18+ (v24.6.0+ recommended)
- Redis 6.0+
- PostgreSQL 14+ (via Supabase)
- API Keys: ScrapingBee, Gemini AI, OpenAI

### 1. Installation

```bash
# Clone repository
git clone <repository-url>
cd website-scraper-project

# Install dependencies
npm install

# Setup environment variables
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with your API keys

# Setup database
npx supabase link --project-ref <your-project-id>
npx supabase db push

# Start development servers
npm run dev
```

Services will be available at:
- API: `http://localhost:3001`
- Web UI: `http://localhost:3000`
- Bull Board: `http://localhost:3001/admin/queues`

### 2. Create a Job

**Via API:**

```bash
curl -X POST http://localhost:3001/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Website Analysis Q1 2025",
    "urls": [
      "https://example.com",
      "https://example.org",
      "https://example.net"
    ]
  }'
```

Response:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Website Analysis Q1 2025",
  "status": "queued",
  "url_count": 3,
  "created_at": "2025-01-13T10:30:00Z"
}
```

**Via Web UI:**

1. Navigate to `http://localhost:3000/jobs/new`
2. Enter job name
3. Upload CSV file or paste URLs (one per line)
4. Click "Create Job"

### 3. Monitor Progress

**Via API:**

```bash
# Get queue status
curl http://localhost:3001/queue/status

# Get job details
curl http://localhost:3001/jobs/{jobId}
```

**Via Web UI:**

- Dashboard: Real-time progress bars, layer breakdown, cost accumulation
- Bull Board: Low-level queue monitoring at `http://localhost:3001/admin/queues`

### 4. View Results

**Via API:**

```bash
# Get paginated results
curl http://localhost:3001/jobs/{jobId}/results?page=1&limit=50

# Filter by decision
curl http://localhost:3001/jobs/{jobId}/results?finalDecision=accepted

# Filter by confidence band
curl http://localhost:3001/jobs/{jobId}/results?confidenceBand=high

# Get specific result with full factor breakdown
curl http://localhost:3001/jobs/{jobId}/results/{resultId}
```

**Via Web UI:**

1. Navigate to job detail page
2. Click "Results" tab
3. Use filters and search
4. Click expand button on any row to see full Layer 1/2/3 analysis

### 5. Export Results

**Via API:**

```bash
# Export complete CSV (48 columns - all factors)
curl -X POST http://localhost:3001/jobs/{jobId}/export \
  -H "Content-Type: application/json" \
  -d '{"format": "complete"}' \
  -o results.csv

# Export summary CSV (7 columns - key metrics only)
curl -X POST http://localhost:3001/jobs/{jobId}/export \
  -H "Content-Type: application/json" \
  -d '{"format": "summary"}' \
  -o summary.csv

# Export with filters (accepted URLs only)
curl -X POST http://localhost:3001/jobs/{jobId}/export \
  -H "Content-Type: application/json" \
  -d '{
    "format": "complete",
    "filters": {
      "decision": "accepted",
      "eliminatedAtLayer": "passed_all"
    }
  }' \
  -o accepted-results.csv
```

**Via Web UI:**

1. Navigate to job detail page
2. Click "Export" button
3. Select format (complete, summary, layer1, layer2, layer3)
4. Apply optional filters
5. Download CSV file

**Export Formats:**

| Format | Columns | Description |
|--------|---------|-------------|
| `complete` | 48 | All factors and analysis details from all layers |
| `summary` | 7 | URL, decision, confidence, cost, processing time |
| `layer1` | 15 | Layer 1 TLD and domain factors only |
| `layer2` | 25 | Layer 1-2 factors (domain + publication detection) |
| `layer3` | 40 | All Layer 1-3 factors (full analysis chain) |

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────┐
│                   Frontend Dashboard                 │
│  (Next.js + React Query, real-time updates)         │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│                 API Gateway                          │
│         (NestJS, validation, auth)                   │
└──┬──────────────────────────────────┬───────────────┘
   │                                  │
   │                    ┌─────────────▼────────────┐
   │                    │   Job Queue (BullMQ)    │
   │                    │  (5 concurrent workers)  │
   │                    └─────────────┬────────────┘
   │                                  │
   └──────────────────┬───────────────▼────────────────┐
                      │                                │
              ┌───────▼────────┐        ┌──────────────▼────┐
              │  Layer 1-3     │        │  Results Database │
              │  Analysis      │        │  (Supabase)       │
              │  Workers       │        │                   │
              └────────────────┘        └───────────────────┘
```

### Processing Pipeline

```
1. CSV Upload → 2. Parse URLs → 3. Queue Job
           ↓
4. Distribute to Workers (batch processing)
           ↓
5. Layer 1: TLD Classification (fast filter)
           ↓
6. Layer 2: Pattern Detection (medium filter)
           ↓
7. Layer 3: Content Analysis (deep LLM analysis)
           ↓
8. Decision & Storage → Write to url_results → Dashboard
           ↓
9. Export & Reporting (CSV/JSON)
```

### Layer Analysis Details

**Layer 1: Domain Analysis**
- TLD classification (gTLD, ccTLD, custom)
- Domain pattern matching (phishing, spam indicators)
- Commercial viability assessment
- Processing: ~0.1s per URL (no external API calls)

**Layer 2: Publication Detection**
- Content structure analysis (HTML parsing)
- Publication type classification (blog, news, commercial)
- Sophistication scoring (0-100)
- Processing: ~2-5s per URL (ScrapingBee + Gemini)

**Layer 3: LLM Classification**
- Deep content quality analysis
- Design sophistication assessment
- Authority indicator detection
- SEO manipulation detection
- Processing: ~5-10s per URL (OpenAI GPT-4)

## Configuration

### Environment Variables

Create `apps/api/.env` from the example:

```bash
# Server Configuration
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here

# LLM Configuration
GEMINI_API_KEY=your-gemini-api-key-here
OPENAI_API_KEY=your-openai-api-key-here

# ScrapingBee Configuration
SCRAPINGBEE_API_KEY=your-scrapingbee-api-key-here

# Queue Configuration (optional, defaults shown)
QUEUE_CONCURRENCY=5
BATCH_SIZE=100

# Mock Services (for testing without API costs)
USE_MOCK_SERVICES=false

# Archival Configuration (optional)
ARCHIVAL_AFTER_DAYS=90
DELETE_AFTER_DAYS=180
```

### Queue Configuration

The queue processes jobs with these defaults:

- **Concurrency**: 5 jobs simultaneously
- **Batch Size**: 100 URLs per batch
- **Retry Strategy**: 3 attempts with exponential backoff (1s, 2s, 4s)
- **Timeout**: 30s per URL (Layer 3 analysis)

To adjust these settings, modify the environment variables or update `apps/api/src/queue/queue.service.ts`.

## API Documentation

Interactive API documentation available at:
- **Swagger UI**: `http://localhost:3001/api/docs` (coming soon)
- **Bull Board**: `http://localhost:3001/admin/queues`

### Key Endpoints

**Jobs**
- `POST /jobs` - Create new job
- `GET /jobs` - List all jobs
- `GET /jobs/:id` - Get job details
- `DELETE /jobs/:id` - Delete job

**Results**
- `GET /jobs/:jobId/results` - List results (paginated, filterable)
- `GET /jobs/:jobId/results/:resultId` - Get single result with factors
- `POST /jobs/:jobId/retry` - Retry failed URLs

**Export**
- `POST /jobs/:jobId/export` - Generate CSV export

**Queue**
- `GET /queue/status` - Get queue status and active jobs

## Database Schema

### Key Tables

**jobs**
```sql
- id: UUID (primary key)
- name: TEXT
- status: TEXT (queued, processing, completed, failed, archived)
- url_count: INTEGER
- processed_count: INTEGER
- success_count: INTEGER
- failure_count: INTEGER
- total_cost: NUMERIC
- created_at: TIMESTAMPTZ
- completed_at: TIMESTAMPTZ
- archived_at: TIMESTAMPTZ
```

**url_results**
```sql
- id: UUID (primary key)
- job_id: UUID (foreign key → jobs)
- url: TEXT
- final_decision: TEXT (accepted, rejected, error)
- confidence_score: NUMERIC (0-1)
- confidence_band: TEXT (high, medium, low)
- eliminated_at_layer: TEXT (layer1, layer2, passed_all)
- layer1_factors: JSONB (TLD analysis)
- layer2_factors: JSONB (publication detection)
- layer3_factors: JSONB (sophistication analysis)
- processing_time_ms: INTEGER
- api_cost: NUMERIC
- retry_count: INTEGER
- last_error: TEXT
- created_at: TIMESTAMPTZ
```

**activity_logs**
```sql
- id: UUID (primary key)
- job_id: UUID (foreign key → jobs)
- activity_type: TEXT (job_created, url_processed, job_completed, error)
- details: JSONB
- created_at: TIMESTAMPTZ
```

### JSONB Factor Structures

**layer1_factors:**
```json
{
  "tld_type": "gtld|cctld|custom",
  "tld_value": ".com",
  "domain_classification": "commercial|personal|institutional|spam",
  "pattern_matches": ["suspicious-keyword"],
  "target_profile": {
    "type": "small_business",
    "confidence": 0.85
  },
  "reasoning": "Domain uses .com gTLD with commercial indicators...",
  "passed": true
}
```

**layer2_factors:**
```json
{
  "publication_type": "blog|news|commercial|personal",
  "sophistication_score": 75,
  "module_scores": {
    "navigation": 0.8,
    "content_structure": 0.7,
    "visual_hierarchy": 0.75
  },
  "keywords_found": ["professional", "services"],
  "content_signals": ["multiple_pages", "contact_form"],
  "reasoning": "Site shows moderate sophistication with structured navigation...",
  "passed": true
}
```

**layer3_factors:**
```json
{
  "sophistication_signals": {
    "design_quality": { "score": 0.85, "indicators": ["modern_layout", "responsive"] },
    "authority_indicators": { "score": 0.7, "indicators": ["about_page", "contact"] },
    "professional_presentation": { "score": 0.8, "indicators": ["consistent_branding"] },
    "content_originality": { "score": 0.75, "indicators": ["unique_content"] }
  },
  "seo_manipulation_detected": false,
  "keyword_stuffing_score": 0.1,
  "final_classification": "accepted",
  "confidence": 0.82,
  "reasoning": "Website demonstrates high design quality with modern responsive layout...",
  "tokens_used": 1250
}
```

## Performance Targets

Validated success criteria from testing:

| Metric | Target | Status |
|--------|--------|--------|
| 10k URL processing | <3 hours | ✅ Verified |
| Results pagination (100k rows) | <500ms | ✅ Verified |
| Dashboard updates | <5s latency | ✅ Real-time |
| CSV export (10k rows) | <5 seconds | ✅ Streaming |
| Concurrent jobs | 5 without degradation | ✅ Verified |
| Storage | <50MB per 10k URLs | ✅ Verified |
| Transient error recovery | <1% permanent fail | ✅ Verified |

## Development

### Project Structure

```
website-scraper-project/
├── apps/
│   ├── api/              # NestJS backend
│   │   ├── src/
│   │   │   ├── jobs/     # Job management module
│   │   │   ├── queue/    # Queue processing and workers
│   │   │   ├── common/   # Shared utilities
│   │   │   └── main.ts   # Application entry point
│   │   └── test/
│   │
│   └── web/              # Next.js frontend
│       ├── app/
│       │   ├── jobs/     # Job pages
│       │   ├── dashboard/
│       │   └── settings/
│       └── components/
│           ├── results/  # Results table components
│           └── dashboard/
│
├── packages/
│   └── shared/           # Shared types and utilities
│       └── src/
│           └── types/    # TypeScript type definitions
│
├── supabase/
│   └── migrations/       # Database migrations
│
├── specs/                # Feature specifications
│   └── 001-batch-processing-refactor/
│
└── docs/                 # Documentation
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov

# Run E2E tests (Playwright)
cd apps/web
npm run test:e2e

# Run linting
npm run lint

# Type checking
npm run type-check
```

### Development Workflow

1. **Start services:**
   ```bash
   npm run dev
   ```

2. **Make changes** to code

3. **Write tests** (TDD approach)

4. **Run tests:**
   ```bash
   npm test
   ```

5. **Commit changes:**
   ```bash
   git add .
   git commit -m "feat: description of changes"
   ```

6. **Create pull request** for review

### Database Migrations

```bash
# Create new migration
npx supabase migration new migration_name

# Apply migrations locally
npx supabase db push

# Reset database (destructive)
npx supabase db reset

# Check migration status
npx supabase migration list
```

## Deployment

### Production Environment

The application is designed to deploy on Railway with:

- **API**: Node.js service (Port 3001)
- **Web**: Next.js service (Port 3000)
- **Redis**: Managed Redis instance
- **PostgreSQL**: Supabase managed database

### Environment Setup

1. Set all required environment variables in Railway dashboard
2. Link Supabase project
3. Deploy both API and Web services
4. Run migrations: `npx supabase db push`

### Health Checks

- API: `GET /health` - Returns service status
- Queue: `GET /admin/queues` - Bull Board dashboard

## Troubleshooting

### Common Issues

**Jobs stuck in queue:**
- Check Redis connection: `redis-cli ping`
- Check worker status in Bull Board: `http://localhost:3001/admin/queues`
- Verify queue concurrency settings in environment

**Layer 3 timeouts:**
- Increase timeout in `queue.service.ts`
- Check OpenAI API key validity
- Check OpenAI rate limits and billing

**CSV export fails:**
- Check database connection
- Verify job has completed processing
- Check available memory for large exports

**Database connection errors:**
- Verify Supabase URL and keys in `.env`
- Check network connectivity
- Confirm migrations are applied

### Debug Mode

Enable detailed logging:

```bash
# In apps/api/.env
NODE_ENV=development
LOG_LEVEL=debug
```

View logs:
- API: Console output
- Queue: Bull Board dashboard
- Database: Supabase dashboard logs

## Support

For issues or questions:

- **Documentation**: See `/specs/001-batch-processing-refactor/` for detailed specifications
- **Quickstart Guide**: `./specs/001-batch-processing-refactor/quickstart.md`
- **API Reference**: `http://localhost:3001/admin/queues`
- **Issues**: Create GitHub issue with reproduction steps

## Roadmap

### Completed
- ✅ Three-layer analysis framework
- ✅ Batch processing with BullMQ
- ✅ CSV export with multiple formats
- ✅ Real-time dashboard
- ✅ Factor breakdown UI

### In Progress
- 🚧 API documentation (Swagger/OpenAPI)
- 🚧 Manual review system removal
- 🚧 Enhanced filtering and search

### Planned
- ⏳ Webhook notifications for job completion
- ⏳ Bulk job management
- ⏳ Advanced analytics and reporting
- ⏳ Team collaboration features

## License

MIT

## Contributors

See [CONTRIBUTORS.md](./CONTRIBUTORS.md) for list of contributors.

---

**Last Updated**: 2025-11-13
**Version**: 0.1.0
**Branch**: `001-batch-processing-refactor`
