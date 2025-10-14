# Technical Specification: Real-Time Transparency Dashboard

Date: 2025-10-13
Author: CK
Epic ID: epic-1
Status: Draft

---

## Overview

Epic 1 focuses on building the **Real-Time Transparency Dashboard** - the PRIMARY differentiator of the modernized platform. This epic delivers a comprehensive monitoring interface where multiple team members can simultaneously view scraping operations with live logs, progress indicators, current URL display, cost tracking, and historical results. The dashboard provides complete transparency into system operations with <500ms update latency via Supabase Realtime subscriptions.

This epic encompasses the entire frontend application (Next.js 14 + React 18 + shadcn/ui) and implements 7 user stories focused on UI/UX transparency. It depends on Epic 2 for backend API endpoints and database schema but can begin development with mock data and stub API responses.

## Objectives and Scope

### In Scope
- ✅ Complete Next.js 14 frontend application with App Router
- ✅ Real-time job dashboard showing all jobs (active, paused, completed)
- ✅ Live progress tracking with metrics updating every 1-2 seconds
- ✅ Current URL display panel with processing stage indicators
- ✅ Live activity log streaming with severity levels and filtering
- ✅ Real-time cost tracking display (total, per-URL, breakdown by provider)
- ✅ Historical results table with search, filtering, sorting, pagination
- ✅ Job control actions (pause, resume, cancel) with optimistic UI updates
- ✅ Supabase Realtime integration for collaborative viewing
- ✅ shadcn/ui component library implementation
- ✅ Responsive design (desktop-first, tablet/mobile support)
- ✅ WCAG 2.1 AA accessibility compliance
- ✅ TanStack Query for server state management
- ✅ Zustand for client state management

### Out of Scope (Deferred to Phase 2 or Epic 2)
- ❌ Backend API implementation (Epic 2)
- ❌ Authentication/authorization (MVP: no auth)
- ❌ URL upload functionality (Epic 2: Story 2.2)
- ❌ Excel export (CSV/JSON only for MVP)
- ❌ Custom classification prompts UI
- ❌ Advanced analytics charts/trends
- ❌ Email/webhook notifications
- ❌ Mobile app (responsive web only)

## System Architecture Alignment

This epic implements the **Frontend Application** component of the solution architecture:

### Architecture Pattern
- **Monorepo Structure**: `apps/web/` (Next.js frontend)
- **Shared Package**: `packages/shared/` for TypeScript types, Zod schemas, utilities
- **Repository**: Turborepo for monorepo management

### Frontend Stack (from Architecture)
- **Framework**: Next.js 14.2+ with App Router
- **UI Library**: React 18.3+
- **Component Library**: shadcn/ui (Radix UI primitives + Tailwind CSS)
- **Styling**: Tailwind CSS 3.4+ with OKLCH color system
- **State Management**: TanStack Query v5 (server state) + Zustand 4.5+ (client state)
- **Real-Time**: Supabase JS Client 2.45+ with Realtime subscriptions
- **Type Safety**: TypeScript 5.5+ with strict mode

### Integration Points
1. **Backend API** (Epic 2): REST endpoints at `/api/*` proxy to NestJS backend
2. **Supabase Database**: Direct read access via Supabase client (no RLS)
3. **Supabase Realtime**: WebSocket subscriptions to `jobs`, `results`, `activity_logs` tables

### Deployment Target
- **Platform**: Railway (frontend + backend deployed separately)
- **Build**: Next.js static + server components, optimized for production
- **Environment Variables**: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Detailed Design

### Services and Modules

