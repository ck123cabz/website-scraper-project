import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export interface UrlProcessingJob {
  jobId: string;
  url: string;
  priority?: number;
}

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue('url-processing-queue')
    private readonly urlProcessingQueue: Queue<UrlProcessingJob>,
  ) {
    // Add error event listener (Story 2.1 follow-up)
    this.urlProcessingQueue.on('error', (err) => {
      console.error('[QueueService] Queue error:', err);
    });
  }

  async addUrlToQueue(data: UrlProcessingJob): Promise<void> {
    await this.urlProcessingQueue.add('process-url', data, {
      priority: data.priority || 0,
    });
  }

  async addUrlsToQueue(jobs: UrlProcessingJob[]): Promise<void> {
    const bulkJobs = jobs.map((job) => ({
      name: 'process-url',
      data: job,
      opts: {
        priority: job.priority || 0,
      },
    }));

    await this.urlProcessingQueue.addBulk(bulkJobs);
  }

  async getQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.urlProcessingQueue.getWaitingCount(),
      this.urlProcessingQueue.getActiveCount(),
      this.urlProcessingQueue.getCompletedCount(),
      this.urlProcessingQueue.getFailedCount(),
      this.urlProcessingQueue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  }

  async pauseQueue(): Promise<void> {
    await this.urlProcessingQueue.pause();
  }

  async resumeQueue(): Promise<void> {
    await this.urlProcessingQueue.resume();
  }

  async clearQueue(): Promise<void> {
    await this.urlProcessingQueue.drain();
  }
}
