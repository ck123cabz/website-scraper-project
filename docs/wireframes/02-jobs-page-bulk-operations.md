# Jobs Page - Bulk Operations Wireframe

**Page:** `/jobs`
**Viewport:** 1920x1080 (Desktop)
**Layout:** Sidebar + Main Content

---

## Full Page Layout

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ┌──────────────────────────────────────────────────────────────────────────────────────────────┐  │
│ │  LOGO         🔍 Search anything...          [+ New Job] [🔔 3] [👤 User ▼]                  │  │
│ └──────────────────────────────────────────────────────────────────────────────────────────────┘  │
│ ┌─────────┬──────────────────────────────────────────────────────────────────────────────────────┐│
│ │  🏠 Dash│  Jobs                                                          [+ New Job]           ││
│ │         │  ─────────────────────────────────────────────────────────────────────────────────  ││
│ │  📋 Jobs│                                                                                       ││
│ │         │  ┌─────────────────────────────────────────────────────────────────────────────┐   ││
│ │  ✋ Queue│  │ 🔍 Search jobs by name or URL...                                            │   ││
│ │    [24] │  │                                                                              │   ││
│ │         │  │ [Status ▼] [Date Range ▼] [URLs Range ▼] [Cost Range ▼]  [Reset Filters] │   ││
│ │  📊 Analy│  └─────────────────────────────────────────────────────────────────────────────┘   ││
│ │         │                                                                                       ││
│ │  📜 Logs│  ┌─────────────────────────────────────────────────────────────────────────────┐   ││
│ │         │  │ 3 jobs selected                                                              │   ││
│ │  ⚙️ Set │  │                                                                              │   ││
│ │         │  │ [⏸ Pause] [▶ Resume] [❌ Cancel] [📥 Export] [🗑️ Delete]                  │   ││
│ │         │  └─────────────────────────────────────────────────────────────────────────────┘   ││
│ │         │                                                                                       ││
│ │         │  ☑ Select All (127 jobs)                                      Showing 1-10 of 127   ││
│ │         │  ┌──┬──────────────────┬──────────┬────────┬──────────┬──────────┬─────────┬──────┐││
│ │         │  │☐ │ Job Name         │ Status   │  URLs  │ Progress │   Cost   │ Created │  ··· │││
│ │         │  ├──┼──────────────────┼──────────┼────────┼──────────┼──────────┼─────────┼──────┤││
│ │         │  │☑ │ Website Audit    │🟢 Running│  1,200 │ ████░░░░ │  $12.45  │ Nov 10  │  ⋮   │││
│ │         │  │  │ job_abc123       │          │        │    78%   │  -$145   │ 2h ago  │      │││
│ │         │  ├──┼──────────────────┼──────────┼────────┼──────────┼──────────┼─────────┼──────┤││
│ │         │  │☑ │ Blog Check       │🟡 Paused │    500 │ ████░░░░ │   $8.20  │ Nov 09  │  ⋮   │││
│ │         │  │  │ job_def456       │          │        │    45%   │  -$82    │ 1d ago  │      │││
│ │         │  ├──┼──────────────────┼──────────┼────────┼──────────┼──────────┼─────────┼──────┤││
│ │         │  │☑ │ Guest Posts      │🔵 Queued │  2,300 │ ░░░░░░░░ │   $0.00  │ Nov 09  │  ⋮   │││
│ │         │  │  │ job_ghi789       │          │        │     5%   │   $0     │ 30m ago │      │││
│ │         │  ├──┼──────────────────┼──────────┼────────┼──────────┼──────────┼─────────┼──────┤││
│ │         │  │☐ │ SEO Analysis     │✓Complete │    800 │ ████████ │  $15.30  │ Nov 08  │  ⋮   │││
│ │         │  │  │ job_jkl012       │          │        │   100%   │  -$118   │ 1d ago  │      │││
│ │         │  ├──┼──────────────────┼──────────┼────────┼──────────┼──────────┼─────────┼──────┤││
│ │         │  │☐ │ Domain Check     │✓Complete │    350 │ ████████ │   $6.80  │ Nov 08  │  ⋮   │││
│ │         │  │  │ job_mno345       │          │        │   100%   │  -$42    │ 2d ago  │      │││
│ │         │  ├──┼──────────────────┼──────────┼────────┼──────────┼──────────┼─────────┼──────┤││
│ │         │  │☐ │ Link Validation  │❌Cancelled│    150 │ ██░░░░░░ │   $2.10  │ Nov 07  │  ⋮   │││
│ │         │  │  │ job_pqr678       │          │        │    32%   │  -$18    │ 3d ago  │      │││
│ │         │  ├──┼──────────────────┼──────────┼────────┼──────────┼──────────┼─────────┼──────┤││
│ │         │  │☐ │ Content Scrape   │✓Complete │  4,500 │ ████████ │  $42.50  │ Nov 06  │  ⋮   │││
│ │         │  │  │ job_stu901       │          │        │   100%   │  -$512   │ 4d ago  │      │││
│ │         │  ├──┼──────────────────┼──────────┼────────┼──────────┼──────────┼─────────┼──────┤││
│ │         │  │☐ │ Publication Test │🔴 Failed │    200 │ ███░░░░░ │   $3.20  │ Nov 05  │  ⋮   │││
│ │         │  │  │ job_vwx234       │          │        │    42%   │  -$24    │ 5d ago  │      │││
│ │         │  ├──┼──────────────────┼──────────┼────────┼──────────┼──────────┼─────────┼──────┤││
│ │         │  │☐ │ News Sites       │✓Complete │  1,100 │ ████████ │  $18.75  │ Nov 04  │  ⋮   │││
│ │         │  │  │ job_yza567       │          │        │   100%   │  -$165   │ 6d ago  │      │││
│ │         │  ├──┼──────────────────┼──────────┼────────┼──────────┼──────────┼─────────┼──────┤││
│ │         │  │☐ │ Blog Discovery   │✓Complete │    650 │ ████████ │  $11.20  │ Nov 03  │  ⋮   │││
│ │         │  │  │ job_bcd890       │          │        │   100%   │  -$95    │ 7d ago  │      │││
│ │         │  └──┴──────────────────┴──────────┴────────┴──────────┴──────────┴─────────┴──────┘││
│ │         │                                                                                       ││
│ │         │  [← Previous] [1] [2] [3] [4] [5] ... [13] [Next →]                                ││
│ └─────────┴───────────────────────────────────────────────────────────────────────────────────┬─┘│
│ │ ⚡ System: OK  |  Total Jobs: 127  |  Active: 3  |  Completed: 98  |  Failed: 2              │ │
│ └───────────────────────────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Specifications

