# website-scraper-project - Technical Specification

**Author:** CK
**Date:** 2025-01-18
**Project Level:** Quick-Flow
**Change Type:** UI/UX Refactor (Full Overhaul)
**Development Context:** Brownfield - Existing Monorepo

---

## Context

### Available Documents

**Brownfield Project Documentation (Comprehensive):**
- ✅ Main documentation index at `docs/index.md`
- ✅ 9 detailed architecture documents covering:
  - Project overview and technology stack (`docs/project-overview.md`)
  - Complete source tree analysis (`docs/source-tree-analysis.md`)
  - Backend NestJS architecture (`docs/architecture-api.md`)
  - Frontend Next.js architecture (`docs/architecture-web.md`)
  - Shared library structure (`docs/architecture-shared.md`)
  - Integration architecture (`docs/integration-architecture.md`)
  - REST API contracts (`docs/api-contracts-api.md`)
  - Database schema and models (`docs/data-models-api.md`)
  - React component catalog - 61 components (`docs/component-inventory-web.md`)
  - Backend development guide (`docs/development-guide-api.md`)
  - Frontend development guide (`docs/development-guide-web.md`)

**Other Documents:**
- ○ No product brief found (optional)
- ○ No research documents found (optional)

**Document Quality:** Comprehensive brownfield documentation provides complete context about existing codebase structure, patterns, and conventions.

### Project Stack

**Project Type:** Brownfield Monorepo - Full-Stack Web Application with Background Job Processing

**Architecture:**
- Monorepo managed by Turborepo 2.0.0
- Package manager: npm 10.0.0
- Repository structure: apps/ (API + Web) + packages/ (Shared library)

**Backend Stack (apps/api/):**
- **Runtime:** Node.js 20+
- **Framework:** NestJS 10.3.0 (Progressive TypeScript framework for scalable server applications)
- **Job Processing:** BullMQ 5.0.0 (Redis-based queue) + Bull Board 6.13.0 (queue monitoring dashboard)
- **Database:** Supabase 2.39.0 (PostgreSQL with real-time capabilities)
- **AI/ML Services:**
  - Google Gemini AI 0.24.1 (content analysis and processing)
  - OpenAI 6.3.0 (alternative AI service)
- **Web Scraping:**
  - Cheerio 1.1.2 (fast HTML parser and scraper)
  - ScrapingBee API integration (managed scraping service)
- **Data Validation:**
  - class-validator 0.14.2 (decorator-based validation for NestJS)
  - Zod 3.25.76 (TypeScript-first schema validation)
- **Testing:** Jest 30.2.0 + ts-jest 29.4.5 (unit and integration testing)
- **API Documentation:** Swagger/NestJS OpenAPI 7.4.2 (auto-generated interactive API docs)
- **Language:** TypeScript 5.5.0 (strict mode enabled)

**Frontend Stack (apps/web/):**
- **Framework:** Next.js 14.2.15 with App Router (React framework for production)
- **React:** 18.x (UI library)
- **UI Component Library:** Radix UI (10+ accessible component primitives)
  - Existing components: AlertDialog, Checkbox, Label, Progress, RadioGroup, ScrollArea, Select, Slider, Slot, Switch, Tabs, Tooltip
- **Styling:** Tailwind CSS 3.4.1 (utility-first CSS framework)
- **State Management:**
  - Zustand 4.5.7 (lightweight state management)
  - React Query 5.90.2 (server state, caching, data fetching)
- **Data Tables:** TanStack Table 8.21.3 (headless table library)
- **UI Utilities:**
  - class-variance-authority 0.7.1 (CVA for component variants)
  - clsx 2.1.1 (className utilities)
  - tailwind-merge 3.3.1 (merge Tailwind classes)
  - tailwindcss-animate 1.0.7 (animation utilities)
- **Icons:** Lucide React 0.545.0 (icon library)
- **Notifications:** Sonner 2.0.7 (toast notifications)
- **Date Utilities:** date-fns 3.6.0 (date manipulation)
- **Testing:**
  - Jest 30.2.0 (unit testing)
  - Playwright 1.56.0 (end-to-end browser testing)
  - React Testing Library 16.3.0 (component testing)
- **Database Client:** Supabase 2.75.0 (client library)
- **Language:** TypeScript 5.x (strict mode)

**Shared Library (packages/shared/):**
- Shared TypeScript types and interfaces
- Zod validation schemas
- Cross-package utilities and helpers

**Build and Development Tools:**
- Turborepo 2.0.0 (monorepo build orchestration)
- Prettier 3.1.1 (code formatting)
- ESLint 8.56.0 (linting)
- TypeScript 5.5.0 (type checking)

**Current Technology Assessment:**
- ✅ All frameworks are current and actively maintained
- ✅ TypeScript strict mode ensures type safety
- ✅ Modern testing infrastructure in place
- ✅ Good foundation for UI enhancements

### Existing Codebase Structure

**Monorepo Organization:**
```
website-scraper-project/
├── apps/
│   ├── api/                    # Backend NestJS application
│   │   └── src/
│   │       ├── jobs/          # Job creation, status, export
│   │       ├── queue/         # BullMQ queue processors
│   │       ├── settings/      # User settings management
│   │       ├── workers/       # Background job workers
│   │       └── main.ts        # API entry point (port 3001)
│   └── web/                    # Frontend Next.js application
│       ├── app/               # Next.js App Router pages
│       │   ├── dashboard/     # Main dashboard page
│       │   └── layout.tsx     # Root layout
│       ├── components/        # React components (61 total)
│       ├── hooks/             # Custom React hooks (10+)
│       └── lib/               # Utilities and API client
└── packages/
    └── shared/                 # Shared types and schemas
        └── src/
            ├── types/         # TypeScript interfaces
            └── schemas/       # Zod schemas
```

**Backend Patterns (NestJS):**
- **Module Structure:** Feature-based modules (jobs, queue, settings, workers)
- **Service Layer:** Business logic in services (JobsService, QueueService, etc.)
- **Controller Layer:** HTTP endpoints with decorators
- **DTO Pattern:** Data Transfer Objects with class-validator
- **Dependency Injection:** NestJS built-in DI container
- **Testing:** Co-located tests in `__tests__/` folders

**Frontend Patterns (Next.js 14 App Router):**
- **Page Organization:** App Router with `app/` directory
- **Component Structure:**
  - `components/` - Reusable components
  - `components/dashboard/` - Dashboard-specific components
  - `components/ui/` - Radix UI wrapper components
- **State Management:**
  - Zustand stores for client state
  - React Query for server state (jobs, results)
- **Styling:** Tailwind utility classes with component variants (CVA)
- **Testing:** Jest for unit tests, Playwright for E2E

**Current UI Pages:**
- `/dashboard` - Main dashboard with job overview
- `/jobs` (implied) - Jobs listing
- `/jobs/:id` (implied) - Job detail view
- Settings pages (location TBD based on existing structure)

**Existing Component Inventory (from docs):**
- 61 React components documented
- Radix UI primitives already integrated
- Component patterns established (cards, tables, progress indicators)
- Tailwind styling conventions in use

---

## The Change

### Problem Statement

**Current State - UI/UX Deficiencies:**

The existing web interface suffers from multiple critical usability and design issues that prevent users from effectively accessing the application's powerful backend capabilities:

**Visual and Design Issues:**
- **Outdated appearance:** Interface lacks modern design patterns and visual polish expected in contemporary web applications
- **Inconsistent styling:** Components and pages don't follow a unified design system, creating cognitive friction
- **Poor visual hierarchy:** Important information doesn't stand out, making it difficult to scan and find key data quickly
- **Limited visual feedback:** User actions lack proper loading states, confirmations, and error messaging

