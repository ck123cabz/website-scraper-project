import { Queue } from 'bullmq';
export interface UrlProcessingJob {
    jobId: string;
    url: string;
    priority?: number;
}
export declare class QueueService {
    private readonly urlProcessingQueue;
    constructor(urlProcessingQueue: Queue<UrlProcessingJob>);
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
}
