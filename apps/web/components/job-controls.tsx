'use client';

import { useState } from 'react';
import { Pause, Play, X, AlertCircle, Loader2 } from 'lucide-react';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { usePauseJob, useResumeJob, useCancelJob } from '@/hooks/use-jobs';
import { toast } from 'sonner';
import type { JobStatus } from '@website-scraper/shared';

interface JobControlsProps {
  jobId: string;
  status: JobStatus;
  className?: string;
}

export function JobControls({ jobId, status, className }: JobControlsProps) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const pauseMutation = usePauseJob();
  const resumeMutation = useResumeJob();
  const cancelMutation = useCancelJob();

  // Compute if any mutation is in progress
  const isTransitioning =
    pauseMutation.isPending || resumeMutation.isPending || cancelMutation.isPending;

  // Handle pause action
  const handlePause = () => {
    pauseMutation.mutate(jobId, {
      onSuccess: () => {
        toast.success('Job paused successfully');
      },
      onError: (error) => {
        toast.error('Failed to pause job. Please try again.');
        console.error('[JobControls] Pause error:', error);
      },
    });
  };

  // Handle resume action
  const handleResume = () => {
    resumeMutation.mutate(jobId, {
      onSuccess: () => {
        toast.success('Job resumed successfully');
      },
      onError: (error) => {
        toast.error('Failed to resume job. Please try again.');
        console.error('[JobControls] Resume error:', error);
      },
    });
  };

  // Handle cancel action (shows confirmation dialog)
  const handleCancelClick = () => {
    setShowCancelDialog(true);
  };

  // Handle cancel confirmation
  const handleCancelConfirm = () => {
    cancelMutation.mutate(jobId, {
      onSuccess: () => {
        toast.success('Job cancelled. Results have been saved.');
        setShowCancelDialog(false);
      },
      onError: (error) => {
        toast.error('Failed to cancel job. Please try again.');
        console.error('[JobControls] Cancel error:', error);
      },
    });
  };

  // Don't show controls for completed, failed, or cancelled jobs
  if (status === 'completed' || status === 'failed' || status === 'cancelled') {
    return null;
  }

  return (
    <>
      <TooltipProvider>
        <div className={className}>
          {/* Show Pause and Cancel buttons for processing jobs */}
          {status === 'processing' && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePause}
                    disabled={isTransitioning}
                    className="mr-2"
                  >
                    {pauseMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Pause className="h-4 w-4" />
                    )}
                    <span className="ml-2">Pause</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Pause processing - current URL will complete</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelClick}
                    disabled={isTransitioning}
                  >
                    <X className="h-4 w-4" />
                    <span className="ml-2">Cancel</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Cancel job - processed results will be saved</p>
                </TooltipContent>
              </Tooltip>
            </>
          )}

          {/* Show Resume and Cancel buttons for paused jobs */}
          {status === 'paused' && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResume}
                    disabled={isTransitioning}
                    className="mr-2"
                  >
                    {resumeMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    <span className="ml-2">Resume</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Resume processing from last processed URL</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelClick}
                    disabled={isTransitioning}
                  >
                    <X className="h-4 w-4" />
                    <span className="ml-2">Cancel</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Cancel job - processed results will be saved</p>
                </TooltipContent>
              </Tooltip>
            </>
          )}

          {/* Show only Cancel button for pending jobs */}
          {status === 'pending' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelClick}
                  disabled={isTransitioning}
                >
                  <X className="h-4 w-4" />
                  <span className="ml-2">Cancel</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Cancel job before it starts</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </TooltipProvider>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 mr-2 text-orange-500" />
                Cancel Job?
              </div>
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cancel job? Processed results will be saved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Processing</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelConfirm}
              disabled={cancelMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {cancelMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Cancelling...
                </>
              ) : (
                'Cancel Job'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
