/**
 * Pre-filter rule configuration
 */
export interface PreFilterRule {
  /** Category of the rule (e.g., 'blog_platform', 'social_media') */
  category: string;
  /** Regex pattern to match against URLs */
  pattern: string;
  /** Human-readable reasoning for why this rule rejects URLs */
  reasoning: string;
}

/**
 * Result of pre-filter evaluation
 */
export interface PreFilterResult {
  /** Whether the URL passed the pre-filter */
  passed: boolean;
  /** Reasoning for the decision */
  reasoning: string;
  /** Category of the matched rule (if rejected) */
  matched_rule?: string;
}

/**
 * Pre-filter configuration structure
 */
export interface PreFilterConfig {
  /** List of filter rules */
  rules: PreFilterRule[];
}
