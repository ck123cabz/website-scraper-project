# Dashboard - Batch Processing Workspace Wireframe

**Page:** `/dashboard`
**Viewport:** 1920x1080 (Desktop)
**Layout:** Sidebar + Main Content
**Focus:** Job-centric batch processing monitoring

---

## Full Page Layout

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ┌──────────────────────────────────────────────────────────────────────────────────────────────┐  │
│ │  LOGO         🔍 Search jobs...               [+ New Job] [🔔 3] [👤 User ▼]                 │  │
│ │  Scraper Pro                                                                                   │  │
│ └──────────────────────────────────────────────────────────────────────────────────────────────┘  │
│ ┌─────────┬──────────────────────────────────────────────────────────────────────────────────────┐│
│ │         │                                                                                       ││
│ │  🏠 Dash│  Dashboard                                              Last updated: 2 mins ago     ││
│ │         │  ─────────────────────────────────────────────────────────────────────────────────  ││
│ │  📋 Jobs│                                                                                       ││
│ │         │  ┌──────────────┬──────────────┬──────────────┬──────────────┐                     ││
│ │  📊 Analy│  │ 📊 Active    │ ✓ Processed │ 💰 Cost      │ ⏱ Avg Time  │                     ││
│ │         │  │  Jobs        │  Today       │  Today       │  per URL     │                     ││
│ │  📜 Logs│  ├──────────────┼──────────────┼──────────────┼──────────────┤                     ││
│ │         │  │     3        │   1,234      │   $42.18     │    2.3s      │                     ││
│ │  ⚙️ Set │  │  Running     │  URLs        │  -$1.2k      │  per batch   │                     ││
│ │         │  │              │              │  saved       │              │                     ││
│ │  ───────│  └──────────────┴──────────────┴──────────────┴──────────────┘                     ││
│ │         │                                                                                       ││
│ │  👤 User│  ┌─────────────────────────────────────────────────────────────────┐                ││
│ │  Settings│  │ 🔥 Active Jobs                                     [Collapse ▼] │                ││
│ │  Logout │  ├─────────────────────────────────────────────────────────────────┤                ││
│ │         │  │  Job Name              Status        Progress        Actions     │                ││
│ │         │  │  ───────────────────────────────────────────────────────────── │                ││
│ │         │  │  Website Audit         🟢 Running    ████████░░ 78% [View]      │                ││
│ │         │  │  1,200 URLs | $12.45 | Started 2h ago | Est. 30m remaining     │                ││
│ │         │  │                                                                  │                ││
│ │         │  │  Blog Check            🟡 Paused     ████░░░░░░ 45% [View]      │                ││
│ │         │  │  500 URLs | $8.20 | Paused 1h ago | Resume to continue         │                ││
│ │         │  │                                                                  │                ││
│ │         │  │  Guest Posts           🔵 Queued     ░░░░░░░░░░  5% [View]      │                ││
│ │         │  │  2,300 URLs | $0.00 | Created 30m ago | Position: #2 in queue  │                ││
│ │         │  │                                                                  │                ││
│ │         │  │  [View All Jobs →]                                              │                ││
│ │         │  └─────────────────────────────────────────────────────────────────┘                ││
│ │         │                                                                                       ││
│ │         │  ┌─────────────────────────────────────────────────────────────────┐                ││
│ │         │  │ ✅ Recent Completed Jobs                       [View All Jobs →]│                ││
│ │         │  ├─────────────────────────────────────────────────────────────────┤                ││
│ │         │  │  Job Name                Completed       URLs    Cost    Export │                ││
│ │         │  │  ──────────────────────────────────────────────────────────────│                ││
│ │         │  │  Product Analysis        2h ago          856     $8.56  [CSV]  │                ││
│ │         │  │  ✓ Success: 856/856 | Layer1: 234 | Layer2: 98 | Layer3: 15   │                ││
│ │         │  │                                                                  │                ││
│ │         │  │  SEO Audit              4h ago          1,203   $12.03  [CSV]  │                ││
│ │         │  │  ✓ Success: 1,203/1,203 | Layer1: 456 | Layer2: 124 | L3: 22  │                ││
│ │         │  │                                                                  │                ││
│ │         │  │  Link Verification      6h ago          432     $4.32  [CSV]   │                ││
│ │         │  │  ✓ Success: 428/432 | Layer1: 143 | Layer2: 56 | Layer3: 8    │                ││
│ │         │  │                                                                  │                ││
│ │         │  │  Content Scrape         8h ago          2,150   $21.50  [CSV]  │                ││
│ │         │  │  ⚠️ Partial: 2,102/2,150 | Layer1: 789 | Layer2: 201 | L3: 34 │                ││
│ │         │  │                                                                  │                ││
│ │         │  │  Showing 4 most recent                                          │                ││
│ │         │  └─────────────────────────────────────────────────────────────────┘                ││
│ │         │                                                                                       ││
│ │         │  ┌─────────────────────────────────────────────────────────────────┐                ││
│ │         │  │ 📜 Recent Job Activity                    [View Full Log →]     │                ││
│ │         │  ├─────────────────────────────────────────────────────────────────┤                ││
│ │         │  │  🟢 2m ago  |  Job Completed                                    │                ││
│ │         │  │     Product Analysis finished processing 856 URLs               │                ││
│ │         │  │                                                                  │                ││
│ │         │  │  🔵 5m ago  |  Job Started                                      │                ││
│ │         │  │     Website Audit began processing 1,200 URLs                   │                ││
│ │         │  │                                                                  │                ││
│ │         │  │  🟡 12m ago |  Job Paused                                       │                ││
│ │         │  │     Blog Check paused by User at 45% completion                 │                ││
│ │         │  │                                                                  │                ││
│ │         │  │  🟢 25m ago |  Job Completed                                    │                ││
│ │         │  │     SEO Audit finished processing 1,203 URLs                    │                ││
│ │         │  │                                                                  │                ││
│ │         │  │  🔵 35m ago |  Job Created                                      │                ││
│ │         │  │     Guest Posts created with 2,300 URLs                         │                ││
│ │         │  │                                                                  │                ││
│ │         │  └─────────────────────────────────────────────────────────────────┘                ││
│ │         │                                                                                       ││
│ └─────────┴───────────────────────────────────────────────────────────────────────────────────┬─┘│
│ │ ⚡ System: OK  |  Active Jobs: 3  |  Processing Rate: 8.2 URLs/min  |  DB: Healthy           │ │
│ └───────────────────────────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Specifications

