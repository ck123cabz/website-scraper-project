import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { Database, UrlResult } from '@website-scraper/shared';

type JobInsert = Database['public']['Tables']['jobs']['Insert'];
type JobRow = Database['public']['Tables']['jobs']['Row'];

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async createJob(data: { name?: string; totalUrls?: number }): Promise<JobRow> {
    this.logger.log(
      `Creating new job: name="${data.name || 'Untitled Job'}", totalUrls=${data.totalUrls || 0}`,
    );

    try {
      const jobData: JobInsert = {
        name: data.name || 'Untitled Job',
        total_urls: data.totalUrls || 0,
        status: 'pending',
      };

      const { data: job, error } = await this.supabase
        .getClient()
        .from('jobs')
        .insert(jobData)
        .select()
        .single();

      if (error) {
        this.logger.error(`Failed to create job: ${error.message}`, error.stack);
        throw new Error(`Failed to create job: ${error.message}`);
      }

      this.logger.log(
        `Job created successfully: id=${job.id}, status=${job.status}, totalUrls=${job.total_urls}`,
      );
      this.logger.debug(`Job details: createdAt=${job.created_at}`);

      return job;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to create job: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async getJobById(id: string): Promise<JobRow | null> {
    this.logger.debug(`Fetching job: ${id}`);

    const { data: job, error } = await this.supabase
      .getClient()
      .from('jobs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        this.logger.warn(`Job not found: ${id}`);
        return null;
      }
      this.logger.error(`Failed to fetch job ${id}: ${error.message}`);
      throw new Error(`Failed to fetch job: ${error.message}`);
    }

    const progress =
      job.total_urls > 0 ? Math.round(((job.processed_urls || 0) / job.total_urls) * 100) : 0;

    this.logger.debug(
      `Job fetched: ${id}, status=${job.status}, progress=${progress}%, ${job.processed_urls || 0}/${job.total_urls} URLs`,
    );

    return job;
  }

  async getAllJobs(): Promise<JobRow[]> {
    const { data: jobs, error } = await this.supabase
      .getClient()
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch jobs: ${error.message}`);
    }

    return jobs || [];
  }

  async updateJob(id: string, updates: Partial<JobRow>): Promise<JobRow> {
    const updateFields = Object.keys(updates).join(', ');
    this.logger.log(`Updating job: id=${id}, fields=[${updateFields}]`);

    try {
      const { data: job, error } = await this.supabase
        .getClient()
        .from('jobs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        this.logger.error(`Failed to update job ${id}: ${error.message}`);
        throw new Error(`Failed to update job: ${error.message}`);
      }

      // Log specific important updates
      if (updates.status) {
        this.logger.log(`Job status updated: id=${id}, newStatus=${updates.status}`);
      }

      this.logger.debug(`Job updated successfully: id=${id}`);

      return job;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to update job ${id}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async deleteJob(id: string): Promise<void> {
    this.logger.log(`Deleting job: ${id}`);

    try {
      const { error } = await this.supabase.getClient().from('jobs').delete().eq('id', id);

      if (error) {
        this.logger.error(`Failed to delete job ${id}: ${error.message}`);
        throw new Error(`Failed to delete job: ${error.message}`);
      }

      this.logger.log(`Job deleted successfully: ${id}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to delete job ${id}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Create a job with URLs and bulk insert them into the job_urls table
   * M1 Fix: Uses Postgres RPC function for true atomic transaction
   * Returns both job and urlIds for queue processing
   */
  async createJobWithUrls(
    name: string,
    urls: string[],
  ): Promise<{ job: JobRow; urlIds: string[] }> {
    const startTime = performance.now();
    this.logger.log(`Creating job with URLs: name="${name}", urlCount=${urls.length}`);

    try {
      const client = this.supabase.getClient();

      // Use RPC function with proper Postgres transaction for atomicity
      const { data, error } = await client
        .rpc('create_job_with_urls', {
          p_name: name || 'Untitled Job',
          p_urls: urls,
        })
        .single();

      if (error) {
        this.logger.error(`Failed to create job with URLs: ${error.message}`);
        throw new Error(`Failed to create job with URLs: ${error.message}`);
      }

      if (!data) {
        this.logger.error('No data returned from job creation');
        throw new Error('No data returned from job creation');
      }

      // TypeScript doesn't know the RPC return type, so we cast it
      const jobId = (data as any).job_id as string;
      const urlIds = (data as any).url_ids as string[];

      if (!urlIds || urlIds.length === 0) {
        this.logger.error(`No URL IDs returned from job creation for job ${jobId}`);
        throw new Error('No URL IDs returned from job creation');
      }

      // Fetch the complete job record to get all fields
      const { data: job, error: fetchError } = await client
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (fetchError || !job) {
        this.logger.error(`Failed to fetch created job: ${fetchError?.message || 'Job not found'}`);
        throw new Error(`Failed to fetch created job: ${fetchError?.message || 'Job not found'}`);
      }

      const duration = performance.now() - startTime;

      this.logger.log(
        `Job with URLs created successfully: id=${job.id}, status=${job.status}, urlCount=${urls.length}, urlIdsCount=${urlIds.length} (${duration.toFixed(0)}ms)`,
      );

      // Log success for large uploads (more detailed than before)
      if (urls.length > 1000) {
        this.logger.log(
          `Large batch job created: ${job.id} with ${urls.length} URLs using atomic transaction (${duration.toFixed(0)}ms)`,
        );
      }

      return { job, urlIds };
    } catch (error) {
      const duration = performance.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to create job with URLs after ${duration.toFixed(0)}ms: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Get paginated and filtered results for a job from url_results table
   * Task T044 [Phase 4 - User Story 2]
   * Task T107 [Phase 8 - Performance Monitoring]
   *
   * Performance target: <500ms for query execution
   *
   * @param jobId - Job ID to fetch results for
   * @param page - Page number (1-indexed), defaults to 1
   * @param pageSize - Results per page, defaults to 20, max 100
   * @param filter - Status filter: 'approved' | 'rejected' | 'all', defaults to 'all'
   * @param layer - Layer filter: 'layer1' | 'layer2' | 'layer3' | 'passed_all' | 'all', defaults to 'all'
   * @param confidence - Confidence band filter: 'high' | 'medium' | 'low' | 'very-high' | 'very-low' | 'all', defaults to 'all'
   * @returns Paginated results with metadata
   * @throws Error if job doesn't exist or database query fails
   */
  async getJobResults(
    jobId: string,
    page: number = 1,
    pageSize: number = 20,
    filter?: 'approved' | 'rejected' | 'all',
    layer?: 'layer1' | 'layer2' | 'layer3' | 'passed_all' | 'all',
    confidence?: 'high' | 'medium' | 'low' | 'very-high' | 'very-low' | 'all',
  ): Promise<{
    results: UrlResult[];
    pagination: {
      total: number;
      page: number;
      pageSize: number;
      pages: number;
    };
  }> {
    this.logger.debug(
      `Querying job results: jobId=${jobId}, page=${page}, pageSize=${pageSize}, filter=${filter || 'all'}, layer=${layer || 'all'}, confidence=${confidence || 'all'}`,
    );

    // Validation: Verify job exists
    const job = await this.getJobById(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    // Validation: Enforce max pageSize of 100
    const normalizedPageSize = Math.min(pageSize || 20, 100);
    const normalizedPage = Math.max(page || 1, 1);

    // Calculate offset
    const offset = (normalizedPage - 1) * normalizedPageSize;

    const client = this.supabase.getClient();

    // Build query with count
    let query = client.from('url_results').select('*', { count: 'exact' }).eq('job_id', jobId);

    // Apply filter: status
    if (filter && filter !== 'all') {
      query = query.eq('status', filter);
    }

    // Apply filter: eliminated_at_layer
    if (layer && layer !== 'all') {
      query = query.eq('eliminated_at_layer', layer);
    }

    // Apply filter: confidence_band
    if (confidence && confidence !== 'all') {
      query = query.eq('confidence_band', confidence);
    }

    // Order by updated_at DESC (newest first)
    query = query.order('updated_at', { ascending: false });

    // Apply pagination
    query = query.range(offset, offset + normalizedPageSize - 1);

    // Execute query with timing
    const queryStart = performance.now();
    const { data: results, error, count } = await query;
    const queryDuration = performance.now() - queryStart;

    // Log query performance
    const target = 500; // 500ms target
    if (queryDuration > target) {
      this.logger.warn(
        `Query slow - getJobResults took ${queryDuration.toFixed(0)}ms (target: ${target}ms, returned ${results?.length || 0} rows)`,
      );
    } else {
      this.logger.debug(
        `Query fast - getJobResults took ${queryDuration.toFixed(0)}ms (returned ${results?.length || 0} rows)`,
      );
    }

    if (error) {
      this.logger.error(`Query failed: ${error.message}`);
      throw new Error(`Failed to fetch job results: ${error.message}`);
    }

    // Calculate total pages
    const total = count || 0;
    const pages = Math.ceil(total / normalizedPageSize);

    return {
      results: results || [],
      pagination: {
        total,
        page: normalizedPage,
        pageSize: normalizedPageSize,
        pages,
      },
    };
  }

  /**
   * Get complete factor data for a single URL result
   * Task T045 [Phase 4 - User Story 2]
   *
   * Retrieves complete UrlResult with all Layer 1/2/3 factor data.
   * Enforces job isolation - only returns result if it belongs to the specified job.
   *
   * Security: The dual eq() check (id + job_id) ensures that results can only be
   * accessed through their parent job, preventing cross-job data leakage.
   *
   * JSONB Handling: Supabase automatically parses JSONB columns (layer1_factors,
   * layer2_factors, layer3_factors) into JavaScript objects. NULL values are
   * preserved for pre-migration data.
   *
   * @param jobId - UUID of the job (security: ensures result belongs to this job)
   * @param resultId - UUID of the URL result
   * @returns Complete UrlResult with all fields and JSONB factor data, or null if not found
   * @throws Error if database query fails
   */
  async getResultDetails(jobId: string, resultId: string): Promise<any | null> {
    const client = this.supabase.getClient();

    // Query url_results with job isolation check
    // This ensures the result belongs to the requested job (security/isolation)
    const { data: result, error } = await client
      .from('url_results')
      .select('*')
      .eq('id', resultId)
      .eq('job_id', jobId)
      .single();

    // Handle not found or database errors
    if (error) {
      if (error.code === 'PGRST116') {
        // Result not found or doesn't belong to this job
        return null;
      }
      throw new Error(`Failed to fetch result details: ${error.message}`);
    }

    // Return complete result with all fields
    // Supabase automatically parses JSONB columns (layer1_factors, layer2_factors, layer3_factors)
    // All fields are returned as-is, including NULL values for pre-migration data
    return result;
  }

  /**
   * Get queue position for a job
   *
   * Returns the position (1-indexed) of a job in the queue, or null if the job
   * is not in the queue (processing, completed, or doesn't exist).
   *
   * Queue position is determined by created_at timestamp (oldest first = position 1).
   * Used by dashboard to display "Queued - position #3" for waiting jobs.
   *
   * @param jobId - UUID of the job
   * @returns Position number (1, 2, 3...) or null if not queued
   * @throws Error if database query fails
   */
  async getQueuePosition(jobId: string): Promise<number | null> {
    const client = this.supabase.getClient();

    // Get all jobs with 'queued' status, ordered by creation time (oldest first)
    const { data: queuedJobs, error } = await client
      .from('jobs')
      .select('id')
      .eq('status', 'queued')
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch queued jobs: ${error.message}`);
    }

    // If no queued jobs exist, return null
    if (!queuedJobs || queuedJobs.length === 0) {
      return null;
    }

    // Find the index of the requested job in the queued jobs list
    const jobIndex = queuedJobs.findIndex((job) => job.id === jobId);

    // If job not found in queue (not queued, or doesn't exist), return null
    if (jobIndex === -1) {
      return null;
    }

    // Return 1-indexed position (first job in queue = position 1)
    return jobIndex + 1;
  }

  /**
   * Get estimated wait time for a queued job
   * Task T073 [Phase 6 - Dashboard]
   *
   * Returns estimated wait time in seconds for jobs in the queue.
   * Returns null for jobs that are not queued (processing, completed, etc).
   *
   * Calculation Logic:
   * 1. Get queue position for the job (returns null if not queued)
   * 2. Calculate average processing time per URL from completed jobs in last 24 hours
   * 3. Estimate wait time: (jobs ahead × estimated job time) × 1.05 buffer
   * 4. Cap at 24 hours maximum (86400 seconds)
   * 5. Minimum wait time: 60 seconds (1 minute) if any wait
   *
   * Default Values (when no historical data):
   * - Average processing time: 30 seconds per URL
   *
   * @param jobId - UUID of the job
   * @returns Estimated wait time in seconds, or null if not queued
   * @throws Error if database query fails
   */
  async getEstimatedWaitTime(jobId: string): Promise<number | null> {
    // Get queue position - if null, job is not queued
    const queuePosition = await this.getQueuePosition(jobId);
    if (!queuePosition) {
      return null;
    }

    // Get the job details to know URL count
    const job = await this.getJobById(jobId);
    if (!job) {
      return null;
    }

    // Edge case: If job has 0 URLs, return minimum wait time
    if (job.total_urls === 0) {
      return 60;
    }

    // Calculate average seconds per URL from recent completed jobs
    const avgSecondsPerUrl = await this.getAverageSecondsPerUrl();

    // Estimate processing time for this specific job
    const estimatedJobTime = job.total_urls * avgSecondsPerUrl;

    // Calculate wait time based on jobs ahead in queue
    const jobsAhead = queuePosition - 1;

    // First in queue gets minimum wait time
    if (jobsAhead === 0) {
      return 60; // 1 minute minimum
    }

    // Calculate wait time with 5% buffer
    const waitSeconds = jobsAhead * estimatedJobTime * 1.05;

    // Cap at 24 hours maximum
    return Math.min(Math.round(waitSeconds), 86400);
  }

  /**
   * Calculate average processing time per URL from recent completed jobs
   * Helper method for getEstimatedWaitTime()
   *
   * Queries completed jobs from the last 24 hours and calculates:
   * - Average total processing time per job
   * - Average time per URL: (completedAt - createdAt) / urlCount
   *
   * @returns Average seconds per URL, or 30 (default) if no historical data
   * @private
   */
  private async getAverageSecondsPerUrl(): Promise<number> {
    const client = this.supabase.getClient();

    // Get completed jobs from the last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: completedJobs, error } = await client
      .from('jobs')
      .select('created_at, completed_at, total_urls')
      .eq('status', 'completed')
      .gte('completed_at', twentyFourHoursAgo)
      .not('completed_at', 'is', null)
      .gt('total_urls', 0); // Exclude jobs with 0 URLs

    if (error) {
      // If query fails, use default
      console.warn(`Failed to fetch completed jobs for estimation: ${error.message}`);
      return 30;
    }

    // If no completed jobs in last 24 hours, use default
    if (!completedJobs || completedJobs.length === 0) {
      return 30;
    }

    // Calculate average seconds per URL across all completed jobs
    let totalSecondsPerUrl = 0;
    let validJobCount = 0;

    for (const job of completedJobs) {
      if (!job.completed_at || !job.created_at) {
        continue;
      }

      const createdAt = new Date(job.created_at).getTime();
      const completedAt = new Date(job.completed_at).getTime();
      const processingTimeMs = completedAt - createdAt;

      // Skip jobs with negative or zero processing time (data integrity issues)
      if (processingTimeMs <= 0) {
        continue;
      }

      const processingTimeSeconds = processingTimeMs / 1000;
      const secondsPerUrl = processingTimeSeconds / job.total_urls;

      totalSecondsPerUrl += secondsPerUrl;
      validJobCount++;
    }

    // If no valid jobs found, use default
    if (validJobCount === 0) {
      return 30;
    }

    // Return average, but ensure it's at least 1 second per URL
    const average = totalSecondsPerUrl / validJobCount;
    return Math.max(Math.round(average), 1);
  }

  /**
   * Calculate progress percentage for a job
   * Task T072 [Phase 6 - Dashboard]
   *
   * Calculates the progress of a job based on completed URLs vs total URLs.
   * Used by the GET /jobs/queue/status endpoint to show real-time progress.
   *
   * Calculation: progress = (completedCount / totalUrlCount) * 100
   * - Returns integer percentage (0-100)
   * - Rounded to nearest integer using Math.round()
   * - Min value: 0, Max value: 100
   *
   * Edge Cases:
   * - totalUrlCount = 0: Returns 0 (avoid division by zero)
   * - completedCount >= totalUrlCount: Returns 100 (safety cap)
   * - Negative numbers: Returns 0 (shouldn't happen, but safety check)
   *
   * @param job - Job object with urlCount and completedCount properties
   * @returns Progress percentage (0-100)
   */
  calculateProgress(job: { urlCount: number; completedCount: number }): number {
    const { urlCount, completedCount } = job;

    // Edge case: Handle negative numbers (shouldn't happen, but safety check)
    if (urlCount < 0 || completedCount < 0) {
      return 0;
    }

    // Edge case: Avoid division by zero
    if (urlCount === 0) {
      return 0;
    }

    // Edge case: Safety cap at 100% if completed exceeds total
    if (completedCount >= urlCount) {
      return 100;
    }

    // Calculate progress percentage and round to nearest integer
    const progress = (completedCount / urlCount) * 100;
    return Math.round(progress);
  }

  /**
   * Get active jobs (processing + queued) for queue status endpoint
   * Task T072 [Phase 6 - Dashboard]
   *
   * Returns jobs with status 'processing' or 'pending' (which maps to 'queued' in the response).
   * Includes calculated progress, layer breakdown, and queue position/wait time for queued jobs.
   *
   * Order: Processing jobs first (oldest to newest), then queued jobs (oldest to newest).
   *
   * @param limit - Maximum number of jobs to return (default: 50)
   * @param offset - Pagination offset (default: 0)
   * @returns Array of active jobs with progress metrics
   */
  async getActiveJobs(limit: number = 50, offset: number = 0): Promise<any[]> {
    const client = this.supabase.getClient();

    // Query jobs with status 'processing' or 'pending' (queued)
    // Order: processing jobs first (by created_at ASC), then queued jobs (by created_at ASC)
    const { data: jobs, error } = await client
      .from('jobs')
      .select('*')
      .in('status', ['processing', 'pending'])
      .order('status', { ascending: false }) // processing comes before pending alphabetically
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch active jobs: ${error.message}`);
    }

    if (!jobs || jobs.length === 0) {
      return [];
    }

    // Get queue positions for queued jobs (only from pending jobs globally, not just from the paginated results)
    const { data: allQueuedJobs, error: queueError } = await client
      .from('jobs')
      .select('id, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (queueError) {
      throw new Error(`Failed to fetch queued jobs: ${queueError.message}`);
    }

    const queuePositions = new Map<string, number>();
    if (allQueuedJobs) {
      allQueuedJobs.forEach((job, index) => {
        queuePositions.set(job.id, index + 1);
      });
    }

    // Transform jobs to match API contract
    return jobs.map((job) => {
      const isQueued = job.status === 'pending';
      const status = isQueued ? 'queued' : 'processing';

      // Calculate progress: (completed_count / url_count) * 100
      const urlCount = job.total_urls || 0;
      const completedCount = job.processed_urls || 0;
      const progress = urlCount > 0 ? Math.round((completedCount / urlCount) * 100) : 0;

      // Get layer breakdown (count of URLs eliminated at each layer)
      const layer1 = job.layer1_eliminated || 0;
      const layer2 = job.layer2_eliminated || 0;
      const layer3 = job.layer3_classified || 0;

      // Queue position and estimated wait time (only for queued jobs)
      const queuePosition = isQueued ? queuePositions.get(job.id) || null : null;
      // Use simple heuristic: 5 minutes per position * 60 seconds
      const estimatedWaitTime = isQueued && queuePosition ? queuePosition * 300 : null;

      return {
        id: job.id,
        name: job.name || 'Untitled Job',
        status,
        progress,
        layerBreakdown: {
          layer1,
          layer2,
          layer3,
        },
        queuePosition,
        estimatedWaitTime,
        urlCount,
        completedCount,
        createdAt: job.created_at,
      };
    });
  }

  /**
   * Get recently completed jobs
   * Task T072 [Phase 6 - Dashboard]
   *
   * Returns jobs with status 'completed' from the last 24 hours.
   * Includes total cost and completion timestamp.
   *
   * @returns Array of completed jobs
   */
  async getCompletedJobs(): Promise<any[]> {
    const client = this.supabase.getClient();

    // Get completed jobs from the last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: jobs, error } = await client
      .from('jobs')
      .select('*')
      .eq('status', 'completed')
      .gte('completed_at', twentyFourHoursAgo)
      .order('completed_at', { ascending: false })
      .limit(10); // Limit to 10 most recent completed jobs

    if (error) {
      throw new Error(`Failed to fetch completed jobs: ${error.message}`);
    }

    if (!jobs || jobs.length === 0) {
      return [];
    }

    // Transform jobs to match API contract
    return jobs.map((job) => ({
      id: job.id,
      name: job.name || 'Untitled Job',
      status: 'completed',
      completedAt: job.completed_at,
      urlCount: job.total_urls || 0,
      totalCost: job.total_cost || 0,
    }));
  }
}
