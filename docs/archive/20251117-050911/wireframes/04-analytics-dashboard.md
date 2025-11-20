# Analytics Dashboard Wireframe

**Page:** `/analytics`
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
│ │  🏠 Dash│  Analytics                               [Date Range: Last 30 Days ▼] [📥 Export]   ││
│ │         │  ─────────────────────────────────────────────────────────────────────────────────  ││
│ │  📋 Jobs│                                                                                       ││
│ │         │  ┌──────────────────────────────────────────────────────────────────────────────┐   ││
│ │  ✋ Queue│  │ 📊 Overview                                        Period: Nov 1-30, 2025     │   ││
│ │    [24] │  ├──────────────────────────────────────────────────────────────────────────────┤   ││
│ │         │  │                                                                               │   ││
│ │  📊 Analy│  │  ┌─────────────┬─────────────┬─────────────┬─────────────┬──────────────┐  │   ││
│ │         │  │  │ 📈 Total    │ ✋ Manual   │ ⏱ Avg      │ ✓ Approval  │ 💰 Total     │  │   ││
│ │  📜 Logs│  │  │  Processed  │  Reviews    │  Review     │  Rate       │  Cost        │  │   ││
│ │         │  │  ├─────────────┼─────────────┼─────────────┼─────────────┼──────────────┤  │   ││
│ │  ⚙️ Set │  │  │   15,234    │   1,248     │   4.2 hrs   │     68%     │   $1,542.18  │  │   ││
│ │         │  │  │   URLs      │   items     │   per item  │   approved  │   spent      │  │   ││
│ │         │  │  │   ↑ +12%    │   ↑ +8%     │   ↓ -15%    │   ↑ +5%     │   ↓ -$234    │  │   ││
│ │         │  │  └─────────────┴─────────────┴─────────────┴─────────────┴──────────────┘  │   ││
│ │         │  │                                                                               │   ││
│ │         │  │  ┌─────────────┬────────────┐                                                │   ││
│ │         │  │  │ 💾 Queue    │ 🎯 Layer   │                                                │   ││
│ │         │  │  │  Backlog    │  Efficiency│                                                │   ││
│ │         │  │  ├─────────────┼────────────┤                                                │   ││
│ │         │  │  │     24      │    86%     │                                                │   ││
│ │         │  │  │   items     │ eliminated │                                                │   ││
│ │         │  │  │   ↑ +4      │   ↑ +2%    │                                                │   ││
│ │         │  │  └─────────────┴────────────┘                                                │   ││
│ │         │  └──────────────────────────────────────────────────────────────────────────────┘   ││
│ │         │                                                                                       ││
│ │         │  ┌──────────────────────────────────────────────────────────────────────────────┐   ││
│ │         │  │ 📊 Queue Performance Trend (Last 30 Days)                                     │   ││
│ │         │  ├──────────────────────────────────────────────────────────────────────────────┤   ││
│ │         │  │                                                                               │   ││
│ │         │  │  60│                                      ╱╲                                  │   ││
│ │         │  │    │                                    ╱  ╲                                  │   ││
│ │         │  │  50│                          ╱╲      ╱    ╲                                  │   ││
│ │         │  │    │                        ╱  ╲    ╱      ╲        ╱╲                        │   ││
│ │         │  │  40│            ╱╲        ╱    ╲  ╱        ╲      ╱  ╲                        │   ││
│ │         │  │    │          ╱  ╲      ╱      ╲╱          ╲    ╱    ╲                        │   ││
│ │         │  │  30│        ╱    ╲    ╱                     ╲  ╱      ╲      ╱╲              │   ││
│ │         │  │    │      ╱      ╲  ╱                       ╲╱        ╲    ╱  ╲              │   ││
│ │         │  │  20│    ╱        ╲╱                                    ╲  ╱    ╲              │   ││
│ │         │  │    │  ╱                                                 ╲╱      ╲              │   ││
│ │         │  │  10│╱                                                            ╲              │   ││
│ │         │  │   0├───────────────────────────────────────────────────────────────────────>  │   ││
│ │         │  │     1   3   5   7   9  11  13  15  17  19  21  23  25  27  29  31           │   ││
│ │         │  │                            November 2025                                      │   ││
│ │         │  │                                                                               │   ││
│ │         │  │  Legend:  ── Queue Size   ── Items Added   ── Items Reviewed                │   ││
│ │         │  │                                                                               │   ││
│ │         │  │  📌 Insights:                                                                 │   ││
│ │         │  │  • Peak queue size: 56 items on Nov 18 (Wed)                                 │   ││
│ │         │  │  • Average completion rate: 82%                                              │   ││
│ │         │  │  • Current backlog: 24 items (-4 from yesterday)                             │   ││
│ │         │  │                                                                               │   ││
│ │         │  └──────────────────────────────────────────────────────────────────────────────┘   ││
│ │         │                                                                                       ││
│ │         │  ┌────────────────────────────────────┬──────────────────────────────────────────┐  ││
│ │         │  │ 📊 Confidence Band Distribution    │ 💰 Cost Breakdown (Last 30 Days)         │  ││
│ │         │  ├────────────────────────────────────┼──────────────────────────────────────────┤  ││
│ │         │  │                                     │                                           │  ││
│ │         │  │  600│                              │  $800│                                   │  ││
│ │         │  │     │                              │      │           ╱─────────╲              │  ││
│ │         │  │  500│        ████                  │  $600│         ╱           ╲             │  ││
│ │         │  │     │        ████                  │      │        ╱             ╲            │  ││
│ │         │  │  400│        ████    ████          │  $400│      ╱                ╲           │  ││
│ │         │  │     │        ████    ████          │      │    ╱                   ╲          │  ││
│ │         │  │  300│  ████  ████    ████          │  $200│  ╱                     ╲          │  ││
│ │         │  │     │  ████  ████    ████    ████  │      │╱                        ╲         │  ││
│ │         │  │  200│  ████  ████    ████    ████  │    $0├────────────────────────────────>│  ││
│ │         │  │     │  ████  ████    ████    ████  │       1  5  10  15  20  25  30          │  ││
│ │         │  │  100│  ████  ████    ████    ████  │                                           │  ││
│ │         │  │     │  ████  ████    ████    ████  │  Legend:                                 │  ││
│ │         │  │    0├────────────────────────────> │  ── Gemini ($942)   ── GPT ($345)        │  ││
│ │         │  │      High Medium  Low   Reject     │  ── Scraping ($255)                      │  ││
│ │         │  │      234   456    78      0        │                                           │  ││
│ │         │  │                                     │  💡 Avg Cost per URL: $0.0028            │  ││
│ │         │  │  🎯 Insights:                       │                                           │  ││
│ │         │  │  • 59% routed to manual review    │  💰 Cost Savings: $1,234                  │  ││
│ │         │  │  • 30% high confidence             │     (Layer 1 + 2 eliminations)            │  ││
│ │         │  │  • 10% low confidence              │                                           │  ││
│ │         │  │  • 0% auto-rejected                │  Peak Cost Day: Nov 18 ($82.50)           │  ││
│ │         │  │                                     │                                           │  ││
│ │         │  └────────────────────────────────────┴──────────────────────────────────────────┘  ││
│ │         │                                                                                       ││
│ │         │  ┌──────────────────────────────────────────────────────────────────────────────┐   ││
│ │         │  │ 🎯 Layer Performance Analysis                                                 │   ││
│ │         │  ├──────────────────────────────────────────────────────────────────────────────┤   ││
│ │         │  │                                                                               │   ││
│ │         │  │  Layer 1: Domain Analysis (NO HTTP REQUESTS)                                  │   ││
│ │         │  │  ████████████████████████████████████████████████████████ 58% (8,834 URLs)   │   ││
│ │         │  │  Eliminated | Cost: $0 | Avg time: 0.05s                                      │   ││
│ │         │  │                                                                               │   ││
│ │         │  │  Layer 2: Publication Detection (HOMEPAGE SCRAPING)                           │   ││
│ │         │  │  ████████████████████████████ 28% (2,145 URLs)                                │   ││
│ │         │  │  Eliminated | Cost: $255 | Avg time: 0.8s                                     │   ││
│ │         │  │                                                                               │   ││
│ │         │  │  Layer 3: LLM Classification (FULL ANALYSIS)                                  │   ││
│ │         │  │  ████████ 8% (612 URLs)                                                       │   ││
│ │         │  │  Eliminated | Cost: $1,287 | Avg time: 3.2s                                   │   ││
│ │         │  │                                                                               │   ││
│ │         │  │  Manual Review: Human Decision Required                                       │   ││
│ │         │  │  ██████ 6% (1,248 URLs)                                                       │   ││
│ │         │  │  Reviewed | Approval Rate: 68%                                                │   ││
│ │         │  │                                                                               │   ││
│ │         │  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │   ││
│ │         │  │  💰 Cost Savings: $1,234 (Layer 1 + Layer 2 eliminations avoided LLM costs)  │   ││
│ │         │  │  ⚡ Efficiency: 86% of URLs eliminated before LLM (Layer 1 + Layer 2)         │   ││
│ │         │  │  🎯 Target: 90% elimination rate (current: 86%)                               │   ││
│ │         │  │                                                                               │   ││
│ │         │  └──────────────────────────────────────────────────────────────────────────────┘   ││
│ │         │                                                                                       ││
│ │         │  ┌────────────────────────────────────┬──────────────────────────────────────────┐  ││
│ │         │  │ 🕐 Review Time Distribution        │ 📈 Approval Rate Trend                    │  ││
│ │         │  ├────────────────────────────────────┼──────────────────────────────────────────┤  ││
│ │         │  │                                     │                                           │  ││
│ │         │  │  < 1hr:   ████████ 35% (437)       │  90%│        ╱────────╲                  │  ││
│ │         │  │  1-4hr:   ████████████ 45% (562)   │     │      ╱          ╲                  │  ││
│ │         │  │  4-8hr:   ████ 12% (150)            │  80%│    ╱            ╲    ╱──╲          │  ││
│ │         │  │  8-24hr:  ██ 5% (62)                │     │  ╱              ╲  ╱    ╲        │  ││
│ │         │  │  >24hr:   █ 3% (37)                 │  70%│╱                ╲╱      ╲        │  ││
│ │         │  │                                     │     │                          ╲        │  ││
│ │         │  │  📊 Average: 4.2 hours              │  60%├──────────────────────────────────>│  ││
│ │         │  │  🎯 Target: < 4 hours               │      1   5   10  15  20  25  30         │  ││
│ │         │  │  📉 Trend: -15% from last month     │                                           │  ││
│ │         │  │                                     │  Current Rate: 68% (↑ +5%)               │  ││
│ │         │  │                                     │  Target: > 70%                            │  ││
│ │         │  └────────────────────────────────────┴──────────────────────────────────────────┘  ││
│ └─────────┴───────────────────────────────────────────────────────────────────────────────────┬─┘│
│ │ ⚡ Analytics: 15,234 URLs processed  |  $1,542 total cost  |  $1,234 saved  |  86% efficiency │ │
│ └───────────────────────────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Specifications

