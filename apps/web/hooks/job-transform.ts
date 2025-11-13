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
    job_name: dbJob.job_name,
    status: dbJob.status,
    created_at: dbJob.created_at,
    started_at: dbJob.started_at,
    completed_at: dbJob.completed_at,
    archived_at: dbJob.archived_at,
    total_urls: totalUrls,
    processed_urls: processedUrls,
    accepted_count: dbJob.accepted_count || 0,
    rejected_count: dbJob.rejected_count || 0,
    error_count: dbJob.error_count || 0,
    total_cost: totalCost,
    layer1_eliminated: dbJob.layer1_eliminated || 0,
    layer2_eliminated: dbJob.layer2_eliminated || 0,
    layer3_classified: dbJob.layer3_classified || 0,
    csv_file_path: dbJob.csv_file_path || null,
    updated_at: dbJob.updated_at,
  };
}
