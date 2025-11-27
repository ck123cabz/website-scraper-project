import { useQuery } from '@tanstack/react-query';
import { useJobs } from './use-jobs';
import type { Job } from '@website-scraper/shared';
import { format, subDays, startOfDay } from 'date-fns';

// Interfaces for cost analytics data
export interface CostMetrics {
  totalSpend: number;
  avgCostPerUrl: number;
  layerSavings: number;
  costEfficiency: number; // successful URLs per dollar spent
  totalSpendTrend: number; // percentage change vs previous 30 days
  avgCostPerUrlTrend: number;
}

export interface ProviderBreakdown {
  name: string;
  value: number;
  color: string;
}

export interface CostTrendData {
  date: string;
  cost: number;
}

export interface LayerFunnelData {
  totalUrls: number;
  layer1Eliminated: number;
  layer2Eliminated: number;
  remaining: number;
  estimatedSavings: number;
  savingsPercentage: number;
}

export interface JobCostData {
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
}

// Provider colors using HSL CSS variables for theme compatibility
const PROVIDER_COLORS = {
  Scraping: 'hsl(var(--chart-1))',
  Gemini: 'hsl(var(--chart-2))',
  GPT: 'hsl(var(--chart-3))',
};

/**
 * Calculate cost metrics from job data.
 */
function calculateCostMetrics(jobs: Job[]): CostMetrics {
  const now = new Date();
  const thirtyDaysAgo = subDays(now, 30);
  const sixtyDaysAgo = subDays(now, 60);

  // Filter jobs by time periods
  const last30Days = jobs.filter((job) => new Date(job.createdAt) >= thirtyDaysAgo);
  const previous30Days = jobs.filter(
    (job) =>
      new Date(job.createdAt) >= sixtyDaysAgo && new Date(job.createdAt) < thirtyDaysAgo
  );

  // Calculate totals for all jobs
  const totalSpend = jobs.reduce((sum, job) => sum + (job.totalCost || 0), 0);
  const totalProcessedUrls = jobs.reduce((sum, job) => sum + (job.processedUrls || 0), 0);
  const totalSuccessfulUrls = jobs.reduce((sum, job) => sum + (job.successfulUrls || 0), 0);

  const avgCostPerUrl = totalProcessedUrls > 0 ? totalSpend / totalProcessedUrls : 0;

  // Calculate layer savings
  const totalLayer1Eliminated = jobs.reduce(
    (sum, job) => sum + (job.layer1EliminatedCount || 0),
    0
  );
  const totalLayer2Eliminated = jobs.reduce(
    (sum, job) => sum + (job.layer2EliminatedCount || 0),
    0
  );
  const eliminatedUrls = totalLayer1Eliminated + totalLayer2Eliminated;

  // Estimate cost per full process (what it would cost to process one URL through all layers)
  // Use actual average costs if available, otherwise estimate
  const avgScrapingCostPerUrl = totalProcessedUrls > 0
    ? jobs.reduce((sum, job) => sum + (job.scrapingCost || 0), 0) / totalProcessedUrls
    : 0.005; // Default estimate
  const avgGeminiCostPerUrl = totalProcessedUrls > 0
    ? jobs.reduce((sum, job) => sum + (job.geminiCost || 0), 0) / totalProcessedUrls
    : 0.002;
  const avgGptCostPerUrl = totalProcessedUrls > 0
    ? jobs.reduce((sum, job) => sum + (job.gptCost || 0), 0) / totalProcessedUrls
    : 0.008;

  const estimatedCostPerFullProcess = avgScrapingCostPerUrl + avgGeminiCostPerUrl + avgGptCostPerUrl;
  const layerSavings = eliminatedUrls * estimatedCostPerFullProcess;

  // Cost efficiency: successful URLs per dollar spent (higher is better)
  const costEfficiency = totalSpend > 0 ? totalSuccessfulUrls / totalSpend : 0;

  // Calculate trends (last 30 days vs previous 30 days)
  const last30DaysSpend = last30Days.reduce((sum, job) => sum + (job.totalCost || 0), 0);
  const prev30DaysSpend = previous30Days.reduce((sum, job) => sum + (job.totalCost || 0), 0);
  const totalSpendTrend =
    prev30DaysSpend > 0 ? ((last30DaysSpend - prev30DaysSpend) / prev30DaysSpend) * 100 : 0;

  const last30DaysProcessed = last30Days.reduce((sum, job) => sum + (job.processedUrls || 0), 0);
  const prev30DaysProcessed = previous30Days.reduce(
    (sum, job) => sum + (job.processedUrls || 0),
    0
  );
  const last30DaysAvgCost = last30DaysProcessed > 0 ? last30DaysSpend / last30DaysProcessed : 0;
  const prev30DaysAvgCost = prev30DaysProcessed > 0 ? prev30DaysSpend / prev30DaysProcessed : 0;
  const avgCostPerUrlTrend =
    prev30DaysAvgCost > 0
      ? ((last30DaysAvgCost - prev30DaysAvgCost) / prev30DaysAvgCost) * 100
      : 0;

  return {
    totalSpend,
    avgCostPerUrl,
    layerSavings,
    costEfficiency,
    totalSpendTrend,
    avgCostPerUrlTrend,
  };
}

