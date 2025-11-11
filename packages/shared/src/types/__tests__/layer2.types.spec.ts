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