### Top Navigation Bar
- **Height:** 64px
- **Components:**
  - Logo (left, 160px width)
  - Job Search Bar (center-left, 400px width, expandable to 600px on focus)
  - New Job Button (right side, primary color)
  - Notifications Badge (icon with count bubble)
  - User Dropdown (avatar + name + caret)
- **Background:** White with bottom border
- **Sticky:** Yes
- **Search Focus:** Searches through job names, URLs, and metadata

### Sidebar Navigation
- **Width:** 240px (collapsed: 64px)
- **Components:**
  - Dashboard (icon + label)
  - Jobs (icon + label)
  - Analytics (icon + label)
  - Logs (icon + label)
  - Settings (icon + label)
  - Divider
  - User section (bottom pinned)
- **Background:** Light gray (muted)
- **Active State:** Highlighted background + bold text
- **Note:** Queue navigation removed (manual review functionality deprecated)

### Quick Stats Grid
- **Layout:** 4-column grid (responsive: 2 cols on tablet, 2 cols on mobile)
- **Card Specs:**
  - Height: 120px
  - Border radius: 8px
  - Padding: 20px
  - Shadow: sm
  - Background: White
- **Content:**
  - Icon (top-left, 24x24px, color-coded)
  - Label (below icon, text-sm, muted)
  - Value (large, text-3xl, bold)
  - Delta (text-xs, green/red with arrow showing trend)
