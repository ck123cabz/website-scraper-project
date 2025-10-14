import { SupabaseService } from '../supabase/supabase.service';
import { Database } from '@website-scraper/shared';
type JobRow = Database['public']['Tables']['jobs']['Row'];
export declare class JobsService {
    private readonly supabase;
    constructor(supabase: SupabaseService);
    createJob(data: {
        name?: string;
        totalUrls?: number;
    }): Promise<JobRow>;
    getJobById(id: string): Promise<JobRow | null>;
    getAllJobs(): Promise<JobRow[]>;
    updateJob(id: string, updates: Partial<JobRow>): Promise<JobRow>;
    deleteJob(id: string): Promise<void>;
    createJobWithUrls(name: string, urls: string[]): Promise<JobRow>;
}
export {};
