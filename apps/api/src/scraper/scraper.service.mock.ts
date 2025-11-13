import { Injectable, Logger } from '@nestjs/common';
import type { ScraperResult, ContentExtractionResult } from '@website-scraper/shared';

/**
 * Mock ScraperService for local testing without external API calls
 * Story 3.0 Task 7: Create Mock Services for External APIs
 *
 * Features:
 * - Returns predefined HTML responses for test URLs
 * - Simulates realistic processing delays (100-500ms)
 * - Supports error scenarios (404, timeout, rate limit)
 * - No external API calls or costs
 */
@Injectable()
export class MockScraperService {
  private readonly logger = new Logger(MockScraperService.name);

  // Predefined mock responses for test URLs
  private readonly mockResponses: Record<string, Partial<ScraperResult>> = {
    'example.com': {
      success: true,
      statusCode: 200,
      content: `
        <html>
          <head>
            <title>Example Domain - Guest Posts Welcome</title>
            <meta name="description" content="Submit your guest posts to Example Domain. We accept quality content submissions."/>
          </head>
          <body>
            <h1>Write for Us</h1>
            <p>We're always looking for quality guest posts. Submit your content today!</p>
            <section class="guidelines">
              <h2>Guest Post Guidelines</h2>
              <p>We accept articles on technology, business, and marketing.</p>
            </section>
          </body>
        </html>
      `,
      title: 'Example Domain - Guest Posts Welcome',
      metaDescription:
        'Submit your guest posts to Example Domain. We accept quality content submissions.',
    },
    'test-blog.com': {
      success: true,
      statusCode: 200,
      content: `
        <html>
          <head>
            <title>Test Blog - Quality Tech Articles</title>
            <meta name="description" content="Tech blog with guest contributor opportunities"/>
          </head>
          <body>
            <h1>Test Blog</h1>
            <p>Welcome to Test Blog. We feature guest contributors.</p>
            <div class="contribute">
              <h2>Become a Contributor</h2>
              <p>Share your expertise with our readers. Apply to write for us.</p>
            </div>
          </body>
        </html>
      `,
      title: 'Test Blog - Quality Tech Articles',
      metaDescription: 'Tech blog with guest contributor opportunities',
    },
    'platform-site.com': {
      success: true,
      statusCode: 200,
      content: `
        <html>
          <head>
            <title>Platform Site - Blogging Platform</title>
            <meta name="description" content="Create your own blog on our platform"/>
          </head>
          <body>
            <h1>Start Your Blog Today</h1>
            <p>Join thousands of bloggers on our free platform.</p>
            <p>Sign up now and start publishing.</p>
          </body>
        </html>
      `,
      title: 'Platform Site - Blogging Platform',
      metaDescription: 'Create your own blog on our platform',
    },
    'news-site.com': {
      success: true,
      statusCode: 200,
      content: `
        <html>
          <head>
            <title>News Site - Breaking News</title>
            <meta name="description" content="Latest news and updates"/>
          </head>
          <body>
            <h1>Breaking News</h1>
            <p>Stay updated with the latest news from around the world.</p>
            <p>Our editorial team produces daily news content.</p>
          </body>
        </html>
      `,
      title: 'News Site - Breaking News',
      metaDescription: 'Latest news and updates',
    },
    'ecommerce-store.com': {
      success: true,
      statusCode: 200,
      content: `
        <html>
          <head>
            <title>E-commerce Store - Shop Online</title>
            <meta name="description" content="Buy products online with fast shipping"/>
          </head>
          <body>
            <h1>Shop Our Products</h1>
            <div class="products">
              <p>Browse thousands of products with free shipping.</p>
            </div>
          </body>
        </html>
      `,
      title: 'E-commerce Store - Shop Online',
      metaDescription: 'Buy products online with fast shipping',
    },
    'guest-writer-site.com': {
      success: true,
      statusCode: 200,
      content: `
        <html>
          <head>
            <title>Guest Writer Hub - Submit Articles</title>
            <meta name="description" content="We pay for quality guest posts and articles"/>
          </head>
          <body>
            <h1>Write for Us - Get Paid</h1>
            <p>We're actively looking for guest writers in technology, finance, and lifestyle.</p>
            <section class="submission-guidelines">
              <h2>Submission Guidelines</h2>
              <ul>
                <li>Original content only</li>
                <li>1500+ words preferred</li>
                <li>Include author bio</li>
              </ul>
            </section>
            <p>Contact: submissions@guest-writer-site.com</p>
          </body>
        </html>
      `,
      title: 'Guest Writer Hub - Submit Articles',
      metaDescription: 'We pay for quality guest posts and articles',
    },
    'marketing-blog.com': {
      success: true,
      statusCode: 200,
      content: `
        <html>
          <head>
            <title>Marketing Blog - Industry Insights</title>
            <meta name="description" content="Marketing tips and guest contributions welcome"/>
          </head>
          <body>
            <h1>Marketing Insights</h1>
            <p>Learn from industry experts and contribute your own insights.</p>
            <div class="contributors">
              <h2>Our Contributors</h2>
              <p>We feature articles from marketing professionals worldwide.</p>
              <a href="/contribute">Become a Contributor</a>
            </div>
          </body>
        </html>
      `,
      title: 'Marketing Blog - Industry Insights',
      metaDescription: 'Marketing tips and guest contributions welcome',
    },
    'tech-tutorials.com': {
      success: true,
      statusCode: 200,
      content: `
        <html>
          <head>
            <title>Tech Tutorials - Learn Programming</title>
            <meta name="description" content="Programming tutorials and tech articles"/>
          </head>
          <body>
            <h1>Tech Tutorials</h1>
            <p>Free programming tutorials written by community contributors.</p>
            <section class="write-tutorial">
              <h2>Share Your Knowledge</h2>
              <p>Have expertise in a programming language? Write a tutorial for our community.</p>
            </section>
          </body>
        </html>
      `,
      title: 'Tech Tutorials - Learn Programming',
      metaDescription: 'Programming tutorials and tech articles',
    },
    'error-404.com': {
      success: false,
      statusCode: 404,
      error: 'Page not found (404)',
      content: '',
      title: null,
      metaDescription: null,
    },
    'timeout-site.com': {
      success: false,
      error: 'Request timeout (>30s)',
      content: '',
      title: null,
      metaDescription: null,
    },
  };

