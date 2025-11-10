'use client';

import { useState } from 'react';
import { ManualReviewQueue } from '@/components/manual-review/ManualReviewQueue';
import { useManualReviewQueue } from '@/hooks/useManualReviewQueue';
import { Button } from '@/components/ui/button';
import { RefreshCw, Filter } from 'lucide-react';
import Link from 'next/link';

/**
 * Manual Review Page (Phase 3: T014)
 *
 * Main page for reviewing URLs in the manual review queue.
 * Displays:
 * - Queue items in a table with confidence scores, bands, and actions
 * - Filter controls (by confidence band, stale status)
 * - Pagination controls
 * - Refresh button for real-time updates
 *
 * The queue table and review dialog are separate components:
 * - ManualReviewQueue: Displays the queue table with items
 * - ReviewDialog: Modal for reviewing individual items (imported in queue component)
 */
export default function ManualReviewPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [isStale, setIsStale] = useState<boolean | undefined>(undefined);
  const [confidenceBand, setConfidenceBand] = useState<string | undefined>(undefined);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data, isLoading, refetch } = useManualReviewQueue({
    page,
    limit,
    is_stale: isStale,
    confidence_band: confidenceBand,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const handleResetFilters = () => {
    setPage(1);
    setIsStale(undefined);
    setConfidenceBand(undefined);
  };

  return (
    <div className="container mx-auto py-8 px-4" data-testid="manual-review-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-8" data-testid="manual-review-header">
        <div>
          <h1 className="text-3xl font-bold mb-2" data-testid="manual-review-title">
            Manual Review Queue
          </h1>
          <p className="text-muted-foreground" data-testid="manual-review-description">
            Review and approve/reject URLs requiring manual verification
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="lg"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="gap-2"
            data-testid="refresh-button"
          >
            <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Link href="/dashboard">
            <Button variant="outline" size="lg" data-testid="back-button">
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>

      {/* Queue Statistics */}
      {data && (
        <div className="bg-card border rounded-lg p-6 mb-8" data-testid="queue-stats">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Items</p>
              <p className="text-2xl font-bold" data-testid="stat-total">
                {data.total}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Page</p>
              <p className="text-2xl font-bold" data-testid="stat-page">
                {page}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Items Per Page</p>
              <p className="text-2xl font-bold">{limit}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Filter Status</p>
              <p className="text-sm font-mono" data-testid="filter-status">
                {isStale !== undefined || confidenceBand
                  ? 'Active'
                  : 'No filters'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter Controls */}
      <div className="bg-card border rounded-lg p-6 mb-8" data-testid="filter-controls">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2" data-testid="filter-title">
            <Filter className="h-5 w-5" />
            Filters
          </h2>
          {(isStale !== undefined || confidenceBand) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              data-testid="reset-filters-button"
            >
              Reset All Filters
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Stale Filter */}
          <div>
            <label className="block text-sm font-medium mb-2">Stale Status</label>
            <select
              value={isStale === undefined ? 'all' : isStale ? 'stale' : 'active'}
              onChange={(e) => {
                const value = e.target.value;
                setIsStale(value === 'all' ? undefined : value === 'stale');
                setPage(1);
              }}
              className="w-full px-3 py-2 border rounded-md bg-background"
              data-testid="stale-filter-select"
            >
              <option value="all">All Items</option>
              <option value="active">Active Only</option>
              <option value="stale">Stale Items Only</option>
            </select>
          </div>

          {/* Confidence Band Filter */}
          <div>
            <label className="block text-sm font-medium mb-2">Confidence Band</label>
            <select
              value={confidenceBand || 'all'}
              onChange={(e) => {
                const value = e.target.value;
                setConfidenceBand(value === 'all' ? undefined : value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border rounded-md bg-background"
              data-testid="band-filter-select"
            >
              <option value="all">All Bands</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="auto_reject">Auto Reject</option>
            </select>
          </div>
        </div>
      </div>

      {/* Queue Table */}
      <ManualReviewQueue
        items={data?.items || []}
        isLoading={isLoading}
        page={page}
        limit={limit}
        total={data?.total || 0}
        onPageChange={setPage}
        onLimitChange={(newLimit) => {
          setLimit(newLimit);
          setPage(1);
        }}
        onRefresh={handleRefresh}
        data-testid="manual-review-queue"
      />
    </div>
  );
}
