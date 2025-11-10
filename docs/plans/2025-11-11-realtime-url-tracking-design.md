# Real-time URL Tracking Table Design

**Date:** 2025-11-11
**Status:** Design Approved
**Authors:** Design Session

## Overview

Transform the job detail view from a progress bar and tabbed interface into a unified, real-time table that shows all uploaded URLs with live status updates as they progress through processing stages (queued → processing → completed/failed).

## Problem Statement

Current job detail view shows:
- Progress bar with aggregate metrics
- "Overview" tab showing only the currently processing URL
- "Results" tab showing only completed results
- Activity logs in a separate tab

**Limitations:**
- No visibility into queued URLs waiting to be processed
- Cannot see which URLs are being processed in real-time
- Disconnect between "what's uploaded" and "what's visible"
- Poor UX for tracking progress of large batches

## Goals

1. **Real-time Visibility:** Show all URLs from upload to completion with live status updates
2. **Processing Transparency:** Display current processing stage (fetching/filtering/classifying) for active URLs
3. **Unified Interface:** Replace tabbed interface with single comprehensive table view
4. **Live Stats:** Modern stat cards showing real-time counts (total/queued/processing/completed/failed)
5. **Detailed Inspection:** Side panel for viewing filtering journey and activity logs

## Architecture

### Approach: Normalized Job URLs Table

**Rationale:** Create a dedicated `job_urls` table to track URL lifecycle with status updates from the worker. This provides:
- Clean database design with proper normalization
- Easy queries for any status
- Scalable architecture for large URL batches
- Clear separation of concerns (job_urls = lifecycle, results = outcomes)

**Alternative approaches considered:**
- ❌ Client-side merge: Heavy client processing, poor performance with large datasets
- ❌ Database view: Complex logic, less flexible for real-time updates

## Database Schema

### New Table: `job_urls`

```sql
CREATE TABLE job_urls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
    -- Values: 'queued', 'processing', 'completed', 'failed'
  processing_stage TEXT,
    -- Values: 'fetching', 'filtering', 'classifying' (only when status='processing')
  result_id UUID REFERENCES results(id) ON DELETE SET NULL,
  order_index INTEGER NOT NULL,
  queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_job_urls_job_id ON job_urls(job_id);
CREATE INDEX idx_job_urls_status ON job_urls(status);
CREATE INDEX idx_job_urls_result_id ON job_urls(result_id);
```

### Row-Level Security (RLS)

```sql
ALTER TABLE job_urls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own job urls"
  ON job_urls FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_urls.job_id
      AND jobs.user_id = auth.uid()
    )
  );
```

### Auto-update Trigger

```sql
CREATE OR REPLACE FUNCTION update_job_urls_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_job_urls_updated_at_trigger
  BEFORE UPDATE ON job_urls
  FOR EACH ROW
  EXECUTE FUNCTION update_job_urls_updated_at();
```

## Data Flow

### 1. Job Creation

```
User uploads CSV → POST /api/jobs
                         ↓
                   Create job record
                         ↓
          Bulk insert URLs to job_urls (status='queued')
                         ↓
                  Queue BullMQ jobs
                         ↓
                Return job ID to client
```

### 2. Worker Processing

```
BullMQ picks job → Fetch next queued URL from job_urls
                         ↓
         UPDATE job_urls SET
           status='processing',
           processing_stage='fetching',
           started_at=NOW()
                         ↓
         Frontend receives realtime update
                         ↓
    (Table row badge changes to "Processing - Fetching")
                         ↓
         Worker fetches URL content
                         ↓
         UPDATE processing_stage='filtering'
                         ↓
         Frontend receives realtime update
                         ↓
         Worker runs Layer 1 + prefilter
                         ↓
         UPDATE processing_stage='classifying'
                         ↓
         Frontend receives realtime update
                         ↓
         Worker runs LLM classification
                         ↓
         INSERT result to results table
                         ↓
         UPDATE job_urls SET
           status='completed',
           result_id=<new_result_id>,
           completed_at=NOW()
                         ↓
         Frontend receives realtime update
                         ↓
    (Table row shows full result data)
```

### 3. Failure Handling

```
Worker encounters error → UPDATE job_urls SET
                           status='failed',
                           completed_at=NOW()
                                ↓
                  Frontend receives realtime update
                                ↓
           (Table row shows failed badge)
```

## Backend API

### New Endpoint: Get Job URLs

```
GET /api/jobs/:id/urls?page=1&limit=50&status=processing&search=example.com
```