### Date Range Selector
- **Position:** Top right, next to Export button
- **Options:**
  - Today
  - Last 7 Days
  - Last 30 Days (default)
  - Last 90 Days
  - Custom Range (opens calendar picker)
- **Display:** Shows selected range text
- **Update:** Re-fetches all analytics data on change

### Overview Cards (Top Row)
- **Layout:** 5-column grid (responsive: 3/2 on tablet, 2 cols on mobile)
- **Card Height:** 140px
- **Components per card:**
  - Icon (top-left, 32x32px, color-coded)
  - Label (below icon, text-sm, muted)
  - Primary Value (large, text-3xl, bold, center)
  - Secondary Label (text-xs, muted)
  - Delta/Trend (bottom, text-xs with arrow and color)
    - Green: Positive trend (↑)
    - Red: Negative trend (↓)
    - Gray: No change (→)
- **Real-time:** Refreshes every 30 seconds

### Queue Performance Trend Chart
- **Type:** Line chart (Recharts)
- **Dimensions:** Full width, 400px height
- **X-axis:** Days (1-30 for November)
- **Y-axis:** Count (0-60)
- **Lines:**
  1. Queue Size (blue, solid)
  2. Items Added (green, dashed)
  3. Items Reviewed (purple, dotted)
- **Legend:** Below chart
- **Insights Box:** Below legend with key metrics
- **Interactions:**
  - Hover: Show tooltip with exact values
  - Click legend: Toggle line visibility
  - Zoom: Not implemented (future feature)

