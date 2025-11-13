import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { SettingsService } from '../../settings/settings.service';
import { NotificationService } from '../../manual-review/services/notification.service';
import type { Layer1Results, Layer2Results, Layer3Results } from '@website-scraper/shared';

/**
 * Manual Review Router Service
 * Story 001-manual-review-system T005, T046
 *
 * Routes URLs based on confidence band actions:
 * - auto_approve → insert to url_results with status='approved'
 * - manual_review → enqueue to manual_review_queue (with size limit check)
 * - reject → insert to url_results with status='rejected'
 *
 * T046: Sends Slack notifications when queue reaches configured threshold
 */
@Injectable()
export class ManualReviewRouterService {
  private readonly logger = new Logger(ManualReviewRouterService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly settingsService: SettingsService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Route a URL based on confidence band action
   *
   * @param urlData - URL evaluation data
   * @param layer1Results - Layer 1 domain analysis results
   * @param layer2Results - Layer 2 rule-based check results
   * @param layer3Results - Layer 3 LLM sophistication results
   */
  async routeUrl(
    urlData: {
      url_id: string;
      url: string;
      job_id: string;
      confidence_score: number;
      confidence_band: string;
      action: 'auto_approve' | 'manual_review' | 'reject';
      reasoning?: string;
      sophistication_signals?: Record<string, any>;
    },
    layer1Results: Layer1Results,
    layer2Results: Layer2Results,
    layer3Results: Layer3Results,
  ): Promise<void> {
    this.logger.log(
      `Routing URL ${urlData.url_id}: band=${urlData.confidence_band}, action=${urlData.action}, score=${urlData.confidence_score}`,
    );

    try {
      switch (urlData.action) {
        case 'auto_approve':
          await this.finalizeResult(
            urlData.url_id,
            urlData.job_id,
            urlData.url,
            'approved',
            urlData.confidence_score,
            urlData.confidence_band,
            'Auto-approved based on high confidence score',
          );
          break;

        case 'reject':
          await this.finalizeResult(
            urlData.url_id,
            urlData.job_id,
            urlData.url,
            'rejected',
            urlData.confidence_score,
            urlData.confidence_band,
            'Auto-rejected based on low confidence score',
          );
          break;

        case 'manual_review':
          await this.enqueueForReview(urlData, layer1Results, layer2Results, layer3Results);
          break;

        default:
          this.logger.error(
            `Unknown action "${urlData.action}" for URL ${urlData.url_id}. Defaulting to manual review.`,
          );
          await this.enqueueForReview(urlData, layer1Results, layer2Results, layer3Results);
      }
    } catch (error) {
      this.logger.error(
        `Failed to route URL ${urlData.url_id}:`,
        error instanceof Error ? error.message : error,
      );
      throw error;
    }
  }

  /**
   * Enqueue URL for manual review with queue size limit check
   */
  async enqueueForReview(
    urlData: {
      url_id: string;
      url: string;
      job_id: string;
      confidence_score: number;
      confidence_band: string;
      reasoning?: string;
      sophistication_signals?: Record<string, any>;
    },
    layer1Results: Layer1Results,
    layer2Results: Layer2Results,
    layer3Results: Layer3Results,
  ): Promise<void> {
    const settings = await this.settingsService.getSettings();

    // Check queue size limit if configured
    if (settings.manual_review_settings?.queue_size_limit) {
      const currentQueueSize = await this.countActiveQueue();

      if (currentQueueSize >= settings.manual_review_settings.queue_size_limit) {
        this.logger.warn(
          `Queue size limit reached (${currentQueueSize}/${settings.manual_review_settings.queue_size_limit}). URL ${urlData.url_id} rejected due to overflow.`,
        );

        // Insert to url_results with overflow status
        await this.finalizeResult(
          urlData.url_id,
          urlData.job_id,
          urlData.url,
          'queue_overflow',
          urlData.confidence_score,
          urlData.confidence_band,
          'Manual review queue full',
        );

        // Log overflow event for activity tracking
        await this.logActivity({
          type: 'queue_overflow',
          url_id: urlData.url_id,
          queue_size: currentQueueSize,
          limit: settings.manual_review_settings.queue_size_limit,
        });

        return; // Don't queue
      }
    }

    // Queue has space - insert to manual_review_queue
    const client = this.supabase.getClient();

    const { data, error } = await client
      .from('manual_review_queue')
      .insert({
        url: urlData.url,
        job_id: urlData.job_id,
        url_id: urlData.url_id,
        confidence_band: urlData.confidence_band,
        confidence_score: urlData.confidence_score,
        reasoning: urlData.reasoning || null,
        sophistication_signals: urlData.sophistication_signals || null,
        layer1_results: layer1Results as any,
        layer2_results: layer2Results as any,
        layer3_results: layer3Results as any,
        queued_at: new Date().toISOString(),
        is_stale: false,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to enqueue URL ${urlData.url_id} for manual review:`, error);
      throw new Error(`Failed to enqueue URL: ${error.message}`);
    }

    this.logger.log(
      `URL ${urlData.url_id} enqueued for manual review (queue entry ID: ${data.id})`,
    );

    // T046: Send Slack notification if threshold reached (non-blocking)
    // Get updated queue count and check notification settings
    const queueCount = await this.countActiveQueue();
    const slackWebhookUrl = settings.manual_review_settings?.notifications?.slack_webhook_url;
    const slackThreshold = settings.manual_review_settings?.notifications?.slack_threshold ?? 10;

    if (slackWebhookUrl && queueCount >= slackThreshold) {
      // Non-blocking: don't await, catch errors
      void this.notificationService
        .sendSlackNotification(queueCount, slackWebhookUrl)
        .catch((error) => {
          this.logger.error('Failed to send Slack notification', {
            error: error instanceof Error ? error.message : error,
          });
        });
    }

    // Log routing decision for audit trail
    await this.logActivity({
      type: 'url_routed',
      url_id: urlData.url_id,
      band: urlData.confidence_band,
      action: 'manual_review',
      score: urlData.confidence_score,
    });
  }

  /**
   * Finalize URL result (auto-approve, reject, or overflow)
   * Inserts to url_results table
   */
  private async finalizeResult(
    urlId: string,
    jobId: string,
    url: string,
    status: 'approved' | 'rejected' | 'queue_overflow',
    confidenceScore: number,
    confidenceBand: string,
    reason: string,
  ): Promise<void> {
    const client = this.supabase.getClient();

    // Check if url_results entry already exists
    const { data: existing } = await client
      .from('url_results')
      .select('id')
      .eq('url_id', urlId)
      .single();

    if (existing) {
      // Update existing entry
      const { error } = await client
        .from('url_results')
        .update({
          status,
          confidence_score: confidenceScore,
          confidence_band: confidenceBand,
          reviewer_notes: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('url_id', urlId);

      if (error) {
        this.logger.error(`Failed to update url_results for URL ${urlId}:`, error);
        throw new Error(`Failed to update url_results: ${error.message}`);
      }

      this.logger.log(`URL ${urlId} result updated: status=${status}, score=${confidenceScore}`);
    } else {
      // Insert new entry
      const { error } = await client.from('url_results').insert({
        url_id: urlId,
        job_id: jobId,
        url,
        status,
        confidence_score: confidenceScore,
        confidence_band: confidenceBand,
        reviewer_notes: reason,
      });

      if (error) {
        this.logger.error(`Failed to insert url_results for URL ${urlId}:`, error);
        throw new Error(`Failed to insert url_results: ${error.message}`);
      }

      this.logger.log(`URL ${urlId} finalized: status=${status}, score=${confidenceScore}`);
    }

    // Log routing decision
    await this.logActivity({
      type: 'url_routed',
      url_id: urlId,
      band: confidenceBand,
      action: status === 'approved' ? 'auto_approve' : 'reject',
      score: confidenceScore,
    });
  }

  /**
   * Count active queue items (WHERE reviewed_at IS NULL)
   */
  async countActiveQueue(): Promise<number> {
    const client = this.supabase.getClient();

    const { count, error } = await client
      .from('manual_review_queue')
      .select('id', { count: 'exact', head: true })
      .is('reviewed_at', null);

    if (error) {
      this.logger.error('Failed to count active queue:', error);
      return 0; // Fail open - don't block routing if count fails
    }

    return count || 0;
  }

  /**
   * Log activity for audit trail and analytics
   * Uses existing activity_logs table or creates simple log entry
   */
  private async logActivity(event: {
    type: 'url_routed' | 'queue_overflow';
    url_id: string;
    band?: string;
    action?: string;
    score?: number;
    queue_size?: number;
    limit?: number;
  }): Promise<void> {
    try {
      const client = this.supabase.getClient();

      // Simple activity log entry
      await client.from('activity_logs').insert({
        event_type: event.type,
        event_data: event,
        created_at: new Date().toISOString(),
      });

      this.logger.debug(`Activity logged: ${event.type} for URL ${event.url_id}`);
    } catch (error) {
      // Don't fail routing if activity logging fails
      this.logger.warn(
        `Failed to log activity (non-blocking):`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  /**
   * Review and soft-delete a queue entry
   * Called by ManualReviewController when user makes a decision
   *
   * Supports both overloaded call signatures for backward compatibility:
   * - reviewAndSoftDelete(queueEntryId, decision, notes)
   * - reviewAndSoftDelete({ queue_entry_id, decision, notes, ... })
   *
   * @param queueEntryIdOrData - ID of the queue entry OR review data object
   * @param decision - User's decision (approved/rejected) - optional if first param is object
   * @param notes - Optional reviewer notes
   */
  async reviewAndSoftDelete(
    queueEntryIdOrData:
      | string
      | {
          queue_entry_id: string;
          url_id: string;
          job_id: string;
          decision: 'approved' | 'rejected';
          notes?: string;
          confidence_band?: string;
        },
    decision?: 'approved' | 'rejected',
    notes?: string,
  ): Promise<void> {
    let queueEntryId: string;
    let finalDecision: 'approved' | 'rejected';
    let finalNotes: string | undefined;

    // Handle both call signatures
    if (typeof queueEntryIdOrData === 'string') {
      // Legacy signature: reviewAndSoftDelete(id, decision, notes)
      queueEntryId = queueEntryIdOrData;
      finalDecision = decision!;
      finalNotes = notes;
    } else {
      // New signature: reviewAndSoftDelete({ queue_entry_id, decision, notes, ... })
      queueEntryId = queueEntryIdOrData.queue_entry_id;
      finalDecision = queueEntryIdOrData.decision;
      finalNotes = queueEntryIdOrData.notes;
    }

    const client = this.supabase.getClient();

    // Get the queue entry (if not provided in data object)
    const { data: queueEntry, error: fetchError } = await client
      .from('manual_review_queue')
      .select('*')
      .eq('id', queueEntryId)
      .single();

    if (fetchError || !queueEntry) {
      throw new Error(`Queue entry ${queueEntryId} not found`);
    }

    // Insert to url_results
    await client.from('url_results').insert({
      url_id: queueEntry.url_id,
      job_id: queueEntry.job_id,
      url: queueEntry.url,
      status: finalDecision,
      confidence_score: queueEntry.confidence_score,
      confidence_band: queueEntry.confidence_band,
      reviewer_notes: finalNotes || null,
    });

    // Soft-delete queue entry (set reviewed_at)
    const { error: updateError } = await client
      .from('manual_review_queue')
      .update({
        reviewed_at: new Date().toISOString(),
        review_decision: finalDecision,
        reviewer_notes: finalNotes || null,
      })
      .eq('id', queueEntryId);

    if (updateError) {
      throw new Error(`Failed to update queue entry: ${updateError.message}`);
    }

    // Log activity for audit trail
    await this.logActivity({
      type: 'url_routed',
      url_id: queueEntry.url_id,
      band: queueEntry.confidence_band,
      action: finalDecision === 'approved' ? 'manual_approval' : 'manual_rejection',
      score: queueEntry.confidence_score,
    });

    this.logger.log(`Queue entry ${queueEntryId} reviewed: decision=${finalDecision}`);
  }
}