### Search & Filter Bar
- **Search Input:**
  - Width: 100% (max 800px)
  - Placeholder: "🔍 Search jobs by name or URL..."
  - Debounced: 300ms
  - Clear button (X) when text present
- **Filter Dropdowns:**
  - Status (All, Running, Paused, Queued, Complete, Cancelled, Failed)
  - Date Range (Today, Last 7 days, Last 30 days, Custom)
  - URLs Range (0-100, 100-500, 500-1000, 1000+)
  - Cost Range ($0-$10, $10-$50, $50+)
- **Reset Button:**
  - Ghost variant
  - Only visible when filters applied
  - Clears all filters and search

### Bulk Actions Toolbar
- **Visibility:** Only shown when ≥1 job selected
- **Background:** Light blue (accent/10)
- **Border:** 1px solid accent
- **Height:** 60px
- **Content:**
  - Selection count: "3 jobs selected" (left)
  - Action buttons (right):
    - ⏸ Pause (disabled if all paused/complete)
    - ▶ Resume (disabled if all running/complete)
    - ❌ Cancel (disabled if complete)
    - 📥 Export (always enabled)
    - 🗑️ Delete (requires confirmation)
- **Button Specs:**
  - Secondary variant
  - Icon + label
  - Tooltips on hover
  - Disabled state: opacity 50%

### Jobs Table
- **Columns:**
  1. **Checkbox** (40px)
     - Select individual jobs
     - Checkboxes in header for select all
  2. **Job Name** (300px, left-aligned)
     - Primary: Job name (text-sm, font-medium, truncated)
     - Secondary: Job ID (text-xs, muted, font-mono)
  3. **Status** (120px, center-aligned)
     - Badge with emoji + text
     - Colors:
       - Running: Green
       - Paused: Yellow
       - Queued: Blue
       - Complete: Green (checkmark)
       - Cancelled: Gray
       - Failed: Red
  4. **URLs** (100px, right-aligned)
     - Number formatted with commas
     - Text-sm, monospace
  5. **Progress** (150px, center-aligned)
     - Progress bar (100px width, 8px height)
     - Percentage below (text-xs, muted)
     - Color based on status
  6. **Cost** (120px, right-aligned)
     - Primary: Actual cost (text-sm, bold)
     - Secondary: Savings with delta (text-xs, green, -$145)
  7. **Created** (100px, right-aligned)
     - Date (text-sm)
     - Relative time below (text-xs, muted)
  8. **Actions** (60px, center-aligned)
     - Three-dot menu (⋮)
     - Dropdown: View, Pause/Resume, Cancel, Export, Delete

