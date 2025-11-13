import { Test, TestingModule } from '@nestjs/testing';
import { Layer2OperationalFilterService } from '../layer2-operational-filter.service';
import { ScraperService } from '../../../scraper/scraper.service';
import { SettingsService } from '../../../settings/settings.service';
import * as cheerio from 'cheerio';
import type { Layer2Rules } from '@website-scraper/shared';

describe('Navigation Parser', () => {
  let service: Layer2OperationalFilterService;

  const mockRules: Layer2Rules = {
    publication_score_threshold: 0.65,
    product_keywords: { commercial: [], features: [], cta: [] },
    business_nav_keywords: ['product', 'pricing', 'solutions', 'about', 'careers'],
    content_nav_keywords: ['articles', 'blog', 'news', 'topics', 'categories'],
    min_business_nav_percentage: 0.3,
    ad_network_patterns: [],
    affiliate_patterns: [],
    payment_provider_patterns: [],
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

  it('should detect content-only navigation', () => {
    const html = `
      <html>
        <body>
          <nav>
            <a href="/articles">Articles</a>
            <a href="/topics">Topics</a>
            <a href="/authors">Authors</a>
            <a href="/about">About</a>
          </nav>
        </body>
      </html>
    `;
    const $ = cheerio.load(html);

    const result = service['parseNavigation']($, html, mockRules);

    expect(result.has_business_nav).toBe(false);
    expect(result.business_nav_percentage).toBeLessThan(0.3);
    expect(result.nav_items_classified.content.length).toBeGreaterThanOrEqual(2);
  });

  it('should detect business navigation', () => {
    const html = `
      <html>
        <body>
          <nav>
            <a href="/product">Product</a>
            <a href="/pricing">Pricing</a>
            <a href="/solutions">Solutions</a>
            <a href="/about">About</a>
            <a href="/blog">Blog</a>
          </nav>
        </body>
      </html>
    `;
    const $ = cheerio.load(html);

    const result = service['parseNavigation']($, html, mockRules);

    expect(result.has_business_nav).toBe(true);
    expect(result.business_nav_percentage).toBeGreaterThan(0.5);
    expect(result.nav_items_classified.business.length).toBeGreaterThanOrEqual(3);
  });

  it('should handle empty navigation', () => {
    const html = `
      <html>
        <body>
          <div>No nav here</div>
        </body>
      </html>
    `;
    const $ = cheerio.load(html);

    const result = service['parseNavigation']($, html, mockRules);

    expect(result.business_nav_percentage).toBe(0);
    expect(result.has_business_nav).toBe(false);
  });
});
