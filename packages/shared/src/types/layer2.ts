/**
 * Layer 2 Operational Filter Types
 * Story 2.6: Layer 2 Operational Filter (Homepage Scraping & Company Validation)
 * Analyzes company infrastructure, blog freshness, tech stack, and design quality
 */

/**
 * Company infrastructure detection signals
 * Minimum 2 of 3 required pages to pass Layer 2
 */
export interface CompanyPageSignals {
  /** Presence of About page (keywords: "about", "about us", "our story") */
  has_about: boolean;
  /** Presence of Team page (keywords: "team", "our team", "leadership") */
  has_team: boolean;
  /** Presence of Contact page (keywords: "contact", "get in touch", "reach us") */
  has_contact: boolean;
  /** Total count of detected pages (must be >= 2) */
  count: number;
}

/**
 * Blog freshness and activity signals
 * Requires at least 1 post within configurable threshold (default: 90 days)
 */
export interface BlogDataSignals {
  /** Whether a blog section was found on homepage */
  has_blog: boolean;
  /** ISO date string of most recent blog post (null if none found) */
  last_post_date: string | null;
  /** Days since last blog post (null if no posts found) */
  days_since_last_post: number | null;
  /** Whether blog meets freshness threshold (true if within X days) */
  passes_freshness: boolean;
}

/**
 * Tech stack detection signals
 * Professional tools indicate digital-native company (minimum 2 required)
 */
export interface TechStackSignals {
  /** Array of detected tool names (e.g., ['Google Analytics', 'HubSpot']) */
  tools_detected: string[];
  /** Total count of detected tools (must be >= 2) */
  count: number;
}

/**
 * Professional design quality indicators
 * Modern design signals indicate professional web presence
 */
export interface DesignQualitySignals {
  /** Design quality score (1-10 scale) */
  score: number;
  /** Modern CSS framework detected (Tailwind, Bootstrap, Material UI) */
  has_modern_framework: boolean;
  /** Responsive design indicators (viewport meta tag, media queries) */
  is_responsive: boolean;
  /** Professional imagery detected (high-res images, custom graphics) */
  has_professional_imagery: boolean;
}

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
