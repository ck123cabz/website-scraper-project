/**
 * BullMQ worker types for URL processing
 * Story 2.5: Worker Processing & Real-Time Updates
 */

export interface UrlJobData {
  /** Job ID from database */
  jobId: string;
  /** URL to process */
  url: string;
  /** URL ID from database (for result linking) */
  urlId: string;
}

export type WorkerStatus =
  | 'pending'
  | 'processing'
  | 'paused'
  | 'completed'
  | 'cancelled';

export type ProcessingStage =
  | 'fetching'
  | 'extracting'
  | 'filtering'
  | 'classifying'
  | 'storing'
  | 'completed';

export interface WorkerProgress {
  /** Current URL being processed */
  currentUrl: string;
  /** Current processing stage */
  currentStage: ProcessingStage;
  /** When current URL processing started */
  currentUrlStartedAt: Date;
  /** Number of URLs processed */
  processedUrls: number;
  /** Total URLs in job */
  totalUrls: number;
  /** Processing progress percentage */
  progressPercentage: number;
}