**Response:**
```typescript
{
  urls: [
    {
      id: string,
      url: string,
      status: 'queued' | 'processing' | 'completed' | 'failed',
      processingStage?: 'fetching' | 'filtering' | 'classifying',
      orderIndex: number,
      queuedAt: string,
      startedAt?: string,
      completedAt?: string,
      // If completed, include result summary (joined from results table)
      result?: {
        id: string,
        classification: 'suitable' | 'not_suitable' | 'rejected_prefilter',
        score: number,
        cost: number,
        processingTime: number
      }
    }
  ],
  pagination: {
    total: number,
    page: number,
    limit: number,
    hasMore: boolean
  },
  stats: {
    total: number,
    queued: number,
    processing: number,
    completed: number,
    failed: number
  }
}
```

**Implementation:**
- LEFT JOIN job_urls with results on result_id
- Filter by status, search term
- Order by order_index (preserve upload order)
- Server-side pagination (default 50 per page)

### Worker Updates

**Key Changes:**
1. On job start: Bulk insert all URLs to job_urls
2. Before processing URL: UPDATE status to 'processing'
3. During processing: UPDATE processing_stage as it progresses
4. After completion: UPDATE status + link result_id
5. On error: UPDATE status to 'failed'

**Code locations:**
- `apps/api/src/jobs/jobs.service.ts` - Job creation with job_urls insert
- `apps/api/src/jobs/jobs.processor.ts` - Worker updates to job_urls

## Frontend Implementation

### Component Architecture

```
JobDetailClient
├── Header (job name, back button, controls)
├── StatsCards (NEW)
│   └── 6 cards: Total, Queued, Processing, Completed, Failed, Success Rate
├── LiveUrlsTable (NEW - replaces tabbed interface)
│   ├── Filter toolbar (search, status filter, column visibility)
│   ├── TanStack Table with columns
│   └── Pagination controls
└── UrlDetailsSheet (NEW - side panel)
    └── Tabs: Details (filtering journey) + Activity Logs
```

### shadcn/ui Components

**Required components:**
- `Card` - Stats cards
- `Table` (TanStack React Table) - Main URL table
- `Badge` - Status indicators
- `Spinner` - Processing animations
- `Sheet` - Side panel for details
- `Tabs` - Details/logs tabs in sheet
- `Accordion` - Filtering journey sections
- `ScrollArea` - Logs in sheet
- `DropdownMenu` - Filters and column visibility
- `Input` - Search

### Table Columns

| Column | Description | Visual |
|--------|-------------|--------|
| URL | Clickable link, truncated with tooltip | `example.com/page` |
| Status | Current state badge | Badge with icon |
| Progress Stage | Current processing step (if processing) | `Fetching...` |
| Classification | suitable/not_suitable/rejected | Color-coded badge |
| Score | Confidence percentage | `87%` |
| Time | Processing duration | `2.3s` |
| Cost | LLM cost | `$0.003` |
| Timestamp | Queued/completed time | `2 min ago` |

### Status Badges

```tsx
// Queued
<Badge variant="secondary" className="text-muted-foreground">
  <Clock className="w-3 h-3 mr-1" />
  Queued
</Badge>

// Processing
<Badge variant="outline">
  <Spinner />
  Fetching  // or "Filtering", "Classifying"
</Badge>

// Completed
<Badge variant="default" className="bg-green-500">
  <CheckCircle className="w-3 h-3 mr-1" />
  Completed
</Badge>

// Failed
<Badge variant="destructive">
  <XCircle className="w-3 h-3 mr-1" />
  Failed
</Badge>
```

### Stats Cards Layout

```tsx
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">Total URLs</CardTitle>
      <Globe className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{stats.total}</div>
    </CardContent>
  </Card>
  {/* Similar cards for: Queued, Processing, Completed, Failed, Success Rate */}
</div>
```

### Details Side Panel

```tsx
<Sheet open={selectedUrlId !== null} onOpenChange={() => setSelectedUrlId(null)}>
  <SheetContent side="right" className="w-[600px] sm:w-[700px]">
    <SheetHeader>
      <SheetTitle className="flex items-center gap-2">
        {url}
        <ExternalLink className="w-4 h-4" />
      </SheetTitle>
    </SheetHeader>
    <Tabs defaultValue="details">
      <TabsList>
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="logs">Activity Logs</TabsTrigger>
      </TabsList>
      <TabsContent value="details">
        {/* Status, Classification, Filtering Journey (Accordion), Metadata */}
      </TabsContent>
      <TabsContent value="logs">
        <ScrollArea className="h-[600px]">
          {/* Activity logs from current ActivityLog component */}
        </ScrollArea>
      </TabsContent>
    </Tabs>
  </SheetContent>
</Sheet>
```

## Real-time Updates

### Supabase Realtime Subscription

