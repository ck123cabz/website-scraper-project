import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { Database, UrlResult } from '@website-scraper/shared';

type JobInsert = Database['public']['Tables']['jobs']['Insert'];
type JobRow = Database['public']['Tables']['jobs']['Row'];

@Injectable()
export class JobsService {
  constructor(private readonly supabase: SupabaseService) {}

  async createJob(data: { name?: string; totalUrls?: number }): Promise<JobRow> {
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
      throw new Error(`Failed to create job: ${error.message}`);
    }

    return job;
  }

  async getJobById(id: string): Promise<JobRow | null> {
    const { data: job, error } = await this.supabase
      .getClient()
      .from('jobs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      throw new Error(`Failed to fetch job: ${error.message}`);
    }

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
    const { data: job, error } = await this.supabase
      .getClient()
      .from('jobs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update job: ${error.message}`);
    }

    return job;
  }

  async deleteJob(id: string): Promise<void> {
    const { error } = await this.supabase.getClient().from('jobs').delete().eq('id', id);

    if (error) {
      throw new Error(`Failed to delete job: ${error.message}`);
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
    const client = this.supabase.getClient();

    // Use RPC function with proper Postgres transaction for atomicity
    const { data, error } = await client
      .rpc('create_job_with_urls', {
        p_name: name || 'Untitled Job',
        p_urls: urls,
      })
      .single();

    if (error) {
      throw new Error(`Failed to create job with URLs: ${error.message}`);
    }

    if (!data) {
      throw new Error('No data returned from job creation');
    }

    // TypeScript doesn't know the RPC return type, so we cast it
    const jobId = (data as any).job_id as string;
    const urlIds = (data as any).url_ids as string[];

    if (!urlIds || urlIds.length === 0) {
      throw new Error('No URL IDs returned from job creation');
    }

    // Fetch the complete job record to get all fields
    const { data: job, error: fetchError } = await client
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (fetchError || !job) {
      throw new Error(`Failed to fetch created job: ${fetchError?.message || 'Job not found'}`);
    }

    // Log success for large uploads
    if (urls.length > 1000) {
      console.log(
        `[JobsService] Created job ${job.id} with ${urls.length} URLs using atomic transaction`,
      );
    }

    return { job, urlIds };
  }

  /**
   * Get paginated and filtered results for a job from url_results table
   * Task T044 [Phase 4 - User Story 2]
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
    let query = client
      .from('url_results')
      .select('*', { count: 'exact' })
      .eq('job_id', jobId);

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

    // Order by processed_at DESC (newest first)
    query = query.order('processed_at', { ascending: false });

    // Apply pagination
    query = query.range(offset, offset + normalizedPageSize - 1);

    // Execute query
    const { data: results, error, count } = await query;

    if (error) {
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
}
