import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IncomingWebhook } from '@slack/webhook';

/**
 * NotificationService (Phase 6: T045)
 *
 * Sends notifications to external channels when manual review queue reaches threshold.
 * Currently supports Slack notifications via webhook.
 *
 * @example
 * const service = new NotificationService(configService);
 * const result = await service.sendSlackNotification(12, 'https://hooks.slack.com/services/...');
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Send Slack notification when queue reaches threshold
   *
   * Posts a formatted message to Slack webhook with:
   * - Current queue size
   * - Link to manual review page
   * - Timestamp
   * - Status information
   *
   * Errors are handled gracefully and logged but do not block processing.
   * This is a non-blocking operation - failures in notification should not affect
   * the main processing workflow.
   *
   * @param queueSize - Number of items in the manual review queue
   * @param slackWebhookUrl - Slack webhook URL (should be configured in environment)
   * @returns Object with success flag and optional error message
   *
   * @example
   * const result = await notificationService.sendSlackNotification(
   *   12,
   *   'https://hooks.slack.com/services/T1234/B5678/XXXX'
   * );
   *
   * if (result.success) {
   *   console.log('Slack notification sent');
   * } else {
   *   console.error('Failed to send notification:', result.error);
   * }
   */
  async sendSlackNotification(
    queueSize: number,
    slackWebhookUrl: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate inputs
      if (!slackWebhookUrl) {
        this.logger.warn('Slack webhook URL is not configured');
        return { success: false, error: 'Webhook URL not configured' };
      }

      if (queueSize < 0) {
        this.logger.warn('Queue size must be non-negative');
        return { success: false, error: 'Invalid queue size' };
      }

      // Initialize Slack webhook
      const webhook = new IncomingWebhook(slackWebhookUrl);

      // Build message with queue information
      const baseUrl = this.configService.get<string>(
        'APP_BASE_URL',
        'http://localhost:3000',
      );
      const manualReviewUrl = `${baseUrl}/manual-review`;
      const timestamp = new Date().toISOString();

      const message = {
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Manual Review Queue Alert*\n\nQueue has reached *${queueSize}* item${queueSize !== 1 ? 's' : ''} requiring review.`,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Queue Size:*\n${queueSize}`,
              },
              {
                type: 'mrkdwn',
                text: `*Status:*\nThreshold Reached`,
              },
            ],
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: 'Review Queue',
                  emoji: true,
                },
                url: manualReviewUrl,
              },
            ],
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `Last updated: ${timestamp}`,
              },
            ],
          },
        ],
      };

      // Send to Slack
      await webhook.send(message);

      this.logger.debug(`Slack notification sent for queue size: ${queueSize}`);
      return { success: true };
    } catch (error) {
      // Log error but don't throw - this is non-blocking
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send Slack notification: ${errorMessage}`, {
        queueSize,
        stack: error instanceof Error ? error.stack : undefined,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}
