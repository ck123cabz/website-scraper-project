import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { UrlResult } from '@website-scraper/shared';

export function createPerformanceQueryWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

export function buildMockResult(index: number): UrlResult {
  return {
    id: `result-${index}`,
    url: `https://example-${index}.com/page/${index}`,
    job_id: 'job-123',
    url_id: `url-${index}`,
    confidence_score: 0.8,
    confidence_band: 'high',
    eliminated_at_layer: 'passed_all',
    processing_time_ms: 1500,
    total_cost: 0.03,
    retry_count: 0,
    last_error: null,
    last_retry_at: null,
    processed_at: new Date('2025-01-01T00:00:00Z'),
    layer1_factors: {
      tld_type: 'gtld',
      tld_value: '.com',
      domain_classification: 'commercial',
      pattern_matches: ['keyword'],
      target_profile: {
        type: 'B2B software',
        confidence: 0.92,
      },
      reasoning: 'Simulated reasoning',
      passed: true,
    },
    layer2_factors: {
      publication_score: 0.78,
      module_scores: {
        product_offering: 0.8,
        layout_quality: 0.75,
        navigation_complexity: 0.7,
        monetization_indicators: 0.65,
      },
      keywords_found: ['pricing', 'enterprise'],
      ad_networks_detected: [],
      content_signals: {
        has_blog: true,
        has_press_releases: true,
        has_whitepapers: true,
        has_case_studies: true,
      },
      reasoning: 'Publication detection reasoning',
      passed: true,
    },
    layer3_factors: {
      classification: 'accepted',
      sophistication_signals: {
        design_quality: { score: 0.85, indicators: ['Modern UI'] },
        authority_indicators: { score: 0.8, indicators: ['Awards'] },
        professional_presentation: { score: 0.82, indicators: ['Style guide'] },
        content_originality: { score: 0.79, indicators: ['Research'] },
      },
      llm_provider: 'openai',
      model_version: 'gpt-4.1-mini',
      cost_usd: 0.05,
      reasoning: 'Sophistication reasoning',
      tokens_used: { input: 900, output: 300 },
      processing_time_ms: 2200,
    },
    status: 'approved',
    reviewer_notes: null,
    created_at: new Date('2025-01-01T00:00:00Z'),
    updated_at: new Date('2025-01-01T00:00:00Z'),
  };
}

export function buildMockResults(count: number): UrlResult[] {
  return Array.from({ length: count }, (_, i) => buildMockResult(i));
}
