import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { SettingsModule } from '../settings/settings.module';
import { ManualReviewRouterService } from '../jobs/services/manual-review-router.service';
import { ManualReviewService } from './manual-review.service';
import { ManualReviewController } from './manual-review.controller';

/**
 * Manual Review Module (Story 001-manual-review-system)
 *
 * Orchestrates manual review queue management and routing.
 * Dependencies: Supabase (database), Settings (configuration)
 *
 * Phase 2 (T010): Module structure and dependencies setup
 * Phase 3 (T011-T018): ManualReviewService, ManualReviewController, API implementation
 *
 * Exports:
 * - ManualReviewService: Query and update queue entries
 * - ManualReviewRouterService: Route URLs and manage queue lifecycle
 */
@Module({
  imports: [SupabaseModule, SettingsModule],
  providers: [ManualReviewRouterService, ManualReviewService],
  controllers: [ManualReviewController],
  exports: [ManualReviewRouterService, ManualReviewService],
})
export class ManualReviewModule {}
