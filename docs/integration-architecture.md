# Integration Architecture

**Project:** Website Scraper (Batch Processing Workflow)
**Architecture:** Monorepo Multi-Part Integration
**Parts:** API (NestJS Backend) ↔ Web (Next.js Frontend) ↔ Shared (TypeScript Library)
**Last Updated:** 2025-01-18

---

## Executive Summary

This document describes how the three parts of the Website Scraper Project integrate and communicate with each other. The architecture follows a **Client-Server pattern** with a RESTful API backend, a Next.js frontend client, and a shared TypeScript library for type safety across the monorepo.

---

## Integration Overview

```
┌────────────────────────────────────────────────────────────────┐
│                      Monorepo Structure                         │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐      │
│  │  Web (Next.js) │───│ Shared (TS) │───│ API (NestJS) │      │
│  │  Port: 3000    │   │  Types/Utils│   │  Port: 3001  │      │
│  └──────────────┘   └──────────────┘   └──────────────┘      │
│         │                                        │              │
│         │  HTTP REST API (JSON)                 │              │
│         └────────────────────────────────────────┘              │
│                                                                  │
│  External Services:                                             │
│  - Supabase (PostgreSQL) ← API                                 │
│  - Redis (BullMQ) ← API                                        │
│  - ScrapingBee API ← API                                       │
│  - Gemini AI ← API                                             │
│  - OpenAI GPT ← API                                            │
└────────────────────────────────────────────────────────────────┘
```

---

## Integration Points

### 1. **API ↔ Web Communication**

**Protocol:** HTTP/REST
**Data Format:** JSON
**Authentication:** None (internal tool)
**CORS:** Enabled for frontend origin

#### Request/Response Flow

```
Web Frontend (React Component)
   │
   ├─> React Query Hook (useJobs)
   │     │
   │     └─> API Client (jobsApi.getAll())
   │           │
   │           └─> Axios GET /jobs
   │                 │
   │                 ├─> API Backend (JobsController)
   │                 │     │
   │                 │     └─> JobsService.getAll()
   │                 │           │
   │                 │           └─> Supabase Query
   │                 │
   │                 ├─> Response: { success: true, data: [...] }
   │                 │
   │                 └─> Transform (snake_case → camelCase)
   │
   └─> React Query Cache Update → UI Re-render
```

#### API Endpoints Used by Web

| Endpoint | Method | Purpose | Frontend Hook |
|----------|--------|---------|---------------|
| `/jobs` | GET | List all jobs | `useJobs()` |
| `/jobs/:id` | GET | Get job details | `useJob(id)` |
| `/jobs/:id/results` | GET | Get job results | `useResults(id)` |
| `/jobs/create` | POST | Create new job | `useMutation` |
| `/jobs/:id/export` | POST | Export CSV | `useExportResults(id)` |
| `/jobs/:id/pause` | PATCH | Pause job | `useMutation` |
| `/jobs/:id/resume` | PATCH | Resume job | `useMutation` |
| `/jobs/:id/cancel` | DELETE | Cancel job | `useMutation` |
| `/jobs/queue/status` | GET | Queue status | `useQueuePolling()` |
| `/settings` | GET | Get settings | `useSettings()` |
| `/settings` | PATCH | Update settings | `useMutation` |

#### Data Transformation

**Backend → Frontend:**
- Snake case (`job_name`) → Camel case (`jobName`)
- ISO strings → Date objects where needed
- Add calculated fields (e.g., `progressPercentage`)

**Example Transformation:**
```typescript
// Backend response (API)
{
  "id": "abc123",
  "job_name": "My Job",
  "total_urls": 100,
  "processed_urls": 50,
  "created_at": "2025-01-18T10:00:00Z"
}

// Frontend model (Web)
{
  id: "abc123",
  name: "My Job",
  totalUrls: 100,
  processedUrls: 50,
  createdAt: new Date("2025-01-18T10:00:00Z"),
  progressPercentage: 50 // Calculated
}
```

---

### 2. **API ↔ Shared Integration**

**Type:** Direct TypeScript imports
**Purpose:** Shared type definitions and utilities

#### Import Pattern

