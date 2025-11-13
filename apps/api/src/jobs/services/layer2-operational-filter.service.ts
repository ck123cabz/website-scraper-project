import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { SettingsService } from '../../settings/settings.service';
import { ScraperService } from '../../scraper/scraper.service';
import type {
  Layer2FilterResult,
  Layer2Signals,
  Layer2Rules,
  Layer2Results,
} from '@website-scraper/shared';

/**
 * Layer 2: Operational Filtering Service
 * Story 2.6: Homepage scraping & company infrastructure validation
 *
 * Validates company operational signals:
 * - Company infrastructure (About, Team, Contact pages)
 * - Blog activity (recent posts within threshold)
 * - Tech stack (analytics, marketing platforms)
 * - Design quality (modern frameworks, responsive design)
 *
 * Eliminates 30% of Layer 1 survivors before expensive LLM classification
 * Homepage-only scraping optimizes ScrapingBee costs
 */
@Injectable()
export class Layer2OperationalFilterService {
  private readonly logger = new Logger(Layer2OperationalFilterService.name);
  private readonly DEFAULT_RULES: Layer2Rules = {
    publication_score_threshold: 0.65,
    product_keywords: {
      commercial: ['pricing', 'buy', 'demo', 'plans', 'free trial', 'get started'],
      features: ['features', 'capabilities', 'solutions', 'product'],
      cta: ['sign up', 'start free', 'book a call', 'request demo'],
    },
    business_nav_keywords: [
      'product',
      'pricing',
      'solutions',
      'about',
      'careers',
      'customers',
      'contact',
    ],
    content_nav_keywords: [
      'articles',
      'blog',
      'news',
      'topics',
      'categories',
      'archives',
      'authors',
    ],
    min_business_nav_percentage: 0.3,
    ad_network_patterns: ['googlesyndication', 'adsense', 'doubleclick', 'media.net'],
    affiliate_patterns: ['amazon', 'affiliate', 'aff=', 'ref=', 'amzn'],
    payment_provider_patterns: ['stripe', 'paypal', 'braintree', 'square'],
  };

  constructor(
    private readonly scraperService: ScraperService,
    private readonly settingsService: SettingsService,
  ) {
    this.logger.log('Layer2OperationalFilterService initialized');
  }

