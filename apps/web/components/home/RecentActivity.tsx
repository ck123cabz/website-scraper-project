'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { jobsApi } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import type { Job, JobStatus } from '@website-scraper/shared';
import { formatDistanceToNow } from 'date-fns';

interface RecentActivityProps {
  className?: string;
}

function getRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return 'recently';
  }
}

function getActivityIcon(status: JobStatus) {
  if (status === 'completed') {
    return <CheckCircle2 className="h-4 w-4 text-green-600" />;
  }
  if (status === 'failed' || status === 'cancelled') {
    return <XCircle className="h-4 w-4 text-red-600" />;
  }
  return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
}

export function RecentActivity({ className }: RecentActivityProps) {
  const router = useRouter();

  const { data, isLoading, error } = useQuery({
    queryKey: ['jobs', 'recent-activity'],
    queryFn: async () => {
      const response = await jobsApi.getQueueStatus({ includeCompleted: true, limit: 50 });
      const { activeJobs = [], completedJobs = [] } = response.data as any;
      const allJobs = [...activeJobs, ...completedJobs] as Job[];

      // Filter to completed jobs only and sort by completion date
      const filteredJobs = allJobs
        .filter((job) => job.completedAt && (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled'))
        .sort((a, b) => {
          const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
          const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
          return dateB - dateA; // Most recent first
        })
        .slice(0, 10); // Take top 10

      return filteredJobs;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 15000,
  });

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-[100px]" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>Failed to load activity</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No recent activity. Completed jobs will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((job) => (
            <div
              key={job.id}
              className="flex items-start gap-3 cursor-pointer hover:bg-muted/50 rounded-md p-2 -m-2 transition-colors"
              onClick={() => router.push(`/jobs/${job.id}`)}
            >
              <div className="mt-0.5">
                {getActivityIcon(job.status)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">
                    {job.name || 'Untitled Job'}
                  </p>
                  <Badge
                    variant={job.status === 'completed' ? 'default' : 'destructive'}
                    className="text-xs"
                  >
                    {job.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {job.status === 'completed' && (
                    <span>{job.successfulUrls} successful • </span>
                  )}
                  {job.completedAt && getRelativeTime(job.completedAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