```typescript
// In API (apps/api/src/)
import type { Job, UrlResult, Layer1AnalysisResult } from '@website-scraper/shared';
import { jobSchema } from '@website-scraper/shared';
import { formatCurrency } from '@website-scraper/shared';

// Usage
const job: Job = { ... };
const validated = jobSchema.parse(job);
```

#### Shared Types Used by API

- `Job` - Job entity type
- `UrlResult` - Result entity type
- `Layer1AnalysisResult` - Layer 1 output type
- `Layer2OperationalSignals` - Layer 2 signals
- `Layer3LlmClassification` - Layer 3 classification
- `UrlJobData` - BullMQ job payload
- `ClassificationSettings` - Settings type

#### Shared Utilities Used by API

- `formatCurrency()` - Cost formatting
- `formatDuration()` - Time formatting

---

### 3. **Web ↔ Shared Integration**

**Type:** Direct TypeScript imports
**Purpose:** Shared type definitions and utilities

#### Import Pattern

```typescript
// In Web (apps/web/)
import type { Job, UrlResult } from '@website-scraper/shared';
import { formatCurrency, formatPercentage } from '@website-scraper/shared';

// Usage in components
interface JobCardProps {
  job: Job;
}

function JobCard({ job }: JobCardProps) {
  return <div>{formatCurrency(job.total_cost)}</div>;
}
```

#### Shared Types Used by Web

- `Job` - Job display type
- `UrlResult` - Result display type
- All Layer 1/2/3 factor types

#### Shared Utilities Used by Web

- `formatCurrency()` - Cost display
- `formatPercentage()` - Progress display
- `formatDuration()` - Time display

---

### 4. **API ↔ Supabase (PostgreSQL)**

**Type:** Database client connection
**Purpose:** Data persistence

#### Connection Flow

```typescript
// SupabaseService (apps/api/src/supabase/)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Query example
const { data, error } = await supabase
  .from('jobs')
  .select('*')
  .order('created_at', { ascending: false });
```

#### Tables Accessed

- `jobs` - Job metadata
- `job_urls` - URL lists per job
- `url_results` - Processing results with factors
- `classification_settings` - Layer 1/2/3 rules

---

### 5. **API ↔ Redis (BullMQ)**

**Type:** Queue connection
**Purpose:** Asynchronous job processing

#### Queue Flow

```typescript
// QueueService adds jobs
await queue.add('process-url', {
  jobId: '123',
  url: 'https://example.com',
  urlId: 'url-456'
});

// UrlWorkerProcessor consumes jobs
@Processor('url-processing-queue', { concurrency: 5 })
class UrlWorkerProcessor {
  async process(job: Job<UrlJobData>) {
    // Process URL through Layer 1/2/3
  }
}
```

#### Queue Configuration

- Queue Name: `url-processing-queue`
- Concurrency: 5 workers
- Connection: Redis URL from environment
- Retry: 3 attempts with exponential backoff

---

### 6. **API ↔ External Services**

#### ScrapingBee API

```typescript
// ScraperService makes HTTP requests
const response = await axios.get('https://app.scrapingbee.com/api/v1/', {
  params: {
    api_key: process.env.SCRAPINGBEE_API_KEY,
    url: targetUrl,
    render_js: false,
  }
});
```

#### Google Gemini AI

```typescript
// LlmService uses @google/generative-ai
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
const result = await model.generateContent(prompt);
```

#### OpenAI GPT (Fallback)

```typescript
// LlmService uses openai SDK
const completion = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: prompt }],
});
```

---

## Real-Time Updates

### Polling Strategy

**Dashboard Polling (Web → API):**

```typescript
// useJobs() hook with React Query
export function useJobs() {
  return useQuery({
    queryKey: ['jobs'],
    queryFn: jobsApi.getAll,
    refetchInterval: 10_000, // Poll every 10 seconds
  });
}
```

**Benefits:**
- Simple implementation (no WebSocket complexity)
- Automatic background updates
- Works with HTTP/2 multiplexing
- React Query handles caching/deduplication

**Future Enhancement:** WebSocket for instant updates

---

## Data Flow Examples

### Example 1: Job Creation

