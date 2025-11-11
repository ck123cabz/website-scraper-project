import { Module } from '@nestjs/common';
import { UrlWorkerProcessor } from './url-worker.processor';
import { SupabaseModule } from '../supabase/supabase.module';
import { ScraperModule } from '../scraper/scraper.module';
import { JobsModule } from '../jobs/jobs.module';
import { ManualReviewModule } from '../manual-review/manual-review.module';

/**
 * Workers module for BullMQ background processing
 * Story 2.5: Worker Processing & Real-Time Updates
 * Story 2.3: Layer 1 Domain Analysis (Pre-Scrape)
 */
@Module({
  imports: [
    SupabaseModule,
    ScraperModule,
    JobsModule, // Provides PreFilterService, Layer1DomainAnalysisService, and LlmService
    ManualReviewModule, // Provides ManualReviewRouterService and NotificationService
  ],
  providers: [UrlWorkerProcessor],
  exports: [UrlWorkerProcessor],
})
export class WorkersModule {}
