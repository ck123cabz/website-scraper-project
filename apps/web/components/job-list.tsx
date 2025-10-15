'use client'

import { useJobs } from '@/hooks/use-jobs';
import { JobCard } from './job-card';
import { EmptyState } from './empty-state';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { subscribeToJobList, unsubscribeAll } from '@/lib/realtime-service';
import { useQueryClient } from '@tanstack/react-query';
import { jobKeys } from '@/hooks/use-jobs';

export function JobList() {
  const { data: jobs, isLoading, error } = useJobs();
  const queryClient = useQueryClient();

  // Subscribe to real-time updates
  useEffect(() => {
    console.log('[JobList] Setting up Realtime subscription');

    subscribeToJobList((payload) => {
      console.log('[JobList] Received Realtime event:', payload.eventType);
      // Invalidate queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: jobKeys.lists() });
    });

    return () => {
      console.log('[JobList] Cleaning up Realtime subscription');
      unsubscribeAll();
    };
  }, [queryClient]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16" data-testid="loading">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center" data-testid="error-state">
        <p className="text-red-500 mb-2" data-testid="error-message">Error loading jobs</p>
        <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
      </div>
    );
  }

  if (!jobs || jobs.length === 0) {
    return <EmptyState />;
  }

  // Sort jobs: active jobs at top, then by creation date
  const sortedJobs = [...jobs].sort((a, b) => {
    // Active jobs (processing) first
    if (a.status === 'processing' && b.status !== 'processing') return -1;
    if (a.status !== 'processing' && b.status === 'processing') return 1;

    // Then sort by creation date (newest first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="job-list">
      {sortedJobs.map((job) => (
        <JobCard key={job.id} job={job} />
      ))}
    </div>
  );
}
