import { Test, TestingModule } from '@nestjs/testing';
import { Layer2OperationalFilterService } from '../layer2-operational-filter.service';
import { ScraperService } from '../../../scraper/scraper.service';
import { SettingsService } from '../../../settings/settings.service';
import * as cheerio from 'cheerio';
import type { Layer2Rules } from '@website-scraper/shared';

describe('Monetization Detector', () => {
  let service: Layer2OperationalFilterService;

  const mockRules: Layer2Rules = {
    publication_score_threshold: 0.65,
    product_keywords: { commercial: [], features: [], cta: [] },
    business_nav_keywords: [],
    content_nav_keywords: [],
    min_business_nav_percentage: 0.3,
    ad_network_patterns: ['googlesyndication', 'adsense', 'doubleclick'],
    affiliate_patterns: ['amazon', 'affiliate', 'aff=', 'ref='],
    payment_provider_patterns: ['stripe', 'paypal', 'braintree'],
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

  it('should detect ad networks', () => {
    const html = `
      <html>
        <head>
          <script src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>
        </head>
        <body>
          <div class="ad-container">Ad here</div>
        </body>
      </html>
    `;
    const $ = cheerio.load(html);

    const result = service['detectMonetization']($, html, mockRules);

    expect(result.monetization_type).toBe('ads');
    expect(result.ad_networks_detected).toContain('googlesyndication');
  });

  it('should detect affiliate patterns', () => {
    const html = `
      <html>
        <body>
          <a href="https://amazon.com/product?tag=myaffiliate-20">Buy Now</a>
          <p>As an Amazon Associate, I earn from qualifying purchases.</p>
        </body>
      </html>
    `;
    const $ = cheerio.load(html);

    const result = service['detectMonetization']($, html, mockRules);

    expect(result.monetization_type).toBe('affiliates');
    expect(result.affiliate_patterns_detected).toContain('amazon');
  });

  it('should detect payment providers', () => {
    const html = `
      <html>
        <head>
          <script src="https://js.stripe.com/v3/"></script>
        </head>
        <body>
          <form id="payment-form"></form>
        </body>
      </html>
    `;
    const $ = cheerio.load(html);

    const result = service['detectMonetization']($, html, mockRules);

    expect(result.monetization_type).toBe('business');
  });

  it('should detect mixed monetization', () => {
    const html = `
      <html>
        <head>
          <script src="https://js.stripe.com/v3/"></script>
          <script src="https://googlesyndication.com/adsbygoogle.js"></script>
        </head>
        <body>Content</body>
      </html>
    `;
    const $ = cheerio.load(html);

    const result = service['detectMonetization']($, html, mockRules);

    expect(result.monetization_type).toBe('mixed');
  });
});
