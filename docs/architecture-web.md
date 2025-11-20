# Architecture Documentation - Web Frontend

**Part:** Web (Frontend)
**Type:** Web Application
**Framework:** Next.js 14.2
**Language:** TypeScript 5+
**Root Path:** `apps/web/`
**Last Updated:** 2025-01-18

---

## Executive Summary

The Web frontend is a **Next.js 14 server/client hybrid application** built with the **App Router** architecture. It provides a real-time dashboard for monitoring batch URL processing jobs with live progress tracking, CSV export, and settings management. The application uses **React Query** for server state management, **Zustand** for client state, and **Radix UI** components styled with **Tailwind CSS**.

### Key Characteristics

- **Architecture Pattern:** Component-Based with Server/Client Component Split
- **Rendering Strategy:** Hybrid (Server-side + Client-side)
- **State Management:** React Query (server state) + Zustand (client state)
- **UI Library:** Radix UI + Tailwind CSS + shadcn/ui patterns
- **Data Fetching:** React Query with automatic polling (10-second intervals)
- **Routing:** Next.js 14 App Router (file-system based)
- **Real-time Updates:** Polling-based (no WebSockets)

---

## Technology Stack

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Framework** | Next.js | 14.2.15 | React meta-framework with App Router |
| **Runtime** | React | 18 | UI library (Server + Client Components) |
| **Language** | TypeScript | 5+ | Type-safe JavaScript |
| **State (Server)** | TanStack React Query | 5.90 | Server state management, caching, polling |
| **State (Client)** | Zustand | 4.5 | Client-side state store |
| **UI Components** | Radix UI | Various | Unstyled accessible primitives |
| **Styling** | Tailwind CSS | 3.4 | Utility-first CSS framework |
| **Icons** | Lucide React | 0.545 | Icon library |
| **Table** | TanStack Table | 8.21 | Headless table library |
| **HTTP Client** | Axios | 1.12 | API requests (with React Query) |
| **Forms** | Zod | 3.25 | Schema validation |
| **Notifications** | Sonner | 2.0 | Toast notifications |
| **Date Utils** | date-fns | 3.6 | Date formatting |
| **Database Client** | Supabase JS | 2.75 | Direct DB access (unused in production) |

### Development & Testing

- **Unit Testing:** Jest 30.2 + Testing Library
- **E2E Testing:** Playwright 1.56
- **Linting:** ESLint + Next.js ESLint config
- **Type Checking:** TypeScript compiler (tsc)
- **Code Quality:** Prettier (via Tailwind plugin)

---

## Architecture Pattern

### Component-Based Architecture (Next.js 14 App Router)

```
┌──────────────────────────────────────────────────────────────┐
│                     App Router Layer                          │
│  - File-system routing (app/ directory)                       │
│  - Server Components (default)                                │
│  - Client Components ('use client')                           │
│  - Layouts + Pages + Loading/Error States                     │
└────────────────────┬─────────────────────────────────────────┘
                     │
┌────────────────────┴─────────────────────────────────────────┐
│                  State Management Layer                       │
│  - React Query: Server state (jobs, results, settings)       │
│  - Zustand: Client state (UI state, filters, selections)     │
│  - Hooks: Custom hooks wrapping state logic                   │
└────────────────────┬─────────────────────────────────────────┘
                     │
┌────────────────────┴─────────────────────────────────────────┐
│                   Component Layer                             │
│  - Page Components (app/**/page.tsx)                         │
│  - Feature Components (dashboard/, results/, settings/)       │
│  - UI Components (Radix UI wrappers)                          │
│  - Shared Components (providers, layouts)                     │
└────────────────────┬─────────────────────────────────────────┘
                     │
┌────────────────────┴─────────────────────────────────────────┐
│                   API Client Layer                            │
│  - jobsApi: Job management endpoints                         │
│  - settingsApi: Settings CRUD                                 │
│  - Axios instance with base URL config                        │
│  - Error handling + response transformation                   │
└──────────────────────────────────────────────────────────────┘
```

### Server vs. Client Components

**Server Components** (default in Next.js 14):
- Layout components (`layout.tsx`)
- Static pages
- Data fetching wrappers
- SEO metadata

**Client Components** (`'use client'`):
- Interactive UI (buttons, forms, modals)
- State management hooks (React Query, Zustand)
- Event handlers
- Browser APIs (localStorage, etc.)

---

