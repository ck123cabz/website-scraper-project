/**
 * TypeScript interfaces for url_results table and Layer 1/2/3 factor structures
 * Part of batch processing refactor (Phase 1, Tasks T006-T009)
 *
 * These interfaces align with:
 * - Database schema: supabase/migrations/20251113000001_add_layer_factors.sql
 * - JSONB column schemas: URL_RESULTS_SCHEMA.md and data-model.md
 */

/**
 * Layer 1: Domain Analysis Factors
 *
 * Stores results from domain-level analysis including TLD classification,
 * domain reputation, pattern matching, and target profile identification.
 */
export interface Layer1Factors {
  /** TLD classification type */
  tld_type: 'gtld' | 'cctld' | 'custom';

  /** The actual TLD value (e.g., '.com', '.uk', '.tech') */
  tld_value: string;

  /** Domain classification category */
  domain_classification: 'commercial' | 'personal' | 'institutional' | 'spam';

  /** Array of matched patterns (e.g., ['affiliate-link', 'url-shortener']) */
  pattern_matches: string[];

  /** Target profile analysis */
  target_profile: {
    /** Type of target profile (e.g., 'B2B software', 'e-commerce') */
    type: string;
    /** Confidence score (0.0-1.0) */
    confidence: number;
  };

  /** Human-readable explanation of Layer 1 analysis */
  reasoning: string;

  /** Whether URL passed Layer 1 filtering */
  passed: boolean;
}

/**
 * Layer 2: Publication Detection Factors
 *
 * Stores results from publication detection analysis including content signals,
 * module scores, keywords, and monetization indicators.
 */
export interface Layer2Factors {
  /** Overall publication score (0.0-1.0), threshold typically 0.7 */
  publication_score: number;

  /** Individual module scores for different publication signals */
  module_scores: {
    /** Product offering score (0.0-1.0) */
    product_offering: number;
    /** Layout quality score (0.0-1.0) */
    layout_quality: number;
    /** Navigation complexity score (0.0-1.0) */
    navigation_complexity: number;
    /** Monetization indicators score (0.0-1.0) */
    monetization_indicators: number;
  };

  /** Array of publication keywords detected */
  keywords_found: string[];

  /** Array of ad networks detected (e.g., ['Google Ads', 'Amazon Associates']) */
  ad_networks_detected: string[];

  /** Content signals indicating publication characteristics */
  content_signals: {
    /** Has blog section */
    has_blog: boolean;
    /** Has press releases */
    has_press_releases: boolean;
    /** Has whitepapers */
    has_whitepapers: boolean;
    /** Has case studies */
    has_case_studies: boolean;
  };

  /** Human-readable explanation of Layer 2 analysis */
  reasoning: string;

  /** Whether URL passed Layer 2 filtering */
  passed: boolean;
}

/**
 * Layer 3: Sophistication Analysis Factors
 *
 * Stores results from LLM-powered sophistication analysis including
 * design quality, authority indicators, and content originality.
 */
export interface Layer3Factors {
  /** Final classification decision */
  classification: 'accepted' | 'rejected';

  /** Detailed sophistication signals across multiple dimensions */
  sophistication_signals: {
    /** Design quality analysis */
    design_quality: {
      /** Score (0.0-1.0) */
      score: number;
      /** Array of design quality indicators */
      indicators: string[];
    };
    /** Authority indicators analysis */
    authority_indicators: {
      /** Score (0.0-1.0) */
      score: number;
      /** Array of authority indicators */
      indicators: string[];
    };
    /** Professional presentation analysis */
    professional_presentation: {
      /** Score (0.0-1.0) */
      score: number;
      /** Array of presentation indicators */
      indicators: string[];
    };
    /** Content originality analysis */
    content_originality: {
      /** Score (0.0-1.0) */
      score: number;
      /** Array of originality indicators */
      indicators: string[];
    };
  };

  /** LLM provider used (e.g., 'openai', 'anthropic', 'google') */
  llm_provider: string;

  /** Model version used (e.g., 'gpt-4-turbo-preview', 'claude-3-opus') */
  model_version: string;

  /** Cost of this LLM API call in USD */
  cost_usd: number;

  /** Full LLM explanation (up to 5000 chars) */
  reasoning: string;

  /** Token usage statistics */
  tokens_used: {
    /** Input tokens */
    input: number;
    /** Output tokens */
    output: number;
  };

  /** Processing time for Layer 3 in milliseconds */
  processing_time_ms: number;
}

/**
 * URL Result Record
 *
 * Complete result record for a URL processed through the 3-layer pipeline.
 * Corresponds to url_results table in database.
 *
 * Note: Layer factor fields may be NULL for pre-migration data.
 */
export interface UrlResult {
  /** Primary key (UUID) */
  id: string;

  /** The URL being analyzed */
  url: string;

  /** Foreign key to jobs table (UUID) */
  job_id: string;

  /** Foreign key to job_urls table (UUID) */
  url_id: string;

  /** Layer 3 confidence score (0.00-1.00), NULL if not reached Layer 3 */
  confidence_score: number | null;

  /** Confidence band classification (very-high, high, medium, low, very-low) */
  confidence_band: 'very-high' | 'high' | 'medium' | 'low' | 'very-low' | null;

  /** Which layer eliminated this URL, or 'passed_all' if accepted */
  eliminated_at_layer: 'layer1' | 'layer2' | 'layer3' | 'passed_all' | null;

  /** Total processing time across all layers in milliseconds */
  processing_time_ms: number;

  /** Total cost in USD (scraping + LLM API calls) */
  total_cost: number;

  /** Number of retry attempts (0-3) */
  retry_count: number;

  /** Last error message if retry needed */
  last_error: string | null;

  /** Timestamp of last retry attempt */
  last_retry_at: Date | null;

  /** When processing of all layers completed (timestamp) */
  processed_at: Date;

  /** Layer 1 domain analysis factors (NULL for pre-migration data) */
  layer1_factors: Layer1Factors | null;

  /** Layer 2 publication detection factors (NULL for pre-migration data) */
  layer2_factors: Layer2Factors | null;

  /** Layer 3 sophistication analysis factors (NULL for pre-migration data) */
  layer3_factors: Layer3Factors | null;

  /** Current processing status */
  status: 'approved' | 'rejected' | 'queue_overflow' | 'pending' | 'processing' | 'failed' | 'timeout';

  /** Notes from reviewer or system */
  reviewer_notes: string | null;

  /** When record was created */
  created_at: Date;

  /** When record was last updated (auto-updated via trigger) */
  updated_at: Date;
}