```
1. User uploads CSV file in Web UI
   ↓
2. JobCreationForm component submits FormData
   ↓
3. API Client: POST /jobs/create (multipart/form-data)
   ↓
4. JobsController receives file upload
   ↓
5. FileParserService extracts URLs
   ↓
6. UrlValidationService validates and deduplicates
   ↓
7. JobsService creates job in Supabase
   ↓
8. QueueService adds URLs to BullMQ queue
   ↓
9. Response: { job_id, url_count, status: 'processing' }
   ↓
10. React Query invalidates ['jobs'] cache
   ↓
11. Dashboard auto-refreshes (polling) → shows new job
```

### Example 2: Export Results

```
1. User clicks "Export CSV" button on job detail page
   ↓
2. ExportDialog component opens, user selects format
   ↓
3. API Client: POST /jobs/:id/export?format=complete
   ↓
4. JobsController.exportResults() calls ExportService
   ↓
5. ExportService streams CSV from database query
   ↓
6. Response: CSV file stream (Content-Type: text/csv)
   ↓
7. Browser triggers download (Save File dialog)
```

### Example 3: Real-Time Progress Tracking

```
Background Process (BullMQ Worker):
1. UrlWorkerProcessor processes URL
   ↓
2. Layer 1 analysis → Update url_results (current_layer: 'layer1')
   ↓
3. Layer 2 scraping → Update url_results (current_layer: 'layer2')
   ↓
4. Layer 3 LLM → Update url_results (current_layer: 'layer3', classification: 'approved')
   ↓
5. Update jobs table (processed_urls += 1)

Frontend Polling:
1. React Query polls GET /jobs every 10 seconds
   ↓
2. Receives updated processed_urls count
   ↓
3. JobProgressCard re-renders with new progress bar value
```

---

## Environment Configuration

### Development

```
API:
- http://localhost:3001

Web:
- http://localhost:3000
- NEXT_PUBLIC_API_URL=http://localhost:3001

Shared:
- No runtime (TypeScript only)
```

### Production (Railway)

```
API:
- https://api.production-domain.com

Web:
- https://web.production-domain.com
- NEXT_PUBLIC_API_URL=https://api.production-domain.com

CORS:
- API allows: https://web.production-domain.com
```

---

## Error Handling

### API Error Response Format

```json
{
  "success": false,
  "error": "User-friendly error message"
}
```

### Frontend Error Handling

```typescript
const { data, error, isError } = useJobs();

if (isError) {
  toast.error(`Failed to load jobs: ${error.message}`);
}
```

### Retry Logic

- **React Query:** Automatic retry (1 attempt default)
- **BullMQ:** 3 attempts with exponential backoff
- **Axios:** No automatic retry (errors bubble to React Query)

---

## Security

### API → Web

- CORS enabled for frontend origin only
- No authentication (internal tool)
- Future: JWT-based auth

### API → Database

- Service role key (bypasses RLS)
- Connection via Supabase client

### API → External Services

- API keys stored in environment variables
- Rate limiting handled by external services

---

## Performance Characteristics

### Latency

| Operation | Avg Latency | Notes |
|-----------|-------------|-------|
| GET /jobs | 50-100ms | Database query + serialization |
| GET /jobs/:id/results (paginated) | 100-200ms | Database query with filters |
| POST /jobs/create | 200-500ms | File upload + parsing + DB insert |
| POST /jobs/:id/export | 1-5 seconds | Streaming CSV generation |
| Polling interval | 10 seconds | Dashboard background refresh |

### Throughput

- Concurrent API requests: 50+ (NestJS async)
- Concurrent BullMQ workers: 5
- Database connections: Supabase pooling (automatic)

---

## Monitoring

### Health Checks

```
GET /health → { status: 'ok' }
```

### Metrics (Future)

- Request duration (p50, p95, p99)
- Error rates by endpoint
- Queue depth and processing rate
- Database query performance

---

## Related Documentation

- **[Architecture - API Backend](./architecture-api.md)**
- **[Architecture - Web Frontend](./architecture-web.md)**
- **[Architecture - Shared Library](./architecture-shared.md)**
- **[API Contracts](./api-contracts-api.md)**
- **[Data Models](./data-models-api.md)**

---

**Documentation Generated:** 2025-01-18
