import { Test, TestingModule } from '@nestjs/testing';
import { Layer2OperationalFilterService } from '../layer2-operational-filter.service';
import { ScraperService } from '../../../scraper/scraper.service';
import { SettingsService } from '../../../settings/settings.service';
import type { Layer2Rules } from '@website-scraper/shared';

describe('Layer2 Integration - Publication Detection', () => {
  let service: Layer2OperationalFilterService;
  let scraperService: ScraperService;
  let settingsService: SettingsService;

  const mockRules: Layer2Rules = {
    publication_score_threshold: 0.65,
    product_keywords: {
      commercial: ['pricing', 'buy'],
      features: ['features'],
      cta: ['get started'],
    },
    business_nav_keywords: ['product', 'pricing'],
    content_nav_keywords: ['articles', 'blog'],
    min_business_nav_percentage: 0.3,
    ad_network_patterns: ['googlesyndication'],
    affiliate_patterns: ['amazon'],
    payment_provider_patterns: ['stripe'],
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

  it('should reject pure publication sites', async () => {
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
            <h3>Article Title</h3>
          </article>
        </body>
      </html>
    `;

    jest.spyOn(scraperService, 'fetchUrl').mockResolvedValue({
      success: true,
      content: publicationHtml,
      url: 'https://example.com',
      title: 'Example Publication',
      metaDescription: 'A publication site',
    });

    const result = await service.filterUrl('https://example.com');

    expect(result.passed).toBe(false);
    expect(result.signals.publication_score).toBeGreaterThanOrEqual(0.65);
    expect(result.reasoning).toContain('REJECT');
    expect(result.reasoning).toContain('publication');
  });

  it('should pass company sites with blogs', async () => {
    const companyHtml = `
      <html>
        <head>
          <script src="https://js.stripe.com/v3/"></script>
        </head>
        <body>
          <nav>
            <a href="/product">Product</a>
            <a href="/pricing">Pricing</a>
            <a href="/about">About</a>
            <a href="/blog">Blog</a>
          </nav>
          <section class="hero">
            <h1>Transform Your Business</h1>
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
      title: 'Company Name',
      metaDescription: 'A SaaS company',
    });

    const result = await service.filterUrl('https://company.com');

    expect(result.passed).toBe(true);
    expect(result.signals.publication_score).toBeLessThan(0.65);
    expect(result.reasoning).toContain('PASS');
  });

  it('should return detailed signals in result', async () => {
    const html = '<html><body>Test</body></html>';

    jest.spyOn(scraperService, 'fetchUrl').mockResolvedValue({
      success: true,
      content: html,
      url: 'https://test.com',
      title: 'Test',
      metaDescription: null,
    });

    const result = await service.filterUrl('https://test.com');

    expect(result.signals).toHaveProperty('publication_score');
    expect(result.signals).toHaveProperty('has_product_offering');
    expect(result.signals).toHaveProperty('homepage_is_blog');
    expect(result.signals).toHaveProperty('has_business_nav');
    expect(result.signals).toHaveProperty('monetization_type');
    expect(result.signals).toHaveProperty('module_scores');
  });
});
