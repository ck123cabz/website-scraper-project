# Layer 2: Publication Detection Refactor

**Date:** 2025-11-11
**Status:** Design Approved
**Author:** Design Session with User

## Executive Summary

Refactor Layer 2 from generic "operational validation" to focused **publication detection** that identifies and rejects pure publication/magazine sites (content-only with no underlying business). This aligns Layer 2 with the actual goal: finding high-quality link building prospects (companies with blogs), not pure content sites.

**Current Problem:** Layer 2 checks irrelevant signals (blog freshness, tech stack, design quality) that don't distinguish publications from companies.

**New Approach:** Detect 4 clear publication signals from homepage HTML to calculate a publication score (0-1). Score ≥0.65 = reject as pure publication.

## Goals

1. **Primary:** Reject ALL pure publications (TechCrunch, Medium, news sites) before expensive Layer 3
2. **Secondary:** Pass companies with blogs (HubSpot, Stripe, Atlassian) to Layer 3
3. **Cost:** Maintain homepage-only scraping (no multi-page crawling)
4. **Target:** 20-30% rejection rate at Layer 2, <5% false positive rate

## Architecture Overview

### Input
- URL that passed Layer 1 domain analysis
- Homepage HTML from ScraperService

### Process
1. Load Layer2Rules from database (via SettingsService)
2. Scrape homepage HTML
3. Parse with Cheerio
4. Run 4 detection modules in parallel
5. Calculate publication_score (average of 4 module scores)
6. Evaluate: score ≥ threshold → REJECT, else PASS

### Output
- `Layer2FilterResult` with:
  - `passed: boolean` (false if publication detected)
  - `reasoning: string` (e.g., "REJECT Layer 2 - Pure publication (score: 0.78)")
  - `signals: Layer2Signals` (detailed detection results)
  - `processingTimeMs: number`

## Detection Modules

### 1. Product Offering Detector
**Purpose:** Identify if site sells products/services vs just publishes content

**Detection Logic:**
- Scan HTML and text for commercial keywords:
  - Commercial: "pricing", "plans", "buy", "get started", "free trial", "demo", "book a call", "request quote"
  - Features: "features", "capabilities", "solutions", "product"
  - CTAs: "sign up", "start free", "contact sales"
- Look for patterns: price mentions ($XX/month), pricing tables, feature lists, product screenshots
- Check for payment provider scripts (Stripe, PayPal)

**Scoring:**
- 0.0 = No product signals detected (pure publication)
- 0.5 = Weak/ambiguous signals
- 1.0 = Clear product offering (company site)

**Output:**
```typescript
{
  has_product_offering: boolean,
  product_confidence: number, // 0-1
  detected_keywords: string[]
}
```

### 2. Homepage Layout Analyzer
**Purpose:** Distinguish blog-style layouts from marketing landing pages

**Detection Logic:**
- **Blog-style signals:**
  - Article grid/list layout
  - Date stamps on homepage
  - Author bylines
  - Pagination controls
  - "Latest Posts" / "Recent Articles" headings

- **Marketing-style signals:**
  - Hero section with CTA button
  - Feature/benefit sections
  - Testimonials
  - Product imagery
  - "Above the fold" marketing content

**Technique:** Count matching elements, calculate layout ratio

**Scoring:**
- 0.0 = Pure blog layout (homepage IS the blog)
- 0.5 = Mixed layout
- 1.0 = Pure marketing landing page

**Output:**
```typescript
{
  homepage_is_blog: boolean,
  layout_type: 'blog' | 'marketing' | 'mixed',
  layout_confidence: number // 0-1
}
```

### 3. Navigation Parser
**Purpose:** Identify if navigation focuses on content vs business

**Detection Logic:**
- Extract main navigation menu items
- Classify each nav item:
  - **Content-only:** "Articles", "News", "Topics", "Categories", "Archives", "Authors", "Subscribe"
  - **Business:** "Product", "Solutions", "Pricing", "About", "Careers", "Contact", "Customers", "Demo"
- Calculate business_nav_percentage = business_items / total_items

**Scoring:**
- 0.0 = <30% business navigation (pure publication)
- 0.5 = 30-70% business navigation (mixed)
- 1.0 = >70% business navigation (clear company)

**Output:**
```typescript
{
  has_business_nav: boolean,
  business_nav_percentage: number, // 0-1
  nav_items_classified: {
    business: string[],
    content: string[],
    other: string[]
  }
}
```

### 4. Monetization Detector
**Purpose:** Identify revenue model (ads/affiliates vs business)