## Routing Structure (App Router)

### File-System Based Routing

```
apps/web/app/
├── layout.tsx                  # Root layout (global providers)
├── page.tsx                    # Landing page (redirects to /dashboard)
├── dashboard/
│   └── page.tsx                # Main dashboard (T081: JobProgressCard)
├── jobs/
│   ├── new/
│   │   └── page.tsx            # Job creation page
│   └── [id]/
│       └── page.tsx            # Job detail page (results table)
└── settings/
    └── page.tsx                # Settings management (3-tier rules)
```

### Route Metadata

**Dynamic Routes:**
- `/jobs/[id]` - Job detail page (dynamic parameter: `id`)

**Route Handlers:**
- None (all API calls go to external API server)

**Special Files:**
- `layout.tsx` - Shared UI wrapper
- `page.tsx` - Route component
- `loading.tsx` - Loading UI (future)
- `error.tsx` - Error boundary (future)

---

## State Management

### React Query (Server State)

**Purpose:** Manage server-side data (jobs, results, settings) with caching, polling, and automatic refetching.

**Configuration** (`components/providers/query-provider.tsx`):
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,        // 30 seconds
      gcTime: 5 * 60 * 1000,    // 5 minutes (cache time)
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});
```

**Query Keys Convention:**
```typescript
['jobs']                                    // All jobs
['jobs', jobId]                             // Single job
['jobs', jobId, 'results', { filters }]     // Job results with filters
['settings']                                // Settings
```

**Custom Hooks:**

1. **`useJobs()`** - Fetch all jobs with 10-second polling
   ```typescript
   export function useJobs() {
     return useQuery({
       queryKey: ['jobs'],
       queryFn: jobsApi.getAll,
       refetchInterval: 10_000, // Poll every 10 seconds
     });
   }
   ```

2. **`useResults(jobId, filters)`** - Fetch job results with pagination
   ```typescript
   export function useResults(jobId, page, pageSize, filters) {
     return useQuery({
       queryKey: ['jobs', jobId, 'results', { page, pageSize, ...filters }],
       queryFn: () => jobsApi.getResults(jobId, page, pageSize, filters),
       enabled: !!jobId,
     });
   }
   ```

3. **`useSettings()`** - Fetch and update settings
   ```typescript
   export function useSettings() {
     const query = useQuery({
       queryKey: ['settings'],
       queryFn: settingsApi.get,
     });

     const mutation = useMutation({
       mutationFn: settingsApi.update,
       onSuccess: () => queryClient.invalidateQueries(['settings']),
     });

     return { ...query, update: mutation.mutate };
   }
   ```

**Polling Strategy:**
- Dashboard: 10-second polling for all jobs (active jobs only)
- Job Detail: 5-second polling for results (when job is processing)
- Settings: No polling (manual refetch on save)

### Zustand (Client State)

**Purpose:** Manage client-side UI state (filters, selections, modal states).

**Usage Example** (future implementation for filter persistence):
```typescript
type DashboardState = {
  searchQuery: string;
  statusFilter: 'all' | 'processing' | 'completed';
  setSearchQuery: (query: string) => void;
  setStatusFilter: (filter: string) => void;
};

