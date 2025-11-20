import type { Job } from '@website-scraper/shared';

/**
 * Transform job data from API response to Job interface.
 * Note: API client (api-client.ts) already transforms snake_case to camelCase via interceptor,
 * so we receive and work with camelCase properties here.
 */
export function transformJobFromDB(dbJob: any): Job {
  const processedUrls = dbJob.processedUrls || 0;
  const totalUrls = dbJob.totalUrls || 0;
  const totalCost = Number(dbJob.totalCost) || 0;

  // Calculate derived cost fields
  const avgCostPerUrl = processedUrls > 0 ? totalCost / processedUrls : null;
  const projectedTotalCost =
    avgCostPerUrl !== null && totalUrls > 0 ? totalUrls * avgCostPerUrl : null;

  // Transform currentUrls array if present (for real-time processing display)
  // Note: Job interface expects snake_case 'started_at', so we convert back from camelCase
  const currentUrls = dbJob.currentUrls?.map((entry: any) => ({
    url: entry.url,
    layer: entry.layer,
    started_at: entry.startedAt,
  })) || null;

  return {
    id: dbJob.id,
    name: dbJob.name,
    status: dbJob.status,
    totalUrls: totalUrls,
    processedUrls: processedUrls,
    successfulUrls: dbJob.successfulUrls || 0,
    failedUrls: dbJob.failedUrls || 0,
    rejectedUrls: dbJob.rejectedUrls || 0,
    currentUrl: dbJob.currentUrl,
    currentStage: dbJob.currentStage,
    currentUrlStartedAt: dbJob.currentUrlStartedAt,
    currentLayer: dbJob.currentLayer,
    currentUrls: currentUrls,
    progressPercentage: dbJob.progressPercentage || 0,
    processingRate: dbJob.processingRate,
    estimatedTimeRemaining: dbJob.estimatedTimeRemaining,
    totalCost: totalCost,
    scrapingCost: dbJob.scrapingCost || 0,
    geminiCost: dbJob.geminiCost || 0,
    gptCost: dbJob.gptCost || 0,
    estimatedSavings: dbJob.estimatedSavings || 0,
    avgCostPerUrl: avgCostPerUrl,
    projectedTotalCost: projectedTotalCost,
    layer1EliminatedCount: dbJob.layer1EliminatedCount || 0,
    layer2EliminatedCount: dbJob.layer2EliminatedCount || 0,
    startedAt: dbJob.startedAt,
    completedAt: dbJob.completedAt,
    createdAt: dbJob.createdAt,
    updatedAt: dbJob.updatedAt,
  };
}