| Module/Service | Responsibility | Location | Key Exports |
|---|---|---|---|
| **API Client** | HTTP requests to backend, error handling, type-safe endpoints | `apps/web/lib/api-client.ts` | `apiClient` (axios instance), typed endpoint functions |
| **Supabase Client** | Database access, Realtime subscriptions, connection management | `apps/web/lib/supabase-client.ts` | `supabaseClient`, subscription helpers |
| **React Query Hooks** | Server state management, caching, optimistic updates | `apps/web/hooks/use-jobs.ts`, `use-results.ts`, `use-logs.ts` | `useJobs()`, `useJob()`, `useJobResults()`, `usePauseJob()`, etc. |
| **Zustand Stores** | Client-side state (UI state, filters, pagination) | `apps/web/store/` | `useJobsStore`, `useFiltersStore`, `useUIStore` |
| **Realtime Service** | Supabase Realtime subscription lifecycle management | `apps/web/lib/realtime-service.ts` | `subscribeToJob()`, `subscribeToLogs()`, `unsubscribeAll()` |
| **Format Utilities** | Date/time formatting, cost formatting, duration calculation | `packages/shared/utils/format.ts` | `formatCurrency()`, `formatDuration()`, `formatTimestamp()` |
| **Job Dashboard Page** | Main dashboard route, job list display | `apps/web/app/dashboard/page.tsx` | Default export (Server Component) |
| **Job Detail Page** | Individual job monitoring view | `apps/web/app/jobs/[id]/page.tsx` | Default export (Server Component) |
| **shadcn/ui Components** | Reusable UI primitives (Button, Card, Table, Dialog, etc.) | `apps/web/components/ui/` | Individual component exports |
| **Custom Components** | Job Card, Progress Bar, Log Feed, Results Table, Cost Display | `apps/web/components/` | Component exports |

### Data Models and Contracts

All TypeScript types are defined in `packages/shared/src/types/` and shared between frontend and backend.

**Job Type** (`types/job.ts`):
```typescript
export type JobStatus = 'pending' | 'processing' | 'paused' | 'completed' | 'failed';
export type ProcessingStage = 'fetching' | 'filtering' | 'classifying';

export interface Job {
  id: string;
  name: string | null;
  status: JobStatus;
  totalUrls: number;
  processedUrls: number;
  successfulUrls: number;
  failedUrls: number;
  rejectedUrls: number;
  currentUrl: string | null;
  currentStage: ProcessingStage | null;
  progressPercentage: number;
  processingRate: number | null; // URLs per minute
  estimatedTimeRemaining: number | null; // seconds
  totalCost: number;
  geminiCost: number;
  gptCost: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
```

**Result Type** (`types/result.ts`):
```typescript
export type ResultStatus = 'success' | 'rejected' | 'failed';
export type ClassificationResult = 'suitable' | 'not_suitable' | 'rejected_prefilter';
export type LLMProvider = 'gemini' | 'gpt' | 'none';

export interface Result {
  id: string;
  jobId: string;
  url: string;
  status: ResultStatus;
  classificationResult: ClassificationResult | null;
  classificationScore: number | null; // 0-1
  classificationReasoning: string | null;
  llmProvider: LLMProvider;
  llmCost: number;
  processingTimeMs: number;
  retryCount: number;
  errorMessage: string | null;
  scrapedContentLength: number | null;
  processedAt: string;
  createdAt: string;
}
```

**Activity Log Type** (`types/activity-log.ts`):
```typescript
export type LogSeverity = 'success' | 'info' | 'warning' | 'error';

export interface ActivityLog {
  id: string;
  jobId: string;
  severity: LogSeverity;
  message: string;
  context: Record<string, any> | null; // JSONB field
  createdAt: string;
}
```

**Zod Schemas** (`packages/shared/src/schemas/`):
- All types have corresponding Zod schemas for runtime validation
- Used for API request/response validation
- Example: `JobSchema`, `ResultSchema`, `ActivityLogSchema`

### APIs and Interfaces

Frontend consumes REST API endpoints from NestJS backend (Epic 2). All endpoints are type-safe via shared TypeScript types.

**Jobs API** (from `apps/web/lib/api/jobs.ts`):
- `GET /jobs` - List all jobs with pagination/filtering
- `GET /jobs/:id` - Get detailed job info
- `PATCH /jobs/:id/pause` - Pause active job
- `PATCH /jobs/:id/resume` - Resume paused job
- `DELETE /jobs/:id/cancel` - Cancel job