const useDashboardStore = create<DashboardState>((set) => ({
  searchQuery: '',
  statusFilter: 'all',
  setSearchQuery: (query) => set({ searchQuery: query }),
  setStatusFilter: (filter) => set({ statusFilter: filter }),
}));
```

**Current State:**
- Zustand is installed but not heavily used
- Most state is managed via React Query or local component state
- Future enhancement: Persist filters, selections, UI preferences to localStorage

---

## Component Hierarchy

### Page Components

**1. Dashboard Page** (`app/dashboard/page.tsx`)
- **Purpose:** Main job monitoring dashboard
- **Features:**
  - Active jobs section (JobProgressCard components)
  - Completed jobs section (quick CSV download)
  - Search and status filtering
  - Bulk selection and deletion
  - Real-time progress updates (10s polling)
- **State:** React Query (`useJobs()`)
- **Child Components:**
  - `JobsFilterBar`
  - `JobProgressCard`
  - `CompletedJobsSection`
  - `BulkActionsBar`

**2. Job Detail Page** (`app/jobs/[id]/page.tsx`)
- **Purpose:** View job results with expandable factor breakdown
- **Features:**
  - Results table with TanStack Table
  - Layer 1/2/3 factor expansion (collapsible rows)
  - Filtering (approval status, layer, confidence)
  - Pagination (20 results per page)
  - CSV export dialog
- **State:** React Query (`useResults()`)
- **Child Components:**
  - `ResultsTable`
  - `ResultRow`
  - `Layer1Factors`, `Layer2Factors`, `Layer3Factors`
  - `ExportDialog`

**3. Job Creation Page** (`app/jobs/new/page.tsx`)
- **Purpose:** Create new job with URL upload
- **Features:**
  - File upload (CSV/TXT)
  - Direct URL input (textarea)
  - JSON API support
  - Validation and deduplication
  - Progress feedback
- **State:** Local component state + mutation
- **Child Components:**
  - `JobCreationForm`

**4. Settings Page** (`app/settings/page.tsx`)
- **Purpose:** Configure Layer 1/2/3 rules and thresholds
- **Features:**
  - Tabbed interface (Layer 1 Domain, Layer 2 Publication, Layer 3 LLM)
  - Pattern array inputs (URL exclusions)
  - Slider inputs (confidence thresholds)
  - Save/reset functionality
  - Dirty state tracking
- **State:** React Query (`useSettings()`)
- **Child Components:**
  - `Layer1DomainTab`
  - `Layer2PublicationTab`
  - `Layer3LlmTab`
  - `PatternArrayInput`, `SliderInput`, `KeywordArrayInput`

### Feature Components

**Dashboard Components** (`components/dashboard/`):

1. **`JobProgressCard`** - Active job display card
   - Real-time progress bar (0-100%)
   - Layer breakdown visualization (Layer 1/2/3 counts)
   - Queue position indicator (for queued jobs)
   - Cost tracker
   - Pause/resume/cancel controls
   - Selectable checkbox
   - Link to job detail page

2. **`CompletedJobsSection`** - Recently completed jobs
   - Compact table layout
   - Quick CSV download button
   - Job metadata (name, completed time, URL count, cost)
   - Last 24 hours filter

3. **`LayerBreakdown`** - Visual layer progress indicators
   - 3 progress bars (Layer 1/2/3)
   - Percentage labels
   - Color-coded states

4. **`JobsFilterBar`** - Search and filter controls
   - Search input (by job name)
   - Status dropdown (all, processing, completed, queued)
   - Result count display

5. **`BulkActionsBar`** - Selection and batch operations
   - Fixed bottom bar (appears when items selected)
   - Selection count
   - Clear selection button
   - Delete selected button
   - Confirmation dialog

**Results Components** (`components/results/`):

1. **`ResultsTable`** - Main results data table
   - TanStack Table integration
   - Sortable columns (URL, classification, confidence, layer)
   - Expandable rows (click to show factors)
   - Pagination controls
   - Filter controls (approval, layer, confidence)
   - Export button

2. **`ResultRow`** - Individual result row
   - Collapsible design
   - Main row: URL, classification badge, confidence score, layer
   - Expanded row: Layer 1/2/3 factor breakdowns
   - Color-coded classification (approved=green, rejected=red)

3. **`Layer1Factors`** - Layer 1 factor breakdown
   - Matched patterns list
   - Domain category
   - Rejection reasons (if rejected)

4. **`Layer2Factors`** - Layer 2 factor breakdown
   - Company page detection (About, Contact, Team)
   - Blog freshness (last post date, post count)
   - Tech stack (CMS, frameworks)

5. **`Layer3Factors`** - Layer 3 factor breakdown
   - LLM provider (Gemini/GPT)
   - Classification reasoning
   - Confidence explanation
   - Relevance indicators
   - Red flags

6. **`ExportDialog`** - CSV export modal
   - Format selection (complete, summary, layer1, layer2, layer3)
   - Filter options (approval, layer, confidence)
   - Download button
   - Loading states

**Settings Components** (`components/settings/`):

1. **`Layer1DomainTab`** - Layer 1 configuration
   - URL pattern exclusions table
   - Enable/disable toggles per pattern
   - Add/remove patterns
   - Pattern validation

2. **`Layer2PublicationTab`** - Layer 2 configuration
   - Blog freshness threshold slider (days)
   - Company page requirements
   - Minimum content length

3. **`Layer3LlmTab`** - Layer 3 configuration
   - Confidence threshold sliders (high/medium/low/auto_reject)
   - LLM prompt customization
   - Classification parameters

4. **`PatternArrayInput`** - URL pattern input array
   - Add/remove pattern rows
   - Pattern validation (regex)
   - Enable/disable toggles
   - Description field

5. **`SliderInput`** - Threshold slider control
   - Radix UI slider
   - Numeric input sync
   - Min/max validation
   - Real-time feedback

6. **`KeywordArrayInput`** - Keyword list input
   - Tag-based input
   - Add/remove keywords
   - Comma-separated paste support

### UI Components (`components/ui/`)

**Radix UI Wrappers** (shadcn/ui pattern):

- **`button.tsx`** - Button with variants (default, destructive, outline, ghost, link)
- **`card.tsx`** - Card container with header/content/footer
- **`input.tsx`** - Text input
- **`select.tsx`** - Dropdown select
- **`table.tsx`** - Table primitives (Table, TableHeader, TableRow, TableCell)
- **`tabs.tsx`** - Tabbed interface
- **`dialog.tsx`** - Modal dialog
- **`alert.tsx`** - Alert/notification banner
- **`badge.tsx`** - Status badge
- **`progress.tsx`** - Progress bar
- **`slider.tsx`** - Range slider
- **`switch.tsx`** - Toggle switch
- **`checkbox.tsx`** - Checkbox input
- **`radio-group.tsx`** - Radio button group
- **`tooltip.tsx`** - Hover tooltip
- **`scroll-area.tsx`** - Scrollable container
- **`alert-dialog.tsx`** - Confirmation dialog
- **`textarea.tsx`** - Multi-line text input
- **`label.tsx`** - Form label

**Custom Variants:**
- Tailwind CSS + `class-variance-authority` (CVA)
- `cn()` utility for conditional classes (clsx + tailwind-merge)

---

## Data Flow

### Request → Response Flow

```
User Action (e.g., click "Refresh")
   │
   ├─> Component Event Handler
   │
   ├─> React Query Hook (useJobs, useResults, etc.)
   │
   ├─> API Client Layer (jobsApi.getAll())
   │     │
   │     ├─> Axios Request (GET /jobs)
   │     │
   │     └─> Backend API (NestJS)
   │
   ├─> Response Transformation (Job interface)
   │
   ├─> React Query Cache Update
   │
   └─> Component Re-render (with new data)
