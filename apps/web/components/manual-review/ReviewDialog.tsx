'use client';

import { useState } from 'react';
import { useQueueEntry } from '@/hooks/useManualReviewQueue';
import { useFactorBreakdown } from '@/hooks/useFactorBreakdown';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { FactorBreakdown } from './FactorBreakdown';

interface ReviewDialogProps {
  itemId: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * ReviewDialog Component (Phase 3: T016)
 *
 * Modal dialog for reviewing a single queue entry.
 * Features:
 * - URL preview with full details
 * - Confidence score and band display
 * - Factor breakdown (Layer 1/2/3 results)
 * - Approve/Reject decision buttons
 * - Notes textarea for reviewer comments
 * - Loading/error states
 * - Success confirmation
 *
 * Submits review decision to POST /api/manual-review/:id/review endpoint.
 */
export function ReviewDialog({ itemId, isOpen, onClose }: ReviewDialogProps) {
  const { data: entry, isLoading: isLoadingEntry, error: entryError } = useQueueEntry(itemId);
  const {
    data: factors,
    isLoading: isLoadingFactors,
    error: factorsError,
  } = useFactorBreakdown(itemId);
  const [decision, setDecision] = useState<'approved' | 'rejected' | null>(null);
  const [notes, setNotes] = useState('');

  // Mutation for submitting review decision
  const { mutate: submitReview, isPending: isSubmitting, error: submitError } = useMutation({
    mutationFn: async () => {
      if (!decision) throw new Error('Please select approve or reject');

      const response = await axios.post(
        `${API_URL}/api/manual-review/${itemId}/review`,
        {
          decision,
          notes: notes.trim() || undefined,
        },
      );

      return response.data;
    },
    onSuccess: () => {
      // Reset form and close
      setDecision(null);
      setNotes('');
      onClose();
    },
  });

  const handleSubmit = () => {
    if (!decision) return;
    submitReview();
  };

  const isFormValid = !!decision && !isSubmitting;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-screen overflow-y-auto" data-testid="review-dialog">
        <DialogHeader>
          <DialogTitle data-testid="review-dialog-title">Review URL</DialogTitle>
          <DialogDescription>
            Review the evaluation results and make your decision
          </DialogDescription>
        </DialogHeader>

        {/* Loading State */}
        {isLoadingEntry && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error State */}
        {entryError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error loading entry</AlertTitle>
            <AlertDescription>
              {entryError instanceof Error ? entryError.message : 'Failed to load queue entry'}
            </AlertDescription>
          </Alert>
        )}

        {/* Content */}
        {entry && !isLoadingEntry && (
          <>
            {/* URL Info */}
            <div className="space-y-4 py-4 border-t" data-testid="entry-info">
              <div>
                <label className="text-sm font-medium">URL</label>
                <p className="text-sm font-mono bg-muted p-3 rounded mt-1 break-all" data-testid="entry-url">
                  {entry.url}
                </p>
              </div>

              {/* Confidence Metrics */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Confidence Score</label>
                  <p className="text-2xl font-bold mt-1" data-testid="entry-score">
                    {(entry.confidence_score * 100).toFixed(0)}%
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Band</label>
                  <Badge className="mt-2" data-testid="entry-band">
                    {entry.confidence_band}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium">Queued</label>
                  <p className="text-sm text-muted-foreground mt-1" data-testid="entry-queued">
                    {formatDistanceToNow(new Date(entry.queued_at), { addSuffix: true })}
                  </p>
                </div>
              </div>

              {/* Stale Warning */}
              {entry.is_stale && (
                <Alert className="bg-orange-50 border-orange-200">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertTitle className="text-orange-900">Stale Item</AlertTitle>
                  <AlertDescription className="text-orange-800">
                    This URL has been in the queue for an extended period and should be prioritized
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Factor Breakdown (Phase 4: T019-T022) */}
            <div className="border-t py-4">
              <label className="text-sm font-medium mb-3 block">Detailed Evaluation Results</label>
              {isLoadingFactors && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
              {factorsError && (
                <Alert variant="destructive" className="mb-3">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error loading factors</AlertTitle>
                  <AlertDescription>Failed to load detailed evaluation results</AlertDescription>
                </Alert>
              )}
              {factors && !isLoadingFactors && (
                <FactorBreakdown
                  layer1={factors.layer1_results}
                  layer2={factors.layer2_results}
                  layer3={factors.layer3_results}
                />
              )}
            </div>

            {/* Decision Buttons */}
            <div className="border-t py-4 space-y-4">
              <div>
                <label className="text-sm font-medium">Your Decision</label>
                <div className="flex gap-3 mt-2" data-testid="decision-buttons">
                  <Button
                    variant={decision === 'approved' ? 'default' : 'outline'}
                    className="flex-1 gap-2"
                    onClick={() => setDecision('approved')}
                    disabled={isSubmitting}
                    data-testid="approve-button"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    variant={decision === 'rejected' ? 'destructive' : 'outline'}
                    className="flex-1 gap-2"
                    onClick={() => setDecision('rejected')}
                    disabled={isSubmitting}
                    data-testid="reject-button"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm font-medium">Notes (Optional)</label>
                <Textarea
                  placeholder="Add any notes about your decision..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-2"
                  disabled={isSubmitting}
                  data-testid="notes-textarea"
                  rows={3}
                />
              </div>
            </div>

            {/* Submit Error */}
            {submitError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Submission failed</AlertTitle>
                <AlertDescription>
                  {submitError instanceof Error ? submitError.message : 'Failed to submit review'}
                </AlertDescription>
              </Alert>
            )}
          </>
        )}

        {/* Dialog Footer */}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting} data-testid="cancel-button">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid}
            data-testid="submit-button"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Decision'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