**Results API** (from `apps/web/lib/api/results.ts`):
- `GET /jobs/:id/results` - Get job results with pagination, search, filtering
- `GET /jobs/:id/results/export` - Export results (CSV/JSON)

**Logs API** (from `apps/web/lib/api/logs.ts`):
- `GET /jobs/:id/logs` - Get activity logs with pagination/severity filtering

**React Query Hook Interfaces**:
```typescript
// apps/web/hooks/use-jobs.ts
export function useJobs(filters?: JobFilters) => UseQueryResult<Job[]>
export function useJob(jobId: string) => UseQueryResult<Job>
export function usePauseJob() => UseMutationResult<Job, Error, string>
export function useResumeJob() => UseMutationResult<Job, Error, string>
export function useCancelJob() => UseMutationResult<Job, Error, string>

// apps/web/hooks/use-results.ts
export function useJobResults(jobId: string, filters?: ResultFilters) => UseQueryResult<Result[]>
export function useExportResults(jobId: string, format: 'csv' | 'json') => UseMutationResult

// apps/web/hooks/use-logs.ts
export function useJobLogs(jobId: string, filters?: LogFilters) => UseQueryResult<ActivityLog[]>
```

**Supabase Realtime Subscriptions**:
```typescript
// apps/web/lib/realtime-service.ts
export function subscribeToJob(jobId: string, onUpdate: (job: Job) => void): RealtimeChannel
export function subscribeToResults(jobId: string, onInsert: (result: Result) => void): RealtimeChannel
export function subscribeToLogs(jobId: string, onInsert: (log: ActivityLog) => void): RealtimeChannel
export function unsubscribeAll(): void
```

### Workflows and Sequencing

**User Flow: View Live Job Progress**
1. User navigates to `/jobs/:id`
2. Page loads job data via `useJob(jobId)` (REST API)
3. Component initializes Realtime subscription: `subscribeToJob(jobId, updateCallback)`
4. Supabase Realtime pushes updates every time backend updates job row
5. React Query cache invalidated, UI re-renders with new data (<500ms latency)
6. Progress bar, metrics, current URL update in real-time
7. On unmount, subscription cleaned up: `unsubscribeAll()`

**User Flow: Monitor Live Logs**
1. User on job detail page
2. Log component calls `useJobLogs(jobId)` and `subscribeToLogs(jobId, onNewLog)`
3. Backend inserts log entry to `activity_logs` table
4. Supabase Realtime broadcasts INSERT event
5. Frontend receives log, prepends to log list
6. Auto-scroll to latest (unless user has scrolled up)
7. Filter applied client-side (severity, search text)

**User Flow: Pause Job (Optimistic UI)**
1. User clicks "Pause" button
2. UI immediately shows "Paused" state (optimistic update)
3. `usePauseJob()` mutation sends `PATCH /jobs/:id/pause`
4. Backend updates job status to "paused", BullMQ stops processing new URLs
5. Supabase Realtime broadcasts status change to all connected clients
6. All users see job paused (<500ms)
7. If API fails, UI reverts to previous state with error toast

## Non-Functional Requirements

### Performance

- **NFR001-P1**: Dashboard page initial load < 2 seconds (LCP)
- **NFR001-P2**: Realtime updates < 500ms latency from database change to UI render
- **NFR001-P3**: Log streaming < 1 second latency for new entries
- **NFR001-P4**: Results table pagination < 500ms per page navigation
- **NFR001-P5**: UI remains responsive with 10K+ URLs in job (virtual scrolling for logs/results)
- **NFR001-P6**: React Query cache invalidation efficient (selective, not full re-fetch)
- **NFR001-P7**: Next.js build optimization: code splitting, tree shaking, bundle size < 500KB initial
- **NFR001-P8**: Lighthouse score: Performance > 90, Accessibility > 95

### Security

