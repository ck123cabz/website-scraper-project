/**
 * Sophistication signal from Layer 3 analysis
 */
export interface SophisticationSignal {
  score: number;
  indicators: string[];
}

/**
 * Manual Review Settings
 * Configuration for manual review queue and routing
 */
export interface ManualReviewSettings {
  /** Whether manual review is enabled */
  enabled: boolean;

  /** Auto-review timeout in hours (0 = disabled) */
  auto_review_timeout_hours: number;

  /** Maximum queue size (0 = unlimited) */
  max_queue_size: number;

  /** Slack webhook URL for notifications (optional) */
  slack_webhook_url?: string;

  /** Whether to send Slack notifications */
  enable_slack_notifications: boolean;
}

/**
 * Default manual review settings
 */
export const DEFAULT_MANUAL_REVIEW_SETTINGS: ManualReviewSettings = {
  enabled: true,
  auto_review_timeout_hours: 72,
  max_queue_size: 1000,
  enable_slack_notifications: false,
};
