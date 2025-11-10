import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseService } from '../../supabase/supabase.service';
import { SettingsService } from '../../settings/settings.service';

/**
 * Stale Queue Marker Processor
 * Story 001-manual-review-system T030, T031, T032
 *
 * Daily scheduled job (2 AM) that:
 * 1. Queries manual_review_queue for items older than auto_review_timeout_days
 * 2. Marks them as stale (is_stale = TRUE)
 * 3. Logs activity for audit trail
 */
@Injectable()
export class StaleQueueMarkerProcessor {
  private readonly logger = new Logger(StaleQueueMarkerProcessor.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly settingsService: SettingsService,
  ) {}

  /**
   * Daily cron job to mark stale queue items
   * Runs at 2 AM every day: 0 2 * * *
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async markStaleItems(): Promise<void> {
    this.logger.log('Starting stale queue marking job...');

    try {
      const settings = await this.settingsService.getSettings();
      const timeoutDays = settings.manual_review_settings?.auto_review_timeout_days;

      // Skip if stale marking is disabled
      if (!timeoutDays) {
        this.logger.log(
          'Stale marking disabled (auto_review_timeout_days not configured)',
        );
        return;
      }

      const client = this.supabase.getClient();

      // Calculate cutoff date: NOW() - timeout_days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - timeoutDays);

      this.logger.log(
        `Looking for queue items older than ${timeoutDays} days (before ${cutoffDate.toISOString()})...`,
      );

      // Query for stale items: active queue items older than timeout threshold
      const { data: staleItems, error: fetchError } = await client
        .from('manual_review_queue')
        .select('id, url_id, job_id, confidence_band, queued_at')
        .is('reviewed_at', null)
        .eq('is_stale', false)
        .lt('queued_at', cutoffDate.toISOString());

      if (fetchError) {
        this.logger.error('Failed to query stale queue items:', fetchError);
        throw fetchError;
      }

      if (!staleItems || staleItems.length === 0) {
        this.logger.log('No stale items found');
        return;
      }

      this.logger.log(`Found ${staleItems.length} stale items to mark`);

      // Batch update: mark all as stale
      const { error: updateError } = await client
        .from('manual_review_queue')
        .update({
          is_stale: true,
          updated_at: new Date().toISOString(),
        })
        .is('reviewed_at', null)
        .eq('is_stale', false)
        .lt('queued_at', cutoffDate.toISOString());

      if (updateError) {
        this.logger.error('Failed to update stale queue items:', updateError);
        throw updateError;
      }

      this.logger.log(`Successfully marked ${staleItems.length} items as stale`);

      // Log activity for each stale item (non-blocking)
      await this.logStaleItems(staleItems, timeoutDays);
    } catch (error) {
      this.logger.error(
        'Stale queue marking job failed:',
        error instanceof Error ? error.message : error,
      );
      // Don't rethrow - scheduled jobs should fail gracefully
    }
  }

  /**
   * Log activity entries for stale items
   * Uses existing activity_logs table for audit trail
   */
  private async logStaleItems(
    staleItems: Array<{
      id: string;
      url_id: string;
      job_id: string;
      confidence_band: string;
      queued_at: string;
    }>,
    timeoutDays: number,
  ): Promise<void> {
    const client = this.supabase.getClient();

    for (const item of staleItems) {
      try {
        const queuedDate = new Date(item.queued_at);
        const daysInQueue = Math.floor(
          (Date.now() - queuedDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        await client.from('activity_logs').insert({
          event_type: 'queue_item_stale',
          event_data: {
            url_id: item.url_id,
            job_id: item.job_id,
            queue_entry_id: item.id,
            confidence_band: item.confidence_band,
            queued_at: item.queued_at,
            days_in_queue: daysInQueue,
            timeout_days: timeoutDays,
          },
          created_at: new Date().toISOString(),
        });

        this.logger.debug(
          `Activity logged for stale item ${item.url_id} (${daysInQueue} days in queue)`,
        );
      } catch (error) {
        // Non-blocking activity logging - don't fail the job if logging fails
        this.logger.warn(
          `Failed to log activity for stale item ${item.url_id}:`,
          error instanceof Error ? error.message : error,
        );
      }
    }
  }
}