- **NFR001-S1**: No authentication required (internal tool assumption)
- **NFR001-S2**: Environment variables never exposed to client (use `NEXT_PUBLIC_` prefix correctly)
- **NFR001-S3**: Supabase anon key safe for client use (Row Level Security disabled, all data public internally)
- **NFR001-S4**: XSS prevention: All user input sanitized (React default escaping)
- **NFR001-S5**: HTTPS enforced in production (Railway automatic)
- **NFR001-S6**: No sensitive data in URLs (use POST for job creation with body)
- **NFR001-S7**: CORS configured on backend to allow frontend domain only

### Reliability/Availability

- **NFR001-R1**: Frontend deployed to Railway with 99% uptime SLA
- **NFR001-R2**: Realtime connection auto-reconnect on disconnect (Supabase client handles)
- **NFR001-R3**: React Query automatic retries: 3 attempts with exponential backoff
- **NFR001-R4**: Error boundaries catch React component errors, show fallback UI
- **NFR001-R5**: Offline detection: show banner when network unavailable
- **NFR001-R6**: Stale data handling: React Query refetch on window focus, reconnection
- **NFR001-R7**: Graceful degradation: If Realtime fails, fall back to polling (5s interval)

### Observability

- **NFR001-O1**: Client-side error logging to console (dev) and Railway logs (prod)
- **NFR001-O2**: React Query DevTools enabled in development
- **NFR001-O3**: Network request logging: axios interceptor logs all API calls
- **NFR001-O4**: Performance monitoring: Web Vitals logged to console
- **NFR001-O5**: Realtime connection status indicator in UI ("Live" badge)
- **NFR001-O6**: User action tracking: Button clicks, navigation logged (console.log for MVP)
- **NFR001-O7**: Error toast notifications for all failed operations with retry option

## Dependencies and Integrations

### NPM Dependencies (`apps/web/package.json`)

**Core Framework**:
- `next@^14.2.0` - React framework with App Router
- `react@^18.3.0` - UI library
- `react-dom@^18.3.0` - React DOM renderer

**UI Components**:
- `@radix-ui/react-*` - Headless UI primitives (Dialog, Dropdown, etc.)
- `tailwindcss@^3.4.0` - Utility-first CSS
- `class-variance-authority@^0.7.0` - CVA for component variants
- `clsx@^2.1.0` - Conditional className utility
- `lucide-react@^0.400.0` - Icon library

**State Management**:
- `@tanstack/react-query@^5.50.0` - Server state management
- `zustand@^4.5.0` - Client state management

**Data Fetching & Real-Time**:
- `axios@^1.7.0` - HTTP client
- `@supabase/supabase-js@^2.45.0` - Supabase client + Realtime

**Form & Validation**:
- `zod@^3.23.0` - Schema validation
- `@hookform/resolvers@^3.9.0` - React Hook Form + Zod integration

**Utilities**:
- `date-fns@^3.6.0` - Date formatting
- `@tanstack/react-table@^8.20.0` - Table utilities

**Development**:
- `@tanstack/react-query-devtools@^5.50.0` - React Query DevTools
- `typescript@^5.5.0` - Type safety
- `eslint@^8.57.0` - Linting
- `prettier@^3.3.0` - Code formatting

### External Integrations

| Integration | Purpose | Authentication | Configuration |
|---|---|---|---|
| **NestJS Backend API** | REST endpoints for job control, data fetching | None (internal) | `NEXT_PUBLIC_API_URL` env var |
| **Supabase PostgreSQL** | Database access for read queries | Anon key | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **Supabase Realtime** | WebSocket subscriptions for live updates | Same anon key | Auto-configured with Supabase client |
| **Railway** | Deployment platform | Railway CLI auth | Automatic via git push |

## Acceptance Criteria (Authoritative)

Extracted from Epic 1 stories (7 stories, ~24 acceptance criteria):

