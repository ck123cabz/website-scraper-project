'use client';

import { useQuery } from '@tanstack/react-query';
import { jobsApi } from '@/lib/api-client';
import { JobCard } from '@/components/jobs/JobCard';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Job } from '@website-scraper/shared';

interface JobsCardsViewProps {
  className?: string;
}

export function JobsCardsView({ className }: JobsCardsViewProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['jobs', 'recent'],
    queryFn: async () => {
      const response = await jobsApi.getQueueStatus({ includeCompleted: true, limit: 20 });
      const { activeJobs = [], completedJobs = [] } = response.data as any;
      return [...activeJobs, ...completedJobs] as Job[];
    },
    refetchInterval: 10000, // Refetch every 10 seconds
    staleTime: 5000,
  });

  if (isLoading) {
    return (
      <div className={className}>
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-3 rounded-lg border p-4">
              <div className="flex items-start justify-between">
                <Skeleton className="h-6 w-[180px]" />
                <Skeleton className="h-5 w-[60px]" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-2 w-full" />
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-[100px]" />
                  <Skeleton className="h-3 w-[80px]" />
                </div>
              </div>
              <Skeleton className="h-4 w-[140px]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load jobs. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={className}>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 rounded-full bg-muted p-6">
            <AlertCircle className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No jobs yet</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Create your first job to get started with URL processing
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {data.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>
    </div>
  );
}
