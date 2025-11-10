/**
 * Manual Review System Types
 * Feature: Complete Settings Implementation (Manual Review System)
 *
 * Defines types for the manual review queue, layer evaluation results,
 * review decisions, and configuration settings.
 */

// ============================================================================
// Manual Review Queue Entry
// ============================================================================

/**
 * Entry in the manual review queue requiring human judgment
 */
export interface ManualReviewQueueEntry {
  id: string;
  url: string;
  job_id: string;
  url_id: string;
  confidence_band: string;
  confidence_score: number;
  reasoning: string | null;
  sophistication_signals: Record<string, any> | null;
  layer1_results: Layer1Results;
  layer2_results: Layer2Results;
  layer3_results: Layer3Results;
  queued_at: Date;
  reviewed_at: Date | null;
  review_decision: 'approved' | 'rejected' | null;
  reviewer_notes: string | null;
  is_stale: boolean;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// Layer Evaluation Result Types
// ============================================================================

/**
 * Layer 1: Domain Analysis Results
 * Structured evaluation of domain-level factors
 */
export interface Layer1Results {
  domain_age: FactorResult & {
    value?: number;        // Age in days
    threshold?: number;    // Minimum threshold configured
  };
  tld_type: FactorResult & {
    value?: string;        // Actual TLD (e.g., 'com', 'info')
    red_flags?: string[];  // TLDs flagged as suspicious
  };
  registrar_reputation: FactorResult & {
    value?: string;        // Registrar name
    red_flags?: string[];  // Registrars flagged as suspicious
  };
  whois_privacy: FactorResult & {
    enabled?: boolean;
  };
  ssl_certificate: FactorResult & {
    valid?: boolean;
    issuer?: string;
  };
}

/**
 * Layer 2: Rule-Based Checks Results
 * Structured evaluation of guest post indicators and content quality
 */
export interface Layer2Results {
  guest_post_red_flags: {
    contact_page: RedFlagResult;
    author_bio: RedFlagResult;
    pricing_page: RedFlagResult;
    submit_content: RedFlagResult;
    write_for_us: RedFlagResult;
    guest_post_guidelines: RedFlagResult;
  };
  content_quality: {
    thin_content: RedFlagResult & {
      word_count?: number;
      threshold?: number;
    };
    excessive_ads: RedFlagResult;
    broken_links: RedFlagResult & {
      count?: number;
    };
  };
}

/**
 * Layer 3: LLM Sophistication Signals Results
 * Structured evaluation of sophisticated website characteristics
 */
export interface Layer3Results {
  design_quality: SophisticationSignal;
  content_originality: SophisticationSignal;
  authority_indicators: SophisticationSignal;
  professional_presentation: SophisticationSignal;
}

// ============================================================================
// Helper Types for Factor Results
// ============================================================================

/**
 * Base result structure for Layer 1 domain factors
 */
export interface FactorResult {
  checked: boolean;  // Whether this factor was evaluated
  passed: boolean;   // Whether this factor passed the check
}

/**
 * Result structure for Layer 2 red flag detection
 */
export interface RedFlagResult {
  checked: boolean;   // Whether this red flag was checked
  detected: boolean;  // Whether this red flag was detected
}

/**
 * Result structure for Layer 3 sophistication signals
 */
export interface SophisticationSignal {
  score: number;       // Score from 0.0 to 1.0
  detected: boolean;   // Whether signal was detected (above threshold)
  reasoning?: string;  // LLM explanation for this signal
}

// ============================================================================
// Review Decision
// ============================================================================

/**
 * User's decision when reviewing a queued URL
 */
export interface ReviewDecision {
  decision: 'approved' | 'rejected';
  notes?: string;  // Optional notes for approval, required for rejection
}

// ============================================================================
// Confidence Band Configuration
// ============================================================================

/**
 * Defines a confidence score band and its associated routing action
 */
export interface ConfidenceBand {
  name: string;                                     // Band name (e.g., 'high', 'medium', 'low', 'auto_reject')
  min: number;                                      // Minimum score (inclusive) 0.0-1.0
  max: number;                                      // Maximum score (inclusive) 0.0-1.0
  action: 'auto_approve' | 'manual_review' | 'reject';  // Routing action
}

// ============================================================================
// Manual Review Settings
// ============================================================================

/**
 * Configuration for manual review queue behavior and notifications
 */
export interface ManualReviewSettings {
  queue_size_limit: number | null;           // Max queue size, null = unlimited
  auto_review_timeout_days: number | null;   // Days before flagging as stale, null = disabled
  notifications: {
    email_threshold: number;                 // Queue size to trigger email
    email_recipient: string;                 // Validated email address
    slack_webhook_url: string | null;        // Slack webhook URL
    slack_threshold: number;                 // Queue size to trigger Slack
    dashboard_badge: boolean;                // Show queue count on dashboard
  };
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Paginated queue response
 */
export interface ManualReviewQueueResponse {
  items: ManualReviewQueueEntry[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Queue status metrics
 */
export interface QueueStatus {
  total: number;           // Total active items in queue
  stale: number;           // Number of stale items
  oldestQueuedAt: Date | null;  // Timestamp of oldest item
  newestQueuedAt: Date | null;  // Timestamp of newest item
}

/**
 * Factor breakdown for UI display
 * Complete evaluation results from all three layers
 */
export interface FactorBreakdown {
  layer1: Layer1Results;
  layer2: Layer2Results;
  layer3: Layer3Results;
  url: string;
  confidence_score: number;
  confidence_band: string;
  reasoning: string | null;
}

// ============================================================================
// Notification Types
// ============================================================================

/**
 * Email notification payload
 */
export interface EmailNotification {
  to: string;
  subject: string;
  body: string;
  queueSize: number;
  reviewUrl: string;
}

/**
 * Slack notification payload
 */
export interface SlackNotification {
  queueSize: number;
  reviewUrl: string;
  threshold: number;
}

// ============================================================================
// Activity Log Types
// ============================================================================

/**
 * Manual review routing decision logged for audit trail
 */
export interface ManualReviewRoutingLog {
  type: 'url_routed';
  url_id: string;
  band: string;
  action: 'auto_approve' | 'manual_review' | 'reject';
  score: number;
  timestamp: Date;
}

/**
 * Queue overflow event logged for capacity planning
 */
export interface QueueOverflowLog {
  type: 'queue_overflow';
  url_id: string;
  queue_size: number;
  limit: number;
  timestamp: Date;
}

/**
 * Stale queue item flagging event
 */
export interface StaleQueueLog {
  type: 'queue_item_stale';
  url_id: string;
  queued_at: Date;
  days_in_queue: number;
  timestamp: Date;
}

/**
 * Union type of all manual review activity log entries
 */
export type ManualReviewActivityLog =
  | ManualReviewRoutingLog
  | QueueOverflowLog
  | StaleQueueLog;

// ============================================================================
// Filter and Query Types
// ============================================================================

/**
 * Query parameters for fetching queue items
 */
export interface QueueQueryParams {
  page?: number;
  pageSize?: number;
  is_stale?: boolean;           // Filter by stale status
  confidence_band?: string;     // Filter by confidence band
  search?: string;              // Search URL text
  sort_by?: 'queued_at' | 'confidence_score';
  sort_order?: 'asc' | 'desc';
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Validation result for confidence band configuration
 */
export interface ConfidenceBandValidation {
  valid: boolean;
  errors: string[];
}

/**
 * Validation helpers
 */
export const validateConfidenceBands = (
  bands: ConfidenceBand[]
): ConfidenceBandValidation => {
  const errors: string[] = [];

  // Check for unique names
  const names = bands.map((b) => b.name);
  const uniqueNames = new Set(names);
  if (names.length !== uniqueNames.size) {
    errors.push('Band names must be unique');
  }

  // Check for valid score ranges
  for (const band of bands) {
    if (band.min < 0 || band.min > 1) {
      errors.push(`Band "${band.name}": min score must be between 0 and 1`);
    }
    if (band.max < 0 || band.max > 1) {
      errors.push(`Band "${band.name}": max score must be between 0 and 1`);
    }
    if (band.min > band.max) {
      errors.push(`Band "${band.name}": min score must be <= max score`);
    }
  }

  // Check for overlapping ranges
  const sortedBands = [...bands].sort((a, b) => a.min - b.min);
  for (let i = 0; i < sortedBands.length - 1; i++) {
    const current = sortedBands[i];
    const next = sortedBands[i + 1];
    if (current.max >= next.min) {
      errors.push(
        `Bands "${current.name}" and "${next.name}" have overlapping ranges`
      );
    }
  }

  // Check full coverage (0.0 to 1.0)
  if (sortedBands.length > 0) {
    if (sortedBands[0].min > 0) {
      errors.push('No band covers scores from 0.0 to first band minimum');
    }
    if (sortedBands[sortedBands.length - 1].max < 1) {
      errors.push('No band covers scores from last band maximum to 1.0');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};
