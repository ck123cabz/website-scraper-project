# Component Inventory - Web Frontend

**Part:** Web Frontend (`apps/web/`)
**Framework:** Next.js 14.2 + React 18
**Total Components:** 61
**Last Updated:** 2025-01-18

---

## Overview

The web frontend uses a component-based architecture with **61 React components** organized into logical categories. Components are built using:

- **Radix UI:** Accessible component primitives (18 UI components)
- **TailwindCSS:** Utility-first styling
- **TypeScript:** Type-safe component props
- **React Query:** Server state management for API integration

**Component Organization:**
```
components/
├── ui/              # 18 Radix UI components (buttons, dialogs, inputs)
├── dashboard/       # 7 Dashboard-specific components
├── results/         # 8 Results display components
├── settings/        # 12 Settings management components
├── providers/       # 1 React Query provider
└── [root]/          # 15 Shared components
```

---

## Component Categories

### 1. UI Components (`components/ui/`) - 18 Components

**Purpose:** Reusable Radix UI wrappers styled with Tailwind CSS

| Component | Description | Based On |
|-----------|-------------|----------|
| `alert-dialog.tsx` | Modal confirmation dialogs | Radix AlertDialog |
| `alert.tsx` | Notification alerts (success, error, warning) | Radix Alert |
| `badge.tsx` | Status badges and labels | Custom |
| `button.tsx` | Primary, secondary, outline button variants | Radix Button |
| `card.tsx` | Card container with header/content/footer | Custom |
| `checkbox.tsx` | Checkbox input with label | Radix Checkbox |
| `dialog.tsx` | Modal dialogs | Radix Dialog |
| `input.tsx` | Text input field | Native input |
| `label.tsx` | Form labels | Radix Label |
| `progress.tsx` | Progress bars | Radix Progress |
| `radio-group.tsx` | Radio button groups | Radix RadioGroup |
| `scroll-area.tsx` | Scrollable content areas | Radix ScrollArea |
| `select.tsx` | Dropdown select menus | Radix Select |
| `slider.tsx` | Range slider inputs | Radix Slider |
| `switch.tsx` | Toggle switches | Radix Switch |
| `table.tsx` | Data tables | Native table |
| `tabs.tsx` | Tab navigation | Radix Tabs |
| `textarea.tsx` | Multi-line text input | Native textarea |
| `tooltip.tsx` | Hover tooltips | Radix Tooltip |

**Styling:** All components use Tailwind's `cn()` utility for conditional class merging

---

### 2. Dashboard Components (`components/dashboard/`) - 7 Components

**Purpose:** Dashboard page-specific UI elements

| Component | Description | Key Features |
|-----------|-------------|--------------|
| `BulkActionsBar.tsx` | Bulk operation controls | Multi-select actions (pause, resume, delete) |
| `CompletedJobsSection.tsx` | Completed jobs list | Recent completions with stats |
| `CompletedJobsSection.example.tsx` | Example/mock data version | Development reference |
| `JobProgressCard.tsx` | Active job progress card | Real-time progress, layer stats, ETA |
| `JobsFilterBar.tsx` | Job filtering controls | Filter by status, date range |
| `LayerBreakdown.tsx` | Layer 1/2/3 statistics | Pass/fail counts per layer |

**Integration:**
- Uses React Query hooks: `useJobs()`, `useQueueStatus()`
- Real-time polling for job progress updates
- TanStack Table for filtering and sorting

---

### 3. Results Components (`components/results/`) - 8 Components

**Purpose:** Job results display and factor breakdown

| Component | Description | Key Features |
|-----------|-------------|--------------|
| `ExportDialog.tsx` | CSV export configuration | Format selection, filter options |
| `ExportDialog.example.tsx` | Example/mock version | Development reference |
| `FactorBreakdown.tsx` | Factor expansion container | Displays all layer factors |
| `Layer1Factors.tsx` | Layer 1 factor display | Domain analysis details |
| `Layer2Factors.tsx` | Layer 2 factor display | Operational signals |
| `Layer3Factors.tsx` | Layer 3 factor display | LLM classification reasoning |
| `ResultRow.tsx` | Single result row | Expandable with factor breakdown |
| `ResultsTable.tsx` | Results data table | Pagination, filtering, sorting |