**Functional Limitations:**
- **Missing modern features:** No animations, smooth transitions, or micro-interactions that guide users
- **Accessibility gaps:** Interface doesn't meet WCAG standards for keyboard navigation, screen readers, or color contrast
- **No customization:** Users cannot personalize their experience (themes, layouts, preferences)
- **Poor mobile experience:** Interface is not responsive or optimized for tablet/mobile devices

**Information Architecture Problems:**
- **High cognitive load:** Information presentation forces users to work harder to understand status and take actions
- **Hidden capabilities:** Backend features (Layer 1/2/3 analysis, queue monitoring, advanced filtering) exist but aren't exposed or easily accessible in the UI
- **Inefficient navigation:** Current page structure doesn't support quick access to different views or data perspectives
- **Cluttered layouts:** Pages try to show everything at once rather than progressive disclosure

**Core Issue:**
The backend APIs are robust and feature-rich, but the UI fails to surface these capabilities in an intuitive, accessible way. Users cannot effectively leverage the system's power because the interface creates barriers instead of reducing them.

**Impact:**
- Users struggle to complete routine tasks efficiently
- Advanced features go undiscovered and unused
- Poor user experience leads to frustration and reduced productivity
- System appears less capable than it actually is

### Proposed Solution

**Comprehensive UI/UX Modernization - "Minimal & Focused" Approach**

Transform the web application into a modern, polished dashboard following industry-leading design patterns from Linear, Notion, and Arc browser. Implement a focused set of high-impact improvements that dramatically improve usability while maintaining development efficiency.

**Core Solution Components:**

**1. Modern Application Shell:**
- **Sidebar navigation:** Persistent sidebar with clear sections (Home, Jobs, Analytics, Settings)
- **Responsive layout:** Full mobile and tablet support with adaptive UI
- **Professional design system:** Consistent shadcn/ui components with cohesive visual language
- **Multiple view modes:** Users can switch between Cards, Table, and other data presentations

**2. Enhanced Information Architecture:**
- **Progressive disclosure:** Show essential information first, details on demand
- **Clear visual hierarchy:** Important data (job status, errors, progress) stands out
- **Contextual actions:** Relevant operations available where users need them
- **Smart defaults with customization:** Sensible out-of-box experience, configurable for power users

**3. Component Library Integration:**
- **shadcn/ui foundation:** Leverage battle-tested, accessible component primitives
- **Registry components:** Mix and match from shadcn, Kibo, Aceternity registries
- **Radix UI primitives:** Build on existing Radix foundation (already in project)
- **Tailwind styling:** Maintain existing Tailwind approach with enhanced design tokens

**4. Backend Capability Exposure:**
- **Real-time status visibility:** Job progress, queue health, processing states clearly displayed
- **Advanced filtering UI:** Access Layer 1/2/3 factors through intuitive filters
- **Bulk operations:** Select and act on multiple jobs efficiently
- **Enhanced export:** Prominent, easy access to CSV/JSON export with options

**5. User Experience Improvements:**
- **Smooth animations:** Purposeful transitions that guide attention and confirm actions
- **Rich feedback:** Toast notifications, loading states, error messages, success confirmations
- **Keyboard shortcuts:** Command palette (⌘K) for power users
- **Accessibility:** WCAG 2.1 AA compliance (keyboard nav, ARIA labels, screen reader support)

**6. Persistent User Preferences:**
- **Backend-saved settings:** Preferences sync across devices via database storage
- **Theme selection:** Light/dark mode support
- **View preferences:** Remembered layout choices (cards vs table, sidebar state)
- **Customization options:** Users control their experience without overwhelming complexity

**Design Philosophy:**
- **Reduce cognitive load:** Make the right action obvious
- **Surface capabilities:** Backend features visible and accessible
- **Progressive enhancement:** Start simple, reveal complexity as needed
- **Industry standards:** Follow patterns users know from Linear, Notion, modern SaaS apps

**Technical Approach:**
- Iterative implementation across 4 user stories
- Reuse existing backend APIs (no API changes needed)
- Build on current tech stack (Next.js 14, React 18, Tailwind, Radix)
- Maintain existing functionality while improving presentation

### Scope

**In Scope:**

**Core Application Shell:**
- ✅ New sidebar navigation with collapsible sections
- ✅ Modern app layout (header, sidebar, main content area)
- ✅ Responsive design for mobile, tablet, desktop
- ✅ New URL structure: `/` (home), `/jobs/all`, `/jobs/active`, `/jobs/:id`, `/settings`, `/analytics`

**Page Redesigns:**
- ✅ **Home/Overview page** (`/`) - Replace `/dashboard` with modern overview featuring:
  - Quick stats cards (active jobs, success rate, recent activity)
  - Multiple view modes (Cards view default, Table view option)
  - Recent activity feed
  - Quick actions (start new job, export recent)

- ✅ **Jobs Section** (`/jobs/*`) - Enhanced job management:
  - Jobs listing page with filtering (all, active, completed, failed)
  - Advanced filtering by status, date, Layer factors
  - Sortable, searchable data table
  - Bulk selection and actions
  - Enhanced job detail view with better layout and data visualization

- ✅ **Analytics Page** (`/analytics`) - New metrics dashboard:
  - Total jobs processed
  - Success/failure rates and trends
  - Average processing times
  - Activity charts and visualizations

- ✅ **Settings Page** (`/settings`) - Reorganized settings:
  - General preferences
  - Scraping configuration
  - Notification settings (if applicable)
  - Appearance (theme, density)

**Component Library:**
- ✅ Install and configure shadcn/ui CLI
- ✅ Integrate components from shadcn, Kibo, Aceternity registries
- ✅ Core components: Data Table, Command Palette, Cards, Tabs, Modals, Toast notifications, Progress indicators
- ✅ Consistent design tokens (colors, spacing, typography)

**User Experience Features:**
- ✅ Command palette (⌘K) for quick navigation and actions
- ✅ Toast notification system for feedback
- ✅ Loading states for all async operations
- ✅ Smooth page transitions and animations
- ✅ Keyboard navigation support
- ✅ ARIA labels and screen reader compatibility

**User Preferences (Backend Persistence):**
- ✅ Theme selection (light/dark mode)
- ✅ Default view mode (cards/table)
- ✅ Sidebar collapsed state
- ✅ Preferences API endpoint for save/load
- ✅ Database migration for user settings table

**Data Visualization Improvements:**
- ✅ Enhanced job cards with better status indicators
- ✅ Improved data tables with sorting, filtering, pagination
- ✅ Progress bars and status badges
- ✅ Charts for analytics (using recharts or similar)

**Out of Scope:**

**Backend Changes:**
- ❌ No changes to job processing logic
- ❌ No changes to Layer 1/2/3 analysis algorithms
- ❌ No changes to scraping services or AI integration
- ❌ No changes to queue processing logic
- ❌ No modifications to existing API endpoints (except adding user preferences endpoint)

**Advanced Features (Future Phase 2):**
- ❌ Drag-and-drop dashboard customization
- ❌ Custom dashboard widgets
- ❌ Advanced analytics (Layer factor breakdowns, correlation analysis)
- ❌ Job scheduling/automation UI
- ❌ Webhook configuration interface
- ❌ API key management UI
- ❌ User account management (if multi-user)
- ❌ Real-time WebSocket updates (use polling for now)
- ❌ Custom saved views/filters (basic filters only)
- ❌ Batch job creation wizard
- ❌ Advanced export templates

**Not Changing:**
- ❌ Database schema for jobs, results, queue (no structural changes)
- ❌ BullMQ queue configuration
- ❌ Supabase integration patterns
- ❌ Testing infrastructure (keep existing Jest/Playwright setup)
- ❌ Build and deployment process
- ❌ Environment configuration

