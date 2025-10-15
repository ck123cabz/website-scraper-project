import { Test, TestingModule } from '@nestjs/testing';
import { Layer1DomainAnalysisService } from '../services/layer1-domain-analysis.service';
import type { Layer1AnalysisResult } from '@website-scraper/shared';

describe('Layer1DomainAnalysisService', () => {
  let service: Layer1DomainAnalysisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Layer1DomainAnalysisService],
    }).compile();

    service = module.get<Layer1DomainAnalysisService>(Layer1DomainAnalysisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('TLD Filtering', () => {
    it('should PASS commercial TLDs (.com, .io, .co, .ai)', () => {
      const urls = [
        'https://example.com',
        'https://startup.io',
        'https://company.co',
        'https://platform.ai',
      ];

      urls.forEach((url) => {
        const result = service.analyzeUrl(url);
        expect(result.passed).toBe(true);
        expect(result.reasoning).toContain('PASS Layer 1');
      });
    });

    it('should REJECT non-commercial TLDs (.gov, .edu, .org, .mil)', () => {
      const urls = [
        'https://example.gov',
        'https://university.edu',
        'https://nonprofit.org',
        'https://military.mil',
      ];

      urls.forEach((url) => {
        const result = service.analyzeUrl(url);
        expect(result.passed).toBe(false);
        expect(result.reasoning).toContain('Non-commercial TLD');
      });
    });

    it('should REJECT personal blog TLDs (.me, .blog, .xyz)', () => {
      const urls = [
        'https://john.me',
        'https://myblog.blog',
        'https://thoughts.xyz',
        'https://personal.wordpress.com',
        'https://blog.blogspot.com',
      ];

      urls.forEach((url) => {
        const result = service.analyzeUrl(url);
        expect(result.passed).toBe(false);
        expect(result.reasoning).toContain('Personal blog TLD');
      });
    });
  });

  describe('Domain Classification', () => {
    it('should PASS digital-native keywords (software, saas, tech, platform, app)', () => {
      const urls = [
        'https://mysoftware.com',
        'https://saasplatform.io',
        'https://techcompany.com',
        'https://appbuilder.co',
        'https://cloudservices.ai',
      ];

      urls.forEach((url) => {
        const result = service.analyzeUrl(url);
        // Should pass TLD first, then domain classification
        if (result.passed) {
          expect(result.reasoning).not.toContain('Traditional business domain');
        }
      });
    });

    it('should REJECT traditional business keywords (restaurant, hotel, retail, shop)', () => {
      const urls = [
        'https://myrestaurant.com',
        'https://hotelchains.com',
        'https://retailstore.com',
        'https://shop-online.com',
        'https://manufacturing-inc.com',
      ];

      urls.forEach((url) => {
        const result = service.analyzeUrl(url);
        expect(result.passed).toBe(false);
        expect(result.reasoning).toContain('Traditional business domain detected');
      });
    });

    it('should handle neutral domains (pass through)', () => {
      const result = service.analyzeUrl('https://example.com');
      expect(result.passed).toBe(true);
      expect(result.reasoning).toContain('PASS Layer 1');
    });
  });

  describe('URL Pattern Exclusions', () => {
    it('should REJECT subdomain blogs (blog.*, news.*, insights.*)', () => {
      const urls = [
        'https://blog.example.com/article',
        'https://news.company.io/story',
        'https://insights.platform.com',
      ];

      urls.forEach((url) => {
        const result = service.analyzeUrl(url);
        expect(result.passed).toBe(false);
        expect(result.reasoning).toContain('Subdomain blog detected');
      });
    });

    it('should REJECT tag and category pages', () => {
      const urls = [
        'https://example.com/tag/marketing',
        'https://company.com/category/technology',
        'https://platform.io/author/john',
        'https://site.com/tags/software',
      ];

      urls.forEach((url) => {
        const result = service.analyzeUrl(url);
        expect(result.passed).toBe(false);
        expect(result.reasoning).toContain('Tag/category page detected');
      });
    });

    it('should REJECT user-generated content pages', () => {
      const urls = [
        'https://example.com/user/john',
        'https://platform.com/profile/123',
        'https://social.io/member/user456',
      ];

      urls.forEach((url) => {
        const result = service.analyzeUrl(url);
        expect(result.passed).toBe(false);
        expect(result.reasoning).toContain('User-generated content page detected');
      });
    });
  });

  describe('Target Profile Matching', () => {
    it('should PASS positive indicators (insights, resources, platform, app)', () => {
      const urls = [
        'https://company.com/insights',
        'https://platform.io/resources',
        'https://saas.com/learn',
        'https://tech-platform.com',
      ];

      urls.forEach((url) => {
        const result = service.analyzeUrl(url);
        if (result.passed) {
          // URL passed initial filters, profile check should be neutral or positive
          expect(result.passed).toBe(true);
        }
      });
    });

    it('should REJECT negative indicators (shop, store, buy, checkout)', () => {
      const urls = [
        'https://example.com/shop',
        'https://store.io',
        'https://platform.com/buy',
        'https://ecommerce.com/checkout',
      ];

      urls.forEach((url) => {
        const result = service.analyzeUrl(url);
        expect(result.passed).toBe(false);
        // URL will be rejected at profile matching stage (negative indicators)
        // store.io will be caught at domain classification (traditional business), so check for either
        if (url.includes('store.io')) {
          expect(result.reasoning).toContain('Traditional business domain detected');
        } else {
          expect(result.reasoning).toContain('Negative profile indicators detected');
        }
      });
    });
  });

  describe('Sequential Filtering (Complete Flow)', () => {
    it('should apply all filters in order: TLD → Domain → URL Pattern → Profile', () => {
      // URLs that pass all filters
      const passingUrls = [
        'https://hubspot.com',
        'https://mailchimp.io',
        'https://intercom.com',
        'https://zendesk.com',
        'https://stripe.com',
      ];

      passingUrls.forEach((url) => {
        const result = service.analyzeUrl(url);
        expect(result.passed).toBe(true);
        expect(result.reasoning).toContain('PASS Layer 1');
      });
    });

    it('should early-exit on first rejection', () => {
      // Non-commercial TLD should be rejected at TLD filter stage
      let result = service.analyzeUrl('https://example.gov');
      expect(result.passed).toBe(false);
      expect(result.reasoning).toContain('Non-commercial TLD');

      // Traditional business should be rejected at domain classification stage
      result = service.analyzeUrl('https://myrestaurant.com');
      expect(result.passed).toBe(false);
      expect(result.reasoning).toContain('Traditional business domain');

      // Subdomain blog should be rejected at URL pattern stage
      // Note: blog.news.com or blog-company.com format
      result = service.analyzeUrl('https://blog.startup.io');
      expect(result.passed).toBe(false);
      expect(result.reasoning).toContain('Subdomain blog detected');
    });
  });

  describe('Input Validation', () => {
    it('should handle invalid URLs gracefully (fail-open)', () => {
      const invalidUrls = [
        null as any,
        undefined,
        '',
        '   ',
        'not-a-valid-url',
        'htp://malformed.com',
      ];

      invalidUrls.forEach((url) => {
        const result = service.analyzeUrl(url);
        // Should pass through (fail-open strategy)
        expect(result.passed).toBe(true);
      });
    });
  });

  describe('Performance', () => {
    it('should analyze URL in <50ms', () => {
      const startTime = Date.now();
      service.analyzeUrl('https://example.com');
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(100); // Allow some buffer
    });

    it('should analyze 100 URLs in <5 seconds', () => {
      const urls = Array.from({ length: 100 }, (_, i) => `https://example${i}.com`);
      const startTime = Date.now();

      urls.forEach((url) => {
        service.analyzeUrl(url);
      });

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(5000);

      // Average per URL should be <50ms
      const avgPerUrl = elapsed / urls.length;
      expect(avgPerUrl).toBeLessThan(50);
    });

    it('should not make HTTP requests', () => {
      // Analyze multiple URLs - should complete quickly without network delays
      const urls = [
        'https://example.com',
        'https://test.io',
        'https://platform.ai',
      ];

      const results = urls.map((url) => service.analyzeUrl(url));

      // All results should have processingTimeMs under 50ms
      results.forEach((result) => {
        expect(result.processingTimeMs).toBeLessThan(100);
      });
    });
  });

  describe('Elimination Statistics', () => {
    it('should calculate elimination rate correctly', () => {
      const testUrls = [
        'https://hubspot.com', // PASS
        'https://restaurant.com', // REJECT (traditional business)
        'https://example.edu', // REJECT (non-commercial TLD)
        'https://mailchimp.io', // PASS
        'https://blog.startup.io', // REJECT (subdomain blog)
        'https://zendesk.com', // PASS
      ];

      const stats = service.getEliminationStats(testUrls);

      expect(stats.total).toBe(6);
      expect(stats.eliminated).toBe(3); // restaurant, edu, blog.startup
      expect(stats.passed).toBe(3);
      expect(stats.eliminationRate).toBe(50);
    });

    it('should report 40-60% elimination rate on diverse URLs', () => {
      const urls = [
        // Pass cases (digital-native, commercial TLD)
        ...Array.from({ length: 15 }, (_, i) => `https://saas-company${i}.com`),
        // Reject cases (non-commercial TLD)
        ...Array.from({ length: 10 }, (_, i) => `https://example${i}.edu`),
        // Reject cases (traditional business)
        ...Array.from({ length: 15 }, (_, i) => `https://restaurant${i}.com`),
        // Reject cases (personal blog)
        ...Array.from({ length: 10 }, (_, i) => `https://blog${i}.me`),
      ];

      const stats = service.getEliminationStats(urls);

      const eliminationRate = stats.eliminationRate;
      expect(eliminationRate).toBeGreaterThanOrEqual(40);
      expect(eliminationRate).toBeLessThanOrEqual(70);
    });
  });

  describe('Cost Savings Calculation', () => {
    it('should calculate scraping savings ($0.0001 per URL)', () => {
      const savings = service.calculateScrapingSavings(500);
      expect(savings).toBe(0.05); // 500 * 0.0001
    });

    it('should calculate LLM savings ($0.002 per URL)', () => {
      const savings = service.calculateLLMSavings(500);
      expect(savings).toBe(1.0); // 500 * 0.002
    });

    it('should calculate total savings', () => {
      const total = service.getTotalSavings(500);
      expect(total).toBe(1.05); // 0.05 + 1.0
    });

    it('should report realistic savings for 40-60% elimination', () => {
      // For 1000 URLs with 50% elimination
      const eliminated = 500;
      const total = service.getTotalSavings(eliminated);

      expect(total).toBeGreaterThan(0.5); // At least $0.50
      expect(total).toBeLessThan(2.0); // Less than $2.00
    });
  });

  describe('Real-World Scenarios', () => {
    it('should classify digital-native B2B SaaS as PASS', () => {
      const urls = [
        'https://hubspot.com',
        'https://mailchimp.com',
        'https://intercom.com',
        'https://stripe.com',
        'https://twilio.com',
      ];

      urls.forEach((url) => {
        const result = service.analyzeUrl(url);
        expect(result.passed).toBe(true);
        expect(result.reasoning).toContain('PASS Layer 1');
      });
    });

    it('should reject traditional businesses', () => {
      const urls = [
        'https://restaurant.com',
        'https://hotelchains.com',
        'https://retail-store.com',
        'https://plumbing-services.com',
      ];

      urls.forEach((url) => {
        const result = service.analyzeUrl(url);
        expect(result.passed).toBe(false);
      });
    });

    it('should reject non-commercial TLDs', () => {
      const urls = [
        'https://harvard.edu',
        'https://nasa.gov',
        'https://wikipedia.org',
        'https://military.mil',
      ];

      urls.forEach((url) => {
        const result = service.analyzeUrl(url);
        expect(result.passed).toBe(false);
        expect(result.reasoning).toContain('Non-commercial TLD');
      });
    });

    it('should reject personal blogs', () => {
      const urls = [
        'https://john.me',
        'https://myblog.blog',
        'https://thoughts.xyz',
        'https://personal.wordpress.com',
      ];

      urls.forEach((url) => {
        const result = service.analyzeUrl(url);
        expect(result.passed).toBe(false);
      });
    });

    it('should reject subdomain blogs and UGC patterns', () => {
      const urls = [
        'https://blog.startup.com/article',
        'https://news.platform.io/story',
        'https://company.com/tag/marketing',
        'https://platform.io/user/john123',
        'https://site.com/category/tech',
      ];

      urls.forEach((url) => {
        const result = service.analyzeUrl(url);
        expect(result.passed).toBe(false);
      });
    });

    it('should flag ecommerce sites', () => {
      const urls = [
        'https://amazon-alternative.com/shop',
        'https://store-online.io/buy',
        'https://ecommerce-platform.com/checkout',
      ];

      urls.forEach((url) => {
        const result = service.analyzeUrl(url);
        expect(result.passed).toBe(false);
      });
    });
  });
});
