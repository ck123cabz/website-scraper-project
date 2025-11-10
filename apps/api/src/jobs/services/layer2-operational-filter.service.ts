import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { SettingsService } from '../../settings/settings.service';
import { ScraperService } from '../../scraper/scraper.service';
import type {
  Layer2FilterResult,
  Layer2Signals,
  Layer2Rules,
  CompanyPageSignals,
  BlogDataSignals,
  TechStackSignals,
  DesignQualitySignals,
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
    blog_freshness_days: 90,
    required_pages_count: 2,
    min_tech_stack_tools: 2,
    tech_stack_tools: {
      analytics: ['google-analytics', 'mixpanel', 'amplitude'],
      marketing: ['hubspot', 'marketo', 'activecampaign', 'mailchimp'],
    },
    min_design_quality_score: 6,
  };

  constructor(
    private readonly scraperService: ScraperService,
    private readonly settingsService: SettingsService,
  ) {
    this.logger.log('Layer2OperationalFilterService initialized');
  }

  /**
   * Main entry point: Filter URL through Layer 2 operational checks
   * Scrapes homepage and validates company infrastructure signals
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

      // Detect all Layer 2 signals
      const companyPages = this.detectCompanyPages($, html);
      const blogData = this.detectBlogData($, html, rules.blog_freshness_days);
      const techStack = this.detectTechStack($, html);
      const designQuality = this.assessDesignQuality($, html);

      const signals: Layer2Signals = {
        company_pages: companyPages,
        blog_data: blogData,
        tech_stack: techStack,
        design_quality: designQuality,
      };

      // Evaluate pass/fail criteria
      const decision = this.evaluateSignals(signals, rules);
      const processingTimeMs = Date.now() - startTime;

      this.logger.log(
        `Layer 2 result for ${url.slice(0, 100)}: ${decision.passed ? 'PASS' : 'REJECT'} (${processingTimeMs}ms)`,
      );

      return {
        passed: decision.passed,
        reasoning: decision.reasoning,
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
          blog_freshness_days:
            layer2Rules.blog_freshness_days ?? this.DEFAULT_RULES.blog_freshness_days,
          required_pages_count:
            layer2Rules.required_pages_count ?? this.DEFAULT_RULES.required_pages_count,
          min_tech_stack_tools:
            layer2Rules.min_tech_stack_tools ?? this.DEFAULT_RULES.min_tech_stack_tools,
          tech_stack_tools: layer2Rules.tech_stack_tools ?? this.DEFAULT_RULES.tech_stack_tools,
          min_design_quality_score:
            layer2Rules.min_design_quality_score ?? this.DEFAULT_RULES.min_design_quality_score,
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
   */
  private detectCompanyPages($: any, html: string): CompanyPageSignals {
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
   */
  private detectBlogData($: any, html: string, thresholdDays: number): BlogDataSignals {
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
   */
  private detectTechStack($: any, html: string): TechStackSignals {
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
   */
  private assessDesignQuality($: any, html: string): DesignQualitySignals {
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
   * Evaluate all signals against Layer 2 pass/fail criteria
   * Scoring system: Must pass at least 2 of 4 criteria
   *
   * REFACTORED: Changed from strict ALL-must-pass to flexible scoring
   * Rationale: Homepage scraping cannot reliably detect blog post dates
   * (blog dates typically appear on /blog page, not homepage)
   */
  private evaluateSignals(
    signals: Layer2Signals,
    rules: Layer2Rules,
  ): { passed: boolean; reasoning: string } {
    const failures: string[] = [];
    const passes: string[] = [];
    let passCount = 0;

    // Check company pages (minimum 2 of 3)
    if (signals.company_pages.count >= rules.required_pages_count) {
      passes.push(`Company pages (${signals.company_pages.count}/3)`);
      passCount++;
    } else {
      failures.push(
        `Missing required pages (${signals.company_pages.count}/${rules.required_pages_count} found)`,
      );
    }

    // Check blog freshness (optional - difficult to detect from homepage)
    if (signals.blog_data.passes_freshness) {
      passes.push('Fresh blog detected');
      passCount++;
    } else {
      if (!signals.blog_data.has_blog) {
        failures.push('No blog section detected');
      } else if (signals.blog_data.days_since_last_post === null) {
        failures.push('Blog dates not found on homepage');
      } else {
        failures.push(
          `Blog not fresh (${signals.blog_data.days_since_last_post} days since last post)`,
        );
      }
    }

    // Check tech stack
    if (signals.tech_stack.count >= rules.min_tech_stack_tools) {
      passes.push(`Professional tech stack (${signals.tech_stack.count} tools)`);
      passCount++;
    } else {
      failures.push(
        `Insufficient tech stack (${signals.tech_stack.count}/${rules.min_tech_stack_tools} tools detected)`,
      );
    }

    // Check design quality
    if (signals.design_quality.score >= rules.min_design_quality_score) {
      passes.push(`Design quality (${signals.design_quality.score}/10)`);
      passCount++;
    } else {
      failures.push(
        `Low design quality (score: ${signals.design_quality.score}/${rules.min_design_quality_score})`,
      );
    }

    // Final decision: Must pass at least 2 of 4 criteria
    const REQUIRED_PASS_COUNT = 2;

    if (passCount >= REQUIRED_PASS_COUNT) {
      return {
        passed: true,
        reasoning: `PASS Layer 2 - ${passes.join(', ')} (${passCount}/4 criteria met)`,
      };
    }

    return {
      passed: false,
      reasoning: `REJECT Layer 2 - Only ${passCount}/${REQUIRED_PASS_COUNT} required criteria met. Failures: ${failures.join('; ')}`,
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
      signals: {
        company_pages: { has_about: false, has_team: false, has_contact: false, count: 0 },
        blog_data: {
          has_blog: false,
          last_post_date: null,
          days_since_last_post: null,
          passes_freshness: false,
        },
        tech_stack: { tools_detected: [], count: 0 },
        design_quality: {
          score: 0,
          has_modern_framework: false,
          is_responsive: false,
          has_professional_imagery: false,
        },
      },
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
        companyPageFound: result.signals.company_pages.count >= 2,
        blogFreshnessScore: result.signals.blog_data.passes_freshness ? 1 : 0,
        techStack: result.signals.tech_stack.tools_detected,
        lastBlogPostDate: result.signals.blog_data.last_post_date,
        contactInfoPresent: result.signals.company_pages.has_contact,
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
      // Run full Layer 2 filter to get all signals
      const result = await this.filterUrl(url);

      // Map Layer2Signals to Layer2Results format
      return {
        guest_post_red_flags: {
          contact_page: {
            checked: true,
            detected: result.signals.company_pages.has_contact,
          },
          author_bio: {
            checked: false, // NOT IMPLEMENTED - would need full page scraping
            detected: false,
          },
          pricing_page: {
            checked: false, // NOT IMPLEMENTED - would need full page scraping
            detected: false,
          },
          submit_content: {
            checked: false, // NOT IMPLEMENTED - would need full page scraping
            detected: false,
          },
          write_for_us: {
            checked: false, // NOT IMPLEMENTED - would need full page scraping
            detected: false,
          },
          guest_post_guidelines: {
            checked: false, // NOT IMPLEMENTED - would need full page scraping
            detected: false,
          },
        },
        content_quality: {
          thin_content: {
            checked: false, // NOT IMPLEMENTED - would need word count analysis
            detected: false,
            word_count: undefined,
            threshold: undefined,
          },
          excessive_ads: {
            checked: false, // NOT IMPLEMENTED - would need ad detection
            detected: false,
          },
          broken_links: {
            checked: false, // NOT IMPLEMENTED - would need link validation
            detected: false,
            count: undefined,
          },
        },
      };
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
}
