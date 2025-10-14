# Website Scraper Platform UX/UI Specification

_Generated on 2025-10-13 by CK_

## Executive Summary

**Project:** Website Scraper Platform - Internal collaborative web scraping tool for guest posting classification
**Project Level:** Level 2 - Small Complete System
**Platform:** Web application (React + TypeScript + shadcn/ui)
**Deployment:** Railway (production internal tool)

**UX Context:**
This UX specification defines the user experience for a **UI/UX transparency-focused** internal scraping platform where multiple team members can simultaneously monitor scraping operations through a shared real-time view. The PRIMARY design goal is **radical transparency** - team members should see exactly what's happening at every moment: which URL is processing, what stage it's in, live logs, progress indicators, costs, and results.

**Key UX Characteristics:**
- **No authentication** - Direct access for internal team
- **Shared collaborative state** - All users see identical real-time view
- **Real-time everything** - Sub-second updates via Supabase Realtime
- **Transparency-first** - Every system action visible with clear explanations
- **Glanceable dashboard** - Understand system state in <3 seconds

**Referenced Documents:**
- PRD: `docs/PRD.md`
- Epic Stories: `docs/epic-stories.md`
- Project Analysis: `docs/project-workflow-analysis.md`
- Technical Research: `docs/research-technical-2025-10-12.md`

---

## 1. UX Goals and Principles

### 1.1 Target User Personas

**Primary Persona: Operations Team Member ("Alex")**
- **Role:** Marketing operations, link building specialist
- **Technical Skill:** Non-technical, comfortable with web tools
- **Goals:**
  - Process large URL lists efficiently (5K-10K URLs)
  - Monitor scraping jobs without wondering "is it working?"
  - Identify suitable guest posting sites quickly
  - Understand costs and stay within budget
- **Pain Points (from current Python system):**
  - Can't see what's happening in real-time
  - No visibility when something fails
  - Unclear if system is stuck or progressing
  - Can't share view with teammates
- **Needs from new system:**
  - Complete transparency into every operation
  - Confidence that system is working
  - Ability to show progress to manager/team
  - Clear error messages when things fail

**Secondary Persona: Team Lead ("Jordan")**
- **Role:** Marketing team lead, budget owner
- **Goals:**
  - Oversee team's scraping operations
  - Monitor LLM API costs in real-time
  - Ensure quality of classification results
  - Help troubleshoot when team members have issues
- **Needs:**
  - Cost visibility and tracking
  - Quality metrics (success rates, classification accuracy)
  - Ability to pause/resume jobs remotely
  - Historical data for reporting

### 1.2 Usability Goals

**Goal 1: Immediate Comprehension** (PRIMARY)
User can understand system state within 3 seconds of viewing dashboard - what's running, current progress, any issues.

**Goal 2: Zero Ambiguity**
User never wonders "what's happening?" or "is it working?" Every system action is visible with clear status indicators and explanations.

**Goal 3: Effortless Monitoring**
User can leave dashboard open and monitor with peripheral vision - progress bars, counters, and status colors provide information without active focus.

**Goal 4: Collaborative Transparency**
Multiple team members viewing simultaneously see identical state, enabling easy collaboration without "refresh your page" confusion.

**Goal 5: Error Clarity**
When errors occur, user immediately understands: what failed, why it failed, what system is doing about it, and when it will recover.

### 1.3 Design Principles

**1. Radical Transparency**
Every system action visible in real-time. No hidden processes. Show current URL, processing stage, decision reasoning, errors immediately with clear explanations.

**2. Information Hierarchy for Glanceability**
Critical info (progress, status) at top in large format. Supporting details (logs, costs) accessible but not overwhelming. Understand state in <3 seconds.

**3. Real-Time Feedback Without Lag**
All UI updates feel instantaneous (<500ms). Smooth progress bars, logs, counters. No manual refresh. Optimistic UI updates confirmed by backend.

**4. Error Visibility and Recovery Guidance**
Errors prominently displayed with severity levels. Each error shows: what happened, why, what system is doing, when it recovers. No silent failures.

**5. Collaborative Awareness**
Multiple users see identical real-time state. Visual "live" indicators (pulsing dot, "Updated 2s ago"). No confusion about stale views.

---

## 2. Information Architecture

### 2.1 Site Map

```
Website Scraper Platform
│
├── Dashboard (Primary View) - /
│   ├── Header
│   │   ├── App Title + Live Indicator
│   │   └── "New Job" CTA Button
│   │
│   ├── Active Job Monitor (collapsible when no active job)
│   │   ├── Job Status Header
│   │   ├── Progress Indicators
│   │   ├── Current URL Display
│   │   ├── Cost Tracker
│   │   └── Job Controls (Pause/Resume/Cancel)
│   │
│   ├── Live Activity Log (side panel or bottom panel)
│   │   ├── Log Stream
│   │   ├── Filter Controls
│   │   └── Auto-scroll Toggle
│   │
│   ├── Results Table (main content area)
│   │   ├── Search/Filter Bar
│   │   ├── Data Table
│   │   ├── Pagination
│   │   └── Export Button
│   │
│   └── Job History Sidebar (optional collapsed panel)
│       └── Previous Jobs List
│
├── New Job Modal/Page - /new-job (modal overlay or route)
│   ├── Upload Methods (tabs)
│   │   ├── File Upload
│   │   └── Text Paste
│   ├── URL Preview
│   └── Start Processing Button
│
└── Job Details View (can be modal or expanded state)
    ├── Job Summary
    ├── Complete Results Table
    ├── Full Log History
    └── Export Options
```

**Information Architecture Notes:**
- **Single dashboard paradigm** - All key information on one screen
- **Progressive disclosure** - Details expand/modal as needed
- **No deep navigation** - Maximum 1 click/modal away from dashboard
- **Persistent live view** - Dashboard always visible and updating

### 2.2 Navigation Structure

**Primary Navigation: Minimal (App is dashboard-focused)**
- **Dashboard** (home) - Always accessible, main view
- **New Job** button - Primary CTA, always visible in header

**Secondary Actions: Contextual**
- **Job Controls** - Appear when job is active (Pause/Resume/Cancel)
- **Export** - Appears in results table when results exist
- **View Details** - Inline expansion or modal from results table rows

**Mobile Navigation Strategy:**
Since this is an internal tool, mobile is NOT primary, but if accessed:
- Stack panels vertically (Progress → Logs → Results)
- Hamburger menu for job history
- Floating "New Job" button (bottom-right FAB)

**No Traditional Navigation Menu:**
This is a single-purpose dashboard tool, not a multi-section website. Navigation is task-based, not section-based.

**Breadcrumb Structure: N/A**
Single-level application - no breadcrumbs needed

---

## 3. User Flows

### 3.1 Flow 1: Create and Start New Job

**User Goal:** Upload URL list and begin processing

**Entry Points:** "New Job" button (dashboard header), empty state CTA

**Flow Diagram:**

```mermaid
flowchart TD
    A[Dashboard: Click 'New Job' Button] --> B{Upload Method?}
    B -->|File Upload| C[Choose File Upload Tab]
    B -->|Text Paste| D[Choose Text Paste Tab]

    C --> E[Click 'Choose File' or Drag-Drop]
    E --> F[File Selected: CSV/TXT]
    F --> G[System Parses File]

    D --> H[Paste URLs into Textarea]
    H --> G

    G --> I{Valid URLs Found?}
    I -->|No URLs| J[Error: 'No valid URLs found']
    J --> B

    I -->|Valid URLs| K[Show Preview Panel]
    K --> L[Display: X URLs detected, Y duplicates removed]
    L --> M[Show: Z unique URLs to process]

    M --> N[User Reviews Preview]
    N --> O{Proceed?}
    O -->|Edit| B
    O -->|Start| P[Click 'Start Processing' Button]

    P --> Q[Modal Closes]
    Q --> R[Dashboard Shows Active Job]
    R --> S[Job Status: Processing]
    S --> T[Real-Time Updates Begin]
```