/**
 * Calculate provider breakdown for donut chart.
 */
function calculateProviderBreakdown(jobs: Job[]): ProviderBreakdown[] {
  const scrapingTotal = jobs.reduce((sum, job) => sum + (job.scrapingCost || 0), 0);
  const geminiTotal = jobs.reduce((sum, job) => sum + (job.geminiCost || 0), 0);
  const gptTotal = jobs.reduce((sum, job) => sum + (job.gptCost || 0), 0);

  return [
    { name: 'Scraping', value: scrapingTotal, color: PROVIDER_COLORS.Scraping },
    { name: 'Gemini', value: geminiTotal, color: PROVIDER_COLORS.Gemini },
    { name: 'GPT', value: gptTotal, color: PROVIDER_COLORS.GPT },
  ].filter((item) => item.value > 0); // Only show providers with costs
}

/**
 * Calculate daily cost trends for line chart (last 30 days).
 */
function calculateCostTrends(jobs: Job[]): CostTrendData[] {
  const now = new Date();
  const thirtyDaysAgo = subDays(now, 30);

  // Filter jobs from last 30 days
  const recentJobs = jobs.filter((job) => new Date(job.createdAt) >= thirtyDaysAgo);

  // Group costs by date
  const costByDate: Record<string, number> = {};
  recentJobs.forEach((job) => {
    const date = format(startOfDay(new Date(job.createdAt)), 'yyyy-MM-dd');
    costByDate[date] = (costByDate[date] || 0) + (job.totalCost || 0);
  });

  // Fill all 30 days
  const result: CostTrendData[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = format(subDays(now, i), 'yyyy-MM-dd');
    const cost = costByDate[date] || 0;
    result.push({ date, cost });
  }

  return result;
}

/**
 * Calculate layer funnel data for visualization.
 */
function calculateLayerFunnel(jobs: Job[]): LayerFunnelData {
  const totalUrls = jobs.reduce((sum, job) => sum + (job.totalUrls || 0), 0);
  const layer1Eliminated = jobs.reduce((sum, job) => sum + (job.layer1EliminatedCount || 0), 0);
  const layer2Eliminated = jobs.reduce((sum, job) => sum + (job.layer2EliminatedCount || 0), 0);
  const remaining = totalUrls - layer1Eliminated - layer2Eliminated;

  // Calculate estimated savings
  const totalProcessedUrls = jobs.reduce((sum, job) => sum + (job.processedUrls || 0), 0);
  const totalSpend = jobs.reduce((sum, job) => sum + (job.totalCost || 0), 0);
  const avgCostPerUrl = totalProcessedUrls > 0 ? totalSpend / totalProcessedUrls : 0.015;

  const eliminatedUrls = layer1Eliminated + layer2Eliminated;
  const estimatedSavings = eliminatedUrls * avgCostPerUrl;
  const savingsPercentage = totalUrls > 0 ? (eliminatedUrls / totalUrls) * 100 : 0;

  return {
    totalUrls,
    layer1Eliminated,
    layer2Eliminated,
    remaining,
    estimatedSavings,
    savingsPercentage,
  };
}