### Story 1.1: Job Dashboard Foundation
- AC1.1.1: Dashboard displays list of all jobs (active, paused, completed)
- AC1.1.2: Each job card shows: name, status badge, start time, progress percentage, URL count
- AC1.1.3: Active jobs appear at top with visual distinction (color, animation)
- AC1.1.4: Clicking job card navigates to detailed job view
- AC1.1.5: "New Job" button prominently displayed (primary CTA)
- AC1.1.6: Empty state shown when no jobs exist with helpful onboarding message
- AC1.1.7: Dashboard updates automatically when job status changes (via Supabase Realtime)

### Story 1.2: Live Progress Tracking
- AC1.2.1: Progress bar shows percentage complete (0-100%) updating in real-time
- AC1.2.2: Counter displays: "Processed: X / Y URLs"
- AC1.2.3: Processing rate displayed: "XX URLs/min" (calculated from recent throughput)
- AC1.2.4: Time indicators: "Elapsed: HH:MM:SS" and "Est. Remaining: HH:MM:SS"
- AC1.2.5: Success/failure counters: "Success: X | Failed: Y"
- AC1.2.6: All metrics update every 1-2 seconds via Supabase subscription
- AC1.2.7: Visual "pulse" indicator shows system is actively processing
- AC1.2.8: Progress bar color changes based on success rate (green >95%, yellow >80%, red <80%)

### Story 1.3: Current URL Display Panel
- AC1.3.1: Dedicated panel shows: "Currently Processing: [URL]"
- AC1.3.2: Processing stage displayed: "Stage: Fetching | Filtering | Classifying"
- AC1.3.3: Stage indicator uses visual icons (spinner, filter icon, AI icon)
- AC1.3.4: Time on current URL displayed: "Processing for: XX seconds"
- AC1.3.5: Previous 3 URLs shown below current with final status (✓ or ✗)
- AC1.3.6: URL truncated if too long with tooltip showing full URL
- AC1.3.7: Panel updates immediately when URL changes (<500ms latency)
- AC1.3.8: Empty state: "Waiting to start..." when job paused or not started

### Story 1.4: Live Activity Log Streaming
- AC1.4.1: Scrollable log panel displays activity feed with auto-scroll to latest
- AC1.4.2: Each log entry shows: timestamp, severity icon, message
- AC1.4.3: Severity levels: SUCCESS (✓ green), INFO (ℹ blue), WARNING (⚠ yellow), ERROR (✗ red)
- AC1.4.4: Log entries include: URL fetch, pre-filter decisions, LLM calls, errors, cost updates
- AC1.4.5: Logs stream in real-time with <1 second latency
- AC1.4.6: Auto-scroll can be paused by user scroll, resume with "Jump to latest" button
- AC1.4.7: Log entries persist during session, cleared when job completed and viewed
- AC1.4.8: Filter controls: "Show: All | Errors Only | Info Only"

### Story 1.5: Cost Tracking Display
- AC1.5.1: Cost panel displays: "Total Cost: $XX.XX"
- AC1.5.2: Cost per URL displayed: "$X.XXXXX/URL"
- AC1.5.3: Provider breakdown: "Gemini: $XX.XX | GPT: $XX.XX"
- AC1.5.4: Projected total cost: "Projected: $XX.XX" (based on remaining URLs × avg cost/URL)
- AC1.5.5: Savings indicator: "40% saved vs GPT-only" (if pre-filtering working)
- AC1.5.6: Cost updates in real-time as URLs processed
- AC1.5.7: Historical job costs shown in job list
- AC1.5.8: Warning shown if projected cost exceeds $50 (configurable threshold)

### Story 1.6: Historical Results Table
- AC1.6.1: Data table shows columns: URL, Status, Classification, Score, Cost, Processing Time, Timestamp
- AC1.6.2: Table supports sorting by any column (ascending/descending)
- AC1.6.3: Search/filter bar: search by URL text
- AC1.6.4: Filter dropdowns: Status (All | Success | Failed), Classification (All | SUITABLE | NOT_SUITABLE)
- AC1.6.5: Pagination: 50 results per page with page controls
- AC1.6.6: Table updates in real-time as new URLs processed
- AC1.6.7: Row click expands to show: full URL, classification reasoning, API calls made, error details (if failed)
- AC1.6.8: "Export" button to download filtered results
- AC1.6.9: Table persists across page refreshes (data from Supabase)

