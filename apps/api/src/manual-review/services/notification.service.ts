import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IncomingWebhook } from '@slack/webhook';

/**
 * NotificationService (Phase 6: T045, Phase 8: T048-T049)
 *
 * Sends notifications to external channels when manual review queue reaches threshold.
 * Currently supports Slack notifications via webhook.
 *
 * Features:
 * - Comprehensive error handling for all error types (T048)
 * - Retry logic with exponential backoff for transient errors (T049)
 * - Non-blocking operation - failures don't affect main workflow
 * - Graceful error logging and recovery
 *
 * @example
 * const service = new NotificationService(configService);
 * const result = await service.sendSlackNotification(12, 'https://hooks.slack.com/services/...');
 * if (!result.success) {
 *   console.log(`Failed after ${result.retries} retries:`, result.error);
 * }
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly MAX_RETRIES = 3;

  constructor(private readonly configService: ConfigService) {}

  /**
   * Send Slack notification when queue reaches threshold with retry logic
   *
   * Posts a formatted message to Slack webhook with:
   * - Current queue size
   * - Link to manual review page
   * - Timestamp
   * - Status information
   *
   * Implements retry logic with exponential backoff (T049):
   * - Up to 3 retries for transient errors (network, 5xx)
   * - Delays: 1s (attempt 0), 2s (attempt 1), 4s (attempt 2)
   * - Non-retryable errors (4xx, validation) fail immediately
   *
   * Errors are handled gracefully and logged but do not block processing (T048).
   * This is a non-blocking operation - failures in notification should not affect
   * the main processing workflow.
   *
   * @param queueSize - Number of items in the manual review queue
   * @param slackWebhookUrl - Slack webhook URL (should be configured in environment)
   * @param maxRetries - Maximum number of retry attempts (default: 3)
   * @returns Object with success flag, optional error message, and retry count
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
   *   console.error(`Failed after ${result.retries} retries:`, result.error);
   * }
   */
  async sendSlackNotification(
    queueSize: number,
    slackWebhookUrl: string,
    maxRetries: number = this.MAX_RETRIES,
  ): Promise<{ success: boolean; error?: string; retries?: number }> {
    // Validate inputs - these are non-retryable
    if (!slackWebhookUrl) {
      this.logger.warn('Slack webhook URL is not configured');
      return { success: false, error: 'Webhook URL not configured', retries: 0 };
    }

    if (queueSize < 0) {
      this.logger.warn('Queue size must be non-negative');
      return { success: false, error: 'Invalid queue size', retries: 0 };
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
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

        this.logger.debug(
          `Slack notification sent for queue size: ${queueSize}${attempt > 0 ? ` (retry ${attempt}/${maxRetries})` : ''}`,
        );
        return { success: true, retries: attempt };
      } catch (error) {
        lastError = this.normalizeError(error);

        // Check if error is retryable and we have retries left
        if (attempt < maxRetries && this.isRetryableError(lastError)) {
          const delayMs = this.calculateBackoffDelay(attempt);
          this.logger.warn(
            `Retry ${attempt + 1}/${maxRetries} in ${delayMs}ms. Error: ${lastError.message}`,
            { error: lastError },
          );

          // Wait before retrying
          await this.sleep(delayMs);
        } else {
          // Error is not retryable or we've exhausted retries
          break;
        }
      }
    }

    // All retries exhausted or non-retryable error occurred
    const errorMessage =
      lastError instanceof Error ? lastError.message : String(lastError);
    this.logger.error(`Failed to send Slack notification: ${errorMessage}`, {
      queueSize,
      stack: lastError instanceof Error ? lastError.stack : undefined,
      retriesAttempted: maxRetries,
    });

    return {
      success: false,
      error: errorMessage,
      retries: maxRetries,
    };
  }

  /**
   * Calculate exponential backoff delay in milliseconds
   *
   * Formula: 2^attemptNumber * 1000
   * Results: 1s (attempt 0), 2s (attempt 1), 4s (attempt 2)
   *
   * @param attemptNumber - The current retry attempt number (0-based)
   * @returns Delay in milliseconds
   */
  private calculateBackoffDelay(attemptNumber: number): number {
    return Math.pow(2, attemptNumber) * 1000;
  }

  /**
   * Determine if an error should trigger a retry
   *
   * Retryable errors (transient):
   * - Network error codes: ECONNREFUSED, ETIMEDOUT, ENOTFOUND, ECONNRESET
   * - HTTP 5xx errors: 500, 502, 503, 504, etc.
   *
   * Non-retryable errors (permanent):
   * - HTTP 4xx errors: 400, 401, 403, 404, 429, etc.
   * - Validation errors
   * - Generic errors (unknown type)
   *
   * @param error - The error to check
   * @returns true if the error should trigger a retry attempt
   */
  private isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();

    // Network error codes - retryable (explicit error codes only)
    if (
      message.includes('econnrefused') ||
      message.includes('etimedout') ||
      message.includes('enotfound') ||
      message.includes('econnreset')
    ) {
      return true;
    }

    // HTTP 5xx errors - retryable
    if (
      message.includes(' 500') ||
      message.includes('500:') ||
      message.includes(' 502') ||
      message.includes('502:') ||
      message.includes(' 503') ||
      message.includes('503:') ||
      message.includes(' 504') ||
      message.includes('504:')
    ) {
      return true;
    }

    // HTTP 4xx errors - explicitly not retryable
    if (
      message.includes(' 400') ||
      message.includes('400:') ||
      message.includes(' 401') ||
      message.includes('401:') ||
      message.includes(' 403') ||
      message.includes('403:') ||
      message.includes(' 404') ||
      message.includes('404:') ||
      message.includes(' 429') ||
      message.includes('429:')
    ) {
      return false;
    }

    // By default, don't retry unknown errors to prevent infinite loops
    return false;
  }

  /**
   * Normalize error to ensure it's always an Error object
   *
   * Handles various error types that may be thrown:
   * - Error objects
   * - String errors
   * - Unknown objects
   *
   * @param error - Any value that might be an error
   * @returns Normalized Error object
   */
  private normalizeError(error: unknown): Error {
    if (error instanceof Error) {
      return error;
    }

    if (typeof error === 'string') {
      return new Error(error);
    }

    if (typeof error === 'object' && error !== null) {
      return new Error(JSON.stringify(error));
    }

    return new Error(String(error));
  }

  /**
   * Simple sleep utility for delay between retries
   *
   * @param ms - Milliseconds to sleep
   * @returns Promise that resolves after the delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