**Key Patterns:**
- **Expandable Rows:** Click row to show factor breakdown
- **JSONB Rendering:** Parses and displays complex JSONB factor structures
- **Confidence Badges:** Color-coded confidence bands (high/medium/low)

**Example Factor Display:**
```tsx
<Layer1Factors factors={{
  matched_patterns: [...],
  domain_category: "corporate",
  url_structure_score: 0.8
}} />
```

---

### 4. Settings Components (`components/settings/`) - 12 Components

**Purpose:** Settings management UI for Layer 1/2/3 rules

| Component | Description | Key Features |
|-----------|-------------|--------------|
| `ClassificationIndicatorsSection.tsx` | Classification rule editor | Keyword management |
| `ConfidenceBandsTab.tsx` | Confidence threshold editor | Tab panel for bands |
| `ConfidenceThresholdSection.tsx` | Threshold slider inputs | High/medium/low thresholds |
| `FeatureStatusTooltip.tsx` | Feature status indicator | "Active", "Deprecated", etc. |
| `KeywordArrayInput.tsx` | Keyword array input | Add/remove keywords |
| `LLMParametersSection.tsx` | LLM configuration | Temperature, max tokens |
| `Layer1DomainTab.tsx` | Layer 1 rule editor | URL patterns, TLD rules |
| `Layer2PublicationTab.tsx` | Layer 2 rule editor | Blog freshness, company pages |
| `Layer3LlmTab.tsx` | Layer 3 rule editor | Prompts, confidence thresholds |
| `PatternArrayInput.tsx` | Pattern array input | Regex patterns editor |
| `PreFilterRulesSection.tsx` | Pre-filter rule editor | Early rejection rules |
| `SliderInput.tsx` | Reusable slider input | Labeled slider with value display |

**Form Handling:**
- React Hook Form integration
- Real-time validation with Zod schemas
- Optimistic UI updates with React Query mutations

---

### 5. Shared/Root Components (`components/[root]`) - 15 Components

**Purpose:** Cross-cutting components used throughout the app

| Component | Description | Usage |
|-----------|-------------|-------|
| `cost-tracker.tsx` | Cost tracking display | Shows Layer 2/3 costs |
| `current-url-panel.tsx` | Currently processing URL panel | Real-time worker status |
| `empty-state.tsx` | Empty state placeholder | No data messaging |
| `job-card.tsx` | Job summary card | Job overview with actions |
| `job-controls.tsx` | Job action buttons | Pause/resume/cancel/export |
| `job-creation-form.tsx` | Job creation form | File upload, URL input |
| `job-detail-client.tsx` | Job detail page client | Client-side job detail wrapper |
| `job-list.tsx` | Jobs table | All jobs with filtering |
| `live-activity-log.tsx` | Activity log stream | Real-time events |
| `log-entry.tsx` | Single log entry | Event display component |
| `metrics-panel.tsx` | Metrics dashboard | Throughput, cost, timing |
| `processing-indicator.tsx` | Processing status indicator | Spinner + status text |
| `progress-bar.tsx` | Generic progress bar | Percentage-based progress |
| `recent-urls-list.tsx` | Recent URLs widget | Latest processed URLs |
| `results-table.tsx` | Legacy results table | (Replaced by ResultsTable) |

---

### 6. Provider Components (`components/providers/`) - 1 Component

| Component | Description | Purpose |
|-----------|-------------|---------|
| `query-provider.tsx` | React Query provider wrapper | Global React Query configuration |

**Configuration:**
```tsx
<QueryClientProvider client={queryClient}>
  <ReactQueryDevtools initialIsOpen={false} />
  {children}
</QueryClientProvider>
```

---

## Component Patterns

### Server/Client Component Split (Next.js 14 App Router)

**Server Components (Default):**
- `app/*/page.tsx` - Route pages
- Static layouts