```typescript
// New hook: useJobUrls
const channel = supabase
  .channel(`job_urls:${jobId}`)
  .on('postgres_changes', {
    event: '*', // INSERT, UPDATE, DELETE
    schema: 'public',
    table: 'job_urls',
    filter: `job_id=eq.${jobId}`
  }, (payload) => {
    // Invalidate React Query cache to refetch
    queryClient.invalidateQueries(['job-urls', jobId])

    // Optimistically update stats without refetch
    updateStatsFromPayload(payload.new)
  })
  .subscribe()
```

### Performance Optimizations

1. **Debouncing:** Max 1 UI update per 500ms for rapid status changes
2. **Virtual Scrolling:** Use `@tanstack/react-virtual` for 1000+ URLs
3. **Pagination:** Server-side pagination (50 URLs per page)
4. **Optimistic Updates:** Update stats cards immediately from realtime events
5. **Selective Queries:** Only fetch visible data (don't load all 10,000 URLs)

### Fallback Strategy

```typescript
// If WebSocket fails, fallback to polling
channel.on('system', {}, (status) => {
  if (status === 'CLOSED') {
    // Start polling every 5 seconds
    startPollingFallback()
  }
})
```

## Migration Strategy

### Phase 1: Database Migration

1. Create `job_urls` table with indexes and RLS
2. Backfill existing completed jobs:
   ```sql
   INSERT INTO job_urls (job_id, url, status, result_id, order_index, queued_at, started_at, completed_at)
   SELECT
     r.job_id,
     r.url,
     'completed',
     r.id,
     ROW_NUMBER() OVER (PARTITION BY r.job_id ORDER BY r.created_at),
     r.created_at,
     r.created_at,
     r.created_at
   FROM results r
   WHERE NOT EXISTS (
     SELECT 1 FROM job_urls ju WHERE ju.result_id = r.id
   );
   ```

### Phase 2: Worker Updates

1. Update job creation to insert URLs into job_urls
2. Update worker to set status before/during/after processing
3. Add transitional logic: if job_urls empty, create entries on-the-fly

### Phase 3: Frontend Migration

1. Create new components (StatsCards, LiveUrlsTable, UrlDetailsSheet)
2. Update JobDetailClient to use new layout
3. Remove old tabbed interface (Overview/Results/Logs tabs)
4. Move activity logs into side panel

### Phase 4: Testing & Rollout

1. Test with small jobs (10 URLs)
2. Test with medium jobs (100 URLs)
3. Test with large jobs (1000+ URLs)
4. Monitor performance and realtime reliability
5. Full rollout

## Error Handling

### Realtime Connection Failures
- Fallback to polling every 5 seconds
- Show connection status indicator
- Automatic reconnection attempts

### Large URL Lists
- Pagination required for 50+ URLs per page
- Virtual scrolling for smooth performance
- Warning if user uploads >10,000 URLs

### Worker Crashes Mid-Processing
- Add timeout detection (URLs stuck in 'processing' >10min)
- Admin endpoint to reset stuck URLs to 'queued'
- Graceful error messaging in UI

### Race Conditions
- ON DELETE CASCADE handles job deletion
- Worker checks job exists before processing
- React Query handles multi-tab cache sync

## Testing Plan

### Unit Tests
- [ ] job_urls CRUD operations
- [ ] RLS policies prevent unauthorized access
- [ ] Status transitions are valid
- [ ] Stats calculations are correct

### Integration Tests
- [ ] Upload CSV → all URLs appear as queued
- [ ] Worker updates status → realtime UI update
- [ ] Complete processing → result data appears
- [ ] Pagination works with 1000 URLs
- [ ] Search and filters work correctly

### E2E Tests
- [ ] Upload job → see all URLs in table
- [ ] Watch real-time status updates
- [ ] Click URL → side panel opens with details
- [ ] Activity logs show in side panel
- [ ] Multi-tab sync works
- [ ] Fallback to polling works

### Performance Tests
- [ ] 100 URLs: <1s load time
- [ ] 1,000 URLs: <3s load time with pagination
- [ ] 10,000 URLs: Pagination + virtual scrolling
- [ ] Realtime updates don't cause UI jank

## Success Metrics

1. **Visibility:** Users can see all uploaded URLs immediately
2. **Real-time:** Status updates appear within 1 second
3. **Performance:** Table loads in <3s for 1000 URLs
4. **Reliability:** Realtime connection stays active 99% of time
5. **Usability:** Users can track job progress without confusion

## Future Enhancements

- Auto-scroll to currently processing URLs
- Bulk actions (retry failed URLs, delete specific URLs)
- Export filtered subset of URLs
- URL grouping by domain
- Advanced filtering (by score range, processing time, etc.)
- Comparison view (compare multiple jobs side-by-side)

## Open Questions

None - design approved and ready for implementation.
