/**
 * Layer 1 Domain Analysis Types
 * Story 2.3 Refactored: Layer 1 Domain Analysis (Pre-Scrape)
 * Analyzes URLs based on domain characteristics without HTTP requests
 */

/**
 * Result of Layer 1 domain analysis
 */
export interface Layer1AnalysisResult {
  /** Whether the URL passed Layer 1 analysis */
  passed: boolean;
  /** Detailed reasoning for the decision */
  reasoning: string;
  /** Layer identifier */
  layer: 'layer1';
  /** Time taken to analyze in milliseconds */
  processingTimeMs: number;
}

/**
 * TLD filtering configuration
 */
export interface TLDFiltering {
  /** Commercial TLDs that PASS Layer 1 */
  commercial: string[];
  /** Non-commercial TLDs that REJECT in Layer 1 */
  non_commercial: string[];
  /** Personal blog platform TLDs that REJECT in Layer 1 */
  personal_blog: string[];
  /** Blog platform domains (e.g., medium.com, substack.com) that REJECT in Layer 1 */
  blog_platform_domains: string[];
}

/**
 * Domain classification configuration
 */
export interface DomainClassification {
  /** Keywords indicating digital-native companies */
  digital_native_keywords: string[];
  /** Keywords indicating traditional businesses */
  traditional_keywords: string[];
}

/**
 * URL pattern exclusion configuration
 */
export interface URLPatterns {
  /** Subdomain patterns indicating blog infrastructure */
  subdomain_blogs: string[];
  /** URL path patterns indicating tag/category pages */
  tag_pages: string[];
  /** URL path patterns indicating user-generated content */
  user_content: string[];
}

/**
 * Target profile matching configuration
 */
export interface TargetProfile {
  /** Positive indicators of suitable profiles */
  positive_indicators: string[];
  /** Negative indicators of unsuitable profiles */
  negative_indicators: string[];
}

/**
 * Complete Layer 1 domain analysis rules configuration
 */
export interface Layer1DomainRules {
  /** TLD filtering rules */
  tld_filtering: TLDFiltering;
  /** Domain classification rules */
  domain_classification: DomainClassification;
  /** URL pattern exclusion rules */
  url_patterns: URLPatterns;
  /** Target profile matching rules */
  target_profile: TargetProfile;
}

/**
 * Layer 1 elimination statistics
 */
export interface Layer1Statistics {
  /** Total URLs analyzed */
  total: number;
  /** URLs eliminated in Layer 1 */
  eliminated: number;
  /** URLs passed through */
  passed: number;
  /** Elimination rate percentage */
  eliminationRate: number;
}

/**
 * Cost savings breakdown
 */
export interface CostSavings {
  /** Scraping cost savings */
  scrapingSavings: number;
  /** LLM cost savings */
  llmSavings: number;
  /** Total cost savings */
  totalSavings: number;
}