- **Row Height:** 72px (dual-line content)
- **Hover State:** Light background
- **Selected State:** Light blue background
- **Dividers:** 1px border between rows

### Select All Functionality
- **Checkbox in header:**
  - Unchecked: No jobs selected
  - Checked: All visible jobs selected
  - Indeterminate: Some jobs selected
- **Text indicator:** "Select All (127 jobs)" (link style)
  - Click to select ALL jobs (across all pages)
  - Shows count of total jobs
  - When clicked, shows: "All 127 jobs selected" with "[Clear Selection]" link

### Pagination
- **Position:** Bottom center
- **Components:**
  - [← Previous] button (disabled on page 1)
  - Page numbers (current page highlighted)
  - Ellipsis (...) for skipped pages
  - [Next →] button (disabled on last page)
- **Items per page:** 10 (configurable: 10/25/50/100)
- **Total count:** "Showing 1-10 of 127" (top right)

### Row Actions Menu (⋮)
```
┌──────────────────┐
│ 👁️ View Details  │
├──────────────────┤
│ ⏸️ Pause Job     │
│ ▶️ Resume Job    │
│ ❌ Cancel Job    │
├──────────────────┤
│ 📥 Export Results│
│ 📋 Copy Job ID   │
├──────────────────┤
│ 🗑️ Delete Job    │
└──────────────────┘
```

---

## Interactions

### Search
1. **Type in search** → Debounce 300ms → Fetch filtered results
2. **Clear search** → Reset to all jobs
3. **Search scope:** Job name OR job ID OR any URL in job

### Filters
1. **Click dropdown** → Show options
2. **Select option** → Immediately filter table
3. **Multiple filters** → Combined with AND logic
4. **Active filters** → Show count badge on dropdown
5. **Reset** → Clear all filters and search

### Bulk Selection
1. **Click checkbox** → Toggle selection
2. **Click header checkbox** → Select all visible (10 jobs)
3. **Click "Select All (127 jobs)"** → Select all jobs across pages
4. **Bulk action buttons** → Show when ≥1 selected
5. **Perform action** → Confirmation dialog → API call → Optimistic update

### Bulk Actions Confirmation
```
┌────────────────────────────────────────┐
│  Confirm Bulk Action                   │
├────────────────────────────────────────┤
│                                         │
│  Are you sure you want to PAUSE        │
│  3 jobs?                                │
│                                         │
│  • Website Audit                        │
│  • Blog Check                           │
│  • Guest Posts                          │
│                                         │
│  This action can be reversed.          │
│                                         │
│  [Cancel]            [Confirm Pause]   │
└────────────────────────────────────────┘
```

### Row Actions
1. **Click ⋮ icon** → Open dropdown menu
2. **View Details** → Navigate to `/jobs/[id]`
3. **Pause/Resume** → Confirmation → API call → Update row
4. **Cancel** → Confirmation dialog → API call → Update status
5. **Export** → Download CSV/JSON
6. **Copy Job ID** → Copy to clipboard → Toast notification
7. **Delete** → Destructive confirmation → API call → Remove row

### Sorting
1. **Click column header** → Sort ascending
2. **Click again** → Sort descending
3. **Click third time** → Remove sort (default: created_at desc)
4. **Sort indicator:** ↑ or ↓ arrow next to column name
5. **Sortable columns:** Job Name, Status, URLs, Progress, Cost, Created

---

## Responsive Breakpoints

### Tablet (768px - 1023px)
- Hide Cost column
- Hide secondary text (Job ID, relative time)
- Reduce column widths
- Bulk actions: Stack buttons vertically in dropdown

### Mobile (< 768px)
- **Card View** instead of table
- Each job as a card:
```
┌─────────────────────────────────────┐
│ ☐  Website Audit        🟢 Running  │
│    job_abc123                       │
│                                     │
│    1,200 URLs  |  78%  |  $12.45   │
│    ████████░░  Progress             │
│                                     │
│    Created Nov 10, 2h ago           │
│                                     │
│    [View] [Pause] [Cancel] [⋮]     │
└─────────────────────────────────────┘
```
- Bulk actions: Fixed bottom toolbar
- Filters: Accordion style

---

## Data Flow

### Initial Load
1. Fetch jobs: `GET /api/jobs?page=1&limit=10`
2. Response includes:
   - jobs[] array
   - total count
   - pagination metadata