### Story 1.7: Job Control Actions
- AC1.7.1: Control buttons displayed for active jobs: "Pause", "Cancel"
- AC1.7.2: Paused jobs show: "Resume", "Cancel"
- AC1.7.3: Pause button immediately stops processing new URLs (current URL completes)
- AC1.7.4: UI updates to "Paused" state instantly with optimistic update
- AC1.7.5: Resume button continues from last processed URL
- AC1.7.6: Cancel button shows confirmation: "Cancel job? Processed results will be saved."
- AC1.7.7: Cancelled jobs marked as "Cancelled" with results preserved
- AC1.7.8: All control actions broadcast via Supabase - all connected users see state change
- AC1.7.9: Disabled states: can't pause/resume when system is already transitioning
- AC1.7.10: Tooltips explain what each action does

## Traceability Mapping

| AC ID | Spec Section | Component(s) | Test Idea |
|---|---|---|---|
| AC1.1.1-1.1.7 | Story 1.1 | `JobDashboard`, `JobCard` | E2E: Create jobs, verify list display, status updates via Realtime mock |
| AC1.2.1-1.2.8 | Story 1.2 | `ProgressBar`, `MetricsPanel` | Unit: Progress calculation logic, E2E: Verify metrics update from mock Realtime events |
| AC1.3.1-1.3.8 | Story 1.3 | `CurrentURLPanel` | Unit: URL truncation, E2E: Verify stage transitions and timing display |
| AC1.4.1-1.4.8 | Story 1.4 | `ActivityLogFeed`, `LogEntry` | Unit: Log filtering, E2E: Stream mock logs, verify auto-scroll, filter behavior |
| AC1.5.1-1.5.8 | Story 1.5 | `CostTracker` | Unit: Cost calculation, projection math, E2E: Verify cost updates with mock data |
| AC1.6.1-1.6.9 | Story 1.6 | `ResultsTable`, `DataTable` | Unit: Sorting, filtering, pagination logic, E2E: Search/filter interaction, row expansion |
| AC1.7.1-1.7.10 | Story 1.7 | `JobControls` | Unit: Optimistic update logic, E2E: Pause/resume/cancel actions with mock API responses |

## Risks, Assumptions, Open Questions

### Risks
- **RISK-1**: Supabase Realtime connection instability under high concurrent users (10+ simultaneous connections)
  - **Mitigation**: Implement fallback polling (5s interval), connection status indicator, auto-reconnect

- **RISK-2**: Large result sets (10K+ URLs) cause UI performance degradation in Results Table
  - **Mitigation**: Implement virtual scrolling with `@tanstack/react-virtual`, pagination (50 items/page), server-side filtering

- **RISK-3**: React Query cache invalidation conflicts between Realtime updates and manual refetches
  - **Mitigation**: Careful `queryClient.setQueryData()` usage, test concurrent update scenarios

- **RISK-4**: Optimistic UI updates for job controls may cause UI inconsistencies if API fails
  - **Mitigation**: Proper rollback logic in React Query mutation `onError`, show error toast

### Assumptions
- **ASSUME-1**: Backend API (Epic 2) will be available for integration testing by Week 5
- **ASSUME-2**: Supabase project will be configured with Realtime enabled on all required tables
- **ASSUME-3**: No authentication required (internal tool) - Supabase RLS disabled or permissive policy
- **ASSUME-4**: Railway deployment will handle environment variable configuration correctly
- **ASSUME-5**: Solo developer can complete 7 stories in 6 weeks with AI assistance
- **ASSUME-6**: shadcn/ui components meet all accessibility requirements without custom modifications

### Open Questions
- **Q1**: Should we implement WebSocket heartbeat/keepalive for Realtime connections, or rely on Supabase client defaults?
  - **Action**: Test Supabase Realtime connection stability in development, decide based on behavior

- **Q2**: What is the maximum acceptable bundle size for initial page load?
  - **Proposed**: <500KB initial JS, <2s LCP. Measure with Lighthouse after build.

