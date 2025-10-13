'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { Job } from '@website-scraper/shared';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';

interface JobCardProps {
  job: Job;
}

const statusColors: Record<Job['status'], string> = {
  pending: 'bg-gray-500',
  processing: 'bg-blue-500 animate-pulse',
  paused: 'bg-yellow-500',
  completed: 'bg-green-500',
  failed: 'bg-red-500',
};

const statusLabels: Record<Job['status'], string> = {
  pending: 'Pending',
  processing: 'Processing',
  paused: 'Paused',
  completed: 'Completed',
  failed: 'Failed',
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
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg font-semibold line-clamp-1">
            {job.name || 'Untitled Job'}
          </CardTitle>
          <Badge className={statusColors[job.status]} variant="secondary">
            {statusLabels[job.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{job.progressPercentage.toFixed(1)}%</span>
          </div>
          <Progress value={job.progressPercentage} className="h-2" />
        </div>

        {/* URL Count */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">URLs</span>
          <span className="font-medium">
            {job.processedUrls.toLocaleString()} / {job.totalUrls.toLocaleString()}
          </span>
        </div>

        {/* Start Time */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Started</span>
          <span className="font-medium">
            {job.startedAt
              ? formatDistanceToNow(new Date(job.startedAt), { addSuffix: true })
              : 'Not started'}
          </span>
        </div>

        {/* Cost (if available) */}
        {job.totalCost > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Cost</span>
            <span className="font-medium">${job.totalCost.toFixed(4)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
