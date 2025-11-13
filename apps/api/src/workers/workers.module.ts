import { Module } from '@nestjs/common';
import { UrlWorkerProcessor } from './url-worker.processor';
import { SupabaseModule } from '../supabase/supabase.module';
import { ScraperModule } from '../scraper/scraper.module';
import { JobsModule } from '../jobs/jobs.module';

/**
 * Workers module for BullMQ background processing
 * Story 2.5: Worker Processing & Real-Time Updates
 * Story 2.3: Layer 1 Domain Analysis (Pre-Scrape)
 * T018-T019: Batch Processing Refactor - writes complete factors to url_results
 */
@Module({
  imports: [
    SupabaseModule,
    ScraperModule,
    JobsModule, // Provides Layer1DomainAnalysisService, Layer2OperationalFilterService, LlmService, and ConfidenceScoringService
  ],
  providers: [UrlWorkerProcessor],
  exports: [UrlWorkerProcessor],
})
export class WorkersModule {}