  /**
   * Main entry point: Filter URL through Layer 2 publication detection
   * Scrapes homepage and aggregates 4 detection modules into publication score
   *
   * @param url - URL to filter (must have passed Layer 1)
   * @returns Layer2FilterResult with passed flag, signals, and reasoning
   */
  async filterUrl(url: string): Promise<Layer2FilterResult> {
    const startTime = Date.now();

    try {
      // Input validation
      if (!url || typeof url !== 'string' || url.trim().length === 0) {
        this.logger.warn('Invalid URL input to filterUrl: null, undefined, or empty');
        return this.createPassThroughResult(
          'PASS Layer 2 - Invalid input, defaulting to next layer',
          startTime,
        );
      }

      // Load Layer 2 configuration rules
      const rules = await this.loadLayer2Rules();

      // Scrape homepage HTML
      const scrapeResult = await this.scraperService.fetchUrl(url);

      if (!scrapeResult.success || !scrapeResult.content) {
        this.logger.warn(
          `Scraping failed for ${url.slice(0, 100)}: ${scrapeResult.error || 'Unknown error'}`,
        );
        return this.createPassThroughResult(
          `PASS Layer 2 - Scraping failed (${scrapeResult.error}), defaulting to next layer`,
          startTime,
        );
      }

      const html = scrapeResult.content;
      const $ = cheerio.load(html);

      // Run 4 detection modules
      const productSignals = this.detectProductOffering($, html, rules);
      const layoutSignals = this.analyzeHomepageLayout($, html);
      const navSignals = this.parseNavigation($, html, rules);
      const monetizationSignals = this.detectMonetization($, html, rules);

      // Calculate module scores (0-1 scale, higher = more "publication-like")
      const productScore = 1 - productSignals.product_confidence; // Invert: no product = high pub score
      const layoutScore = layoutSignals.homepage_is_blog
        ? layoutSignals.layout_confidence
        : 1 - layoutSignals.layout_confidence;
      const navScore = 1 - navSignals.business_nav_percentage; // Invert: low business nav = high pub score
      const monetizationScore =
        monetizationSignals.monetization_type === 'ads' ||
        monetizationSignals.monetization_type === 'affiliates'
          ? 1.0
          : monetizationSignals.monetization_type === 'business'
            ? 0.0
            : 0.5; // mixed or unknown

      // Aggregate into publication_score
      const publication_score = (productScore + layoutScore + navScore + monetizationScore) / 4;

      // Build complete signals object
      const signals: Layer2Signals = {
        ...productSignals,
        ...layoutSignals,
        ...navSignals,
        ...monetizationSignals,
        publication_score,
        module_scores: {
          product_offering: productScore,
          layout: layoutScore,
          navigation: navScore,
          monetization: monetizationScore,
        },
      };

      // Make decision
      const passed = publication_score < rules.publication_score_threshold;
      const processingTimeMs = Date.now() - startTime;

      this.logger.log(
        `Layer 2 result for ${url.slice(0, 100)}: ${passed ? 'PASS' : 'REJECT'} ` +
          `(publication_score: ${publication_score.toFixed(2)}, ${processingTimeMs}ms)`,
      );

      return {
        passed,
        reasoning: passed
          ? `PASS Layer 2 - Company site detected (publication_score: ${publication_score.toFixed(2)})`
          : `REJECT Layer 2 - Pure publication detected (publication_score: ${publication_score.toFixed(2)})`,
        signals,
        processingTimeMs,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error in Layer 2 filtering for ${url.slice(0, 100)}: ${errorMessage}`);
      return this.createPassThroughResult(
        `PASS Layer 2 - Error in analysis (${errorMessage}), defaulting to next layer`,
        startTime,
      );
    }
  }

  /**
   * Load Layer 2 configuration rules from Story 3.0 settings
   * Falls back to hardcoded defaults if database unavailable
   */
  private async loadLayer2Rules(): Promise<Layer2Rules> {
    try {
      const settings = await this.settingsService.getSettings();
      const layer2Rules = (settings as any).layer2_rules;

      if (layer2Rules && typeof layer2Rules === 'object') {
        return {
          publication_score_threshold:
            layer2Rules.publication_score_threshold ??
            this.DEFAULT_RULES.publication_score_threshold,
          product_keywords: layer2Rules.product_keywords ?? this.DEFAULT_RULES.product_keywords,
          business_nav_keywords:
            layer2Rules.business_nav_keywords ?? this.DEFAULT_RULES.business_nav_keywords,
          content_nav_keywords:
            layer2Rules.content_nav_keywords ?? this.DEFAULT_RULES.content_nav_keywords,
          min_business_nav_percentage:
            layer2Rules.min_business_nav_percentage ??
            this.DEFAULT_RULES.min_business_nav_percentage,
          ad_network_patterns:
            layer2Rules.ad_network_patterns ?? this.DEFAULT_RULES.ad_network_patterns,
          affiliate_patterns:
            layer2Rules.affiliate_patterns ?? this.DEFAULT_RULES.affiliate_patterns,
          payment_provider_patterns:
            layer2Rules.payment_provider_patterns ?? this.DEFAULT_RULES.payment_provider_patterns,
        };
      }
    } catch (error) {
      this.logger.warn('Failed to load Layer 2 rules from settings, using defaults');
    }

    return this.DEFAULT_RULES;
  }

  /**
   * Detect company infrastructure pages (About, Team, Contact)
   * Minimum 2 of 3 required to pass
   * TODO: Remove or refactor in future tasks
   */
  private detectCompanyPages($: any, html: string): any {
    const lowerHtml = html.toLowerCase();

    // Detect About page
    const hasAbout = this.detectPagePresence($, lowerHtml, [
      'about',
      'about us',
      'our story',
      'who we are',
      'company',
    ]);

    // Detect Team page
    const hasTeam = this.detectPagePresence($, lowerHtml, [
      'team',
      'our team',
      'leadership',
      'meet the team',
      'people',
    ]);

    // Detect Contact page
    const hasContact = this.detectPagePresence($, lowerHtml, [
      'contact',
      'get in touch',
      'reach us',
      'contact us',
      'support',
    ]);

    const count = [hasAbout, hasTeam, hasContact].filter(Boolean).length;

    return {
      has_about: hasAbout,
      has_team: hasTeam,
      has_contact: hasContact,
      count,
    };
  }

  /**
   * Detect page presence by searching navigation, footer, and links
   */
  private detectPagePresence($: any, lowerHtml: string, keywords: string[]): boolean {
    // Check navigation links (nav, header, menu)
    const navLinks = $('nav a, header a, [class*="menu"] a, [class*="nav"] a')
      .map((_: any, el: any) => $(el).text().trim().toLowerCase())
      .get();

    // Check footer links
    const footerLinks = $('footer a')
      .map((_: any, el: any) => $(el).text().trim().toLowerCase())
      .get();

    // Check all href attributes
    const allHrefs = $('a[href]')
      .map((_: any, el: any) => $(el).attr('href')?.toLowerCase() || '')
      .get();

    // Combine all link text and hrefs
    const combinedText = [...navLinks, ...footerLinks, ...allHrefs, lowerHtml].join(' ');

    // Check if any keyword matches
    return keywords.some((keyword) => combinedText.includes(keyword));
  }

  /**
   * Detect blog section and validate freshness
   * Requires at least 1 post within threshold (default: 90 days)
   * TODO: Remove or refactor in future tasks
   */
  private detectBlogData($: any, html: string, thresholdDays: number): any {
    const lowerHtml = html.toLowerCase();

    // Detect blog section
    const hasBlog = this.detectBlogSection($, lowerHtml);

    if (!hasBlog) {
      return {
        has_blog: false,
        last_post_date: null,
        days_since_last_post: null,
        passes_freshness: false,
      };
    }

    // Extract blog post dates
    const postDates = this.extractBlogPostDates($);

    if (postDates.length === 0) {
      return {
        has_blog: true,
        last_post_date: null,
        days_since_last_post: null,
        passes_freshness: false,
      };
    }

    // Find most recent post
    const sortedDates = postDates.sort((a, b) => b.getTime() - a.getTime());
    const lastPostDate = sortedDates[0];
    const daysSince = Math.floor((Date.now() - lastPostDate.getTime()) / (1000 * 60 * 60 * 24));
    const passesFreshness = daysSince <= thresholdDays;

    return {
      has_blog: true,
      last_post_date: lastPostDate.toISOString(),
      days_since_last_post: daysSince,
      passes_freshness: passesFreshness,
    };
  }

  /**
   * Detect blog section on homepage
   */
  private detectBlogSection($: any, lowerHtml: string): boolean {
    const blogKeywords = ['blog', 'news', 'articles', 'insights', 'resources', 'latest posts'];

    // Check navigation links
    const navText = $('nav, header, [class*="menu"], [class*="nav"]').text().toLowerCase();

    // Check section headings
    const headings = $('h1, h2, h3, h4')
      .map((_: any, el: any) => $(el).text().trim().toLowerCase())
      .get()
      .join(' ');

    // Check links
    const linkHrefs = $('a[href]')
      .map((_: any, el: any) => $(el).attr('href')?.toLowerCase() || '')
      .get()
      .join(' ');

    const combinedText = `${navText} ${headings} ${linkHrefs} ${lowerHtml}`;

    return blogKeywords.some((keyword) => combinedText.includes(keyword));
  }

  /**
   * Extract blog post publish dates from HTML
   * Parses common date formats and time tags
   */
  private extractBlogPostDates($: any): Date[] {
    const dates: Date[] = [];

    // Extract dates from <time> tags
    $('time[datetime]').each((_: any, el: any) => {
      const dateStr = $(el).attr('datetime');
      if (dateStr) {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          dates.push(date);
        }
      }
    });

    // Extract dates from common date class names
    $('[class*="date"], [class*="published"], [class*="posted"]').each((_: any, el: any) => {
      const text = $(el).text().trim();
      const date = this.parseDate(text);
      if (date && !isNaN(date.getTime())) {
        dates.push(date);
      }
    });

    return dates;
  }

  /**
   * Parse date string in common formats
   */
  private parseDate(dateStr: string): Date | null {
    try {
      // Try ISO format
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date;
      }

      // Try common formats: "Jan 15, 2024", "15 January 2024", etc.
      const monthNames = [
        'jan',
        'feb',
        'mar',
        'apr',
        'may',
        'jun',
        'jul',
        'aug',
        'sep',
        'oct',
        'nov',
        'dec',
      ];
      const lower = dateStr.toLowerCase();

      for (let i = 0; i < monthNames.length; i++) {
        if (lower.includes(monthNames[i])) {
          const parsed = new Date(dateStr);
          if (!isNaN(parsed.getTime())) {
            return parsed;
          }
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Detect professional tech stack tools
   * Minimum 2 tools required (analytics + marketing platforms)
   * TODO: Remove or refactor in future tasks
   */
  private detectTechStack($: any, html: string): any {
    const detectedTools: string[] = [];

    // Google Analytics
    if (
      html.includes('google-analytics.com/ga.js') ||
      html.includes('googletagmanager.com/gtag/js') ||
      html.match(/ga\(['"]create/)
    ) {
      detectedTools.push('Google Analytics');
    }

    // Mixpanel
    if (html.includes('mixpanel.com/libs/mixpanel') || html.match(/mixpanel\.init\(/)) {
      detectedTools.push('Mixpanel');
    }

    // HubSpot
    if (
      html.includes('js.hs-scripts.com') ||
      html.includes('forms.hubspot.com') ||
      html.match(/hbspt\./)
    ) {
      detectedTools.push('HubSpot');
    }

    // Marketo
    if (html.includes('munchkin.marketo.net') || html.match(/Munchkin\.init\(/)) {
      detectedTools.push('Marketo');
    }

    // ActiveCampaign
    if (html.includes('trackcmp.net') || html.includes('activehosted.com')) {
      detectedTools.push('ActiveCampaign');
    }

    // Segment
    if (html.includes('cdn.segment.com/analytics') || html.match(/analytics\.load\(/)) {
      detectedTools.push('Segment');
    }

    // Intercom
    if (html.includes('widget.intercom.io') || html.match(/window\.Intercom/)) {
      detectedTools.push('Intercom');
    }

    return {
      tools_detected: detectedTools,
      count: detectedTools.length,
    };
  }

  /**
   * Assess professional design quality indicators
   * Scores on 1-10 scale based on modern frameworks, responsive design, imagery
   * TODO: Remove or refactor in future tasks
   */
  private assessDesignQuality($: any, html: string): any {
    let score = 5; // Base score

    // Modern CSS framework detection
    const hasModernFramework =
      html.includes('tailwindcss') ||
      html.includes('bootstrap') ||
      html.includes('material-ui') ||
      $('[class*="tw-"]').length > 0 ||
      $('[class*="container"]').length > 0;

    if (hasModernFramework) {
      score += 2;
    }

    // Responsive design check
    const viewportMeta = $('meta[name="viewport"]').attr('content');
    const isResponsive = !!viewportMeta && viewportMeta.includes('width=device-width');

    if (isResponsive) {
      score += 1;
    }

    // Professional imagery
    const images = $('img');
    const highResImages = images.filter((_: any, el: any) => {
      const src = $(el).attr('src') || '';
      return src.includes('cdn') || src.includes('cloudinary') || src.includes('imgix');
    });

    const hasProfessionalImagery = highResImages.length > 0 || images.length > 5;

    if (hasProfessionalImagery) {
      score += 1;
    }

    // Modern features (lazy loading, srcset, picture tags)
    if (
      $('img[loading="lazy"]').length > 0 ||
      $('img[srcset]').length > 0 ||
      $('picture').length > 0
    ) {
      score += 1;
    }

    return {
      score: Math.min(score, 10), // Cap at 10
      has_modern_framework: hasModernFramework,
      is_responsive: isResponsive,
      has_professional_imagery: hasProfessionalImagery,
    };
  }

  /**
   * Detect product/service offering from homepage
   * Scans for commercial keywords, pricing mentions, CTAs, and payment providers
   */
  private detectProductOffering(
    $: any,
    html: string,
    rules: Layer2Rules,
  ): {
    has_product_offering: boolean;
    product_confidence: number;
    detected_product_keywords: string[];
  } {
    const lowerHtml = html.toLowerCase();
    const bodyText = $('body').text().toLowerCase();
    const detectedKeywords: string[] = [];
    let score = 0;
    let signalCount = 0;

    // Check commercial keywords
    const commercialKeywords = rules.product_keywords.commercial;
    const commercialMatches = commercialKeywords.filter((kw) =>
      bodyText.includes(kw.toLowerCase()),
    );
    if (commercialMatches.length > 0) {
      score += Math.min(commercialMatches.length * 0.2, 0.4);
      signalCount++;
      detectedKeywords.push(...commercialMatches);
    }

    // Check feature keywords
    const featureKeywords = rules.product_keywords.features;
    const featureMatches = featureKeywords.filter((kw) => bodyText.includes(kw.toLowerCase()));
    if (featureMatches.length > 0) {
      score += Math.min(featureMatches.length * 0.15, 0.3);
      signalCount++;
      detectedKeywords.push(...featureMatches);
    }

    // Check CTA keywords
    const ctaKeywords = rules.product_keywords.cta;
    const ctaMatches = ctaKeywords.filter((kw) => bodyText.includes(kw.toLowerCase()));
    if (ctaMatches.length > 0) {
      score += Math.min(ctaMatches.length * 0.15, 0.3);
      signalCount++;
      detectedKeywords.push(...ctaMatches);
    }

    // Check for price mentions ($XX, pricing tables)
    const pricePatterns = [/\$\d+/, /\d+\/month/, /\d+\/year/, /<table[^>]*pricing/i];
    const hasPricing = pricePatterns.some((pattern) => pattern.test(html));
    if (hasPricing) {
      score += 0.3;
      signalCount++;
      detectedKeywords.push('pricing_pattern');
    }

    // Check for payment provider scripts
    const paymentProviders = rules.payment_provider_patterns;
    const hasPaymentProvider = paymentProviders.some((provider) =>
      lowerHtml.includes(provider.toLowerCase()),
    );
    if (hasPaymentProvider) {
      score += 0.4;
      signalCount++;
      detectedKeywords.push('payment_provider');
    }

    // Normalize score to 0-1 range
    const confidence = signalCount > 0 ? Math.min(score, 1.0) : 0;

    return {
      has_product_offering: confidence > 0.5,
      product_confidence: confidence,
      detected_product_keywords: detectedKeywords,
    };
  }

  /**
   * Analyze homepage layout to distinguish blog vs marketing landing page
   */
  private analyzeHomepageLayout(
    $: any,
    html: string,
  ): {
    homepage_is_blog: boolean;
    layout_type: 'blog' | 'marketing' | 'mixed';
    layout_confidence: number;
  } {
    let blogSignals = 0;
    let marketingSignals = 0;

    // Blog-style signals
    const articleCount = $('article').length;
    if (articleCount >= 3) blogSignals += 2;
    else if (articleCount >= 1) blogSignals += 1;

    const dateStamps = $('time, .date, .published').length;
    if (dateStamps >= 3) blogSignals += 2;
    else if (dateStamps >= 1) blogSignals += 1;

    const authorBylines = $('.author, .byline, [rel="author"]').length;
    if (authorBylines >= 2) blogSignals += 1;

    const pagination = $('.pagination, .pager, [rel="next"]').length > 0;
    if (pagination) blogSignals += 1;

    const latestPostsHeading = /latest posts?|recent articles?|blog/i.test($('h1, h2, h3').text());
    if (latestPostsHeading) blogSignals += 2;

    // Marketing-style signals
    const heroSection = $('.hero, .banner, .jumbotron').length > 0;
    if (heroSection) marketingSignals += 2;

    const ctaButtons = $('button, .cta, .btn').filter((_: any, el: any) => {
      const text = $(el).text().toLowerCase();
      return (
        text.includes('start') ||
        text.includes('get') ||
        text.includes('try') ||
        text.includes('demo') ||
        text.includes('sign up')
      );
    }).length;
    if (ctaButtons >= 2) marketingSignals += 2;
    else if (ctaButtons >= 1) marketingSignals += 1;

    const featureSections = $('[class*="feature"], [class*="benefit"]').length;
    if (featureSections >= 3) marketingSignals += 2;
    else if (featureSections >= 1) marketingSignals += 1;

    const testimonials = $('.testimonial, blockquote, .review').length;
    if (testimonials >= 1) marketingSignals += 1;

    const productImagery = $('img[alt*="product"], img[alt*="screenshot"]').length;
    if (productImagery >= 2) marketingSignals += 1;

    // Calculate layout type and confidence
    const totalSignals = blogSignals + marketingSignals;
    if (totalSignals === 0) {
      return {
        homepage_is_blog: false,
        layout_type: 'mixed',
        layout_confidence: 0.5,
      };
    }

    const blogRatio = blogSignals / totalSignals;
    const marketingRatio = marketingSignals / totalSignals;

    if (blogRatio >= 0.7) {
      return {
        homepage_is_blog: true,
        layout_type: 'blog',
        layout_confidence: blogRatio,
      };
    } else if (marketingRatio >= 0.7) {
      return {
        homepage_is_blog: false,
        layout_type: 'marketing',
        layout_confidence: marketingRatio,
      };
    } else {
      return {
        homepage_is_blog: blogSignals > marketingSignals,
        layout_type: 'mixed',
        layout_confidence: Math.abs(blogRatio - marketingRatio),
      };
    }
  }

  /**
   * Parse navigation to classify business vs content focus
   */
  private parseNavigation(
    $: any,
    html: string,
    rules: Layer2Rules,
  ): {
    has_business_nav: boolean;
    business_nav_percentage: number;
    nav_items_classified: {
      business: string[];
      content: string[];
      other: string[];
    };
  } {
    const businessKeywords = rules.business_nav_keywords.map((k) => k.toLowerCase());
    const contentKeywords = rules.content_nav_keywords.map((k) => k.toLowerCase());

    const classified = {
      business: [] as string[],
      content: [] as string[],
      other: [] as string[],
    };

    // Extract navigation links
    const navLinks = $('nav a, header a, [role="navigation"] a');

    if (navLinks.length === 0) {
      return {
        has_business_nav: false,
        business_nav_percentage: 0,
        nav_items_classified: classified,
      };
    }

    navLinks.each((_: any, el: any) => {
      const text = $(el).text().trim().toLowerCase();
      const href = $(el).attr('href') || '';
      const combinedText = `${text} ${href}`.toLowerCase();

      if (businessKeywords.some((kw) => combinedText.includes(kw))) {
        classified.business.push(text);
      } else if (contentKeywords.some((kw) => combinedText.includes(kw))) {
        classified.content.push(text);
      } else {
        classified.other.push(text);
      }
    });

    const totalClassified =
      classified.business.length + classified.content.length + classified.other.length;
    const businessPercentage =
      totalClassified > 0 ? classified.business.length / totalClassified : 0;

    return {
      has_business_nav: businessPercentage >= rules.min_business_nav_percentage,
      business_nav_percentage: businessPercentage,
      nav_items_classified: classified,
    };
  }

  /**
   * Detect revenue model: ads, affiliates, or business
   */
  private detectMonetization(
    $: any,
    html: string,
    rules: Layer2Rules,
  ): {
    monetization_type: 'ads' | 'affiliates' | 'business' | 'mixed' | 'unknown';
    ad_networks_detected: string[];
    affiliate_patterns_detected: string[];
  } {
    const lowerHtml = html.toLowerCase();
    const adNetworks: string[] = [];
    const affiliatePatterns: string[] = [];

    // Detect ad networks
    rules.ad_network_patterns.forEach((pattern) => {
      if (lowerHtml.includes(pattern.toLowerCase())) {
        adNetworks.push(pattern);
      }
    });

    // Detect affiliate patterns
    rules.affiliate_patterns.forEach((pattern) => {
      if (lowerHtml.includes(pattern.toLowerCase())) {
        affiliatePatterns.push(pattern);
      }
    });

    // Detect payment providers (business signal)
    const hasPaymentProvider = rules.payment_provider_patterns.some((provider) =>
      lowerHtml.includes(provider.toLowerCase()),
    );

    // Check for explicit ad containers
    const hasAdContainers =
      $('.ad, [class*="ad-"], [id*="ad-"]').length > 0 ||
      /advertisement|sponsored/i.test($('body').text());

    const hasAds = adNetworks.length > 0 || hasAdContainers;
    const hasAffiliates = affiliatePatterns.length > 0;
    const hasBusiness = hasPaymentProvider;

    // Determine monetization type
    let monetizationType: 'ads' | 'affiliates' | 'business' | 'mixed' | 'unknown';

    if (hasBusiness && (hasAds || hasAffiliates)) {
      monetizationType = 'mixed';
    } else if (hasBusiness) {
      monetizationType = 'business';
    } else if (hasAds && hasAffiliates) {
      monetizationType = 'mixed';
    } else if (hasAds) {
      monetizationType = 'ads';
    } else if (hasAffiliates) {
      monetizationType = 'affiliates';
    } else {
      monetizationType = 'unknown';
    }

    return {
      monetization_type: monetizationType,
      ad_networks_detected: adNetworks,
      affiliate_patterns_detected: affiliatePatterns,
    };
  }

  /**
   * Evaluate all signals against Layer 2 pass/fail criteria
   * TODO: Will be replaced with new publication detection logic in Task 7
   */
  private evaluateSignals(
    signals: Layer2Signals,
    rules: Layer2Rules,
  ): { passed: boolean; reasoning: string } {
    // Temporarily stubbed during refactor
    return {
      passed: true,
      reasoning: 'PASS Layer 2 - Evaluation temporarily disabled during refactor',
    };
  }

  /**
   * Create empty signals object for pass-through cases
   */
  private createEmptySignals(): Layer2Signals {
    return {
      has_product_offering: false,
      product_confidence: 0,
      detected_product_keywords: [],
      homepage_is_blog: false,
      layout_type: 'mixed',
      layout_confidence: 0,
      has_business_nav: false,
      business_nav_percentage: 0,
      nav_items_classified: {
        business: [],
        content: [],
        other: [],
      },
      monetization_type: 'unknown',
      ad_networks_detected: [],
      affiliate_patterns_detected: [],
      publication_score: 0,
      module_scores: {
        product_offering: 0,
        layout: 0,
        navigation: 0,
        monetization: 0,
      },
    };
  }

  /**
   * Create a pass-through result when analysis cannot be performed
   * Fail-open strategy: default to PASS and let Layer 3 decide
   */
  private createPassThroughResult(reasoning: string, startTime: number): Layer2FilterResult {
    return {
      passed: true,
      reasoning,
      signals: this.createEmptySignals(),
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Backward compatibility: Validate operational signals for a URL
   * Kept for compatibility with existing code (Story 2.5 stub interface)
   *
   * @deprecated Use filterUrl() instead
   */
  async validateOperational(url: string): Promise<any> {
    this.logger.debug(
      `[DEPRECATED] validateOperational called for ${url.slice(0, 100)} - redirecting to filterUrl()`,
    );
    const result = await this.filterUrl(url);

    return {
      passed: result.passed,
      reasoning: result.reasoning,
      signals: {
        companyPageFound: false,
        blogFreshnessScore: 0,
        techStack: [],
        lastBlogPostDate: null,
        contactInfoPresent: false,
      },
      processingTimeMs: result.processingTimeMs,
    };
  }

  /**
   * Get structured Layer 2 evaluation results for manual review
   * Returns detailed factor breakdown for guest post indicators and content quality
   *
   * @param url - URL to analyze
   * @returns Layer2Results with all red flag and content quality checks
   */
  async getStructuredResults(url: string): Promise<Layer2Results> {
    try {
      // TODO: Update this in Task 7 when refactor is complete
      return this.getEmptyResults();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error getting structured Layer 2 results: ${errorMessage}`);
      return this.getEmptyResults();
    }
  }

