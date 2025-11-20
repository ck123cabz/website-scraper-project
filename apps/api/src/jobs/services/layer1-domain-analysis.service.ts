import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { Layer1AnalysisResult, Layer1DomainRules, Layer1Rules } from '@website-scraper/shared';
import { SettingsService } from '../../settings/settings.service';

// Type stub for unused legacy method
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type Layer1Results = any;

/**
 * Layer 1 Domain Analysis Service
 * Analyzes URLs based on domain characteristics WITHOUT HTTP requests
 * Eliminates 40-60% of unsuitable URLs before scraping and LLM processing
 * Story 2.3 Refactored: Layer 1 Domain Analysis (Pre-Scrape)
 * Story 3.0: Now loads rules from database via SettingsService
 */
@Injectable()
export class Layer1DomainAnalysisService implements OnModuleInit {
  private readonly logger = new Logger(Layer1DomainAnalysisService.name);
  private rules: Layer1DomainRules | null = null;

  constructor(private readonly settingsService: SettingsService) {}

  /**
   * Initialize service by loading rules from database
   */
  async onModuleInit(): Promise<void> {
    await this.loadRulesFromDatabase();
  }

  /**
   * Load Layer 1 domain analysis rules from database via SettingsService
   * Falls back to JSON file if database unavailable
   * Story 3.0: Load layer1_rules from database
   */
  private async loadRulesFromDatabase(): Promise<void> {
    try {
      const settings = await this.settingsService.getSettings();
      const isFromDatabase = settings.id !== 'default';
      const layer1Rules = settings.layer1_rules;

      if (!layer1Rules) {
        this.logger.warn('Layer 1 rules not found in settings. Falling back to file.');
        this.loadRulesFromFile();
        return;
      }

      // Transform Layer1Rules (from database) to Layer1DomainRules (service format)
      this.rules = this.transformLayer1RulesToDomainRules(layer1Rules);

      if (isFromDatabase) {
        this.logger.log(
          `Layer 1 domain analysis rules loaded from database (${layer1Rules.url_pattern_exclusions.filter((r) => r.enabled).length} enabled URL patterns)`,
        );
      } else {
        this.logger.warn('Layer 1 rules loaded from defaults (database unavailable)');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to load Layer 1 rules from database: ${errorMessage}. Falling back to file.`,
      );
      this.loadRulesFromFile();
    }
  }

  /**
   * Transform Layer1Rules (database format) to Layer1DomainRules (service format)
   * Maps the new 3-tier structure to the legacy service structure
   */
  private transformLayer1RulesToDomainRules(layer1Rules: Layer1Rules): Layer1DomainRules {
    // Extract enabled URL pattern exclusions and categorize them
    const enabledPatterns = layer1Rules.url_pattern_exclusions.filter((r) => r.enabled);

    // Categorize patterns by their category field
    const blogPlatformPatterns: string[] = [];
    const subdomainBlogPatterns: string[] = [];
    const tagPagePatterns: string[] = [];
    const userContentPatterns: string[] = [];
    const generalKeywordPatterns: string[] = []; // New: for patterns with null/empty category

    for (const pattern of enabledPatterns) {
      const category = pattern.category?.toLowerCase() || '';
      const patternStr = pattern.pattern;

      if (category.includes('blog_platform') || category.includes('blog')) {
        // Check if it's a subdomain pattern (starts with ^ or contains subdomain indicators)
        if (patternStr.includes('^') || patternStr.includes('subdomain')) {
          subdomainBlogPatterns.push(patternStr);
        } else {
          blogPlatformPatterns.push(patternStr);
        }
      } else if (category.includes('tag') || category.includes('category')) {
        tagPagePatterns.push(patternStr);
      } else if (category.includes('user') || category.includes('content')) {
        userContentPatterns.push(patternStr);
      } else {
        // Patterns with null/empty category: treat as general keyword filters
        // These should match anywhere in the hostname (e.g., "news" matches "newsroom.com")
        generalKeywordPatterns.push(patternStr);
      }
    }

    // Extract blog platform domains from patterns (e.g., "wordpress\\.com" -> "wordpress.com")
    const blogPlatformDomains = blogPlatformPatterns
      .map((p) => p.replace(/\\\./g, '.').replace(/^.*\//, '').replace(/\..*$/, ''))
      .filter((d) => d.length > 0 && !d.includes('*') && !d.includes('^'))
      .map((d) => d + '.com'); // Add .com suffix

    // Map industry keywords to digital-native keywords
    // Traditional keywords are not in Layer1Rules, so we'll use empty array
    const digitalNativeKeywords = layer1Rules.industry_keywords || [];

    return {
      tld_filtering: {
        commercial: layer1Rules.tld_filters.commercial || [],
        non_commercial: layer1Rules.tld_filters.non_commercial || [],
        personal_blog: layer1Rules.tld_filters.personal || [],
        blog_platform_domains: blogPlatformDomains,
      },
      domain_classification: {
        digital_native_keywords: digitalNativeKeywords,
        traditional_keywords: [], // Not in Layer1Rules, keep empty for now
      },
      url_patterns: {
        subdomain_blogs: subdomainBlogPatterns,
        tag_pages: tagPagePatterns,
        user_content: userContentPatterns,
        general_keywords: generalKeywordPatterns, // General keyword filters (e.g., "news", "sports")
      },
      target_profile: {
        positive_indicators: digitalNativeKeywords, // Use industry keywords as positive indicators
        negative_indicators: [], // Not in Layer1Rules, keep empty for now
      },
    };
  }

  /**
   * Fallback: Load Layer 1 domain analysis rules from configuration file
   * Used when database is unavailable
   */
  private loadRulesFromFile(): void {
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
      this.logger.log('Layer 1 domain analysis rules loaded from file (fallback)');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to load Layer 1 rules from file: ${errorMessage}`);
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
        this.logger.warn(
          `Slow Layer 1 analysis: ${processingTime}ms for URL: ${url.slice(0, 100)}`,
        );
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
    if (
      this.rules.tld_filtering.blog_platform_domains.some(
        (domain) => lowerHostname === domain || lowerHostname.endsWith('.' + domain),
      )
    ) {
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

      // Check general keyword patterns (e.g., "news", "sports")
      // These are keyword filters that match anywhere in the hostname
      const lowerHostname = hostname.toLowerCase();
      for (const keyword of this.rules.url_patterns.general_keywords || []) {
        const lowerKeyword = keyword.toLowerCase();
        if (lowerHostname.includes(lowerKeyword)) {
          return {
            passed: false,
            reasoning: `REJECT Layer 1 - Keyword filter matched: "${keyword}"`,
          };
        }
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
    return (
      this.calculateScrapingSavings(eliminatedCount) + this.calculateLLMSavings(eliminatedCount)
    );
  }

  /**
   * Get structured Layer 1 evaluation results for manual review
   * Returns detailed factor breakdown showing which checks were performed
   *
   * @param url - URL to analyze
   * @returns Layer1Results with all domain factors evaluated
   */
  getStructuredResults(url: string): Layer1Results {
    try {
      if (!url || typeof url !== 'string' || url.trim().length === 0) {
        return this.getEmptyResults('Invalid URL input');
      }

      if (!this.rules) {
        return this.getEmptyResults('Rules not loaded');
      }

      // Extract domain information from URL
      let hostname: string;
      let tld: string;
      try {
        const urlObj = new URL(url);
        hostname = urlObj.hostname || '';
        tld = this.extractTLD(hostname);
      } catch {
        return this.getEmptyResults('Invalid URL format');
      }

      // Domain Age - NOT IMPLEMENTED YET
      // Current service doesn't check domain age, mark as unchecked
      const domainAgeResult = {
        checked: false,
        passed: false,
        value: undefined,
        threshold: undefined,
      };

      // TLD Type - Check against rules
      const tldResult = this.evaluateTLD(hostname, tld);

      // Registrar Reputation - NOT IMPLEMENTED YET
      // Current service doesn't check registrar, mark as unchecked
      const registrarResult = {
        checked: false,
        passed: false,
        value: undefined,
        red_flags: undefined,
      };

      // WHOIS Privacy - NOT IMPLEMENTED YET
      // Current service doesn't check WHOIS privacy, mark as unchecked
      const whoisPrivacyResult = {
        checked: false,
        passed: false,
        enabled: undefined,
      };

      // SSL Certificate - NOT IMPLEMENTED YET
      // Current service doesn't check SSL, mark as unchecked
      const sslCertificateResult = {
        checked: false,
        passed: false,
        valid: undefined,
        issuer: undefined,
      };

      return {
        domain_age: domainAgeResult,
        tld_type: tldResult,
        registrar_reputation: registrarResult,
        whois_privacy: whoisPrivacyResult,
        ssl_certificate: sslCertificateResult,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error getting structured Layer 1 results: ${errorMessage}`);
      return this.getEmptyResults('Analysis error');
    }
  }

  /**
   * Evaluate TLD type for structured results
   */
  private evaluateTLD(
    hostname: string,
    tld: string,
  ): {
    checked: boolean;
    passed: boolean;
    value?: string;
    red_flags?: string[];
  } {
    const lowerHostname = hostname.toLowerCase();
    const lowerTld = tld.toLowerCase();
    const redFlags: string[] = [];

    // Check blog platform domains
    const blogPlatformMatch = this.rules!.tld_filtering.blog_platform_domains.find(
      (domain) => lowerHostname === domain || lowerHostname.endsWith('.' + domain),
    );
    if (blogPlatformMatch) {
      redFlags.push(`blog_platform:${blogPlatformMatch}`);
      return {
        checked: true,
        passed: false,
        value: lowerTld,
        red_flags: redFlags,
      };
    }

    // Check non-commercial TLDs
    const nonCommercialMatch = this.rules!.tld_filtering.non_commercial.find((t) =>
      lowerTld.endsWith(t),
    );
    if (nonCommercialMatch) {
      redFlags.push(`non_commercial:${nonCommercialMatch}`);
      return {
        checked: true,
        passed: false,
        value: lowerTld,
        red_flags: redFlags,
      };
    }

    // Check personal blog TLDs
    const personalBlogMatch = this.rules!.tld_filtering.personal_blog.find((t) =>
      lowerTld.endsWith(t),
    );
    if (personalBlogMatch) {
      redFlags.push(`personal_blog:${personalBlogMatch}`);
      return {
        checked: true,
        passed: false,
        value: lowerTld,
        red_flags: redFlags,
      };
    }

    // Check if commercial TLD
    const isCommercial = this.rules!.tld_filtering.commercial.some((t) => lowerTld.endsWith(t));

    return {
      checked: true,
      passed: isCommercial || redFlags.length === 0, // Pass if commercial or no red flags
      value: lowerTld,
      red_flags: redFlags.length > 0 ? redFlags : undefined,
    };
  }

  /**
   * Return empty results structure when analysis cannot be performed
   */
  private getEmptyResults(reason: string): Layer1Results {
    this.logger.warn(`Returning empty Layer 1 results: ${reason}`);
    return {
      domain_age: { checked: false, passed: false },
      tld_type: { checked: false, passed: false },
      registrar_reputation: { checked: false, passed: false },
      whois_privacy: { checked: false, passed: false },
      ssl_certificate: { checked: false, passed: false },
    };
  }

  /**
   * Get complete Layer 1 factor structure for url_results table
   * Returns JSONB-compatible object with all domain analysis factors
   *
   * @param url - URL to analyze
   * @returns Layer1Factors with complete domain analysis data
   */
  getLayer1Factors(url: string): any {
    try {
      if (!url || typeof url !== 'string' || url.trim().length === 0) {
        return this.getEmptyLayer1Factors('Invalid URL input');
      }

      if (!this.rules) {
        return this.getEmptyLayer1Factors('Rules not loaded');
      }

      // Extract domain information from URL
      let hostname: string;
      let tld: string;
      try {
        const urlObj = new URL(url);
        hostname = urlObj.hostname || '';
        tld = this.extractTLD(hostname);
      } catch {
        return this.getEmptyLayer1Factors('Invalid URL format');
      }

      // Run analysis to get pass/fail result
      const analysisResult = this.analyzeUrl(url);

      // Determine TLD type
      const tldType = this.determineTLDType(tld);

      // Classify domain
      const domainClass = this.classifyDomainType(hostname);

      // Get pattern matches
      const patternMatches = this.getPatternMatches(url, hostname);

      // Get target profile
      const targetProfile = this.getTargetProfileInfo(hostname, url);

      return {
        tld_type: tldType,
        tld_value: tld,
        domain_classification: domainClass,
        pattern_matches: patternMatches,
        target_profile: targetProfile,
        reasoning: analysisResult.reasoning,
        passed: analysisResult.passed,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error getting Layer 1 factors: ${errorMessage}`);
      return this.getEmptyLayer1Factors('Analysis error');
    }
  }

  /**
   * Determine TLD type classification
   * @private
   */
  private determineTLDType(tld: string): 'gtld' | 'cctld' | 'custom' {
    const lowerTld = tld.toLowerCase();

    // Common gTLDs
    const gtlds = ['.com', '.net', '.org', '.info', '.biz', '.edu', '.gov'];
    if (gtlds.some((g) => lowerTld.endsWith(g))) {
      return 'gtld';
    }

    // Common ccTLDs (2-letter country codes)
    if (lowerTld.match(/\.[a-z]{2}$/)) {
      return 'cctld';
    }

    // Custom/new gTLDs
    return 'custom';
  }

  /**
   * Classify domain type based on analysis rules
   * @private
   */
  private classifyDomainType(
    hostname: string,
  ): 'commercial' | 'personal' | 'institutional' | 'spam' {
    if (!this.rules) return 'commercial';

    const lowerHostname = hostname.toLowerCase();

    // Check for spam indicators (blog platforms, etc.)
    if (
      this.rules.tld_filtering.blog_platform_domains.some(
        (domain) => lowerHostname === domain || lowerHostname.endsWith('.' + domain),
      )
    ) {
      return 'spam';
    }

    // Check for institutional domains
    if (lowerHostname.includes('.edu') || lowerHostname.includes('.gov')) {
      return 'institutional';
    }

    // Check for personal blog indicators
    if (
      this.rules.tld_filtering.personal_blog.some((tld) => lowerHostname.endsWith(tld)) ||
      lowerHostname.includes('blog.') ||
      lowerHostname.includes('personal.')
    ) {
      return 'personal';
    }

    // Default to commercial
    return 'commercial';
  }

  /**
   * Get all pattern matches for the URL
   * @private
   */
  private getPatternMatches(url: string, hostname: string): string[] {
    if (!this.rules) return [];

    const matches: string[] = [];
    const lowerUrl = url.toLowerCase();
    const lowerHostname = hostname.toLowerCase();

    // Check for blog platform matches
    for (const domain of this.rules.tld_filtering.blog_platform_domains) {
      if (lowerHostname === domain || lowerHostname.endsWith('.' + domain)) {
        matches.push(`blog-platform:${domain}`);
      }
    }

    // Check subdomain blog patterns
    try {
      const subdomainPart = hostname.split('.')[0].toLowerCase();
      for (const pattern of this.rules.url_patterns.subdomain_blogs) {
        const keyword = pattern.replace(/^\^/, '').replace(/\\\./, '').replace(/\.$/, '');
        if (subdomainPart === keyword || subdomainPart.startsWith(keyword + '.')) {
          matches.push(`subdomain-blog:${keyword}`);
        }
      }
    } catch {
      // Ignore subdomain parsing errors
    }

    // Check tag/category pages
    for (const pattern of this.rules.url_patterns.tag_pages) {
      if (lowerUrl.includes(pattern.toLowerCase())) {
        matches.push(`tag-page:${pattern}`);
      }
    }

    // Check user-generated content patterns
    for (const pattern of this.rules.url_patterns.user_content) {
      if (lowerUrl.includes(pattern.toLowerCase())) {
        matches.push(`user-content:${pattern}`);
      }
    }

    // Check general keyword patterns
    for (const keyword of this.rules.url_patterns.general_keywords || []) {
      if (lowerHostname.includes(keyword.toLowerCase())) {
        matches.push(`keyword:${keyword}`);
      }
    }

    return matches;
  }

  /**
   * Get target profile information
   * @private
   */
  private getTargetProfileInfo(
    hostname: string,
    url: string,
  ): { type: string; confidence: number } {
    if (!this.rules) {
      return { type: 'unknown', confidence: 0 };
    }

    const lowerHostname = hostname.toLowerCase();
    const lowerUrl = url.toLowerCase();
    const combinedText = `${lowerHostname} ${lowerUrl}`;

    // Check for negative indicators
    const negativeMatches = this.rules.target_profile.negative_indicators.filter((indicator) =>
      combinedText.includes(indicator.toLowerCase()),
    );

    if (negativeMatches.length > 0) {
      return {
        type: 'e-commerce',
        confidence: 0.8,
      };
    }

    // Check for positive indicators (digital-native)
    const positiveMatches = this.rules.target_profile.positive_indicators.filter((indicator) =>
      combinedText.includes(indicator.toLowerCase()),
    );

    if (positiveMatches.length > 0) {
      return {
        type: 'B2B software',
        confidence: 0.7 + Math.min(positiveMatches.length * 0.1, 0.3),
      };
    }

    // Neutral/unknown
    return {
      type: 'unknown',
      confidence: 0.5,
    };
  }

  /**
   * Return empty Layer1Factors structure when analysis cannot be performed
   * @private
   */
  private getEmptyLayer1Factors(reason: string): any {
    this.logger.warn(`Returning empty Layer 1 factors: ${reason}`);
    return {
      tld_type: 'gtld',
      tld_value: '.com',
      domain_classification: 'commercial',
      pattern_matches: [],
      target_profile: {
        type: 'unknown',
        confidence: 0,
      },
      reasoning: reason,
      passed: false,
    };
  }
}
