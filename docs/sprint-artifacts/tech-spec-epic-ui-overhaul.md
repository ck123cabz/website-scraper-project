# Epic Technical Specification: UI/UX Modernization Overhaul

Date: 2025-11-18
Author: CK
Epic ID: ui-overhaul
Status: Draft

---

## Overview

This epic transforms the website-scraper-project web frontend from a basic functional interface into a modern, polished dashboard application following industry-leading design patterns from Linear, Notion, and Arc browser. The comprehensive UI/UX modernization delivers high-impact improvements that dramatically enhance usability while maintaining development efficiency.

The approach is **frontend-only** with minimal backend changes (user preferences API endpoint only). All changes are contained within `apps/web/` and build upon the existing Next.js 14, React 18, Tailwind CSS, and Radix UI foundation.

This is a Quick-Flow project level feature, implementing the "Minimal & Focused" approach - high-impact UI/UX improvements without backend processing logic changes.

## Objectives and Scope

### In Scope

**Core Application Shell:**
- ✅ Modern sidebar navigation with collapsible sections
- ✅ Professional application layout (header, sidebar, main content)
- ✅ Fully responsive design (mobile, tablet, desktop)
- ✅ New URL structure: `/` (home), `/jobs/all`, `/jobs/active`, `/jobs/:id`, `/analytics`, `/settings`

**Page Redesigns:**
- ✅ Home/Overview page with quick stats cards and multiple view modes
- ✅ Jobs section enhancement with advanced filtering and bulk operations
- ✅ New analytics dashboard with metrics and charts
- ✅ Comprehensive settings page with tabbed navigation

**Component Library Integration:**
- ✅ shadcn/ui installation and configuration
- ✅ Mix of components from shadcn, Kibo, Aceternity registries
- ✅ Consistent design system (colors, spacing, typography)

**User Experience Features:**
- ✅ Command palette (⌘K) for power users
- ✅ Theme system (light/dark mode)
- ✅ User preferences with backend persistence
- ✅ Enhanced data visualization (cards, tables, charts)
- ✅ Toast notifications and smooth animations
- ✅ WCAG 2.1 AA accessibility compliance

### Out of Scope

**Backend Changes (Except Preferences):**
- ❌ No changes to job processing logic
- ❌ No changes to Layer 1/2/3 analysis algorithms
- ❌ No changes to scraping services or AI integration
- ❌ No modifications to queue processing
- ❌ Database schema remains unchanged (except user_preferences table)

**Advanced Features (Future Phase 2):**
- ❌ Drag-and-drop dashboard customization
- ❌ Custom dashboard widgets
- ❌ Real-time WebSocket updates
- ❌ Advanced analytics (Layer factor correlation)
- ❌ Job scheduling/automation UI
- ❌ API key management UI

## System Architecture Alignment

This epic aligns with the existing component-based architecture:

**Existing Frontend Stack (Maintained):**
- Next.js 14.2 with App Router (file-system routing)
- React 18 (Server + Client Components)
- TypeScript 5.5 (strict mode)
- React Query 5.90 (server state management)
- Zustand 4.5 (client state management)
- Radix UI primitives (10+ components already installed)
- Tailwind CSS 3.4 (utility-first styling)

**New Additions:**
- shadcn/ui components (copy-paste, built on Radix)
- cmdk 1.0.0 (command palette)
- recharts 2.12.0 (analytics charts)
- User preferences persistence layer

**Backend Integration:**
- Reuses all existing REST endpoints (`/jobs`, `/settings`)
- Adds single new endpoint: `/preferences` (GET/PATCH)
- Maintains existing API client patterns (Axios + React Query)

**Component Hierarchy Enhancement:**
```
App Router (app/)
├── Layout Components (NEW)
│   ├── AppShell (sidebar + header wrapper)
│   ├── Sidebar (collapsible navigation)
│   ├── Header (breadcrumbs, user menu)
│   └── MobileNav (drawer for mobile)
│
├── Page Components (ENHANCED/NEW)
│   ├── Home/Dashboard (redesigned from /dashboard)
│   ├── Jobs Section (enhanced filtering/bulk actions)
│   ├── Analytics (NEW - metrics dashboard)
│   └── Settings (reorganized with tabs)
│
└── Feature Components (NEW/ENHANCED)
    ├── Dashboard (cards, view toggles)
    ├── Jobs (tables, filters, bulk actions)
    ├── Analytics (charts, metrics cards)
    └── Settings (tabbed panels)
```

