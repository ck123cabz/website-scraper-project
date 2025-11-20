'use client';

import { useAnalytics } from '@/hooks/use-analytics';
import { MetricsCard } from './MetricsCard';
import { SuccessRateChart } from './SuccessRateChart';
import { ProcessingTimeChart } from './ProcessingTimeChart';
import { ActivityChart } from './ActivityChart';
import { TrendingUp, CheckCircle2, Clock, Activity } from 'lucide-react';

/**
 * AnalyticsDashboard component - Main analytics dashboard that composes
 * all metrics cards and charts for the analytics page.
 *
 * @see Story ui-overhaul-4 (Analytics & Settings) - Task 8
 */
export function AnalyticsDashboard() {
  const { metrics, successRateData, processingTimeTrends, activityTrends, isLoading, error } =
    useAnalytics();

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">
          Failed to load analytics data. Please try again later.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
  );
}
