import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Job } from 'bullmq';
import type { UrlJobData } from '@website-scraper/shared';
import { SupabaseService } from '../supabase/supabase.service';
import { ScraperService } from '../scraper/scraper.service';
import { PreFilterService } from '../jobs/services/prefilter.service';
import { LlmService } from '../jobs/services/llm.service';

/**
 * BullMQ Worker Processor for URL processing
 * Story 2.5: Worker Processing & Real-Time Updates
 *
 * Processing Pipeline:
 * 1. Fetch URL with ScrapingBee
 * 2. Extract content (title, meta, body text)
 * 3. Pre-filter URL (reject obvious non-suitable sites)
 * 4. Classify with LLM (Gemini primary, GPT fallback)
 * 5. Store result in database
 * 6. Update job counters and progress
 * 7. Log activity
 * 8. Trigger Realtime updates (automatic via Supabase)
 *
 * Features:
 * - Concurrency: 5 URLs (configured in WorkersModule)
 * - Retry logic with exponential backoff
 * - Pause/resume support (job status checks)
 * - Graceful shutdown handling
 * - Isolated error handling (one URL failure doesn't stop job)
 */
@Processor('url-processing-queue', {
  concurrency: 5, // Process 5 URLs concurrently (respects ScrapingBee 10 req/sec limit)
})
@Injectable()
export class UrlWorkerProcessor extends WorkerHost implements OnModuleDestroy {
  private readonly logger = new Logger(UrlWorkerProcessor.name);
  private isShuttingDown = false;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly scraper: ScraperService,
    private readonly preFilter: PreFilterService,
    private readonly llm: LlmService,
  ) {
    super();
    this.logger.log('UrlWorkerProcessor initialized with concurrency: 5');
  }

  /**
   * Process a single URL job
   * Implements full processing pipeline with error handling
   */
  async process(job: Job<UrlJobData>): Promise<void> {
    const { jobId, url, urlId } = job.data;
    const startTime = Date.now();

    this.logger.log(`[Job ${jobId}] Processing URL: ${url.slice(0, 100)}`);

    try {
      // Check if job is paused or cancelled
      const jobStatus = await this.checkJobStatus(jobId);
      if (jobStatus === 'paused' || jobStatus === 'cancelled') {
        this.logger.log(`[Job ${jobId}] Skipping URL - job status: ${jobStatus}`);
        await this.insertActivityLog(jobId, 'info', `Skipped URL ${url} - job ${jobStatus}`, {
          url,
        });
        return; // Ack job without processing
      }

      // Update job status to 'processing' if this is the first URL
      await this.updateJobStatusToProcessing(jobId);

      // STEP 1: Update current processing stage to 'fetching'
      await this.updateJobProgress(jobId, url, 'fetching');

      // STEP 2: Fetch URL with ScrapingBee
      const scrapeResult = await this.retryWithBackoff(() => this.scraper.fetchUrl(url), 3, url);

      if (!scrapeResult.success) {
        // Scraping failed after retries
        await this.handleFailedUrl(
          jobId,
          url,
          urlId,
          scrapeResult.error || 'Scraping failed',
          startTime,
        );
        return;
      }

      this.logger.log(
        `[Job ${jobId}] Fetched ${url.slice(0, 100)} (${scrapeResult.processingTimeMs}ms)`,
      );

      // STEP 3: Update stage to 'filtering'
      await this.updateJobProgress(jobId, url, 'filtering');

      // STEP 4: Pre-filter URL
      const preFilterResult = await this.preFilter.filterUrl(url);

      await this.insertActivityLog(
        jobId,
        'info',
        `Pre-filter: ${preFilterResult.passed ? 'PASS' : 'REJECT'}`,
        {
          url,
          reasoning: preFilterResult.reasoning,
        },
      );

      if (!preFilterResult.passed) {
        // Pre-filter rejected - skip LLM, store result
        await this.storePreFilterRejection(
          jobId,
          url,
          urlId,
          scrapeResult,
          preFilterResult,
          startTime,
        );
        return;
      }

      // STEP 5: Update stage to 'classifying'
      await this.updateJobProgress(jobId, url, 'classifying');

      // STEP 6: Classify with LLM (Gemini → GPT fallback)
      const classification = await this.retryWithBackoff(
        () => this.llm.classifyUrl(url, scrapeResult.content || scrapeResult.title || ''),
        3,
        url,
      );

      this.logger.log(
        `[Job ${jobId}] Classified ${url.slice(0, 100)} - ${classification.classification} (${classification.provider}, ${classification.processingTimeMs}ms, $${classification.cost.toFixed(6)})`,
      );

      await this.insertActivityLog(jobId, 'success', `LLM: ${classification.classification}`, {
        url,
        provider: classification.provider,
        confidence: classification.confidence,
        cost: classification.cost,
      });

      // STEP 7: Store result
      await this.storeSuccessResult(
        jobId,
        url,
        urlId,
        scrapeResult,
        preFilterResult,
        classification,
        startTime,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `[Job ${jobId}] Failed to process URL ${url.slice(0, 100)}: ${errorMessage}`,
      );

      await this.handleFailedUrl(jobId, url, urlId, errorMessage, startTime);
    }
  }

  /**
   * Check job status from database
   * Used for pause/resume support
   * @private
   */
  private async checkJobStatus(jobId: string): Promise<string> {
    const { data: job, error } = await this.supabase
      .getClient()
      .from('jobs')
      .select('status')
      .eq('id', jobId)
      .single();

    if (error) {
      this.logger.warn(`Failed to check job status for ${jobId}: ${error.message}`);
      return 'processing'; // Assume processing if unable to check
    }

    return job.status;
  }

  /**
   * Update job status from 'pending' to 'processing' on first URL
   * @private
   */
  private async updateJobStatusToProcessing(jobId: string): Promise<void> {
    const { data: job } = await this.supabase
      .getClient()
      .from('jobs')
      .select('status')
      .eq('id', jobId)
      .single();

    if (job && job.status === 'pending') {
      await this.supabase.getClient().from('jobs').update({ status: 'processing' }).eq('id', jobId);

      this.logger.log(`[Job ${jobId}] Status updated: pending → processing`);
    }
  }

  /**
   * Update job progress with current URL and stage
   * @private
   */
  private async updateJobProgress(
    jobId: string,
    currentUrl: string,
    stage: 'fetching' | 'extracting' | 'filtering' | 'classifying' | 'storing',
  ): Promise<void> {
    await this.supabase
      .getClient()
      .from('jobs')
      .update({
        current_url: currentUrl,
        current_stage: stage,
        current_url_started_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  }

  /**
   * Store result for pre-filter rejection (no LLM call)
   * @private
   */
  private async storePreFilterRejection(
    jobId: string,
    url: string,
    urlId: string,
    scrapeResult: any,
    preFilterResult: any,
    startTime: number,
  ): Promise<void> {
    const processingTimeMs = Date.now() - startTime;

    // Insert result
    await this.supabase.getClient().from('results').insert({
      job_id: jobId,
      url: url,
      status: 'rejected',
      classification_result: 'rejected_prefilter',
      classification_score: null,
      classification_reasoning: preFilterResult.reasoning,
      llm_provider: 'none',
      llm_cost: 0,
      processing_time_ms: processingTimeMs,
      prefilter_passed: false,
      prefilter_reasoning: preFilterResult.reasoning,
      scraped_title: scrapeResult.title,
      scraped_meta: scrapeResult.metaDescription,
    });

    // Update job counters
    const { data: job } = await this.supabase
      .getClient()
      .from('jobs')
      .select('processed_urls, total_urls, prefilter_rejected_count')
      .eq('id', jobId)
      .single();

    if (job) {
      const processedUrls = (job.processed_urls || 0) + 1;
      const progressPercentage = ((processedUrls / job.total_urls) * 100).toFixed(2);

      await this.supabase
        .getClient()
        .from('jobs')
        .update({
          processed_urls: processedUrls,
          prefilter_rejected_count: (job.prefilter_rejected_count || 0) + 1,
          progress_percentage: parseFloat(progressPercentage),
          current_url: null,
          current_stage: null,
        })
        .eq('id', jobId);

      this.logger.log(
        `[Job ${jobId}] Pre-filter rejected ${url.slice(0, 100)} (${processedUrls}/${job.total_urls})`,
      );

      // Check if job complete
      if (processedUrls >= job.total_urls) {
        await this.markJobComplete(jobId);
      }
    }
  }

  /**
   * Store result for successful LLM classification
   * @private
   */
  private async storeSuccessResult(
    jobId: string,
    url: string,
    urlId: string,
    scrapeResult: any,
    preFilterResult: any,
    classification: any,
    startTime: number,
  ): Promise<void> {
    const processingTimeMs = Date.now() - startTime;

    // Insert result
    await this.supabase.getClient().from('results').insert({
      job_id: jobId,
      url: url,
      status: 'success',
      classification_result: classification.classification,
      classification_score: classification.confidence,
      classification_reasoning: classification.reasoning,
      llm_provider: classification.provider,
      llm_cost: classification.cost,
      processing_time_ms: processingTimeMs,
      prefilter_passed: true,
      prefilter_reasoning: preFilterResult.reasoning,
      scraped_title: scrapeResult.title,
      scraped_meta: scrapeResult.metaDescription,
    });

    // Update job counters
    const { data: job } = await this.supabase
      .getClient()
      .from('jobs')
      .select(
        'processed_urls, total_urls, successful_urls, total_cost, gemini_cost, gpt_cost, prefilter_passed_count',
      )
      .eq('id', jobId)
      .single();

    if (job) {
      const processedUrls = (job.processed_urls || 0) + 1;
      const successfulUrls = (job.successful_urls || 0) + 1;
      const totalCost = (job.total_cost || 0) + classification.cost;
      const progressPercentage = ((processedUrls / job.total_urls) * 100).toFixed(2);

      // Update provider-specific costs
      const updates: any = {
        processed_urls: processedUrls,
        successful_urls: successfulUrls,
        total_cost: totalCost,
        prefilter_passed_count: (job.prefilter_passed_count || 0) + 1,
        progress_percentage: parseFloat(progressPercentage),
        current_url: null,
        current_stage: null,
      };

      if (classification.provider === 'gemini') {
        updates.gemini_cost = (job.gemini_cost || 0) + classification.cost;
      } else if (classification.provider === 'gpt') {
        updates.gpt_cost = (job.gpt_cost || 0) + classification.cost;
      }

      await this.supabase.getClient().from('jobs').update(updates).eq('id', jobId);

      this.logger.log(
        `[Job ${jobId}] Stored result for ${url.slice(0, 100)} (${processedUrls}/${job.total_urls}, $${totalCost.toFixed(6)})`,
      );

      // Check if job complete
      if (processedUrls >= job.total_urls) {
        await this.markJobComplete(jobId);
      }
    }
  }

  /**
   * Handle failed URL processing
   * @private
   */
  private async handleFailedUrl(
    jobId: string,
    url: string,
    urlId: string,
    errorMessage: string,
    startTime: number,
  ): Promise<void> {
    const processingTimeMs = Date.now() - startTime;

    // Sanitize error message
    const sanitizedError =
      errorMessage.length > 200 ? errorMessage.slice(0, 200) + '...' : errorMessage;

    // Insert failed result
    await this.supabase
      .getClient()
      .from('results')
      .insert({
        job_id: jobId,
        url: url,
        status: 'failed',
        classification_result: null,
        classification_score: null,
        classification_reasoning: null,
        llm_provider: 'none',
        llm_cost: 0,
        processing_time_ms: processingTimeMs,
        prefilter_passed: false,
        prefilter_reasoning: `Failed: ${sanitizedError}`,
        scraped_title: null,
        scraped_meta: null,
      });

    // Update job counters
    const { data: job } = await this.supabase
      .getClient()
      .from('jobs')
      .select('processed_urls, total_urls, failed_urls')
      .eq('id', jobId)
      .single();

    if (job) {
      const processedUrls = (job.processed_urls || 0) + 1;
      const failedUrls = (job.failed_urls || 0) + 1;
      const progressPercentage = ((processedUrls / job.total_urls) * 100).toFixed(2);

      await this.supabase
        .getClient()
        .from('jobs')
        .update({
          processed_urls: processedUrls,
          failed_urls: failedUrls,
          progress_percentage: parseFloat(progressPercentage),
          current_url: null,
          current_stage: null,
        })
        .eq('id', jobId);

      this.logger.warn(`[Job ${jobId}] Failed URL ${url.slice(0, 100)}: ${sanitizedError}`);

      await this.insertActivityLog(jobId, 'error', `Failed: ${sanitizedError}`, { url });

      // Check if job complete
      if (processedUrls >= job.total_urls) {
        await this.markJobComplete(jobId);
      }
    }
  }

  /**
   * Mark job as complete with final stats
   * @private
   */
  private async markJobComplete(jobId: string): Promise<void> {
    const { data: job } = await this.supabase
      .getClient()
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (!job) return;

    const successRate =
      job.total_urls > 0 ? ((job.successful_urls || 0) / job.total_urls) * 100 : 0;
    const avgCostPerUrl = job.processed_urls > 0 ? (job.total_cost || 0) / job.processed_urls : 0;

    await this.supabase
      .getClient()
      .from('jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        current_url: null,
        current_stage: null,
      })
      .eq('id', jobId);

    this.logger.log(
      `[Job ${jobId}] COMPLETED - ${job.successful_urls}/${job.total_urls} successful (${successRate.toFixed(1)}%), $${job.total_cost?.toFixed(6) || '0.00'} total`,
    );

    await this.insertActivityLog(
      jobId,
      'success',
      `Job completed: ${job.successful_urls}/${job.total_urls} successful, $${job.total_cost?.toFixed(6) || '0.00'} total cost`,
      {
        successRate: successRate.toFixed(2),
        avgCostPerUrl: avgCostPerUrl.toFixed(6),
        prefilterRejected: job.prefilter_rejected_count || 0,
      },
    );
  }

  /**
   * Insert activity log entry
   * @private
   */
  private async insertActivityLog(
    jobId: string,
    severity: 'info' | 'success' | 'warning' | 'error',
    message: string,
    context?: Record<string, any>,
  ): Promise<void> {
    try {
      await this.supabase
        .getClient()
        .from('activity_logs')
        .insert({
          job_id: jobId,
          severity,
          message: message.length > 500 ? message.slice(0, 500) + '...' : message,
          context: context || null,
        });
    } catch (error) {
      this.logger.warn(
        `Failed to insert activity log: ${error instanceof Error ? error.message : 'Unknown'}`,
      );
    }
  }

  /**
   * Retry logic with exponential backoff
   * Handles transient errors (timeouts, rate limits, 503)
   * @private
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxAttempts: number,
    url: string,
  ): Promise<T> {
    const delays = [1000, 2000, 4000]; // Exponential backoff: 1s, 2s, 4s

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        const isLastAttempt = attempt === maxAttempts - 1;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Check if error is transient
        const isTransient = this.isTransientError(errorMessage);

        if (!isTransient || isLastAttempt) {
          // Permanent error or last attempt - throw
          throw error;
        }

        // Special handling for ScrapingBee 429 rate limit
        const delay = errorMessage.includes('429')
          ? 30000
          : delays[attempt] || delays[delays.length - 1];

        this.logger.warn(
          `[Retry ${attempt + 1}/${maxAttempts}] Transient error for ${url.slice(0, 100)}: ${errorMessage}. Retrying in ${delay}ms...`,
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new Error('Retry logic failed - should never reach here');
  }

  /**
   * Determine if error is transient (should retry)
   * @private
   */
  private isTransientError(errorMessage: string): boolean {
    const message = errorMessage.toLowerCase();

    // Transient errors: retry
    if (
      message.includes('timeout') ||
      message.includes('etimedout') ||
      message.includes('econnreset') ||
      message.includes('429') ||
      message.includes('rate limit') ||
      message.includes('503') ||
      message.includes('service unavailable') ||
      message.includes('network error')
    ) {
      return true;
    }

    // Permanent errors: no retry
    if (
      message.includes('401') ||
      message.includes('unauthorized') ||
      message.includes('400') ||
      message.includes('bad request') ||
      message.includes('403') ||
      message.includes('forbidden') ||
      message.includes('invalid')
    ) {
      return false;
    }

    // Default: treat as transient
    return true;
  }

  /**
   * Graceful shutdown handling
   * Finish current URLs before stopping
   * Called by NestJS when SIGTERM signal received (Railway deployments)
   */
  async onModuleDestroy() {
    this.logger.log('Graceful shutdown initiated - finishing active jobs...');
    this.isShuttingDown = true;

    // Close the worker gracefully
    // WorkerHost provides access to worker via this.worker (protected property)
    // This will:
    // 1. Stop accepting new jobs
    // 2. Wait for active jobs to complete (max 30s default)
    // 3. Clean up resources
    if (this.worker) {
      try {
        await this.worker.close();
        this.logger.log('Worker closed gracefully - all active jobs completed');
      } catch (error) {
        this.logger.error(
          `Error during graceful shutdown: ${error instanceof Error ? error.message : 'Unknown'}`,
        );
      }
    }
  }

  /**
   * Worker event handlers
   */
  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`Job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed: ${error.message}`);
  }

  @OnWorkerEvent('error')
  onError(error: Error) {
    this.logger.error(`Worker error: ${error.message}`);
  }
}
