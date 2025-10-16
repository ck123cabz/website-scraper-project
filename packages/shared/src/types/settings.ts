import { PreFilterRule } from './prefilter';
import { Layer2Rules } from './layer2';

/**
 * Pre-filter rule with enabled flag for database storage
 */
export interface PreFilterRuleWithEnabled extends PreFilterRule {
  /** Whether this rule is currently enabled */
  enabled: boolean;
}

// ============================================================================
// Story 3.0: 3-Tier Architecture Layer-Specific Settings Interfaces
// ============================================================================

/**
 * Layer 1 Domain Analysis Rules
 * Filters URLs based on domain characteristics WITHOUT HTTP requests
 */
export interface Layer1Rules {
  /** TLD filtering by category */
  tld_filters: {
    commercial: string[]; // [".com", ".io", ".co", ".ai"]
    non_commercial: string[]; // [".org", ".gov", ".edu"]
    personal: string[]; // [".me", ".blog", ".xyz"]
  };
  /** Industry keywords for domain classification */
  industry_keywords: string[]; // ["SaaS", "consulting", "software", ...]
  /** URL pattern exclusions (with enabled flags) */
  url_pattern_exclusions: Array<{
    pattern: string;
    enabled: boolean;
    category?: string;
    reasoning?: string;
  }>;
  /** Target elimination rate (0-1, default 0.5 for 50%) */
  target_elimination_rate: number;
}

/**
 * Note: Layer2Rules is imported from './layer2' to avoid duplication
 */

/**
 * Layer 3 LLM Classification Rules
 * Controls LLM-based content classification
 */
export interface Layer3Rules {
  /** Content marketing indicators for LLM prompt */
  content_marketing_indicators: string[]; // ["Write for us", "Guest post guidelines", ...]
  /** SEO investment signals */
  seo_investment_signals: string[]; // ["schema_markup", "open_graph", "structured_data"]
  /** LLM temperature (0-1, default 0.3) */
  llm_temperature: number;
  /** Content truncation limit in characters (default 10000) */
  content_truncation_limit: number;
}

/**
 * Confidence Band Configuration
 * Routes URLs to auto-approve, manual review, or reject based on confidence score
 */
export interface ConfidenceBandConfig {
  /** Minimum confidence score for this band (0-1) */
  min: number;
  /** Maximum confidence score for this band (0-1) */
  max: number;
  /** Action to take for URLs in this band */
  action: 'auto_approve' | 'manual_review' | 'reject';
}

/**
 * Confidence Bands for all routing tiers
 */
export interface ConfidenceBands {
  high: ConfidenceBandConfig; // 0.8-1.0 → auto_approve
  medium: ConfidenceBandConfig; // 0.5-0.79 → manual_review
  low: ConfidenceBandConfig; // 0.3-0.49 → manual_review
  auto_reject: ConfidenceBandConfig; // 0-0.29 → reject
}

/**
 * Manual Review Queue Settings
 */
export interface ManualReviewSettings {
  /** Maximum queue size (null = unlimited) */
  queue_size_limit: number | null;
  /** Auto-review timeout in days (null = disabled) */
  auto_review_timeout_days: number | null;
  /** Notification preferences */
  notifications: {
    /** Email notification threshold (send email when queue reaches this size) */
    email_threshold: number;
    /** Show badge on dashboard */
    dashboard_badge: boolean;
    /** Slack integration enabled */
    slack_integration: boolean;
  };
}

/**
 * Classification Settings - 3-Tier Architecture
 * Story 3.0: Refactored for layer-specific settings management
 */
export interface ClassificationSettings {
  /** Unique identifier */
  id?: string;

  // V1 fields (preserved for backward compatibility during migration)
  /** @deprecated Use layer1_rules instead */
  prefilter_rules?: PreFilterRuleWithEnabled[];
  /** @deprecated Use layer3_rules.content_marketing_indicators instead */
  classification_indicators?: string[];
  /** @deprecated Use layer3_rules.llm_temperature instead */
  llm_temperature?: number;
  /** @deprecated Use confidence_bands instead */
  confidence_threshold?: number;
  /** @deprecated Use layer3_rules.content_truncation_limit instead */
  content_truncation_limit?: number;
  /** @deprecated Use confidence_bands instead */
  confidence_threshold_high?: number;
  /** @deprecated Use confidence_bands instead */
  confidence_threshold_medium?: number;
  /** @deprecated Use confidence_bands instead */
  confidence_threshold_low?: number;

  // 3-Tier Architecture fields (Story 3.0)
  /** Layer 1 Domain Analysis rules */
  layer1_rules: Layer1Rules;
  /** Layer 2 Operational Validation rules */
  layer2_rules: Layer2Rules;
  /** Layer 3 LLM Classification rules */
  layer3_rules: Layer3Rules;
  /** Confidence band routing configuration */
  confidence_bands: ConfidenceBands;
  /** Manual review queue settings */
  manual_review_settings: ManualReviewSettings;

  /** Timestamp of last update */
  updated_at?: string;
}

/**
 * DTO for updating classification settings
 * Story 3.0: Supports both V1 and 3-tier payloads during migration
 */
export interface UpdateClassificationSettingsDto {
  // V1 fields (deprecated but still accepted)
  prefilter_rules?: PreFilterRuleWithEnabled[];
  classification_indicators?: string[];
  llm_temperature?: number;
  confidence_threshold?: number;
  content_truncation_limit?: number;

  // 3-Tier Architecture fields
  layer1_rules?: Layer1Rules;
  layer2_rules?: Layer2Rules;
  layer3_rules?: Layer3Rules;
  confidence_bands?: ConfidenceBands;
  manual_review_settings?: ManualReviewSettings;
}
