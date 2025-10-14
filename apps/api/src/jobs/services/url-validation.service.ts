import { Injectable } from '@nestjs/common';

@Injectable()
export class UrlValidationService {
  // URL validation regex: starts with http/https, valid domain structure
  private readonly URL_PATTERN =
    /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;

  /**
   * Validate and normalize an array of URLs
   * @param urls Raw URLs from file or input
   * @returns Object with valid URLs and count of invalid URLs
   */
  validateAndNormalizeUrls(urls: string[]): { validUrls: string[]; invalidCount: number } {
    let invalidCount = 0;
    const validUrls: string[] = [];

    for (const url of urls) {
      const trimmed = url.trim();

      // Skip empty strings
      if (trimmed.length === 0) {
        continue;
      }

      // Validate URL format
      if (this.isValidUrl(trimmed)) {
        const normalized = this.normalizeUrl(trimmed);
        validUrls.push(normalized);
      } else {
        invalidCount++;
      }
    }

    return { validUrls, invalidCount };
  }

  /**
   * Check if a string is a valid URL
   */
  isValidUrl(url: string): boolean {
    return this.URL_PATTERN.test(url);
  }

  /**
   * Normalize a URL to consistent format
   * - Trim whitespace
   * - Lowercase domain
   * - Remove trailing slash
   */
  normalizeUrl(url: string): string {
    let normalized = url.trim();

    try {
      const urlObj = new URL(normalized);

      // Lowercase the protocol and hostname
      urlObj.protocol = urlObj.protocol.toLowerCase();
      urlObj.hostname = urlObj.hostname.toLowerCase();

      // Remove trailing slash from pathname (but keep root path)
      if (urlObj.pathname !== '/' && urlObj.pathname.endsWith('/')) {
        urlObj.pathname = urlObj.pathname.slice(0, -1);
      }

      return urlObj.toString();
    } catch (error) {
      // If URL parsing fails, return the original
      return normalized;
    }
  }

  /**
   * Normalize URL for deduplication purposes
   * Treats http vs https and www vs non-www as the same URL
   */
  normalizeForDeduplication(url: string): string {
    try {
      const urlObj = new URL(url);

      // Always use https for deduplication
      urlObj.protocol = 'https:';

      // Remove www. prefix
      urlObj.hostname = urlObj.hostname.replace(/^www\./, '');

      // Lowercase hostname
      urlObj.hostname = urlObj.hostname.toLowerCase();

      // Remove trailing slash
      if (urlObj.pathname !== '/' && urlObj.pathname.endsWith('/')) {
        urlObj.pathname = urlObj.pathname.slice(0, -1);
      }

      // Sort query parameters for consistent comparison
      if (urlObj.search) {
        const params = new URLSearchParams(urlObj.search);
        const sortedParams = new URLSearchParams(Array.from(params.entries()).sort());
        urlObj.search = sortedParams.toString();
      }

      return urlObj.toString();
    } catch (error) {
      return url;
    }
  }
}
