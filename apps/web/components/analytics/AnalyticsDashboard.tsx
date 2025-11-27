'use client';

import { useAnalytics } from '@/hooks/use-analytics';
import { useCostAnalytics } from '@/hooks/use-cost-analytics';
import { MetricsCard } from './MetricsCard';
import { SuccessRateChart } from './SuccessRateChart';
import { ProcessingTimeChart } from './ProcessingTimeChart';
import { ActivityChart } from './ActivityChart';
import { ProviderBreakdownChart } from './ProviderBreakdownChart';
import { CostTrendChart } from './CostTrendChart';
import { LayerSavingsFunnel } from './LayerSavingsFunnel';
import { JobCostTable } from './JobCostTable';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  Activity,
  DollarSign,
  Wallet,
  PiggyBank,
  Target,
} from 'lucide-react';

/**
 * AnalyticsDashboard component - Main analytics dashboard with collapsible sections
 * for Performance Overview, Cost Analysis, and Job Cost Breakdown.
 */
export function AnalyticsDashboard() {
  const { metrics, successRateData, processingTimeTrends, activityTrends, isLoading, error } =
    useAnalytics();

  const {
    costMetrics,
    providerBreakdown,
    costTrends,
    layerFunnel,
    jobCosts,
    isLoading: costLoading,
    error: costError,
  } = useCostAnalytics();

  if (error || costError) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">
          Failed to load analytics data. Please try again later.
        </p>
      </div>
    );
  }

  return (
    <Accordion
      type="multiple"
      defaultValue={['performance', 'cost-analysis']}
      className="space-y-4"
    >
      {/* Performance Overview Section */}
      <AccordionItem value="performance" className="border rounded-lg px-4">
        <AccordionTrigger className="text-lg font-semibold hover:no-underline">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Performance Overview
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-6 pt-2">
            {/* Metrics Cards Row */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <MetricsCard
                title="Total Jobs Processed"
                value={metrics?.totalJobs ?? 0}
                icon={<TrendingUp className="h-4 w-4" />}
                isLoading={isLoading}
                format="number"
              />
              <MetricsCard
                title="Success Rate"
                value={metrics?.successRate ?? 0}
                trend={metrics?.successRateTrend}
                trendLabel="vs last 30 days"
                icon={<CheckCircle2 className="h-4 w-4" />}
                isLoading={isLoading}
                format="percentage"
              />
              <MetricsCard
                title="Avg Processing Time"
                value={metrics?.averageProcessingTime ?? 0}
                trend={metrics?.averageProcessingTimeTrend}
                trendLabel="vs last 30 days"
                icon={<Clock className="h-4 w-4" />}
                isLoading={isLoading}
                format="duration"
              />
              <MetricsCard
                title="Active Jobs"
                value={metrics?.activeJobs ?? 0}
                icon={<Activity className="h-4 w-4" />}
                isLoading={isLoading}
                format="number"
              />
            </div>

            {/* Charts Grid */}
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
              <SuccessRateChart data={successRateData} isLoading={isLoading} />
              <ProcessingTimeChart data={processingTimeTrends} isLoading={isLoading} />
            </div>

            {/* Full-width Activity Chart */}
            <ActivityChart data={activityTrends} isLoading={isLoading} />
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Cost Analysis Section */}
      <AccordionItem value="cost-analysis" className="border rounded-lg px-4">
        <AccordionTrigger className="text-lg font-semibold hover:no-underline">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-500" />
            Cost Analysis
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-6 pt-2">
            {/* Cost Metrics Cards Row */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <MetricsCard
                title="Total Spend"
                value={costMetrics?.totalSpend ?? 0}
                trend={costMetrics?.totalSpendTrend}
                trendLabel="vs last 30 days"
                icon={<Wallet className="h-4 w-4" />}
                isLoading={costLoading}
                format="currency"
              />
              <MetricsCard
                title="Avg Cost per URL"
                value={costMetrics?.avgCostPerUrl ?? 0}
                trend={costMetrics?.avgCostPerUrlTrend}
                trendLabel="vs last 30 days"
                icon={<DollarSign className="h-4 w-4" />}
                isLoading={costLoading}
                format="currencySmall"
              />
              <MetricsCard
                title="Layer Savings"
                value={costMetrics?.layerSavings ?? 0}
                icon={<PiggyBank className="h-4 w-4" />}
                isLoading={costLoading}
                format="currency"
              />
              <MetricsCard
                title="Cost Efficiency"
                value={costMetrics?.costEfficiency ?? 0}
                icon={<Target className="h-4 w-4" />}
                isLoading={costLoading}
                format="number"
              />
            </div>

            {/* Cost Charts Grid */}
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
              <ProviderBreakdownChart data={providerBreakdown} isLoading={costLoading} />
              <CostTrendChart data={costTrends} isLoading={costLoading} />
            </div>

            {/* Layer Savings Funnel */}
            <LayerSavingsFunnel data={layerFunnel} isLoading={costLoading} />
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Job Cost Breakdown Section (collapsed by default) */}
      <AccordionItem value="job-breakdown" className="border rounded-lg px-4">
        <AccordionTrigger className="text-lg font-semibold hover:no-underline">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            Job Cost Breakdown
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="pt-2">
            <JobCostTable data={jobCosts} isLoading={costLoading} />
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
