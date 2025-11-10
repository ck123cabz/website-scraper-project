import {
  ManualReviewQueueEntry,
  Layer1Results,
  Layer2Results,
  Layer3Results,
} from '@website-scraper/shared/types/manual-review';

/**
 * Factory function to create a ManualReviewQueueEntry with sensible defaults
 * for testing purposes
 */
export function createMockQueueEntry(
  overrides: Partial<ManualReviewQueueEntry> = {},
): ManualReviewQueueEntry {
  const now = new Date();

  return {
    id: overrides.id || '550e8400-e29b-41d4-a716-446655440000',
    url: overrides.url || 'https://example.com/guest-post',
    job_id: overrides.job_id || '660e8400-e29b-41d4-a716-446655440000',
    url_id: overrides.url_id || '770e8400-e29b-41d4-a716-446655440000',
    confidence_band: overrides.confidence_band || 'medium',
    confidence_score: overrides.confidence_score ?? 0.67,
    reasoning: overrides.reasoning || 'Moderate sophistication with some guest post indicators',
    sophistication_signals: overrides.sophistication_signals || {
      design_quality: 0.7,
      content_originality: 0.6,
      authority_indicators: 0.65,
    },
    layer1_results: overrides.layer1_results || createMockLayer1Results(),
    layer2_results: overrides.layer2_results || createMockLayer2Results(),
    layer3_results: overrides.layer3_results || createMockLayer3Results(),
    queued_at: overrides.queued_at || now,
    reviewed_at: overrides.reviewed_at || null,
    review_decision: overrides.review_decision || null,
    reviewer_notes: overrides.reviewer_notes || null,
    is_stale: overrides.is_stale ?? false,
    created_at: overrides.created_at || now,
    updated_at: overrides.updated_at || now,
  };
}

/**
 * Factory function for Layer 1 domain analysis test data
 */
export function createMockLayer1Results(
  overrides: Partial<Layer1Results> = {},
): Layer1Results {
  return {
    domain_age: {
      checked: true,
      passed: true,
      value: 365,
      threshold: 180,
      ...overrides.domain_age,
    },
    tld_type: {
      checked: true,
      passed: false,
      value: 'info',
      red_flags: ['.info', '.biz'],
      ...overrides.tld_type,
    },
    registrar_reputation: {
      checked: true,
      passed: true,
      value: 'GoDaddy',
      ...overrides.registrar_reputation,
    },
    whois_privacy: {
      checked: true,
      passed: false,
      enabled: true,
      ...overrides.whois_privacy,
    },
    ssl_certificate: {
      checked: true,
      passed: true,
      valid: true,
      issuer: "Let's Encrypt",
      ...overrides.ssl_certificate,
    },
  };
}

/**
 * Factory function for Layer 2 rule-based checks test data
 */
export function createMockLayer2Results(
  overrides: Partial<Layer2Results> = {},
): Layer2Results {
  return {
    guest_post_red_flags: {
      contact_page: { checked: true, detected: true },
      author_bio: { checked: true, detected: false },
      pricing_page: { checked: true, detected: true },
      submit_content: { checked: true, detected: false },
      write_for_us: { checked: true, detected: true },
      guest_post_guidelines: { checked: true, detected: false },
      ...overrides.guest_post_red_flags,
    },
    content_quality: {
      thin_content: {
        checked: true,
        detected: false,
        word_count: 1200,
        threshold: 500,
      },
      excessive_ads: { checked: true, detected: false },
      broken_links: { checked: true, detected: false, count: 0 },
      ...overrides.content_quality,
    },
  };
}

/**
 * Factory function for Layer 3 LLM sophistication signals test data
 */
export function createMockLayer3Results(
  overrides: Partial<Layer3Results> = {},
): Layer3Results {
  return {
    design_quality: {
      score: 0.7,
      detected: true,
      reasoning: 'Clean layout with modern design principles',
      ...overrides.design_quality,
    },
    content_originality: {
      score: 0.6,
      detected: true,
      reasoning: 'Mixed original and templated content',
      ...overrides.content_originality,
    },
    authority_indicators: {
      score: 0.65,
      detected: true,
      reasoning: 'Some authority signals present (author bio, citations)',
      ...overrides.authority_indicators,
    },
    professional_presentation: {
      score: 0.72,
      detected: true,
      reasoning: 'Professional formatting and structure',
      ...overrides.professional_presentation,
    },
  };
}

/**
 * Create a queue entry for high confidence band (auto_approve)
 */
export function createHighConfidenceQueueEntry(
  overrides: Partial<ManualReviewQueueEntry> = {},
): ManualReviewQueueEntry {
  return createMockQueueEntry({
    confidence_band: 'high',
    confidence_score: 0.92,
    layer1_results: createMockLayer1Results({
      tld_type: { checked: true, passed: true, value: 'com' },
      whois_privacy: { checked: true, passed: true, enabled: false },
    }),
    layer2_results: createMockLayer2Results({
      guest_post_red_flags: {
        contact_page: { checked: true, detected: false },
        author_bio: { checked: true, detected: false },
        pricing_page: { checked: true, detected: false },
        submit_content: { checked: true, detected: false },
        write_for_us: { checked: true, detected: false },
        guest_post_guidelines: { checked: true, detected: false },
      },
    }),
    ...overrides,
  });
}

/**
 * Create a queue entry for low confidence band (manual_review or reject)
 */
export function createLowConfidenceQueueEntry(
  overrides: Partial<ManualReviewQueueEntry> = {},
): ManualReviewQueueEntry {
  return createMockQueueEntry({
    confidence_band: 'low',
    confidence_score: 0.35,
    reasoning: 'Multiple red flags and low sophistication signals',
    layer2_results: createMockLayer2Results({
      guest_post_red_flags: {
        contact_page: { checked: true, detected: true },
        author_bio: { checked: true, detected: true },
        pricing_page: { checked: true, detected: true },
        submit_content: { checked: true, detected: true },
        write_for_us: { checked: true, detected: true },
        guest_post_guidelines: { checked: true, detected: true },
      },
    }),
    layer3_results: createMockLayer3Results({
      design_quality: { score: 0.3, detected: false, reasoning: 'Poor design' },
      content_originality: { score: 0.25, detected: false, reasoning: 'Templated content' },
      authority_indicators: { score: 0.2, detected: false, reasoning: 'No authority signals' },
      professional_presentation: { score: 0.35, detected: false, reasoning: 'Unprofessional' },
    }),
    ...overrides,
  });
}

/**
 * Create a stale queue entry (queued more than timeout days ago)
 */
export function createStaleQueueEntry(
  daysAgo: number = 8,
  overrides: Partial<ManualReviewQueueEntry> = {},
): ManualReviewQueueEntry {
  const queuedAt = new Date();
  queuedAt.setDate(queuedAt.getDate() - daysAgo);

  return createMockQueueEntry({
    queued_at: queuedAt,
    is_stale: true,
    ...overrides,
  });
}

/**
 * Create a reviewed queue entry (soft-deleted)
 */
export function createReviewedQueueEntry(
  decision: 'approved' | 'rejected',
  overrides: Partial<ManualReviewQueueEntry> = {},
): ManualReviewQueueEntry {
  return createMockQueueEntry({
    reviewed_at: new Date(),
    review_decision: decision,
    reviewer_notes: decision === 'approved'
      ? 'Looks legitimate'
      : 'Clear guest post site',
    ...overrides,
  });
}