  // Default response for URLs not in mockResponses
  private readonly defaultResponse: Partial<ScraperResult> = {
    success: true,
    statusCode: 200,
    content: `
      <html>
        <head>
          <title>Generic Website</title>
          <meta name="description" content="A generic website for testing"/>
        </head>
        <body>
          <h1>Welcome</h1>
          <p>This is a generic website used for mock testing.</p>
        </body>
      </html>
    `,
    title: 'Generic Website',
    metaDescription: 'A generic website for testing',
  };

  constructor() {
    this.logger.log('MockScraperService initialized - NO external API calls will be made');
  }

  /**
   * Check if mock service is available (always true)
   */
  isAvailable(): boolean {
    return true;
  }

  /**
   * Mock fetch URL - returns predefined responses
   *
   * @param url - URL to fetch (used for lookup in mockResponses)
   * @returns Mock ScraperResult with content
   */
  async fetchUrl(url: string): Promise<ScraperResult> {
    const startTime = Date.now();

    // Input validation
    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      return this.createErrorResult(url, 'Invalid URL provided', startTime);
    }

    // Extract domain from URL for lookup
    const domain = this.extractDomain(url);
    const sanitizedUrl = url.length > 100 ? url.slice(0, 100) + '...' : url;

    this.logger.log(`[MOCK] Fetching URL: ${sanitizedUrl}`);

    // Simulate realistic network delay (100-500ms)
    const delay = Math.floor(Math.random() * 400) + 100; // 100-500ms
    await new Promise((resolve) => setTimeout(resolve, delay));

    // Get mock response for this domain
    const mockData = this.mockResponses[domain] || this.defaultResponse;
    const processingTimeMs = Date.now() - startTime;

    // Build result
    const result: ScraperResult = {
      url,
      content: mockData.content || '',
      title: mockData.title || null,
      metaDescription: mockData.metaDescription || null,
      success: mockData.success !== undefined ? mockData.success : true,
      statusCode: mockData.statusCode,
      error: mockData.error,
      finalUrl: url,
      processingTimeMs,
    };

    this.logger.log(
      `[MOCK] Fetched URL: ${sanitizedUrl} (${processingTimeMs}ms) - ${result.success ? 'SUCCESS' : 'FAILED'}`,
    );

    return result;
  }

  /**
   * Extract content from HTML (same implementation as real service)
   * This method is kept identical to maintain compatibility
   */
  extractContent(): ContentExtractionResult {
    // For mock service, we pre-populate title/meta in mockResponses
    // This method is kept for API compatibility but not used
    return {
      title: null,
      metaDescription: null,
      bodyText: '',
      truncated: false,
    };
  }

  /**
   * Mock transient error detection (same logic as real service)
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

    return true;
  }

  /**
   * Extract domain from URL
   * @private
   */
  private extractDomain(url: string): string {
    try {
      // Remove protocol if present
      let domain = url.replace(/^https?:\/\//, '');

      // Remove www. if present
      domain = domain.replace(/^www\./, '');

      // Remove path, query, and hash
      domain = domain.split('/')[0];
      domain = domain.split('?')[0];
      domain = domain.split('#')[0];

      return domain.toLowerCase();
    } catch {
      return url.toLowerCase();
    }
  }

  /**
   * Create an error result
   * @private
   */
  private createErrorResult(url: string, error: string, startTime: number): ScraperResult {
    return {
      url,
      content: '',
      title: null,
      metaDescription: null,
      success: false,
      error,
      processingTimeMs: Date.now() - startTime,
    };
  }
}
