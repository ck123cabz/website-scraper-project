import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { SettingsModule } from '../settings/settings.module';
import { ManualReviewRouterService } from '../jobs/services/manual-review-router.service';
import { ManualReviewService } from './manual-review.service';
import { ManualReviewController } from './manual-review.controller';
import { NotificationService } from './services/notification.service';

/**
 * Manual Review Module (Story 001-manual-review-system)
 *
 * Orchestrates manual review queue management and routing.
 * Dependencies: Supabase (database), Settings (configuration)
 *
 * Phase 2 (T010): Module structure and dependencies setup
 * Phase 3 (T011-T018): ManualReviewService, ManualReviewController, API implementation
 * Phase 6 (T045): NotificationService for Slack notifications
 *
 * Exports:
 * - ManualReviewService: Query and update queue entries
 * - ManualReviewRouterService: Route URLs and manage queue lifecycle
 * - NotificationService: Send notifications (Slack) when queue reaches threshold
 */
@Module({
  imports: [SupabaseModule, SettingsModule],
  providers: [ManualReviewRouterService, ManualReviewService, NotificationService],
  controllers: [ManualReviewController],
  exports: [ManualReviewRouterService, ManualReviewService, NotificationService],
})
export class ManualReviewModule {}