**Detection Logic:**
- **Ad signals:**
  - Google AdSense tags (`googlesyndication.com`)
  - Ad network scripts (DoubleClick, Media.net)
  - Banner ad containers (`<div class="ad">`)
  - "Sponsored" / "Advertisement" labels

- **Affiliate signals:**
  - Amazon affiliate links
  - Affiliate disclosure text
  - Product review widgets
  - Affiliate URL parameters (`aff=`, `ref=`)

- **Business signals:**
  - Payment provider scripts (Stripe, PayPal, Braintree)
  - Checkout forms
  - E-commerce platforms (Shopify, WooCommerce)

**Scoring:**
- 0.0 = Ads/affiliates only (publication monetization)
- 0.5 = Mixed monetization
- 1.0 = Business monetization only

**Output:**
```typescript
{
  monetization_type: 'ads' | 'affiliates' | 'business' | 'mixed' | 'unknown',
  ad_networks_detected: string[],
  affiliate_patterns_detected: string[]
}
```

## Aggregation & Decision Logic

### Publication Score Calculation
```typescript
publication_score = (
  product_offering_score +
  layout_score +
  navigation_score +
  monetization_score
) / 4
```

**Interpretation:**
- 0.0-0.3: Clearly a publication (reject)
- 0.3-0.65: Likely a publication (reject if ≥ threshold)
- 0.65-1.0: Likely a company (pass to Layer 3)

**Default Threshold:** 0.65 (reject if publication_score ≥ 0.65)

### Decision Logic
```typescript
if (publication_score >= rules.publication_score_threshold) {
  return {
    passed: false,
    reasoning: `REJECT Layer 2 - Pure publication detected (score: ${publication_score.toFixed(2)})`,
    signals: { publication_score, ...detailedSignals }
  };
} else {
  return {
    passed: true,
    reasoning: `PASS Layer 2 - Company detected (score: ${publication_score.toFixed(2)})`,
    signals: { publication_score, ...detailedSignals }
  };
}
```

## Data Structures

### Layer2Rules Configuration
```typescript
interface Layer2Rules {
  // Detection threshold
  publication_score_threshold: number; // 0.65 default (≥ this = reject)

  // Product offering keywords (all lowercase)
  product_keywords: {
    commercial: string[];  // ["pricing", "buy", "demo", "plans", "free trial"]
    features: string[];    // ["features", "capabilities", "solutions", "product"]
    cta: string[];         // ["get started", "sign up", "start free", "book a call"]
  };

  // Navigation classification
  business_nav_keywords: string[];     // ["product", "pricing", "solutions", "about", "careers"]
  content_nav_keywords: string[];      // ["articles", "blog", "news", "topics", "categories"]
  min_business_nav_percentage: number; // 0.3 default (30%)

  // Monetization detection
  ad_network_patterns: string[];       // ["googlesyndication", "adsense", "doubleclick"]
  affiliate_patterns: string[];        // ["amazon", "affiliate", "aff=", "ref="]
  payment_provider_patterns: string[]; // ["stripe", "paypal", "braintree"]
}
```

### Layer2Signals Output
```typescript
interface Layer2Signals {
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
  publication_score: number;         // 0-1 (average of 4 module scores)
  module_scores: {
    product_offering: number;
    layout: number;
    navigation: number;
    monetization: number;
  };
}
```

### Layer2FilterResult
```typescript
interface Layer2FilterResult {
  passed: boolean;                   // false if publication_score ≥ threshold
  reasoning: string;                 // Human-readable decision explanation
  signals: Layer2Signals;            // Detailed detection results
  processingTimeMs: number;          // Performance tracking
}
```

## Implementation Details

