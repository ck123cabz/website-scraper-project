import { useQuery } from '@tanstack/react-query';
import { useJobs } from './use-jobs';
import type { BatchJob as Job } from '@website-scraper/shared';
import { format, subDays, startOfDay } from 'date-fns';

export interface AnalyticsMetrics {
  totalJobs: number;
  successRate: number;
  successRateTrend: number; // Change from previous period (percentage points)
  averageProcessingTime: number; // In minutes
  averageProcessingTimeTrend: number; // Change from previous period (percentage)
  activeJobs: number;
}

export interface SuccessRateData {
  approved: number;
  rejected: number;
}

export interface ProcessingTimeData {
  date: string;
  avgTime: number; // In minutes
}

export interface ActivityData {
  date: string;
  jobsCompleted: number;
}

/**
 * Calculate analytics metrics from job data.
 * This function derives insights from the job list for display on the analytics dashboard.
 *
 * @see Story ui-overhaul-4 (Analytics & Settings) - Task 4
 */
function calculateMetrics(jobs: Job[]): AnalyticsMetrics {
  const now = new Date();
  const thirtyDaysAgo = subDays(now, 30);
  const sixtyDaysAgo = subDays(now, 60);

  // Filter jobs for different time periods
  const allJobs = jobs;
  const last30Days = jobs.filter((job) => new Date(job.created_at) >= thirtyDaysAgo);
  const previous30Days = jobs.filter(
    (job) =>
      new Date(job.created_at) >= sixtyDaysAgo && new Date(job.created_at) < thirtyDaysAgo
  );

  // Total jobs processed (all time)
  const totalJobs = allJobs.length;

  // Active jobs count (queued or processing)
  const activeJobs = allJobs.filter((job) =>
    ['queued', 'processing'].includes(job.status)
  ).length;

  // Success rate calculation (accepted URLs / total processed URLs)
  const completedJobs = allJobs.filter((job) => job.status === 'completed');
  const totalProcessed = completedJobs.reduce(
    (sum, job) => sum + (job.processed_urls || 0),
    0
  );
  const totalAccepted = completedJobs.reduce(
    (sum, job) => sum + (job.accepted_count || 0),
    0
  );
  const successRate = totalProcessed > 0 ? (totalAccepted / totalProcessed) * 100 : 0;

  // Success rate for previous period
  const prev30DaysCompleted = previous30Days.filter((job) => job.status === 'completed');
  const prevTotalProcessed = prev30DaysCompleted.reduce(
    (sum, job) => sum + (job.processed_urls || 0),
    0
  );
  const prevTotalAccepted = prev30DaysCompleted.reduce(
    (sum, job) => sum + (job.accepted_count || 0),
    0
  );
  const prevSuccessRate =
    prevTotalProcessed > 0 ? (prevTotalAccepted / prevTotalProcessed) * 100 : 0;
  const successRateTrend = successRate - prevSuccessRate;

  // Average processing time calculation (completed jobs only)
  const completedJobsWithTime = completedJobs.filter(
    (job) => job.completed_at && job.created_at
  );
  const totalProcessingTime = completedJobsWithTime.reduce((sum, job) => {
    const start = new Date(job.created_at).getTime();
    const end = new Date(job.completed_at!).getTime();
    const duration = (end - start) / (1000 * 60); // Convert to minutes
    return sum + duration;
  }, 0);
  const averageProcessingTime =
    completedJobsWithTime.length > 0
      ? totalProcessingTime / completedJobsWithTime.length
      : 0;

  // Average processing time for previous period
  const prev30DaysCompletedWithTime = prev30DaysCompleted.filter(
    (job) => job.completed_at && job.created_at
  );
  const prevTotalProcessingTime = prev30DaysCompletedWithTime.reduce((sum, job) => {
    const start = new Date(job.created_at).getTime();
    const end = new Date(job.completed_at!).getTime();
    const duration = (end - start) / (1000 * 60);
    return sum + duration;
  }, 0);
  const prevAvgProcessingTime =
    prev30DaysCompletedWithTime.length > 0
      ? prevTotalProcessingTime / prev30DaysCompletedWithTime.length
      : 0;
  const averageProcessingTimeTrend =
    prevAvgProcessingTime > 0
      ? ((averageProcessingTime - prevAvgProcessingTime) / prevAvgProcessingTime) * 100
      : 0;

  return {
    totalJobs,
    successRate,
    successRateTrend,
    averageProcessingTime,
    averageProcessingTimeTrend,
    activeJobs,
  };
}

/**
 * Calculate success/failure rate data for pie chart.
 */
