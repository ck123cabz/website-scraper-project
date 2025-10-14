'use client';

import { Job } from '@/../../packages/shared/src/types/job';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Loader2, Filter, Brain } from 'lucide-react';
import { useCurrentURLTimer } from '../hooks/use-current-url-timer';

interface CurrentURLPanelProps {
  job: Job;
  className?: string;
}

const URL_TRUNCATE_LENGTH = 60;
const URL_DISPLAY_LENGTH = 50;

export function CurrentURLPanel({ job, className }: CurrentURLPanelProps) {
  const elapsedSeconds = useCurrentURLTimer(job.currentUrlStartedAt);

  // Empty state when no URL is being processed
  if (!job.currentUrl) {
    return (
      <section aria-label="Current URL Processing Status" className={className}>
        <Card>
          <CardHeader>
            <CardTitle>Currently Processing</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-8">
              Waiting to start...
            </p>
          </CardContent>
        </Card>
      </section>
    );
  }

  // Truncate URL if too long
  const shouldTruncate = job.currentUrl.length > URL_TRUNCATE_LENGTH;
  const displayUrl = shouldTruncate
    ? `${job.currentUrl.substring(0, URL_DISPLAY_LENGTH)}...`
    : job.currentUrl;

  // Get stage icon and label
  const getStageIcon = () => {
    switch (job.currentStage) {
      case 'fetching':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'filtering':
        return <Filter className="h-4 w-4" />;
      case 'classifying':
        return <Brain className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getStageLabel = () => {
    switch (job.currentStage) {
      case 'fetching':
        return 'Fetching';
      case 'filtering':
        return 'Filtering';
      case 'classifying':
        return 'Classifying';
      default:
        return 'Unknown';
    }
  };

  return (
    <section aria-label="Current URL Processing Status" className={className}>
      <Card>
        <CardHeader>
          <CardTitle>Currently Processing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current URL with tooltip if truncated */}
          <div>
            <p className="text-sm text-muted-foreground mb-1">URL:</p>
            {shouldTruncate ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="font-mono text-sm break-all cursor-help">
                      {displayUrl}
                    </p>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-md break-all">
                    <p>{job.currentUrl}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <p className="font-mono text-sm break-all">{displayUrl}</p>
            )}
          </div>

          {/* Processing stage with icon */}
          {job.currentStage && (
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">Stage:</p>
              <div className="flex items-center gap-1.5">
                {getStageIcon()}
                <span className="text-sm font-medium">{getStageLabel()}</span>
              </div>
            </div>
          )}

          {/* Elapsed time */}
          <div>
            <p className="text-sm text-muted-foreground inline">
              Processing for:{' '}
            </p>
            <span className="text-sm font-medium">
              {elapsedSeconds} {elapsedSeconds === 1 ? 'second' : 'seconds'}
            </span>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