  /**
   * Return empty results structure when analysis cannot be performed
   */
  private getEmptyResults(): Layer2Results {
    return {
      guest_post_red_flags: {
        contact_page: { checked: false, detected: false },
        author_bio: { checked: false, detected: false },
        pricing_page: { checked: false, detected: false },
        submit_content: { checked: false, detected: false },
        write_for_us: { checked: false, detected: false },
        guest_post_guidelines: { checked: false, detected: false },
      },
      content_quality: {
        thin_content: { checked: false, detected: false },
        excessive_ads: { checked: false, detected: false },
        broken_links: { checked: false, detected: false },
      },
    };
  }

  /**
   * Get complete Layer 2 factor structure for url_results table
   * Returns JSONB-compatible object with all publication detection factors
   *
   * @param url - URL to analyze
   * @returns Promise<Layer2Factors> with complete publication detection data
   */
  async getLayer2Factors(url: string): Promise<any> {
    try {
      // Run full Layer 2 analysis
      const filterResult = await this.filterUrl(url);

      if (!filterResult.signals) {
        return this.getEmptyLayer2Factors('No signals available');
      }

      const signals = filterResult.signals;

      // Map Layer2Signals to Layer2Factors structure
      return {
        publication_score: signals.publication_score || 0,
        module_scores: {
          product_offering: signals.module_scores?.product_offering || 0,
          layout_quality: signals.module_scores?.layout || 0,
          navigation_complexity: signals.module_scores?.navigation || 0,
          monetization_indicators: signals.module_scores?.monetization || 0,
        },
        keywords_found: signals.detected_product_keywords || [],
        ad_networks_detected: signals.ad_networks_detected || [],
        content_signals: {
          has_blog: signals.homepage_is_blog || false,
          has_press_releases: false, // Not currently detected
          has_whitepapers: false, // Not currently detected
          has_case_studies: false, // Not currently detected
        },
        reasoning: filterResult.reasoning,
        passed: filterResult.passed,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error getting Layer 2 factors: ${errorMessage}`);
      return this.getEmptyLayer2Factors('Analysis error');
    }
  }

  /**
   * Return empty Layer2Factors structure when analysis cannot be performed
   * @private
   */
  private getEmptyLayer2Factors(reason: string): any {
    this.logger.warn(`Returning empty Layer 2 factors: ${reason}`);
    return {
      publication_score: 0,
      module_scores: {
        product_offering: 0,
        layout_quality: 0,
        navigation_complexity: 0,
        monetization_indicators: 0,
      },
      keywords_found: [],
      ad_networks_detected: [],
      content_signals: {
        has_blog: false,
        has_press_releases: false,
        has_whitepapers: false,
        has_case_studies: false,
      },
      reasoning: reason,
      passed: false,
    };
  }
}