### Confidence Band Distribution Chart
- **Type:** Bar chart (Recharts)
- **Dimensions:** 50% width (left column), 300px height
- **X-axis:** Bands (High, Medium, Low, Reject)
- **Y-axis:** Count (0-600)
- **Bars:** Color-coded by band
  - High: Green
  - Medium: Yellow
  - Low: Orange
  - Reject: Red
- **Labels:** Count on each bar
- **Insights:** Below chart (percentage breakdown)

### Cost Breakdown Chart
- **Type:** Area chart (Recharts)
- **Dimensions:** 50% width (right column), 300px height
- **X-axis:** Days (1-30)
- **Y-axis:** Cost ($0-$800)
- **Areas:** Stacked
  1. Gemini (bottom, blue)
  2. GPT (middle, purple)
  3. Scraping (top, green)
- **Legend:** Below chart with totals
- **Metrics:**
  - Avg Cost per URL
  - Cost Savings
  - Peak Cost Day

### Layer Performance Analysis
- **Type:** Horizontal stacked bar chart
- **Full width card**
- **Components:**
  - 4 horizontal bars (one per layer + manual review)
  - Each bar shows:
    - Layer name and description
    - Progress bar (filled percentage)
    - Percentage and count
    - Cost and avg time below
  - Summary metrics below:
    - Cost Savings (bold, green)
    - Efficiency percentage
    - Target vs actual

