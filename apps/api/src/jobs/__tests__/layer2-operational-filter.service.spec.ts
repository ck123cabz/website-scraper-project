import { Test, TestingModule } from '@nestjs/testing';
import { Layer2OperationalFilterService } from '../services/layer2-operational-filter.service';
import { SettingsService } from '../../settings/settings.service';
import { ScraperService } from '../../scraper/scraper.service';

describe('Layer2OperationalFilterService', () => {
  let service: Layer2OperationalFilterService;
  let scraperService: jest.Mocked<ScraperService>;
  let settingsService: jest.Mocked<SettingsService>;

  const mockScraperService = {
    fetchUrl: jest.fn(),
  };

  const mockSettingsService = {
    getSettings: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Layer2OperationalFilterService,
        {
          provide: ScraperService,
          useValue: mockScraperService,
        },
        {
          provide: SettingsService,
          useValue: mockSettingsService,
        },
      ],
    }).compile();

    service = module.get<Layer2OperationalFilterService>(Layer2OperationalFilterService);
    scraperService = module.get(ScraperService) as jest.Mocked<ScraperService>;
    settingsService = module.get(SettingsService) as jest.Mocked<SettingsService>;

    // Reset mocks
    jest.clearAllMocks();

    // Default mock implementations
    mockSettingsService.getSettings.mockResolvedValue({
      id: 'test',
      prefilter_rules: [],
      classification_indicators: [],
      llm_temperature: 0.3,
      confidence_threshold: 0.0,
      content_truncation_limit: 10000,
      confidence_threshold_high: 0.8,
      confidence_threshold_medium: 0.5,
      confidence_threshold_low: 0.3,
      updated_at: new Date().toISOString(),
    } as any);
  });

  describe('filterUrl', () => {
    it('should pass URL with all required signals', async () => {
      const mockHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width">
            <script src="https://www.googletagmanager.com/gtag/js"></script>
            <script src="https://js.hs-scripts.com/12345.js"></script>
          </head>
          <body>
            <nav>
              <a href="/about">About Us</a>
              <a href="/team">Our Team</a>
              <a href="/contact">Contact</a>
              <a href="/blog">Blog</a>
            </nav>
            <div class="blog-posts">
              <article>
                <time datetime="2025-10-01">October 1, 2025</time>
                <h2>Recent Post</h2>
              </article>
            </div>
            <img src="https://cdn.example.com/image.jpg" loading="lazy">
          </body>
        </html>
      `;

      mockScraperService.fetchUrl.mockResolvedValue({
        url: 'https://example.com',
        content: mockHtml,
        title: 'Example Company',
        metaDescription: 'A great company',
        success: true,
        statusCode: 200,
        processingTimeMs: 1000,
      });

      const result = await service.filterUrl('https://example.com');

      expect(result.passed).toBe(true);
      expect(result.reasoning).toBe('PASS Layer 2 - All operational signals validated');
      expect(result.signals.company_pages.count).toBeGreaterThanOrEqual(2);
      expect(result.signals.blog_data.passes_freshness).toBe(true);
      expect(result.signals.tech_stack.count).toBeGreaterThanOrEqual(2);
      expect(result.signals.design_quality.score).toBeGreaterThanOrEqual(6);
    });

    it('should reject URL with missing company pages', async () => {
      const mockHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width">
            <script src="https://www.googletagmanager.com/gtag/js"></script>
            <script src="https://js.hs-scripts.com/12345.js"></script>
          </head>
          <body>
            <nav>
              <a href="/blog">Blog</a>
            </nav>
            <div class="blog-posts">
              <article>
                <time datetime="2025-10-01">October 1, 2025</time>
              </article>
            </div>
          </body>
        </html>
      `;

      mockScraperService.fetchUrl.mockResolvedValue({
        url: 'https://example.com',
        content: mockHtml,
        title: 'Example',
        metaDescription: null,
        success: true,
        statusCode: 200,
        processingTimeMs: 1000,
      });

      const result = await service.filterUrl('https://example.com');

      expect(result.passed).toBe(false);
      expect(result.reasoning).toContain('Missing required pages');
      expect(result.signals.company_pages.count).toBeLessThan(2);
    });

    it('should reject URL with stale blog', async () => {
      const mockHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width">
            <script src="https://www.googletagmanager.com/gtag/js"></script>
            <script src="https://js.hs-scripts.com/12345.js"></script>
          </head>
          <body>
            <nav>
              <a href="/about">About Us</a>
              <a href="/team">Our Team</a>
              <a href="/contact">Contact</a>
              <a href="/blog">Blog</a>
            </nav>
            <div class="blog-posts">
              <article>
                <time datetime="2020-01-01">January 1, 2020</time>
              </article>
            </div>
          </body>
        </html>
      `;

      mockScraperService.fetchUrl.mockResolvedValue({
        url: 'https://example.com',
        content: mockHtml,
        title: 'Example',
        metaDescription: null,
        success: true,
        statusCode: 200,
        processingTimeMs: 1000,
      });

      const result = await service.filterUrl('https://example.com');

      expect(result.passed).toBe(false);
      expect(result.reasoning).toContain('Blog not fresh');
      expect(result.signals.blog_data.passes_freshness).toBe(false);
    });

    it('should reject URL with insufficient tech stack', async () => {
      const mockHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width">
          </head>
          <body>
            <nav>
              <a href="/about">About Us</a>
              <a href="/team">Our Team</a>
              <a href="/contact">Contact</a>
              <a href="/blog">Blog</a>
            </nav>
            <div class="blog-posts">
              <article>
                <time datetime="2025-10-01">October 1, 2025</time>
              </article>
            </div>
          </body>
        </html>
      `;

      mockScraperService.fetchUrl.mockResolvedValue({
        url: 'https://example.com',
        content: mockHtml,
        title: 'Example',
        metaDescription: null,
        success: true,
        statusCode: 200,
        processingTimeMs: 1000,
      });

      const result = await service.filterUrl('https://example.com');

      expect(result.passed).toBe(false);
      expect(result.reasoning).toContain('Insufficient tech stack');
      expect(result.signals.tech_stack.count).toBeLessThan(2);
    });

    it('should reject URL with low design quality', async () => {
      const mockHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <script src="https://www.googletagmanager.com/gtag/js"></script>
            <script src="https://js.hs-scripts.com/12345.js"></script>
          </head>
          <body>
            <nav>
              <a href="/about">About Us</a>
              <a href="/team">Our Team</a>
              <a href="/contact">Contact</a>
              <a href="/blog">Blog</a>
            </nav>
            <div class="blog-posts">
              <article>
                <time datetime="2025-10-01">October 1, 2025</time>
              </article>
            </div>
          </body>
        </html>
      `;

      mockScraperService.fetchUrl.mockResolvedValue({
        url: 'https://example.com',
        content: mockHtml,
        title: 'Example',
        metaDescription: null,
        success: true,
        statusCode: 200,
        processingTimeMs: 1000,
      });

      const result = await service.filterUrl('https://example.com');

      expect(result.passed).toBe(false);
      expect(result.reasoning).toContain('Low design quality');
      expect(result.signals.design_quality.score).toBeLessThan(6);
    });

    it('should handle scraping failure gracefully (fail-open)', async () => {
      mockScraperService.fetchUrl.mockResolvedValue({
        url: 'https://example.com',
        content: '',
        title: null,
        metaDescription: null,
        success: false,
        error: 'Network timeout',
        processingTimeMs: 30000,
      });

      const result = await service.filterUrl('https://example.com');

      expect(result.passed).toBe(true); // Fail-open strategy
      expect(result.reasoning).toContain('Scraping failed');
      expect(result.reasoning).toContain('defaulting to next layer');
    });

    it('should handle invalid URL input gracefully', async () => {
      const result = await service.filterUrl('');

      expect(result.passed).toBe(true); // Fail-open
      expect(result.reasoning).toContain('Invalid input');
    });

    it('should handle exception during filtering gracefully', async () => {
      mockScraperService.fetchUrl.mockRejectedValue(new Error('Unexpected error'));

      const result = await service.filterUrl('https://example.com');

      expect(result.passed).toBe(true); // Fail-open
      expect(result.reasoning).toContain('Error in analysis');
    });
  });

  describe('Company Page Detection', () => {
    it('should detect About page via navigation link', async () => {
      const html = '<nav><a href="/about">About Us</a></nav>';
      mockScraperService.fetchUrl.mockResolvedValue({
        url: 'https://example.com',
        content: html,
        title: null,
        metaDescription: null,
        success: true,
        statusCode: 200,
        processingTimeMs: 100,
      });

      const result = await service.filterUrl('https://example.com');
      expect(result.signals.company_pages.has_about).toBe(true);
    });

    it('should detect Team page via footer link', async () => {
      const html = '<footer><a href="/team">Our Team</a></footer>';
      mockScraperService.fetchUrl.mockResolvedValue({
        url: 'https://example.com',
        content: html,
        title: null,
        metaDescription: null,
        success: true,
        statusCode: 200,
        processingTimeMs: 100,
      });

      const result = await service.filterUrl('https://example.com');
      expect(result.signals.company_pages.has_team).toBe(true);
    });

    it('should detect Contact page via href attribute', async () => {
      const html = '<a href="/contact">Contact Us</a>';
      mockScraperService.fetchUrl.mockResolvedValue({
        url: 'https://example.com',
        content: html,
        title: null,
        metaDescription: null,
        success: true,
        statusCode: 200,
        processingTimeMs: 100,
      });

      const result = await service.filterUrl('https://example.com');
      expect(result.signals.company_pages.has_contact).toBe(true);
    });
  });

  describe('Blog Freshness Detection', () => {
    it('should detect blog section via navigation', async () => {
      const html = '<nav><a href="/blog">Blog</a></nav>';
      mockScraperService.fetchUrl.mockResolvedValue({
        url: 'https://example.com',
        content: html,
        title: null,
        metaDescription: null,
        success: true,
        statusCode: 200,
        processingTimeMs: 100,
      });

      const result = await service.filterUrl('https://example.com');
      expect(result.signals.blog_data.has_blog).toBe(true);
    });

    it('should parse blog post dates from <time> tag', async () => {
      const html = `
        <nav><a href="/blog">Blog</a></nav>
        <time datetime="2025-10-15">October 15, 2025</time>
      `;
      mockScraperService.fetchUrl.mockResolvedValue({
        url: 'https://example.com',
        content: html,
        title: null,
        metaDescription: null,
        success: true,
        statusCode: 200,
        processingTimeMs: 100,
      });

      const result = await service.filterUrl('https://example.com');
      expect(result.signals.blog_data.last_post_date).toBeTruthy();
      expect(result.signals.blog_data.days_since_last_post).toBeLessThan(10);
    });

    it('should detect no blog section and fail freshness', async () => {
      const html = '<div>Company information only</div>';
      mockScraperService.fetchUrl.mockResolvedValue({
        url: 'https://example.com',
        content: html,
        title: null,
        metaDescription: null,
        success: true,
        statusCode: 200,
        processingTimeMs: 100,
      });

      const result = await service.filterUrl('https://example.com');
      expect(result.signals.blog_data.has_blog).toBe(false);
      expect(result.signals.blog_data.passes_freshness).toBe(false);
    });
  });

  describe('Tech Stack Detection', () => {
    it('should detect Google Analytics', async () => {
      const html = '<script src="https://www.googletagmanager.com/gtag/js"></script>';
      mockScraperService.fetchUrl.mockResolvedValue({
        url: 'https://example.com',
        content: html,
        title: null,
        metaDescription: null,
        success: true,
        statusCode: 200,
        processingTimeMs: 100,
      });

      const result = await service.filterUrl('https://example.com');
      expect(result.signals.tech_stack.tools_detected).toContain('Google Analytics');
    });

    it('should detect HubSpot', async () => {
      const html = '<script src="https://js.hs-scripts.com/12345.js"></script>';
      mockScraperService.fetchUrl.mockResolvedValue({
        url: 'https://example.com',
        content: html,
        title: null,
        metaDescription: null,
        success: true,
        statusCode: 200,
        processingTimeMs: 100,
      });

      const result = await service.filterUrl('https://example.com');
      expect(result.signals.tech_stack.tools_detected).toContain('HubSpot');
    });

    it('should detect Mixpanel', async () => {
      const html = '<script>mixpanel.init("abc123");</script>';
      mockScraperService.fetchUrl.mockResolvedValue({
        url: 'https://example.com',
        content: html,
        title: null,
        metaDescription: null,
        success: true,
        statusCode: 200,
        processingTimeMs: 100,
      });

      const result = await service.filterUrl('https://example.com');
      expect(result.signals.tech_stack.tools_detected).toContain('Mixpanel');
    });

    it('should detect multiple tools', async () => {
      const html = `
        <script src="https://www.googletagmanager.com/gtag/js"></script>
        <script src="https://js.hs-scripts.com/12345.js"></script>
        <script src="https://cdn.segment.com/analytics.js/v1/abc123/analytics.min.js"></script>
      `;
      mockScraperService.fetchUrl.mockResolvedValue({
        url: 'https://example.com',
        content: html,
        title: null,
        metaDescription: null,
        success: true,
        statusCode: 200,
        processingTimeMs: 100,
      });

      const result = await service.filterUrl('https://example.com');
      expect(result.signals.tech_stack.count).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Design Quality Assessment', () => {
    it('should detect modern CSS framework', async () => {
      const html = '<link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">';
      mockScraperService.fetchUrl.mockResolvedValue({
        url: 'https://example.com',
        content: html,
        title: null,
        metaDescription: null,
        success: true,
        statusCode: 200,
        processingTimeMs: 100,
      });

      const result = await service.filterUrl('https://example.com');
      expect(result.signals.design_quality.has_modern_framework).toBe(true);
    });

    it('should detect responsive design', async () => {
      const html = '<meta name="viewport" content="width=device-width, initial-scale=1">';
      mockScraperService.fetchUrl.mockResolvedValue({
        url: 'https://example.com',
        content: html,
        title: null,
        metaDescription: null,
        success: true,
        statusCode: 200,
        processingTimeMs: 100,
      });

      const result = await service.filterUrl('https://example.com');
      expect(result.signals.design_quality.is_responsive).toBe(true);
    });

    it('should detect professional imagery via CDN', async () => {
      const html = '<img src="https://cdn.example.com/hero.jpg">';
      mockScraperService.fetchUrl.mockResolvedValue({
        url: 'https://example.com',
        content: html,
        title: null,
        metaDescription: null,
        success: true,
        statusCode: 200,
        processingTimeMs: 100,
      });

      const result = await service.filterUrl('https://example.com');
      expect(result.signals.design_quality.has_professional_imagery).toBe(true);
    });

    it('should score higher with modern features', async () => {
      const html = `
        <meta name="viewport" content="width=device-width">
        <link href="https://cdn.jsdelivr.net/npm/tailwindcss" rel="stylesheet">
        <img src="https://cdn.example.com/hero.jpg" loading="lazy" srcset="hero-2x.jpg 2x">
      `;
      mockScraperService.fetchUrl.mockResolvedValue({
        url: 'https://example.com',
        content: html,
        title: null,
        metaDescription: null,
        success: true,
        statusCode: 200,
        processingTimeMs: 100,
      });

      const result = await service.filterUrl('https://example.com');
      expect(result.signals.design_quality.score).toBeGreaterThanOrEqual(8);
    });
  });

  describe('Configuration Integration', () => {
    it('should use custom Layer 2 rules from settings', async () => {
      mockSettingsService.getSettings.mockResolvedValue({
        id: 'custom',
        layer2_rules: {
          blog_freshness_days: 180,
          required_pages_count: 3,
          min_tech_stack_tools: 3,
          min_design_quality_score: 8,
        },
      } as any);

      const mockHtml = '<div>Test</div>';
      mockScraperService.fetchUrl.mockResolvedValue({
        url: 'https://example.com',
        content: mockHtml,
        success: true,
        statusCode: 200,
        processingTimeMs: 100,
      } as any);

      const result = await service.filterUrl('https://example.com');

      // With stricter rules (3 pages, 3 tools, score 8), this should fail
      expect(result.passed).toBe(false);
    });

    it('should fall back to defaults if settings unavailable', async () => {
      mockSettingsService.getSettings.mockRejectedValue(new Error('DB unavailable'));

      const mockHtml = '<div>Test</div>';
      mockScraperService.fetchUrl.mockResolvedValue({
        url: 'https://example.com',
        content: mockHtml,
        success: true,
        statusCode: 200,
        processingTimeMs: 100,
      } as any);

      const result = await service.filterUrl('https://example.com');

      // Should not throw, should use defaults
      expect(result).toBeDefined();
      expect(result.reasoning).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should complete filtering within reasonable time', async () => {
      const mockHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width">
            <script src="https://www.googletagmanager.com/gtag/js"></script>
            <script src="https://js.hs-scripts.com/12345.js"></script>
          </head>
          <body>
            <nav>
              <a href="/about">About Us</a>
              <a href="/team">Our Team</a>
              <a href="/contact">Contact</a>
              <a href="/blog">Blog</a>
            </nav>
            <time datetime="2025-10-01">Recent Post</time>
            <img src="https://cdn.example.com/image.jpg">
          </body>
        </html>
      `;

      mockScraperService.fetchUrl.mockResolvedValue({
        url: 'https://example.com',
        content: mockHtml,
        success: true,
        statusCode: 200,
        processingTimeMs: 2000,
      } as any);

      const startTime = Date.now();
      const result = await service.filterUrl('https://example.com');
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(5000); // Should complete in under 5 seconds
      expect(result.processingTimeMs).toBeDefined();
    });
  });

  describe('Backward Compatibility', () => {
    it('should support deprecated validateOperational method', async () => {
      const mockHtml = `
        <nav>
          <a href="/about">About Us</a>
          <a href="/team">Team</a>
          <a href="/contact">Contact</a>
        </nav>
      `;

      mockScraperService.fetchUrl.mockResolvedValue({
        url: 'https://example.com',
        content: mockHtml,
        success: true,
        statusCode: 200,
        processingTimeMs: 100,
      } as any);

      const result = await service.validateOperational('https://example.com', null);

      expect(result).toBeDefined();
      expect(result.passed).toBeDefined();
      expect(result.signals).toBeDefined();
      expect(result.signals.companyPageFound).toBeDefined();
    });
  });
});
