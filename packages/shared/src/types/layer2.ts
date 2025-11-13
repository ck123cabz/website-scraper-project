/**
 * Layer 2 Operational Filter Types
 * Story 2.6: Layer 2 Operational Filter (Homepage Scraping & Company Validation)
 * Analyzes publication detection signals to filter out content sites
 */

/**
 * Layer 2 publication detection signals
 * Stored in results.layer2_signals JSONB column
 */
export interface Layer2Signals {
  // Module 1: Product Offering
  has_product_offering: boolean;
  product_confidence: number;        // 0-1
  detected_product_keywords: string[];

  // Module 2: Homepage Layout
  homepage_is_blog: boolean;
  layout_type: 'blog' | 'marketing' | 'mixed';
  layout_confidence: number;         // 0-1

  // Module 3: Navigation
  has_business_nav: boolean;
  business_nav_percentage: number;   // 0-1
  nav_items_classified: {
    business: string[];
    content: string[];
    other: string[];
  };

  // Module 4: Monetization
  monetization_type: 'ads' | 'affiliates' | 'business' | 'mixed' | 'unknown';
  ad_networks_detected: string[];
  affiliate_patterns_detected: string[];

  // Aggregation
  publication_score: number;         // 0-1 (average of module scores)
  module_scores: {
    product_offering: number;
    layout: number;
    navigation: number;
    monetization: number;
  };
}

/**
 * Layer 2 Publication Detection Rules
 * Loaded from classification_settings.layer2_rules
 */
export interface Layer2Rules {
  /** Publication score threshold (0-1). URLs scoring >= this are rejected. Default: 0.65 */
  publication_score_threshold: number;

  /** Product offering detection keywords */
  product_keywords: {
    commercial: string[];  // ["pricing", "buy", "demo", "plans"]
    features: string[];    // ["features", "capabilities", "solutions"]
    cta: string[];         // ["get started", "sign up", "free trial"]
  };

  /** Navigation classification keywords */
  business_nav_keywords: string[];     // ["product", "pricing", "solutions", "about"]
  content_nav_keywords: string[];      // ["articles", "blog", "news", "topics"]
  min_business_nav_percentage: number; // 0.3 default (30%)

  /** Monetization detection patterns */
  ad_network_patterns: string[];       // ["googlesyndication", "adsense", "doubleclick"]
  affiliate_patterns: string[];        // ["amazon", "affiliate", "aff=", "ref="]
  payment_provider_patterns: string[]; // ["stripe", "paypal", "braintree"]
}

/**
 * Layer 2 filtering result
 * Returned by Layer2OperationalFilterService.filterUrl()
 */
export interface Layer2FilterResult {
  /** Whether the URL passed Layer 2 operational filtering */
  passed: boolean;
  /** Detailed reasoning for pass/reject decision */
  reasoning: string;
  /** All detected operational signals */
  signals: Layer2Signals;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}