```

### Polling Mechanism (Dashboard)

```
Dashboard Page Mounts
   │
   ├─> useJobs() hook initialized
   │
   ├─> React Query starts initial fetch
   │     │
   │     └─> GET /jobs API call
   │
   ├─> Data rendered in components
   │
   ├─> 10-second interval timer starts
   │
   ├─> Automatic refetch (every 10s)
   │     │
   │     ├─> Background API call (no loading state)
   │     │
   │     └─> Cache update + component re-render
   │
   └─> Loop continues until page unmounts
```

### Form Submission Flow (Job Creation)

```
User Uploads File → JobCreationForm Component
   │
   ├─> File Validation (CSV/TXT, size < 10MB)
   │
   ├─> Form Data Construction (FormData with file)
   │
   ├─> React Query Mutation (useMutation)
   │
   ├─> API Call (POST /jobs/create)
   │     │
   │     ├─> Multipart form upload
   │     │
   │     └─> Backend processing (parse, validate, create job)
   │
   ├─> Success Response
   │     │
   │     ├─> Toast notification ("Job created successfully!")
   │     │
   │     ├─> Navigate to dashboard
   │     │
   │     └─> React Query cache invalidation (['jobs'])
   │
   └─> Error Handling
         │
         └─> Toast notification (error message)
