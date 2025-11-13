'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UrlResult } from '@website-scraper/shared';
import { resultsApi } from '@/lib/api-client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Filter, Download } from 'lucide-react';
import { FactorBreakdown } from './FactorBreakdown';
import { ExportDialog } from './ExportDialog';

export interface ResultsTableProps {
  jobId: string;
  jobName?: string;
  initialPage?: number;
  pageSize?: number;
  status?: 'approved' | 'rejected' | 'failed';
  classification?: 'suitable' | 'not_suitable';
  minConfidence?: number;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * ResultsTable Component (Phase 4: T046)
 *
 * Displays paginated URL results for a job with factor transparency.
 * Features:
 * - Table showing URL, status, confidence score, layer, processing time
 * - Expandable rows to show factor breakdown
 * - Pagination controls with jump-to-page input
 * - Loading, error, and empty states
 * - Filtering support (status, classification, confidence)
 *
 * Data fetching is handled internally using React Query.
 */
export function ResultsTable({
  jobId,
  jobName,
  initialPage = 1,
  pageSize = 50,
  status,
  classification,
  minConfidence,
}: ResultsTableProps) {
  const [page, setPage] = useState(initialPage);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [jumpToPage, setJumpToPage] = useState('');
  const [showExportDialog, setShowExportDialog] = useState(false);

  // Filter states for T053
  const [decisionFilter, setDecisionFilter] = useState<'all' | 'approved' | 'rejected'>('all');
  const [layerFilter, setLayerFilter] = useState<'all' | 'layer1' | 'layer2' | 'layer3' | 'passed_all'>('all');
  const [confidenceFilter, setConfidenceFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  // Fetch results using React Query (T052: Updated cache config)
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['job-results', jobId, page, pageSize, decisionFilter, layerFilter, confidenceFilter],
    queryFn: () =>
      resultsApi.getJobResults(jobId, {
        page,
        limit: pageSize,
        filter: decisionFilter,
        layer: layerFilter,
        confidence: confidenceFilter,
      }),
    staleTime: 5 * 60 * 1000, // T052: 5 minutes
    gcTime: 10 * 60 * 1000, // T052: 10 minutes (formerly cacheTime)
  });

  const results: UrlResult[] = data?.data || [];
  const pagination: PaginationData = data?.pagination || {
    page: 1,
    limit: pageSize,
    total: 0,
    totalPages: 0,
  };

  // Pagination handlers
  const handlePreviousPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  const handleNextPage = () => {
    if (page < pagination.totalPages) {
      setPage(page + 1);
    }
  };

  const handleJumpToPage = (e: React.FormEvent) => {
    e.preventDefault();
    const targetPage = parseInt(jumpToPage, 10);
    if (!isNaN(targetPage) && targetPage >= 1 && targetPage <= pagination.totalPages) {
      setPage(targetPage);
      setJumpToPage('');
    }
  };