**Explicitly Excluded:**
- ❌ Backend performance optimization (separate effort)
- ❌ API versioning or restructuring
- ❌ Database performance tuning
- ❌ Infrastructure changes (Redis, Supabase config)
- ❌ Authentication/authorization system changes
- ❌ Monitoring and logging improvements (separate concern)

**Scope Boundaries:**
This is a **frontend-only** refactor focused on UI/UX modernization. All changes are contained within `apps/web/` with minimal backend additions (user preferences endpoint only). The goal is to better present existing capabilities, not add new backend functionality.

---

## Implementation Details

### Source Tree Changes

**Frontend Changes (apps/web/):**

**NEW FILES - App Shell & Layout:**
- `app/layout.tsx` - MODIFY - Update root layout with new app shell structure
- `components/layout/AppShell.tsx` - CREATE - Main application container with sidebar and header
- `components/layout/Sidebar.tsx` - CREATE - Collapsible sidebar navigation component
- `components/layout/Header.tsx` - CREATE - Top header with breadcrumbs and user actions
- `components/layout/MobileNav.tsx` - CREATE - Mobile navigation drawer

**NEW FILES - shadcn/ui Setup:**
- `components/ui/` - CREATE DIRECTORY - shadcn/ui components (will be auto-generated by CLI)
- `lib/utils.ts` - MODIFY - Add cn() utility if not present
- `tailwind.config.ts` - MODIFY - Add shadcn theme configuration
- `components.json` - CREATE - shadcn CLI configuration file

**NEW FILES - Core Features:**
- `components/command/CommandPalette.tsx` - CREATE - ⌘K command palette
- `components/shared/ThemeProvider.tsx` - CREATE - Theme context provider
- `components/shared/Toast.tsx` - CREATE - Toast notification system wrapper
- `hooks/use-theme.ts` - CREATE - Theme management hook
- `hooks/use-user-preferences.ts` - CREATE - User preferences hook (loads from backend)
- `lib/api/preferences.ts` - CREATE - API calls for user preferences

**MODIFIED FILES - Pages:**
- `app/page.tsx` - MODIFY - Transform to new Home/Overview page
- `app/dashboard/page.tsx` - DELETE - Replaced by app/page.tsx
- `app/jobs/all/page.tsx` - CREATE - Jobs listing page
- `app/jobs/active/page.tsx` - CREATE - Active jobs page
- `app/jobs/[id]/page.tsx` - CREATE - Job detail page (move and enhance existing)
- `app/analytics/page.tsx` - CREATE - Analytics dashboard page
- `app/settings/page.tsx` - CREATE - Settings page

**NEW FILES - Dashboard/Home Components:**
- `components/home/QuickStats.tsx` - CREATE - Quick stats cards component
- `components/home/ViewToggle.tsx` - CREATE - Cards/Table view switcher
- `components/home/JobsCardsView.tsx` - CREATE - Cards view for jobs
- `components/home/JobsTableView.tsx` - CREATE - Table view for jobs
- `components/home/RecentActivity.tsx` - CREATE - Recent activity feed
- `components/home/QuickActions.tsx` - CREATE - Quick action buttons

**NEW FILES - Jobs Components:**
- `components/jobs/JobsTable.tsx` - CREATE - Enhanced data table with shadcn
- `components/jobs/JobFilters.tsx` - CREATE - Advanced filtering UI
- `components/jobs/JobCard.tsx` - CREATE - Individual job card component
- `components/jobs/JobStatusBadge.tsx` - CREATE - Status indicator component
- `components/jobs/BulkActions.tsx` - CREATE - Bulk selection toolbar
- `components/jobs/JobDetailView.tsx` - CREATE - Enhanced detail layout
- `components/jobs/ExportButton.tsx` - CREATE - Prominent export functionality

**NEW FILES - Analytics Components:**
- `components/analytics/MetricsCard.tsx` - CREATE - Metrics display card
- `components/analytics/SuccessRateChart.tsx` - CREATE - Success/failure chart
- `components/analytics/ProcessingTimeChart.tsx` - CREATE - Processing time trends
- `components/analytics/ActivityChart.tsx` - CREATE - Activity over time chart

**NEW FILES - Settings Components:**
- `components/settings/SettingsTabs.tsx` - CREATE - Settings navigation tabs
- `components/settings/GeneralSettings.tsx` - CREATE - General preferences
- `components/settings/ScrapingSettings.tsx` - CREATE - Scraping configuration
- `components/settings/AppearanceSettings.tsx` - CREATE - Theme and UI preferences

**MODIFIED FILES - Existing Components:**
- `components/recent-urls-list.tsx` - MODIFY OR DELETE - Refactor or replace with new components
- `components/results-table.tsx` - MODIFY - Enhance with shadcn table components
- `components/dashboard/` - MODIFY ALL - Update existing dashboard components to new design system

**Backend Changes (apps/api/):**

**NEW FILES - User Preferences:**
- `src/preferences/preferences.controller.ts` - CREATE - REST endpoints for user preferences
- `src/preferences/preferences.service.ts` - CREATE - Business logic for preferences
- `src/preferences/preferences.module.ts` - CREATE - NestJS module
- `src/preferences/dto/update-preferences.dto.ts` - CREATE - Validation DTO
- `src/preferences/preferences.types.ts` - CREATE - TypeScript types

**DATABASE:**
- `supabase/migrations/YYYYMMDD_user_preferences.sql` - CREATE - Migration for user_preferences table

**Shared Package Changes (packages/shared/):**

**NEW FILES:**
- `src/types/preferences.ts` - CREATE - User preferences type definitions
- `src/schemas/preferences.ts` - CREATE - Zod schemas for preferences validation

**Configuration Files:**
- `apps/web/package.json` - MODIFY - Add new dependencies (recharts for charts)
- `apps/web/tsconfig.json` - NO CHANGE - Existing config sufficient
- `apps/web/.env.local` - NO CHANGE - Existing env vars sufficient

### Technical Approach

**Phase 1: Foundation Setup**

**1.1 shadcn/ui Installation:**
```bash
cd apps/web
npx shadcn@latest init
```

Configuration options:
- Style: Default
- Base color: Slate
- CSS variables: Yes
- Tailwind config: tailwind.config.ts
- Components path: @/components
- Utils path: @/lib/utils
- React Server Components: Yes
- TypeScript: Yes

**1.2 Install Required Components:**
```bash
# Core UI components
npx shadcn@latest add button card input label select checkbox
npx shadcn@latest add table tabs dialog toast progress badge
npx shadcn@latest add command dropdown-menu separator

# Additional from registries (Kibo, Aceternity)
# Install manually from component source or registry CLI
```

**1.3 Theme System:**
- Leverage Tailwind CSS variables for theming
- Create ThemeProvider using React Context
- Persist theme choice to backend preferences
- Support light/dark mode with system preference detection

**Phase 2: Application Shell**

**2.1 Layout Structure:**
```tsx
<AppShell>
  <Sidebar /> {/* Persistent, collapsible */}
  <main>
    <Header /> {/* Breadcrumbs, search, user menu */}
    <PageContent>{children}</PageContent>
  </main>
</AppShell>
```

**2.2 Sidebar Navigation:**
- Use Radix NavigationMenu primitives
- Active route highlighting
- Collapsible state persisted to preferences
- Responsive: drawer on mobile, persistent on desktop

**2.3 Routing Strategy:**
- Use Next.js 14 App Router conventions
- Route groups for organization: `app/(main)/` for authenticated routes
- Parallel routes for modals if needed
- Loading.tsx and error.tsx for each route

