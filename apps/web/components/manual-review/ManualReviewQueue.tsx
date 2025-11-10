'use client';

import { useState } from 'react';
import { ManualReviewQueueEntry } from '@website-scraper/shared';
import { ReviewDialog } from './ReviewDialog';
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
import { ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ManualReviewQueueProps {
  items: ManualReviewQueueEntry[];
  isLoading?: boolean;
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onRefresh: () => void;
}

/**
 * ManualReviewQueue Component (Phase 3: T016)
 *
 * Displays the manual review queue in a table format.
 * Features:
 * - Table showing URL, confidence score, band, queued_at, is_stale flag
 * - Action buttons to review individual items
 * - Pagination controls
 * - Item limit selector
 * - ReviewDialog modal for submitting decisions
 *
 * Each row can be clicked to open the review dialog with full item details.
 */
export function ManualReviewQueue({
  items,
  isLoading,
  page,
  limit,
  total,
  onPageChange,
  onLimitChange,
  onRefresh,
}: ManualReviewQueueProps) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleReviewClick = (id: string) => {
    setSelectedItemId(id);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedItemId(null);
    onRefresh();
  };

  const maxPages = Math.ceil(total / limit);
  const hasNextPage = page < maxPages;
  const hasPrevPage = page > 1;

  const getBandColor = (band: string) => {
    switch (band) {
      case 'high':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-orange-100 text-orange-800';
      case 'auto_reject':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getConfidenceScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading && items.length === 0) {
    return (
      <div className="bg-card border rounded-lg p-12 text-center" data-testid="queue-loading">
        <p className="text-muted-foreground">Loading queue items...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-card border rounded-lg p-12 text-center" data-testid="queue-empty">
        <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-600" />
        <h3 className="text-lg font-semibold mb-2">Queue is empty</h3>
        <p className="text-muted-foreground">
          All URLs have been reviewed. Check back when new items are queued.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Queue Table */}
      <div className="bg-card border rounded-lg overflow-hidden" data-testid="queue-table-container">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>URL</TableHead>
              <TableHead className="w-24">Confidence</TableHead>
              <TableHead className="w-20">Band</TableHead>
              <TableHead className="w-20">Status</TableHead>
              <TableHead className="w-32">Queued</TableHead>
              <TableHead className="w-24">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow
                key={item.id}
                className="hover:bg-muted/50 cursor-pointer"
                data-testid={`queue-item-${item.id}`}
              >
                {/* URL */}
                <TableCell
                  className="font-mono text-sm truncate max-w-md"
                  onClick={() => handleReviewClick(item.id)}
                  title={item.url}
                >
                  {item.url}
                </TableCell>

                {/* Confidence Score */}
                <TableCell
                  className={`text-center font-semibold ${getConfidenceScoreColor(
                    item.confidence_score,
                  )}`}
                  onClick={() => handleReviewClick(item.id)}
                  data-testid={`item-score-${item.id}`}
                >
                  {(item.confidence_score * 100).toFixed(0)}%
                </TableCell>

                {/* Confidence Band */}
                <TableCell onClick={() => handleReviewClick(item.id)}>
                  <Badge className={getBandColor(item.confidence_band)}>
                    {item.confidence_band}
                  </Badge>
                </TableCell>

                {/* Status (Stale flag) */}
                <TableCell onClick={() => handleReviewClick(item.id)}>
                  {item.is_stale ? (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Stale
                    </Badge>
                  ) : (
                    <Badge variant="outline">Active</Badge>
                  )}
                </TableCell>

                {/* Queued Time */}
                <TableCell
                  className="text-sm text-muted-foreground"
                  onClick={() => handleReviewClick(item.id)}
                  data-testid={`item-queued-${item.id}`}
                >
                  {formatDistanceToNow(new Date(item.queued_at), { addSuffix: true })}
                </TableCell>

                {/* Action Button */}
                <TableCell>
                  <Button
                    size="sm"
                    onClick={() => handleReviewClick(item.id)}
                    data-testid={`review-button-${item.id}`}
                  >
                    Review
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between mt-6 p-4 bg-card border rounded-lg" data-testid="pagination">
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}
          </span>

          <select
            value={limit}
            onChange={(e) => onLimitChange(parseInt(e.target.value, 10))}
            className="px-3 py-1 border rounded-md bg-background text-sm"
            data-testid="limit-select"
          >
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={!hasPrevPage || isLoading}
            data-testid="prev-page-button"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <span className="text-sm px-3 py-2 min-w-fit text-center" data-testid="page-number">
            Page {page} of {maxPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={!hasNextPage || isLoading}
            data-testid="next-page-button"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Review Dialog */}
      {selectedItemId && (
        <ReviewDialog
          itemId={selectedItemId}
          isOpen={isDialogOpen}
          onClose={handleDialogClose}
        />
      )}
    </>
  );
}