- **Q3**: Should Results Table support infinite scroll or pagination?
  - **Decision**: Pagination (50/page) for MVP. Infinite scroll deferred to Phase 2.

- **Q4**: How should we handle time zone display for timestamps (UTC vs local)?
  - **Proposed**: Display in user's local timezone using `date-fns` `formatInTimeZone()`. Show timezone abbreviation.

## Test Strategy Summary

### Testing Approach
- **Component Tests**: Jest + React Testing Library for isolated component logic
- **Integration Tests**: Mock API responses and Realtime events, test component interactions
- **E2E Tests**: Playwright for critical user flows (view job, monitor logs, pause job)
- **Visual Regression**: Manual testing for MVP, consider Chromatic/Percy for Phase 2

### Test Levels

**Unit Tests** (Jest + React Testing Library):
- Format utilities (`formatCurrency`, `formatDuration`, `formatTimestamp`)
- Component logic (progress calculation, cost projection, log filtering)
- Zustand store actions and selectors
- API client request builders

**Integration Tests**:
- React Query hooks with mocked axios responses
- Realtime service with mocked Supabase client
- Complete page renders with mock data
- Component interactions (click button → state change → UI update)

**E2E Tests** (Playwright):
1. **Happy Path**: Create job → View dashboard → Click job → See live progress → View logs → Export results
2. **Job Controls**: Pause job → Verify status change → Resume → Cancel with confirmation
3. **Real-Time Updates**: Open job in 2 browser tabs, pause in tab 1, verify tab 2 updates
4. **Error Handling**: Mock API failures, verify error toasts, retry logic

### Coverage Targets
- **Unit Test Coverage**: >80% for utility functions, hooks, components
- **Integration Test Coverage**: All API client functions, all React Query hooks
- **E2E Test Coverage**: All 7 user stories have at least 1 E2E test

### Test Data Strategy
- **Mock Jobs**: Predefined job fixtures with various states (pending, processing, paused, completed)
- **Mock Results**: 100-result dataset for table testing (sorting, filtering, pagination)
- **Mock Logs**: Sequence of 50 log entries with all severity levels
- **Realtime Mocks**: Supabase Realtime events simulated with `@supabase/supabase-js` mocks

### Accessibility Testing
- **Automated**: `axe-core` via Jest + Testing Library `toHaveNoViolations()`
- **Manual**: Keyboard navigation testing, screen reader testing (VoiceOver/NVDA)
- **Target**: WCAG 2.1 AA compliance (color contrast, focus indicators, ARIA labels)

### Performance Testing
- **Lighthouse CI**: Run on every PR, enforce thresholds (Performance >90, Accessibility >95)
- **Manual**: Test with 10K result dataset, verify UI remains responsive
- **Metrics**: LCP <2s, FID <100ms, CLS <0.1

---

## Post-Review Follow-ups

### Story 1.3 Review Items (2025-10-13)

**Required (Before Story Completion):**
1. Add unit tests for `useCurrentURLTimer` hook (`apps/web/hooks/__tests__/use-current-url-timer.test.ts`)
   - Test null handling, elapsed calculation, interval updates, cleanup
   - Target: 100% coverage per story requirements
   - Severity: Medium

**Recommended Improvements:**
2. Improve timer display formatting (`apps/web/components/current-url-panel.tsx:116`) - Use formatDuration() helper
3. Add error boundary protection for CurrentURLPanel component
4. Review Zod URL validation strictness in schema (`packages/shared/src/schemas/job.ts:15`)

**Epic 2 Coordination:**
5. Backend must update `currentUrl`, `currentStage`, `currentUrlStartedAt` in real-time (Story 2.5)
6. Implement RecentURLsList with real data once results table is created (Story 2.5)

*Full details in Story 1.3 Senior Developer Review section and `docs/backlog.md`*

---

**Status**: Draft
**Next Steps**: Begin Story 1.1 implementation after Epic 2 provides mock API or database schema
