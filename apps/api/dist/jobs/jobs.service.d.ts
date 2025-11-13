import { SupabaseService } from '../supabase/supabase.service';
import { Database, UrlResult } from '@website-scraper/shared';
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
    createJobWithUrls(name: string, urls: string[]): Promise<{
        job: JobRow;
        urlIds: string[];
    }>;
    getJobResults(jobId: string, page?: number, pageSize?: number, filter?: 'approved' | 'rejected' | 'all', layer?: 'layer1' | 'layer2' | 'layer3' | 'passed_all' | 'all', confidence?: 'high' | 'medium' | 'low' | 'very-high' | 'very-low' | 'all'): Promise<{
        results: UrlResult[];
        pagination: {
            total: number;
            page: number;
            pageSize: number;
            pages: number;
        };
    }>;
    getResultDetails(jobId: string, resultId: string): Promise<any | null>;
}
export {};
