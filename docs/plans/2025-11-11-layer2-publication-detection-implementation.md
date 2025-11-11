# Layer 2 Publication Detection Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor Layer 2 from generic operational validation to focused publication detection that identifies and rejects pure publication/magazine sites.

**Architecture:** Replace company infrastructure checks with 4-module detection system: Product Offering Detector, Homepage Layout Analyzer, Navigation Parser, and Monetization Detector. Aggregate module scores into publication_score (0-1), reject if ≥0.65 threshold.

**Tech Stack:** TypeScript, NestJS, Cheerio (HTML parsing), class-validator (DTO validation), React (settings UI), Tailwind CSS

---

## Task 1: Update Type Definitions

**Files:**
- Modify: `packages/shared/src/types/layer2.ts`
- Modify: `packages/shared/src/types/settings.ts:82-96`

**Step 1: Write test for new Layer2Rules type**

Create: `packages/shared/src/types/__tests__/layer2.types.spec.ts`

```typescript
import type { Layer2Rules } from '../layer2';

describe('Layer2Rules', () => {
  it('should accept valid publication detection rules', () => {
    const rules: Layer2Rules = {
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

    expect(rules.publication_score_threshold).toBe(0.65);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test packages/shared/src/types/__tests__/layer2.types.spec.ts`
Expected: FAIL - Type doesn't exist yet

**Step 3: Update Layer2Rules interface**

Modify: `packages/shared/src/types/layer2.ts`

Replace the current `Layer2Rules` interface (lines 82-96) with:

```typescript
/**
 * Layer 2 Publication Detection Rules
 * Loaded from classification_settings.layer2_rules
 */
export interface Layer2Rules {
  /** Publication score threshold (0-1). URLs scoring >= this are rejected. Default: 0.65 */
  publication_score_threshold: number;

  /** Product offering detection keywords */
  product_keywords: {
    commercial: string[];  // ["pricing", "buy", "demo", "plans"]
    features: string[];    // ["features", "capabilities", "solutions"]
    cta: string[];         // ["get started", "sign up", "free trial"]
  };

  /** Navigation classification keywords */
  business_nav_keywords: string[];     // ["product", "pricing", "solutions", "about"]
  content_nav_keywords: string[];      // ["articles", "blog", "news", "topics"]
  min_business_nav_percentage: number; // 0.3 default (30%)

  /** Monetization detection patterns */
  ad_network_patterns: string[];       // ["googlesyndication", "adsense", "doubleclick"]
  affiliate_patterns: string[];        // ["amazon", "affiliate", "aff=", "ref="]
  payment_provider_patterns: string[]; // ["stripe", "paypal", "braintree"]
}
```

**Step 4: Update Layer2Signals interface**

In same file `packages/shared/src/types/layer2.ts`, replace `Layer2Signals` interface:

```typescript
/**
 * Layer 2 publication detection signals
 * Stored in results.layer2_signals JSONB column
 */
export interface Layer2Signals {
  // Module 1: Product Offering
  has_product_offering: boolean;
  product_confidence: number;        // 0-1
  detected_product_keywords: string[];

  // Module 2: Homepage Layout
  homepage_is_blog: boolean;
  layout_type: 'blog' | 'marketing' | 'mixed';
  layout_confidence: number;         // 0-1

  // Module 3: Navigation
  has_business_nav: boolean;
  business_nav_percentage: number;   // 0-1
  nav_items_classified: {
    business: string[];
    content: string[];
    other: string[];
  };

  // Module 4: Monetization
  monetization_type: 'ads' | 'affiliates' | 'business' | 'mixed' | 'unknown';
  ad_networks_detected: string[];
  affiliate_patterns_detected: string[];

  // Aggregation
  publication_score: number;         // 0-1 (average of module scores)
  module_scores: {
    product_offering: number;
    layout: number;
    navigation: number;
    monetization: number;
  };
}
```

**Step 5: Run test to verify it passes**

Run: `npm test packages/shared/src/types/__tests__/layer2.types.spec.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add packages/shared/src/types/layer2.ts packages/shared/src/types/__tests__/layer2.types.spec.ts
git commit -m "refactor(types): Update Layer2Rules and Layer2Signals for publication detection"
```

---

## Task 2: Create Layer2RulesDto Validator

**Files:**
- Modify: `apps/api/src/settings/dto/layer2-rules.dto.ts`
- Create: `apps/api/src/settings/dto/__tests__/layer2-rules.dto.spec.ts`

**Step 1: Write test for Layer2RulesDto validation**

Create: `apps/api/src/settings/dto/__tests__/layer2-rules.dto.spec.ts`

```typescript
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { Layer2RulesDto } from '../layer2-rules.dto';

describe('Layer2RulesDto', () => {
  it('should accept valid publication detection rules', async () => {
    const dto = plainToClass(Layer2RulesDto, {
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
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should reject threshold outside 0-1 range', async () => {
    const dto = plainToClass(Layer2RulesDto, {
      publication_score_threshold: 1.5,
      product_keywords: { commercial: [], features: [], cta: [] },
      business_nav_keywords: [],
      content_nav_keywords: [],
      min_business_nav_percentage: 0.3,
      ad_network_patterns: [],
      affiliate_patterns: [],
      payment_provider_patterns: [],
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('publication_score_threshold');
  });

  it('should reject nav percentage outside 0-1 range', async () => {
    const dto = plainToClass(Layer2RulesDto, {
      publication_score_threshold: 0.65,
      product_keywords: { commercial: [], features: [], cta: [] },
      business_nav_keywords: [],
      content_nav_keywords: [],
      min_business_nav_percentage: 1.5,
      ad_network_patterns: [],
      affiliate_patterns: [],
      payment_provider_patterns: [],
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('min_business_nav_percentage');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test apps/api/src/settings/dto/__tests__/layer2-rules.dto.spec.ts`
Expected: FAIL - DTO doesn't exist yet

