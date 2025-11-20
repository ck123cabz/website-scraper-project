'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface JobProgressCardProps {
  jobId: string;
  name: string;
  status: 'processing' | 'queued' | 'completed';
  progress: number; // 0-100
  completedCount: number;
  totalCount: number;
  layerBreakdown: {
    layer1: number;
    layer2: number;
    layer3: number;
  };
  queuePosition?: number;
  estimatedWaitTime?: number;
  createdAt: string;
  onRetry?: () => void;
  isLoading?: boolean;
  error?: string;
  cost?: number;
  isSelected?: boolean;
  onSelectChange?: (selected: boolean) => void;
}

// Skeleton component for loading state
const Skeleton = ({ className }: { className?: string }) => (
  <div
    data-testid="skeleton"
    className={cn('animate-pulse rounded-md bg-muted', className)}
  />
);

export function JobProgressCard({
  name,
  status,
  progress,
  completedCount,
  totalCount,
  layerBreakdown,
  queuePosition,
  estimatedWaitTime,
  createdAt,
  onRetry,
  isLoading = false,
  error,
  cost,
  isSelected = false,
  onSelectChange,
}: JobProgressCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getProgressColorClass = () => {
    if (progress <= 25) return 'red danger';
    if (progress <= 50) return 'orange warning';
    if (progress <= 75) return 'yellow caution';
    return 'green success';
  };

  const getElapsedTime = () => {
    const elapsed = Date.now() - new Date(createdAt).getTime();
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);

    if (minutes === 0) {
      return `Started ${seconds} sec ago`;
    } else if (minutes === 1) {
      return 'Started 1 min ago';
    } else {
      return `Started ${minutes} min ago`;
    }
  };

  const getEstimatedTimeDisplay = () => {
    if (status === 'queued' && estimatedWaitTime === undefined) {
      return 'N/A';
    }
    if (estimatedWaitTime === undefined) {
      return null;
    }
    return `Est. complete in ${estimatedWaitTime} min`;
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const calculateLayerPercentage = (layerCount: number) => {
    if (totalCount === 0) return 0;
    return Math.round((layerCount / totalCount) * 100);
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="space-y-3">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="p-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="ml-4"
              >
                Retry
              </Button>
            )}
          </AlertDescription>
        </Alert>
      </Card>
    );
  }

  const estimateDisplay = getEstimatedTimeDisplay();

  return (
    <Card className="p-4">
      <CardContent className="p-0 space-y-4">
        {/* Header with checkbox, name and progress */}
        <div className="flex items-center gap-3">
          {onSelectChange && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelectChange}
              aria-label={`Select ${name}`}
            />
          )}
          <div className="flex items-center justify-between flex-1">
            <h3 className="font-semibold text-lg">{name}</h3>
            <span className="text-sm font-medium">{progress}%</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <Progress
            value={progress}
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${name} progress`}
            className="h-2"
          />
          <div
            data-testid="progress-indicator"
            className={cn('h-1 rounded', getProgressColorClass())}
            style={{ width: '100%' }}
          />
        </div>

        {/* Completed/total count */}
        <div className="text-sm text-muted-foreground">
          {formatNumber(completedCount)}/{formatNumber(totalCount)} URLs
        </div>

        {/* Layer breakdown - always visible */}
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            Layer 1: {layerBreakdown.layer1} ({calculateLayerPercentage(layerBreakdown.layer1)}%)
          </div>
          <div>
            Layer 2: {layerBreakdown.layer2} ({calculateLayerPercentage(layerBreakdown.layer2)}%)
          </div>
          <div>
            Layer 3: {layerBreakdown.layer3} ({calculateLayerPercentage(layerBreakdown.layer3)}%)
          </div>
        </div>

        {/* Status badge and elapsed time */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {status === 'processing' && (
              <Badge variant="default">Processing</Badge>
            )}
            {status === 'queued' && queuePosition !== undefined && (
              <Badge variant="secondary">Queued #{queuePosition}</Badge>
            )}
            {status === 'completed' && (
              <Badge variant="secondary">Completed</Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {getElapsedTime()}
          </span>
        </div>

        {/* Estimated time */}
        {estimateDisplay && (
          <div className="text-sm text-muted-foreground">
            {estimateDisplay}
          </div>
        )}

        {/* Expand/collapse button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full justify-between"
          aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
        >
          <span>{isExpanded ? 'Hide details' : 'Show details'}</span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>

        {/* Expanded details */}
        {isExpanded && (
          <div className="space-y-2 pt-2 border-t">
            <div className="text-sm">
              <div className="font-medium mb-2">Layer Breakdown:</div>
              <div className="space-y-1 pl-2">
                <div>Layer 1: {layerBreakdown.layer1} completed</div>
                <div>Layer 2: {layerBreakdown.layer2} completed</div>
                <div>Layer 3: {layerBreakdown.layer3} completed</div>
              </div>
            </div>
            {cost !== undefined && (
              <div className="text-sm">
                <span className="font-medium">Cost:</span> ${cost.toFixed(2)}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