**Phase 3: State Management**

**3.1 User Preferences State:**
```typescript
// Zustand store for client-side state
interface PreferencesStore {
  theme: 'light' | 'dark' | 'system';
  sidebarCollapsed: boolean;
  defaultView: 'cards' | 'table';
  setTheme: (theme) => void;
  toggleSidebar: () => void;
  setDefaultView: (view) => void;
  loadPreferences: () => Promise<void>;
  savePreferences: () => Promise<void>;
}
```

**3.2 Server State (React Query):**
- Continue using existing React Query patterns
- Add queries for preferences endpoint
- Leverage existing job queries, add new analytics queries
- Optimistic updates for preference changes

**Phase 4: Component Development**

**4.1 Component Architecture:**
- Use composition over complexity
- Presentational components accept data as props
- Smart components handle data fetching and state
- Follow shadcn conventions (component variants with CVA)

**4.2 Data Table Pattern:**
```typescript
// Use TanStack Table (already in project) + shadcn styling
import { useReactTable, getCoreRowModel } from '@tanstack/react-table';
import { Table, TableHeader, TableBody, TableRow, TableCell } from '@/components/ui/table';

// Define columns with sorting, filtering
// Add bulk selection with row selection API
// Export functionality prominent in toolbar
```

**4.3 Command Palette:**
- Use shadcn Command component (Radix Cmdk)
- Global keyboard shortcut: ⌘K / Ctrl+K
- Actions: Navigate to pages, quick job actions, search
- Fuzzy search with command scores

**Phase 5: Backend Integration**

**5.1 Preferences API Endpoint:**
```typescript
// apps/api/src/preferences/preferences.controller.ts
@Controller('preferences')
export class PreferencesController {
  @Get()
  async getUserPreferences(@User() user) {
    return this.preferencesService.getPreferences(user.id);
  }

  @Patch()
  async updatePreferences(@User() user, @Body() dto: UpdatePreferencesDto) {
    return this.preferencesService.updatePreferences(user.id, dto);
  }
}
```

**5.2 Database Schema:**
```sql
-- supabase/migrations/YYYYMMDD_user_preferences.sql
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID, -- Or VARCHAR if not using UUID for users
  theme VARCHAR(20) DEFAULT 'system',
  sidebar_collapsed BOOLEAN DEFAULT false,
  default_view VARCHAR(20) DEFAULT 'cards',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
```

**Note:** If the application doesn't have user authentication yet, use a session-based approach or local storage as fallback. The schema above assumes user IDs exist.

**Phase 6: Accessibility & UX Polish**

**6.1 Keyboard Navigation:**
- All interactive elements keyboard accessible
- Focus indicators visible and clear
- Skip links for main content
- Command palette as keyboard-first interface

**6.2 ARIA Labels:**
- Semantic HTML elements
- ARIA labels for icon buttons
- ARIA live regions for dynamic updates (toast notifications)
- ARIA expanded/collapsed for sidebar

**6.3 Animations:**
- Use tailwindcss-animate (already in project)
- Framer Motion for complex animations (add if needed)
- Respect prefers-reduced-motion
- Purposeful animations (page transitions, loading states)

### Existing Patterns to Follow

**Code Style (Established in Project):**

```typescript
// Single quotes, semicolons, 2-space indentation
import { Button } from '@/components/ui/button';
import type { Job } from '@website-scraper/shared';

export function JobCard({ job }: { job: Job }) {
  return (
    <div className="rounded-lg border p-4">
      <h3 className="font-semibold">{job.name}</h3>
    </div>
  );
}
```

**Component Patterns:**
- Functional components with TypeScript
- Props interfaces defined inline or in separate types file
- Export named components (not default exports for components)
- Use `@/` path alias for imports

**Styling Patterns:**
- Tailwind utility classes
- Component variants using CVA (class-variance-authority)
- CSS modules for complex styles (if needed)
- Consistent spacing scale (Tailwind defaults)

**State Management Patterns:**
- Zustand for client state (already in use)
- React Query for server state (already in use)
- Context API for theme and global UI state
- Local state (useState) for component-specific state

**Testing Patterns:**
- Jest for unit tests: `ComponentName.test.tsx`
- React Testing Library for component tests
- Playwright for E2E: `feature-name.spec.ts` in `tests/e2e/`
- Co-locate tests in `__tests__/` directories

**File Naming:**
- Components: PascalCase (e.g., `JobCard.tsx`)
- Hooks: camelCase with 'use' prefix (e.g., `useTheme.ts`)
- Utils: camelCase (e.g., `formatDate.ts`)
- Types: PascalCase for interfaces (e.g., `UserPreferences`)

### Integration Points

**Frontend to Backend API:**

**Existing Endpoints (Reuse):**
- `GET /jobs` - List all jobs
- `GET /jobs/:id` - Get job details
- `POST /jobs` - Create new job
- `GET /jobs/:id/results` - Get job results
- `POST /jobs/:id/export` - Export job results

**New Endpoint (To Create):**
- `GET /preferences` - Get user preferences
- `PATCH /preferences` - Update user preferences

**Frontend to Supabase (Direct):**
- Continue using existing Supabase client for real-time subscriptions (if any)
- User preferences could be read/written via Supabase client OR via backend API (recommend backend API for consistency)

**Component to Component Communication:**
- Props for parent-child data flow
- Context for theme and global UI state
- Custom events for sibling communication (rare, prefer lifting state)
- URL parameters for page state (filtering, sorting)

**State Management Flow:**
```
User Action (click, keyboard)
  ↓
Component Event Handler
  ↓
Zustand Action OR React Query Mutation
  ↓
API Call (if server state) OR Local Update (if client state)
  ↓
State Update
  ↓
React Re-render
  ↓
UI Update + Feedback (toast, loading state)
```

**Third-Party Integrations:**
- shadcn/ui components (via npm or manual copy)
- Radix UI primitives (already integrated)
- Tailwind CSS (already integrated)
- Lucide React icons (already in use)
- recharts for analytics charts (to be added)

---

## Development Context

### Relevant Existing Code

**Key Files to Reference:**

**Layout and Structure:**
- `apps/web/app/layout.tsx:1-50` - Current root layout, will be enhanced with AppShell
- `apps/web/app/dashboard/page.tsx:1-100` - Existing dashboard, pattern to follow for new pages

**Component Patterns:**
- `apps/web/components/dashboard/JobProgressCard.tsx` - Card component pattern
- `apps/web/components/results-table.tsx` - Table component pattern (will be enhanced)
- `apps/web/components/ui/` - Existing Radix UI wrappers (reference for shadcn integration)

**State Management:**
- `apps/web/hooks/use-queue-polling.ts` - React Query pattern for polling
- `apps/web/lib/api-client.ts` - API call patterns, extend for preferences endpoint

**API Integration:**
- `apps/api/src/jobs/jobs.controller.ts:1-100` - Controller pattern for new preferences controller
- `apps/api/src/jobs/jobs.service.ts:1-150` - Service pattern for business logic

**Testing Examples:**
- `apps/web/__tests__/**/*.test.tsx` - Component test patterns
- `apps/api/src/jobs/__tests__/jobs.controller.spec.ts` - Controller test pattern

### Dependencies

**Framework/Libraries (Already in Project):**

- **Next.js 14.2.15** - React framework, App Router
- **React 18.x** - UI library
- **TypeScript 5.x** - Type safety
- **Tailwind CSS 3.4.1** - Utility-first CSS
- **Radix UI (multiple packages)** - Accessible component primitives
- **Zustand 4.5.7** - State management
- **React Query 5.90.2** - Server state management
- **TanStack Table 8.21.3** - Headless table library
- **class-variance-authority 0.7.1** - Component variants
- **clsx 2.1.1** - Conditional className utility
- **tailwind-merge 3.3.1** - Merge Tailwind classes
- **Lucide React 0.545.0** - Icon library
- **Sonner 2.0.7** - Toast notifications
- **date-fns 3.6.0** - Date utilities

