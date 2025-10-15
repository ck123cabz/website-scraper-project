/**
 * ScrapingBee and content extraction types
 * Story 2.5: Worker Processing & Real-Time Updates
 */

export interface ScraperResult {
  /** Original URL requested */
  url: string;
  /** Extracted HTML content from ScrapingBee */
  content: string;
  /** Extracted page title */
  title: string | null;
  /** Extracted meta description */
  metaDescription: string | null;
  /** Whether scraping succeeded */
  success: boolean;
  /** HTTP status code from ScrapingBee */
  statusCode?: number;
  /** Final URL after redirects */
  finalUrl?: string;
  /** Error message if scraping failed */
  error?: string;
  /** Processing time in milliseconds */
  processingTimeMs?: number;
}

export interface ContentExtractionResult {
  /** Extracted page title */
  title: string | null;
  /** Extracted meta description */
  metaDescription: string | null;
  /** Extracted and cleaned body text (limited to 10K chars) */
  bodyText: string;
  /** Whether content was truncated */
  truncated: boolean;
}

export interface ScrapingBeeResponse {
  /** HTML content */
  body: string;
  /** HTTP status code */
  status: number;
  /** Final URL after redirects */
  url: string;
}

export type ScrapingBeeErrorCode =
  | 'RATE_LIMIT' // 429
  | 'UNAUTHORIZED' // 401
  | 'BAD_REQUEST' // 400
  | 'SERVER_ERROR' // 500
  | 'TIMEOUT'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';
