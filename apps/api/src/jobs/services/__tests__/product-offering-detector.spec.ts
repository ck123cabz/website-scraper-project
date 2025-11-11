import { Test, TestingModule } from '@nestjs/testing';
import { Layer2OperationalFilterService } from '../layer2-operational-filter.service';
import { ScraperService } from '../../../scraper/scraper.service';
import { SettingsService } from '../../../settings/settings.service';
import * as cheerio from 'cheerio';
import type { Layer2Rules } from '@website-scraper/shared';

describe('Product Offering Detector', () => {
  let service: Layer2OperationalFilterService;

  const mockRules: Layer2Rules = {
    publication_score_threshold: 0.65,
    product_keywords: {
      commercial: ['pricing', 'buy', 'demo', 'plans'],
      features: ['features', 'capabilities', 'solutions'],
      cta: ['get started', 'sign up', 'free trial'],
    },
    business_nav_keywords: [],
    content_nav_keywords: [],
    min_business_nav_percentage: 0.3,
    ad_network_patterns: [],
    affiliate_patterns: [],
    payment_provider_patterns: ['stripe', 'paypal'],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Layer2OperationalFilterService,
        {
          provide: ScraperService,
          useValue: { fetchUrl: jest.fn() },
        },
        {
          provide: SettingsService,
          useValue: { getSettings: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<Layer2OperationalFilterService>(Layer2OperationalFilterService);
  });

  it('should detect SaaS pricing pages', () => {
    const html = `
      <html>
        <body>
          <h1>Pricing</h1>
          <p>$99/month</p>
          <button>Get Started</button>
        </body>
      </html>
    `;
    const $ = cheerio.load(html);

    // Access private method via bracket notation for testing
    const result = service['detectProductOffering']($, html, mockRules);

    expect(result.has_product_offering).toBe(true);
    expect(result.product_confidence).toBeGreaterThan(0.7);
    expect(result.detected_product_keywords).toContain('pricing');
  });

  it('should reject pure blog homepages', () => {
    const html = `
      <html>
        <body>
          <h2>Latest Articles</h2>
          <article>
            <h3>Blog Post Title</h3>
            <p>Article content here...</p>
          </article>
        </body>
      </html>
    `;
    const $ = cheerio.load(html);

    const result = service['detectProductOffering']($, html, mockRules);

    expect(result.has_product_offering).toBe(false);
    expect(result.product_confidence).toBeLessThan(0.3);
  });

  it('should detect payment provider scripts', () => {
    const html = `
      <html>
        <head>
          <script src="https://js.stripe.com/v3/"></script>
        </head>
        <body>
          <div>Our platform helps you...</div>
        </body>
      </html>
    `;
    const $ = cheerio.load(html);

    const result = service['detectProductOffering']($, html, mockRules);

    expect(result.has_product_offering).toBe(true);
    expect(result.product_confidence).toBeGreaterThan(0.5);
  });
});