---

## Detailed Design

### Services and Modules

**Frontend Modules** (Feature-based organization):

| Module | Responsibility | Key Components | Owner |
|--------|---------------|----------------|-------|
| `components/layout/` | Application shell and navigation | AppShell, Sidebar, Header, MobileNav | DEV |
| `components/home/` | Home page components | QuickStats, ViewToggle, JobsCardsView, JobsTableView | DEV |
| `components/jobs/` | Jobs management UI | JobsTable, JobFilters, BulkActions, JobDetailView | DEV |
| `components/analytics/` | Analytics visualization | MetricsCard, SuccessRateChart, ProcessingTimeChart | DEV |
| `components/settings/` | Settings panels | Layer1Tab, Layer2Tab, Layer3Tab, AppearanceSettings | DEV |
| `components/ui/` | shadcn/ui components | Button, Card, Table, Dialog, Tabs, Command, etc. | shadcn |
| `components/command/` | Command palette | CommandPalette (⌘K functionality) | DEV |
| `hooks/` | Custom React hooks | useTheme, useUserPreferences, useJobs, useResults | DEV |
| `lib/` | Utilities and API | api-client.ts, utils.ts (cn function) | DEV |

**Backend Module (Minimal Addition):**

| Module | Responsibility | Inputs | Outputs | Owner |
|--------|---------------|--------|---------|-------|
| `preferences` (NEW) | User preferences CRUD | User ID, preferences DTO | Preferences object | DEV |

### Data Models and Contracts

**Frontend Data Models:**

```typescript
// User Preferences (Client + Shared)
interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  sidebarCollapsed: boolean;
  defaultView: 'cards' | 'table';
  lastUpdated: Date;
}

// ViewMode State (Client-only)
type ViewMode = 'cards' | 'table';

// Filter State (Client-only)
interface JobFilters {
  searchQuery: string;
  status: 'all' | 'processing' | 'completed' | 'failed' | 'queued';
  dateRange?: { start: Date; end: Date };
}
```

**Backend Data Models:**

```sql
-- New table for preferences persistence
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,  -- Future: link to users table
  theme VARCHAR(20) DEFAULT 'system',
  sidebar_collapsed BOOLEAN DEFAULT false,
  default_view VARCHAR(20) DEFAULT 'cards',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
```

**Note:** User authentication not implemented yet. For MVP, preferences can use session-based storage or single global settings row.

**Shared Types:**

```typescript
// packages/shared/src/types/preferences.ts
export interface UpdatePreferencesDto {
  theme?: 'light' | 'dark' | 'system';
  sidebarCollapsed?: boolean;
  defaultView?: 'cards' | 'table';
}

export interface PreferencesResponse {
  success: boolean;
  data: UserPreferences;
}
```

### APIs and Interfaces

**New Backend Endpoint:**

```typescript
// apps/api/src/preferences/preferences.controller.ts

@Controller('preferences')
export class PreferencesController {
  // GET /preferences - Retrieve user preferences
  @Get()
  @ApiOperation({ summary: 'Get user preferences' })
  @ApiResponse({ status: 200, description: 'Preferences retrieved' })
  async getUserPreferences(): Promise<PreferencesResponse> {
    // Implementation: Load from database
    // Fallback to defaults if not found
  }

  // PATCH /preferences - Update user preferences
  @Patch()
  @ApiOperation({ summary: 'Update user preferences' })
  @ApiBody({ type: UpdatePreferencesDto })
  @ApiResponse({ status: 200, description: 'Preferences updated' })
  async updatePreferences(
    @Body() dto: UpdatePreferencesDto
  ): Promise<PreferencesResponse> {
    // Implementation: Upsert preferences to database
    // Return updated preferences
  }
}
```

**Request/Response Examples:**

```http
GET /preferences
Response 200:
{
  "success": true,
  "data": {
    "theme": "dark",
    "sidebarCollapsed": false,
    "defaultView": "cards",
    "lastUpdated": "2025-11-18T10:30:00Z"
  }
}

PATCH /preferences
Content-Type: application/json
{
  "theme": "light",
  "sidebarCollapsed": true
}

Response 200:
{
  "success": true,
  "data": {
    "theme": "light",
    "sidebarCollapsed": true,
    "defaultView": "cards",
    "lastUpdated": "2025-11-18T10:35:00Z"
  }
}
```

