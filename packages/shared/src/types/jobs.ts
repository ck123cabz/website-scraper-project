/**
 * TypeScript interfaces for jobs table with archival support
 * Part of batch processing refactor (Phase 1, Task T010)
 *
 * These interfaces align with:
 * - Database schema: supabase/migrations/20251113000004_add_job_archival.sql
 * - Data model: specs/001-batch-processing-refactor/data-model.md
 *
 * Note: This is separate from the existing job.ts to support the new batch processing workflow.
 */

/**
 * Job Status Enum
 *
 * Lifecycle states for batch processing jobs:
 * - queued: Waiting for processing slot (system at max 5 concurrent jobs)
 * - running: Actively processing URLs
 * - paused: User manually paused (can be resumed)
 * - completed: All URLs processed successfully
 * - failed: Fatal error occurred (cannot be resumed)
 * - archived: Soft-deleted (hidden from dashboard)
 */
export type JobStatus = 'queued' | 'running' | 'paused' | 'completed' | 'failed' | 'archived';

/**
 * Batch Processing Job Record
 *
 * Represents a batch processing job with complete lifecycle tracking,
 * real-time progress metrics, and archival support.
 *
 * State transitions:
 * - queued → running (when job starts processing)
 * - running → paused (user pauses job)
 * - paused → running (user resumes job)
 * - running → completed (all URLs processed)
 * - running → failed (fatal error: database connection lost, invalid CSV format)
 * - Any state → archived (user manually archives or 90-day auto-archive)
 *
 * Archival lifecycle:
 * 1. Jobs completed > 90 days ago: Auto-archive (status='archived', archived_at=NOW())
 * 2. Archived jobs > 90 days old: Hard delete (CASCADE deletes url_results)
 * 3. Total retention: 180 days (90 days active + 90 days archived)
 */
export interface Job {
  /** Primary key (UUID) */
  id: string;

  /** User-provided job name */
  job_name: string;

  /** Current job status */
  status: JobStatus;

  /** When job was created */
  created_at: Date;

  /** When processing started (NULL if never started) */
  started_at: Date | null;

  /** When processing completed (NULL if not completed) */
  completed_at: Date | null;

  /**
   * When job was archived (soft-deleted)
   * NULL for active jobs
   * Jobs auto-archive 90 days after completion
   * Archived jobs hard-delete after another 90 days
   */
  archived_at: Date | null;

  /** Total number of URLs in this job */
  total_urls: number;

  /** Number of URLs processed so far */
  processed_urls: number;

  /** Number of URLs classified as accepted */
  accepted_count: number;

  /** Number of URLs classified as rejected */
  rejected_count: number;

  /** Number of URLs with permanent processing errors */
  error_count: number;

  /** Total cost in USD (scraping + LLM API calls) */
  total_cost: number;

  /** Number of URLs eliminated at Layer 1 */
  layer1_eliminated: number;

  /** Number of URLs eliminated at Layer 2 */
  layer2_eliminated: number;

  /** Number of URLs that reached Layer 3 classification */
  layer3_classified: number;

  /** Path to uploaded CSV file (NULL if not applicable) */
  csv_file_path: string | null;

  /** When record was last updated (auto-updated via trigger) */
  updated_at: Date;
}

/**
 * Job Creation Input
 *
 * Required fields for creating a new batch processing job.
 */
export interface CreateJobInput {
  /** User-provided job name */
  job_name: string;

  /** Total number of URLs in the job */
  total_urls: number;

  /** Optional path to uploaded CSV file */
  csv_file_path?: string;
}

/**
 * Job Progress Metrics
 *
 * Real-time progress information for dashboard display.
 * Calculated from Job data.
 */
export interface JobProgress {
  /** Job ID */
  job_id: string;

  /** Job name */
  job_name: string;

  /** Current status */
  status: JobStatus;

  /** Progress percentage (0-100) */
  progress_percentage: number;

  /** Processing rate in URLs per minute (NULL if not calculable) */
  processing_rate: number | null;

  /** Estimated time remaining in seconds (NULL if not calculable) */
  estimated_time_remaining: number | null;

  /** Queue position for queued jobs (NULL if not queued) */
  queue_position: number | null;

  /** Layer breakdown showing elimination funnel */
  layer_breakdown: {
    layer1_eliminated: number;
    layer2_eliminated: number;
    layer3_classified: number;
  };

  /** Cost metrics */
  cost_metrics: {
    total_cost: number;
    avg_cost_per_url: number;
    projected_total_cost: number | null;
  };
}