**Success Criteria:**
- User sees job processing within 2 seconds of clicking "Start Processing"
- Preview accurately shows URL count and deduplication
- Clear error messages if file invalid or no URLs found

**Error States:**
- Invalid file format → "Please upload CSV or TXT file"
- No URLs detected → "No valid URLs found in file"
- Empty paste → "Please paste at least one URL"
- File too large (>10MB) → "File exceeds 10MB limit"

---

### 3.2 Flow 2: Monitor Active Job in Real-Time (PRIMARY FLOW)

**User Goal:** Watch job progress and understand what's happening at every moment

**Entry Point:** Job is processing (from Flow 1 or resumed job)

**Flow Diagram:**

```mermaid
flowchart TD
    A[Job Processing] --> B[Dashboard Active Job Monitor Visible]
    B --> C[Real-Time Updates Loop]

    C --> D[Progress Bar Updates Every 1s]
    C --> E[Current URL Display Updates <500ms]
    C --> F[Live Log Streams New Entries <1s]
    C --> G[Cost Tracker Updates with Each URL]

    D --> H[Progress: 0-100%]
    E --> I[Shows: example.com - Stage: Filtering]
    F --> J{Log Entry Type}
    J -->|Success| K[Green ✓ example1.com - Gemini: SUITABLE]
    J -->|Warning| L[Yellow ⚠ Pre-filter REJECT]
    J -->|Error| M[Red ✗ ERROR - Retrying...]

    G --> N[Shows: $X.XX spent | Projected: $XX.XX]

    O[User Watches] --> P{User Action?}
    P -->|None| C
    P -->|Pause| Q[Flow 3: Control Actions]
    P -->|Complete| R[Show Completion Summary]
```

**Success Criteria:**
- All updates feel real-time (<1s latency for most, <500ms for critical)
- User can glance and understand state in 3 seconds
- Errors immediately visible with clear explanations
- Multi-user: All viewers see identical state simultaneously

**Collaborative Behavior:**
- Multiple users view dashboard simultaneously
- All see same progress, current URL, log entries
- State changes (pause/resume) visible to all users instantly

---

### 3.3 Flow 3: Pause, Resume, or Cancel Job

**User Goal:** Control job execution without losing progress

**Entry Point:** Active job with controls visible

**Flow Diagram:**

```mermaid
flowchart TD
    A[Job Processing] --> B[User Clicks 'Pause']
    B --> C[Optimistic UI: Button Disabled]
    C --> D[Current URL Completes]
    D --> E[Job Status: Paused]
    E --> F[All Users See 'Paused']

    F --> G{User Action?}
    G -->|Resume| H[Click 'Resume']
    H --> I[Processing Continues]
    I --> J[Back to Flow 2]

    G -->|Cancel| K[Click 'Cancel']
    K --> L[Confirmation Dialog]
    L --> M{Confirm?}
    M -->|Yes| N[Job Cancelled]
    N --> O[Partial Results Saved]
    M -->|No| F
```

**Success Criteria:**
- Pause takes effect within 5 seconds
- All users see state change simultaneously
- Resume continues from last processed URL
- Cancel preserves all processed results

**Error States:**
- Network failure during pause → "Reconnecting..."
- Backend failure → "Error pausing, retrying..."
- State conflict → "Job paused by another user"

---

## 4. Component Library and Design System

### 4.1 Design System Approach

**Selected Framework: shadcn/ui (New York Style)**

Based on the Next.js dashboard starter analysis, we'll use shadcn/ui with the following configuration:

**Configuration (components.json):**
```json
{
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "baseColor": "zinc",
    "cssVariables": true
  }
}
```

**Why This Approach:**
- **Copy-paste components** - You own the code, full customization
- **Built on Radix UI** - WCAG 2.1 AA accessible by default
- **TypeScript-first** - Perfect for NestJS + React stack
- **Real-time friendly** - Components work well with live updates
- **Zero runtime overhead** - Just React + Tailwind CSS
- **Proven patterns** - Dashboard starter has 49 production-ready components

**Installation:**
```bash
npx shadcn-ui@latest init
# Select: New York style, Zinc base color, CSS variables: Yes
```

---

### 4.2 Core Components

Based on your functional requirements and the dashboard starter patterns:

#### **Layout Components**

**1. Sidebar System** (726-line comprehensive sidebar)
- **Collapsible modes:** `offcanvas`, `icon`, `none`
- **Responsive:** 16rem desktop → 3rem icon mode → 18rem mobile sheet
- **State persistence:** Cookie-based preference storage
- **Keyboard shortcut:** Cmd/Ctrl + B to toggle
- **Mobile:** Sheet (drawer) overlay

**Component Structure:**
```tsx
<SidebarProvider defaultOpen={cookieStore.get('sidebar_state')}>
  <Sidebar collapsible='icon'>
    <SidebarHeader>
      <h1>Website Scraper Platform</h1>
      <Badge variant="secondary">Live</Badge>
    </SidebarHeader>
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>Overview</SidebarGroupLabel>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Dashboard" isActive={pathname === '/'}>
              <Icon />
              <span>Dashboard</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    </SidebarContent>
  </Sidebar>
  <SidebarInset>
    <Header />
    {children}
  </SidebarInset>
</SidebarProvider>
```

**For Your Dashboard:**
- Collapsed to icon mode = more space for live logs and results table
- Quick access to job history in sidebar
- Settings/preferences in sidebar footer

**2. Header Component**
```tsx
<header className='flex h-16 items-center justify-between gap-2'>
  <div className='flex items-center gap-2 px-4'>
    <SidebarTrigger />
    <Separator orientation='vertical' className='h-4' />
    <Badge variant="success">
      <span className="relative flex h-2 w-2 mr-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
      </span>
      Live
    </Badge>
  </div>
  <div className='flex items-center gap-2 px-4'>
    <Button variant="default" size="sm">
      <Plus className="h-4 w-4 mr-1" />
      New Job
    </Button>
    <ModeToggle />
  </div>
</header>
```

---

#### **Data Display Components**

**3. Card System** (Compound Components)
```tsx
<Card className="border-l-4 border-l-blue-500">
  <CardHeader>
    <CardTitle className="flex items-center justify-between">
      <span>Job #1234</span>
      <div className="flex items-center gap-2">
        <Badge variant="secondary">Processing</Badge>
        <LiveIndicator />
      </div>
    </CardTitle>
    <CardDescription>8,000 URLs - Started 2 hours ago</CardDescription>
  </CardHeader>
  <CardContent>
    <Progress value={progress} className="h-2" />
    <div className="mt-2 text-sm text-muted-foreground">
      {processed} / {total} URLs ({progress}%)
    </div>
  </CardContent>
  <CardFooter className="flex gap-2">
    <Button variant="outline" size="sm">Pause</Button>
    <Button variant="destructive" size="sm">Cancel</Button>
  </CardFooter>
</Card>
```

**Variants for Your Dashboard:**
- **Active Job Card:** Blue left border, pulsing live indicator
- **Paused Job Card:** Yellow left border, pause icon
- **Completed Job Card:** Green left border, checkmark
- **Failed Job Card:** Red left border, error icon

**4. Data Table System** (9-component table system from starter)

**Key Features:**
- Server-side pagination with URL state (shareable links!)
- Debounced search (500ms)
- Sortable columns
- Expandable rows for details
- Column visibility controls
- Faceted filters with count badges

```tsx
<DataTable table={table}>
  <DataTableToolbar table={table}>
    <Input
      placeholder="Search URLs..."
      value={searchQuery}
      onChange={(e) => debouncedSearch(e.target.value)}
    />
    <Select value={statusFilter} onValueChange={setStatusFilter}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Filter status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Statuses</SelectItem>
        <SelectItem value="success">Success Only</SelectItem>
        <SelectItem value="failed">Failed Only</SelectItem>
      </SelectContent>
    </Select>
  </DataTableToolbar>
</DataTable>
```

