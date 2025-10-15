import { Test, TestingModule } from '@nestjs/testing';
import { PreFilterService } from '../services/prefilter.service';

describe('PreFilterService', () => {
  let service: PreFilterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PreFilterService],
    }).compile();

    service = module.get<PreFilterService>(PreFilterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Service Initialization', () => {
    it('should load filter rules on initialization', () => {
      const ruleCount = service.getRuleCount();
      expect(ruleCount).toBeGreaterThan(0);
      expect(ruleCount).toBe(16); // We defined 16 rules in default-filter-rules.json
    });

    it('should compile regex patterns at initialization', () => {
      const rules = service.getRules();
      expect(rules).toBeInstanceOf(Array);
      expect(rules.length).toBeGreaterThan(0);
      expect(rules[0]).toHaveProperty('category');
      expect(rules[0]).toHaveProperty('pattern');
      expect(rules[0]).toHaveProperty('reasoning');
    });
  });

  describe('Blog Platform Filtering', () => {
    it('should reject WordPress.com URLs', () => {
      const result = service.filterUrl('https://myblog.wordpress.com/2024/01/post');
      expect(result.passed).toBe(false);
      expect(result.reasoning).toContain('REJECT');
      expect(result.reasoning).toContain('WordPress');
      expect(result.matched_rule).toBe('blog_platform');
    });

    it('should reject Blogspot URLs', () => {
      const result = service.filterUrl('https://myblog.blogspot.com/2024/01/post.html');
      expect(result.passed).toBe(false);
      expect(result.reasoning).toContain('REJECT');
      expect(result.reasoning).toContain('Blogspot');
      expect(result.matched_rule).toBe('blog_platform');
    });

    it('should reject Medium personal blog URLs', () => {
      const result = service.filterUrl('https://medium.com/@author/my-article');
      expect(result.passed).toBe(false);
      expect(result.reasoning).toContain('REJECT');
      expect(result.reasoning).toContain('Medium');
      expect(result.matched_rule).toBe('blog_platform');
    });

    it('should reject Substack URLs', () => {
      const result = service.filterUrl('https://newsletter.substack.com/p/article');
      expect(result.passed).toBe(false);
      expect(result.reasoning).toContain('REJECT');
      expect(result.reasoning).toContain('Substack');
      expect(result.matched_rule).toBe('blog_platform');
    });
  });

  describe('Social Media Filtering', () => {
    it('should reject Facebook URLs', () => {
      const result = service.filterUrl('https://www.facebook.com/profile/123456');
      expect(result.passed).toBe(false);
      expect(result.reasoning).toContain('REJECT');
      expect(result.reasoning).toContain('Facebook');
      expect(result.matched_rule).toBe('social_media');
    });

    it('should reject Twitter URLs', () => {
      const result = service.filterUrl('https://twitter.com/username/status/123');
      expect(result.passed).toBe(false);
      expect(result.reasoning).toContain('REJECT');
      expect(result.reasoning).toContain('Twitter');
      expect(result.matched_rule).toBe('social_media');
    });

    it('should reject X.com URLs', () => {
      const result = service.filterUrl('https://x.com/username');
      expect(result.passed).toBe(false);
      expect(result.reasoning).toContain('REJECT');
      expect(result.matched_rule).toBe('social_media');
    });

    it('should reject LinkedIn profile URLs', () => {
      const result = service.filterUrl('https://www.linkedin.com/in/john-doe');
      expect(result.passed).toBe(false);
      expect(result.reasoning).toContain('REJECT');
      expect(result.reasoning).toContain('LinkedIn');
      expect(result.matched_rule).toBe('social_media');
    });

    it('should reject Instagram URLs', () => {
      const result = service.filterUrl('https://www.instagram.com/username');
      expect(result.passed).toBe(false);
      expect(result.reasoning).toContain('REJECT');
      expect(result.reasoning).toContain('Instagram');
      expect(result.matched_rule).toBe('social_media');
    });
  });

  describe('E-commerce Filtering', () => {
    it('should reject Amazon product URLs', () => {
      const result = service.filterUrl('https://www.amazon.com/product/dp/B0123456');
      expect(result.passed).toBe(false);
      expect(result.reasoning).toContain('REJECT');
      expect(result.reasoning).toContain('Amazon');
      expect(result.matched_rule).toBe('ecommerce');
    });

    it('should reject eBay URLs', () => {
      const result = service.filterUrl('https://www.ebay.com/itm/123456789');
      expect(result.passed).toBe(false);
      expect(result.reasoning).toContain('REJECT');
      expect(result.reasoning).toContain('eBay');
      expect(result.matched_rule).toBe('ecommerce');
    });

    it('should reject Shopify store URLs', () => {
      const result = service.filterUrl('https://mystore.shopify.com/products/item');
      expect(result.passed).toBe(false);
      expect(result.reasoning).toContain('REJECT');
      expect(result.reasoning).toContain('Shopify');
      expect(result.matched_rule).toBe('ecommerce');
    });
  });

  describe('Forum Filtering', () => {
    it('should reject Reddit URLs', () => {
      const result = service.filterUrl('https://www.reddit.com/r/programming/comments/123');
      expect(result.passed).toBe(false);
      expect(result.reasoning).toContain('REJECT');
      expect(result.reasoning).toContain('Reddit');
      expect(result.matched_rule).toBe('forum');
    });

    it('should reject Quora URLs', () => {
      const result = service.filterUrl(
        'https://www.quora.com/What-is-the-best-programming-language',
      );
      expect(result.passed).toBe(false);
      expect(result.reasoning).toContain('REJECT');
      expect(result.reasoning).toContain('Quora');
      expect(result.matched_rule).toBe('forum');
    });
  });

  describe('Aggregator Filtering', () => {
    it('should reject Wikipedia URLs', () => {
      const result = service.filterUrl('https://en.wikipedia.org/wiki/Programming');
      expect(result.passed).toBe(false);
      expect(result.reasoning).toContain('REJECT');
      expect(result.reasoning).toContain('Wikipedia');
      expect(result.matched_rule).toBe('aggregator');
    });

    it('should reject YouTube URLs', () => {
      const result = service.filterUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(result.passed).toBe(false);
      expect(result.reasoning).toContain('REJECT');
      expect(result.reasoning).toContain('YouTube');
      expect(result.matched_rule).toBe('aggregator');
    });
  });

  describe('URLs That Should Pass', () => {
    it('should pass company blog URLs', () => {
      const result = service.filterUrl('https://engineering.company.com/blog/new-feature');
      expect(result.passed).toBe(true);
      expect(result.reasoning).toBe('PASS - Sending to LLM');
      expect(result.matched_rule).toBeUndefined();
    });

    it('should pass news site URLs', () => {
      const result = service.filterUrl('https://www.nytimes.com/2024/01/article.html');
      expect(result.passed).toBe(true);
      expect(result.reasoning).toBe('PASS - Sending to LLM');
    });

    it('should pass personal website URLs', () => {
      const result = service.filterUrl('https://johndoe.dev/projects');
      expect(result.passed).toBe(true);
      expect(result.reasoning).toBe('PASS - Sending to LLM');
    });

    it('should pass documentation URLs', () => {
      const result = service.filterUrl('https://docs.example.com/api/reference');
      expect(result.passed).toBe(true);
      expect(result.reasoning).toBe('PASS - Sending to LLM');
    });

    it('should pass GitHub URLs', () => {
      const result = service.filterUrl('https://github.com/user/repo');
      expect(result.passed).toBe(true);
      expect(result.reasoning).toBe('PASS - Sending to LLM');
    });
  });

  describe('Edge Cases', () => {
    it('should handle URLs with query parameters', () => {
      const result = service.filterUrl('https://www.facebook.com/page?ref=123&utm_source=google');
      expect(result.passed).toBe(false);
      expect(result.matched_rule).toBe('social_media');
    });

    it('should handle URLs with trailing slashes', () => {
      const result = service.filterUrl('https://www.reddit.com/');
      expect(result.passed).toBe(false);
      expect(result.matched_rule).toBe('forum');
    });

    it('should handle URLs with mixed case (case-insensitive matching)', () => {
      const result = service.filterUrl('https://www.FACEBOOK.COM/profile');
      expect(result.passed).toBe(false);
      expect(result.matched_rule).toBe('social_media');
    });

    it('should handle URLs with subdomains', () => {
      const result = service.filterUrl('https://en.wikipedia.org/wiki/Article');
      expect(result.passed).toBe(false);
      expect(result.matched_rule).toBe('aggregator');
    });

    it('should handle URLs with ports', () => {
      const result = service.filterUrl('https://company.com:8080/blog/post');
      expect(result.passed).toBe(true);
    });

    it('should handle empty URL strings', () => {
      const result = service.filterUrl('');
      expect(result.passed).toBe(true); // Empty URL passes through
    });

    it('should handle malformed URLs gracefully', () => {
      const result = service.filterUrl('not-a-valid-url');
      expect(result.passed).toBe(true); // Fail-open: pass to LLM for handling
    });
  });

  describe('Performance Requirements', () => {
    it('should process a single URL in <100ms', () => {
      const startTime = Date.now();
      const result = service.filterUrl('https://www.example.com/page');
      const elapsedTime = Date.now() - startTime;

      expect(elapsedTime).toBeLessThan(100);
      expect(result).toBeDefined();
    });

    it('should process 100 URLs in <10 seconds (avg 100ms each)', () => {
      const testUrls = [
        'https://wordpress.com/blog/post-1',
        'https://company.com/about',
        'https://facebook.com/profile',
        'https://docs.example.com/api',
        'https://amazon.com/product/123',
        'https://engineering.startup.io/blog',
        'https://reddit.com/r/programming',
        'https://news.ycombinator.com/item?id=123',
        'https://twitter.com/user/status',
        'https://blog.company.com/article',
      ];

      // Generate 100 URLs by repeating the test set
      const urls: string[] = [];
      for (let i = 0; i < 10; i++) {
        urls.push(...testUrls);
      }

      const startTime = Date.now();
      const results = urls.map((url) => service.filterUrl(url));
      const elapsedTime = Date.now() - startTime;

      expect(results.length).toBe(100);
      expect(elapsedTime).toBeLessThan(10000); // 10 seconds
      expect(results.every((r) => r.passed !== undefined)).toBe(true);

      // Log average time for visibility
      const avgTime = elapsedTime / 100;
      console.log(`Average processing time: ${avgTime.toFixed(2)}ms per URL`);
      expect(avgTime).toBeLessThan(100);
    });
  });

  describe('Error Handling', () => {
    it('should handle null URLs gracefully', () => {
      const result = service.filterUrl(null as any);
      expect(result.passed).toBe(true); // Fail-open strategy
    });

    it('should handle undefined URLs gracefully', () => {
      const result = service.filterUrl(undefined as any);
      expect(result.passed).toBe(true); // Fail-open strategy
    });
  });

  describe('Rule Management', () => {
    it('should return all loaded rules', () => {
      const rules = service.getRules();
      expect(rules).toBeInstanceOf(Array);
      expect(rules.length).toBe(16);
      expect(rules[0]).toHaveProperty('category');
      expect(rules[0]).toHaveProperty('pattern');
      expect(rules[0]).toHaveProperty('reasoning');
    });

    it('should return correct rule count', () => {
      const count = service.getRuleCount();
      expect(count).toBe(16);
    });

    it('should have unique categories for different rule types', () => {
      const rules = service.getRules();
      const categories = new Set(rules.map((r) => r.category));
      expect(categories.has('blog_platform')).toBe(true);
      expect(categories.has('social_media')).toBe(true);
      expect(categories.has('ecommerce')).toBe(true);
      expect(categories.has('forum')).toBe(true);
      expect(categories.has('aggregator')).toBe(true);
    });
  });
});