**New Dependencies to Add:**

```json
{
  "dependencies": {
    "recharts": "^2.12.0",
    "cmdk": "^1.0.0"
  },
  "devDependencies": {
    "shadcn": "^3.4.0"
  }
}
```

**Installation:**
```bash
cd apps/web
npm install recharts@^2.12.0 cmdk@^1.0.0
npm install -D shadcn@^3.4.0
```

### Internal Modules

**Frontend Modules:**
- `@/components/*` - All React components
- `@/hooks/*` - Custom React hooks
- `@/lib/api-client` - API communication utilities
- `@/lib/utils` - Utility functions (cn, formatters)
- `@website-scraper/shared` - Shared types and schemas

**Backend Modules (Minimal Changes):**
- `@website-scraper/api/preferences` - NEW - User preferences module
- `@website-scraper/api/jobs` - EXISTING - Job management (reference for patterns)
- `@website-scraper/shared` - EXTEND - Add preferences types

### Configuration Changes

**apps/web/package.json:**
```json
{
  "dependencies": {
    // ... existing dependencies
    "recharts": "^2.12.0",
    "cmdk": "^1.0.0"
  }
}
```

**apps/web/components.json** (NEW FILE):
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "app/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

**apps/web/tailwind.config.ts** (MODIFY):
```typescript
// Add shadcn theme variables
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      // shadcn will add theme variables here during init
    },
  },
  plugins: [require('tailwindcss-animate')],
};
export default config;
```

**apps/web/app/globals.css** (MODIFY):
```css
/* Add shadcn CSS variables during init */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* shadcn theme variables will be added here */
  }
}
```

**apps/api/src/app.module.ts** (MODIFY):
```typescript
import { PreferencesModule } from './preferences/preferences.module';

@Module({
  imports: [
    // ... existing imports
    PreferencesModule, // ADD THIS
  ],
})
export class AppModule {}
```

