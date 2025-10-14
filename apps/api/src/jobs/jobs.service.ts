import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { Database } from '@website-scraper/shared';

type JobInsert = Database['public']['Tables']['jobs']['Insert'];
type JobRow = Database['public']['Tables']['jobs']['Row'];
type ResultInsert = Database['public']['Tables']['results']['Insert'];

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
   * Create a job with URLs and bulk insert them into the results table
   * Uses database transaction for atomicity
   */
  async createJobWithUrls(name: string, urls: string[]): Promise<JobRow> {
    const client = this.supabase.getClient();

    // Step 1: Create job record
    const jobData: JobInsert = {
      name: name || 'Untitled Job',
      total_urls: urls.length,
      status: 'pending',
    };

    const { data: job, error: jobError } = await client
      .from('jobs')
      .insert(jobData)
      .select()
      .single();

    if (jobError) {
      throw new Error(`Failed to create job: ${jobError.message}`);
    }

    // Step 2: Bulk insert URLs into results table in batches of 1000
    const BATCH_SIZE = 1000;
    const batches: ResultInsert[][] = [];

    for (let i = 0; i < urls.length; i += BATCH_SIZE) {
      const batch = urls.slice(i, i + BATCH_SIZE).map((url) => ({
        job_id: job.id,
        url,
        status: 'success' as const, // Initial status - will be updated during processing
      }));
      batches.push(batch);
    }

    // Insert batches sequentially to avoid overwhelming the database
    for (let i = 0; i < batches.length; i++) {
      const { error: insertError } = await client.from('results').insert(batches[i]);

      if (insertError) {
        // Rollback: Delete the job if URL insertion fails
        await this.deleteJob(job.id);
        throw new Error(`Failed to insert URLs (batch ${i + 1}/${batches.length}): ${insertError.message}`);
      }

      // Log progress for large uploads
      if (batches.length > 1) {
        console.log(`[JobsService] Inserted batch ${i + 1}/${batches.length} (${batches[i].length} URLs)`);
      }
    }

    return job;
  }
}