**Frontend API Client:**

```typescript
// apps/web/lib/api/preferences.ts
export const preferencesApi = {
  get: async (): Promise<UserPreferences> => {
    const response = await axiosInstance.get('/preferences');
    return response.data.data;
  },

  update: async (prefs: Partial<UserPreferences>): Promise<UserPreferences> => {
    const response = await axiosInstance.patch('/preferences', prefs);
    return response.data.data;
  },
};
```

**Frontend Hook:**

```typescript
// apps/web/hooks/use-user-preferences.ts
export function useUserPreferences() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['preferences'],
    queryFn: preferencesApi.get,
    staleTime: Infinity, // Preferences rarely change
  });

  const mutation = useMutation({
    mutationFn: preferencesApi.update,
    onSuccess: (data) => {
      queryClient.setQueryData(['preferences'], data);
      toast.success('Preferences saved');
    },
    onError: () => {
      toast.error('Failed to save preferences');
    },
  });

  return {
    preferences: query.data,
    isLoading: query.isLoading,
    updatePreferences: mutation.mutate,
    isUpdating: mutation.isPending,
  };
}
```

### Workflows and Sequencing

**User Workflow 1: First-Time User Experience**

```
1. User lands on / (home page)
2. System loads default preferences (light theme, sidebar expanded)
3. User sees modern dashboard with:
   - Sidebar navigation (Home, Jobs, Analytics, Settings)
   - Quick stats cards (active jobs, success rate)
   - Recent jobs in cards view (default)
4. User explores navigation:
   - Clicks Jobs → navigates to /jobs/all
   - Clicks Analytics → navigates to /analytics
5. User customizes experience:
   - Toggles theme to dark mode
   - Switches to table view
   - System auto-saves preferences
6. User closes browser and returns later
7. System loads saved preferences (dark mode, table view persists)
```

**User Workflow 2: Job Management with Bulk Operations**

```
1. User navigates to /jobs/all
2. System displays jobs in selected view (cards or table)
3. User applies filters:
   - Status: "completed"
   - Date range: Last 30 days
4. Table updates with filtered results
5. User selects multiple jobs (checkboxes)
6. Bulk actions bar appears at bottom
7. User clicks "Delete selected" (5 jobs)
8. Confirmation dialog appears
9. User confirms deletion
10. System deletes jobs via API
11. Table refreshes with updated data
12. Toast notification: "5 jobs deleted successfully"
```

**User Workflow 3: Command Palette Navigation**

```
1. User presses ⌘K (Cmd+K on Mac, Ctrl+K on Windows)
2. Command palette modal opens
3. User types "analytics"
4. Palette shows filtered results:
   - Navigate to Analytics
   - View Job Analytics
5. User presses Enter
6. System navigates to /analytics page
7. Palette closes automatically
```

**Component Interaction Sequence: Theme Switching**

```
User clicks theme toggle button
   ↓
onClick event handler fires
   ↓
ThemeProvider.setTheme('dark') called
   ↓
React Context updates theme state
   ↓
useUserPreferences().updatePreferences({ theme: 'dark' })
   ↓
React Query mutation triggered
   ↓
PATCH /preferences API call
   ↓
Backend updates database
   ↓
Response returns updated preferences
   ↓
React Query cache updated
   ↓
All components re-render with dark theme classes
   ↓
Toast notification: "Theme changed to dark"
```

---

## Non-Functional Requirements

### Performance

**Targets:**
- **First Contentful Paint (FCP):** <1.5 seconds
- **Largest Contentful Paint (LCP):** <2.5 seconds
- **Time to Interactive (TTI):** <3.5 seconds
- **Cumulative Layout Shift (CLS):** <0.1
- **Page Load Time:** <3 seconds on 3G network

**Optimization Strategies:**
- React Server Components for layouts (default in Next.js 14)
- Code splitting via dynamic imports for analytics charts
- Lazy load recharts library (heavy bundle)
- Memoize expensive computations (TanStack Table filtering)
- Optimize images with Next.js Image component
- Bundle size monitoring (target: <200KB gzip total)

**Measured Metrics:**
- Dashboard render time: <100ms
- Theme switch latency: <50ms (instant)
- Table re-sort time: <100ms for 100 rows
- Filter application: <200ms
- CSV export initiation: <1 second

### Security