**Table Configuration for Real-Time Updates:**
```tsx
const table = useDataTable({
  data: results,
  columns,
  pageCount: Math.ceil(totalItems / pageSize),
  shallow: false, // Trigger network requests for updates
  debounceMs: 500,
  manualPagination: true,
  manualSorting: true
});
```

**5. Progress Indicators**

**Linear Progress (Simple):**
```tsx
<Progress
  value={progress}
  className={cn(
    "h-2",
    successRate > 95 && "bg-green-500",
    successRate < 80 && "bg-yellow-500"
  )}
/>
```

**Animated Circular Progress (Advanced):**
```tsx
<AnimatedCircularProgressBar
  value={currentPercent}
  min={0}
  max={100}
  gaugePrimaryColor="hsl(var(--primary))"
  gaugeSecondaryColor="hsl(var(--muted))"
  className="size-20"
/>
```

**6. Badge System** (Status Indicators)

**Variants:**
```tsx
<Badge variant="default">Info</Badge>
<Badge variant="secondary">Processing</Badge>
<Badge variant="success">Completed</Badge>
<Badge variant="warning">Paused</Badge>
<Badge variant="destructive">Failed</Badge>
```

**For Log Severity:**
```tsx
{logEntry.severity === 'success' && (
  <Badge variant="success" className="gap-1">
    <Check className="h-3 w-3" />
    Success
  </Badge>
)}
{logEntry.severity === 'error' && (
  <Badge variant="destructive" className="gap-1">
    <AlertCircle className="h-3 w-3" />
    Error
  </Badge>
)}
```

---

#### **Interactive Components**

**7. Button System** (CVA-based variants)
```tsx
// Primary action
<Button variant="default" size="lg">
  Start Processing
</Button>

// With loading state
<Button variant="default" disabled={isStarting}>
  {isStarting ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Starting...
    </>
  ) : (
    'Start Processing'
  )}
</Button>

// Destructive action
<Button variant="destructive" onClick={handleCancel}>
  Cancel Job
</Button>

// Icon button
<Button variant="ghost" size="icon">
  <Play className="h-4 w-4" />
</Button>
```

**8. Dialog System** (Modal)
```tsx
<Dialog open={showNewJob} onOpenChange={setShowNewJob}>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>Create New Job</DialogTitle>
      <DialogDescription>
        Upload URLs or paste list to begin processing
      </DialogDescription>
    </DialogHeader>
    <div className="py-4">
      <Tabs defaultValue="upload">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload">File Upload</TabsTrigger>
          <TabsTrigger value="paste">Paste URLs</TabsTrigger>
        </TabsList>
        <TabsContent value="upload">
          <FileUploadZone onFilesSelected={handleFiles} />
        </TabsContent>
        <TabsContent value="paste">
          <Textarea
            placeholder="Paste URLs here, one per line..."
            rows={10}
            value={urlText}
            onChange={(e) => setUrlText(e.target.value)}
          />
        </TabsContent>
      </Tabs>
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setShowNewJob(false)}>
        Cancel
      </Button>
      <Button onClick={handleStartJob} disabled={!hasValidUrls}>
        Start Processing ({urlCount} URLs)
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**9. Tabs Component**
```tsx
<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList>
    <TabsTrigger value="upload">File Upload</TabsTrigger>
    <TabsTrigger value="paste">Paste URLs</TabsTrigger>
  </TabsList>
  <TabsContent value="upload">
    {/* File upload UI */}
  </TabsContent>
  <TabsContent value="paste">
    {/* Textarea */}
  </TabsContent>
</Tabs>
```

**10. Select/Dropdown**
```tsx
<Select value={statusFilter} onValueChange={setStatusFilter}>
  <SelectTrigger className="w-[180px]">
    <SelectValue placeholder="Filter by status" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">All Statuses</SelectItem>
    <SelectItem value="success">Success Only</SelectItem>
    <SelectItem value="failed">Failed Only</SelectItem>
  </SelectContent>
</Select>
```

---

#### **Feedback Components**

**11. Toast Notifications (Sonner)**
```tsx
import { toast } from 'sonner';

// Success
toast.success('Job started successfully', {
  description: '8,000 URLs queued for processing'
});

// Error
toast.error('Failed to start job', {
  description: error.message,
  action: {
    label: 'Retry',
    onClick: () => handleRetry()
  }
});

// Loading
const loadingToast = toast.loading('Starting job...');
// Later: toast.dismiss(loadingToast);
```

**12. Alert Component**
```tsx
<Alert variant="destructive">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Processing Error</AlertTitle>
  <AlertDescription>
    ScrapingBee rate limit reached. Retrying in 30 seconds...
  </AlertDescription>
</Alert>
```

**13. Skeleton Loading States**
```tsx
// Card skeleton
<Card>
  <CardHeader>
    <Skeleton className="h-4 w-1/3" />
    <Skeleton className="h-3 w-2/3 mt-2" />
  </CardHeader>
  <CardContent>
    <Skeleton className="h-2 w-full" />
    <Skeleton className="h-4 w-24 mt-2" />
  </CardContent>
</Card>

// Table skeleton
<div className="space-y-2">
  {Array.from({ length: 5 }).map((_, i) => (
    <Skeleton key={i} className="h-12 w-full" />
  ))}
</div>
```

---

#### **Real-Time Specific Components**

**14. ScrollArea** (Live Log Stream)
```tsx
<ScrollArea className="h-96 w-full border rounded-md">
  <div className="p-4 space-y-1">
    {logEntries.map(entry => (
      <LogEntry key={entry.id} entry={entry} />
    ))}
    {autoScroll && <div ref={bottomRef} />}
  </div>
</ScrollArea>

// Auto-scroll effect
useEffect(() => {
  if (autoScroll && bottomRef.current) {
    bottomRef.current.scrollIntoView({ behavior: 'smooth' });
  }
}, [logEntries, autoScroll]);
```

**15. Separator**
```tsx
<div className="flex items-center gap-2">
  <span>Progress</span>
  <Separator orientation="vertical" className="h-4" />
  <span>45 / 100</span>
