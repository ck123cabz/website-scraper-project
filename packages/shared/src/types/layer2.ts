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
 * Complete Layer 2 operational signals
 * Stored in results.layer2_signals JSONB column
 */
export interface Layer2Signals {
  /** Company infrastructure page detection */
  company_pages: CompanyPageSignals;
  /** Blog activity and freshness */
  blog_data: BlogDataSignals;
  /** Tech stack tool detection */
  tech_stack: TechStackSignals;
  /** Design quality assessment */
  design_quality: DesignQualitySignals;
}

/**
 * Layer 2 filtering configuration rules
 * Loaded from classification_settings.layer2_rules
 */
export interface Layer2Rules {
  /** Blog freshness threshold in days (default: 90) */
  blog_freshness_days: number;
  /** Minimum required company pages count (default: 2 of 3) */
  required_pages_count: number;
  /** Minimum tech stack tools required (default: 2) */
  min_tech_stack_tools: number;
  /** Tech stack tools grouped by category */
  tech_stack_tools: {
    analytics: string[];
    marketing: string[];
  };
  /** Minimum design quality score (default: 6) */
  min_design_quality_score: number;
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