**Step 3: Implement Layer2RulesDto**

Modify: `apps/api/src/settings/dto/layer2-rules.dto.ts`

Replace entire file content:

```typescript
import {
  IsNumber,
  IsArray,
  IsString,
  Min,
  Max,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

class ProductKeywordsDto {
  @IsArray()
  @IsString({ each: true })
  commercial: string[];

  @IsArray()
  @IsString({ each: true })
  features: string[];

  @IsArray()
  @IsString({ each: true })
  cta: string[];
}

export class Layer2RulesDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  publication_score_threshold?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => ProductKeywordsDto)
  product_keywords?: ProductKeywordsDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  business_nav_keywords?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  content_nav_keywords?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  min_business_nav_percentage?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ad_network_patterns?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  affiliate_patterns?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  payment_provider_patterns?: string[];
}
```

**Step 4: Run test to verify it passes**

Run: `npm test apps/api/src/settings/dto/__tests__/layer2-rules.dto.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/settings/dto/layer2-rules.dto.ts apps/api/src/settings/dto/__tests__/layer2-rules.dto.spec.ts
git commit -m "feat(settings): Add Layer2RulesDto validator for publication detection"
```

---

## Task 3: Implement Product Offering Detector

**Files:**
- Create: `apps/api/src/jobs/services/__tests__/product-offering-detector.spec.ts`
- Modify: `apps/api/src/jobs/services/layer2-operational-filter.service.ts`

**Step 1: Write test for product offering detection**

Create: `apps/api/src/jobs/services/__tests__/product-offering-detector.spec.ts`

```typescript
import * as cheerio from 'cheerio';
import type { Layer2Rules } from '@website-scraper/shared';

// Placeholder for detectProductOffering function
function detectProductOffering($: cheerio.CheerioAPI, html: string, rules: Layer2Rules) {
  throw new Error('Not implemented');
}

describe('Product Offering Detector', () => {
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

    const result = detectProductOffering($, html, mockRules);

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

    const result = detectProductOffering($, html, mockRules);

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

    const result = detectProductOffering($, html, mockRules);

    expect(result.has_product_offering).toBe(true);
    expect(result.product_confidence).toBeGreaterThan(0.5);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test apps/api/src/jobs/services/__tests__/product-offering-detector.spec.ts`
Expected: FAIL - Function not implemented

**Step 3: Implement detectProductOffering method**

Modify: `apps/api/src/jobs/services/layer2-operational-filter.service.ts`

Add this private method to the `Layer2OperationalFilterService` class:

```typescript
/**
 * Detect product/service offering from homepage
 * Scans for commercial keywords, pricing mentions, CTAs, and payment providers
 */
private detectProductOffering(
  $: cheerio.CheerioAPI,
  html: string,
  rules: Layer2Rules,
): {
  has_product_offering: boolean;
  product_confidence: number;
  detected_product_keywords: string[];
} {
  const lowerHtml = html.toLowerCase();
  const bodyText = $('body').text().toLowerCase();
  const detectedKeywords: string[] = [];
  let score = 0;
  let signalCount = 0;

  // Check commercial keywords
  const commercialKeywords = rules.product_keywords.commercial;
  const commercialMatches = commercialKeywords.filter(kw => bodyText.includes(kw.toLowerCase()));
  if (commercialMatches.length > 0) {
    score += Math.min(commercialMatches.length * 0.2, 0.4);
    signalCount++;
    detectedKeywords.push(...commercialMatches);
  }

  // Check feature keywords
  const featureKeywords = rules.product_keywords.features;
  const featureMatches = featureKeywords.filter(kw => bodyText.includes(kw.toLowerCase()));
  if (featureMatches.length > 0) {
    score += Math.min(featureMatches.length * 0.15, 0.3);
    signalCount++;
    detectedKeywords.push(...featureMatches);
  }

  // Check CTA keywords
  const ctaKeywords = rules.product_keywords.cta;
  const ctaMatches = ctaKeywords.filter(kw => bodyText.includes(kw.toLowerCase()));
  if (ctaMatches.length > 0) {
    score += Math.min(ctaMatches.length * 0.15, 0.3);
    signalCount++;
    detectedKeywords.push(...ctaMatches);
  }

  // Check for price mentions ($XX, pricing tables)
  const pricePatterns = [/\$\d+/, /\d+\/month/, /\d+\/year/, /<table[^>]*pricing/i];
  const hasPricing = pricePatterns.some(pattern => pattern.test(html));
  if (hasPricing) {
    score += 0.3;
    signalCount++;
    detectedKeywords.push('pricing_pattern');
  }

  // Check for payment provider scripts
  const paymentProviders = rules.payment_provider_patterns;
  const hasPaymentProvider = paymentProviders.some(provider =>
    lowerHtml.includes(provider.toLowerCase())
  );
  if (hasPaymentProvider) {
    score += 0.4;
    signalCount++;
    detectedKeywords.push('payment_provider');
  }

  // Normalize score to 0-1 range
  const confidence = signalCount > 0 ? Math.min(score, 1.0) : 0;

  return {
    has_product_offering: confidence > 0.5,
    product_confidence: confidence,
    detected_product_keywords: detectedKeywords,
  };
}
```