### Review Time Distribution
- **Type:** Horizontal bar chart (small)
- **Dimensions:** 50% width, 250px height
- **Bars:** Time buckets (<1hr, 1-4hr, 4-8hr, 8-24hr, >24hr)
- **Metrics:**
  - Average review time
  - Target
  - Trend vs last month

### Approval Rate Trend
- **Type:** Line chart (small)
- **Dimensions:** 50% width, 250px height
- **Line:** Approval rate over time
- **Current Rate:** Large text below chart
- **Target:** Dotted line at 70%

---

## Interactions

### Date Range Selection
1. **Click dropdown** → Show date range options
2. **Select range** → Update all charts and metrics
3. **Custom range** → Open calendar date picker
4. **URL updates** → Add date params: `?from=2025-11-01&to=2025-11-30`

### Export Button
1. **Click Export** → Open dropdown
2. **Options:**
   - Export Charts as PNG
   - Export Data as CSV
   - Export Data as JSON
   - Export Full Report (PDF) - future
3. **CSV includes:**
   - All metrics
   - Daily breakdown
   - Layer performance
   - Cost breakdown

### Chart Interactions
- **Hover data points** → Show tooltip with exact values
- **Click legend items** → Toggle data series visibility
- **No zooming** → Keep simple for v1

### Insight Boxes
- **Expandable** → Click to show more details (future)
- **Static** → Show key metrics only for now

---

## Data Flow

### Initial Load
1. Fetch analytics data: `GET /api/analytics?from=2025-11-01&to=2025-11-30`
2. Response includes:
   ```json
   {
     "overview": {
       "total_processed": 15234,
       "manual_reviews": 1248,
       "avg_review_time_hours": 4.2,
       "approval_rate": 0.68,
       "total_cost": 1542.18,
       "cost_savings": 1234.00,
       "queue_backlog": 24,
       "layer_efficiency": 0.86
     },
     "queue_trend": [ /* daily data */ ],
     "confidence_distribution": { /* band counts */ },
     "cost_breakdown": [ /* daily costs by provider */ ],
     "layer_performance": [ /* elimination by layer */ ],
     "review_time_distribution": { /* time buckets */ },
     "approval_rate_trend": [ /* daily approval rates */ ]
   }
   ```
3. Render all charts with data

### Date Range Change
1. Update URL params
2. Show loading overlay on charts
3. Fetch new data: `GET /api/analytics?from=...&to=...`
4. Update all charts with new data
5. Animate transitions (200ms)

### Real-Time Updates (Optional)
- Refresh overview cards every 30 seconds
- Do NOT refresh charts (static for selected date range)

---

## Backend Endpoints (NEW - To Be Implemented)

### GET /api/analytics
**Query Params:**
- `from` (date, required)
- `to` (date, required)