**Input Validation:**
- Zod schemas for all form inputs
- File upload validation (CSV/TXT, max 10MB)
- URL sanitization before rendering
- XSS protection via React's default escaping
- No `dangerouslySetInnerHTML` usage

**API Security:**
- CORS enabled for specific origins only
- CSRF protection via NestJS (existing)
- Input validation on backend (class-validator)
- Error messages sanitized (no stack traces to client)

**Data Handling:**
- No sensitive data in client state
- Preferences stored server-side (PostgreSQL)
- Credentials support for API calls
- Environment variables for API URLs

**Note:** Authentication/authorization out of scope for this epic.

### Reliability/Availability

**Error Handling:**
- Error boundaries for graceful fallbacks
- Toast notifications for transient errors
- Retry logic in React Query (1 automatic retry)
- Graceful degradation (show cached data if API fails)
- Loading states for all async operations

**Fallback Strategies:**
- Preferences: Use localStorage fallback if API unavailable
- Theme: Default to system preference if no saved preference
- Navigation: Redirect to home if invalid route
- Data fetching: Show stale data while revalidating

**Resilience:**
- No single point of failure (frontend continues if preferences API down)
- Progressive enhancement (core functionality works without JS)
- Offline detection (show offline banner, queue mutations)

### Observability

**Logging:**
- Console errors for debugging (removed in production)
- Error tracking via Sentry (future enhancement)
- User analytics (future enhancement)

**Performance Monitoring:**
- Lighthouse CI for performance regression detection
- React Query DevTools (development only)
- Next.js build analyzer for bundle size monitoring

**User Feedback:**
- Toast notifications for actions (save, delete, export)
- Loading spinners for async operations
- Progress bars for long-running tasks
- Success confirmations for critical actions

**Metrics to Track:**
- Page load times (Lighthouse)
- API response times (React Query)
- User interactions (click, navigation)
- Preference saves (adoption metric)
- Error rates (console + future Sentry)

---

## Dependencies and Integrations

### External Dependencies

**New Dependencies (apps/web/package.json):**

```json
{
  "dependencies": {
    "recharts": "^2.12.0",     // Analytics charts
    "cmdk": "^1.0.0"            // Command palette
  },
  "devDependencies": {
    "shadcn": "^3.4.0"          // shadcn/ui CLI
  }
}
```

**shadcn/ui Components (Installed via CLI):**
- Core UI: button, card, input, label, select, checkbox
- Data: table, tabs, dialog, toast, progress, badge
- Navigation: command, dropdown-menu, separator
- Forms: slider, switch, radio-group, textarea

**Existing Dependencies (Maintained):**
- Next.js 14.2.15 (React framework)
- React 18 (UI library)
- TypeScript 5.5 (type safety)
- Tailwind CSS 3.4.1 (styling)
- Radix UI (accessible primitives)
- React Query 5.90.2 (server state)
- Zustand 4.5.7 (client state)
- TanStack Table 8.21.3 (data tables)
- Lucide React 0.545.0 (icons)
- Sonner 2.0.7 (toast notifications)
- date-fns 3.6.0 (date utilities)

**Backend Dependency (Minimal):**
- NestJS 10.3 (existing framework)
- class-validator 0.14 (DTO validation)
- Supabase 2.39 (database client)

### Integration Points

**Frontend → Backend API:**

| Integration | Endpoint | Method | Purpose | Frequency |
|-------------|----------|--------|---------|-----------|
| Jobs List | `/jobs` | GET | Fetch all jobs | Polling (10s) |
| Job Details | `/jobs/:id` | GET | Single job data | On-demand |
| Job Results | `/jobs/:id/results` | GET | Paginated results | On page load |
| Export CSV | `/jobs/:id/export` | POST | Download CSV | User action |
| Settings | `/settings` | GET/PATCH | Layer rules | On page load |
| **Preferences** (NEW) | `/preferences` | GET/PATCH | User preferences | Load once + on change |

**Component → Component Communication:**
- Props for parent-child data flow
- React Context for theme and global UI state
- URL parameters for page state (filters, pagination)
- React Query cache for server state sharing
- Zustand store for client state (future enhancement)

**Third-Party Integrations:**
- shadcn/ui: Copy-paste components (no runtime dependency)
- Radix UI: Headless component primitives
- Tailwind CSS: Utility-first styling
- recharts: Analytics chart rendering

---

## Acceptance Criteria (Authoritative)

**Epic-Level Acceptance:**