### Filtering
1. Update URL params: `?status=running&date=last7days`
2. Fetch: `GET /api/jobs?status=running&date=last7days&page=1`
3. Update table with new results
4. Update pagination

### Bulk Actions
1. Collect selected job IDs: `[id1, id2, id3]`
2. Show confirmation dialog
3. On confirm:
   - Optimistic update: Set status in UI immediately
   - API call: `POST /api/jobs/bulk-action`
     ```json
     {
       "action": "pause",
       "job_ids": ["id1", "id2", "id3"]
     }
     ```
   - On success: Invalidate queries, toast success
   - On error: Rollback optimistic update, toast error

### Real-Time Updates
- Supabase subscription on `jobs` table
- On UPDATE event: Invalidate affected job query
- Progress bars update in real-time
- Status badges update on status change

---

## Loading States

### Initial Load
```
┌──┬────────────────┬──────────┬───────┬──────────┬──────────┬─────────┐
│☐ │ ░░░░░░░░░░░░░ │ ░░░░░░  │░░░░░ │ ░░░░░░  │ ░░░░░░  │ ░░░░░  │
│  │ ░░░░░░░░      │          │       │          │          │         │
├──┼────────────────┼──────────┼───────┼──────────┼──────────┼─────────┤
│☐ │ ░░░░░░░░░░░░░ │ ░░░░░░  │░░░░░ │ ░░░░░░  │ ░░░░░░  │ ░░░░░  │
│  │ ░░░░░░░░      │          │       │          │          │         │
└──┴────────────────┴──────────┴───────┴──────────┴──────────┴─────────┘
```

### Bulk Action Processing
- Show loading spinner in bulk actions toolbar
- Disable all action buttons
- Show progress: "Pausing 3 jobs... (1/3 complete)"

---

## Empty States

### No Jobs Created
```
┌─────────────────────────────────────────┐
│                                          │
│             📋 No jobs yet               │
│                                          │
│   Get started by creating your first    │
│   URL classification job                │
│                                          │
│         [+ Create Your First Job]       │
│                                          │
└─────────────────────────────────────────┘
```

### No Search Results
```
┌─────────────────────────────────────────┐
│                                          │
│           🔍 No jobs found               │
│                                          │
│   No jobs match "website audit"         │
│                                          │
│   Try adjusting your search or filters  │
│                                          │
│         [Clear Search & Filters]        │
│                                          │
└─────────────────────────────────────────┘
```

---

## Error States

### Bulk Action Failed
```
┌────────────────────────────────────────┐
│  ⚠️ Bulk Action Failed                 │
├────────────────────────────────────────┤
│                                         │
│  Failed to pause 3 jobs:                │
│                                         │
│  ✓ Website Audit - Success              │
│  ✗ Blog Check - Already paused         │
│  ✗ Guest Posts - Job not found         │
│                                         │
│  1 of 3 actions succeeded               │
│                                         │
│  [View Error Details]     [Close]      │
└────────────────────────────────────────┘
```

---

## Keyboard Shortcuts

- **Cmd/Ctrl + N:** Create new job
- **Cmd/Ctrl + F:** Focus search
- **Cmd/Ctrl + A:** Select all (when focused on table)
- **Space:** Toggle checkbox on focused row
- **Enter:** Open job details for focused row
- **Arrow Keys:** Navigate between rows
- **Escape:** Clear selection / Close dropdowns

---

## Performance Optimizations

1. **Virtualization:** Use `@tanstack/react-virtual` for 100+ jobs
2. **Pagination:** Server-side, max 100 items per page
3. **Debounced Search:** 300ms delay
4. **Optimistic Updates:** Immediate UI feedback for actions
5. **Query Caching:** Cache job list for 30 seconds
6. **Lazy Loading:** Load row action menus on demand

---

## Accessibility

- **ARIA Labels:** All checkboxes, buttons, and actions
- **Keyboard Navigation:** Full keyboard support
- **Focus Management:** Trap focus in modals
- **Screen Reader:** Announce selection count, actions, errors
- **Color Contrast:** Status badges meet WCAG AA
- **Focus Indicators:** Clear blue outline (2px)

---

## Notes for Implementation

1. **Component Library:** TanStack Table for advanced table features
2. **State Management:**
   - Selected IDs: `useState<string[]>`
   - Filters: URL params via `useSearchParams`
   - Bulk action state: `useMutation`
3. **Real-time:** Supabase subscription for job updates
4. **Optimistic Updates:** React Query `onMutate` callback
5. **Confirmation Dialogs:** shadcn AlertDialog component
6. **Toast Notifications:** Sonner library
7. **Export:** Generate CSV/JSON client-side using `json2csv`
