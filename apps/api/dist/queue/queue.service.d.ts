import { Queue } from 'bullmq';
import { SupabaseService } from '../supabase/supabase.service';
export interface UrlProcessingJob {
    jobId: string;
    url: string;
    urlId: string;
    priority?: number;
}
export declare class QueueService {
    private readonly urlProcessingQueue;
    private readonly supabase;
    private readonly logger;
    constructor(urlProcessingQueue: Queue<UrlProcessingJob>, supabase: SupabaseService);
    addUrlToQueue(data: UrlProcessingJob): Promise<void>;
    addUrlsToQueue(jobs: UrlProcessingJob[]): Promise<void>;
    getQueueStats(): Promise<{
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        delayed: number;
        total: number;
    }>;
    pauseQueue(): Promise<void>;
    resumeQueue(): Promise<void>;
    clearQueue(): Promise<void>;
    pauseJob(jobId: string): Promise<void>;
    resumeJob(jobId: string): Promise<void>;
    cancelJob(jobId: string): Promise<void>;
    retryJob(jobId: string): Promise<void>;
}