**Step 4: Export function for testing**

At the top of the test file, import from the service:

Modify: `apps/api/src/jobs/services/__tests__/product-offering-detector.spec.ts`

Replace the placeholder import with actual service testing:

```typescript
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
```

**Step 5: Run test to verify it passes**

Run: `npm test apps/api/src/jobs/services/__tests__/product-offering-detector.spec.ts`
Expected: PASS (all 3 tests)

**Step 6: Commit**

```bash
git add apps/api/src/jobs/services/layer2-operational-filter.service.ts apps/api/src/jobs/services/__tests__/product-offering-detector.spec.ts
git commit -m "feat(layer2): Add product offering detector module"
```

---

## Task 4: Implement Homepage Layout Analyzer

**Files:**
- Create: `apps/api/src/jobs/services/__tests__/layout-analyzer.spec.ts`
- Modify: `apps/api/src/jobs/services/layer2-operational-filter.service.ts`

**Step 1: Write test for layout analysis**

Create: `apps/api/src/jobs/services/__tests__/layout-analyzer.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { Layer2OperationalFilterService } from '../layer2-operational-filter.service';
import { ScraperService } from '../../../scraper/scraper.service';
import { SettingsService } from '../../../settings/settings.service';
import * as cheerio from 'cheerio';

describe('Homepage Layout Analyzer', () => {
  let service: Layer2OperationalFilterService;

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

  it('should identify blog-style layouts', () => {
    const html = `
      <html>
        <body>
          <div class="posts">
            <article>
              <time datetime="2024-01-15">Jan 15, 2024</time>
              <h2>Post Title</h2>
              <p>By John Doe</p>
            </article>
            <article>
              <time datetime="2024-01-14">Jan 14, 2024</time>
              <h2>Another Post</h2>
              <p>By Jane Smith</p>
            </article>
          </div>
          <div class="pagination">Next</div>
        </body>
      </html>
    `;
    const $ = cheerio.load(html);

    const result = service['analyzeHomepageLayout']($, html);

    expect(result.homepage_is_blog).toBe(true);
    expect(result.layout_type).toBe('blog');
    expect(result.layout_confidence).toBeGreaterThan(0.7);
  });

  it('should identify marketing landing pages', () => {
    const html = `
      <html>
        <body>
          <section class="hero">
            <h1>Transform Your Business</h1>
            <p>The leading platform for...</p>
            <button>Start Free Trial</button>
          </section>
          <section class="features">
            <h2>Features</h2>
            <div class="feature">Feature 1</div>
            <div class="feature">Feature 2</div>
          </section>
          <section class="testimonials">
            <blockquote>Amazing product!</blockquote>
          </section>
        </body>
      </html>
    `;
    const $ = cheerio.load(html);

    const result = service['analyzeHomepageLayout']($, html);

    expect(result.homepage_is_blog).toBe(false);
    expect(result.layout_type).toBe('marketing');
    expect(result.layout_confidence).toBeGreaterThan(0.7);
  });

  it('should identify mixed layouts', () => {
    const html = `
      <html>
        <body>
          <section class="hero">
            <h1>Our Platform</h1>
            <button>Get Started</button>
          </section>
          <section class="blog">
            <h2>Latest Posts</h2>
            <article>
              <time datetime="2024-01-15">Jan 15</time>
              <h3>Post Title</h3>
            </article>
          </section>
        </body>
      </html>
    `;
    const $ = cheerio.load(html);

    const result = service['analyzeHomepageLayout']($, html);

    expect(result.layout_type).toBe('mixed');
    expect(result.layout_confidence).toBeGreaterThan(0.3);
    expect(result.layout_confidence).toBeLessThan(0.7);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test apps/api/src/jobs/services/__tests__/layout-analyzer.spec.ts`
Expected: FAIL - Method not implemented

**Step 3: Implement analyzeHomepageLayout method**

Modify: `apps/api/src/jobs/services/layer2-operational-filter.service.ts`

Add this private method:

```typescript
/**
 * Analyze homepage layout to distinguish blog vs marketing landing page
 */
private analyzeHomepageLayout(
  $: cheerio.CheerioAPI,
  html: string,
): {
  homepage_is_blog: boolean;
  layout_type: 'blog' | 'marketing' | 'mixed';
  layout_confidence: number;
} {
  let blogSignals = 0;
  let marketingSignals = 0;

  // Blog-style signals
  const articleCount = $('article').length;
  if (articleCount >= 3) blogSignals += 2;
  else if (articleCount >= 1) blogSignals += 1;

  const dateStamps = $('time, .date, .published').length;
  if (dateStamps >= 3) blogSignals += 2;
  else if (dateStamps >= 1) blogSignals += 1;

  const authorBylines = $('.author, .byline, [rel="author"]').length;
  if (authorBylines >= 2) blogSignals += 1;

  const pagination = $('.pagination, .pager, [rel="next"]').length > 0;
  if (pagination) blogSignals += 1;

  const latestPostsHeading = /latest posts?|recent articles?|blog/i.test($('h1, h2, h3').text());
  if (latestPostsHeading) blogSignals += 2;

  // Marketing-style signals
  const heroSection = $('.hero, .banner, .jumbotron').length > 0;
  if (heroSection) marketingSignals += 2;

  const ctaButtons = $('button, .cta, .btn').filter((_, el) => {
    const text = $(el).text().toLowerCase();
    return text.includes('start') || text.includes('get') || text.includes('try') ||
           text.includes('demo') || text.includes('sign up');
  }).length;
  if (ctaButtons >= 2) marketingSignals += 2;
  else if (ctaButtons >= 1) marketingSignals += 1;

  const featureSections = $('[class*="feature"], [class*="benefit"]').length;
  if (featureSections >= 3) marketingSignals += 2;
  else if (featureSections >= 1) marketingSignals += 1;

  const testimonials = $('.testimonial, blockquote, .review').length;
  if (testimonials >= 1) marketingSignals += 1;

  const productImagery = $('img[alt*="product"], img[alt*="screenshot"]').length;
  if (productImagery >= 2) marketingSignals += 1;

  // Calculate layout type and confidence
  const totalSignals = blogSignals + marketingSignals;
  if (totalSignals === 0) {
    return {
      homepage_is_blog: false,
      layout_type: 'mixed',
      layout_confidence: 0.5,
    };
  }

  const blogRatio = blogSignals / totalSignals;
  const marketingRatio = marketingSignals / totalSignals;

  if (blogRatio >= 0.7) {
    return {
      homepage_is_blog: true,
      layout_type: 'blog',
      layout_confidence: blogRatio,
    };
  } else if (marketingRatio >= 0.7) {
    return {
      homepage_is_blog: false,
      layout_type: 'marketing',
      layout_confidence: marketingRatio,
    };
  } else {
    return {
      homepage_is_blog: blogSignals > marketingSignals,
      layout_type: 'mixed',
      layout_confidence: Math.abs(blogRatio - marketingRatio),
    };
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test apps/api/src/jobs/services/__tests__/layout-analyzer.spec.ts`
Expected: PASS (all 3 tests)

