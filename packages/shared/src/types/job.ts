export type JobStatus = 'pending' | 'processing' | 'paused' | 'completed' | 'failed' | 'cancelled';
export type ProcessingStage = 'fetching' | 'filtering' | 'classifying';

export interface Job {
  id: string;
  name: string | null;
  status: JobStatus;
  totalUrls: number;
  processedUrls: number;
  successfulUrls: number;
  failedUrls: number;
  rejectedUrls: number;
  currentUrl: string | null;
  currentStage: ProcessingStage | null;
  currentUrlStartedAt: string | null;
  currentLayer: number | null; // Current layer being processed (1, 2, or 3)
  currentUrls: Array<{
    url: string;
    layer: 1 | 2 | 3;
    started_at: string;
  }> | null; // Array of currently processing URLs (up to 10)
  progressPercentage: number;
  processingRate: number | null; // URLs per minute
  estimatedTimeRemaining: number | null; // seconds

  // Cost tracking
  totalCost: number;
  scrapingCost: number; // ScrapingBee API costs
  geminiCost: number;
  gptCost: number;
  estimatedSavings: number; // Cost savings from Layer 1/2 eliminations
  avgCostPerUrl: number | null; // totalCost / processedUrls
  projectedTotalCost: number | null; // totalUrls * avgCostPerUrl

  // Layer breakdown
  layer1EliminatedCount: number; // URLs eliminated at Layer 1 (domain analysis)
  layer2EliminatedCount: number; // URLs eliminated at Layer 2 (operational filtering)

  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