### Service Structure
```typescript
@Injectable()
export class Layer2OperationalFilterService {
  constructor(
    private readonly scraperService: ScraperService,
    private readonly settingsService: SettingsService,
  ) {}

  async filterUrl(url: string): Promise<Layer2FilterResult> {
    // 1. Load rules from database
    const rules = await this.loadLayer2Rules();

    // 2. Scrape homepage
    const scrapeResult = await this.scraperService.fetchUrl(url);
    if (!scrapeResult.success) {
      return this.createPassThroughResult('Scraping failed');
    }

    // 3. Parse HTML
    const $ = cheerio.load(scrapeResult.content);

    // 4. Run detection modules in parallel
    const [productSignals, layoutSignals, navSignals, monetizationSignals] =
      await Promise.all([
        this.detectProductOffering($, scrapeResult.content, rules),
        this.analyzeHomepageLayout($, scrapeResult.content),
        this.parseNavigation($, scrapeResult.content, rules),
        this.detectMonetization($, scrapeResult.content, rules),
      ]);

    // 5. Calculate publication score
    const publication_score = (
      productSignals.product_confidence +
      layoutSignals.layout_confidence +
      (1 - navSignals.business_nav_percentage) + // Invert: low business nav = high pub score
      (monetizationSignals.monetization_type === 'ads' ? 1.0 :
       monetizationSignals.monetization_type === 'business' ? 0.0 : 0.5)
    ) / 4;

    // 6. Make decision
    const passed = publication_score < rules.publication_score_threshold;

    return {
      passed,
      reasoning: passed
        ? `PASS Layer 2 - Company site detected (score: ${publication_score.toFixed(2)})`
        : `REJECT Layer 2 - Pure publication detected (score: ${publication_score.toFixed(2)})`,
      signals: {
        publication_score,
        module_scores: {
          product_offering: productSignals.product_confidence,
          layout: layoutSignals.layout_confidence,
          navigation: navSignals.business_nav_percentage,
          monetization: monetizationSignals.monetization_type === 'business' ? 1.0 : 0.0,
        },
        ...productSignals,
        ...layoutSignals,
        ...navSignals,
        ...monetizationSignals,
      },
      processingTimeMs: Date.now() - startTime,
    };
  }

  private detectProductOffering($, html, rules): ProductOfferingSignals { /* ... */ }
  private analyzeHomepageLayout($, html): LayoutSignals { /* ... */ }
  private parseNavigation($, html, rules): NavigationSignals { /* ... */ }
  private detectMonetization($, html, rules): MonetizationSignals { /* ... */ }
}
```