```

---

## API Integration

### API Client (`lib/api-client.ts`)

**Base Configuration:**
```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});
```

**Jobs API:**

```typescript
export const jobsApi = {
  // GET /jobs - List all jobs
  getAll: async (): Promise<Job[]> => {
    const response = await axiosInstance.get('/jobs');
    return response.data.data.map(transformJob);
  },

  // GET /jobs/:id - Get single job
  getById: async (id: string): Promise<Job> => {
    const response = await axiosInstance.get(`/jobs/${id}`);
    return transformJob(response.data.data);
  },

  // GET /jobs/:id/results - Get paginated results
  getResults: async (
    jobId: string,
    page: number,
    pageSize: number,
    filters?: ResultFilters
  ): Promise<ResultsResponse> => {
    const response = await axiosInstance.get(`/jobs/${jobId}/results`, {
      params: { page, pageSize, ...filters },
    });
    return response.data;
  },

  // POST /jobs/create - Create job with file upload
  create: async (formData: FormData): Promise<CreateJobResponse> => {
    const response = await axiosInstance.post('/jobs/create', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // POST /jobs/:id/export - Export results to CSV
  exportResults: async (
    jobId: string,
    format: ExportFormat,
    filters?: ResultFilters
  ): Promise<Blob> => {
    const response = await axiosInstance.post(
      `/jobs/${jobId}/export`,
      null,
      {
        params: { format, ...filters },
        responseType: 'blob',
      }
    );
    return response.data;
  },

  // PATCH /jobs/:id/pause - Pause job
  pause: async (jobId: string): Promise<Job> => {
    const response = await axiosInstance.patch(`/jobs/${jobId}/pause`);
    return transformJob(response.data.data);
  },

  // PATCH /jobs/:id/resume - Resume job
  resume: async (jobId: string): Promise<Job> => {
    const response = await axiosInstance.patch(`/jobs/${jobId}/resume`);
    return transformJob(response.data.data);
  },

  // DELETE /jobs/:id/cancel - Cancel job
  cancel: async (jobId: string): Promise<Job> => {
    const response = await axiosInstance.delete(`/jobs/${jobId}/cancel`);
    return transformJob(response.data.data);
  },
};
```

**Settings API:**

```typescript
export const settingsApi = {
  // GET /settings - Get current settings
  get: async (): Promise<Settings> => {
    const response = await axiosInstance.get('/settings');
    return response.data.data;
  },

  // PATCH /settings - Update settings
  update: async (settings: Partial<Settings>): Promise<Settings> => {
    const response = await axiosInstance.patch('/settings', settings);
    return response.data.data;
  },
};
```

### Type Transformations

**Backend → Frontend Type Mapping:**

```typescript
// Backend response (snake_case, ISO strings)
interface ApiJob {
  id: string;
  job_name: string;
  total_urls: number;
  processed_urls: number;
  created_at: string; // ISO 8601 string
  status: string;
}

// Frontend model (camelCase, Date objects)
interface Job {
  id: string;
  name: string;
  totalUrls: number;
  processedUrls: number;
  createdAt: Date;
  status: 'processing' | 'completed' | 'paused' | 'queued';
  progressPercentage: number; // Calculated field
}

// Transform function
function transformJob(apiJob: ApiJob): Job {
  return {
    id: apiJob.id,
    name: apiJob.job_name || 'Untitled Job',
    totalUrls: apiJob.total_urls,
    processedUrls: apiJob.processed_urls,
    createdAt: new Date(apiJob.created_at),
    status: mapStatus(apiJob.status),
    progressPercentage: calculateProgress(apiJob.processed_urls, apiJob.total_urls),
  };
}
```

---

## Styling System

### Tailwind CSS Configuration

**Theme Customization** (`tailwind.config.ts`):
```typescript
module.exports = {
  darkMode: ["class"], // Support for dark mode (future)
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        // ... more colors
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
```

**CSS Variables** (`app/globals.css`):
```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --destructive: 0 84.2% 60.2%;
    --border: 214.3 31.8% 91.4%;
    /* ... more variables */
  }
}
```

### Utility Functions

**`cn()` - Class Name Utility:**
```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Usage:**
```typescript
<Button className={cn("px-4 py-2", isActive && "bg-primary")} />
```

---

## Testing Strategy

### Unit Tests (Jest + Testing Library)

**Configuration** (`jest.config.js`):
```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'components/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
  ],
};
```

**Test Examples:**

1. **Component Tests:**
   ```typescript
   // components/dashboard/__tests__/JobProgressCard.spec.tsx
   describe('JobProgressCard', () => {
     it('displays job name and progress', () => {
       render(<JobProgressCard name="Test Job" progress={50} />);
       expect(screen.getByText('Test Job')).toBeInTheDocument();
       expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
     });
   });
   ```

2. **Hook Tests:**
   ```typescript
   // hooks/__tests__/use-jobs.test.ts
   describe('useJobs', () => {
     it('fetches jobs from API', async () => {
       const { result } = renderHook(() => useJobs(), { wrapper: QueryWrapper });
       await waitFor(() => expect(result.current.isSuccess).toBe(true));
       expect(result.current.data).toHaveLength(3);
     });
   });
   ```

**Coverage Targets:**
- Components: 70%+
- Hooks: 80%+
- Utilities: 90%+

### E2E Tests (Playwright)

**Configuration** (`playwright.config.ts`):
```typescript
export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
});
```

**Test Examples:**

```typescript
// tests/e2e/dashboard.spec.ts
test('dashboard displays active jobs', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.locator('[data-testid="dashboard-title"]')).toHaveText('Job Dashboard');
  await expect(page.locator('[data-testid="job-progress-card"]')).toHaveCount(3);
});

test('job detail page shows results table', async ({ page }) => {
  await page.goto('/jobs/abc123');
  await expect(page.locator('[data-testid="results-table"]')).toBeVisible();
  await page.click('[data-testid="export-button"]');
  await expect(page.locator('[data-testid="export-dialog"]')).toBeVisible();
});
```

---

## Performance Optimization

### Next.js Optimizations

**1. Image Optimization** (future):
```typescript
import Image from 'next/image';

<Image
  src="/logo.png"
  width={200}
  height={50}
  alt="Logo"
  priority // Load immediately
/>
```

**2. Code Splitting:**
- Automatic route-based code splitting (Next.js 14 default)
- Dynamic imports for heavy components:
  ```typescript
  const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
    loading: () => <Skeleton />,
    ssr: false, // Client-side only
  });
  ```

**3. React Server Components:**
- Default server rendering for layouts
- Client components only when needed ('use client')
- Reduces JavaScript bundle size

**4. Font Optimization:**
- Local fonts via `next/font/local`
- Variable fonts (GeistVF.woff)
- Automatic font subsetting

### React Query Optimizations

**1. Stale-While-Revalidate:**
- Cached data shown immediately
- Background refetch updates cache
- Reduces perceived latency

**2. Prefetching** (future):
```typescript
// Prefetch job details on hover
const handleMouseEnter = () => {
  queryClient.prefetchQuery({
    queryKey: ['jobs', jobId],
    queryFn: () => jobsApi.getById(jobId),
  });
};
```

**3. Optimistic Updates:**
```typescript
// Immediate UI update, rollback on error
const mutation = useMutation({
  mutationFn: jobsApi.pause,
  onMutate: async (jobId) => {
    // Cancel ongoing queries
    await queryClient.cancelQueries(['jobs', jobId]);
    // Snapshot previous value
    const previous = queryClient.getQueryData(['jobs', jobId]);
    // Optimistically update
    queryClient.setQueryData(['jobs', jobId], (old) => ({
      ...old,
      status: 'paused',
    }));
    return { previous };
  },
  onError: (err, jobId, context) => {
    // Rollback on error
    queryClient.setQueryData(['jobs', jobId], context.previous);
  },
});
```

### Bundle Size Analysis

**Current Bundle Sizes:**
- Next.js runtime: ~90KB (gzip)
- React + React DOM: ~45KB (gzip)
- React Query: ~15KB (gzip)
- Radix UI (tree-shaken): ~30KB (gzip)
- Tailwind CSS (purged): ~10KB (gzip)
- **Total First Load:** ~190KB (gzip)

**Optimization Techniques:**
- Tree-shaking (automatic with Next.js)
- CSS purging (Tailwind removes unused classes)
- Component lazy loading (dynamic imports)
- Route-based code splitting (automatic)

---

## Environment Configuration

### Environment Variables

**Required Variables** (`.env.local`):
```bash
# API Backend URL
NEXT_PUBLIC_API_URL=http://localhost:3001

# Supabase (optional, for direct DB access)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

**Variable Prefix Rules:**
- `NEXT_PUBLIC_*` - Exposed to browser (public)
- No prefix - Server-side only (private)

**Production Configuration:**
- Railway auto-injects `NEXT_PUBLIC_API_URL` from service discovery
- Build-time substitution (hardcoded in bundle)
- No runtime environment variable support for `NEXT_PUBLIC_*`

---

## Deployment

### Railway Deployment

**Build Configuration:**
```json
{
  "scripts": {
    "build": "next build",
    "start": "next start"
  }
}
```

**Deployment Steps:**
1. Railway detects `package.json`
2. Runs `npm install`
3. Runs `npm run build` (Next.js production build)
4. Starts server with `npm start`
5. Exposes on dynamic port (PORT env var)

**Output:**
- `.next/` directory (optimized bundles)
- Static assets (images, fonts)
- Server-side rendering runtime

**Performance:**
- Automatic gzip compression
- HTTP/2 support
- CDN integration (future)

---

## Security

### Input Validation

**1. File Upload Validation:**
```typescript
const ALLOWED_FILE_TYPES = ['text/csv', 'text/plain'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function validateFile(file: File): boolean {
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    throw new Error('Invalid file type. Only CSV and TXT files allowed.');
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File too large. Maximum size is 10MB.');
  }
  return true;
}
```

**2. Zod Schema Validation:**
```typescript
const createJobSchema = z.object({
  name: z.string().min(1).max(100),
  urls: z.array(z.string().url()).optional(),
});

// Validate form data
const validated = createJobSchema.parse(formData);
```

### XSS Protection

**1. React Default Escaping:**
- All dynamic content escaped by default
- `dangerouslySetInnerHTML` NOT used

**2. URL Sanitization:**
```typescript
import DOMPurify from 'dompurify'; // Future enhancement

function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.href; // Validated URL
  } catch {
    return '#'; // Invalid URL fallback
  }
}
```

### CORS

**Handled by Backend:**
- Frontend makes requests to API (same-origin in production)
- Backend configures CORS headers for allowed origins
- Credentials support enabled

---

## Error Handling

### Error Boundaries (Future)

```typescript
// app/error.tsx (Next.js 14 error boundary)
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="container mx-auto py-8">
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