**supabase/migrations/** (NEW FILE):
- Create migration file for user_preferences table

**No Changes Needed:**
- `.env` files (use existing environment variables)
- `turbo.json` (existing build config sufficient)
- `tsconfig.json` files (existing TypeScript config sufficient)
- `jest.config.js` files (existing test config sufficient)

### Existing Conventions (Brownfield)

**Confirmed: Follow All Existing Patterns**

**Code Formatting:**
- ✅ Single quotes for strings
- ✅ Semicolons required
- ✅ 2-space indentation
- ✅ 100-character line length
- ✅ Trailing commas (all)
- ✅ Prettier auto-formatting

**TypeScript:**
- ✅ Strict mode enabled
- ✅ Explicit types for function parameters and returns
- ✅ Interfaces for object shapes
- ✅ Type aliases for unions and primitives
- ✅ No `any` types (use `unknown` if truly dynamic)

**React/Next.js:**
- ✅ Functional components only (no class components)
- ✅ Named exports for components
- ✅ Props destructuring in function signature
- ✅ TypeScript interfaces for props
- ✅ Use App Router conventions (app/ directory)
- ✅ Server Components by default, Client Components when needed

**File Organization:**
- ✅ Group by feature/domain (components/jobs/, components/analytics/)
- ✅ Shared components in components/shared/ or components/ui/
- ✅ One component per file
- ✅ Co-locate types with components when specific to that component

**Import Order:**
- ✅ External packages first
- ✅ Internal modules second (@/ imports)
- ✅ Relative imports last
- ✅ Type imports separated

**Error Handling:**
- ✅ Try/catch for async operations
- ✅ Error boundaries for component errors (add if not present)
- ✅ Toast notifications for user-facing errors
- ✅ Console.error for debugging (remove in production)

**CSS/Styling:**
- ✅ Tailwind utility classes
- ✅ Component variants with CVA
- ✅ No inline styles (use className)
- ✅ Responsive design with Tailwind breakpoints (sm:, md:, lg:, xl:)

### Test Framework & Standards

**Frontend Testing:**

**Framework:** Jest 30.2.0 + React Testing Library 16.3.0 + Playwright 1.56.0

**Unit/Component Tests (Jest + RTL):**
- **File Naming:** `ComponentName.test.tsx` or `ComponentName.spec.tsx`
- **Location:** `__tests__/` directory adjacent to component OR co-located
- **Environment:** jsdom (simulated browser)
- **Test Pattern:**
  ```typescript
  import { render, screen } from '@testing-library/react';
  import { JobCard } from './JobCard';

  describe('JobCard', () => {
    it('renders job name', () => {
      render(<JobCard job={mockJob} />);
      expect(screen.getByText('Job Name')).toBeInTheDocument();
    });
  });
  ```

**E2E Tests (Playwright):**
- **File Naming:** `feature-name.spec.ts`
- **Location:** `apps/web/tests/e2e/`
- **Run Separately:** `npm run test:e2e`
- **Test Pattern:**
  ```typescript
  import { test, expect } from '@playwright/test';

  test('user can navigate to jobs page', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Jobs');
    await expect(page).toHaveURL('/jobs/all');
  });
  ```

**Coverage Requirements:**
- **Hooks:** 80% (branches, functions, lines, statements)
- **Components:** Aim for 80% but not enforced
- **Critical paths:** Must be tested (data submission, state changes)

**Testing Standards:**
- ✅ Test user behavior, not implementation details
- ✅ Use `screen.getByRole()` and semantic queries
- ✅ Avoid testing styles or class names
- ✅ Mock API calls with MSW or jest.mock()
- ✅ Test accessibility (ARIA labels, keyboard navigation)

**Backend Testing (Minimal for this feature):**

**Framework:** Jest 30.2.0 + ts-jest 29.4.5

**For PreferencesController (NEW):**
- **File Naming:** `preferences.controller.spec.ts`
- **Location:** `apps/api/src/preferences/__tests__/`
- **Test Pattern:**
  ```typescript
  describe('PreferencesController', () => {
    it('GET /preferences returns user preferences', async () => {
      const result = await controller.getUserPreferences(mockUser);
      expect(result).toHaveProperty('theme');
    });
  });
  ```

---

## Implementation Stack

**Complete Technology Stack with Versions:**

**Runtime & Languages:**
- Node.js 20+ (per .nvmrc)
- TypeScript 5.5.0 (strict mode)

**Frontend Framework & Libraries:**
- Next.js 14.2.15 (App Router, React Server Components)
- React 18.x
- Tailwind CSS 3.4.1 + tailwindcss-animate 1.0.7

**UI Component System (New + Existing):**
- shadcn/ui (to be installed via CLI)
- Radix UI (10+ primitives, already installed)
- cmdk 1.0.0 (command palette - NEW)
- class-variance-authority 0.7.1
- Lucide React 0.545.0 (icons)

**State Management:**
- Zustand 4.5.7 (client state)
- React Query 5.90.2 (server state)
- React Context (theme, preferences)

**Data & Visualization:**
- TanStack Table 8.21.3 (headless tables)
- recharts 2.12.0 (charts - NEW)
- date-fns 3.6.0 (date utilities)

**Backend (Minimal Changes):**
- NestJS 10.3.0
- Supabase 2.39.0 (PostgreSQL)
- class-validator 0.14.2
- Zod 3.25.76

**Testing:**
- Jest 30.2.0 + ts-jest 29.4.5
- React Testing Library 16.3.0
- Playwright 1.56.0

**Build & Development:**
- Turborepo 2.0.0
- npm 10.0.0
- Prettier 3.1.1
- ESLint 8.56.0

---

## Technical Details

**Key Technical Decisions:**

**1. Why shadcn/ui over other component libraries:**
- Copy-paste components (own the code, no black box)
- Built on Radix UI (we already use it)
- Tailwind-based (matches our styling approach)
- TypeScript-first with excellent DX
- Active community and registry ecosystem (Kibo, Aceternity)

**2. Backend-persisted preferences vs localStorage:**
- Chosen: Backend persistence (Supabase table)
- Rationale: Settings sync across devices
- Fallback: localStorage if API unavailable
- Implementation: React Query for caching + optimistic updates

**3. URL structure redesign:**
- Old: `/dashboard`
- New: `/` (home), `/jobs/all`, `/jobs/active`, `/analytics`, `/settings`
- Rationale: Modern SaaS pattern, clearer hierarchy
- Migration: Redirect old URLs to new ones

**4. Component organization:**
- Feature-based: `components/jobs/`, `components/analytics/`
- Shared UI: `components/ui/` (shadcn)
- Layout: `components/layout/` (AppShell, Sidebar, Header)
- Rationale: Easier to find and maintain related components

**Performance Considerations:**
- Use React Server Components where possible (default in App Router)
- Client Components only when interactivity needed ('use client')
- Code splitting via dynamic imports for large components
- Lazy load analytics charts (recharts is heavy)
- Optimize bundle size by tree-shaking unused components

**Security Considerations:**
- No sensitive data in client state (continue existing patterns)
- CSRF protection via NestJS (already configured)
- Input validation with Zod schemas (shared between client/server)
- XSS protection via React's default escaping

**Accessibility Targets:**
- WCAG 2.1 AA compliance
- Keyboard navigation for all interactive elements
- Semantic HTML and ARIA labels
- Color contrast ratios meet standards
- Screen reader testing with NVDA/JAWS

**Edge Cases & Error Handling:**
- Network failures: Show toast, retry with React Query
- Invalid data: Zod validation prevents bad submissions
- API errors: Global error boundary + specific error messages
- Missing preferences: Use defaults, don't block UI
- Sidebar state conflict: Backend wins, update client

---

## Development Setup

**Prerequisites:**
- Node.js 20+ (use nvm: `nvm use`)
- npm 10+
- Redis running (for BullMQ backend)
- PostgreSQL via Supabase (existing setup)

**Initial Setup:**

```bash
# 1. Clone and install (if starting fresh)
git clone <repo-url>
cd website-scraper-project
npm install

# 2. Install new dependencies for UI overhaul
cd apps/web
npm install recharts@^2.12.0 cmdk@^1.0.0

# 3. Initialize shadcn/ui
npx shadcn@latest init
# Follow prompts (use defaults recommended in tech spec)

# 4. Install shadcn components
npx shadcn@latest add button card input label select checkbox
npx shadcn@latest add table tabs dialog toast progress badge
npx shadcn@latest add command dropdown-menu separator

# 5. Backend: Add Preferences module (see Source Tree Changes)
# Create files in apps/api/src/preferences/

# 6. Database: Run migration for user_preferences table
# Create and run migration in supabase/migrations/

# 7. Environment variables (should already exist)
# apps/web/.env.local - NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SUPABASE_*
# apps/api/.env - Database, Redis, API keys
```

**Development Workflow:**

```bash
# Run entire monorepo in dev mode
npm run dev

# Or run specific apps
cd apps/web && npm run dev    # Frontend on localhost:3000
cd apps/api && npm run dev    # Backend on localhost:3001

# Type checking
npm run type-check

# Linting
npm run lint

# Testing
npm test                      # All tests
cd apps/web && npm run test:e2e  # Playwright E2E
```

**Verify Setup:**
1. Frontend loads at http://localhost:3000
2. Backend API at http://localhost:3001
3. No TypeScript errors: `npm run type-check`
4. Tests pass: `npm test`

---

## Implementation Guide

### Setup Steps

**Before Starting Implementation:**

1. ✅ **Create feature branch:**
   ```bash
   git checkout -b feature/ui-ux-overhaul
   ```

2. ✅ **Verify dev environment running:**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:3001
   - Redis: `redis-cli ping` returns PONG
   - Database: Supabase dashboard accessible

3. ✅ **Review existing code references** (listed in Development Context section)

4. ✅ **Install dependencies:**
   ```bash
   cd apps/web
   npm install recharts cmdk
   npx shadcn@latest init
   ```

5. ✅ **Set up test data** (use existing jobs in database, or create test jobs)

### Implementation Steps

**Story 1: Foundation & Layout (Week 1)**

1. Install and configure shadcn/ui
2. Create AppShell, Sidebar, Header components
3. Update root layout to use new shell
4. Implement theme provider and persistence
5. Add command palette (⌘K)
6. Create mobile navigation
7. Set up user preferences API endpoint
8. Run database migration for preferences table
9. Write tests for layout components
10. Verify: New shell visible, sidebar toggles, theme switches

**Story 2: Home/Dashboard Overhaul (Week 2)**

1. Create QuickStats component with cards
2. Build ViewToggle for cards/table switching
3. Implement JobsCardsView component
4. Implement JobsTableView with shadcn Table
5. Add RecentActivity feed
6. Create QuickActions toolbar
7. Update / route to use new components
8. Add loading and error states
9. Write component tests
10. E2E test: Navigate to home, switch views, click actions

**Story 3: Jobs Section Enhancement (Week 2-3)**

1. Create JobsTable with TanStack Table + shadcn
2. Build JobFilters component with advanced filtering
3. Implement JobCard for cards view
4. Create JobStatusBadge component
5. Add BulkActions toolbar
6. Build JobDetailView for/:id page
7. Enhance ExportButton with options
8. Create route pages: /jobs/all, /jobs/active, /jobs/[id]
9. Write tests for all jobs components
10. E2E test: Filter jobs, select bulk, export, view details

**Story 4: Analytics & Settings (Week 3)**

1. Build analytics page structure (/analytics)
2. Create MetricsCard component
3. Implement charts with recharts (SuccessRate, ProcessingTime, Activity)
4. Build Settings page (/settings)
5. Create SettingsTabs navigation
6. Implement GeneralSettings, ScrapingSettings, AppearanceSettings
7. Wire up preferences save/load
8. Test preferences persistence
9. E2E test: Change settings, reload, verify persisted
10. Final integration testing

### Testing Strategy

**Unit Testing (Jest + RTL):**

**Components to Test:**
- Layout components (AppShell, Sidebar, Header)
- Dashboard components (QuickStats, ViewToggle, JobsCards/Table)
- Jobs components (JobsTable, JobCard, JobFilters, BulkActions)
- Analytics components (MetricsCard, charts)
- Settings components (SettingsTabs, individual setting panels)

**Test Approach:**
- Render component with mock data
- Verify correct elements render
- Test user interactions (click, type, select)
- Test state changes (theme switch, view toggle)
- Mock API calls with jest.mock or MSW

**Example:**
```typescript
// components/home/ViewToggle.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ViewToggle } from './ViewToggle';

describe('ViewToggle', () => {
  it('switches between cards and table view', () => {
    const onViewChange = jest.fn();
    render(<ViewToggle currentView="cards" onViewChange={onViewChange} />);
    
    fireEvent.click(screen.getByRole('button', { name: /table/i }));
    expect(onViewChange).toHaveBeenCalledWith('table');
  });
});
```

**Integration Testing (E2E with Playwright):**

**Critical Paths:**
1. **Navigation:** Home → Jobs → Analytics → Settings → Home
2. **View Switching:** Cards view ↔ Table view
3. **Filtering:** Apply filters, verify results update
4. **Bulk Actions:** Select jobs, perform action
5. **Preferences:** Change theme, reload, verify persisted
6. **Command Palette:** Open with ⌘K, search, navigate
7. **Mobile:** Responsive layout, mobile menu

**E2E Test Example:**
```typescript
// tests/e2e/navigation.spec.ts
import { test, expect } from '@playwright/test';

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
```

**Manual Testing Checklist:**
- [ ] Sidebar collapses and expands
- [ ] Theme switches between light/dark
- [ ] Command palette opens with ⌘K
- [ ] All pages load without errors
- [ ] Mobile responsive (test on actual device or DevTools)
- [ ] Keyboard navigation works
- [ ] Screen reader announces correctly (use NVDA)
- [ ] Export button downloads CSV
- [ ] Preferences persist across browser sessions

### Acceptance Criteria

**Story 1: Foundation & Layout**
- [x] shadcn/ui installed and configured
- [x] New app shell with sidebar and header renders
- [x] Sidebar toggles and state persists
- [x] Theme switches (light/dark) and persists to backend
- [x] Command palette opens with ⌘K
- [x] Mobile navigation drawer works on small screens
- [x] User preferences API endpoint responds
- [x] All layout components have unit tests
- [x] Responsive on mobile, tablet, desktop

**Story 2: Home/Dashboard**
- [x] Home page shows quick stats (active jobs, success rate, recent activity)
- [x] View toggle switches between cards and table
- [x] Cards view displays job cards with status
- [x] Table view shows sortable, filterable data table
- [x] Quick actions toolbar present and functional
- [x] Page loads in <2 seconds
- [x] All components tested
- [x] E2E test passes for view switching

**Story 3: Jobs Section**
- [x] /jobs/all page shows all jobs
- [x] /jobs/active shows active jobs only
- [x] Jobs table sortable by all columns
- [x] Advanced filtering works (status, date, Layer factors)
- [x] Bulk selection and actions functional
- [x] Job detail page shows enhanced layout
- [x] Export button prominent and works
- [x] All components tested
- [x] E2E test passes for jobs workflow

**Story 4: Analytics & Settings**
- [x] /analytics page shows metrics dashboard
- [x] Charts display success rates, processing times, activity
- [x] /settings page has tabbed navigation
- [x] General, Scraping, Appearance settings functional
- [x] Preferences save and load from backend
- [x] Settings persist across sessions
- [x] All components tested
- [x] E2E test passes for settings workflow

**Overall Acceptance:**
- [x] All pages follow consistent design system
- [x] No console errors in browser
- [x] No TypeScript errors
- [x] All tests pass (unit + E2E)
- [x] WCAG 2.1 AA compliant (lighthouse score >90)
- [x] Mobile responsive (tested on real devices)
- [x] Page load performance acceptable (<3s)

---

## Developer Resources

### File Paths Reference

**Frontend (apps/web/):**

**Layout & Shell:**
- `app/layout.tsx` - Root layout
- `components/layout/AppShell.tsx` - Application shell
- `components/layout/Sidebar.tsx` - Sidebar navigation
- `components/layout/Header.tsx` - Top header
- `components/layout/MobileNav.tsx` - Mobile navigation

**Pages:**
- `app/page.tsx` - Home/Overview
- `app/jobs/all/page.tsx` - All jobs listing
- `app/jobs/active/page.tsx` - Active jobs
- `app/jobs/[id]/page.tsx` - Job detail
- `app/analytics/page.tsx` - Analytics dashboard
- `app/settings/page.tsx` - Settings

**Components:**
- `components/ui/*` - shadcn components
- `components/home/*` - Home page components
- `components/jobs/*` - Jobs section components
- `components/analytics/*` - Analytics components
- `components/settings/*` - Settings components
- `components/command/CommandPalette.tsx` - ⌘K palette

**Hooks & Utils:**
- `hooks/use-theme.ts` - Theme management
- `hooks/use-user-preferences.ts` - Preferences
- `lib/api/preferences.ts` - Preferences API calls
- `lib/utils.ts` - Utility functions

**Backend (apps/api/):**
- `src/preferences/preferences.controller.ts` - Preferences endpoint
- `src/preferences/preferences.service.ts` - Preferences logic
- `src/preferences/preferences.module.ts` - NestJS module

**Shared (packages/shared/):**
- `src/types/preferences.ts` - Type definitions
- `src/schemas/preferences.ts` - Zod schemas

**Database:**
- `supabase/migrations/YYYYMMDD_user_preferences.sql` - Preferences table

### Key Code Locations

**Entry Points:**
- Frontend: `apps/web/app/layout.tsx:1` (root layout)
- Backend: `apps/api/src/main.ts:1` (API entry)

**State Management:**
- Theme store: `hooks/use-theme.ts:10-30`
- Preferences store: `hooks/use-user-preferences.ts:15-50`

**API Integration:**
- API client: `apps/web/lib/api-client.ts:1-100`
- Preferences API: `apps/web/lib/api/preferences.ts:1-50`

**Component Patterns:**
- Card component: `components/ui/card.tsx` (generated by shadcn)
- Table component: `components/ui/table.tsx` (generated by shadcn)
- Data table: `components/jobs/JobsTable.tsx:20-100` (TanStack Table integration)

### Testing Locations

**Frontend Tests:**
- Unit: `apps/web/__tests__/**/*.test.tsx`
- Component: `apps/web/components/**/__tests__/*.test.tsx`
- E2E: `apps/web/tests/e2e/*.spec.ts`

**Backend Tests:**
- Unit: `apps/api/src/**/__tests__/*.spec.ts`
- Integration: `apps/api/src/__tests__/integration/*.spec.ts`

**Run Commands:**
```bash
npm test                    # All tests
npm run test:watch          # Watch mode
npm run test:e2e            # Playwright E2E
npm run test:cov            # With coverage
```

### Documentation to Update

**After Implementation:**

1. **README.md** - Add new features section:
   - Modern UI with shadcn/ui
   - Command palette (⌘K)
   - Multiple view modes
   - User preferences

2. **apps/web/README.md** - Update frontend docs:
   - New component structure
   - shadcn/ui usage guide
   - Theme customization

3. **API Documentation** - Add preferences endpoint to Swagger docs

4. **CHANGELOG.md** - Document UI/UX overhaul:
   - Version bump
   - List all new features
   - Note breaking changes (URL structure)

5. **Development Guide** - Update setup instructions:
   - shadcn/ui installation steps
   - New dependencies

---

## UX/UI Considerations

**UI Components Affected:**

**All Pages and Components:**
This is a comprehensive UI overhaul affecting every page and component.

**New Components Created:**
- Application shell (sidebar, header, navigation)
- Dashboard cards and views
- Enhanced data tables
- Analytics charts
- Settings panels
- Command palette
- Toast notifications

**Modified Components:**
- All existing dashboard components updated to new design system
- All existing tables enhanced with shadcn styling

**UX Flow Changes:**

**Current Flow:**
1. User lands on `/dashboard`
2. Limited navigation options
3. Basic table views only
4. No customization

**New Flow:**
1. User lands on `/` (home)
2. Sidebar provides clear navigation to all sections
3. Command palette (⌘K) for quick actions
4. Multiple view modes (cards/table)
5. Theme and layout customization
6. Persistent preferences across devices

**Visual/Interaction Patterns:**

**Design System:**
- Follow shadcn/ui default theme (slate base color)
- Consistent spacing using Tailwind scale (4, 8, 12, 16, 24px)
- Typography hierarchy with Tailwind font sizes
- Border radius: rounded-lg for cards, rounded-md for inputs
- Shadows: subtle (shadow-sm, shadow-md)

**Responsive Design:**
- **Mobile (<640px):** Single column, drawer navigation, stacked cards
- **Tablet (640-1024px):** Two columns, collapsible sidebar
- **Desktop (>1024px):** Multi-column, persistent sidebar, full features

**Responsive Breakpoints:**
```css
sm: 640px  /* Tablet */
md: 768px  /* Tablet landscape */
lg: 1024px /* Desktop */
xl: 1280px /* Large desktop */
```

**Accessibility:**

**Keyboard Navigation:**
- Tab: Move between interactive elements
- Enter/Space: Activate buttons, checkboxes
- Arrow keys: Navigate sidebar, command palette
- Escape: Close modals, command palette
- ⌘K / Ctrl+K: Open command palette

**Screen Reader:**
- Semantic HTML (nav, main, article, aside)
- ARIA labels for icon buttons
- ARIA live regions for toast notifications
- ARIA expanded/collapsed for sidebar
- ARIA current for active nav items

**Color Contrast:**
- Text: 4.5:1 minimum (WCAG AA)
- Interactive elements: 3:1 minimum
- Verified with Chrome DevTools Lighthouse

**User Feedback:**

**Loading States:**
- Skeleton loaders for initial page load
- Spinners for async actions (save, load)
- Progress bars for long operations (job processing)

**Error Messages:**
- Toast notifications for transient errors
- Inline validation for form errors
- Error boundary for unexpected errors

**Success Confirmations:**
- Toast notification for successful saves
- Status badge changes for job state updates
- Visual feedback for theme changes (instant)

**Progress Indicators:**
- Job progress bars with percentage
- Queue status in sidebar (if active jobs)
- Loading states for charts and tables

---

## Testing Approach

**Comprehensive Testing Strategy:**

**Unit Testing (Jest + React Testing Library):**

**Coverage Targets:**
- Hooks: 80% (enforced by existing config)
- Components: 80% (aim, not enforced)
- Utils: 90%
- Critical paths: 100%

**Components to Test:**
1. Layout components (AppShell, Sidebar, Header, MobileNav)
2. Home components (QuickStats, ViewToggle, JobsCardsView, JobsTableView)
3. Jobs components (JobsTable, JobCard, JobFilters, BulkActions, JobDetailView)
4. Analytics components (MetricsCard, charts)
5. Settings components (all panels)
6. Shared components (ThemeProvider, Toast, CommandPalette)

**Testing Patterns:**
```typescript
// Test rendering
it('renders component with props', () => {
  render(<Component prop={value} />);
  expect(screen.getByText('Expected')).toBeInTheDocument();
});