function calculateSuccessRateData(jobs: Job[]): SuccessRateData {
  const completedJobs = jobs.filter((job) => job.status === 'completed');
  const totalAccepted = completedJobs.reduce(
    (sum, job) => sum + (job.accepted_count || 0),
    0
  );
  const totalRejected = completedJobs.reduce(
    (sum, job) => sum + (job.rejected_count || 0),
    0
  );

  return {
    approved: totalAccepted,
    rejected: totalRejected,
  };
}

/**
 * Calculate processing time trends for line chart (last 30 days).
 */
function calculateProcessingTimeTrends(jobs: Job[]): ProcessingTimeData[] {
  const now = new Date();
  const thirtyDaysAgo = subDays(now, 30);

  // Filter completed jobs in last 30 days
  const recentJobs = jobs.filter(
    (job) =>
      job.status === 'completed' &&
      job.completed_at &&
      job.created_at &&
      new Date(job.created_at) >= thirtyDaysAgo
  );

  // Group by date
  const dataByDate: Record<string, number[]> = {};
  recentJobs.forEach((job) => {
    const date = format(startOfDay(new Date(job.created_at)), 'yyyy-MM-dd');
    const start = new Date(job.created_at).getTime();
    const end = new Date(job.completed_at!).getTime();
    const duration = (end - start) / (1000 * 60); // Minutes

    if (!dataByDate[date]) {
      dataByDate[date] = [];
    }
    dataByDate[date].push(duration);
  });

  // Calculate average for each date and fill gaps
  const result: ProcessingTimeData[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = format(subDays(now, i), 'yyyy-MM-dd');
    const times = dataByDate[date] || [];
    const avgTime = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
    result.push({ date, avgTime });
  }

  return result;
}

/**
 * Calculate activity over time for bar chart (jobs completed per day, last 30 days).
 */
function calculateActivityTrends(jobs: Job[]): ActivityData[] {
  const now = new Date();
  const thirtyDaysAgo = subDays(now, 30);

  // Filter completed jobs in last 30 days
  const recentJobs = jobs.filter(
    (job) =>
      job.status === 'completed' &&
      job.completed_at &&
      new Date(job.completed_at) >= thirtyDaysAgo
  );

  // Group by completion date
  const countByDate: Record<string, number> = {};
  recentJobs.forEach((job) => {
    const date = format(startOfDay(new Date(job.completed_at!)), 'yyyy-MM-dd');
    countByDate[date] = (countByDate[date] || 0) + 1;
  });

  // Fill gaps for all 30 days
  const result: ActivityData[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = format(subDays(now, i), 'yyyy-MM-dd');
    const jobsCompleted = countByDate[date] || 0;
    result.push({ date, jobsCompleted });
  }

  return result;
}

/**
 * Fetch and compute analytics metrics from jobs data.
 * Uses the existing useJobs() hook and derives analytics calculations.
 *
 * @see Story ui-overhaul-4 (Analytics & Settings) - Task 4
 */
export function useAnalytics() {
  const { data: jobs, isLoading: jobsLoading, error: jobsError } = useJobs();

  const analyticsQuery = useQuery({
    queryKey: ['analytics', 'metrics'],
    queryFn: () => {
      if (!jobs) throw new Error('Jobs data not available');
      return calculateMetrics(jobs);
    },
    enabled: !!jobs,
    staleTime: 30 * 1000, // 30 seconds
  });

  const successRateQuery = useQuery({
    queryKey: ['analytics', 'success-rate'],
    queryFn: () => {
      if (!jobs) throw new Error('Jobs data not available');
      return calculateSuccessRateData(jobs);
    },
    enabled: !!jobs,
    staleTime: 30 * 1000,
  });

  const processingTimeTrendsQuery = useQuery({
    queryKey: ['analytics', 'processing-time-trends'],
    queryFn: () => {
      if (!jobs) throw new Error('Jobs data not available');
      return calculateProcessingTimeTrends(jobs);
    },
    enabled: !!jobs,
    staleTime: 30 * 1000,
  });

  const activityTrendsQuery = useQuery({
    queryKey: ['analytics', 'activity-trends'],
    queryFn: () => {
      if (!jobs) throw new Error('Jobs data not available');
      return calculateActivityTrends(jobs);
    },
    enabled: !!jobs,
    staleTime: 30 * 1000,
  });

  return {
    metrics: analyticsQuery.data,
    successRateData: successRateQuery.data,
    processingTimeTrends: processingTimeTrendsQuery.data,
    activityTrends: activityTrendsQuery.data,
    isLoading:
      jobsLoading ||
      analyticsQuery.isLoading ||
      successRateQuery.isLoading ||
      processingTimeTrendsQuery.isLoading ||
      activityTrendsQuery.isLoading,
    error: jobsError || analyticsQuery.error || successRateQuery.error,
  };
}