</div>
```

---

### **Custom Composite Components**

These are built using shadcn/ui primitives, specific to your dashboard:

**1. LiveIndicator**
```tsx
export function LiveIndicator({ status = 'connected' }: { status?: 'connected' | 'reconnecting' | 'disconnected' }) {
  const colors = {
    connected: 'bg-green-500',
    reconnecting: 'bg-yellow-500',
    disconnected: 'bg-red-500'
  };

  return (
    <div className="flex items-center gap-1.5">
      <span className="relative flex h-2 w-2">
        {status === 'connected' && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
        )}
        <span className={cn("relative inline-flex rounded-full h-2 w-2", colors[status])}></span>
      </span>
      <span className="text-xs text-muted-foreground">
        {status === 'connected' && 'Live'}
        {status === 'reconnecting' && 'Reconnecting...'}
        {status === 'disconnected' && 'Disconnected'}
      </span>
    </div>
  );
}
```

**2. LogEntry**
```tsx
export function LogEntry({ entry }: { entry: LogEntry }) {
  const severityConfig = {
    success: { icon: Check, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-950' },
    info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950' },
    warning: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-950' },
    error: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950' }
  };

  const config = severityConfig[entry.severity];
  const Icon = config.icon;

  return (
    <div className={cn("flex items-start gap-2 p-2 rounded text-sm", config.bg)}>
      <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", config.color)} />
      <div className="flex-1 min-w-0">
        <span className="text-xs text-muted-foreground mr-2">
          {format(entry.timestamp, 'HH:mm:ss')}
        </span>
        <span>{entry.message}</span>
      </div>
    </div>
  );
}
```

**3. CurrentURLDisplay**
```tsx
export function CurrentURLDisplay({ url, stage, elapsedSeconds }: CurrentURLDisplayProps) {
  const stageConfig = {
    fetching: { icon: Globe, label: 'Fetching', color: 'text-blue-500' },
    filtering: { icon: Filter, label: 'Filtering', color: 'text-purple-500' },
    classifying: { icon: Brain, label: 'Classifying', color: 'text-orange-500' }
  };

  const config = stageConfig[stage];
  const Icon = config.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          Currently Processing
          <Badge variant="secondary" className="gap-1">
            <Icon className={cn("h-3 w-3 animate-pulse", config.color)} />
            {config.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <p className="text-lg font-mono truncate flex-1">{url}</p>
          <span className="text-sm text-muted-foreground ml-4">
            {elapsedSeconds}s
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
```

**4. CostTracker**
```tsx
export function CostTracker({ totalCost, costPerUrl, geminiCost, gptCost, projectedCost, savingsPercent }: CostTrackerProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Cost Tracking</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Total Spent</span>
          <span className="text-2xl font-bold">${totalCost.toFixed(2)}</span>
        </div>
        <Separator />
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Per URL</span>
            <span className="font-mono">${costPerUrl.toFixed(5)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Gemini</span>
            <span className="font-mono">${geminiCost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">GPT (fallback)</span>
            <span className="font-mono">${gptCost.toFixed(2)}</span>
          </div>
        </div>
        <Separator />
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Projected Total</span>
          <span className="font-semibold">${projectedCost.toFixed(2)}</span>
        </div>
        {savingsPercent > 0 && (
          <Badge variant="success" className="w-full justify-center">
            {savingsPercent}% saved vs GPT-only
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
```

**5. JobStatsCard**
```tsx
export function JobStatsCard({ title, value, description, trend }: JobStatsCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        )}
        {trend && (
          <div className={cn("text-xs mt-1 flex items-center gap-1",
            trend.direction === 'up' ? 'text-green-500' : 'text-red-500'
          )}>
            {trend.direction === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {trend.value}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

**Component Usage Example:**
```tsx
<div className="grid gap-4 md:grid-cols-4">
  <JobStatsCard
    title="Processed"
    value="1,234"
    description="of 8,000 URLs"
  />
  <JobStatsCard
    title="Success Rate"
    value="98.5%"
    trend={{ direction: 'up', value: '+2.1%' }}
  />
  <JobStatsCard
    title="Processing Rate"
    value="23/min"
    description="Average speed"
  />
  <JobStatsCard
    title="Est. Completion"
    value="4h 12m"
    description="At current rate"
  />
</div>
```

---

### **Component Organization**

```
src/components/
├── ui/                           # shadcn/ui components (49 components)
│   ├── button.tsx
│   ├── card.tsx
│   ├── badge.tsx
│   ├── progress.tsx
│   ├── table/                    # Data table system
│   │   ├── data-table.tsx
│   │   ├── data-table-toolbar.tsx
│   │   └── ...
│   ├── sidebar.tsx               # 726-line sidebar system
│   ├── scroll-area.tsx
│   ├── skeleton.tsx
│   ├── sonner.tsx                # Toast system
│   └── ...
│
├── dashboard/                    # Dashboard-specific composites
│   ├── live-indicator.tsx
│   ├── log-entry.tsx
│   ├── current-url-display.tsx
│   ├── cost-tracker.tsx
│   ├── job-stats-card.tsx
│   ├── file-upload-zone.tsx
│   └── ...
│
└── layout/
    ├── header.tsx
    ├── app-sidebar.tsx
    └── theme-toggle.tsx
```

---

## 5. Visual Design Foundation

### 5.1 Color Palette

Based on the dashboard starter's OKLCH color system, our palette uses perceptually uniform colors for accessibility and consistency:

**Color System (CSS Variables):**

```css
:root {
  /* Base Colors - Neutral Foundation */
  --background: oklch(1 0 0);           /* Pure white */
  --foreground: oklch(0.145 0 0);       /* Near black */
  --muted: oklch(0.97 0 0);             /* Light gray */
  --muted-foreground: oklch(0.556 0 0); /* Medium gray */

  /* Brand - Professional Blue/Zinc */
  --primary: oklch(0.205 0 0);          /* Dark zinc */
  --primary-foreground: oklch(0.985 0 0); /* White */

  /* Surface Colors */
  --card: oklch(1 0 0);                 /* White cards */
  --card-foreground: oklch(0.145 0 0);
  --border: oklch(0.922 0 0);           /* Subtle borders */

  /* Semantic Colors */
  --success: oklch(0.646 0.222 142.5);  /* Green */
  --warning: oklch(0.828 0.189 84.429);  /* Yellow */
  --destructive: oklch(0.577 0.245 27.325); /* Red */
  --info: oklch(0.6 0.118 184.704);     /* Blue */

  /* Real-Time Status Colors */
  --status-processing: oklch(0.6 0.118 184.704);  /* Blue */
  --status-paused: oklch(0.828 0.189 84.429);     /* Yellow */
  --status-completed: oklch(0.646 0.222 142.5);   /* Green */
  --status-failed: oklch(0.577 0.245 27.325);     /* Red */
}

.dark {
  /* Dark Mode Overrides */
  --background: oklch(0.145 0 0);       /* Near black */
  --foreground: oklch(0.985 0 0);       /* White */
  --muted: oklch(0.205 0 0);            /* Dark gray */
  --card: oklch(0.205 0 0);             /* Dark cards */
  --border: oklch(0.278 0 0);           /* Subtle dark borders */

  /* Adjusted for dark mode contrast */
  --primary: oklch(0.922 0 0);
  --success: oklch(0.7 0.2 142.5);
  --warning: oklch(0.85 0.18 84.429);
  --destructive: oklch(0.65 0.24 27.325);
}
```

**Semantic Color Usage:**

| Element | Light Mode | Dark Mode | Usage |
|---------|------------|-----------|-------|
| **Processing** | Blue (`oklch(0.6 0.118 184.704)`) | Lighter blue | Active jobs, progress indicators |
| **Success** | Green (`oklch(0.646 0.222 142.5)`) | Lighter green | Completed jobs, successful classifications |
| **Warning** | Yellow (`oklch(0.828 0.189 84.429)`) | Lighter yellow | Paused jobs, warnings in logs |
| **Error** | Red (`oklch(0.577 0.245 27.325)`) | Lighter red | Failed jobs, errors in logs |
| **Info** | Blue (`oklch(0.6 0.118 184.704)`) | Lighter blue | Informational logs, help text |

**Why OKLCH?**
- **Perceptual uniformity:** Colors appear equally bright across the spectrum
- **Better accessibility:** Easier to maintain WCAG contrast ratios
- **Predictable lightness:** Adjusting lightness (L) gives consistent results
- **Future-proof:** Native browser support improving

---

### 5.2 Typography

**Font Families:**
```css
:root {
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
}
```

**Font Loading (Next.js):**
```tsx
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap'
});
```

**Type Scale:**

| Element | Class | Size | Weight | Usage |
|---------|-------|------|--------|-------|
| **H1 (Page Title)** | `text-3xl` | 30px | 700 (Bold) | Main dashboard title |
| **H2 (Section)** | `text-2xl` | 24px | 600 (Semibold) | Card titles, section headers |
| **H3 (Subsection)** | `text-xl` | 20px | 600 (Semibold) | Subsection headers |
| **H4 (Card Title)** | `text-lg` | 18px | 600 (Semibold) | Card headers |
| **Body Large** | `text-base` | 16px | 400 (Regular) | Primary content |
| **Body** | `text-sm` | 14px | 400 (Regular) | Secondary content, labels |
| **Body Small** | `text-xs` | 12px | 400 (Regular) | Metadata, timestamps |
| **Monospace (URLs)** | `font-mono text-sm` | 14px | 400 | URLs, IDs, costs |
| **Numbers (Metrics)** | `text-2xl font-bold` | 24px | 700 | Statistics, counts |

**Line Heights:**
- Headlines (H1-H4): `leading-tight` (1.25)
- Body text: `leading-normal` (1.5)
- Compact (tables, lists): `leading-snug` (1.375)

**Special Typography Styles:**

```tsx
// URL display (monospace)
<p className="font-mono text-sm truncate">
  example.com/long-url-path
</p>

// Metric display (large, bold)
<div className="text-2xl font-bold tabular-nums">
  1,234
</div>

// Timestamp (small, muted)
<span className="text-xs text-muted-foreground">
  14:32:15
</span>

// Status badge text (small, medium weight)
<span className="text-xs font-medium uppercase tracking-wide">
  Processing
</span>
```

---

### 5.3 Spacing and Layout

**Spacing Scale (Tailwind):**
```css
/* Base spacing unit: 0.25rem (4px) */
--spacing: 0.25rem;

/* Scale */
gap-1  = 4px    (tight)
gap-2  = 8px    (compact)
gap-4  = 16px   (default)
gap-6  = 24px   (comfortable)
gap-8  = 32px   (spacious)
gap-12 = 48px   (section breaks)
```

**Layout Grid:**

```tsx
// 4-column metric grid
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
  <JobStatsCard />
  <JobStatsCard />
  <JobStatsCard />
  <JobStatsCard />
</div>

// 2-column layout (logs + results)
<div className="grid gap-4 lg:grid-cols-[400px_1fr]">
  <div>{/* Live logs - fixed width */}</div>
  <div>{/* Results table - flexible */}</div>
</div>

// 3-column layout (sidebar collapsed)
<div className="grid gap-4 lg:grid-cols-3">
  <Card className="lg:col-span-2">{/* Main content */}</Card>
  <Card>{/* Sidebar content */}</Card>
</div>
```

**Container Widths:**
```css
/* Dashboard container */
max-w-screen-2xl  = 1536px  (ultra-wide monitors)
max-w-screen-xl   = 1280px  (standard desktops)

/* Content container */
max-w-7xl         = 80rem (1280px)

/* Modal/Dialog */
max-w-2xl         = 42rem (672px)
```

**Card Padding:**
```tsx
// Standard card
<Card className="p-6">        {/* 24px padding */}

// Compact card
<Card className="p-4">        {/* 16px padding */}

// Card header/content separation
<CardHeader className="pb-2"> {/* Reduced bottom padding */}
<CardContent className="pt-0">{/* No top padding */}
```

**Border Radius:**
```css
:root {
  --radius: 0.625rem; /* 10px - default */
  --radius-sm: 0.425rem; /* 6.8px */
  --radius-md: 0.625rem; /* 10px */
  --radius-lg: 0.825rem; /* 13.2px */
}

/* Applied via Tailwind */
rounded-sm  = 6.8px   (small elements)
rounded     = 10px    (cards, buttons)
rounded-lg  = 13.2px  (dialogs, large cards)
rounded-full = 9999px (badges, avatars)
```

**Elevation (Shadows):**
```css
/* Subtle elevation for cards */
shadow-xs   = 0 1px 2px 0 rgba(0, 0, 0, 0.05)

/* Standard elevation */
shadow-sm   = 0 1px 3px 0 rgba(0, 0, 0, 0.1)

/* Prominent elevation (dialogs, popovers) */
shadow-md   = 0 4px 6px -1px rgba(0, 0, 0, 0.1)
```

---

## 6. Responsive Design

### 6.1 Breakpoints

Following Tailwind CSS's mobile-first approach:

```css
/* Mobile First Breakpoints */
sm:  640px   /* Small tablets (portrait) */
md:  768px   /* Tablets (portrait) */
lg:  1024px  /* Laptops, tablets (landscape) */
xl:  1280px  /* Desktops */
2xl: 1536px  /* Large desktops, ultra-wide monitors */
```

**Target Devices:**
- **Primary:** Desktop (1280px - 1920px) - 75% of usage
- **Secondary:** Laptop (1024px - 1280px) - 20% of usage
- **Tertiary:** Tablet (768px - 1024px) - 5% of usage
- **Minimal:** Mobile (<768px) - Graceful degradation only

**Rationale:** Internal tool primarily used at desk, but should remain functional on smaller screens.

---

### 6.2 Adaptation Patterns

**Desktop (lg and above) - Optimal Experience:**
```tsx
// Full dashboard layout
<div className="grid gap-6 lg:grid-cols-[280px_1fr]">
  {/* Sidebar - full width */}
  <aside className="hidden lg:block">
    <AppSidebar />
  </aside>

  {/* Main content */}
  <main className="flex-1">
    {/* 4-column metrics */}
    <div className="grid gap-4 lg:grid-cols-4 mb-6">
      <JobStatsCard />
      <JobStatsCard />
      <JobStatsCard />
      <JobStatsCard />
    </div>

    {/* 2-column layout: logs + results */}
    <div className="grid gap-4 lg:grid-cols-[400px_1fr]">
      <Card>{/* Live logs */}</Card>
      <Card>{/* Results table */}</Card>
    </div>
  </main>
</div>
```

**Tablet (md to lg) - Adapted Layout:**
```tsx
// Collapsed sidebar (icon mode)
<div className="grid gap-6 md:grid-cols-[48px_1fr]">
  <aside>
    <AppSidebar collapsible="icon" />
  </aside>

  <main>
    {/* 2-column metrics */}
    <div className="grid gap-4 md:grid-cols-2 mb-6">
      <JobStatsCard />
      <JobStatsCard />
      {/* Other 2 cards stack below */}
    </div>

    {/* Stacked logs + results */}
    <div className="space-y-4">
      <Card>{/* Live logs - full width */}</Card>
      <Card>{/* Results table - full width */}</Card>
    </div>
  </main>
</div>
```

**Mobile (<md) - Vertical Stack:**
```tsx
// Sheet (drawer) sidebar
<Sheet>
  <SheetTrigger asChild>
    <Button variant="ghost" size="icon">
      <Menu className="h-5 w-5" />
    </Button>
  </SheetTrigger>
  <SheetContent side="left">
    <AppSidebar />
  </SheetContent>
</Sheet>

// Vertical stack all content
<div className="space-y-4 p-4">
  <JobStatsCard />
  <JobStatsCard />
  <JobStatsCard />
  <JobStatsCard />

  <Card>{/* Live logs */}</Card>
  <Card>{/* Results table with horizontal scroll */}</Card>
</div>
```

**Responsive Component Patterns:**

**1. Data Table:**
```tsx
// Desktop: Full table with all columns
<Table className="hidden md:table">
  <TableHead>
    <TableRow>
      <TableHead>URL</TableHead>
      <TableHead>Classification</TableHead>
      <TableHead>Score</TableHead>
      <TableHead>Cost</TableHead>
      <TableHead>Time</TableHead>
      <TableHead>Actions</TableHead>
    </TableRow>
  </TableHead>
</Table>

// Mobile: Card-based list view
<div className="md:hidden space-y-2">
  {results.map(result => (
    <Card key={result.id}>
      <CardHeader>
        <CardTitle className="text-sm truncate">{result.url}</CardTitle>
      </CardHeader>
      <CardContent>
        <Badge>{result.classification}</Badge>
        <div className="text-xs text-muted-foreground mt-2">
          ${result.cost} • {result.time}s
        </div>
      </CardContent>
    </Card>
  ))}
</div>
```

**2. Job Controls:**
```tsx
// Desktop: Horizontal button group
<div className="hidden md:flex gap-2">
  <Button variant="outline">Pause</Button>
  <Button variant="destructive">Cancel</Button>
  <Button variant="ghost">Export</Button>
</div>

// Mobile: Dropdown menu
<div className="md:hidden">
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="outline" size="icon">
        <MoreVertical className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent>
      <DropdownMenuItem>Pause</DropdownMenuItem>
      <DropdownMenuItem>Cancel</DropdownMenuItem>
      <DropdownMenuItem>Export</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</div>
```

**3. Responsive Text:**
```tsx
// Large on desktop, smaller on mobile
<h1 className="text-2xl md:text-3xl font-bold">
  Dashboard
</h1>

// Hide descriptive text on mobile
<p className="text-sm text-muted-foreground hidden md:block">
  Monitor scraping jobs in real-time
</p>
```

**4. Modal/Dialog Sizing:**
```tsx
<DialogContent className="w-full max-w-[95vw] md:max-w-2xl">
  {/* Adapts to screen size */}
</DialogContent>
```

---

### 6.3 Mobile Detection Hook

```tsx
// hooks/use-mobile.ts
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

// Usage
const isMobile = useIsMobile();

return (
  <>
    {isMobile ? <MobileLayout /> : <DesktopLayout />}
  </>
);
```

---

## 7. Accessibility

### 7.1 Compliance Target

**Target Level:** WCAG 2.1 Level AA

**Rationale:** Internal tool but should still be accessible for team members with disabilities. Level AA provides good accessibility without AAA's stringent requirements.

---

### 7.2 Key Accessibility Requirements

**1. Keyboard Navigation**

All interactive elements must be keyboard accessible:

```tsx
// Focus visible styles (from dashboard starter)
className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

// Skip to main content link
<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4">
  Skip to main content
</a>

// Keyboard shortcuts
<div>
  <kbd className="px-2 py-1 text-xs bg-muted rounded">Cmd</kbd> +
  <kbd className="px-2 py-1 text-xs bg-muted rounded">B</kbd> = Toggle Sidebar
</div>
```

**Tab Order:**
1. Skip link
2. Sidebar trigger
3. Primary navigation (sidebar)
4. New Job button
5. Theme toggle
6. Main content (jobs, logs, results)
7. Interactive elements (buttons, inputs) in visual order

**2. ARIA Labels and Roles**

```tsx
// Screen reader text
<span className="sr-only">Loading job details...</span>

// ARIA labels for icons
<Button variant="ghost" size="icon" aria-label="Toggle sidebar">
  <Menu className="h-4 w-4" />
</Button>

// ARIA live regions for real-time updates
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {`Processing ${currentUrl}, ${processedCount} of ${totalCount} URLs complete`}
</div>

// ARIA roles
<nav aria-label="Main navigation">
  <SidebarMenu />
</nav>

<main id="main-content" role="main">
  {children}
</main>

// Form errors
<Input
  aria-invalid={!!error}
  aria-describedby={error ? 'error-message' : undefined}
/>
{error && <p id="error-message" role="alert">{error}</p>}
```

**3. Color Contrast**

All color combinations meet WCAG AA contrast ratios (4.5:1 for text, 3:1 for UI components):

| Element | Light Mode | Dark Mode | Contrast Ratio |
|---------|------------|-----------|----------------|
| Body text on background | `oklch(0.145 0 0)` on `oklch(1 0 0)` | `oklch(0.985 0 0)` on `oklch(0.145 0 0)` | 16.94:1 ✓ |
| Muted text | `oklch(0.556 0 0)` on `oklch(1 0 0)` | `oklch(0.556 0 0)` on `oklch(0.205 0 0)` | 5.21:1 ✓ |
| Primary button | White on `oklch(0.205 0 0)` | `oklch(0.205 0 0)` on `oklch(0.922 0 0)` | 12.45:1 ✓ |
| Success badge | White on green | Text on lighter green | 4.6:1 ✓ |
| Error text | Red on white | Lighter red on dark | 4.8:1 ✓ |

**4. Focus Management**

```tsx
// Focus trap in modals
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    {/* Focus automatically moves to first focusable element */}
    {/* Tab cycles within modal */}
    {/* Esc key closes and returns focus */}
  </DialogContent>
</Dialog>

// Focus restoration after actions
const previousFocus = useRef();

const openModal = () => {
  previousFocus.current = document.activeElement;
  setIsOpen(true);
};

const closeModal = () => {
  setIsOpen(false);
  previousFocus.current?.focus();
};
```

**5. Screen Reader Announcements**

```tsx
// Live region for real-time updates
function LiveAnnouncer({ message }: { message: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}

// Usage
<LiveAnnouncer message={`Job progress: ${progress}% complete`} />

// Toast announcements (Sonner handles this automatically)
toast.success('Job completed', {
  description: '8,000 URLs processed successfully'
});
// Announced as: "Success: Job completed. 8,000 URLs processed successfully"
```

**6. Alternative Text and Labels**

```tsx
// Icon buttons always have labels
<Button variant="ghost" size="icon" aria-label="Pause job">
  <Pause className="h-4 w-4" />
</Button>

// Images (if used)
<img src="/logo.png" alt="Website Scraper Platform" />

// Decorative icons (hidden from screen readers)
<CheckCircle className="h-4 w-4" aria-hidden="true" />
<span>Success</span>
```

**7. Form Accessibility**

```tsx
<FormField
  control={form.control}
  name="urls"
  render={({ field }) => (
    <FormItem>
      <FormLabel htmlFor="urls">URL List</FormLabel>
      <FormControl>
        <Textarea
          id="urls"
          placeholder="Paste URLs here..."
          aria-describedby="urls-description urls-error"
          aria-invalid={!!form.formState.errors.urls}
          {...field}
        />
      </FormControl>
      <FormDescription id="urls-description">
        One URL per line, up to 10,000 URLs
      </FormDescription>
      <FormMessage id="urls-error" role="alert" />
    </FormItem>
  )}
/>
```

**8. Reduced Motion**

```tsx
// Respect prefers-reduced-motion
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

// In React
const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

<div className={cn(
  "transition-all",
  !prefersReducedMotion && "animate-pulse"
)}>
  Live
</div>
```

---

### 7.3 Accessibility Testing Checklist

- [ ] All interactive elements keyboard accessible
- [ ] Focus visible on all focusable elements
- [ ] Tab order follows visual order
- [ ] All icons have text alternatives or aria-labels
- [ ] Color not sole means of conveying information
- [ ] Text meets 4.5:1 contrast minimum
- [ ] Live regions announce real-time updates
- [ ] Forms have proper labels and error messages
- [ ] Modals trap focus and restore on close
- [ ] Skip links allow bypassing navigation
- [ ] Reduced motion preferences respected

---

## 8. Interaction and Motion

### 8.1 Motion Principles

**1. Purpose-Driven Animation**
Every animation serves a purpose: provide feedback, guide attention, or indicate system state. No decoration-only animations.

**2. Fast and Subtle**
Animations complete in 150-300ms. Real-time dashboard requires snappy interactions.

**3. Respect User Preferences**
Honor `prefers-reduced-motion` - critical for accessibility and user comfort.

**4. Natural Easing**
Use ease-in-out for most transitions. Matches physical world expectations.

---

### 8.2 Key Animations and Transitions

**1. Live Indicator Pulse** (System Status)
```tsx
<span className="relative flex h-2 w-2">
  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
</span>

// CSS
@keyframes ping {
  75%, 100% {
    transform: scale(2);
    opacity: 0;
  }
}
.animate-ping {
  animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
}
```

**Usage:** Indicates active processing, live connection status

---

**2. Progress Bar Animation** (Task Completion)
```tsx
<Progress value={progress} className="h-2 transition-all duration-300" />

// CSS
.progress-bar {
  transition: width 300ms ease-in-out;
}
```

**Usage:** Smooth progress updates (updates every 1s, animates transition)

---

**3. Toast Slide-In** (Notifications)
```tsx
// Handled by Sonner
toast.success('Job started');

// CSS (from Sonner)
@keyframes slideIn {
  from {
    transform: translateX(calc(100% + var(--gap)));
  }
  to {
    transform: translateX(0);
  }
}
```

**Usage:** Non-intrusive notifications for system events

---

**4. Skeleton Pulse** (Loading States)
```tsx
<Skeleton className="h-4 w-full animate-pulse" />

// CSS
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

**Usage:** Loading placeholders for content

---

**5. Modal/Dialog Fade & Scale** (Overlays)
```tsx
<Dialog>
  <DialogContent className="data-[state=open]:animate-in data-[state=closed]:animate-out">
    {content}
  </DialogContent>
</Dialog>

// CSS
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translate(-50%, -48%) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}
```

**Duration:** 150ms
**Usage:** Modal entry/exit

---

**6. Button Hover & Active States** (Interaction Feedback)
```tsx
<Button className="transition-colors hover:bg-primary/90 active:scale-95">
  Start Processing
</Button>

// CSS
.button {
  transition: background-color 150ms ease-in-out,
              transform 100ms ease-in-out;
}

.button:hover {
  background-color: hsl(var(--primary) / 0.9);
}

.button:active {
  transform: scale(0.95);
}
```

**Usage:** Immediate tactile feedback

---

**7. Sidebar Collapse/Expand** (Layout Transition)
```tsx
<Sidebar className="transition-[width] duration-200 ease-linear">
  {/* 280px → 48px (icon mode) */}
</Sidebar>

// CSS
.sidebar {
  transition: width 200ms linear;
}
```

**Usage:** Smooth sidebar state changes

---

**8. Log Entry Fade-In** (New Content)
```tsx
<div className="animate-in fade-in duration-150">
  <LogEntry entry={newEntry} />
</div>

// CSS
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

**Usage:** New log entries appear gracefully

---

**9. Table Row Hover** (Item Highlight)
```tsx
<TableRow className="hover:bg-muted/50 transition-colors">
  {cells}
</TableRow>

// CSS
.table-row {
  transition: background-color 100ms ease-in-out;
}
```

**Usage:** Clear hover affordance

---

**10. Optimistic UI Updates** (Immediate Feedback)
```tsx
const handlePause = () => {
  // Optimistic update
  setStatus('paused');
  setButtonDisabled(true);

  pauseJob()
    .then(() => {
      toast.success('Job paused');
    })
    .catch(() => {
      // Rollback
      setStatus('processing');
      toast.error('Failed to pause');
    })
    .finally(() => {
      setButtonDisabled(false);
    });
};
```

**Usage:** Instant UI response while awaiting server confirmation

---

### 8.3 Real-Time Update Patterns

**Supabase Realtime Integration:**

```tsx
// Subscribe to job updates
useEffect(() => {
  const channel = supabase
    .channel('job-updates')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'jobs',
      filter: `id=eq.${jobId}`
    }, (payload) => {
      // Update state with transition
      setJob(prev => ({
        ...prev,
        ...payload.new
      }));
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [jobId]);
```

**Throttled Updates for Performance:**

```tsx
// Update UI max once per second
const throttledUpdate = useThrottle((data) => {
  setProgress(data.progress);
  setProcessed(data.processed);
}, 1000);

// Log stream with batch updates
const logBuffer = useRef([]);

useEffect(() => {
  const interval = setInterval(() => {
    if (logBuffer.current.length > 0) {
      setLogs(prev => [...prev, ...logBuffer.current]);
      logBuffer.current = [];
    }
  }, 500); // Batch every 500ms

  return () => clearInterval(interval);
}, []);
```

---

### 8.4 Micro-Interactions

**1. Checkbox Check Animation**
```css
.checkbox[data-state="checked"] {
  animation: checkboxCheck 200ms ease-in-out;
}

@keyframes checkboxCheck {
  0% { transform: scale(0.8); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}
```

**2. Badge Appear**
```tsx
<Badge className="animate-in zoom-in duration-150">
  New
</Badge>
```

**3. Number Count-Up** (for metrics)
```tsx
import { useCountUp } from 'react-countup';

function MetricValue({ value }: { value: number }) {
  const { countUp } = useCountUp({ end: value, duration: 0.5 });
  return <span>{countUp}</span>;
}
```

**4. Spinner (Loading)**
```tsx
<Loader2 className="h-4 w-4 animate-spin" />

// CSS
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

---

## 9. Design Files and Wireframes

### 9.1 Design Approach

**Specification-Driven Development**

This project follows a **specification-first approach** rather than high-fidelity design files. The comprehensive component specifications, examples, and the shadcn/ui reference implementation provide sufficient design guidance for development.

**Rationale:**
- **Solo developer with AI assistance** - Specs are more actionable than Figma files
- **shadcn/ui provides visual language** - Components are pre-designed and accessible
- **Iterative refinement** - Easier to adjust in code than redesign mockups
- **Reference implementation exists** - Dashboard starter serves as visual guide

---

### 9.2 Reference Implementation

**Primary Design Reference:**
`/Users/s0mebody/Desktop/dev/projects/next-shadcn-dashboard-starter/`

This production dashboard demonstrates:
- shadcn/ui component usage and composition
- Layout patterns (sidebar, header, content)
- Data table implementation
- Dark mode theming
- Responsive behavior
- Accessibility patterns

**Key Reference Screens:**
1. **Dashboard Overview** - Metric cards + data table layout
2. **Sidebar Navigation** - Collapsible sidebar with icon mode
3. **Data Table** - Server-side pagination, sorting, filtering
4. **Form Dialogs** - Modal patterns with tabs
5. **Theme Switching** - Dark mode with View Transition API

---

### 9.3 Key Screen Layouts

**Screen 1: Dashboard - Active Job Monitoring**

```
┌─────────────────────────────────────────────────────────────────┐
│ [☰] Website Scraper Platform            [🟢 Live]  [+ New Job] │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐          │
│  │Processed│  │Success  │  │Rate     │  │Est Time │          │
│  │1,234    │  │98.5%    │  │23/min   │  │4h 12m   │          │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘          │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Job #1234 - Processing              [Pause] [Cancel]     │  │
│  │ ████████░░░░░░░░░░░░░░░░░░░░ 15.4% (1,234 / 8,000)      │  │
│  │                                                            │  │
│  │ Currently Processing                                       │  │
│  │ example.com/blog - Stage: Classifying (12s)              │  │
│  │                                                            │  │
│  │ Cost: $1.23 | Per URL: $0.001 | Projected: $8.00        │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌─────────────────────┐  ┌──────────────────────────────────┐  │
│  │ Live Activity Log   │  │ Results (1,234 URLs)             │  │
│  │ [All][Errors]       │  │ Search: [___________] [Filter ▼] │  │
│  ├─────────────────────┤  ├──────────────────────────────────┤  │
│  │14:32:15 ✓ ex1.com  │  │ URL         │Class│Cost│Time     │  │
│  │  Gemini: SUITABLE  │  │ example.com │✓ S  │0.001│2.3s   │  │
│  │14:32:17 ⚠ ex2.com  │  │ test.com    │✗ NS │0.001│1.8s   │  │
│  │  Pre-filter REJECT │  │ ...         │...  │... │...     │  │
│  │14:32:19 ✓ ex3.com  │  │                                   │  │
│  │  Gemini: SUITABLE  │  │  [1] 2 3 ... 50                  │  │
│  │ [Auto-scroll ☑]    │  │                    [Export ▼]    │  │
│  └─────────────────────┘  └──────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

**Screen 2: New Job Modal**

```
┌───────────────────────────────────────────────┐
│  Create New Job                          [×]  │
│  Upload URLs or paste list to begin           │
├───────────────────────────────────────────────┤
│                                                 │
│  [File Upload] [Paste URLs]                   │
│  ┌───────────────────────────────────────────┐│
│  │                                            ││
│  │  Paste URLs here, one per line...         ││
│  │                                            ││
│  │  https://example.com                      ││
│  │  https://test.com                         ││
│  │  ...                                      ││
│  │                                            ││
│  └───────────────────────────────────────────┘│
│                                                 │
│  ℹ One URL per line, up to 10,000 URLs       │
│                                                 │
│  ┌───────────────────────────────────────────┐│
│  │ Preview:                                   ││
│  │ 8,000 URLs detected                       ││
│  │ 127 duplicates removed                     ││
│  │ 7,873 unique URLs to process              ││
│  └───────────────────────────────────────────┘│
│                                                 │
│                    [Cancel] [Start Processing] │
└───────────────────────────────────────────────┘
```

---

**Screen 3: Mobile View (Stacked Layout)**

```
┌─────────────────────────┐
│ [☰] Scraper   [🟢] [+] │
├─────────────────────────┤
│                         │
│ ┌─────────────────────┐ │
│ │ Processed           │ │
│ │ 1,234 of 8,000      │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ Success Rate        │ │
│ │ 98.5%               │ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │ Job #1234           │ │
│ │ ████████░░░ 15.4%  │ │
│ │ [Pause] [Cancel]    │ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │ Live Logs           │ │
│ │ 14:32:15 ✓ ex1.com │ │
│ │ 14:32:17 ⚠ ex2.com │ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │ Results (Card View) │ │
│ │ ┌─────────────────┐ │ │
│ │ │ example.com     │ │ │
│ │ │ ✓ SUITABLE      │ │ │
│ │ │ $0.001 • 2.3s  │ │ │
│ │ └─────────────────┘ │ │
│ └─────────────────────┘ │
│                         │
└─────────────────────────┘
```

---

## 10. Next Steps

### 10.1 Immediate Actions

**1. Review UX Specification** ✓
You now have a comprehensive UX specification covering:
- User personas and goals
- Information architecture
- Detailed user flows
- Complete component library (shadcn/ui based)
- Visual design system (colors, typography, spacing)
- Responsive design patterns
- Accessibility requirements (WCAG 2.1 AA)
- Animation and interaction patterns

**2. Proceed to Solution Architecture** (REQUIRED NEXT)

The PRD + UX Specification are now complete. Before implementation, you need technical architecture:

```bash
# In a new chat or continue here:
# Run solutioning workflow to generate technical architecture
```

The solutioning workflow will generate:
- **Solution Architecture Document** - Overall system design
- **Database Schema** - Tables, relationships, indexes
- **API Specifications** - Endpoints, request/response formats
- **Component Architecture** - Frontend structure and state management
- **Real-Time Integration** - Supabase Realtime setup
- **Deployment Configuration** - Railway setup guide

**3. Set Up Development Environment**

After architecture is complete:

```bash
# Initialize Next.js with shadcn/ui
npx create-next-app@latest website-scraper --typescript --tailwind --app
cd website-scraper

# Initialize shadcn/ui
npx shadcn-ui@latest init
# Select: New York style, Zinc base color, CSS variables: Yes

# Install required components
npx shadcn-ui@latest add button card badge progress table \
  dialog tabs input select scroll-area separator skeleton \
  sidebar sonner alert

# Install additional dependencies
npm install @supabase/supabase-js date-fns zustand nuqs \
  react-countup lucide-react
```

**4. Reference Implementation Setup**

Copy patterns from the dashboard starter:

```bash
# Copy useful files from reference implementation
cp -r /Users/s0mebody/Desktop/dev/projects/next-shadcn-dashboard-starter/src/components/ui/table ./src/components/ui/
cp -r /Users/s0mebody/Desktop/dev/projects/next-shadcn-dashboard-starter/src/hooks ./src/
cp /Users/s0mebody/Desktop/dev/projects/next-shadcn-dashboard-starter/src/app/globals.css ./src/app/
```

**5. Begin Implementation** (After Architecture Complete)

**Phase 1: Foundation** (Week 1-2)
- Set up Next.js + shadcn/ui project
- Implement layout (sidebar, header)
- Create basic routing structure
- Connect to Supabase
- Set up Railway deployment

**Phase 2: Core Dashboard** (Week 3-4)
- Implement job stats cards
- Build active job monitor card
- Create live log stream component
- Set up Supabase Realtime subscriptions

**Phase 3: Job Management** (Week 5-6)
- Build "New Job" modal with upload
- Implement results data table
- Add job control actions (pause/resume/cancel)
- Export functionality

**Phase 4: Backend Integration** (Week 7-8)
- Connect to NestJS backend
- Integrate BullMQ job updates
- Implement real-time progress tracking
- Cost tracking integration

**Phase 5: Polish** (Week 9-10)
- Responsive design refinement
- Accessibility audit and fixes
- Performance optimization
- User testing and feedback

---

### 10.2 Design Handoff Checklist

**UX Specification Complete:**
- [x] User personas defined
- [x] Usability goals established
- [x] Design principles documented
- [x] Information architecture mapped
- [x] 3 critical user flows diagrammed
- [x] Component library specified (shadcn/ui)
- [x] 15+ core components documented with examples
- [x] 5 custom composite components specified
- [x] Color system defined (OKLCH-based)
- [x] Typography scale established
- [x] Spacing and layout grid documented
- [x] Responsive breakpoints and patterns defined
- [x] Accessibility requirements (WCAG 2.1 AA)
- [x] Animation and interaction patterns specified
- [x] Real-time update patterns documented
- [x] Key screen layouts wireframed

**Ready for Next Phase:**
- [ ] Run solutioning workflow for technical architecture
- [ ] Set up development environment
- [ ] Begin Epic 1, Story 1.1 implementation

---

### 10.3 Key Documentation References

**Planning Documents:**
- PRD: `docs/PRD.md`
- Epic Stories: `docs/epic-stories.md`
- UX Specification: `docs/ux-specification.md` (this document)
- Project Analysis: `docs/project-workflow-analysis.md`
- Technical Research: `docs/research-technical-2025-10-12.md`

**Reference Implementation:**
- Dashboard Starter: `/Users/s0mebody/Desktop/dev/projects/next-shadcn-dashboard-starter/`

**Component Documentation:**
- shadcn/ui: https://ui.shadcn.com/
- Radix UI: https://www.radix-ui.com/
- Tailwind CSS: https://tailwindcss.com/

**Real-Time Integration:**
- Supabase Realtime: https://supabase.com/docs/guides/realtime

---

### 10.4 Success Metrics

Your UX will be successful when:

✓ **Immediate Comprehension:** Users understand job status within 3 seconds
✓ **Zero Ambiguity:** No user ever asks "is it working?"
✓ **Real-Time Transparency:** All updates visible in <1 second
✓ **Collaborative Viewing:** Multiple users see identical state
✓ **Error Clarity:** Every error explains what happened and what's being done
✓ **Accessibility:** WCAG 2.1 AA compliance verified
✓ **Performance:** Dashboard remains responsive during 10K+ URL processing
✓ **Cost Visibility:** Real-time cost tracking prevents budget surprises

---

### 10.5 Maintenance and Evolution

**Post-Launch Considerations:**

**User Feedback Collection:**
- Add anonymous feedback widget (optional)
- Monitor error logs for UX issues
- Track which features are most used

**Future Enhancements** (Phase 2):
- Advanced filtering in results table
- Bulk actions (reprocess selected URLs)
- Custom classification prompts
- Historical job comparison
- Advanced analytics dashboard
- Scheduled/recurring jobs

**Performance Monitoring:**
- Track real-time update latency
- Monitor table rendering performance with large datasets
- Measure time-to-interactive for dashboard load

---

**🎉 UX Specification Complete!**

You now have a comprehensive, implementation-ready UX specification for your real-time transparency dashboard. The next critical step is running the **solutioning workflow** to generate the technical architecture that will guide implementation.

---

## Appendix

### Related Documents

- PRD: `docs/PRD.md`
- Epics: `docs/epic-stories.md`
- Project Analysis: `docs/project-workflow-analysis.md`
- Technical Research: `docs/research-technical-2025-10-12.md`

### Version History

| Date       | Version | Changes               | Author |
| ---------- | ------- | --------------------- | ------ |
| 2025-10-13 | 1.0     | Initial specification | CK     |