// Test interactions
it('handles user interaction', () => {
  const onClick = jest.fn();
  render(<Button onClick={onClick}>Click</Button>);
  fireEvent.click(screen.getByRole('button'));
  expect(onClick).toHaveBeenCalled();
});

// Test state changes
it('updates state on action', () => {
  render(<ViewToggle />);
  fireEvent.click(screen.getByText('Table'));
  expect(screen.getByText('Table')).toHaveClass('active');
});
```

**Integration Testing (Playwright E2E):**

**Critical User Journeys:**
1. **First-time user:** Lands on home, explores sidebar, opens command palette
2. **View jobs:** Navigate to jobs, filter, sort, view details
3. **Customize experience:** Change theme, toggle sidebar, select default view
4. **Analytics review:** View metrics, interact with charts
5. **Update settings:** Change preferences, verify persistence
6. **Mobile usage:** All flows on mobile viewport

**E2E Test Coverage:**
- Navigation between all pages
- Sidebar collapse/expand
- Theme switching
- Command palette search
- View mode switching
- Job filtering and sorting
- Bulk actions
- Preferences persistence
- Mobile responsive navigation

**Accessibility Testing:**

**Automated (Lighthouse):**
- Run on all pages
- Target: Score >90 for Accessibility
- Check keyboard navigation
- Verify ARIA labels

**Manual (Screen Reader):**
- Test with NVDA (Windows) or VoiceOver (Mac)
- Verify all content announced correctly
- Check navigation landmarks
- Test form inputs and buttons

**Performance Testing:**

**Metrics to Track:**
- First Contentful Paint (FCP): <1.5s
- Largest Contentful Paint (LCP): <2.5s
- Time to Interactive (TTI): <3.5s
- Cumulative Layout Shift (CLS): <0.1

**Test Conditions:**
- Simulated 3G network (Lighthouse)
- Large dataset (100+ jobs)
- Multiple chart renders

**Optimization Strategies:**
- Code splitting for routes
- Lazy load charts (recharts)
- Memoize expensive computations
- Virtualize long lists (if needed)

---

## Deployment Strategy

### Deployment Steps

**Preparation:**

1. **Merge to main:**
   ```bash
   git checkout main
   git pull origin main
   git merge feature/ui-ux-overhaul
   ```

2. **Run full test suite:**
   ```bash
   npm run type-check  # Verify no TypeScript errors
   npm test            # All unit tests
   npm run test:e2e    # Playwright E2E
   npm run lint        # Linting
   ```

3. **Build production:**
   ```bash
   npm run build       # Build all packages
   ```

4. **Database migration:**
   - Apply user_preferences migration to production Supabase
   - Verify migration successful

**Deployment (Railway/Vercel/etc.):**

1. **Backend (API):**
   - Deploy apps/api with new preferences module
   - Verify /preferences endpoint responds
   - Check Bull Board dashboard accessible

2. **Frontend (Web):**
   - Deploy apps/web with new UI
   - Verify all pages load
   - Check environment variables set

3. **Smoke Testing:**
   - Navigate to all pages
   - Test one job creation/view flow
   - Verify preferences save/load
   - Check theme switching

### Rollback Plan

**If Critical Issues Found:**

1. **Identify issue:**
   - Check error logs (backend)
   - Check browser console (frontend)
   - Review user reports

2. **Quick fix or rollback:**
   - **Minor issue:** Hotfix and redeploy
   - **Major issue:** Rollback to previous version

3. **Rollback steps:**
   ```bash
   # Revert commit
   git revert <commit-hash>
   git push origin main
   
   # Or reset to previous commit
   git reset --hard <previous-commit>
   git push --force origin main
   ```

4. **Verify rollback:**
   - Old UI loads correctly
   - All functionality works
   - No data loss

5. **Database rollback (if needed):**
   - Preferences table can remain (no harm)
   - Or drop table if causing issues:
     ```sql
     DROP TABLE IF EXISTS user_preferences;
     ```

### Monitoring

**Post-Deployment Monitoring:**

**Application Health:**
- Frontend: Vercel/Railway dashboard
- Backend: API response times, error rates
- Database: Supabase dashboard, query performance

**User Metrics:**
- Page load times (Real User Monitoring)
- Error rates (Sentry or similar)
- Usage patterns (analytics if configured)

**Key Metrics to Watch:**
- **Error rate:** Should be <1%
- **Page load:** <3 seconds
- **API response:** <500ms average
- **User adoption:** Track preference saves (indicates engagement)

**What to Monitor First 24 Hours:**
- Any 500 errors from /preferences endpoint
- Frontend console errors (check Sentry)
- Mobile responsiveness issues (user reports)
- Theme switching bugs
- Sidebar state issues

**Success Indicators:**
- No critical errors
- Users saving preferences (adoption)
- Page load times acceptable
- Positive user feedback

---

**🎉 Technical Specification Complete!**

This tech spec provides comprehensive guidance for implementing the UI/UX overhaul. All implementation details, patterns, and decisions are documented. Ready for story generation.

