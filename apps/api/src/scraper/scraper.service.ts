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

  /**
   * Fetch a URL using ScrapingBee API with JS rendering
   *
   * @param url - URL to fetch
   * @returns ScraperResult with content and metadata
   */
  async fetchUrl(url: string): Promise<ScraperResult> {
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
    this.logger.log(`Fetching URL: ${sanitizedUrl}`);

    try {
      // Call ScrapingBee API
      const response: AxiosResponse = await axios.get(this.scrapingBeeApiUrl, {
        params: {
          api_key: process.env.SCRAPINGBEE_API_KEY,
          url: url,
          render_js: 'true', // Enable JS rendering
          premium_proxy: 'false', // Use standard proxies
          // Don't send country_code if empty - ScrapingBee rejects empty string
        },
        timeout: this.timeoutMs,
        validateStatus: () => true, // Don't throw on any status code
      });

      const processingTimeMs = Date.now() - startTime;

      // Handle non-200 status codes
      if (response.status !== 200) {
        const errorCode = this.getErrorCode(response.status);
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
