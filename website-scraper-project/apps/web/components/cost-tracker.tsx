"use client";

import { useMemo } from 'react';
import { DollarSign, TrendingDown, AlertTriangle } from 'lucide-react';
import { Job, formatCurrency } from '@website-scraper/shared';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface CostTrackerProps {
  job: Job;
  className?: string;
  costThreshold?: number; // Default: $50
}

const COST_WARNING_THRESHOLD = 50; // USD

export function CostTracker({ job, className, costThreshold = COST_WARNING_THRESHOLD }: CostTrackerProps) {
  // Calculate derived metrics
  const avgCostPerUrl = useMemo(() => {
    if (job.processedUrls === 0) return null;
    return job.totalCost / job.processedUrls;
  }, [job.totalCost, job.processedUrls]);

  const projectedTotalCost = useMemo(() => {
    if (avgCostPerUrl === null || job.totalUrls === 0) return null;
    return job.totalUrls * avgCostPerUrl;
  }, [avgCostPerUrl, job.totalUrls]);

  // Calculate savings percentage (assuming GPT-only would cost more)
  // This is a simplified calculation - real implementation would need GPT cost baseline
  const savingsPercentage = useMemo(() => {
    if (job.totalCost === 0 || job.geminiCost === 0) return null;
    // Estimate: if all URLs used GPT instead of Gemini
    // Assume GPT costs 3x more than Gemini (simplified)
    const estimatedGptOnlyCost = job.geminiCost * 3 + job.gptCost;
    if (estimatedGptOnlyCost === 0) return null;
    return ((1 - (job.totalCost / estimatedGptOnlyCost)) * 100);
  }, [job.totalCost, job.geminiCost, job.gptCost]);

  // Check if projected cost exceeds threshold
  const exceedsThreshold = projectedTotalCost !== null && projectedTotalCost > costThreshold;

  return (
    <Card className={className} aria-label="Cost Tracking">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Cost Tracking
        </CardTitle>
        <CardDescription>Real-time LLM API usage costs</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Cost */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Total Cost:</span>
          <span className="text-lg font-bold" aria-label={`Total cost ${formatCurrency(job.totalCost)}`}>
            {formatCurrency(job.totalCost)}
          </span>
        </div>

        {/* Cost per URL */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Cost per URL:</span>
          <span className="text-sm text-muted-foreground" aria-label={`Cost per URL ${formatCurrency(avgCostPerUrl, 5)}`}>
            {avgCostPerUrl !== null ? formatCurrency(avgCostPerUrl, 5) : 'N/A'}
          </span>
        </div>

        {/* Provider Breakdown */}
        <div className="space-y-2 pt-2 border-t">
          <span className="text-sm font-medium">Provider Breakdown:</span>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Gemini:</span>
            <span aria-label={`Gemini cost ${formatCurrency(job.geminiCost)}`}>
              {formatCurrency(job.geminiCost)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">GPT:</span>
            <span aria-label={`GPT cost ${formatCurrency(job.gptCost)}`}>
              {formatCurrency(job.gptCost)}
            </span>
          </div>
        </div>

        {/* Projected Total Cost */}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-sm font-medium">Projected Total:</span>
          <span className="text-sm font-semibold" aria-label={`Projected total cost ${formatCurrency(projectedTotalCost)}`}>
            {projectedTotalCost !== null ? formatCurrency(projectedTotalCost) : 'N/A'}
          </span>
        </div>

        {/* Savings Indicator */}
        {savingsPercentage !== null && savingsPercentage > 0 && (
          <div className="flex items-center justify-between pt-2 border-t text-green-600 dark:text-green-400">
            <div className="flex items-center gap-1">
              <TrendingDown className="h-4 w-4" />
              <span className="text-sm font-medium">Savings:</span>
            </div>
            <span className="text-sm font-semibold" aria-label={`${savingsPercentage.toFixed(0)} percent saved versus GPT only`}>
              {savingsPercentage.toFixed(0)}% saved vs GPT-only
            </span>
          </div>
        )}

        {/* Warning Alert */}
        {exceedsThreshold && (
          <div
            className="flex items-start gap-2 p-3 rounded-md bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200"
            role="alert"
            aria-live="polite"
          >
            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1">
              <p className="text-sm font-medium">Cost Warning</p>
              <p className="text-xs mt-1">
                Projected cost {formatCurrency(projectedTotalCost)} exceeds threshold of {formatCurrency(costThreshold)}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
