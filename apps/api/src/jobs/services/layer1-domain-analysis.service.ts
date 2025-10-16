import { Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import type {
  Layer1AnalysisResult,
  Layer1DomainRules,
} from '@website-scraper/shared';

/**
 * Layer 1 Domain Analysis Service
 * Analyzes URLs based on domain characteristics WITHOUT HTTP requests
 * Eliminates 40-60% of unsuitable URLs before scraping and LLM processing
 * Story 2.3 Refactored: Layer 1 Domain Analysis (Pre-Scrape)
 */
@Injectable()
export class Layer1DomainAnalysisService {
  private readonly logger = new Logger(Layer1DomainAnalysisService.name);
  private rules: Layer1DomainRules | null = null;

  constructor() {
    this.loadRules();
  }

  /**
   * Load Layer 1 domain analysis rules from configuration file
   */
  private loadRules(): void {
    try {
      let configPath: string;
      if (process.env.CONFIG_PATH) {
        configPath = join(process.env.CONFIG_PATH, 'layer1-domain-rules.json');
      } else if (process.env.NODE_ENV === 'production') {
        configPath = join(process.cwd(), 'dist/config/layer1-domain-rules.json');
      } else {
        configPath = join(__dirname, '../../config/layer1-domain-rules.json');
      }

      const configJson = readFileSync(configPath, 'utf-8');
      this.rules = JSON.parse(configJson);
      this.logger.log('Layer 1 domain analysis rules loaded successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to load Layer 1 rules: ${errorMessage}`);
      this.rules = null;
    }
  }

  /**
   * Main entry point: Analyze a URL through all Layer 1 filters
   * Execution flow: TLD → Domain Classification → URL Patterns → Profile Matching
   *
   * @param url - URL to analyze
   * @returns Layer1AnalysisResult with passed status and reasoning
   */
  analyzeUrl(url: string): Layer1AnalysisResult {
    const startTime = Date.now();

    try {
      // Input validation
      if (!url || typeof url !== 'string' || url.trim().length === 0) {
        this.logger.warn('Invalid URL input to analyzeUrl: null, undefined, or empty');
        return {
          passed: true,
          reasoning: 'PASS Layer 1 - Invalid input, defaulting to next layer',
          layer: 'layer1',
          processingTimeMs: 0,
        };
      }

      if (!this.rules) {
        this.logger.warn('Layer 1 rules not loaded, passing URL through');
        return {
          passed: true,
          reasoning: 'PASS Layer 1 - Rules unavailable, passing to next layer',
          layer: 'layer1',
          processingTimeMs: Date.now() - startTime,
        };
      }

      // Extract domain information from URL
      let hostname: string;
      try {
        const urlObj = new URL(url);
        hostname = urlObj.hostname || '';
      } catch {
        // Invalid URL format - pass through (fail-open)
        return {
          passed: true,
          reasoning: 'PASS Layer 1 - Invalid URL format, passing to next layer',
          layer: 'layer1',
          processingTimeMs: Date.now() - startTime,
        };
      }

      // Step 1: TLD Filtering
      const tldResult = this.filterByTLD(hostname);
      if (!tldResult.passed) {
        return {
          ...tldResult,
          layer: 'layer1',
          processingTimeMs: Date.now() - startTime,
        };
      }

      // Step 2: Domain Classification
      const classificationResult = this.classifyDomain(hostname);
      if (!classificationResult.passed) {
        return {
          ...classificationResult,
          layer: 'layer1',
          processingTimeMs: Date.now() - startTime,
        };
      }

      // Step 3: URL Pattern Exclusions
      const patternResult = this.checkUrlPatterns(url);
      if (!patternResult.passed) {
        return {
          ...patternResult,
          layer: 'layer1',
          processingTimeMs: Date.now() - startTime,
        };
      }

      // Step 4: Target Profile Matching
      const profileResult = this.matchTargetProfile(hostname, url);
      if (!profileResult.passed) {
        return {
          ...profileResult,
          layer: 'layer1',
          processingTimeMs: Date.now() - startTime,
        };
      }

      // All checks passed
      const processingTime = Date.now() - startTime;
      if (processingTime > 50) {
        this.logger.warn(`Slow Layer 1 analysis: ${processingTime}ms for URL: ${url.slice(0, 100)}`);
      }

      return {
        passed: true,
        reasoning: 'PASS Layer 1 - Proceeding to homepage scraping',
        layer: 'layer1',
        processingTimeMs: processingTime,
      };
    } catch (error) {
      // Fail-open strategy: on any error, pass through
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error in Layer 1 analysis for URL ${url.slice(0, 100)}: ${errorMessage}`);
      return {
        passed: true,
        reasoning: 'PASS Layer 1 - Error in analysis, defaulting to next layer',
        layer: 'layer1',
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Extract TLD from hostname
   * Examples: "example.com" → ".com", "platform.io" → ".io"
   */
  private extractTLD(hostname: string): string {
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      // Handle multi-part TLDs like .co.uk
      const lastPart = parts[parts.length - 1];
      if (['com', 'co', 'uk', 'au', 'de', 'fr'].includes(lastPart)) {
        if (parts.length >= 3) {
          return '.' + parts.slice(-2).join('.');
        }
      }
      // Handle platform TLDs
      if (hostname.endsWith('.wordpress.com') || hostname.endsWith('.blogspot.com')) {
        return hostname.split('.').slice(-2).join('.');
      }
      return '.' + lastPart;
    }
    return hostname;
  }

  /**
   * Filter URLs by TLD classification
   * REJECT: non-commercial (.gov, .edu, .org), personal blogs (.me, .blog, .xyz), blog platforms (medium.com, substack.com)
   * PASS: commercial (.com, .io, .co, .ai)
   */
  private filterByTLD(hostname: string): Omit<Layer1AnalysisResult, 'layer' | 'processingTimeMs'> {
    if (!this.rules) {
      return { passed: true, reasoning: 'TLD filter skipped' };
    }

    const tld = this.extractTLD(hostname).toLowerCase();
    const lowerHostname = hostname.toLowerCase();

    // Check blog platform domains (exact hostname match)
    if (this.rules.tld_filtering.blog_platform_domains.some((domain) => lowerHostname === domain || lowerHostname.endsWith('.' + domain))) {
      return {
        passed: false,
        reasoning: `REJECT Layer 1 - Blog platform domain (${hostname})`,
      };
    }

    // Check non-commercial TLDs
    if (this.rules.tld_filtering.non_commercial.some((t) => tld.endsWith(t))) {
      return {
        passed: false,
        reasoning: `REJECT Layer 1 - Non-commercial TLD (${tld})`,
      };
    }

    // Check personal blog TLDs
    if (this.rules.tld_filtering.personal_blog.some((t) => tld.endsWith(t))) {
      return {
        passed: false,
        reasoning: `REJECT Layer 1 - Personal blog TLD (${tld})`,
      };
    }

    // Check if commercial TLD
    if (!this.rules.tld_filtering.commercial.some((t) => tld.endsWith(t))) {
      // Unknown TLD - pass through conservatively
      return { passed: true, reasoning: 'TLD filter passed' };
    }

    return { passed: true, reasoning: 'TLD filter passed' };
  }

  /**
   * Classify domain as digital-native or traditional
   * REJECT: traditional business keywords (restaurant, hotel, retail, etc.)
   * PASS: digital-native keywords (software, saas, tech, platform, etc.)
   */
  private classifyDomain(
    hostname: string,
  ): Omit<Layer1AnalysisResult, 'layer' | 'processingTimeMs'> {
    if (!this.rules) {
      return { passed: true, reasoning: 'Domain classification skipped' };
    }

    const lowerHostname = hostname.toLowerCase();

    // Check for traditional business keywords
    if (
      this.rules.domain_classification.traditional_keywords.some((keyword) =>
        lowerHostname.includes(keyword),
      )
    ) {
      return {
        passed: false,
        reasoning: 'REJECT Layer 1 - Traditional business domain detected',
      };
    }

    // Check for digital-native keywords
    const hasDigitalNative = this.rules.domain_classification.digital_native_keywords.some(
      (keyword) => lowerHostname.includes(keyword),
    );

    if (hasDigitalNative) {
      return { passed: true, reasoning: 'Domain classification passed - digital-native signals' };
    }

    // Neutral domain - pass through
    return { passed: true, reasoning: 'Domain classification passed - neutral domain' };
  }

  /**
   * Check for URL pattern exclusions
   * REJECT: subdomain blogs, tag/category pages, user-generated content
   */
  private checkUrlPatterns(url: string): Omit<Layer1AnalysisResult, 'layer' | 'processingTimeMs'> {
    if (!this.rules) {
      return { passed: true, reasoning: 'URL pattern check skipped' };
    }

    const lowerUrl = url.toLowerCase();

    // Extract subdomain from URL
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname || '';
      const subdomainPart = hostname.split('.')[0];
      const lowerSubdomain = subdomainPart.toLowerCase();

      // Check subdomain blogs - patterns from config are regex patterns
      for (const pattern of this.rules.url_patterns.subdomain_blogs) {
        try {
          // Pattern format: "^blog\\." → match "blog" at start
          // Remove the ^ anchor and \. to get keyword
          const keyword = pattern.replace(/^\^/, '').replace(/\\\./, '').replace(/\.$/, '');
          if (lowerSubdomain === keyword || lowerSubdomain.startsWith(keyword + '.')) {
            return {
              passed: false,
              reasoning: 'REJECT Layer 1 - Subdomain blog detected',
            };
          }
        } catch {
          // Ignore pattern parse errors, continue to next
        }
      }

      // Check tag/category pages
      if (
        this.rules.url_patterns.tag_pages.some((pattern) =>
          lowerUrl.includes(pattern.toLowerCase()),
        )
      ) {
        return {
          passed: false,
          reasoning: 'REJECT Layer 1 - Tag/category page detected',
        };
      }

      // Check user-generated content patterns
      if (
        this.rules.url_patterns.user_content.some((pattern) =>
          lowerUrl.includes(pattern.toLowerCase()),
        )
      ) {
        return {
          passed: false,
          reasoning: 'REJECT Layer 1 - User-generated content page detected',
        };
      }
    } catch {
      // URL parsing failed, skip pattern check
      return { passed: true, reasoning: 'URL pattern check skipped - invalid URL' };
    }

    return { passed: true, reasoning: 'URL pattern check passed' };
  }

  /**
   * Match target profile based on positive/negative indicators
   * PASS: blog infrastructure indicators (insights, resources, learn, platform, app)
   * REJECT: negative signals (shop, store, buy, checkout)
   */
  private matchTargetProfile(
    hostname: string,
    url: string,
  ): Omit<Layer1AnalysisResult, 'layer' | 'processingTimeMs'> {
    if (!this.rules) {
      return { passed: true, reasoning: 'Profile matching skipped' };
    }

    const lowerHostname = hostname.toLowerCase();
    const lowerUrl = url.toLowerCase();
    const combinedText = `${lowerHostname} ${lowerUrl}`;

    // Check for negative indicators first
    if (
      this.rules.target_profile.negative_indicators.some((indicator) =>
        combinedText.includes(indicator.toLowerCase()),
      )
    ) {
      return {
        passed: false,
        reasoning: 'REJECT Layer 1 - Negative profile indicators detected',
      };
    }

    // Check for positive indicators
    const hasPositiveIndicators = this.rules.target_profile.positive_indicators.some((indicator) =>
      combinedText.includes(indicator.toLowerCase()),
    );

    if (hasPositiveIndicators) {
      return { passed: true, reasoning: 'Profile match: positive indicators detected' };
    }

    // No indicators either way - pass through
    return { passed: true, reasoning: 'Profile matching passed - neutral profile' };
  }

  /**
   * Get current elimination rate from a batch of URLs
   * Used for performance tracking and cost calculation
   *
   * @param urls - Array of URLs to analyze
   * @returns Object with elimination statistics
   */
  getEliminationStats(urls: string[]): {
    total: number;
    eliminated: number;
    passed: number;
    eliminationRate: number;
  } {
    const results = urls.map((url) => this.analyzeUrl(url));
    const eliminated = results.filter((r) => !r.passed).length;

    return {
      total: urls.length,
      eliminated,
      passed: urls.length - eliminated,
      eliminationRate: urls.length > 0 ? (eliminated / urls.length) * 100 : 0,
    };
  }

  /**
   * Calculate scraping cost savings
   * Scraping cost per URL: ~$0.0001
   */
  calculateScrapingSavings(eliminatedCount: number): number {
    return eliminatedCount * 0.0001;
  }

  /**
   * Calculate LLM cost savings
   * LLM cost per URL: ~$0.002
   */
  calculateLLMSavings(eliminatedCount: number): number {
    return eliminatedCount * 0.002;
  }

  /**
   * Get total cost savings
   */
  getTotalSavings(eliminatedCount: number): number {
    return this.calculateScrapingSavings(eliminatedCount) + this.calculateLLMSavings(eliminatedCount);
  }
}
