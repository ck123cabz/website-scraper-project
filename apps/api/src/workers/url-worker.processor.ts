import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Job } from 'bullmq';
import type { UrlJobData } from '@website-scraper/shared';
import { SupabaseService } from '../supabase/supabase.service';
import { ScraperService } from '../scraper/scraper.service';
import { Layer1DomainAnalysisService } from '../jobs/services/layer1-domain-analysis.service';
import { Layer2OperationalFilterService } from '../jobs/services/layer2-operational-filter.service';
import { LlmService } from '../jobs/services/llm.service';
import { ConfidenceScoringService } from '../jobs/services/confidence-scoring.service';

/**
 * BullMQ Worker Processor for URL processing with 3-Tier Progressive Filtering
 * Story 2.5-refactored: 3-Tier Pipeline Orchestration & Real-Time Updates
 * T018-T019: Batch Processing Refactor - writes complete factors to url_results
 *
 * Processing Pipeline (3-Tier Progressive Filtering):
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * LAYER 1: Domain Analysis (NO HTTP requests)
 *   - Pattern matching: blog platforms, social media, forums
 *   - Domain reputation checks
 *   - URL structure analysis
 *   - Target: Eliminate 40-60% of total URLs
 *   - Cost: $0 (rule-based, instant)
 *   - Throughput: 100+ URLs/min
 *   - STOP if REJECT: Skip Layer 2 and Layer 3
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * LAYER 2: Homepage Scraping + Operational Validation (if Layer 1 PASS)
 *   - Company page detection (About Us, Contact, Team)
 *   - Blog freshness analysis (recent posts in last 90 days)
 *   - Tech stack validation (CMS, frameworks, hosting)
 *   - Store signals in layer2_signals JSONB
 *   - Target: Eliminate 30% of Layer 1 survivors
 *   - Cost: ~$0.0001/URL (ScrapingBee homepage request)
 *   - Throughput: 20-30 URLs/min
 *   - STOP if REJECT: Skip Layer 3
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * LAYER 3: Full Site Scraping + LLM Classification (if Layer 2 PASS)
 *   - Full site content extraction (title, meta, body, structured data)
 *   - LLM classification: Gemini primary, GPT fallback
 *   - Confidence scoring: high/medium/low/auto_reject
 *   - Write complete layer1/2/3_factors JSONB to url_results table
 *   - Store all Layer 3 fields (confidence_band, etc.)
 *   - Target: Classify remaining ~28% of original URLs
 *   - Cost: ~$0.002-0.004/URL (ScrapingBee + LLM)
 *   - Throughput: 10-15 URLs/min
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * BullMQ Configuration (T020-T021):
 * - Concurrency: 5 URLs processed simultaneously
 * - Retry strategy:
 *   - Max attempts: 3
 *   - Initial delay: 1 second
 *   - Backoff multiplier: 2x (1s → 2s → 4s)
 *   - Transient errors only (timeouts, rate limits, 503)
 *   - Permanent errors not retried (401, 400, 403)
 * - Pause/resume support (job status checks)
 * - Graceful shutdown handling
 * - Isolated error handling (one URL failure doesn't stop job)
 * - Real-time database updates (current_layer, per-layer timing, cost tracking)
 * - Cost savings calculation (Layer 1 and Layer 2 eliminations)
 */
@Processor('url-processing-queue', {
  concurrency: 5, // T020-T021: Process 5 URLs concurrently (respects ScrapingBee 10 req/sec limit)
})
@Injectable()
export class UrlWorkerProcessor extends WorkerHost implements OnModuleDestroy {
  private readonly logger = new Logger(UrlWorkerProcessor.name);
  private isShuttingDown = false;

  // Cost constants (USD per URL)
  private readonly SCRAPING_COST_PER_URL = 0.0001; // ScrapingBee cost
  private readonly LAYER3_AVG_COST = 0.003; // Average LLM + scraping cost

  constructor(
    private readonly supabase: SupabaseService,
    private readonly scraper: ScraperService,
    private readonly layer1Analysis: Layer1DomainAnalysisService,
    private readonly layer2Filter: Layer2OperationalFilterService,
    private readonly llm: LlmService,
    private readonly confidenceScoring: ConfidenceScoringService,
  ) {
    super();
    this.logger.log(
      'UrlWorkerProcessor initialized with 3-tier progressive filtering (T018-T019: Batch Processing Refactor)',
    );
  }

