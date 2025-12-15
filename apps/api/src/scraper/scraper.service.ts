import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError, AxiosResponse } from 'axios';
import * as cheerio from 'cheerio';
import type {
  ScraperResult,
  ContentExtractionResult,
  ScrapingBeeErrorCode,
} from '@website-scraper/shared';

/**
 * ScrapingBee integration service for web scraping
 * Story 2.5: Worker Processing & Real-Time Updates
 *
 * Features:
 * - ScrapingBee API integration with JS rendering
 * - Content extraction with cheerio (title, meta, body text)
 * - Comprehensive error handling (429 rate limit, timeouts, auth errors)
 * - Retry logic for transient errors
 * - Security: validates API responses, sanitizes inputs
 */
@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);
  private readonly scrapingBeeApiUrl = 'https://app.scrapingbee.com/api/v1/';
  private readonly timeoutMs = 30000; // 30 seconds
  private readonly maxContentLength = 10000; // 10K characters

  constructor() {
    if (!process.env.SCRAPINGBEE_API_KEY) {
      this.logger.warn('SCRAPINGBEE_API_KEY not found - scraping will fail');
    } else {
      this.logger.log('ScrapingBee client initialized successfully');
    }
  }

  /**
   * Check if ScrapingBee service is configured
   */
  isAvailable(): boolean {
    return !!process.env.SCRAPINGBEE_API_KEY;
  }

  // Minimum content length to consider a scrape successful (chars)
  private readonly MIN_CONTENT_LENGTH = 500;

  // SPA framework indicators that suggest JS rendering is needed
  private readonly SPA_INDICATORS = [
    'id="root"', // React
    'id="app"', // Vue
    'ng-app', // Angular
    'data-reactroot',
    '__NEXT_DATA__', // Next.js
    '__NUXT__', // Nuxt.js
    'window.__INITIAL_STATE__',
    '<noscript>You need to enable JavaScript',
    '<noscript>Please enable JavaScript',
    'This page requires JavaScript',
  ];

  /**
   * Fetch a URL using ScrapingBee API
   *
   * @param url - URL to fetch
   * @param renderJs - Whether to enable JS rendering (default: true for backwards compatibility)
   *                   - true = 5 credits (headless browser, executes JavaScript)
   *                   - false = 1 credit (simple HTTP request, no JS execution)
   * @returns ScraperResult with content and metadata
   */
  async fetchUrl(url: string, renderJs: boolean = true): Promise<ScraperResult> {
    const startTime = Date.now();

    // Input validation
    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      return this.createErrorResult(url, 'Invalid URL provided', startTime);
    }

    if (!this.isAvailable()) {
      return this.createErrorResult(url, 'ScrapingBee API key not configured', startTime);
    }

    // Sanitize URL for logging (limit length)
    const sanitizedUrl = url.length > 100 ? url.slice(0, 100) + '...' : url;
    const creditCost = renderJs ? 5 : 1;
    this.logger.log(`Fetching URL: ${sanitizedUrl} (render_js=${renderJs}, ${creditCost} credit${creditCost > 1 ? 's' : ''})`);

    try {
      // Call ScrapingBee API
      const response: AxiosResponse = await axios.get(this.scrapingBeeApiUrl, {
        params: {
          api_key: process.env.SCRAPINGBEE_API_KEY,
          url: url,
          render_js: renderJs ? 'true' : 'false', // JS rendering toggle
          premium_proxy: 'false', // Use standard proxies
          // Don't send country_code if empty - ScrapingBee rejects empty string
        },
        timeout: this.timeoutMs,
        validateStatus: () => true, // Don't throw on any status code
      });

      const processingTimeMs = Date.now() - startTime;

      // Handle non-200 status codes
      if (response.status !== 200) {
        const errorMessage = `ScrapingBee returned status ${response.status}`;
        const responseBody =
          typeof response.data === 'string'
            ? response.data.slice(0, 200)
            : JSON.stringify(response.data).slice(0, 200);
        this.logger.warn(`${errorMessage} for URL: ${sanitizedUrl}. Response: ${responseBody}`);

        return {
          url,
          content: '',
          title: null,
          metaDescription: null,
          success: false,
          statusCode: response.status,
          error: errorMessage,
          processingTimeMs,
        };
      }

      // Extract content from HTML
      const html = response.data;
      if (!html || typeof html !== 'string') {
        return this.createErrorResult(url, 'Invalid HTML response from ScrapingBee', startTime);
      }

      const extracted = this.extractContent(html);

      this.logger.log(`Successfully fetched URL: ${sanitizedUrl} (${processingTimeMs}ms)`);

      return {
        url,
        content: html,
        title: extracted.title,
        metaDescription: extracted.metaDescription,
        success: true,
        statusCode: response.status,
        finalUrl: response.headers['spb-final-url'] || url, // ScrapingBee returns final URL after redirects
        processingTimeMs,
      };
    } catch (error) {
      const processingTimeMs = Date.now() - startTime;
      const errorMessage = this.parseError(error);
      const sanitizedError = this.sanitizeErrorMessage(errorMessage);

      this.logger.error(`Failed to fetch URL: ${sanitizedUrl} - ${sanitizedError}`);

      return {
        url,
        content: '',
        title: null,
        metaDescription: null,
        success: false,
        error: sanitizedError,
        processingTimeMs,
      };
    }
  }

  /**
   * Smart fetch: Try without JS first (1 credit), retry with JS (5 credits) if needed.
   * This optimizes credit usage by only using JS rendering when necessary.
   *
   * Credit costs:
   * - Best case (no JS needed): 1 credit
   * - Worst case (JS retry needed): 6 credits (1 + 5)
   * - Average case (~30% need JS): ~2.5 credits
   *
   * JS rendering is triggered when:
   * - Content is too short (< 500 chars body text)
   * - SPA framework indicators detected (React, Vue, Angular, Next.js, Nuxt.js)
   * - Page explicitly requires JavaScript
   *
   * @param url - URL to fetch
   * @returns ScraperResult with content and metadata, plus jsRetryUsed flag
   */
  async fetchUrlSmart(url: string): Promise<ScraperResult & { jsRetryUsed: boolean; creditsUsed: number }> {
    const sanitizedUrl = url.length > 100 ? url.slice(0, 100) + '...' : url;

    // Step 1: Try without JS rendering (1 credit)
    this.logger.log(`[Smart Fetch] Attempting without JS: ${sanitizedUrl}`);
    const noJsResult = await this.fetchUrl(url, false);

    // If the request failed entirely, return the failure (don't waste credits retrying)
    if (!noJsResult.success) {
      this.logger.log(`[Smart Fetch] Failed without JS, not retrying: ${noJsResult.error}`);
      return { ...noJsResult, jsRetryUsed: false, creditsUsed: 1 };
    }

    // Check if we need JS rendering
    const needsJs = this.detectJsRequired(noJsResult.content || '');

    if (!needsJs) {
      this.logger.log(`[Smart Fetch] Success without JS (1 credit): ${sanitizedUrl}`);
      return { ...noJsResult, jsRetryUsed: false, creditsUsed: 1 };
    }

    // Step 2: Retry with JS rendering (5 more credits)
    this.logger.log(`[Smart Fetch] JS required, retrying with JS rendering: ${sanitizedUrl}`);
    const jsResult = await this.fetchUrl(url, true);

    if (!jsResult.success) {
      // JS fetch failed - return original no-JS result as fallback
      this.logger.warn(`[Smart Fetch] JS retry failed, using no-JS result: ${jsResult.error}`);
      return { ...noJsResult, jsRetryUsed: true, creditsUsed: 6 };
    }

    this.logger.log(`[Smart Fetch] Success with JS retry (6 credits total): ${sanitizedUrl}`);
    return { ...jsResult, jsRetryUsed: true, creditsUsed: 6 };
  }

  /**
   * Detect if a page requires JavaScript rendering based on content analysis
   * @private
   */
  private detectJsRequired(html: string): boolean {
    if (!html || html.length === 0) {
      return true; // Empty content likely needs JS
    }

    // Check content length (extract body text first)
    const extracted = this.extractContent(html);
    const bodyTextLength = extracted.bodyText?.length || 0;

    if (bodyTextLength < this.MIN_CONTENT_LENGTH) {
      this.logger.debug(`[JS Detection] Content too short (${bodyTextLength} chars < ${this.MIN_CONTENT_LENGTH})`);
      return true;
    }

    // Check for SPA framework indicators
    const htmlLower = html.toLowerCase();
    for (const indicator of this.SPA_INDICATORS) {
      if (htmlLower.includes(indicator.toLowerCase())) {
        this.logger.debug(`[JS Detection] SPA indicator found: ${indicator}`);
        return true;
      }
    }

    return false;
  }

  /**
   * Extract content from HTML using cheerio
   *
   * @param html - HTML content to parse
   * @returns Extracted title, meta description, and body text
   */
  extractContent(html: string): ContentExtractionResult {
    try {
      // Input validation
      if (!html || typeof html !== 'string' || html.trim().length === 0) {
        return {
          title: null,
          metaDescription: null,
          bodyText: '',
          truncated: false,
        };
      }

      const $ = cheerio.load(html);

      // Extract title: <title> tag or og:title meta tag
      const title =
        $('title').first().text().trim() ||
        $('meta[property="og:title"]').attr('content')?.trim() ||
        null;

      // Extract meta description: <meta name="description"> or og:description
      const metaDescription =
        $('meta[name="description"]').attr('content')?.trim() ||
        $('meta[property="og:description"]').attr('content')?.trim() ||
        null;

      // Extract body text: remove scripts, styles, strip HTML tags
      $('script, style, noscript, iframe, object, embed').remove();

      // Get text from body or entire document
      const bodyElement = $('body');
      const bodyText = (bodyElement.length > 0 ? bodyElement : $.root())
        .text()
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();

      // Truncate to max length
      let finalBodyText = bodyText;
      let truncated = false;

      if (bodyText.length > this.maxContentLength) {
        finalBodyText = bodyText.slice(0, this.maxContentLength) + '...(truncated)';
        truncated = true;
      }

      return {
        title: title && title.length > 0 ? title : null,
        metaDescription: metaDescription && metaDescription.length > 0 ? metaDescription : null,
        bodyText: finalBodyText,
        truncated,
      };
    } catch (error) {
      this.logger.warn(
        `Failed to extract content from HTML: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );

      // Return partial content on extraction failure (graceful degradation)
      return {
        title: null,
        metaDescription: null,
        bodyText: '',
        truncated: false,
      };
    }
  }

  /**
   * Parse error from axios or other sources
   * @private
   */
  private parseError(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      // Network errors
      if (axiosError.code === 'ETIMEDOUT' || axiosError.code === 'ECONNABORTED') {
        return 'Request timeout (>30s)';
      }

      if (axiosError.code === 'ECONNRESET') {
        return 'Connection reset by server';
      }

      if (axiosError.code === 'ENOTFOUND' || axiosError.code === 'ECONNREFUSED') {
        return 'Network error - could not connect to ScrapingBee';
      }

      // HTTP errors
      if (axiosError.response) {
        const status = axiosError.response.status;
        if (status === 429) return 'Rate limit exceeded (429)';
        if (status === 401) return 'Unauthorized - invalid API key (401)';
        if (status === 403) return 'Forbidden (403)';
        if (status === 400) return 'Bad request (400)';
        if (status === 500) return 'ScrapingBee server error (500)';
        if (status === 503) return 'Service unavailable (503)';

        return `HTTP error ${status}`;
      }

      return axiosError.message || 'Unknown network error';
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown error';
  }

  /**
   * Map HTTP status code to error code
   * @private
   */
  private getErrorCode(status: number): ScrapingBeeErrorCode {
    if (status === 429) return 'RATE_LIMIT';
    if (status === 401) return 'UNAUTHORIZED';
    if (status === 400) return 'BAD_REQUEST';
    if (status === 500) return 'SERVER_ERROR';
    return 'UNKNOWN';
  }

  /**
   * Sanitize error message before logging/returning
   * Removes sensitive information, limits length
   * @private
   */
  private sanitizeErrorMessage(message: string): string {
    if (!message || typeof message !== 'string') {
      return 'Unknown error';
    }

    // Remove potential API keys (basic pattern matching)
    let sanitized = message.replace(/api[_-]?key[=:]\s*[\w-]+/gi, 'api_key=***');

    // Limit length
    if (sanitized.length > 200) {
      sanitized = sanitized.slice(0, 200) + '...';
    }

    // Remove control characters
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

    return sanitized;
  }

  /**
   * Create an error result with consistent structure
   * @private
   */
  private createErrorResult(url: string, error: string, startTime: number): ScraperResult {
    return {
      url,
      content: '',
      title: null,
      metaDescription: null,
      success: false,
      error: this.sanitizeErrorMessage(error),
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Determine if an error is transient and should be retried
   * Used by worker processor for retry logic
   */
  isTransientError(error: string): boolean {
    const message = error.toLowerCase();

    // Transient errors: retry
    if (
      message.includes('timeout') ||
      message.includes('etimedout') ||
      message.includes('econnreset') ||
      message.includes('429') ||
      message.includes('rate limit') ||
      message.includes('503') ||
      message.includes('service unavailable') ||
      message.includes('network error')
    ) {
      return true;
    }

    // Permanent errors: do not retry
    if (
      message.includes('401') ||
      message.includes('unauthorized') ||
      message.includes('400') ||
      message.includes('bad request') ||
      message.includes('403') ||
      message.includes('forbidden')
    ) {
      return false;
    }

    // Default: treat as transient (fail-open for retries)
    return true;
  }
}
