import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SupabaseService } from '../supabase/supabase.service';

export interface UrlProcessingJob {
  jobId: string;
  url: string;
  urlId: string;
  priority?: number;
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue('url-processing-queue')
    private readonly urlProcessingQueue: Queue<UrlProcessingJob>,
    private readonly supabase: SupabaseService,
  ) {
    // Add error event listener (Story 2.1 follow-up)
    this.urlProcessingQueue.on('error', (err) => {
      this.logger.error(`Queue error: ${err.message}`);
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

  /**
   * Pause a specific job by updating its status in database
   * The worker will check status before processing each URL
   * Story 2.5: Task 9 - Pause/Resume Job Controls
   */
  async pauseJob(jobId: string): Promise<void> {
    const { error } = await this.supabase
      .getClient()
      .from('jobs')
      .update({ status: 'paused' })
      .eq('id', jobId);

    if (error) {
      this.logger.error(`Failed to pause job ${jobId}: ${error.message}`);
      throw new Error(`Failed to pause job: ${error.message}`);
    }

    this.logger.log(`Job ${jobId} paused - worker will skip remaining URLs`);
  }

  /**
   * Resume a paused job by updating its status in database
   * FIX (Story 3.1): Re-queue URLs that were skipped during pause
   * Story 2.5: Task 9 - Pause/Resume Job Controls
   */
  async resumeJob(jobId: string): Promise<void> {
    // 1. Find URLs from job_urls table that haven't been completed
    const { data: unprocessedUrls, error: selectError } = await this.supabase
      .getClient()
      .from('job_urls')
      .select('id, url')
      .eq('job_id', jobId)
      .in('status', ['queued', 'processing']); // Re-queue URLs that are still pending or stuck

    if (selectError) {
      this.logger.error(
        `Failed to query unprocessed URLs for job ${jobId}: ${selectError.message}`,
      );
      // Don't throw - continue with resume even if we can't re-queue
    }

    // 2. Re-queue unprocessed URLs
    if (unprocessedUrls && unprocessedUrls.length > 0) {
      this.logger.log(
        `Job ${jobId} resume: Found ${unprocessedUrls.length} unprocessed URLs - re-queueing`,
      );

      const jobs = unprocessedUrls.map((row) => ({
        jobId,
        url: row.url,
        urlId: row.id, // Include urlId from job_urls table
      }));

      await this.addUrlsToQueue(jobs);

      this.logger.log(`Job ${jobId} resume: ${unprocessedUrls.length} URLs re-queued`);
    } else {
      this.logger.log(`Job ${jobId} resume: No unprocessed URLs to re-queue`);
    }

    // 3. Update status to 'processing'
    const { error } = await this.supabase
      .getClient()
      .from('jobs')
      .update({ status: 'processing' })
      .eq('id', jobId);

    if (error) {
      this.logger.error(`Failed to resume job ${jobId}: ${error.message}`);
      throw new Error(`Failed to resume job: ${error.message}`);
    }

    this.logger.log(
      `Job ${jobId} resumed - worker will continue processing (${unprocessedUrls?.length || 0} URLs re-queued)`,
    );
  }

  /**
   * Cancel a job by updating its status in database
   * Worker will stop processing remaining URLs, results are preserved
   * Story 3.0: Task 9 - Job Control Actions
   */
  async cancelJob(jobId: string): Promise<void> {
    const { error } = await this.supabase
      .getClient()
      .from('jobs')
      .update({ status: 'cancelled' })
      .eq('id', jobId);

    if (error) {
      this.logger.error(`Failed to cancel job ${jobId}: ${error.message}`);
      throw new Error(`Failed to cancel job: ${error.message}`);
    }

    this.logger.log(`Job ${jobId} cancelled - worker will stop processing, results preserved`);
  }
}
