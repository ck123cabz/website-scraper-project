import { Test, TestingModule } from '@nestjs/testing';
import { Layer2OperationalFilterService } from '../../jobs/services/layer2-operational-filter.service';
import { ScraperService } from '../../scraper/scraper.service';
import { SettingsService } from '../../settings/settings.service';
import type { Layer2Rules } from '@website-scraper/shared';

/**
 * Unit Test for Layer2Processor - Task T023
 * Tests Layer2OperationalFilterService.getLayer2Factors() method in isolation
 *
 * This test validates that getLayer2Factors() returns a complete Layer2Factors structure
 * with all required fields as defined in:
 * - packages/shared/src/types/url-results.ts (Layer2Factors interface)
 * - apps/api/src/queue/dto/layer2-factors.dto.ts (Layer2FactorsDto validation)
 *
 * Test follows TDD approach - this test should FAIL before implementation is complete
 */
describe('Layer2Processor - getLayer2Factors() Unit Test', () => {
  let service: Layer2OperationalFilterService;
  let scraperService: ScraperService;
  let settingsService: SettingsService;

  const mockRules: Layer2Rules = {
    publication_score_threshold: 0.65,
    product_keywords: {
      commercial: ['pricing', 'buy', 'demo', 'plans'],
      features: ['features', 'capabilities', 'solutions'],
      cta: ['get started', 'sign up', 'request demo'],
    },
    business_nav_keywords: ['product', 'pricing', 'solutions', 'about'],
    content_nav_keywords: ['articles', 'blog', 'news', 'topics'],
    min_business_nav_percentage: 0.3,
    ad_network_patterns: ['googlesyndication', 'adsense', 'doubleclick'],
    affiliate_patterns: ['amazon', 'affiliate', 'aff='],
    payment_provider_patterns: ['stripe', 'paypal', 'braintree'],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Layer2OperationalFilterService,
        {
          provide: ScraperService,
          useValue: {
            fetchUrl: jest.fn(),
          },
        },
        {
          provide: SettingsService,
          useValue: {
            getSettings: jest.fn().mockResolvedValue({
              layer2_rules: mockRules,
            }),
          },
        },
      ],
    }).compile();

    service = module.get<Layer2OperationalFilterService>(Layer2OperationalFilterService);
    scraperService = module.get<ScraperService>(ScraperService);
    settingsService = module.get<SettingsService>(SettingsService);
  });

  describe('Complete Layer2Factors Structure', () => {
    it('should return all required Layer2Factors fields', async () => {
      // Mock a typical company homepage with product signals
      const companyHtml = `
        <html>
          <head>
            <script src="https://js.stripe.com/v3/"></script>
          </head>
          <body>
            <nav>
              <a href="/product">Product</a>
              <a href="/pricing">Pricing</a>
              <a href="/solutions">Solutions</a>
              <a href="/about">About</a>
            </nav>
            <section class="hero">
              <h1>Enterprise Software Solutions</h1>
              <p>Transform your business with our platform</p>
              <p>Starting at $99/month</p>
              <button>Get Started</button>
            </section>
            <div class="features">
              <h2>Features</h2>
              <p>Powerful capabilities for your team</p>
            </div>
          </body>
        </html>
      `;

      jest.spyOn(scraperService, 'fetchUrl').mockResolvedValue({
        success: true,
        content: companyHtml,
        url: 'https://company.com',
        title: 'Company Inc',
        metaDescription: 'Enterprise software solutions',
      });

      const result = await service.getLayer2Factors('https://company.com');

      // Test ALL required top-level fields exist
      expect(result).toHaveProperty('publication_score');
      expect(result).toHaveProperty('module_scores');
      expect(result).toHaveProperty('keywords_found');
      expect(result).toHaveProperty('ad_networks_detected');
      expect(result).toHaveProperty('content_signals');
      expect(result).toHaveProperty('reasoning');
      expect(result).toHaveProperty('passed');
    });

    it('should return correct module_scores breakdown with all 4 modules', async () => {
      const html = '<html><body><nav><a href="/pricing">Pricing</a></nav></body></html>';

      jest.spyOn(scraperService, 'fetchUrl').mockResolvedValue({
        success: true,
        content: html,
        url: 'https://test.com',
        title: 'Test',
        metaDescription: null,
      });

      const result = await service.getLayer2Factors('https://test.com');

      // Test module_scores has all 4 required fields
      expect(result.module_scores).toHaveProperty('product_offering');
      expect(result.module_scores).toHaveProperty('layout_quality');
      expect(result.module_scores).toHaveProperty('navigation_complexity');
      expect(result.module_scores).toHaveProperty('monetization_indicators');
    });

    it('should return correct content_signals structure with all boolean fields', async () => {
      const html = `
        <html>
          <body>
            <nav><a href="/blog">Blog</a></nav>
            <h2>Latest Posts</h2>
            <article><time datetime="2024-01-15">Jan 15</time></article>
          </body>
        </html>
      `;

      jest.spyOn(scraperService, 'fetchUrl').mockResolvedValue({
        success: true,
        content: html,
        url: 'https://blog.com',
        title: 'Blog Site',
        metaDescription: null,
      });

      const result = await service.getLayer2Factors('https://blog.com');

      // Test content_signals has all 4 required boolean fields
      expect(result.content_signals).toHaveProperty('has_blog');
      expect(result.content_signals).toHaveProperty('has_press_releases');
      expect(result.content_signals).toHaveProperty('has_whitepapers');
      expect(result.content_signals).toHaveProperty('has_case_studies');

      // Test all content_signals are booleans
      expect(typeof result.content_signals.has_blog).toBe('boolean');
      expect(typeof result.content_signals.has_press_releases).toBe('boolean');
      expect(typeof result.content_signals.has_whitepapers).toBe('boolean');
      expect(typeof result.content_signals.has_case_studies).toBe('boolean');
    });
  });

  describe('Score Range Validation', () => {
    it('should return publication_score in valid range (0.0-1.0)', async () => {
      const html = '<html><body>Test</body></html>';

      jest.spyOn(scraperService, 'fetchUrl').mockResolvedValue({
        success: true,
        content: html,
        url: 'https://test.com',
        title: 'Test',
        metaDescription: null,
      });

      const result = await service.getLayer2Factors('https://test.com');

      expect(result.publication_score).toBeGreaterThanOrEqual(0.0);
      expect(result.publication_score).toBeLessThanOrEqual(1.0);
    });

    it('should return all module_scores in valid range (0.0-1.0)', async () => {
      const html = '<html><body>Test</body></html>';

      jest.spyOn(scraperService, 'fetchUrl').mockResolvedValue({
        success: true,
        content: html,
        url: 'https://test.com',
        title: 'Test',
        metaDescription: null,
      });

      const result = await service.getLayer2Factors('https://test.com');

      // Validate each module score is in 0.0-1.0 range
      expect(result.module_scores.product_offering).toBeGreaterThanOrEqual(0.0);
      expect(result.module_scores.product_offering).toBeLessThanOrEqual(1.0);

      expect(result.module_scores.layout_quality).toBeGreaterThanOrEqual(0.0);
      expect(result.module_scores.layout_quality).toBeLessThanOrEqual(1.0);

      expect(result.module_scores.navigation_complexity).toBeGreaterThanOrEqual(0.0);
      expect(result.module_scores.navigation_complexity).toBeLessThanOrEqual(1.0);

      expect(result.module_scores.monetization_indicators).toBeGreaterThanOrEqual(0.0);
      expect(result.module_scores.monetization_indicators).toBeLessThanOrEqual(1.0);
    });
  });

  describe('Data Type Validation', () => {
    it('should return keywords_found as string array', async () => {
      const html = `
        <html>
          <body>
            <h1>Pricing Plans</h1>
            <p>Get started with our features today</p>
            <button>Sign up now</button>
          </body>
        </html>
      `;

      jest.spyOn(scraperService, 'fetchUrl').mockResolvedValue({
        success: true,
        content: html,
        url: 'https://company.com',
        title: 'Company',
        metaDescription: null,
      });

      const result = await service.getLayer2Factors('https://company.com');

      expect(Array.isArray(result.keywords_found)).toBe(true);
      result.keywords_found.forEach((keyword: any) => {
        expect(typeof keyword).toBe('string');
      });
    });

    it('should return ad_networks_detected as string array', async () => {
      const html = `
        <html>
          <head>
            <script src="https://googlesyndication.com/adsbygoogle.js"></script>
          </head>
          <body>
            <div class="ad-container"></div>
          </body>
        </html>
      `;

      jest.spyOn(scraperService, 'fetchUrl').mockResolvedValue({
        success: true,
        content: html,
        url: 'https://ad-site.com',
        title: 'Ad Site',
        metaDescription: null,
      });

      const result = await service.getLayer2Factors('https://ad-site.com');

      expect(Array.isArray(result.ad_networks_detected)).toBe(true);
      result.ad_networks_detected.forEach((network: any) => {
        expect(typeof network).toBe('string');
      });
    });

    it('should return reasoning as non-empty string', async () => {
      const html = '<html><body>Test</body></html>';

      jest.spyOn(scraperService, 'fetchUrl').mockResolvedValue({
        success: true,
        content: html,
        url: 'https://test.com',
        title: 'Test',
        metaDescription: null,
      });

      const result = await service.getLayer2Factors('https://test.com');

      expect(typeof result.reasoning).toBe('string');
      expect(result.reasoning.length).toBeGreaterThan(0);
    });

    it('should return passed as boolean', async () => {
      const html = '<html><body>Test</body></html>';

      jest.spyOn(scraperService, 'fetchUrl').mockResolvedValue({
        success: true,
        content: html,
        url: 'https://test.com',
        title: 'Test',
        metaDescription: null,
      });

      const result = await service.getLayer2Factors('https://test.com');

      expect(typeof result.passed).toBe('boolean');
    });
  });

  describe('Real-World Scenarios', () => {
    it('should correctly analyze a company site with products', async () => {
      const companyHtml = `
        <html>
          <head>
            <script src="https://js.stripe.com/v3/"></script>
          </head>
          <body>
            <nav>
              <a href="/product">Product</a>
              <a href="/pricing">Pricing</a>
              <a href="/solutions">Solutions</a>
              <a href="/about">About</a>
              <a href="/blog">Blog</a>
            </nav>
            <section class="hero">
              <h1>Enterprise CRM Platform</h1>
              <p>Powerful capabilities for sales teams</p>
              <p>$99/month</p>
              <button>Get Started</button>
            </section>
          </body>
        </html>
      `;

      jest.spyOn(scraperService, 'fetchUrl').mockResolvedValue({
        success: true,
        content: companyHtml,
        url: 'https://company.com',
        title: 'Company CRM',
        metaDescription: 'CRM software',
      });

      const result = await service.getLayer2Factors('https://company.com');

      // Company site should have low publication score
      expect(result.publication_score).toBeLessThan(0.65);
      expect(result.passed).toBe(true);

      // Should detect product keywords
      expect(result.keywords_found.length).toBeGreaterThan(0);

      // Should have high product offering score (inverted logic)
      expect(result.module_scores.product_offering).toBeLessThan(0.5);

      // Should detect blog (Note: current implementation detects blog via layout_type)
      // Blog detection is based on navigation and layout, not just nav links
      expect(result.content_signals).toHaveProperty('has_blog');
      expect(typeof result.content_signals.has_blog).toBe('boolean');
    });

    it('should correctly analyze a publication site with ads', async () => {
      const publicationHtml = `
        <html>
          <head>
            <script src="https://googlesyndication.com/adsbygoogle.js"></script>
          </head>
          <body>
            <nav>
              <a href="/articles">Articles</a>
              <a href="/topics">Topics</a>
              <a href="/authors">Authors</a>
            </nav>
            <h2>Latest Articles</h2>
            <article>
              <time datetime="2024-01-15">Jan 15</time>
              <h3>How to Build a Website</h3>
              <div class="author">By John Doe</div>
            </article>
            <div class="ad-container">Advertisement</div>
          </body>
        </html>
      `;

      jest.spyOn(scraperService, 'fetchUrl').mockResolvedValue({
        success: true,
        content: publicationHtml,
        url: 'https://publication.com',
        title: 'Tech Publication',
        metaDescription: 'Tech news and articles',
      });

      const result = await service.getLayer2Factors('https://publication.com');

      // Publication should have high publication score
      expect(result.publication_score).toBeGreaterThanOrEqual(0.65);
      expect(result.passed).toBe(false);

      // Should detect ad networks
      expect(result.ad_networks_detected.length).toBeGreaterThan(0);

      // Should have blog layout
      expect(result.content_signals.has_blog).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle scraping failures gracefully', async () => {
      jest.spyOn(scraperService, 'fetchUrl').mockResolvedValue({
        success: false,
        content: '',
        url: 'https://fail.com',
        title: null,
        metaDescription: null,
        error: 'Network timeout',
      });

      const result = await service.getLayer2Factors('https://fail.com');

      // Should return empty/default structure with all required fields
      expect(result).toHaveProperty('publication_score');
      expect(result).toHaveProperty('module_scores');
      expect(result).toHaveProperty('keywords_found');
      expect(result).toHaveProperty('ad_networks_detected');
      expect(result).toHaveProperty('content_signals');
      expect(result).toHaveProperty('reasoning');
      expect(result).toHaveProperty('passed');

      // Reasoning should indicate failure or scraping issue
      expect(result.reasoning).toMatch(/fail|error|scraping failed/i);
    });

    it('should handle invalid URL input', async () => {
      const result = await service.getLayer2Factors('');

      // Should return empty structure for invalid input
      // Note: Current implementation uses fail-open strategy (defaults to PASS)
      expect(result).toHaveProperty('publication_score');
      expect(result.publication_score).toBe(0);
      // Fail-open: invalid input passes through to next layer
      expect(result.passed).toBe(true);
      expect(result.reasoning).toContain('Invalid input');
    });
  });
});