  /**
   * Process a single URL job with 3-tier progressive filtering
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

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // LAYER 1: Domain Analysis (NO HTTP requests)
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      await this.updateCurrentLayer(jobId, url, 1);

      const layer1Start = Date.now();
      const layer1Result = await this.executeLayer1(url);
      const layer1Time = Date.now() - layer1Start;

      if (!layer1Result.passed) {
        // Layer 1 REJECT - STOP processing, skip Layer 2 and Layer 3
        await this.storeLayer1Rejection(jobId, url, urlId, layer1Result, layer1Time, startTime);
        return;
      }

      this.logger.log(`[Job ${jobId}] Layer 1 PASS: ${layer1Result.reasoning}`);

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // LAYER 2: Homepage Scraping + Operational Validation (if Layer 1 PASS)
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      await this.updateCurrentLayer(jobId, url, 2);

      const layer2Start = Date.now();
      const { scrapeResult, layer2Result } = await this.executeLayer2(jobId, url);
      const layer2Time = Date.now() - layer2Start;

      if (!layer2Result.passed) {
        // Layer 2 REJECT - STOP processing, skip Layer 3
        await this.storeLayer2Rejection(
          jobId,
          url,
          urlId,
          scrapeResult,
          layer2Result,
          layer1Time,
          layer2Time,
          startTime,
        );
        return;
      }

      this.logger.log(`[Job ${jobId}] Layer 2 PASS: ${layer2Result.reasoning}`);

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // LAYER 3: Full Site Scraping + LLM Classification (if Layer 2 PASS)
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      await this.updateCurrentLayer(jobId, url, 3);

      const layer3Start = Date.now();
      const layer3Result = await this.executeLayer3(jobId, url, scrapeResult);
      const layer3Time = Date.now() - layer3Start;

      // Layer 3 COMPLETE - Route URL based on confidence band action (T009)
      await this.routeAndStoreLayer3Result(
        jobId,
        url,
        urlId,
        scrapeResult,
        layer3Result,
        layer1Time,
        layer2Time,
        layer3Time,
        startTime,
      );

      // Update cost savings after successful completion
      await this.updateCostSavings(jobId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `[Job ${jobId}] Failed to process URL ${url.slice(0, 100)}: ${errorMessage}`,
      );

      await this.handleFailedUrl(jobId, url, urlId, errorMessage, startTime);
    }
  }

  /**
   * Execute Layer 1: Domain Analysis (NO HTTP)
   * @private
   */
  private async executeLayer1(url: string): Promise<{
    passed: boolean;
    reasoning: string;
    processingTimeMs?: number;
  }> {
    const startTime = Date.now();

    try {
      const result = this.layer1Analysis.analyzeUrl(url);
      return {
        passed: result.passed,
        reasoning: result.reasoning,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      // Layer 1 fail-open: If Layer 1 errors, log warning and PASS to Layer 2
      this.logger.warn(
        `Layer 1 error for ${url}: ${error instanceof Error ? error.message : 'Unknown'}. Failing open (PASS)`,
      );
      return {
        passed: true,
        reasoning: 'PASS - Layer 1 error (fail-open strategy)',
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Execute Layer 2: Homepage Scraping + Operational Validation
   * @private
   */
  private async executeLayer2(
    jobId: string,
    url: string,
  ): Promise<{
    scrapeResult: any;
    layer2Result: { passed: boolean; reasoning: string; signals?: any; processingTimeMs?: number };
  }> {
    // Scrape homepage (with retries)
    const scrapeResult = await this.retryWithBackoff(() => this.scraper.fetchUrl(url), 3, url);

    if (!scrapeResult.success) {
      // Scraping failed after retries - treat as Layer 2 failure
      return {
        scrapeResult,
        layer2Result: {
          passed: false,
          reasoning: `Scraping failed: ${scrapeResult.error}`,
        },
      };
    }

    // Validate operational signals (Story 2.6: Full Layer 2 implementation)
    const layer2Result = await this.layer2Filter.filterUrl(url);

    return { scrapeResult, layer2Result };
  }

  /**
   * Execute Layer 3: LLM Classification + Confidence Scoring + Manual Review Routing
   * @private
   */
  private async executeLayer3(
    jobId: string,
    url: string,
    scrapeResult: any,
  ): Promise<{
    classification: any;
    confidenceBand: string;
    action: 'auto_approve' | 'manual_review' | 'reject';
    layer1Results: any;
    layer2Results: any;
    layer3Results: any;
  }> {
    // Classify with LLM (Gemini → GPT fallback, with retries)
    const classification = await this.retryWithBackoff(
      () => this.llm.classifyUrl(url, scrapeResult.content || scrapeResult.title || ''),
      3,
      url,
    );

    // Get confidence band action (T009: Confidence Band Action Routing)
    const { band, action } = await this.confidenceScoring.getConfidenceBandAction(
      classification.confidence,
    );

    // Get structured layer results for routing and storage (T009)
    const layer1Results = this.layer1Analysis.getStructuredResults(url);
    const layer2Results = await this.layer2Filter.getStructuredResults(url);
    const layer3Results = await this.llm.getStructuredResults(
      url,
      scrapeResult.content || scrapeResult.title || '',
    );

    this.logger.log(
      `[Job ${jobId}] Layer 3 classified ${url.slice(0, 100)} - ${classification.classification} ` +
        `(${classification.provider}, ${classification.processingTimeMs}ms, $${classification.cost.toFixed(6)}, ` +
        `confidence: ${classification.confidence.toFixed(2)}, band: ${band}, action: ${action})`,
    );

    return {
      classification,
      confidenceBand: band,
      action,
      layer1Results,
      layer2Results,
      layer3Results,
    };
  }

  /**
   * Update current_layer field for real-time dashboard tracking
   * @private
   */
  private async updateCurrentLayer(
    jobId: string,
    currentUrl: string,
    layer: 1 | 2 | 3,
  ): Promise<void> {
    await this.supabase
      .getClient()
      .from('jobs')
      .update({
        current_url: currentUrl,
        current_layer: layer,
        current_url_started_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  }

  /**
   * Store result for Layer 1 domain analysis rejection (no scraping, no LLM)
   * @private
   */
  private async storeLayer1Rejection(
    jobId: string,
    url: string,
    urlId: string,
    layer1Result: any,
    layer1Time: number,
    startTime: number,
  ): Promise<void> {
    const processingTimeMs = Date.now() - startTime;

    // UPSERT result (update if exists, insert if not) - prevents duplicates on resume
    await this.supabase.getClient().from('results').upsert(
      {
        job_id: jobId,
        url: url,
        status: 'rejected',
        classification_result: 'rejected_prefilter', // Legacy field
        classification_score: null,
        classification_reasoning: layer1Result.reasoning,
        llm_provider: 'none',
        llm_cost: 0,
        processing_time_ms: processingTimeMs,
        elimination_layer: 'layer1',
        layer1_reasoning: layer1Result.reasoning,
        layer1_processing_time_ms: layer1Time,
        prefilter_passed: false,
        prefilter_reasoning: null,
      },
      {
        onConflict: 'job_id,url', // Update existing row with same job_id + url
      },
    );

    // Atomic update with SQL increment
    const { data: jobMeta } = await this.supabase
      .getClient()
      .from('jobs')
      .select('total_urls')
      .eq('id', jobId)
      .single();

    if (!jobMeta) return;

    const { data: job } = await this.supabase
      .getClient()
      .rpc('increment_job_counters', {
        p_job_id: jobId,
        p_processed_urls_delta: 1,
        p_layer1_eliminated_delta: 1,
      })
      .single();

    // Calculate progress
    const processedUrls = (job as any)?.processed_urls || 0;
    const progressPercentage = ((processedUrls / jobMeta.total_urls) * 100).toFixed(2);

    // Update progress percentage separately (non-critical)
    await this.supabase
      .getClient()
      .from('jobs')
      .update({
        progress_percentage: parseFloat(progressPercentage),
        current_url: null,
        current_layer: null,
      })
      .eq('id', jobId);

    this.logger.log(
      `[Job ${jobId}] Layer 1 REJECT ${url.slice(0, 100)} (${processedUrls}/${jobMeta.total_urls}) - ${layer1Result.reasoning}`,
    );

    await this.insertActivityLog(jobId, 'info', `Layer 1 REJECT - ${layer1Result.reasoning}`, {
      url,
      layer: 1,
      processingTimeMs: layer1Time,
    });

    // Check if job complete
    if (processedUrls >= jobMeta.total_urls) {
      await this.markJobComplete(jobId);
    }
  }

  /**
   * Store result for Layer 2 operational filter rejection (no LLM call)
   * @private
   */
  private async storeLayer2Rejection(
    jobId: string,
    url: string,
    urlId: string,
    scrapeResult: any,
    layer2Result: any,
    layer1Time: number,
    layer2Time: number,
    startTime: number,
  ): Promise<void> {
    const processingTimeMs = Date.now() - startTime;

    // UPSERT result
    await this.supabase
      .getClient()
      .from('results')
      .upsert(
        {
          job_id: jobId,
          url: url,
          status: 'rejected',
          classification_result: 'rejected_prefilter', // Legacy field
          classification_score: null,
          classification_reasoning: layer2Result.reasoning,
          llm_provider: 'none',
          llm_cost: 0,
          processing_time_ms: processingTimeMs,
          elimination_layer: 'layer2',
          layer1_reasoning: null, // Layer 1 passed
          layer1_processing_time_ms: layer1Time,
          layer2_processing_time_ms: layer2Time,
          layer2_signals: layer2Result.signals || null,
          prefilter_passed: false,
          prefilter_reasoning: null,
        },
        {
          onConflict: 'job_id,url',
        },
      );

    // Atomic update
    const { data: jobMeta } = await this.supabase
      .getClient()
      .from('jobs')
      .select('total_urls')
      .eq('id', jobId)
      .single();

    if (!jobMeta) return;

    const { data: job } = await this.supabase
      .getClient()
      .rpc('increment_job_counters', {
        p_job_id: jobId,
        p_processed_urls_delta: 1,
        p_layer2_eliminated_delta: 1,
        p_scraping_cost_delta: this.SCRAPING_COST_PER_URL, // Layer 2 incurs scraping cost
      })
      .single();

    const processedUrls = (job as any)?.processed_urls || 0;
    const progressPercentage = ((processedUrls / jobMeta.total_urls) * 100).toFixed(2);

    await this.supabase
      .getClient()
      .from('jobs')
      .update({
        progress_percentage: parseFloat(progressPercentage),
        current_url: null,
        current_layer: null,
      })
      .eq('id', jobId);

    this.logger.log(
      `[Job ${jobId}] Layer 2 REJECT ${url.slice(0, 100)} (${processedUrls}/${jobMeta.total_urls}) - ${layer2Result.reasoning}`,
    );

    await this.insertActivityLog(jobId, 'info', `Layer 2 REJECT - ${layer2Result.reasoning}`, {
      url,
      layer: 2,
      processingTimeMs: layer2Time,
      signals: layer2Result.signals,
    });

    // Check if job complete
    if (processedUrls >= jobMeta.total_urls) {
      await this.markJobComplete(jobId);
    }
  }

  /**
   * Route Layer 3 result and store complete factors to url_results (T018-T019)
   * Writes ALL factor data to url_results table, no routing to manual_review_queue
   * Includes backwards compatibility handling for null factors
   * @private
   */
  private async routeAndStoreLayer3Result(
    jobId: string,
    url: string,
    urlId: string,
    scrapeResult: any,
    layer3Result: any,
    layer1Time: number,
    layer2Time: number,
    layer3Time: number,
    startTime: number,
  ): Promise<void> {
    const processingTimeMs = Date.now() - startTime;
    const totalCost = this.SCRAPING_COST_PER_URL + layer3Result.classification.cost;

    // Get complete factor structures from each layer service with null safety
    let layer1Factors: any = null;
    let layer2Factors: any = null;
    let layer3Factors: any = null;

    try {
      layer1Factors = this.layer1Analysis.getLayer1Factors(url);
      if (!layer1Factors) {
        this.logger.warn(`Layer 1 factors returned null for ${url}, using empty structure`);
        layer1Factors = this.getEmptyLayer1Factors();
      }
    } catch (error) {
      this.logger.error(
        `Error getting Layer 1 factors: ${error instanceof Error ? error.message : 'Unknown'}`,
      );
      layer1Factors = this.getEmptyLayer1Factors();
    }

    try {
      layer2Factors = await this.layer2Filter.getLayer2Factors(url);
      if (!layer2Factors) {
        this.logger.warn(`Layer 2 factors returned null for ${url}, using empty structure`);
        layer2Factors = this.getEmptyLayer2Factors();
      }
    } catch (error) {
      this.logger.error(
        `Error getting Layer 2 factors: ${error instanceof Error ? error.message : 'Unknown'}`,
      );
      layer2Factors = this.getEmptyLayer2Factors();
    }

    try {
      layer3Factors = await this.llm.getLayer3Factors(
        url,
        scrapeResult.content || scrapeResult.title || '',
      );
      if (!layer3Factors) {
        this.logger.warn(`Layer 3 factors returned null for ${url}, using empty structure`);
        layer3Factors = this.getEmptyLayer3Factors();
      }
    } catch (error) {
      this.logger.error(
        `Error getting Layer 3 factors: ${error instanceof Error ? error.message : 'Unknown'}`,
      );
      layer3Factors = this.getEmptyLayer3Factors();
    }

    // Determine eliminated_at_layer based on classification
    let eliminatedAtLayer: string | null = null;
    if (layer3Result.classification.classification === 'not_suitable') {
      eliminatedAtLayer = 'layer3';
    } else {
      eliminatedAtLayer = 'passed_all';
    }

    // Determine final status based on classification
    const finalStatus = layer3Result.classification.classification === 'suitable'
      ? 'approved'
      : 'rejected';

    // Store complete result in url_results table with all factor data (T018-T019)
    // Includes backwards compatibility: null factors are allowed for pre-migration data
    try {
      await this.supabase.getClient().from('url_results').upsert(
        {
          job_id: jobId,
          url_id: urlId,
          url: url,
          status: finalStatus,
          confidence_score: layer3Result.classification.confidence,
          confidence_band: layer3Result.confidenceBand,
          eliminated_at_layer: eliminatedAtLayer,
          processing_time_ms: processingTimeMs,
          total_cost: totalCost,
          retry_count: layer3Result.classification.retryCount || 0,
          last_error: null, // No error since we reached Layer 3 successfully
          processed_at: new Date().toISOString(),
          layer1_factors: layer1Factors,
          layer2_factors: layer2Factors,
          layer3_factors: layer3Factors,
          reviewer_notes: `Auto-${finalStatus}: ${layer3Result.classification.reasoning}`,
        },
        {
          onConflict: 'url_id', // Update if exists based on url_id uniqueness
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to write url_results with factors: ${error instanceof Error ? error.message : 'Unknown'}. Attempting fallback write with null factors.`,
      );

      // Fallback: Write without factors if there's an issue
      await this.supabase.getClient().from('url_results').upsert(
        {
          job_id: jobId,
          url_id: urlId,
          url: url,
          status: finalStatus,
          confidence_score: layer3Result.classification.confidence,
          confidence_band: layer3Result.confidenceBand,
          eliminated_at_layer: eliminatedAtLayer,
          processing_time_ms: processingTimeMs,
          total_cost: totalCost,
          retry_count: layer3Result.classification.retryCount || 0,
          last_error: `Factor write failed: ${error instanceof Error ? error.message : 'Unknown'}`,
          processed_at: new Date().toISOString(),
          layer1_factors: null,
          layer2_factors: null,
          layer3_factors: null,
          reviewer_notes: `Auto-${finalStatus} (factors failed): ${layer3Result.classification.reasoning}`,
        },
        {
          onConflict: 'url_id',
        },
      );
    }

    // Store Layer 3 processing metadata in legacy results table for backward compatibility
    await this.supabase.getClient().from('results').upsert(
      {
        job_id: jobId,
        url: url,
        status: finalStatus,
        classification_result: layer3Result.classification.classification,
        classification_score: layer3Result.classification.confidence,
        classification_reasoning: layer3Result.classification.reasoning,
        llm_provider: layer3Result.classification.provider,
        llm_cost: layer3Result.classification.cost,
        processing_time_ms: processingTimeMs,
        layer1_processing_time_ms: layer1Time,
        layer2_processing_time_ms: layer2Time,
        layer3_processing_time_ms: layer3Time,
        confidence_band: layer3Result.confidenceBand,
        prefilter_passed: true, // Legacy field
        prefilter_reasoning: null,
      },
      {
        onConflict: 'job_id,url',
      },
    );

    // Update job counters
    const { data: jobMeta } = await this.supabase
      .getClient()
      .from('jobs')
      .select('total_urls')
      .eq('id', jobId)
      .single();

    if (!jobMeta) return;

    const geminiCostDelta =
      layer3Result.classification.provider === 'gemini' ? layer3Result.classification.cost : 0;
    const gptCostDelta =
      layer3Result.classification.provider === 'gpt' ? layer3Result.classification.cost : 0;

    const { data: job } = await this.supabase
      .getClient()
      .rpc('increment_job_counters', {
        p_job_id: jobId,
        p_processed_urls_delta: 1,
        p_successful_urls_delta: 1,
        p_total_cost_delta: layer3Result.classification.cost,
        p_scraping_cost_delta: this.SCRAPING_COST_PER_URL, // Layer 3 incurs scraping cost
        p_gemini_cost_delta: geminiCostDelta,
        p_gpt_cost_delta: gptCostDelta,
      })
      .single();

    const processedUrls = (job as any)?.processed_urls || 0;
    const totalJobCost = (job as any)?.total_cost || 0;
    const progressPercentage = ((processedUrls / jobMeta.total_urls) * 100).toFixed(2);

    await this.supabase
      .getClient()
      .from('jobs')
      .update({
        progress_percentage: parseFloat(progressPercentage),
        current_url: null,
        current_layer: null,
      })
      .eq('id', jobId);

    this.logger.log(
      `[Job ${jobId}] Layer 3 STORED ${url.slice(0, 100)} as ${finalStatus} (${processedUrls}/${jobMeta.total_urls}, $${totalJobCost.toFixed(6)})`,
    );

    await this.insertActivityLog(
      jobId,
      'success',
      `Layer 3 CLASSIFIED - ${layer3Result.classification.classification} (confidence: ${layer3Result.classification.confidence.toFixed(2)}, status: ${finalStatus})`,
      {
        url,
        layer: 3,
        provider: layer3Result.classification.provider,
        confidence: layer3Result.classification.confidence,
        confidenceBand: layer3Result.confidenceBand,
        status: finalStatus,
        cost: layer3Result.classification.cost,
      },
    );

    // Check if job complete
    if (processedUrls >= jobMeta.total_urls) {
      await this.markJobComplete(jobId);
    }
  }

  /**
   * Update cost savings calculation
   * Savings = (layer1_eliminated × layer3_cost) + (layer2_eliminated × layer3_cost)
   * @private
   */
  private async updateCostSavings(jobId: string): Promise<void> {
    const { data: job } = await this.supabase
      .getClient()
      .from('jobs')
      .select('layer1_eliminated_count, layer2_eliminated_count')
      .eq('id', jobId)
      .single();

    if (!job) return;

    const layer1Savings = (job.layer1_eliminated_count || 0) * this.LAYER3_AVG_COST;
    const layer2Savings = (job.layer2_eliminated_count || 0) * this.LAYER3_AVG_COST;
    const totalSavings = layer1Savings + layer2Savings;

    await this.supabase
      .getClient()
      .from('jobs')
      .update({
        estimated_savings: totalSavings,
      })
      .eq('id', jobId);
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

    // UPSERT failed result
    await this.supabase
      .getClient()
      .from('results')
      .upsert(
        {
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
          error_message: sanitizedError,
        },
        {
          onConflict: 'job_id,url',
        },
      );

    // Atomic update
    const { data: jobMeta } = await this.supabase
      .getClient()
      .from('jobs')
      .select('total_urls')
      .eq('id', jobId)
      .single();

    if (!jobMeta) return;

    const { data: job } = await this.supabase
      .getClient()
      .rpc('increment_job_counters', {
        p_job_id: jobId,
        p_processed_urls_delta: 1,
        p_failed_urls_delta: 1,
      })
      .single();

    const processedUrls = (job as any)?.processed_urls || 0;
    const progressPercentage = ((processedUrls / jobMeta.total_urls) * 100).toFixed(2);

    await this.supabase
      .getClient()
      .from('jobs')
      .update({
        progress_percentage: parseFloat(progressPercentage),
        current_url: null,
        current_layer: null,
      })
      .eq('id', jobId);

    this.logger.warn(`[Job ${jobId}] Failed URL ${url.slice(0, 100)}: ${sanitizedError}`);

    await this.insertActivityLog(jobId, 'error', `Failed: ${sanitizedError}`, { url });

    // Check if job complete
    if (processedUrls >= jobMeta.total_urls) {
      await this.markJobComplete(jobId);
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
        current_layer: null,
      })
      .eq('id', jobId);

    this.logger.log(
      `[Job ${jobId}] COMPLETED - ${job.successful_urls}/${job.total_urls} successful (${successRate.toFixed(1)}%), ` +
        `Layer1: ${job.layer1_eliminated_count || 0} eliminated, Layer2: ${job.layer2_eliminated_count || 0} eliminated, ` +
        `$${job.total_cost?.toFixed(6) || '0.00'} total cost, $${job.estimated_savings?.toFixed(6) || '0.00'} saved`,
    );

    await this.insertActivityLog(
      jobId,
      'success',
      `Job completed: ${job.successful_urls}/${job.total_urls} successful, ` +
        `Layer1: ${job.layer1_eliminated_count || 0} eliminated, Layer2: ${job.layer2_eliminated_count || 0} eliminated, ` +
        `$${job.total_cost?.toFixed(6) || '0.00'} total cost, $${job.estimated_savings?.toFixed(6) || '0.00'} savings`,
      {
        successRate: successRate.toFixed(2),
        avgCostPerUrl: avgCostPerUrl.toFixed(6),
        layer1Eliminated: job.layer1_eliminated_count || 0,
        layer2Eliminated: job.layer2_eliminated_count || 0,
        estimatedSavings: job.estimated_savings || 0,
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
   * Retry logic with exponential backoff (T020-T021: BullMQ Retry Configuration)
   * Handles transient errors (timeouts, rate limits, 503)
   *
   * Retry Strategy:
   * - Max attempts: 3
   * - Initial delay: 1 second
   * - Backoff multiplier: 2x (1s → 2s → 4s)
   * - Special handling: 429 rate limit errors get 30s delay
   * - Transient errors only: Permanent errors (401, 400, 403) are not retried
   *
   * @private
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxAttempts: number,
    url: string,
  ): Promise<T> {
    // Exponential backoff delays: 1s → 2s → 4s (2x multiplier)
    const delays = [1000, 2000, 4000];

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
   * Get empty Layer 1 factors structure for backwards compatibility
   * Used when Layer 1 analysis fails or returns null
   * @private
   */
  private getEmptyLayer1Factors(): any {
    return {
      tld_type: 'gtld',
      tld_value: 'unknown',
      domain_classification: 'personal',
      pattern_matches: [],
      target_profile: {
        type: 'unknown',
        confidence: 0,
      },
      reasoning: 'Empty factors - Layer 1 analysis not available',
      passed: false,
    };
  }

  /**
   * Get empty Layer 2 factors structure for backwards compatibility
   * Used when Layer 2 analysis fails or returns null
   * @private
   */
  private getEmptyLayer2Factors(): any {
    return {
      publication_score: 0,
      module_scores: {
        product_offering: 0,
        layout_quality: 0,
        navigation_complexity: 0,
        monetization_indicators: 0,
      },
      keywords_found: [],
      ad_networks_detected: [],
      content_signals: {
        has_blog: false,
        has_press_releases: false,
        has_whitepapers: false,
        has_case_studies: false,
      },
      reasoning: 'Empty factors - Layer 2 analysis not available',
      passed: false,
    };
  }

  /**
   * Get empty Layer 3 factors structure for backwards compatibility
   * Used when Layer 3 analysis fails or returns null
   * @private
   */
  private getEmptyLayer3Factors(): any {
    return {
      classification: 'rejected',
      sophistication_signals: {
        design_quality: {
          score: 0,
          indicators: [],
        },
        authority_indicators: {
          score: 0,
          indicators: [],
        },
        professional_presentation: {
          score: 0,
          indicators: [],
        },
        content_originality: {
          score: 0,
          indicators: [],
        },
      },
      llm_provider: 'none',
      model_version: 'unknown',
      cost_usd: 0,
      reasoning: 'Empty factors - Layer 3 analysis not available',
      tokens_used: {
        input: 0,
        output: 0,
      },
      processing_time_ms: 0,
    };
  }

  /**
   * Graceful shutdown handling
   * Finish current URLs before stopping
   * Called by NestJS when SIGTERM signal received (Railway deployments)
   */
  async onModuleDestroy() {
    this.logger.log('Graceful shutdown initiated - finishing active jobs...');
    this.isShuttingDown = true;

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