### Error Handling Strategy
- **Scraping failure:** Pass through to Layer 3 (fail-open)
- **HTML parsing error:** Pass through (don't reject on technical failure)
- **Incomplete signals:** Require minimum 2/4 modules working, score only available modules
- **Network timeout:** Pass through after 10s timeout
- **Invalid HTML:** Use Cheerio's lenient parsing mode

### Performance Targets
- **Target processing time:** <2s per URL (scraping + analysis)
- **Scraping:** ~1s (cached by ScraperService)
- **Detection modules:** ~500ms total (parallelized)
- **Cheerio parsing:** <100ms (synchronous, no DOM rendering)

## UI Design: Layer 2 Settings

### Location
`/settings` page → **"Layer 2: Publication Detection"** tab

### Layout
```
┌─ Layer 2 Rules Tab ────────────────────────────────────┐
│                                                         │
│  📊 Detection Threshold                                 │
│  ├─ Publication Score Threshold: [slider 0────●──1]    │
│  │   Current: 0.65  (Higher = stricter filtering)      │
│  └─ Help text: URLs scoring above this are rejected    │
│      as pure publications                               │
│                                                         │
│  🏢 Product Offering Detection                          │
│  ├─ Commercial Keywords                                 │
│  │   [pricing] [buy] [demo] [plans] [+ Add]            │
│  ├─ Feature Keywords                                    │
│  │   [features] [capabilities] [solutions] [+ Add]     │
│  └─ CTA Keywords                                        │
│      [get started] [sign up] [free trial] [+ Add]      │
│                                                         │
│  🧭 Navigation Analysis                                 │
│  ├─ Business Nav Keywords                               │
│  │   [product] [pricing] [solutions] [about] [+ Add]   │
│  ├─ Content Nav Keywords                                │
│  │   [articles] [blog] [news] [topics] [+ Add]         │
│  └─ Min Business Nav %: [slider 0────●──100]           │
│      Current: 30% (Sites below this are flagged)       │
│                                                         │
│  💰 Monetization Detection                              │
│  ├─ Ad Network Patterns                                 │
│  │   [googlesyndication] [adsense] [doubleclick] [+]   │
│  ├─ Affiliate Patterns                                  │
│  │   [amazon] [affiliate] [aff=] [ref=] [+ Add]        │
│  └─ Payment Provider Patterns                           │
│      [stripe] [paypal] [braintree] [+ Add]             │
│                                                         │
│  [Reset to Defaults]  [Save Changes]                   │
└─────────────────────────────────────────────────────────┘
```

### Component Requirements

1. **Threshold Slider**
   - Range: 0.0-1.0
   - Step: 0.05
   - Default: 0.65
   - Live value display
   - Helper text explaining impact

2. **Keyword Tag Inputs**
   - Reuse tag input component from Layer 1
   - Add/remove keywords dynamically
   - Validation: non-empty, trimmed, lowercase
   - Placeholder text with examples

3. **Business Nav % Slider**
   - Range: 0-100
   - Step: 5
   - Default: 30
   - Percentage display
   - Helper text explaining threshold

4. **Action Buttons**
   - **Save Changes:** Validate + persist to database
   - **Reset to Defaults:** Reload default rules
   - Show loading state during save
   - Success/error toast notifications

### Validation Rules
- `publication_score_threshold`: 0-1, default 0.65
- All keyword arrays: strings, trimmed, lowercase
- `min_business_nav_percentage`: 0-1 (UI shows 0-100%), default 0.3
- All patterns: non-empty strings

## Settings Integration

### Database Storage
- Store in `classification_settings.layer2_rules` JSONB column
- Structure matches `Layer2Rules` interface
- Load via `SettingsService.getSettings()`
- Fallback to defaults if database unavailable

### DTO Validation
```typescript
// apps/api/src/settings/dto/layer2-rules.dto.ts
class Layer2RulesDto {
  @IsNumber()
  @Min(0)
  @Max(1)
  publication_score_threshold: number;

  @ValidateNested()
  @Type(() => ProductKeywordsDto)
  product_keywords: ProductKeywordsDto;

  @IsArray()
  @IsString({ each: true })
  business_nav_keywords: string[];

  @IsArray()
  @IsString({ each: true })
  content_nav_keywords: string[];

  @IsNumber()
  @Min(0)
  @Max(1)
  min_business_nav_percentage: number;

  @IsArray()
  @IsString({ each: true })
  ad_network_patterns: string[];

  @IsArray()
  @IsString({ each: true })
  affiliate_patterns: string[];

  @IsArray()
  @IsString({ each: true })
  payment_provider_patterns: string[];
}
```

### Default Values
```typescript
const DEFAULT_LAYER2_RULES: Layer2Rules = {
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

## Testing Strategy

### Unit Tests (Detection Modules)

**1. Product Offering Detector:**
```typescript
describe('detectProductOffering', () => {
  it('detects SaaS pricing pages', () => {
    const html = '<h1>Pricing</h1><p>$99/month</p><button>Get Started</button>';
    const result = detectProductOffering($, html, rules);
    expect(result.has_product_offering).toBe(true);
    expect(result.product_confidence).toBeGreaterThan(0.7);
    expect(result.detected_product_keywords).toContain('pricing');
  });

  it('rejects pure blog homepages', () => {
    const html = '<h2>Latest Articles</h2><article><h3>Post Title</h3></article>';
    const result = detectProductOffering($, html, rules);
    expect(result.has_product_offering).toBe(false);
    expect(result.product_confidence).toBeLessThan(0.3);
  });
});
```

**2. Homepage Layout Analyzer:**
```typescript
describe('analyzeHomepageLayout', () => {
  it('identifies blog-style homepages', () => {
    const html = '<div class="posts"><article>...</article><article>...</article></div>';
    const result = analyzeHomepageLayout($, html);
    expect(result.homepage_is_blog).toBe(true);
    expect(result.layout_type).toBe('blog');
  });

  it('identifies marketing landing pages', () => {
    const html = '<section class="hero"><h1>Transform Your Business</h1><button>Start Free Trial</button></section>';
    const result = analyzeHomepageLayout($, html);
    expect(result.homepage_is_blog).toBe(false);
    expect(result.layout_type).toBe('marketing');
  });
});
```

**3. Navigation Parser:**
```typescript
describe('parseNavigation', () => {
  it('detects content-only navigation', () => {
    const html = '<nav><a>Articles</a><a>Topics</a><a>Authors</a></nav>';
    const result = parseNavigation($, html, rules);
    expect(result.has_business_nav).toBe(false);
    expect(result.business_nav_percentage).toBeLessThan(0.3);
  });

  it('detects business navigation', () => {
    const html = '<nav><a>Product</a><a>Pricing</a><a>About</a><a>Blog</a></nav>';
    const result = parseNavigation($, html, rules);
    expect(result.has_business_nav).toBe(true);
    expect(result.business_nav_percentage).toBeGreaterThan(0.5);
  });
});
```

**4. Monetization Detector:**
```typescript
describe('detectMonetization', () => {
  it('detects ad networks', () => {
    const html = '<script src="googlesyndication.com/adsbygoogle.js"></script>';
    const result = detectMonetization($, html, rules);
    expect(result.monetization_type).toBe('ads');
    expect(result.ad_networks_detected).toContain('googlesyndication');
  });

  it('detects payment providers', () => {
    const html = '<script src="js.stripe.com/v3/"></script>';
    const result = detectMonetization($, html, rules);
    expect(result.monetization_type).toBe('business');
  });
});
```

### Integration Tests (Real URLs)

**Pure Publications (should REJECT):**
```typescript
const publicationUrls = [
  'https://techcrunch.com',
  'https://arstechnica.com',
  'https://medium.com',
  'https://theverge.com',
  'https://wired.com',
];

publicationUrls.forEach(url => {
  it(`rejects ${url} as pure publication`, async () => {
    const result = await layer2Service.filterUrl(url);
    expect(result.passed).toBe(false);
    expect(result.signals.publication_score).toBeGreaterThanOrEqual(0.65);
  });
});
```

**Companies with Blogs (should PASS):**
```typescript
const companyUrls = [
  'https://hubspot.com',
  'https://atlassian.com',
  'https://stripe.com',
  'https://shopify.com',
  'https://segment.com',
];

companyUrls.forEach(url => {
  it(`passes ${url} as company with blog`, async () => {
    const result = await layer2Service.filterUrl(url);
    expect(result.passed).toBe(true);
    expect(result.signals.publication_score).toBeLessThan(0.65);
  });
});
```

**Edge Cases:**
```typescript
describe('Edge cases', () => {
  it('handles company news sections correctly', async () => {
    const url = 'https://microsoft.com/news';
    const result = await layer2Service.filterUrl(url);
    // Should still pass because main site has business nav
    expect(result.passed).toBe(true);
  });

  it('handles blogs that are company homepages', async () => {
    const url = 'https://blog.company.com'; // Subdomain but company-owned
    // Ambiguous case - if product nav exists, should pass
    const result = await layer2Service.filterUrl(url);
    // Test based on actual signals detected
  });
});
```

### Performance Tests
```typescript
describe('Performance', () => {
  it('processes URLs within 2s target', async () => {
    const startTime = Date.now();
    await layer2Service.filterUrl('https://example.com');
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(2000);
  });

  it('handles batch processing efficiently', async () => {
    const urls = Array(10).fill('https://example.com');
    const startTime = Date.now();
    await Promise.all(urls.map(url => layer2Service.filterUrl(url)));
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(5000); // 10 URLs in < 5s
  });
});
```

## Migration Plan

### Phase 1: Development & Testing (Week 1)
1. ✅ Design approval (this document)
2. Implement new detection modules
3. Write comprehensive unit tests
4. Test against real URLs (publications + companies)
5. Tune default thresholds for target rejection rate

### Phase 2: Parallel Run (Week 2)
1. Deploy new Layer 2 alongside old Layer 2
2. Run both detectors on same URLs
3. Log discrepancies (old PASS, new REJECT and vice versa)
4. Analyze false positives/negatives
5. Adjust thresholds based on production data

### Phase 3: UI & Settings (Week 2)
1. Build Layer 2 settings UI (tab + components)
2. Add validation for all Layer2Rules fields
3. Test settings persistence (save/load from database)
4. Migrate default values to all existing installations

### Phase 4: Full Cutover (Week 3)
1. Switch primary Layer 2 to new publication detector
2. Remove old Layer 2 code (company pages, tech stack, etc.)
3. Update manual review UI to show new signals
4. Monitor rejection rates and user feedback

### Phase 5: Refinement (Week 4+)
1. Collect user feedback on detection accuracy
2. Iterate on keyword lists and thresholds
3. Add more sophisticated patterns if needed
4. Consider ML model for publication detection (future)

## Backward Compatibility

### Old Layer2Signals Structure
```typescript
// OLD (deprecated)
interface Layer2Signals {
  company_pages: CompanyPageSignals;
  blog_data: BlogDataSignals;
  tech_stack: TechStackSignals;
  design_quality: DesignQualitySignals;
}
```

### Migration Strategy
- Keep old signals during parallel run phase
- Map new signals to old structure for manual review display:
  - `company_pages` → Derived from `has_business_nav`
  - `blog_data` → Derived from `homepage_is_blog`
  - `tech_stack` → Empty (not checked anymore)
  - `design_quality` → Empty (not checked anymore)
- Remove old signals after cutover

### Database Schema
No schema changes needed - `layer2_rules` already exists as JSONB column in `classification_settings` table. Just need to populate new structure.

## Success Metrics

### Primary Metrics
- **Rejection Rate:** 20-30% of URLs at Layer 2 (target range)
- **False Positive Rate:** <5% (rejecting actual companies)
- **Processing Time:** <2s average per URL
- **Cost Savings:** Reduce Layer 3 LLM calls by 20-30%

### Monitoring Dashboards
1. **Detection Effectiveness:**
   - Rejection rate over time
   - Publication score distribution
   - Module score breakdown

2. **Accuracy Tracking:**
   - Manual review overrides (user approves rejected URL)
   - False positive reports
   - URL classification appeals

3. **Performance:**
   - Average processing time per URL
   - Scraping vs detection time breakdown
   - Timeout rate

4. **User Engagement:**
   - Settings modification frequency
   - Custom keyword additions
   - Threshold adjustments

## Future Enhancements

### Short-term (3-6 months)
1. **Multi-page Analysis:** Optionally scrape /about and /product pages for stronger signals
2. **Domain Reputation:** Integrate domain authority scores (Moz, Ahrefs)
3. **Historical Data:** Track URL classification changes over time

### Long-term (6-12 months)
1. **ML Model:** Train classifier on labeled publication vs company dataset
2. **Feedback Loop:** Learn from manual review decisions
3. **Industry-specific Rules:** Custom detection for different verticals
4. **A/B Testing Framework:** Test different threshold configurations

## Risks & Mitigations

### Risk 1: High False Positive Rate
**Impact:** Rejecting legitimate company sites
**Mitigation:**
- Start with conservative threshold (0.65, not 0.5)
- Monitor manual review overrides
- Allow user to adjust threshold easily
- Fail-open on errors (pass to Layer 3)

### Risk 2: Publication Score Miscalibration
**Impact:** Not filtering enough publications
**Mitigation:**
- Test against large dataset of known publications
- Iterate on scoring algorithm during parallel run
- Collect user feedback on detection accuracy
- Add manual override option in UI

### Risk 3: Performance Degradation
**Impact:** Slow processing, increased costs
**Mitigation:**
- Parallelize detection modules
- Cache scraping results (already done)
- Set aggressive timeouts (10s max)
- Monitor processing time metrics

### Risk 4: Keyword List Maintenance
**Impact:** Outdated patterns reduce accuracy
**Mitigation:**
- Make keywords fully configurable by users
- Provide sensible defaults
- Document pattern update process
- Consider auto-learning from manual reviews

## Appendix: Example Detections

### Example 1: TechCrunch (Pure Publication)
```typescript
{
  passed: false,
  reasoning: "REJECT Layer 2 - Pure publication detected (score: 0.85)",
  signals: {
    publication_score: 0.85,
    module_scores: {
      product_offering: 0.1,  // No product
      layout: 0.9,            // Pure blog layout
      navigation: 0.9,        // Content-only nav
      monetization: 1.0       // Ad networks detected
    },
    has_product_offering: false,
    homepage_is_blog: true,
    has_business_nav: false,
    monetization_type: 'ads'
  }
}
```

### Example 2: HubSpot (Company with Blog)
```typescript
{
  passed: true,
  reasoning: "PASS Layer 2 - Company site detected (score: 0.25)",
  signals: {
    publication_score: 0.25,
    module_scores: {
      product_offering: 0.9,  // Clear pricing/demo
      layout: 0.2,            // Marketing landing page
      navigation: 0.1,        // Strong business nav
      monetization: 0.0       // Payment providers
    },
    has_product_offering: true,
    homepage_is_blog: false,
    has_business_nav: true,
    monetization_type: 'business'
  }
}
```

### Example 3: Mixed Case (Borderline)
```typescript
{
  passed: true, // Just under threshold
  reasoning: "PASS Layer 2 - Company site detected (score: 0.62)",
  signals: {
    publication_score: 0.62,
    module_scores: {
      product_offering: 0.5,  // Weak product signals
      layout: 0.6,            // Mixed layout
      navigation: 0.4,        // Some business nav
      monetization: 0.5       // Mixed monetization
    },
    has_product_offering: true,
    homepage_is_blog: false,
    has_business_nav: true,
    monetization_type: 'mixed'
  }
}
```

## Approval & Next Steps

**Design Status:** ✅ Approved
**Next Phase:** Worktree setup and implementation planning

**Action Items:**
1. Set up git worktree for isolated development
2. Create detailed implementation plan with task breakdown
3. Begin Phase 1 development (detection modules)
4. Schedule design review after initial implementation