- **Stats Tracked:**
  1. Active Jobs (running jobs count)
  2. Processed Today (total URLs processed)
  3. Cost Today ($ spent with savings indicator)
  4. Avg Time per URL (processing speed)
- **Real-time Updates:** Every 5 seconds via React Query

### Active Jobs Section
- **Collapsible:** Yes (default: expanded)
- **Header:**
  - Title: "🔥 Active Jobs" (text-lg, font-semibold)
  - Collapse button (right-aligned)
- **Table Columns:**
  1. Job Name + metadata (primary info + secondary gray text)
  2. Status (badge with color: Running/Paused/Queued)
  3. Progress (progress bar + percentage)
  4. Actions ([View] button links to job detail page)
- **Row Height:** 80px (with metadata line)
- **Metadata Line Format:**
  - "{URL_count} URLs | ${cost} | {status_message}"
  - Examples:
    - Running: "Started 2h ago | Est. 30m remaining"
    - Paused: "Paused 1h ago | Resume to continue"
    - Queued: "Created 30m ago | Position: #2 in queue"
- **Progress Bar:**
  - Width: 120px
  - Height: 8px
  - Rounded corners
  - Color based on progress (blue for active, yellow for paused, gray for queued)
- **[View] Button:**
  - Link to job detail page
  - Shows full job results, logs, and controls
- **Link:** "View All Jobs →" (text-sm, link color, right-aligned)

### Recent Completed Jobs Section
- **Header:**
  - Title: "✅ Recent Completed Jobs" (text-lg, font-semibold)
  - Link: "View All Jobs →" (right-aligned)
- **Table Columns:**
  1. Job Name (text-sm, bold)
  2. Completed (relative time)
  3. URLs (count processed)
  4. Cost (total $ for job)
  5. Export ([CSV] button for quick download)
- **Row Height:** 80px (with summary line)
- **Summary Line Format:**
  - Success: "✓ Success: {processed}/{total} | Layer1: {n} | Layer2: {n} | Layer3: {n}"
  - Partial: "⚠️ Partial: {processed}/{total} | Layer1: {n} | Layer2: {n} | Layer3: {n}"
  - Shows distribution of results across classification layers
- **[CSV] Button:**
  - Instant download of job results
  - No navigation required
  - Shows loading spinner during download
- **Limit:** Shows 4 most recent completed jobs
- **Hover:** Entire row gets light background

### Recent Job Activity Section
- **Header:**
  - Title: "📜 Recent Job Activity" (text-lg, font-semibold)
  - Link: "View Full Log →" (right-aligned)
- **Layout:** Single column, full width
- **Event List:**
  - Max 5 visible events
  - Event format:
    - Icon + Time (left): "🟢 2m ago | "
    - Event type (bold): "Job Completed"
    - Details (gray, next line, indented): "Product Analysis finished processing 856 URLs"
- **Event Types:**
  - 🟢 Job Completed (green)
  - 🔵 Job Started / Job Created (blue)
  - 🟡 Job Paused (yellow)
  - 🔴 Job Failed (red - if applicable)
- **Vertical Spacing:** 12px between events
- **Background:** Light gray card with border

### Status Bar (Bottom)
- **Height:** 32px
- **Background:** Dark gray (muted-foreground)
- **Text Color:** White
- **Content:**
  - System status (left): "⚡ System: OK"
  - Metrics (center): "Active Jobs: 3 | Processing Rate: 8.2 URLs/min"
  - Services (right): "DB: Healthy"
- **Separator:** Vertical pipe "|" between items
- **Note:** Queue and Redis metrics removed (batch processing focus)

---

## Interactions

