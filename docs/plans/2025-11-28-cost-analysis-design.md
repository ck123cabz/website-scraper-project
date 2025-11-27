# Cost Analysis Feature Design

**Date:** 2025-11-28
**Status:** Approved

## Overview

Add granular cost analysis components to the Analytics page with four dimensions:
- Per-provider breakdown (ScrapingBee vs Gemini vs GPT)
- Per-job cost comparison
- Per-layer savings analysis (Layer 1/2 filtering ROI)
- Time-based cost trends

## Layout: Collapsible Sections

The Analytics page will use shadcn Accordion with 3 sections:

```
┌─────────────────────────────────────────────────┐
│ [▼] Performance Overview (expanded by default)   │
│     ├── 4 Metrics Cards                          │
│     ├── Success Rate + Processing Time charts    │
│     └── Activity Chart                           │
├─────────────────────────────────────────────────┤
│ [▼] Cost Analysis (expanded by default)          │
│     ├── 4 Cost Metrics Cards                     │
│     ├── Provider Breakdown Chart (donut)         │
│     ├── Cost Trend Chart (line)                  │
│     └── Layer Savings Funnel                     │
├─────────────────────────────────────────────────┤
│ [►] Job Cost Breakdown (collapsed by default)    │
│     └── Sortable table with expandable rows      │
└─────────────────────────────────────────────────┘
```

## Cost Metrics Cards

| Card | Value | Trend | Calculation |
|------|-------|-------|-------------|
| Total Spend | $XX.XX | vs last 30 days | sum(totalCost) across all jobs |
| Avg Cost/URL | $0.0XX | vs last 30 days | sum(totalCost) / sum(processedUrls) |
| Layer Savings | $XX.XX | percentage | eliminatedUrls × avgCostPerFullProcess |
| Cost Efficiency | XX% | trend | successfulUrls / totalCost |

### Layer Savings Calculation

```typescript
savedUrls = layer1EliminatedCount + layer2EliminatedCount
avgCostPerFullProcess = avgGeminiCost + avgGptCost + avgScrapingCost
layerSavings = savedUrls × avgCostPerFullProcess
```

## Charts

### 1. Provider Breakdown (Donut Chart)
- Recharts PieChart with inner radius (donut style)
- Three segments: Scraping, Gemini, GPT
- Center displays total spend
- Hover shows exact amounts and percentages
- Colors: Use existing HSL CSS variables for theming

### 2. Cost Trend (Line Chart)
- X-axis: dates (rolling 30 days by default, all-time available)
- Y-axis: cost in USD
- Recharts LineChart with responsive container
- Custom tooltip showing date and formatted cost

### 3. Layer Savings Funnel
- Visual funnel showing URL reduction through layers
- Each step: Total URLs → After Layer 1 → After Layer 2 → To Layer 3
- Shows count eliminated at each layer
- Bottom displays estimated $ saved and percentage

## Job Cost Breakdown Table

Sortable table with columns:
- Job Name
- Status (with badge)
- URLs processed
- Total Cost
- Cost per URL
- Estimated Savings
- Date

Features:
- Sortable columns (default: most recent first)
- Expandable rows showing provider breakdown per job
- Color coding: green (efficient), yellow (average), red (expensive)
- Pagination with "load more"

Expanded row shows:
- Provider breakdown: Scraping $X | Gemini $X | GPT $X
- Layer elimination counts

## Data Source

All required data already exists in job records:
- `totalCost`, `scrapingCost`, `geminiCost`, `gptCost`
- `avgCostPerUrl`, `estimatedSavings`
- `layer1EliminatedCount`, `layer2EliminatedCount`
- `processedUrls`, `successfulUrls`

**No backend changes required.**

## New Components

| Component | Location | Description |
|-----------|----------|-------------|
| `useCostAnalytics` | `hooks/use-cost-analytics.ts` | Hook for cost data aggregation |
| `ProviderBreakdownChart` | `components/analytics/ProviderBreakdownChart.tsx` | Donut chart |
| `CostTrendChart` | `components/analytics/CostTrendChart.tsx` | Line chart |
| `LayerSavingsFunnel` | `components/analytics/LayerSavingsFunnel.tsx` | Funnel visualization |
| `JobCostTable` | `components/analytics/JobCostTable.tsx` | Sortable table |
| `CollapsibleSection` | `components/analytics/CollapsibleSection.tsx` | Accordion wrapper |

## Hook Interface

```typescript
interface UseCostAnalyticsReturn {
  costMetrics: {
    totalSpend: number;
    avgCostPerUrl: number;
    layerSavings: number;
    costEfficiency: number;
    totalSpendTrend: number;
    avgCostPerUrlTrend: number;
  };
  providerBreakdown: Array<{ name: string; value: number; color: string }>;
  costTrends: Array<{ date: string; cost: number }>;
  layerFunnel: {
    totalUrls: number;
    layer1Eliminated: number;
    layer2Eliminated: number;
    remaining: number;
    estimatedSavings: number;
    savingsPercentage: number;
  };
  jobCosts: Array<{
    id: string;
    name: string;
    status: string;
    urls: number;
    totalCost: number;
    costPerUrl: number;
    savings: number;
    date: string;
    scrapingCost: number;
    geminiCost: number;
    gptCost: number;
    layer1Eliminated: number;
    layer2Eliminated: number;
  }>;
  isLoading: boolean;
  error: Error | null;
}
```

## Implementation Order

1. Create `useCostAnalytics` hook
2. Add `CollapsibleSection` wrapper component
3. Refactor `AnalyticsDashboard` to use collapsible sections
4. Add cost metrics cards (reuse existing `MetricsCard`)
5. Create `ProviderBreakdownChart`
6. Create `CostTrendChart`
7. Create `LayerSavingsFunnel`
8. Create `JobCostTable` with sorting and expandable rows
9. Test with real data
10. Verify responsive design