  const handleJumpInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const targetPage = parseInt(jumpToPage, 10);
      if (!isNaN(targetPage) && targetPage >= 1 && targetPage <= pagination.totalPages) {
        setPage(targetPage);
        setJumpToPage('');
      }
    }
  };

  // Row expand toggle
  const handleToggleExpand = (resultId: string) => {
    setExpandedRowId(expandedRowId === resultId ? null : resultId);
  };

  // Format confidence score
  const formatConfidence = (score: number | null): string => {
    if (score === null) return 'N/A';
    return score.toFixed(2);
  };

  // Get confidence score color
  const getConfidenceColor = (score: number | null): string => {
    if (score === null) return 'text-gray-400';
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Format processing time
  const formatProcessingTime = (ms: number): string => {
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // Get status badge variant
  const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'rejected':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  // Format eliminated at layer
  const formatEliminatedAtLayer = (layer: string | null): string => {
    if (!layer) return 'N/A';
    // Keep raw values to match test expectations
    return layer;
  };

  // Truncate URL
  const truncateUrl = (url: string, maxLength: number = 50): string => {
    if (url.length <= maxLength) return url;
    return `${url.substring(0, maxLength)}...`;
  };

  // Loading state
  if (isLoading && results.length === 0) {
    return (
      <div className="bg-card border rounded-lg p-12 text-center">
        <p className="text-muted-foreground">Loading results...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-card border rounded-lg p-12 text-center">
        <div className="space-y-4">
          <p className="text-destructive font-semibold">Error</p>
          <p className="text-muted-foreground">
            {error instanceof Error ? error.message : 'Failed to fetch results'}
          </p>
          <Button onClick={() => refetch()} variant="outline">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Empty state
  if (results.length === 0) {
    return (
      <div className="bg-card border rounded-lg p-12 text-center">
        <p className="text-muted-foreground">No results found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Export Button - T068 */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Results</h2>
        <Button
          variant="outline"
          onClick={() => setShowExportDialog(true)}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Export Results
        </Button>
      </div>

      {/* Filter Controls - T053 */}
      <div className="bg-card border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Decision Filter */}
          <div className="space-y-2">
            <label htmlFor="decision-filter" className="text-sm font-medium text-muted-foreground">
              Decision
            </label>
            <Select value={decisionFilter} onValueChange={(value: any) => setDecisionFilter(value)}>
              <SelectTrigger id="decision-filter">
                <SelectValue placeholder="All Decisions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Layer Filter */}
          <div className="space-y-2">
            <label htmlFor="layer-filter" className="text-sm font-medium text-muted-foreground">
              Layer
            </label>
            <Select value={layerFilter} onValueChange={(value: any) => setLayerFilter(value)}>
              <SelectTrigger id="layer-filter">
                <SelectValue placeholder="All Layers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Layers</SelectItem>
                <SelectItem value="layer1">Layer 1</SelectItem>
                <SelectItem value="layer2">Layer 2</SelectItem>
                <SelectItem value="layer3">Layer 3</SelectItem>
                <SelectItem value="passed_all">Passed All</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Confidence Filter */}
          <div className="space-y-2">
            <label htmlFor="confidence-filter" className="text-sm font-medium text-muted-foreground">
              Confidence Band
            </label>
            <Select value={confidenceFilter} onValueChange={(value: any) => setConfidenceFilter(value)}>
              <SelectTrigger id="confidence-filter">
                <SelectValue placeholder="All Confidence Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="high">High (&gt;80%)</SelectItem>
                <SelectItem value="medium">Medium (50-80%)</SelectItem>
                <SelectItem value="low">Low (&lt;50%)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead>Eliminated At Layer</TableHead>
              <TableHead>Processing Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((result) => {
              const isExpanded = expandedRowId === result.id;
              return (
                <React.Fragment key={result.id}>
                  <TableRow>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleExpand(result.id)}
                        aria-label={isExpanded ? 'Collapse' : 'Expand'}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="font-mono text-sm" title={result.url}>
                      {truncateUrl(result.url)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(result.status)}>
                        {result.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={getConfidenceColor(result.confidence_score)}>
                        {formatConfidence(result.confidence_score)}
                      </span>
                    </TableCell>
                    <TableCell>{formatEliminatedAtLayer(result.eliminated_at_layer)}</TableCell>
                    <TableCell>{formatProcessingTime(result.processing_time_ms)}</TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow>
                      <TableCell colSpan={6} className="bg-muted/50">
                        <div className="py-4">
                          <FactorBreakdown
                            layer1={result.layer1_factors}
                            layer2={result.layer2_factors}
                            layer3={result.layer3_factors}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Page {pagination.page} of {pagination.totalPages}
        </div>
        <div className="flex items-center gap-4">
          {/* Jump to page input */}
          <form onSubmit={handleJumpToPage} className="flex items-center gap-2">
            <label htmlFor="jump-to-page" className="text-sm text-muted-foreground">
              Jump to page:
            </label>
            <Input
              id="jump-to-page"
              type="number"
              min={1}
              max={pagination.totalPages}
              value={jumpToPage}
              onChange={(e) => setJumpToPage(e.target.value)}
              onKeyDown={handleJumpInputKeyDown}
              className="w-20"
              placeholder={String(pagination.page)}
              aria-label="Jump to page"
            />
          </form>

          {/* Previous/Next buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousPage}
              disabled={page === 1}
              aria-label="Previous"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={page >= pagination.totalPages}
              aria-label="Next"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* Export Dialog - T069 */}
      <ExportDialog
        jobId={jobId}
        jobName={jobName}
        isOpen={showExportDialog}
        onOpenChange={setShowExportDialog}
      />
    </div>
  );
}