1. **Foundation & Layout Complete**
   - shadcn/ui installed and configured with default theme
   - New app shell renders with sidebar and header
   - Sidebar toggles and state persists across sessions
   - Theme switches (light/dark) and persists to backend
   - Command palette opens with ⌘K and provides navigation
   - Mobile navigation drawer works on screens <768px
   - User preferences API endpoint responds (GET/PATCH)
   - All layout components have unit tests (80%+ coverage)

2. **Home/Dashboard Redesigned**
   - Home page shows quick stats cards (active jobs, success rate, recent activity)
   - View toggle switches between cards and table view
   - Cards view displays job cards with status, progress, and actions
   - Table view shows sortable, filterable TanStack Table
   - Quick actions toolbar present and functional
   - Page loads in <2 seconds on 3G network
   - All dashboard components tested

3. **Jobs Section Enhanced**
   - `/jobs/all` page shows all jobs with filtering
   - `/jobs/active` shows active jobs only
   - Jobs table sortable by all columns (name, status, date, URLs)
   - Advanced filtering works (status, date range, Layer factors)
   - Bulk selection and delete actions functional
   - Job detail page shows enhanced layout with factor breakdown
   - Export button prominent and CSV download works
   - All jobs components tested

4. **Analytics & Settings Implemented**
   - `/analytics` page shows metrics dashboard
   - Charts display success rates, processing times, activity trends
   - `/settings` page has tabbed navigation (General, Scraping, Appearance)
   - Settings panels functional (Layer 1/2/3 rules editable)
   - Preferences save and load from backend
   - Settings persist across browser sessions
   - All components tested

5. **Quality & Accessibility**
   - No TypeScript errors (`npm run type-check` passes)
   - All unit tests pass (80%+ coverage for hooks)
   - All E2E tests pass (Playwright)
   - WCAG 2.1 AA compliant (Lighthouse accessibility score >90)
   - Mobile responsive on iPhone, iPad, Android
   - Keyboard navigation works (Tab, Enter, Escape, ⌘K)
   - No console errors in production build

6. **User Experience**
   - All pages follow consistent design system
   - Navigation intuitive (no training required)
   - Loading states for all async operations
   - Error messages clear and actionable
   - Toast notifications for feedback
   - Smooth animations (respect prefers-reduced-motion)

---

## Traceability Mapping

| AC # | Acceptance Criteria | Spec Section | Components/APIs | Test Coverage |
|------|---------------------|--------------|-----------------|---------------|
| 1 | shadcn/ui installed | Implementation Details → Setup | components.json, tailwind.config.ts | Manual verification |
| 1 | App shell renders | Detailed Design → Services | AppShell, Sidebar, Header | layout.spec.tsx |
| 1 | Sidebar toggles | Component Hierarchy | Sidebar, PreferencesService | sidebar.spec.tsx |
| 1 | Theme switches | APIs and Interfaces | ThemeProvider, /preferences | theme-switching.spec.ts (E2E) |
| 1 | Command palette (⌘K) | User Workflows | CommandPalette (cmdk) | command-palette.spec.ts |
| 1 | Mobile navigation | NFR → Observability | MobileNav, AppShell | mobile-nav.spec.tsx |
| 1 | Preferences API | APIs and Interfaces | PreferencesController, Service | preferences.controller.spec.ts |
| 2 | Quick stats cards | Detailed Design → Services | QuickStats component | quick-stats.spec.tsx |
| 2 | View toggle | Component Hierarchy | ViewToggle, useUserPreferences | view-toggle.spec.tsx |
| 2 | Cards view | User Workflows | JobsCardsView, JobCard | cards-view.spec.tsx |
| 2 | Table view | Data Models | JobsTableView, TanStack Table | table-view.spec.tsx |
| 2 | Page load <2s | NFR → Performance | Next.js optimizations, lazy loading | Lighthouse CI |
| 3 | Jobs filtering | Detailed Design | JobFilters, JobsTable | jobs-filtering.spec.ts (E2E) |
| 3 | Bulk actions | User Workflows | BulkActions, bulk delete API | bulk-actions.spec.ts |
| 3 | Job detail page | Component Hierarchy | JobDetailView, Layer factors | job-detail.spec.ts |
| 3 | CSV export | APIs and Interfaces | ExportDialog, /jobs/:id/export | csv-export.spec.ts (E2E) |
| 4 | Analytics charts | Dependencies | recharts, MetricsCard | analytics.spec.tsx |
| 4 | Settings tabs | Component Hierarchy | SettingsTabs, Layer panels | settings.spec.tsx |
| 4 | Preferences persist | APIs and Interfaces | PreferencesService, Supabase | preferences-persistence.spec.ts |
| 5 | TypeScript no errors | Testing Strategy | All .ts/.tsx files | `npm run type-check` |
| 5 | Unit tests pass | Testing Strategy | All __tests__ files | `npm test` |
| 5 | WCAG 2.1 AA | NFR → Observability | Accessibility attributes, keyboard nav | Lighthouse accessibility |
| 5 | Mobile responsive | NFR → Performance | Tailwind breakpoints, MobileNav | Responsive E2E tests |
| 6 | Consistent design | Detailed Design | shadcn/ui theme, Tailwind | Visual regression tests |
| 6 | Loading states | NFR → Reliability | Skeleton, Spinner components | loading-states.spec.tsx |
| 6 | Toast notifications | Dependencies | Sonner library | toast.spec.tsx |