**Response:**
```json
{
  "overview": {
    "total_processed": 15234,
    "total_processed_delta_percent": 12,
    "manual_reviews": 1248,
    "manual_reviews_delta_percent": 8,
    "avg_review_time_hours": 4.2,
    "avg_review_time_delta_percent": -15,
    "approval_rate": 0.68,
    "approval_rate_delta_percent": 5,
    "total_cost": 1542.18,
    "total_cost_delta": -234.00,
    "queue_backlog": 24,
    "queue_backlog_delta": 4,
    "layer_efficiency": 0.86,
    "layer_efficiency_delta_percent": 2
  },
  "queue_trend": [
    {
      "date": "2025-11-01",
      "queue_size": 18,
      "items_added": 45,
      "items_reviewed": 40
    }
    // ... more days
  ],
  "confidence_distribution": {
    "high": 234,
    "medium": 456,
    "low": 78,
    "auto_reject": 0
  },
  "cost_breakdown": [
    {
      "date": "2025-11-01",
      "gemini_cost": 28.50,
      "gpt_cost": 12.30,
      "scraping_cost": 8.40
    }
    // ... more days
  ],
  "layer_performance": {
    "layer1": {
      "eliminated_count": 8834,
      "eliminated_percent": 58,
      "cost": 0,
      "avg_time_seconds": 0.05
    },
    "layer2": {
      "eliminated_count": 2145,
      "eliminated_percent": 28,
      "cost": 255.00,
      "avg_time_seconds": 0.8
    },
    "layer3": {
      "eliminated_count": 612,
      "eliminated_percent": 8,
      "cost": 1287.00,
      "avg_time_seconds": 3.2
    },
    "manual_review": {
      "count": 1248,
      "percent": 6,
      "approval_rate": 0.68
    }
  },
  "review_time_distribution": {
    "<1hr": 437,
    "1-4hr": 562,
    "4-8hr": 150,
    "8-24hr": 62,
    ">24hr": 37
  },
  "approval_rate_trend": [
    {
      "date": "2025-11-01",
      "approval_rate": 0.65
    }
    // ... more days
  ]
}
```

**Aggregation Logic:**
1. Query `jobs` table for date range
2. Query `results` table for processed URLs
3. Query `manual_review_queue` for reviews
4. Calculate deltas from previous period
5. Group by day for trends
6. Return aggregated data

---

## Responsive Breakpoints

### Tablet (768px - 1023px)
- Overview cards: 3 columns top row, 2 bottom row
- Charts: Stack vertically (1 column)
- Reduce chart heights to 300px

### Mobile (< 768px)
- Overview cards: 2 columns
- Charts: 1 column, reduced height (250px)
- Simplify chart legends (icons only)
- Layer performance: Vertical bars instead of horizontal

---

## Loading States

### Initial Load
```
All cards show skeleton:
┌─────────────────┐
│ ░░░░░░░░░░░░   │
│ ░░░░░░░░░░░░   │
│    ░░░░░░      │
│    ░░░░░       │
└─────────────────┘

Charts show loading spinners
```

### Date Range Change
- Show semi-transparent overlay on all charts
- Show loading spinner in center
- Fade in new data (200ms transition)

---

## Empty States

### No Data for Date Range
```
┌───────────────────────────────────────┐
│                                        │
│      📊 No data for selected range     │
│                                        │
│   No URLs were processed between       │
│   Nov 1-7, 2025                        │
│                                        │
│   Try selecting a different date range │
│                                        │
└───────────────────────────────────────┘
```

---

## Error States

### Failed to Load Analytics
```
┌───────────────────────────────────────┐
│  ⚠️ Failed to load analytics          │
│                                        │
│  Could not fetch analytics data.       │
│                                        │
│  [Retry] [View Error Details]         │
└───────────────────────────────────────┘
```

---

## Accessibility

- **ARIA Labels:** All charts, cards, buttons
- **Keyboard Navigation:** Tab through cards and controls
- **Screen Reader:** Announce chart data summaries
- **Color Contrast:** Chart colors meet WCAG AA
- **Focus Indicators:** Clear outlines on focusable elements

---

## Performance Targets

- **Initial Load:** < 2 seconds (data aggregation is complex)
- **Date Range Change:** < 1 second
- **Chart Render:** < 300ms
- **Export:** < 500ms for CSV/JSON

---

## Notes for Implementation

1. **Charts:** Recharts library for all visualizations
2. **Date Picker:** shadcn Calendar component
3. **Export:**
   - CSV: Use `json2csv` library
   - PNG: Use `html2canvas` for charts
4. **Backend:** New analytics endpoints to aggregate data
5. **Caching:** Cache analytics data for 5 minutes
6. **Optimization:** Pre-aggregate daily stats in database (cron job)