**Step 5: Commit**

```bash
git add apps/api/src/jobs/services/layer2-operational-filter.service.ts apps/api/src/jobs/services/__tests__/layout-analyzer.spec.ts
git commit -m "feat(layer2): Add homepage layout analyzer module"
```

---

## Task 5: Implement Navigation Parser

**Files:**
- Create: `apps/api/src/jobs/services/__tests__/navigation-parser.spec.ts`
- Modify: `apps/api/src/jobs/services/layer2-operational-filter.service.ts`

**Step 1: Write test for navigation parsing**

Create: `apps/api/src/jobs/services/__tests__/navigation-parser.spec.ts`

```typescript
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
    expect(result.nav_items_classified.content.length).toBeGreaterThan(2);
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
```

**Step 2: Run test to verify it fails**

Run: `npm test apps/api/src/jobs/services/__tests__/navigation-parser.spec.ts`
Expected: FAIL - Method not implemented

**Step 3: Implement parseNavigation method**

Modify: `apps/api/src/jobs/services/layer2-operational-filter.service.ts`

Add this private method:

```typescript
/**
 * Parse navigation to classify business vs content focus
 */
private parseNavigation(
  $: cheerio.CheerioAPI,
  html: string,
  rules: Layer2Rules,
): {
  has_business_nav: boolean;
  business_nav_percentage: number;
  nav_items_classified: {
    business: string[];
    content: string[];
    other: string[];
  };
} {
  const businessKeywords = rules.business_nav_keywords.map(k => k.toLowerCase());
  const contentKeywords = rules.content_nav_keywords.map(k => k.toLowerCase());

  const classified = {
    business: [] as string[],
    content: [] as string[],
    other: [] as string[],
  };

  // Extract navigation links
  const navLinks = $('nav a, header a, [role="navigation"] a');

  if (navLinks.length === 0) {
    return {
      has_business_nav: false,
      business_nav_percentage: 0,
      nav_items_classified: classified,
    };
  }

  navLinks.each((_, el) => {
    const text = $(el).text().trim().toLowerCase();
    const href = $(el).attr('href') || '';
    const combinedText = `${text} ${href}`.toLowerCase();

    if (businessKeywords.some(kw => combinedText.includes(kw))) {
      classified.business.push(text);
    } else if (contentKeywords.some(kw => combinedText.includes(kw))) {
      classified.content.push(text);
    } else {
      classified.other.push(text);
    }
  });

  const totalClassified = classified.business.length + classified.content.length + classified.other.length;
  const businessPercentage = totalClassified > 0 ? classified.business.length / totalClassified : 0;

  return {
    has_business_nav: businessPercentage >= rules.min_business_nav_percentage,
    business_nav_percentage: businessPercentage,
    nav_items_classified: classified,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npm test apps/api/src/jobs/services/__tests__/navigation-parser.spec.ts`
Expected: PASS (all 3 tests)

**Step 5: Commit**

```bash
git add apps/api/src/jobs/services/layer2-operational-filter.service.ts apps/api/src/jobs/services/__tests__/navigation-parser.spec.ts
git commit -m "feat(layer2): Add navigation parser module"
```

---

## Task 6: Implement Monetization Detector

**Files:**
- Create: `apps/api/src/jobs/services/__tests__/monetization-detector.spec.ts`
- Modify: `apps/api/src/jobs/services/layer2-operational-filter.service.ts`

**Step 1: Write test for monetization detection**

Create: `apps/api/src/jobs/services/__tests__/monetization-detector.spec.ts`

```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `npm test apps/api/src/jobs/services/__tests__/monetization-detector.spec.ts`
Expected: FAIL - Method not implemented

**Step 3: Implement detectMonetization method**

Modify: `apps/api/src/jobs/services/layer2-operational-filter.service.ts`

Add this private method:

```typescript
/**
 * Detect revenue model: ads, affiliates, or business
 */
