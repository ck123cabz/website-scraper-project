import { PreFilterRule } from './prefilter';

/**
 * Pre-filter rule with enabled flag for database storage
 */
export interface PreFilterRuleWithEnabled extends PreFilterRule {
  /** Whether this rule is currently enabled */
  enabled: boolean;
}

/**
 * Classification settings for the entire application
 * Stored in the classification_settings database table
 */
export interface ClassificationSettings {
  /** Unique identifier */
  id?: string;

  /** Array of pre-filter rules with enabled flags */
  prefilter_rules: PreFilterRuleWithEnabled[];

  /** Array of classification indicator strings used in LLM prompts */
  classification_indicators: string[];

  /** LLM temperature (0-1, lower = more focused, higher = more creative) */
  llm_temperature: number;

  /** Minimum confidence threshold (0-1, results below are marked not_suitable) */
  confidence_threshold: number;

  /** Maximum content length in characters for LLM processing */
  content_truncation_limit: number;

  /** Timestamp of last update */
  updated_at?: string;
}

/**
 * DTO for updating classification settings
 */
export interface UpdateClassificationSettingsDto {
  prefilter_rules?: PreFilterRuleWithEnabled[];
  classification_indicators?: string[];
  llm_temperature?: number;
  confidence_threshold?: number;
  content_truncation_limit?: number;
}
