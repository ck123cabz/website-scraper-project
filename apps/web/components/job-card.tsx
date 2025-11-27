'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Job, formatCurrency } from '@website-scraper/shared';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { JobControls } from '@/components/job-controls';

interface JobCardProps {
  job: Job;
}

const statusColors: Record<Job['status'], string> = {
  pending: 'bg-gray-500',
  processing: 'bg-blue-500 animate-pulse',
  paused: 'bg-yellow-500',
  completed: 'bg-green-500',
  failed: 'bg-red-500',
  cancelled: 'bg-orange-500',
};

const statusLabels: Record<Job['status'], string> = {
  pending: 'Pending',
  processing: 'Processing',
  paused: 'Paused',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

export function JobCard({ job }: JobCardProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/jobs/${job.id}`);
  };

  const isActive = job.status === 'processing';

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-lg ${
        isActive ? 'border-blue-500 border-2' : ''
      }`}
      onClick={handleClick}
      data-testid={`job-card-${job.id}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg font-semibold line-clamp-1" data-testid="job-name">
            {job.name || 'Untitled Job'}
          </CardTitle>
          <Badge className={statusColors[job.status]} variant="secondary" data-testid="job-status">
            {statusLabels[job.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium" data-testid="job-progress">{(Number.isFinite(job.progressPercentage) ? job.progressPercentage : 0).toFixed(1)}%</span>
          </div>
          <Progress value={Number.isFinite(job.progressPercentage) ? job.progressPercentage : 0} className="h-2" />
        </div>

        {/* URL Count */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">URLs</span>
          <span className="font-medium" data-testid="job-url-count">
            {job.processedUrls.toLocaleString()} / {job.totalUrls.toLocaleString()}
          </span>
        </div>

        {/* Start Time */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Started</span>
          <span className="font-medium" data-testid="job-started-time">
            {job.startedAt
              ? formatDistanceToNow(new Date(job.startedAt), { addSuffix: true })
              : 'Not started'}
          </span>
        </div>

        {/* Cost Display */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Cost</span>
          <span className="font-medium" data-testid="job-cost">
            {job.totalCost > 0 ? formatCurrency(job.totalCost) : formatCurrency(0)}
          </span>
        </div>

        {/* Job Controls - Prevent click propagation to card */}
        <div onClick={(e) => e.stopPropagation()} className="pt-3 border-t">
          <JobControls jobId={job.id} status={job.status} className="flex items-center justify-end" />
        </div>
      </CardContent>
    </Card>
  );
}
