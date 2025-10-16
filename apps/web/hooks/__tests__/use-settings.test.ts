import { buildUpdatePayload } from '../useSettings';
import { ClassificationSettings } from '@website-scraper/shared';

describe('buildUpdatePayload', () => {
  it('strips metadata and includes layer-specific fields', () => {
    const settings = {
      id: 'test-id',
      prefilter_rules: [
        {
          category: 'test',
          pattern: '^example\\.com$',
          reasoning: 'Sample rule',
          enabled: 'true' as unknown as boolean,
        },
      ],
      classification_indicators: ['Indicator 1'],
      llm_temperature: 0.45,
      confidence_threshold: 0.55,
      content_truncation_limit: 12000,
      layer1_rules: {
        tld_filters: { commercial: ['.com'], non_commercial: [], personal: [] },
        industry_keywords: ['SaaS'],
        url_pattern_exclusions: [],
        target_elimination_rate: 0.5,
      },
      layer2_rules: {
        blog_freshness_days: 90,
        required_pages_count: 2,
        required_pages: ['about', 'team'],
        min_tech_stack_tools: 2,
        tech_stack_tools: { analytics: [], marketing: [] },
        min_design_quality_score: 6,
      },
      layer3_rules: {
        content_marketing_indicators: [],
        seo_investment_signals: [],
        llm_temperature: 0.3,
        content_truncation_limit: 10000,
      },
      confidence_bands: {
        high: { min: 0.8, max: 1.0, action: 'auto_approve' },
        medium: { min: 0.5, max: 0.79, action: 'manual_review' },
        low: { min: 0.3, max: 0.49, action: 'manual_review' },
        auto_reject: { min: 0.0, max: 0.29, action: 'reject' },
      },
      manual_review_settings: {
        queue_size_limit: null,
        auto_review_timeout_days: null,
        notifications: {
          email_threshold: 100,
          dashboard_badge: true,
          slack_integration: false,
        },
      },
      updated_at: '2025-10-16T00:00:00.000Z',
    } satisfies ClassificationSettings;

    const payload = buildUpdatePayload(settings);

    expect(payload).toEqual({
      // Layer-specific fields (Story 3.0)
      layer1_rules: settings.layer1_rules,
      layer2_rules: settings.layer2_rules,
      layer3_rules: settings.layer3_rules,
      confidence_bands: settings.confidence_bands,
      manual_review_settings: settings.manual_review_settings,
      // V1 fields for backward compatibility
      prefilter_rules: [
        {
          category: 'test',
          pattern: '^example\\.com$',
          reasoning: 'Sample rule',
          enabled: true,
        },
      ],
      classification_indicators: ['Indicator 1'],
      llm_temperature: 0.45,
      confidence_threshold: 0.55,
      content_truncation_limit: 12000,
    });
  });
});
