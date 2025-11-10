'use client';

import { Layer1Results, Layer2Results, Layer3Results } from '@website-scraper/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface FactorBreakdownProps {
  layer1?: Layer1Results;
  layer2?: Layer2Results;
  layer3?: Layer3Results;
  isLoading?: boolean;
}

/**
 * FactorBreakdown Component (Phase 4: T019)
 *
 * Displays all Layer 1, 2, and 3 evaluation results with visual indicators.
 * Shows checkmarks (✓) for passed factors and X marks (✗) for failed factors.
 *
 * Success Criteria (SC-011):
 * - Factor breakdown displays all Layer 1, 2, 3 results with visual indicators in <3 seconds
 *
 * Features:
 * - Layer 1: Domain Analysis (5 factors)
 * - Layer 2: Guest Post Red Flags (6 flags) + Content Quality (3 checks)
 * - Layer 3: Sophistication Signals (4 signals)
 * - Color-coded visual indicators (green/red)
 * - Optional reasoning/details for each factor
 */
export function FactorBreakdown({
  layer1,
  layer2,
  layer3,
  isLoading,
}: FactorBreakdownProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="h-32 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div data-testid="factor-breakdown" className="space-y-4">
      {/* Layer 1: Domain Analysis */}
      {layer1 && (
        <Card data-testid="layer1-section">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Layer 1: Domain Analysis</CardTitle>
            <CardDescription>Domain reputation and registration details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Domain Age */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-sm">Domain Age</p>
                {layer1.domain_age.value && (
                  <p className="text-xs text-muted-foreground">
                    {layer1.domain_age.value} days
                    {layer1.domain_age.threshold && ` (min: ${layer1.domain_age.threshold})`}
                  </p>
                )}
              </div>
              <FactorIndicator
                passed={layer1.domain_age.passed}
                checked={layer1.domain_age.checked}
              />
            </div>

            {/* TLD Type */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-sm">TLD Type</p>
                {layer1.tld_type.value && (
                  <p className="text-xs text-muted-foreground">{layer1.tld_type.value}</p>
                )}
                {layer1.tld_type.red_flags && layer1.tld_type.red_flags.length > 0 && (
                  <p className="text-xs text-destructive">
                    Suspicious: {layer1.tld_type.red_flags.join(', ')}
                  </p>
                )}
              </div>
              <FactorIndicator
                passed={layer1.tld_type.passed}
                checked={layer1.tld_type.checked}
              />
            </div>

            {/* Registrar Reputation */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-sm">Registrar Reputation</p>
                {layer1.registrar_reputation.value && (
                  <p className="text-xs text-muted-foreground">
                    {layer1.registrar_reputation.value}
                  </p>
                )}
                {layer1.registrar_reputation.red_flags &&
                  layer1.registrar_reputation.red_flags.length > 0 && (
                    <p className="text-xs text-destructive">
                      Flagged registrar
                    </p>
                  )}
              </div>
              <FactorIndicator
                passed={layer1.registrar_reputation.passed}
                checked={layer1.registrar_reputation.checked}
              />
            </div>

            {/* WHOIS Privacy */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-sm">WHOIS Privacy</p>
                {layer1.whois_privacy.enabled !== undefined && (
                  <p className="text-xs text-muted-foreground">
                    {layer1.whois_privacy.enabled ? 'Enabled (Red Flag)' : 'Public'}
                  </p>
                )}
              </div>
              <FactorIndicator
                passed={layer1.whois_privacy.passed}
                checked={layer1.whois_privacy.checked}
              />
            </div>

            {/* SSL Certificate */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-sm">SSL Certificate</p>
                {layer1.ssl_certificate.issuer && (
                  <p className="text-xs text-muted-foreground">{layer1.ssl_certificate.issuer}</p>
                )}
              </div>
              <FactorIndicator
                passed={layer1.ssl_certificate.passed}
                checked={layer1.ssl_certificate.checked}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Layer 2: Guest Post Red Flags & Content Quality */}
      {layer2 && (
        <Card data-testid="layer2-section">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Layer 2: Red Flags & Content Quality</CardTitle>
            <CardDescription>Guest post indicators and content evaluation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Guest Post Red Flags */}
            <div>
              <h4 className="font-medium text-sm mb-2">Guest Post Indicators</h4>
              <div className="space-y-2">
                {layer2.guest_post_red_flags && (
                  <>
                    <FactorCheckItem
                      label="Contact Page"
                      detected={layer2.guest_post_red_flags.contact_page.detected}
                    />
                    <FactorCheckItem
                      label="Author Bio"
                      detected={layer2.guest_post_red_flags.author_bio.detected}
                    />
                    <FactorCheckItem
                      label="Pricing Page"
                      detected={layer2.guest_post_red_flags.pricing_page.detected}
                    />
                    <FactorCheckItem
                      label="Submit Content"
                      detected={layer2.guest_post_red_flags.submit_content.detected}
                    />
                    <FactorCheckItem
                      label="Write For Us"
                      detected={layer2.guest_post_red_flags.write_for_us.detected}
                    />
                    <FactorCheckItem
                      label="Guest Post Guidelines"
                      detected={layer2.guest_post_red_flags.guest_post_guidelines.detected}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Content Quality */}
            <div>
              <h4 className="font-medium text-sm mb-2">Content Quality</h4>
              <div className="space-y-2">
                {layer2.content_quality && (
                  <>
                    <FactorCheckItem
                      label="Thin Content"
                      detected={layer2.content_quality.thin_content.detected}
                      details={
                        layer2.content_quality.thin_content.word_count
                          ? `${layer2.content_quality.thin_content.word_count} words`
                          : undefined
                      }
                    />
                    <FactorCheckItem
                      label="Excessive Ads"
                      detected={layer2.content_quality.excessive_ads.detected}
                    />
                    <FactorCheckItem
                      label="Broken Links"
                      detected={layer2.content_quality.broken_links.detected}
                      details={
                        layer2.content_quality.broken_links.count
                          ? `${layer2.content_quality.broken_links.count} links`
                          : undefined
                      }
                    />
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Layer 3: Sophistication Signals */}
      {layer3 && (
        <Card data-testid="layer3-section">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Layer 3: Sophistication Signals</CardTitle>
            <CardDescription>LLM-based website quality analysis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Design Quality */}
            <SophisticationSignalItem
              label="Design Quality"
              score={layer3.design_quality.score}
              detected={layer3.design_quality.detected}
              reasoning={layer3.design_quality.reasoning}
            />

            {/* Content Originality */}
            <SophisticationSignalItem
              label="Content Originality"
              score={layer3.content_originality.score}
              detected={layer3.content_originality.detected}
              reasoning={layer3.content_originality.reasoning}
            />

            {/* Authority Indicators */}
            <SophisticationSignalItem
              label="Authority Indicators"
              score={layer3.authority_indicators.score}
              detected={layer3.authority_indicators.detected}
              reasoning={layer3.authority_indicators.reasoning}
            />

            {/* Professional Presentation */}
            <SophisticationSignalItem
              label="Professional Presentation"
              score={layer3.professional_presentation.score}
              detected={layer3.professional_presentation.detected}
              reasoning={layer3.professional_presentation.reasoning}
            />
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!layer1 && !layer2 && !layer3 && (
        <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
          No evaluation data available
        </div>
      )}
    </div>
  );
}

/**
 * FactorIndicator: Shows checkmark or X for pass/fail
 */
function FactorIndicator({
  passed,
  checked,
}: {
  passed: boolean;
  checked: boolean;
}) {
  if (!checked) {
    return (
      <div
        data-status="unchecked"
        className="flex-shrink-0"
        title="Not yet evaluated"
      >
        <AlertCircle className="h-5 w-5 text-gray-400" />
      </div>
    );
  }

  return (
    <div data-status={passed ? 'passed' : 'failed'} className="flex-shrink-0">
      {passed ? (
        <CheckCircle2 className="h-5 w-5 text-green-600" />
      ) : (
        <XCircle className="h-5 w-5 text-red-600" />
      )}
    </div>
  );
}

/**
 * FactorCheckItem: Shows a detected/not-detected indicator for Layer 2 checks
 */
function FactorCheckItem({
  label,
  detected,
  details,
}: {
  label: string;
  detected: boolean;
  details?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex-1">
        <p className="text-sm">{label}</p>
        {details && <p className="text-xs text-muted-foreground">{details}</p>}
      </div>
      <div data-testid="factor-indicator" className="flex-shrink-0">
        {detected ? (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Detected
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Not Found
          </Badge>
        )}
      </div>
    </div>
  );
}

/**
 * SophisticationSignalItem: Shows score and reasoning for Layer 3 signals
 */
function SophisticationSignalItem({
  label,
  score,
  detected,
  reasoning,
}: {
  label: string;
  score: number;
  detected: boolean;
  reasoning?: string;
}) {
  const scorePercentage = Math.round(score * 100);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <p className="font-medium text-sm">{label}</p>
        <div className="flex items-center gap-2">
          <div
            className="text-sm font-semibold"
            title={`Score: ${scorePercentage}%`}
          >
            {scorePercentage}%
          </div>
          {detected ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <AlertCircle className="h-5 w-5 text-amber-600" />
          )}
        </div>
      </div>

      {/* Score Bar */}
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            scorePercentage >= 70
              ? 'bg-green-500'
              : scorePercentage >= 50
                ? 'bg-amber-500'
                : 'bg-red-500'
          }`}
          style={{ width: `${scorePercentage}%` }}
        />
      </div>

      {/* Reasoning */}
      {reasoning && (
        <p className="text-xs text-muted-foreground italic">{reasoning}</p>
      )}
    </div>
  );
}