**Client Components (`"use client"`):**
- All interactive components in `components/`
- State management (Zustand, React Query)
- Event handlers

**Example:**
```tsx
// app/dashboard/page.tsx (Server Component)
import { JobProgressCard } from '@/components/dashboard/JobProgressCard'

export default function DashboardPage() {
  return <JobProgressCard /> // Client component
}
```

---

### React Query Integration

**Custom Hooks:**
```tsx
// hooks/useJobs.ts
export function useJobs() {
  return useQuery({
    queryKey: ['jobs'],
    queryFn: () => apiClient.getJobs(),
    refetchInterval: 5000 // Poll every 5s
  })
}
```

**Usage in Components:**
```tsx
function JobList() {
  const { data: jobs, isLoading } = useJobs()
  if (isLoading) return <LoadingSpinner />
  return <Table data={jobs} />
}
```

---

### State Management

**Client State (Zustand):**
- UI state (modals, filters, selections)
- Ephemeral data

**Server State (React Query):**
- API data (jobs, results, settings)
- Cached with automatic revalidation
- Optimistic updates

---

### Styling Conventions

**Tailwind Utility Classes:**
```tsx
<Button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
  Submit
</Button>
```

**Component Variants (using `cva`):**
```tsx
const buttonVariants = cva("base-classes", {
  variants: {
    variant: {
      default: "bg-primary text-white",
      outline: "border-2 bg-transparent",
      ghost: "hover:bg-gray-100"
    }
  }
})
```

---

## Testing Strategy

**Test Files:**
- Unit tests: `components/**/__tests__/*.test.tsx`
- E2E tests: `tests/e2e/*.spec.ts` (Playwright)

**Examples:**
```
components/settings/__tests__/
├── KeywordArrayInput.test.tsx
├── SliderInput.test.tsx
└── PatternArrayInput.test.tsx
```

**Testing Libraries:**
- Jest for unit tests
- React Testing Library for component tests
- Playwright for E2E tests

---

## Component Dependencies

### External Libraries

| Library | Purpose | Components Using |
|---------|---------|------------------|
| **@radix-ui/**** | Accessible primitives | All `ui/` components |
| **@tanstack/react-table** | Data tables | `ResultsTable`, `job-list` |
| **@tanstack/react-query** | Server state | `dashboard/*`, `results/*` |
| **react-hook-form** | Form handling | `job-creation-form`, `settings/*` |
| **zustand** | Client state | `job-detail-client` |
| **lucide-react** | Icons | All components |
| **date-fns** | Date formatting | Timestamp displays |

### Internal Dependencies

```
@website-scraper/shared
├── types/Job.ts
├── types/Result.ts
├── types/Settings.ts
└── schemas/* (Zod)
```

---

## Performance Optimizations

### Code Splitting

**Dynamic Imports:**
```tsx
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <LoadingSpinner />
})
```

### Memoization

```tsx
const MemoizedResultRow = React.memo(ResultRow, (prev, next) => {
  return prev.result.id === next.result.id
})
```

### Virtual Scrolling

**TanStack Table Virtual:**
- Used in `ResultsTable` for 1000+ rows
- Renders only visible rows in viewport

---

## Accessibility (a11y)

**Radix UI Benefits:**
- ARIA attributes automatically applied
- Keyboard navigation support
- Screen reader compatibility

**Best Practices:**
- Semantic HTML (`<button>`, `<form>`, `<label>`)
- Alt text for images
- Focus management in modals
- Color contrast compliance (WCAG AA)

---

## Future Component Additions

**Planned:**
- `BulkResultActions.tsx` - Multi-select result operations
- `JobScheduler.tsx` - Scheduled job execution
- `WebhookConfig.tsx` - Webhook configuration UI
- `RealTimeChart.tsx` - Live processing metrics chart

---

## Related Documentation

- [Architecture - Web Frontend](./architecture-web.md)
- [Development Guide - Web](./development-guide-web.md)
- [Integration Architecture](./integration-architecture.md)
- [Project Overview](./project-overview.md)

---

**Document Version:** 1.0.0
**Generated:** 2025-01-18
**Total Components:** 61