### API Error Handling

**React Query Error Handling:**
```typescript
const { data, error, isError } = useJobs();

if (isError) {
  toast.error(`Failed to load jobs: ${error.message}`);
}
```

**Axios Error Interceptor:**
```typescript
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized (future: redirect to login)
    }
    return Promise.reject(error);
  }
);
```

### User-Facing Error Messages

**Strategy:**
- Generic error messages (avoid exposing internals)
- Toast notifications (Sonner)
- Retry buttons for transient failures
- Graceful degradation (show cached data if refetch fails)

---

## Accessibility

### ARIA Attributes

**Example: Progress Bar**
```typescript
<div
  role="progressbar"
  aria-valuenow={progress}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-label={`Job progress: ${progress}%`}
/>
```

### Keyboard Navigation

**Focus Management:**
- All interactive elements keyboard-accessible
- Tab order follows visual layout
- Focus indicators (outline) visible

**Modal Dialogs:**
- Focus trap (can't tab outside modal)
- Escape key closes modal
- Return focus to trigger on close

### Screen Reader Support

**Semantic HTML:**
- `<button>` for actions
- `<a>` for navigation
- `<table>` for tabular data
- Headings hierarchy (h1 → h2 → h3)

**ARIA Labels:**
```typescript
<button aria-label="Pause job processing">
  <PauseIcon />
</button>
```

---

## Future Enhancements

### Planned Features

1. **Dark Mode Support**
   - Theme toggle (light/dark)
   - Tailwind dark: classes
   - Persistent preference (localStorage)

2. **Real-time Updates (WebSockets)**
   - Replace polling with WebSocket connections
   - Instant job progress updates
   - Live activity feed

3. **Advanced Filtering**
   - Date range filters (created_at, completed_at)
   - Multi-select filters (combine layer + confidence)
   - Save filter presets

4. **Offline Support (PWA)**
   - Service worker for caching
   - Offline job list view
   - Queue mutations for when online

5. **Data Visualization**
   - Job statistics charts (Chart.js, Recharts)
   - Layer breakdown pie charts
   - Cost trends over time

6. **Internationalization (i18n)**
   - Multi-language support
   - `next-intl` or `react-i18next`
   - Locale-based date formatting

---

## Source Tree Reference

```
apps/web/
├── app/                                # Next.js 14 App Router
│   ├── layout.tsx                      # Root layout (providers, fonts)
│   ├── page.tsx                        # Landing page (redirect to /dashboard)
│   ├── globals.css                     # Tailwind CSS imports + theme variables
│   ├── dashboard/
│   │   └── page.tsx                    # Main dashboard (JobProgressCard)
│   ├── jobs/
│   │   ├── new/
│   │   │   └── page.tsx                # Job creation page
│   │   └── [id]/
│   │       └── page.tsx                # Job detail page (results table)
│   └── settings/
│       └── page.tsx                    # Settings management (3-tier rules)
│
├── components/                         # React components
│   ├── dashboard/                      # Dashboard-specific components
│   │   ├── JobProgressCard.tsx         # Active job card (T081)
│   │   ├── CompletedJobsSection.tsx    # Completed jobs table
│   │   ├── LayerBreakdown.tsx          # Layer 1/2/3 progress visualization
│   │   ├── JobsFilterBar.tsx           # Search + status filter
│   │   ├── BulkActionsBar.tsx          # Selection + batch delete
│   │   └── __tests__/                  # Component tests
│   │
│   ├── results/                        # Job results components
│   │   ├── ResultsTable.tsx            # TanStack Table wrapper
│   │   ├── ResultRow.tsx               # Expandable result row
│   │   ├── Layer1Factors.tsx           # Layer 1 factor breakdown
│   │   ├── Layer2Factors.tsx           # Layer 2 factor breakdown
│   │   ├── Layer3Factors.tsx           # Layer 3 factor breakdown
│   │   ├── ExportDialog.tsx            # CSV export modal
│   │   └── __tests__/                  # Component tests
│   │
│   ├── settings/                       # Settings page components
│   │   ├── Layer1DomainTab.tsx         # Layer 1 configuration
│   │   ├── Layer2PublicationTab.tsx    # Layer 2 configuration
│   │   ├── Layer3LlmTab.tsx            # Layer 3 configuration
│   │   ├── PatternArrayInput.tsx       # URL pattern input
│   │   ├── SliderInput.tsx             # Threshold slider
│   │   ├── KeywordArrayInput.tsx       # Keyword list input
│   │   └── __tests__/                  # Component tests
│   │
│   ├── ui/                             # Radix UI wrappers (shadcn/ui pattern)
│   │   ├── button.tsx                  # Button component
│   │   ├── card.tsx                    # Card container
│   │   ├── input.tsx                   # Text input
│   │   ├── select.tsx                  # Dropdown select
│   │   ├── table.tsx                   # Table primitives
│   │   ├── tabs.tsx                    # Tabbed interface
│   │   ├── dialog.tsx                  # Modal dialog
│   │   ├── alert.tsx                   # Alert banner
│   │   ├── badge.tsx                   # Status badge
│   │   ├── progress.tsx                # Progress bar
│   │   ├── slider.tsx                  # Range slider
│   │   ├── switch.tsx                  # Toggle switch
│   │   ├── checkbox.tsx                # Checkbox input
│   │   ├── tooltip.tsx                 # Hover tooltip
│   │   └── ... (more UI components)
│   │
│   └── providers/
│       └── query-provider.tsx          # React Query provider
│
├── hooks/                              # Custom React hooks
│   ├── use-jobs.ts                     # Fetch all jobs with polling
│   ├── use-results.ts                  # Fetch job results with pagination
│   ├── useSettings.ts                  # Fetch and update settings
│   ├── use-export-results.ts           # Export CSV mutation
│   ├── useQueuePolling.ts              # Queue status polling
│   └── __tests__/                      # Hook tests
│
├── lib/                                # Utilities and API client
│   ├── api-client.ts                   # Axios instance + API methods
│   ├── utils.ts                        # cn() utility, helpers
│   └── constants.ts                    # Shared constants
│
├── public/                             # Static assets
│   └── fonts/                          # Local fonts (GeistVF.woff)
│
├── tests/                              # E2E tests (Playwright)
│   └── e2e/
│       ├── dashboard.spec.ts
│       ├── job-detail.spec.ts
│       └── settings.spec.ts
│
├── package.json                        # Dependencies & scripts
├── tsconfig.json                       # TypeScript configuration
├── tailwind.config.ts                  # Tailwind CSS configuration
├── next.config.mjs                     # Next.js configuration
├── playwright.config.ts                # Playwright configuration
└── jest.config.js                      # Jest configuration
```

---

## Related Documentation

- **[Architecture - API Backend](./architecture-api.md)** - Backend service architecture
- **[Component Inventory - Web](./component-inventory-web.md)** - Complete component catalog
- **[Development Guide - Web](./development-guide-web.md)** - Setup and development workflow
- **[Integration Architecture](./integration-architecture.md)** - API ↔ Web communication
- **[Project Overview](./project-overview.md)** - High-level project context

---

**Documentation Generated:** 2025-01-18
**Architecture Version:** 1.0
**Last Major Update:** Batch Processing Refactor (spec-001)
