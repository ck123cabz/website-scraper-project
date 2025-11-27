'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatTimestamp } from '@website-scraper/shared';
import type { Job, JobStatus } from '@website-scraper/shared';
import { Calendar, Clock } from 'lucide-react';

interface JobCardProps {
  job: Job;
  className?: string;
}

function getStatusColor(status: JobStatus): string {
  switch (status) {
    case 'completed':
      return 'bg-green-500 hover:bg-green-600';
    case 'failed':
    case 'cancelled':
      return 'bg-red-500 hover:bg-red-600';
    case 'processing':
      return 'bg-blue-500 hover:bg-blue-600';
    case 'pending':
      return 'bg-yellow-500 hover:bg-yellow-600';
    case 'paused':
      return 'bg-gray-500 hover:bg-gray-600';
    default:
      return 'bg-gray-500 hover:bg-gray-600';
  }
}

function getStatusLabel(status: JobStatus): string {
  switch (status) {
    case 'completed':
      return 'Success';
    case 'failed':
      return 'Failed';
    case 'cancelled':
      return 'Cancelled';
    case 'processing':
      return 'Active';
    case 'pending':
      return 'Pending';
    case 'paused':
      return 'Paused';
    default:
      return status;
  }
}

export function JobCard({ job, className }: JobCardProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/jobs/${job.id}`);
  };

  const showProgress = job.status === 'processing' || job.status === 'paused';

  // Handle both API response formats for backward compatibility
  // Use Number.isFinite to catch NaN, null, undefined
  const rawProgress = (job as any).progress ?? (job as any).progressPercentage;
  const progressPercentage = Number.isFinite(rawProgress) ? rawProgress : 0;
  const totalUrls = (job as any).urlCount ?? (job as any).totalUrls ?? 0;
  const processedUrls = (job as any).completedCount ?? (job as any).processedUrls ?? 0;

  // For completed jobs from queue/status endpoint, we may not have detailed breakdown
  const successfulUrls = (job as any).successfulUrls ?? 0;
  const rejectedUrls = (job as any).rejectedUrls ?? 0;
  const failedUrls = (job as any).failedUrls ?? 0;
  const totalCost = (job as any).totalCost ?? 0;

  // Handle date fields - completed jobs use completedAt, active jobs use createdAt
  const displayDate = (job as any).completedAt ?? (job as any).createdAt;
  const dateLabel = (job as any).completedAt ? 'Completed' : 'Created';

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] ${className}`}
      onClick={handleClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg font-semibold line-clamp-1">
            {job.name || 'Untitled Job'}
          </CardTitle>
          <Badge className={getStatusColor(job.status)}>
            {getStatusLabel(job.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Progress Section (only for active jobs) */}
        {showProgress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{processedUrls} / {totalUrls} URLs</span>
              {job.estimatedTimeRemaining && job.estimatedTimeRemaining > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {Math.ceil(job.estimatedTimeRemaining / 60)}m remaining
                </span>
              )}
            </div>
          </div>
        )}

        {/* Completion Stats (for completed jobs) */}
        {job.status === 'completed' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total URLs</span>
              <span className="font-medium">{totalUrls}</span>
            </div>
            {totalCost > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Cost</span>
                <span className="font-medium">${totalCost.toFixed(4)}</span>
              </div>
            )}
            {(successfulUrls > 0 || rejectedUrls > 0 || failedUrls > 0) && (
              <div className="grid grid-cols-3 gap-2 text-center pt-2">
                <div>
                  <div className="text-lg font-bold text-green-600">{successfulUrls}</div>
                  <div className="text-xs text-muted-foreground">Success</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-red-600">{rejectedUrls}</div>
                  <div className="text-xs text-muted-foreground">Rejected</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-600">{failedUrls}</div>
                  <div className="text-xs text-muted-foreground">Failed</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Date */}
        {displayDate && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
            <Calendar className="h-3.5 w-3.5" />
            <span>{dateLabel} {formatTimestamp(displayDate)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