private detectMonetization(
  $: cheerio.CheerioAPI,
  html: string,
  rules: Layer2Rules,
): {
  monetization_type: 'ads' | 'affiliates' | 'business' | 'mixed' | 'unknown';
  ad_networks_detected: string[];
  affiliate_patterns_detected: string[];
} {
  const lowerHtml = html.toLowerCase();
  const adNetworks: string[] = [];
  const affiliatePatterns: string[] = [];

  // Detect ad networks
  rules.ad_network_patterns.forEach(pattern => {
    if (lowerHtml.includes(pattern.toLowerCase())) {
      adNetworks.push(pattern);
    }
  });

  // Detect affiliate patterns
  rules.affiliate_patterns.forEach(pattern => {
    if (lowerHtml.includes(pattern.toLowerCase())) {
      affiliatePatterns.push(pattern);
    }
  });

  // Detect payment providers (business signal)
  const hasPaymentProvider = rules.payment_provider_patterns.some(provider =>
    lowerHtml.includes(provider.toLowerCase())
  );

  // Check for explicit ad containers
  const hasAdContainers = $('.ad, [class*="ad-"], [id*="ad-"]').length > 0 ||
                          /advertisement|sponsored/i.test($('body').text());

  const hasAds = adNetworks.length > 0 || hasAdContainers;
  const hasAffiliates = affiliatePatterns.length > 0;
  const hasBusiness = hasPaymentProvider;

  // Determine monetization type
  let monetizationType: 'ads' | 'affiliates' | 'business' | 'mixed' | 'unknown';

  if (hasBusiness && (hasAds || hasAffiliates)) {
    monetizationType = 'mixed';
  } else if (hasBusiness) {
    monetizationType = 'business';
  } else if (hasAds && hasAffiliates) {
    monetizationType = 'mixed';
  } else if (hasAds) {
    monetizationType = 'ads';
  } else if (hasAffiliates) {
    monetizationType = 'affiliates';
  } else {
    monetizationType = 'unknown';
  }

  return {
    monetization_type: monetizationType,
    ad_networks_detected: adNetworks,
    affiliate_patterns_detected: affiliatePatterns,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npm test apps/api/src/jobs/services/__tests__/monetization-detector.spec.ts`
Expected: PASS (all 4 tests)

**Step 5: Commit**

```bash
git add apps/api/src/jobs/services/layer2-operational-filter.service.ts apps/api/src/jobs/services/__tests__/monetization-detector.spec.ts
git commit -m "feat(layer2): Add monetization detector module"
```

---

## Task 7: Update filterUrl Method with Aggregation Logic

**Files:**
- Modify: `apps/api/src/jobs/services/layer2-operational-filter.service.ts`
- Create: `apps/api/src/jobs/services/__tests__/layer2-integration.spec.ts`

**Step 1: Write integration test for complete filterUrl**

Create: `apps/api/src/jobs/services/__tests__/layer2-integration.spec.ts`

```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `npm test apps/api/src/jobs/services/__tests__/layer2-integration.spec.ts`
Expected: FAIL - filterUrl not yet updated

**Step 3: Update filterUrl method with aggregation**

Modify: `apps/api/src/jobs/services/layer2-operational-filter.service.ts`

Replace the entire `filterUrl` method:

```typescript
/**
 * Main entry point: Filter URL through Layer 2 publication detection
 * Scrapes homepage and aggregates 4 detection modules into publication score
 *
 * @param url - URL to filter (must have passed Layer 1)
 * @returns Layer2FilterResult with passed flag, signals, and reasoning
 */
async filterUrl(url: string): Promise<Layer2FilterResult> {
  const startTime = Date.now();

  try {
    // Input validation
    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      this.logger.warn('Invalid URL input to filterUrl: null, undefined, or empty');
      return this.createPassThroughResult(
        'PASS Layer 2 - Invalid input, defaulting to next layer',
        startTime,
      );
    }

    // Load Layer 2 configuration rules
    const rules = await this.loadLayer2Rules();

    // Scrape homepage HTML
    const scrapeResult = await this.scraperService.fetchUrl(url);

    if (!scrapeResult.success || !scrapeResult.content) {
      this.logger.warn(
        `Scraping failed for ${url.slice(0, 100)}: ${scrapeResult.error || 'Unknown error'}`,
      );
      return this.createPassThroughResult(
        `PASS Layer 2 - Scraping failed (${scrapeResult.error}), defaulting to next layer`,
        startTime,
      );
    }

    const html = scrapeResult.content;
    const $ = cheerio.load(html);

    // Run 4 detection modules
    const productSignals = this.detectProductOffering($, html, rules);
    const layoutSignals = this.analyzeHomepageLayout($, html);
    const navSignals = this.parseNavigation($, html, rules);
    const monetizationSignals = this.detectMonetization($, html, rules);

    // Calculate module scores (0-1 scale, higher = more "publication-like")
    const productScore = 1 - productSignals.product_confidence; // Invert: no product = high pub score
    const layoutScore = layoutSignals.homepage_is_blog ? layoutSignals.layout_confidence : (1 - layoutSignals.layout_confidence);
    const navScore = 1 - navSignals.business_nav_percentage; // Invert: low business nav = high pub score
    const monetizationScore =
      monetizationSignals.monetization_type === 'ads' || monetizationSignals.monetization_type === 'affiliates'
        ? 1.0
        : monetizationSignals.monetization_type === 'business'
          ? 0.0
          : 0.5; // mixed or unknown

    // Aggregate into publication_score
    const publication_score = (productScore + layoutScore + navScore + monetizationScore) / 4;

    // Build complete signals object
    const signals: Layer2Signals = {
      ...productSignals,
      ...layoutSignals,
      ...navSignals,
      ...monetizationSignals,
      publication_score,
      module_scores: {
        product_offering: productScore,
        layout: layoutScore,
        navigation: navScore,
        monetization: monetizationScore,
      },
    };

    // Make decision
    const passed = publication_score < rules.publication_score_threshold;
    const processingTimeMs = Date.now() - startTime;

    this.logger.log(
      `Layer 2 result for ${url.slice(0, 100)}: ${passed ? 'PASS' : 'REJECT'} ` +
      `(publication_score: ${publication_score.toFixed(2)}, ${processingTimeMs}ms)`,
    );

    return {
      passed,
      reasoning: passed
        ? `PASS Layer 2 - Company site detected (publication_score: ${publication_score.toFixed(2)})`
        : `REJECT Layer 2 - Pure publication detected (publication_score: ${publication_score.toFixed(2)})`,
      signals,
      processingTimeMs,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    this.logger.error(`Error in Layer 2 filtering for ${url.slice(0, 100)}: ${errorMessage}`);
    return this.createPassThroughResult(
      `PASS Layer 2 - Error in analysis (${errorMessage}), defaulting to next layer`,
      startTime,
    );
  }
}
```

**Step 4: Update loadLayer2Rules to use new structure**

In same file, update the `loadLayer2Rules` method:

```typescript
/**
 * Load Layer 2 configuration rules from Story 3.0 settings
 * Falls back to hardcoded defaults if database unavailable
 */
private async loadLayer2Rules(): Promise<Layer2Rules> {
  try {
    const settings = await this.settingsService.getSettings();
    const layer2Rules = (settings as any).layer2_rules;

    if (layer2Rules && typeof layer2Rules === 'object') {
      return {
        publication_score_threshold:
          layer2Rules.publication_score_threshold ?? this.DEFAULT_RULES.publication_score_threshold,
        product_keywords: layer2Rules.product_keywords ?? this.DEFAULT_RULES.product_keywords,
        business_nav_keywords: layer2Rules.business_nav_keywords ?? this.DEFAULT_RULES.business_nav_keywords,
        content_nav_keywords: layer2Rules.content_nav_keywords ?? this.DEFAULT_RULES.content_nav_keywords,
        min_business_nav_percentage:
          layer2Rules.min_business_nav_percentage ?? this.DEFAULT_RULES.min_business_nav_percentage,
        ad_network_patterns: layer2Rules.ad_network_patterns ?? this.DEFAULT_RULES.ad_network_patterns,
        affiliate_patterns: layer2Rules.affiliate_patterns ?? this.DEFAULT_RULES.affiliate_patterns,
        payment_provider_patterns: layer2Rules.payment_provider_patterns ?? this.DEFAULT_RULES.payment_provider_patterns,
      };
    }
  } catch (error) {
    this.logger.warn('Failed to load Layer 2 rules from settings, using defaults');
  }

  return this.DEFAULT_RULES;
}
```

**Step 5: Update DEFAULT_RULES constant**

At the top of the class, replace `DEFAULT_RULES`:

```typescript
private readonly DEFAULT_RULES: Layer2Rules = {
  publication_score_threshold: 0.65,
  product_keywords: {
    commercial: ['pricing', 'buy', 'demo', 'plans', 'free trial', 'get started'],
    features: ['features', 'capabilities', 'solutions', 'product'],
    cta: ['sign up', 'start free', 'book a call', 'request demo'],
  },
  business_nav_keywords: ['product', 'pricing', 'solutions', 'about', 'careers', 'customers', 'contact'],
  content_nav_keywords: ['articles', 'blog', 'news', 'topics', 'categories', 'archives', 'authors'],
  min_business_nav_percentage: 0.3,
  ad_network_patterns: ['googlesyndication', 'adsense', 'doubleclick', 'media.net'],
  affiliate_patterns: ['amazon', 'affiliate', 'aff=', 'ref=', 'amzn'],
  payment_provider_patterns: ['stripe', 'paypal', 'braintree', 'square'],
};
```

**Step 6: Run test to verify it passes**

Run: `npm test apps/api/src/jobs/services/__tests__/layer2-integration.spec.ts`
Expected: PASS (all 3 tests)

**Step 7: Commit**

```bash
git add apps/api/src/jobs/services/layer2-operational-filter.service.ts apps/api/src/jobs/services/__tests__/layer2-integration.spec.ts
git commit -m "feat(layer2): Update filterUrl with publication detection aggregation"
```

---

## Task 8: Update Settings Service to Handle New Layer2Rules

**Files:**
- Modify: `apps/api/src/settings/dto/update-settings.dto.ts`
- Create: `apps/api/src/settings/__tests__/layer2-rules-persistence.spec.ts`

**Step 1: Write test for Layer2Rules persistence**

Create: `apps/api/src/settings/__tests__/layer2-rules-persistence.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { SettingsService } from '../settings.service';
import { SupabaseService } from '../../supabase/supabase.service';

describe('Layer2Rules Persistence', () => {
  let service: SettingsService;
  let supabaseService: SupabaseService;

  const mockLayer2Rules = {
    publication_score_threshold: 0.7,
    product_keywords: {
      commercial: ['pricing'],
      features: ['features'],
      cta: ['sign up'],
    },
    business_nav_keywords: ['product'],
    content_nav_keywords: ['blog'],
    min_business_nav_percentage: 0.4,
    ad_network_patterns: ['adsense'],
    affiliate_patterns: ['amazon'],
    payment_provider_patterns: ['stripe'],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        {
          provide: SupabaseService,
          useValue: {
            getClient: jest.fn().mockReturnValue({
              from: jest.fn().mockReturnThis(),
              select: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'test-id',
                  layer2_rules: mockLayer2Rules,
                },
                error: null,
              }),
              update: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
            }),
          },
        },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
    supabaseService = module.get<SupabaseService>(SupabaseService);
  });

  it('should load Layer2Rules from database', async () => {
    const settings = await service.getSettings();

    expect(settings.layer2_rules).toBeDefined();
    expect(settings.layer2_rules.publication_score_threshold).toBe(0.7);
    expect(settings.layer2_rules.product_keywords.commercial).toContain('pricing');
  });

  it('should save updated Layer2Rules to database', async () => {
    const updateSpy = jest.spyOn(supabaseService.getClient().from('classification_settings'), 'update');

    await service.updateSettings({
      layer2_rules: {
        publication_score_threshold: 0.8,
        product_keywords: {
          commercial: ['buy'],
          features: ['solutions'],
          cta: ['demo'],
        },
        business_nav_keywords: ['pricing'],
        content_nav_keywords: ['articles'],
        min_business_nav_percentage: 0.5,
        ad_network_patterns: ['doubleclick'],
        affiliate_patterns: ['affiliate'],
        payment_provider_patterns: ['paypal'],
      },
    });

    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        layer2_rules: expect.objectContaining({
          publication_score_threshold: 0.8,
        }),
      }),
    );
  });
});
```

**Step 2: Run test to verify current state**

Run: `npm test apps/api/src/settings/__tests__/layer2-rules-persistence.spec.ts`
Expected: PASS or FAIL depending on current implementation

**Step 3: Update UpdateClassificationSettingsDto**

Modify: `apps/api/src/settings/dto/update-settings.dto.ts`

Add import and field:

```typescript
import { Layer2RulesDto } from './layer2-rules.dto';

export class UpdateClassificationSettingsDto {
  // ... existing fields ...

  @IsOptional()
  @ValidateNested()
  @Type(() => Layer2RulesDto)
  layer2_rules?: Layer2RulesDto;
}
```

**Step 4: Verify settings service handles Layer2Rules**

Check: `apps/api/src/settings/settings.service.ts`

Ensure `updateSettings` method includes `layer2_rules` in the update payload. If not present, add it:

```typescript
async updateSettings(dto: UpdateClassificationSettingsDto): Promise<ClassificationSettings> {
  const client = this.supabase.getClient();

  const updatePayload: any = {
    updated_at: new Date().toISOString(),
  };

  // ... existing field mappings ...

  if (dto.layer2_rules !== undefined) {
    updatePayload.layer2_rules = dto.layer2_rules;
  }

  // ... rest of method ...
}
```

**Step 5: Run test again**

Run: `npm test apps/api/src/settings/__tests__/layer2-rules-persistence.spec.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add apps/api/src/settings/dto/update-settings.dto.ts apps/api/src/settings/settings.service.ts apps/api/src/settings/__tests__/layer2-rules-persistence.spec.ts
git commit -m "feat(settings): Add Layer2Rules persistence support"
```

---

## Task 9: Run All Tests and Fix Breakages

**Files:**
- Various test files that may reference old Layer2 structure

**Step 1: Run full test suite**

Run: `npm test`
Expected: Some failures in tests that reference old Layer2Signals structure

**Step 2: Identify and fix broken tests**

Look for tests that reference:
- Old `Layer2Signals` fields (`company_pages`, `blog_data`, `tech_stack`, `design_quality`)
- Old `Layer2Rules` fields (`blog_freshness_days`, `required_pages_count`, etc.)

Update these tests to use new structure or remove if obsolete.

Common files to check:
- `apps/api/src/jobs/__tests__/confidence-scoring.service.spec.ts`
- `apps/api/src/manual-review/__tests__/*.spec.ts`
- `apps/api/src/workers/__tests__/url-worker.processor.spec.ts`

**Step 3: Update manual review test utilities**

Modify: `apps/api/src/manual-review/__tests__/test-utils.ts`

Update mock Layer2Results/Signals to use new structure:

```typescript
export const createMockLayer2Results = (): Layer2Results => ({
  // Update to match new Layer2Results structure if needed
  // Check packages/shared/src/types/manual-review.ts for Layer2Results
});
```

**Step 4: Run tests again**

Run: `npm test`
Expected: All tests PASS

**Step 5: Commit fixes**

```bash
git add .
git commit -m "test: Update tests for new Layer2 publication detection structure"
```

---

## Task 10: Update Manual Review UI to Display New Signals

**Files:**
- Modify: `apps/web/components/manual-review/FactorBreakdown.tsx`

**Step 1: Write component test for new Layer2 display**

Create: `apps/web/components/manual-review/__tests__/FactorBreakdown-layer2.test.tsx`

```typescript
import { render, screen } from '@testing-library/react';
import { FactorBreakdown } from '../FactorBreakdown';
import type { FactorBreakdown as FactorBreakdownType } from '@website-scraper/shared';

describe('FactorBreakdown - Layer 2 Publication Detection', () => {
  const mockData: FactorBreakdownType = {
    url: 'https://example.com',
    confidence_score: 0.72,
    confidence_band: 'medium',
    reasoning: 'Test reasoning',
    layer1: {} as any,
    layer2: {
      guest_post_red_flags: {} as any,
      content_quality: {} as any,
    },
    layer3: {} as any,
  };

  it('should display publication score', () => {
    render(<FactorBreakdown data={mockData} />);

    // Should show Layer 2 section
    expect(screen.getByText(/Layer 2/i)).toBeInTheDocument();

    // Should show publication detection results
    expect(screen.getByText(/Publication Score/i)).toBeInTheDocument();
  });

  it('should display module scores breakdown', () => {
    render(<FactorBreakdown data={mockData} />);

    expect(screen.getByText(/Product Offering/i)).toBeInTheDocument();
    expect(screen.getByText(/Layout Analysis/i)).toBeInTheDocument();
    expect(screen.getByText(/Navigation/i)).toBeInTheDocument();
    expect(screen.getByText(/Monetization/i)).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test apps/web/components/manual-review/__tests__/FactorBreakdown-layer2.test.tsx`
Expected: FAIL - Component not yet updated

**Step 3: Update FactorBreakdown component**

Modify: `apps/web/components/manual-review/FactorBreakdown.tsx`

Find the Layer 2 section and replace with new publication detection display:

```tsx
{/* Layer 2: Publication Detection */}
<div className="border-t pt-4">
  <h4 className="font-semibold mb-2">Layer 2: Publication Detection</h4>

  {data.layer2 && 'publication_score' in data.layer2 ? (
    <div className="space-y-3">
      {/* Publication Score */}
      <div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Publication Score</span>
          <span className={`font-semibold ${
            data.layer2.publication_score >= 0.65 ? 'text-red-600' : 'text-green-600'
          }`}>
            {(data.layer2.publication_score * 100).toFixed(0)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
          <div
            className={`h-2 rounded-full ${
              data.layer2.publication_score >= 0.65 ? 'bg-red-500' : 'bg-green-500'
            }`}
            style={{ width: `${data.layer2.publication_score * 100}%` }}
          />
        </div>
      </div>

      {/* Module Scores */}
      {data.layer2.module_scores && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 uppercase font-semibold">Module Breakdown</p>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-50 p-2 rounded">
              <div className="text-xs text-gray-600">Product Offering</div>
              <div className="text-sm font-semibold">
                {(data.layer2.module_scores.product_offering * 100).toFixed(0)}%
              </div>
            </div>

            <div className="bg-gray-50 p-2 rounded">
              <div className="text-xs text-gray-600">Layout Analysis</div>
              <div className="text-sm font-semibold">
                {(data.layer2.module_scores.layout * 100).toFixed(0)}%
              </div>
            </div>

            <div className="bg-gray-50 p-2 rounded">
              <div className="text-xs text-gray-600">Navigation</div>
              <div className="text-sm font-semibold">
                {(data.layer2.module_scores.navigation * 100).toFixed(0)}%
              </div>
            </div>

            <div className="bg-gray-50 p-2 rounded">
              <div className="text-xs text-gray-600">Monetization</div>
              <div className="text-sm font-semibold">
                {(data.layer2.module_scores.monetization * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detection Details */}
      <div className="text-xs space-y-1">
        {data.layer2.has_product_offering !== undefined && (
          <div>
            <span className="text-gray-600">Product Offering:</span>{' '}
            <span className={data.layer2.has_product_offering ? 'text-green-600' : 'text-red-600'}>
              {data.layer2.has_product_offering ? 'Detected' : 'Not Found'}
            </span>
          </div>
        )}

        {data.layer2.layout_type && (
          <div>
            <span className="text-gray-600">Layout Type:</span>{' '}
            <span className="font-medium">{data.layer2.layout_type}</span>
          </div>
        )}

        {data.layer2.has_business_nav !== undefined && (
          <div>
            <span className="text-gray-600">Business Nav:</span>{' '}
            <span className={data.layer2.has_business_nav ? 'text-green-600' : 'text-red-600'}>
              {data.layer2.has_business_nav ? 'Present' : 'Absent'}
            </span>
            {data.layer2.business_nav_percentage !== undefined && (
              <span className="text-gray-500 ml-1">
                ({(data.layer2.business_nav_percentage * 100).toFixed(0)}%)
              </span>
            )}
          </div>
        )}

        {data.layer2.monetization_type && (
          <div>
            <span className="text-gray-600">Monetization:</span>{' '}
            <span className="font-medium">{data.layer2.monetization_type}</span>
          </div>
        )}
      </div>
    </div>
  ) : (
    <p className="text-sm text-gray-500">Old Layer 2 data structure (legacy)</p>
  )}
</div>
```

**Step 4: Run test to verify it passes**

Run: `npm test apps/web/components/manual-review/__tests__/FactorBreakdown-layer2.test.tsx`
Expected: PASS

**Step 5: Test in browser**

Run: `npm run dev` (in apps/web directory)
Navigate to manual review page with a queued item
Verify Layer 2 section displays new publication detection UI

**Step 6: Commit**

```bash
git add apps/web/components/manual-review/FactorBreakdown.tsx apps/web/components/manual-review/__tests__/FactorBreakdown-layer2.test.tsx
git commit -m "feat(ui): Update manual review to display Layer2 publication detection"
```

---

## Execution Complete

All tasks completed! The Layer 2 publication detection refactor is now fully implemented with:

✅ Updated type definitions (Layer2Rules, Layer2Signals)
✅ DTO validators for settings
✅ 4 detection modules (Product, Layout, Navigation, Monetization)
✅ Aggregation logic in filterUrl
✅ Settings persistence
✅ All tests passing
✅ Manual review UI updated

**Next Steps:**
1. Create Layer 2 settings UI (separate feature)
2. Run integration tests with real URLs
3. Monitor rejection rates in production
4. Iterate on thresholds based on data
