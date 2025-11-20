'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Download, Trash2, X } from 'lucide-react';
import { jobsApi, resultsApi } from '@/lib/api-client';
import { toast } from 'sonner';
import type { Job } from '@website-scraper/shared';

interface BulkActionsProps {
  selectedJobs: Job[];
  onClearSelection: () => void;
  onActionComplete: () => void;
}

export function BulkActions({
  selectedJobs,
  onClearSelection,
  onActionComplete,
}: BulkActionsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try {
      // Delete jobs sequentially (could be parallelized for better performance)
      const results = await Promise.allSettled(
        selectedJobs.map((job) => jobsApi.deleteJob(job.id))
      );

      const successCount = results.filter((r) => r.status === 'fulfilled').length;
      const failCount = results.filter((r) => r.status === 'rejected').length;

      if (successCount > 0) {
        toast.success(`Successfully deleted ${successCount} job(s)`);
      }
      if (failCount > 0) {
        toast.error(`Failed to delete ${failCount} job(s)`);
      }

      setShowDeleteDialog(false);
      onActionComplete();
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error('Failed to delete selected jobs');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkExport = async () => {
    setIsExporting(true);
    try {
      // Export each job's results and download
      for (const job of selectedJobs) {
        try {
          const blob = await resultsApi.exportJobResults(job.id, {
            format: 'complete', // Export complete results with all factors
          });

          // Create download link
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${job.name || job.id}-results.csv`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);

          // Small delay between downloads to prevent browser blocking
          await new Promise((resolve) => setTimeout(resolve, 300));
        } catch (error) {
          console.error(`Failed to export job ${job.id}:`, error);
          toast.error(`Failed to export ${job.name || job.id}`);
        }
      }

      toast.success(`Exported ${selectedJobs.length} job(s) successfully`);
      onClearSelection();
    } catch (error) {
      console.error('Bulk export error:', error);
      toast.error('Failed to export selected jobs');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                {selectedJobs.length} job{selectedJobs.length !== 1 ? 's' : ''} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearSelection}
                aria-label="Clear selection"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkExport}
                disabled={isExporting || isDeleting}
                aria-label="Export selected jobs"
              >
                <Download className="mr-2 h-4 w-4" />
                {isExporting ? 'Exporting...' : 'Export Selected'}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isExporting || isDeleting}
                aria-label="Delete selected jobs"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Selected
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedJobs.length} Job(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected jobs
              and all their results.
              {selectedJobs.length > 0 && (
                <div className="mt-4 max-h-[200px] overflow-y-auto rounded-md border p-3">
                  <ul className="space-y-1 text-sm">
                    {selectedJobs.map((job) => (
                      <li key={job.id} className="truncate">
                        • {job.name || 'Untitled Job'}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
