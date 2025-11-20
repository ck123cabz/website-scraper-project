/**
 * @deprecated This file is deprecated as of Phase 7, User Story 5
 * Manual review system has been removed from the codebase.
 * This file is kept temporarily for backward compatibility.
 * Scheduled for deletion after 2 weeks of production stability.
 */

/**
 * Sophistication signal from Layer 3 analysis
 */
export interface SophisticationSignal {
  score: number;
  indicators: string[];
}

/**
 * @deprecated Manual Review Settings - System removed in Phase 7, US5
 * Configuration for manual review queue and routing
 * All URLs now process through Layer 1/2/3 automatically without manual review routing
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
 * @deprecated Default manual review settings - System removed in Phase 7, US5
 */
export const DEFAULT_MANUAL_REVIEW_SETTINGS: ManualReviewSettings = {
  enabled: true,
  auto_review_timeout_hours: 72,
  max_queue_size: 1000,
  enable_slack_notifications: false,
};
