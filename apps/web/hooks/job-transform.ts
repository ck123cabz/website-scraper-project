import type { Job } from '@website-scraper/shared';

export function transformJobFromDB(dbJob: any): Job {
  const processedUrls = dbJob.processed_urls || 0;
  const totalUrls = dbJob.total_urls || 0;
  const totalCost = Number(dbJob.total_cost) || 0;

  // Calculate derived cost fields (Story 1.5)
  const avgCostPerUrl = processedUrls > 0 ? totalCost / processedUrls : null;
  const projectedTotalCost =
    avgCostPerUrl !== null && totalUrls > 0 ? totalUrls * avgCostPerUrl : null;

  return {
    id: dbJob.id,
    name: dbJob.name,
    status: dbJob.status,
    totalUrls,
    processedUrls,
    successfulUrls: dbJob.successful_urls,
    failedUrls: dbJob.failed_urls,
    rejectedUrls: dbJob.rejected_urls,
    currentUrl: dbJob.current_url,
    currentStage: dbJob.current_stage,
    currentUrlStartedAt: dbJob.current_url_started_at,
    progressPercentage: Number(dbJob.progress_percentage),
    processingRate: dbJob.processing_rate ? Number(dbJob.processing_rate) : null,
    estimatedTimeRemaining: dbJob.estimated_time_remaining,
    totalCost,
    geminiCost: Number(dbJob.gemini_cost),
    gptCost: Number(dbJob.gpt_cost),
    avgCostPerUrl,
    projectedTotalCost,
    startedAt: dbJob.started_at,
    completedAt: dbJob.completed_at,
    createdAt: dbJob.created_at,
    updatedAt: dbJob.updated_at,
  };
}
