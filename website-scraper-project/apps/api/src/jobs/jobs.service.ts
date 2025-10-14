import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { Database } from '@website-scraper/shared';

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
}
