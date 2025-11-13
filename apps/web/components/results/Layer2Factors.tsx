import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import type { Layer2Factors as Layer2FactorsType } from '@website-scraper/shared';
import { CheckCircle2, XCircle, Check, X } from 'lucide-react';

interface Layer2FactorsProps {
  factors: Layer2FactorsType | null;
  loading?: boolean;
  error?: string;
}

export function Layer2Factors({ factors, loading, error }: Layer2FactorsProps) {
  // Loading state
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Layer 2: Publication Detection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <div className="animate-pulse">Loading Layer 2 analysis...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Layer 2: Publication Detection</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Null data state
  if (!factors) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Layer 2: Publication Detection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">
            No Layer 2 data available. This may be a pre-migration record.
          </div>
        </CardContent>
      </Card>
    );
  }

  // Helper to get color class based on score (0.0-1.0)
  const getScoreColor = (score: number): string => {
    const percentage = score * 100;
    if (percentage >= 70) return 'text-green-600 dark:text-green-400';
    if (percentage >= 40) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  // Helper to get progress bar color class based on score
  const getProgressColor = (score: number): string => {
    const percentage = score * 100;
    if (percentage >= 70) return 'bg-green-500';
    if (percentage >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Convert scores to percentages
  const publicationScorePercentage = Math.round(factors.publication_score * 100);
  const productOfferingPercentage = Math.round(factors.module_scores.product_offering * 100);
  const layoutQualityPercentage = Math.round(factors.module_scores.layout_quality * 100);
  const navigationComplexityPercentage = Math.round(factors.module_scores.navigation_complexity * 100);
  const monetizationPercentage = Math.round(factors.module_scores.monetization_indicators * 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Layer 2: Publication Detection</span>
          {factors.passed ? (
            <div className="flex items-center gap-2 text-sm font-normal text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400 px-3 py-1 rounded-md">
              <CheckCircle2 className="h-4 w-4" />
              <span>PASS Layer 2</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm font-normal text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400 px-3 py-1 rounded-md">
              <XCircle className="h-4 w-4" />
              <span>REJECTED at Layer 2</span>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Publication Score */}
        <div>
          <div className="text-sm font-medium text-muted-foreground mb-2">
            Overall Publication Score
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Publication Score</span>
              <span className={`text-sm font-medium ${getScoreColor(factors.publication_score)}`}>
                {factors.publication_score.toFixed(2)} ({publicationScorePercentage}%)
              </span>
            </div>
            <div className="relative">
              <Progress value={publicationScorePercentage} className="h-2" />
              <div
                className={`absolute top-0 left-0 h-2 rounded-full transition-all ${getProgressColor(
                  factors.publication_score
                )}`}
                style={{ width: `${publicationScorePercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Module Scores */}
        <div>
          <div className="text-sm font-medium text-muted-foreground mb-3">Module Scores</div>
          <div className="space-y-4">
            {/* Product Offering */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Product Offering</span>
                <span
                  className={`text-sm font-medium ${getScoreColor(
                    factors.module_scores.product_offering
                  )}`}
                >
                  {factors.module_scores.product_offering.toFixed(2)} ({productOfferingPercentage}%)
                </span>
              </div>
              <div className="relative">
                <Progress value={productOfferingPercentage} className="h-2" />
                <div
                  className={`absolute top-0 left-0 h-2 rounded-full transition-all ${getProgressColor(
                    factors.module_scores.product_offering
                  )}`}
                  style={{ width: `${productOfferingPercentage}%` }}
                />
              </div>
            </div>

            {/* Layout Quality */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Layout Quality</span>
                <span
                  className={`text-sm font-medium ${getScoreColor(
                    factors.module_scores.layout_quality
                  )}`}
                >
                  {factors.module_scores.layout_quality.toFixed(2)} ({layoutQualityPercentage}%)
                </span>
              </div>
              <div className="relative">
                <Progress value={layoutQualityPercentage} className="h-2" />
                <div
                  className={`absolute top-0 left-0 h-2 rounded-full transition-all ${getProgressColor(
                    factors.module_scores.layout_quality
                  )}`}
                  style={{ width: `${layoutQualityPercentage}%` }}
                />
              </div>
            </div>

            {/* Navigation Complexity */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Navigation Complexity</span>
                <span
                  className={`text-sm font-medium ${getScoreColor(
                    factors.module_scores.navigation_complexity
                  )}`}
                >
                  {factors.module_scores.navigation_complexity.toFixed(2)} (
                  {navigationComplexityPercentage}%)
                </span>
              </div>
              <div className="relative">
                <Progress value={navigationComplexityPercentage} className="h-2" />
                <div
                  className={`absolute top-0 left-0 h-2 rounded-full transition-all ${getProgressColor(
                    factors.module_scores.navigation_complexity
                  )}`}
                  style={{ width: `${navigationComplexityPercentage}%` }}
                />
              </div>
            </div>

            {/* Monetization Indicators */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Monetization Indicators</span>
                <span
                  className={`text-sm font-medium ${getScoreColor(
                    factors.module_scores.monetization_indicators
                  )}`}
                >
                  {factors.module_scores.monetization_indicators.toFixed(2)} ({monetizationPercentage}
                  %)
                </span>
              </div>
              <div className="relative">
                <Progress value={monetizationPercentage} className="h-2" />
                <div
                  className={`absolute top-0 left-0 h-2 rounded-full transition-all ${getProgressColor(
                    factors.module_scores.monetization_indicators
                  )}`}
                  style={{ width: `${monetizationPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Publication Keywords */}
        <div>
          <div className="text-sm font-medium text-muted-foreground mb-2">Publication Keywords</div>
          {factors.keywords_found.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {factors.keywords_found.map((keyword, index) => (
                <Badge key={index} variant="outline">
                  {keyword}
                </Badge>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No publication keywords detected</div>
          )}
        </div>

        {/* Ad Networks Detected */}
        <div>
          <div className="text-sm font-medium text-muted-foreground mb-2">Ad Networks Detected</div>
          {factors.ad_networks_detected.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {factors.ad_networks_detected.map((network, index) => (
                <Badge key={index} variant="destructive">
                  {network}
                </Badge>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No ad networks detected</div>
          )}
        </div>

        {/* Content Signals */}
        <div>
          <div className="text-sm font-medium text-muted-foreground mb-3">Content Signals</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              {factors.content_signals.has_blog ? (
                <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
              ) : (
                <X className="h-4 w-4 text-red-600 dark:text-red-400" />
              )}
              <span className="text-sm">Has Blog</span>
            </div>
            <div className="flex items-center gap-2">
              {factors.content_signals.has_press_releases ? (
                <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
              ) : (
                <X className="h-4 w-4 text-red-600 dark:text-red-400" />
              )}
              <span className="text-sm">Has Press Releases</span>
            </div>
            <div className="flex items-center gap-2">
              {factors.content_signals.has_whitepapers ? (
                <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
              ) : (
                <X className="h-4 w-4 text-red-600 dark:text-red-400" />
              )}
              <span className="text-sm">Has Whitepapers</span>
            </div>
            <div className="flex items-center gap-2">
              {factors.content_signals.has_case_studies ? (
                <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
              ) : (
                <X className="h-4 w-4 text-red-600 dark:text-red-400" />
              )}
              <span className="text-sm">Has Case Studies</span>
            </div>
          </div>
        </div>

        {/* Reasoning */}
        <div>
          <div className="text-sm font-medium text-muted-foreground mb-2">Reasoning</div>
          <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {factors.reasoning || 'No reasoning available'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