### Job Search Bar
1. **Click search bar** → Expands to 600px, shows recent jobs
2. **Type query** → Debounced search (300ms), shows autocomplete results
3. **Enter** → Navigate to search results page with filtered jobs
4. **Cmd+K** → Focus search from anywhere
5. **Search Scope:** Job names, URLs, metadata, status

### New Job Button
1. **Click** → Navigate to `/jobs/new`
2. **Keyboard:** Alt+N shortcut
3. **Opens:** Job creation form with URL upload

### Notifications
1. **Click bell icon** → Dropdown with job status notifications
2. **Badge shows count** → Only if unread > 0
3. **Click notification** → Navigate to relevant job page
4. **Notification Types:** Job completed, job failed, system alerts

### Active Jobs [View] Button
1. **Click [View]** → Navigate to job detail page (`/jobs/{id}`)
2. **Job Detail Page Shows:**
   - Full job configuration
   - Real-time progress
   - URL-level results table
   - Pause/Resume/Cancel controls
   - Live logs
3. **Keyboard:** Tab navigation, Enter to activate

### Completed Jobs [CSV] Button
1. **Click [CSV]** → Instant download of job results
2. **Loading State:** Button shows spinner during download
3. **CSV Contents:**
   - URL, Layer1 Result, Layer2 Result, Layer3 Result
   - Confidence scores, timestamps, metadata
4. **No Navigation:** Quick export without leaving dashboard

### Activity Log Items
1. **Hover** → Show full details in tooltip (if truncated)
2. **Click** → Navigate to related job page
3. **Auto-scroll:** New events prepend to top of list

### Collapsible Sections
1. **Click header** → Expand/collapse with smooth animation (200ms)
2. **State persists** → Saved to localStorage by section key
3. **Keyboard:** Space/Enter to toggle when focused

---

## Responsive Breakpoints

### Tablet (768px - 1023px)
- Quick Stats: 2 columns (2x2 grid)
- Active Jobs: Simplified table (hide metadata line on small screens)
- Completed Jobs: Stack columns, show essential info only
- Activity Log: Remains single column
- Sidebar: Collapsible (hamburger menu)

### Mobile (< 768px)
- Quick Stats: 2 columns (2x2 grid)
- Active Jobs: Cards instead of table
  - Card layout: Job name at top, progress bar, status badge, [View] button
  - Metadata in smaller text below
- Completed Jobs: Cards with vertical layout
  - Job name, completion time, quick stats
  - [CSV] button at bottom of card
- Activity Log: Compact format (icon + time on one line, details below)
- Sidebar: Full-screen overlay with backdrop

---

## Data Flow

### Initial Load
1. Fetch dashboard data: `GET /api/dashboard/summary`
   - Returns: active jobs, completed jobs (recent 4), activity log (recent 5), quick stats
2. Setup React Query subscriptions with staleTime: 5000ms
3. Setup Supabase realtime channels:
   - `jobs` table changes (status, progress updates)
   - `activity_logs` table changes (new events)

### Real-Time Updates
- **Every 5s:** Refetch quick stats (active jobs count, URLs processed, cost, avg time)
- **On Supabase `jobs` event:**
  - Invalidate active jobs query
  - Update job progress bars
  - Move completed jobs to completed section
- **On Supabase `activity_logs` event:**
  - Prepend new event to activity log
  - Maintain max 5 visible items
  - Play subtle notification sound (optional, user setting)
- **Job Progress:** Poll every 2s for active jobs only

### User Actions
- **Click [View] on active job:** Navigate to `/jobs/{id}`, no optimistic update needed
- **Click [CSV] on completed job:**
  - Show loading spinner
  - Call `GET /api/jobs/{id}/export/csv`
  - Trigger browser download
  - Show toast on success/error
- **Collapse section:**
  - Immediate UI update with animation
  - Save state to localStorage: `dashboard_collapsed_{section_key}`
- **Search jobs:** Debounced API call (300ms) to `GET /api/jobs/search?q={query}`