---

## Risks, Assumptions, Open Questions

### Risks

**Risk 1: URL Structure Change Breaks Bookmarks**
- **Impact:** Medium
- **Probability:** High (users may have bookmarked `/dashboard`)
- **Mitigation:** Implement redirect from `/dashboard` to `/` in Next.js middleware
- **Status:** Planned

**Risk 2: Performance Regression with Heavy Charts**
- **Impact:** High (slow page loads)
- **Probability:** Medium (recharts is 50KB+)
- **Mitigation:** Lazy load charts with dynamic imports, code split analytics page
- **Status:** In design (Story 4)

**Risk 3: User Resistance to UI Changes**
- **Impact:** Medium (adoption)
- **Probability:** Low (internal tool)
- **Mitigation:** Phased rollout, user communication, feedback channels
- **Status:** Planned post-deployment

**Risk 4: Accessibility Gaps**
- **Impact:** High (WCAG non-compliance)
- **Probability:** Medium (first time implementing)
- **Mitigation:** Automated testing (Lighthouse), manual screen reader testing (NVDA)
- **Status:** Ongoing (test during each story)

**Risk 5: Preferences API Unavailable**
- **Impact:** Low (features degrade gracefully)
- **Probability:** Low (simple CRUD endpoint)
- **Mitigation:** localStorage fallback, defaults, error handling
- **Status:** Implemented in design

### Assumptions

**Assumption 1: No User Authentication**
- Preferences stored globally (single settings row) or session-based
- Future: Add user_id foreign key when authentication implemented
- **Status:** Accepted for MVP

**Assumption 2: Backend APIs Stable**
- No changes to existing `/jobs` and `/settings` endpoints
- Only adding `/preferences` endpoint
- **Status:** Validated with API architecture

**Assumption 3: Browser Support**
- Modern browsers only (Chrome 90+, Firefox 88+, Safari 14+)
- No IE11 support required
- **Status:** Accepted

**Assumption 4: Dataset Size**
- Job tables will have <1000 rows on screen at once
- Pagination handles larger datasets
- **Status:** Confirmed with product requirements

### Open Questions

**Question 1: Analytics Chart Interactivity**
- Should charts be interactive (tooltips, click to filter)?
- Answer: **Yes** - recharts provides built-in tooltips, implement click-to-filter in Phase 2

**Question 2: Keyboard Shortcut Conflicts**
- Should we support customizable keyboard shortcuts?
- Answer: **No** for MVP - use standard shortcuts only (⌘K for command palette)

**Question 3: Theme Storage Strategy**
- Should theme be stored in database or localStorage?
- Answer: **Database** - sync across devices, localStorage as fallback

**Question 4: Mobile Navigation Pattern**
- Drawer vs. bottom tab bar on mobile?
- Answer: **Drawer** - consistent with desktop sidebar UX

---

## Test Strategy Summary

### Unit Testing (Jest + React Testing Library)

**Coverage Targets:**
- Hooks: 80% (enforced by existing config)
- Components: 80% (aim, not enforced)
- Utilities: 90%

**Components to Test:**
1. Layout: AppShell, Sidebar, Header, MobileNav
2. Home: QuickStats, ViewToggle, JobsCardsView, JobsTableView
3. Jobs: JobsTable, JobCard, JobFilters, BulkActions, JobDetailView
4. Analytics: MetricsCard, SuccessRateChart, ProcessingTimeChart
5. Settings: SettingsTabs, GeneralSettings, AppearanceSettings
6. Shared: ThemeProvider, Toast, CommandPalette

