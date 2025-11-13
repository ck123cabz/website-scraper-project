'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FactorBreakdown } from './FactorBreakdown';
import { jobsApi } from '@/lib/api-client';
import type { UrlResult } from '@website-scraper/shared';
import { cn } from '@/lib/utils';

export interface ResultRowProps {
  result: UrlResult;
  jobId: string;
}

/**
 * ResultRow Component
 *
 * Displays a single URL result in a table row with expand/collapse functionality
 * to show detailed factor breakdown from Layer 1/2/3 analysis.
 *
 * Features:
 * - Expandable row with ChevronDown/ChevronUp icon toggle
 * - Displays URL, status, confidence score, eliminated layer, and processing time
 * - Fetches full factor data on-demand when expanded
 * - Shows loading state while fetching details
 * - Handles errors gracefully
 * - Color-coded badges for status and confidence
 */
export function ResultRow({ result, jobId }: ResultRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch detailed result data with layer factors when expanded
  const { data: detailedResult, isLoading, error } = useQuery({
    queryKey: ['result-details', jobId, result.id],
    queryFn: () => jobsApi.getResultDetails(jobId, result.id),
    enabled: isExpanded, // Only fetch when expanded
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const handleExpandToggle = () => {
    setIsExpanded(!isExpanded);
  };

  // Format processing time
  const formatProcessingTime = (ms: number): string => {
    if (ms < 1000) {
      return `${ms}ms`;
    }
    const seconds = ms / 1000;
    // Round to 1 decimal place for display
    return `${seconds.toFixed(1)}s`;
  };

  // Format eliminated layer
  const formatEliminatedLayer = (layer: UrlResult['eliminated_at_layer']): string => {
    if (!layer) return '-';
    if (layer === 'passed_all') return 'Passed All';
    if (layer === 'layer1') return 'Layer 1';
    if (layer === 'layer2') return 'Layer 2';
    if (layer === 'layer3') return 'Layer 3';
    return layer;
  };

  // Format confidence score
  const formatConfidence = (score: number | null): string => {
    if (score === null || score === undefined) return '-';
    return `${Math.round(score * 100)}%`;
  };

  // Get status badge variant
  const getStatusVariant = (status: UrlResult['status']): 'default' | 'secondary' | 'destructive' => {
    if (status === 'approved') return 'default';
    if (status === 'rejected') return 'destructive';
    return 'secondary';
  };

  // Get confidence color class
  const getConfidenceColor = (score: number | null): string => {
    if (score === null || score === undefined) return 'text-muted-foreground';
    if (score >= 0.9) return 'text-green-600 dark:text-green-400';
    if (score >= 0.75) return 'text-green-500 dark:text-green-500';
    if (score >= 0.6) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 0.4) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  // Truncate URL for display
  const truncateUrl = (url: string, maxLength: number = 50): string => {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + '...';
  };

  return (
    <>
      {/* Main summary row */}
      <TableRow className="cursor-pointer">
        <TableCell className="w-[50px]">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExpandToggle}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
            className="h-8 w-8 p-0"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </TableCell>

        <TableCell className="font-medium">
          <span
            className="hover:underline cursor-pointer"
            title={result.url}
          >
            {truncateUrl(result.url)}
          </span>
        </TableCell>

        <TableCell>
          <Badge variant={getStatusVariant(result.status)}>
            {result.status}
          </Badge>
        </TableCell>

        <TableCell>
          <span className={cn('font-medium', getConfidenceColor(result.confidence_score))}>
            {formatConfidence(result.confidence_score)}
          </span>
        </TableCell>

        <TableCell>
          {formatEliminatedLayer(result.eliminated_at_layer)}
        </TableCell>

        <TableCell>
          {formatProcessingTime(result.processing_time_ms)}
        </TableCell>
      </TableRow>

      {/* Expanded factor breakdown row */}
      {isExpanded && (
        <TableRow>
          <TableCell colSpan={6} className="bg-muted/30 p-6">
            {isLoading ? (
              <div
                data-testid="factor-breakdown-loading"
                className="flex items-center justify-center py-8"
              >
                <div className="text-center space-y-2">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
                  <p className="text-sm text-muted-foreground">Loading factors...</p>
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-sm text-destructive">
                  {(() => {
                    // Handle axios error with response
                    if (error && typeof error === 'object' && 'response' in error) {
                      const axiosError = error as any;
                      if (axiosError.response?.status === 404) {
                        return 'Error: Result not found';
                      }
                      return axiosError.response?.data?.message || 'Failed to load factor details';
                    }
                    // Handle regular Error object
                    if (error instanceof Error) {
                      return `Error: ${error.message}`;
                    }
                    return 'Failed to load factor details';
                  })()}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExpandToggle}
                  className="mt-4"
                >
                  Close
                </Button>
              </div>
            ) : detailedResult ? (
              <FactorBreakdown
                layer1={detailedResult.layer1_factors}
                layer2={detailedResult.layer2_factors}
                layer3={detailedResult.layer3_factors}
                isLoading={false}
              />
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  No data available
                </p>
              </div>
            )}
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