---

## Accessibility

- **Keyboard Navigation:** All interactive elements accessible via Tab
- **ARIA Labels:**
  - All icon-only buttons have descriptive labels
  - Progress bars announce percentage to screen readers
  - Status badges announce status and context
- **Focus Indicators:** Clear 2px blue outline on focus (WCAG 2.1 compliant)
- **Screen Reader:**
  - Announce real-time job status updates
  - Live regions for activity log updates
  - Descriptive table headers and row context
- **Color Contrast:** WCAG AA compliant (4.5:1 minimum)
- **Reduced Motion:** Respect `prefers-reduced-motion` for animations

---

## Loading States

### Initial Page Load
- Show skeleton loaders for:
  - Quick stats cards (4 cards with pulsing animation)
  - Active jobs section (3 table row skeletons)
  - Completed jobs section (4 table row skeletons)
  - Activity log (5 event item skeletons)
- Fade-in transition when data loads (200ms)

### Real-Time Updates
- Smooth transitions (200ms ease-in-out)
- Toast notifications for:
  - Job completed (success toast)
  - Job failed (error toast)
  - System alerts (warning toast)
- Subtle highlight animation on new activity log items (yellow fade)
- Progress bar updates with smooth CSS transition

### CSV Download
- [CSV] button shows:
  - Loading spinner (replaces text)
  - Disabled state during download
  - Success checkmark (brief, 1s)
  - Back to [CSV] after completion

---

## Empty States

### No Active Jobs
```
┌─────────────────────────────────────────┐
│  🔥 Active Jobs              [Collapse] │
├─────────────────────────────────────────┤
│                                          │
│          📋 No active jobs               │
│                                          │
│     All jobs are completed or paused    │
│                                          │
│          [+ Create New Job]              │
│                                          │
└─────────────────────────────────────────┘
```

### No Completed Jobs
```
┌─────────────────────────────────────────┐
│  ✅ Recent Completed Jobs   [View All]  │
├─────────────────────────────────────────┤
│                                          │
│          📊 No completed jobs yet        │
│                                          │
│     Start a job to see results here     │
│                                          │
└─────────────────────────────────────────┘
```

### No Activity
```
┌─────────────────────────────────────────┐
│  📜 Recent Job Activity  [View Full Log]│
├─────────────────────────────────────────┤
│                                          │
│          🔇 No recent activity           │
│                                          │
│     Job events will appear here         │
│                                          │
└─────────────────────────────────────────┘
```

---

## Performance Targets

- **Initial Load:** < 1 second (including API data fetch)
- **Real-time Update Latency:** < 500ms (from event to UI update)
- **Progress Bar Animation:** 60fps smooth transitions
- **Action Response:**
  - Navigation: < 100ms
  - CSV download initiation: < 200ms
  - Collapse/expand animation: 200ms total
- **Search Autocomplete:** < 300ms (with debounce)

---

## Notes for Implementation

1. **Component Library:** Use shadcn/ui components (Card, Badge, Button, Progress, Skeleton)
2. **Real-time:** React Query (v5) + Supabase subscriptions
3. **State Management:**
   - React Query for server state
   - useState/useReducer for local UI state
   - localStorage for persistence (collapsed sections)
4. **Animations:**
   - CSS transitions for simple animations (progress bars, hover states)
   - Framer Motion for complex animations (collapsible sections, page transitions)
5. **Icons:** Lucide React (consistent icon set)
6. **Time Formatting:** Use `date-fns` for relative times ("2m ago", "2h ago", "4h ago")
7. **CSV Export:** Use browser download API (no external library needed)
8. **Responsive:** Use Tailwind CSS breakpoints (md: 768px, lg: 1024px)
9. **Testing:**
   - Unit tests for business logic
   - Integration tests for data flow
   - E2E tests for critical paths (create job → view results → download CSV)