**Test Patterns:**
```typescript
// Rendering test
it('renders job name and progress', () => {
  render(<JobCard name="Test Job" progress={50} />);
  expect(screen.getByText('Test Job')).toBeInTheDocument();
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
});

// Interaction test
it('switches view mode on button click', () => {
  const onViewChange = jest.fn();
  render(<ViewToggle currentView="cards" onViewChange={onViewChange} />);
  fireEvent.click(screen.getByRole('button', { name: /table/i }));
  expect(onViewChange).toHaveBeenCalledWith('table');
});

// Hook test
it('fetches preferences from API', async () => {
  const { result } = renderHook(() => useUserPreferences(), { wrapper: QueryWrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.preferences).toEqual({ theme: 'dark', ... });
});
```

### Integration Testing (Playwright E2E)

**Critical Paths:**
1. **Navigation Flow:** Home → Jobs → Analytics → Settings → Home
2. **View Switching:** Cards ↔ Table view persistence
3. **Theme Switching:** Light ↔ Dark mode with reload verification
4. **Filtering:** Apply filters, verify table updates
5. **Bulk Actions:** Select jobs, delete, verify removal
6. **Command Palette:** ⌘K open, search, navigate, verify URL
7. **Preferences Persistence:** Change theme, reload, verify persisted
8. **Mobile Responsive:** All flows on 375px viewport

**E2E Test Example:**
```typescript
test('user can navigate through all main pages', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL('/');

  await page.click('text=Jobs');
  await expect(page).toHaveURL('/jobs/all');

  await page.click('text=Analytics');
  await expect(page).toHaveURL('/analytics');

  await page.click('text=Settings');
  await expect(page).toHaveURL('/settings');
});

test('preferences persist across sessions', async ({ page, context }) => {
  // Change theme to dark
  await page.goto('/settings');
  await page.click('text=Appearance');
  await page.click('[data-testid="theme-toggle"]');
  await expect(page.locator('html')).toHaveClass(/dark/);

  // Reload page in new context
  await context.close();
  const newContext = await browser.newContext();
  const newPage = await newContext.newPage();
  await newPage.goto('/');

  // Verify dark theme persisted
  await expect(newPage.locator('html')).toHaveClass(/dark/);
});
```

### Accessibility Testing

**Automated (Lighthouse):**
- Run on all pages
- Target: Score >90 for Accessibility
- Check: Keyboard navigation, ARIA labels, color contrast

**Manual (Screen Reader):**
- Test with NVDA (Windows) or VoiceOver (Mac)
- Verify navigation landmarks announced
- Test form inputs and buttons
- Validate toast notifications (ARIA live regions)

**Checklist:**
- [ ] All interactive elements keyboard accessible (Tab, Enter, Space)
- [ ] Focus indicators visible and clear
- [ ] Skip links for main content
- [ ] ARIA labels for icon buttons
- [ ] ARIA expanded/collapsed for sidebar
- [ ] Color contrast ratios meet WCAG AA (4.5:1 for text)
- [ ] Screen reader announces page changes
- [ ] Semantic HTML (nav, main, article, button, a)

### Performance Testing

**Metrics:**
- First Contentful Paint (FCP): <1.5s
- Largest Contentful Paint (LCP): <2.5s
- Time to Interactive (TTI): <3.5s
- Cumulative Layout Shift (CLS): <0.1

**Test Conditions:**
- Simulated 3G network (Lighthouse)
- Large dataset (100+ jobs)
- Multiple chart renders

**Optimization Validation:**
- Code splitting verified (route-based chunks)
- Lazy loading working (recharts not in initial bundle)
- Image optimization (Next.js Image component)
- Bundle size <200KB gzip (analyze with next-bundle-analyzer)

---

**✅ Epic Technical Specification Complete**

This specification provides comprehensive technical guidance for implementing the UI/UX Modernization Overhaul epic. All implementation details, API contracts, component designs, testing strategies, and risk mitigations are documented and ready for story generation.

**Next Steps:**
1. Review this technical specification
2. Proceed to create individual user stories from this epic
3. Each story will reference this document for technical context
4. Begin implementation with Story 1: Foundation & Application Shell
