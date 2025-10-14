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
  progressPercentage: number;
  processingRate: number | null; // URLs per minute
  estimatedTimeRemaining: number | null; // seconds
  totalCost: number;
  geminiCost: number;
  gptCost: number;
  avgCostPerUrl: number | null; // totalCost / processedUrls
  projectedTotalCost: number | null; // totalUrls * avgCostPerUrl
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