/**
 * Calculate per-job cost data for table.
 */
function calculateJobCosts(jobs: Job[]): JobCostData[] {
  return jobs
    .map((job) => ({
      id: job.id,
      name: job.name || `Job ${job.id.slice(0, 8)}`,
      status: job.status,
      urls: job.processedUrls || 0,
      totalCost: job.totalCost || 0,
      costPerUrl: job.processedUrls > 0 ? (job.totalCost || 0) / job.processedUrls : 0,
      savings: job.estimatedSavings || 0,
      date: job.createdAt,
      scrapingCost: job.scrapingCost || 0,
      geminiCost: job.geminiCost || 0,
      gptCost: job.gptCost || 0,
      layer1Eliminated: job.layer1EliminatedCount || 0,
      layer2Eliminated: job.layer2EliminatedCount || 0,
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Most recent first
}

/**
 * Hook to fetch and compute cost analytics from jobs data.
 */
export function useCostAnalytics() {
  const { data: jobs, isLoading: jobsLoading, error: jobsError } = useJobs();

  const costMetricsQuery = useQuery({
    queryKey: ['analytics', 'cost-metrics'],
    queryFn: () => {
      if (!jobs) throw new Error('Jobs data not available');
      return calculateCostMetrics(jobs);
    },
    enabled: !!jobs,
    staleTime: 30 * 1000,
  });

  const providerBreakdownQuery = useQuery({
    queryKey: ['analytics', 'provider-breakdown'],
    queryFn: () => {
      if (!jobs) throw new Error('Jobs data not available');
      return calculateProviderBreakdown(jobs);
    },
    enabled: !!jobs,
    staleTime: 30 * 1000,
  });

  const costTrendsQuery = useQuery({
    queryKey: ['analytics', 'cost-trends'],
    queryFn: () => {
      if (!jobs) throw new Error('Jobs data not available');
      return calculateCostTrends(jobs);
    },
    enabled: !!jobs,
    staleTime: 30 * 1000,
  });

  const layerFunnelQuery = useQuery({
    queryKey: ['analytics', 'layer-funnel'],
    queryFn: () => {
      if (!jobs) throw new Error('Jobs data not available');
      return calculateLayerFunnel(jobs);
    },
    enabled: !!jobs,
    staleTime: 30 * 1000,
  });

  const jobCostsQuery = useQuery({
    queryKey: ['analytics', 'job-costs'],
    queryFn: () => {
      if (!jobs) throw new Error('Jobs data not available');
      return calculateJobCosts(jobs);
    },
    enabled: !!jobs,
    staleTime: 30 * 1000,
  });

  return {
    costMetrics: costMetricsQuery.data,
    providerBreakdown: providerBreakdownQuery.data,
    costTrends: costTrendsQuery.data,
    layerFunnel: layerFunnelQuery.data,
    jobCosts: jobCostsQuery.data,
    isLoading:
      jobsLoading ||
      costMetricsQuery.isLoading ||
      providerBreakdownQuery.isLoading ||
      costTrendsQuery.isLoading ||
      layerFunnelQuery.isLoading ||
      jobCostsQuery.isLoading,
    error:
      jobsError ||
      costMetricsQuery.error ||
      providerBreakdownQuery.error ||
      costTrendsQuery.error ||
      layerFunnelQuery.error ||
      jobCostsQuery.error,
  };
}
