'use client';

import React from 'react';
import type { Layer2Rules } from '@website-scraper/shared';
import { SliderInput } from './SliderInput';
import { KeywordArrayInput } from './KeywordArrayInput';
import { PatternArrayInput } from './PatternArrayInput';

interface Layer2PublicationTabProps {
  rules: Layer2Rules;
  onChange: (rules: Layer2Rules) => void;
  errors?: Record<string, string>;
}

export function Layer2PublicationTab({ rules, onChange, errors }: Layer2PublicationTabProps) {
  return (
    <div className="space-y-8 p-6">
      {/* Detection Threshold */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          📊 Detection Threshold
        </h3>
        <SliderInput
          label="Publication Score Threshold"
          value={rules.publication_score_threshold}
          min={0}
          max={1}
          step={0.05}
          onChange={(value) => onChange({ ...rules, publication_score_threshold: value })}
          helpText="URLs scoring ≥ this value are rejected as pure publications. Lower = more strict, Higher = more lenient."
        />
      </section>

      {/* Product Offering Detection */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          🏢 Product Offering Detection
        </h3>
        <KeywordArrayInput
          label="Commercial Keywords"
          value={rules.product_keywords.commercial}
          onChange={(value) => onChange({ ...rules, product_keywords: { ...rules.product_keywords, commercial: value } })}
          helpText="Keywords indicating commercial offerings (e.g., pricing, buy, demo)"
        />
        <KeywordArrayInput
          label="Feature Keywords"
          value={rules.product_keywords.features}
          onChange={(value) => onChange({ ...rules, product_keywords: { ...rules.product_keywords, features: value } })}
          helpText="Keywords indicating product features (e.g., features, capabilities)"
        />
        <KeywordArrayInput
          label="CTA Keywords"
          value={rules.product_keywords.cta}
          onChange={(value) => onChange({ ...rules, product_keywords: { ...rules.product_keywords, cta: value } })}
          helpText="Call-to-action keywords (e.g., get started, sign up)"
        />
      </section>

      {/* Navigation Analysis */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          🧭 Navigation Analysis
        </h3>
        <KeywordArrayInput
          label="Business Nav Keywords"
          value={rules.business_nav_keywords}
          onChange={(value) => onChange({ ...rules, business_nav_keywords: value })}
          helpText="Keywords for business navigation (e.g., product, pricing, solutions)"
        />
        <KeywordArrayInput
          label="Content Nav Keywords"
          value={rules.content_nav_keywords}
          onChange={(value) => onChange({ ...rules, content_nav_keywords: value })}
          helpText="Keywords for content navigation (e.g., articles, blog, news)"
        />
        <SliderInput
          label="Min Business Nav %"
          value={rules.min_business_nav_percentage * 100}
          min={0}
          max={100}
          step={5}
          onChange={(value) => onChange({ ...rules, min_business_nav_percentage: value / 100 })}
          helpText="Minimum percentage of business navigation required. Sites below this are flagged as publications."
        />
      </section>

      {/* Monetization Detection */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          💰 Monetization Detection
        </h3>
        <PatternArrayInput
          label="Ad Network Patterns"
          value={rules.ad_network_patterns}
          onChange={(value) => onChange({ ...rules, ad_network_patterns: value })}
          helpText="URL patterns for ad networks (e.g., googlesyndication, adsense)"
        />
        <PatternArrayInput
          label="Affiliate Patterns"
          value={rules.affiliate_patterns}
          onChange={(value) => onChange({ ...rules, affiliate_patterns: value })}
          helpText="URL patterns for affiliate links (e.g., amazon, affiliate, aff=)"
        />
        <PatternArrayInput
          label="Payment Provider Patterns"
          value={rules.payment_provider_patterns}
          onChange={(value) => onChange({ ...rules, payment_provider_patterns: value })}
          helpText="URL patterns for payment providers (e.g., stripe, paypal)"
        />
      </section>
    </div>
  );
}
