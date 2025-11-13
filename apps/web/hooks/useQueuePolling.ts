import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { jobsApi } from '@/lib/api-client';
import type { BatchJob as Job } from '@website-scraper/shared';
import { transformJobFromDB } from './job-transform';

const POLL_INTERVAL_MS = 5000;
const DEFAULT_LIMIT = 50;

export interface UseQueuePollingOptions {
  includeCompleted?: boolean;
  limit?: number;
}

export interface UseQueuePollingReturn {
  jobs: (Job | null)[];
  completedJobs: (Job | null)[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<any>;
}

export function useQueuePolling(
  options: UseQueuePollingOptions = {},
): UseQueuePollingReturn {
  const { includeCompleted = false, limit = DEFAULT_LIMIT } = options;

  const query = useQuery<Job[], Error>({
    queryKey: ['queue-polling', includeCompleted, limit],
    queryFn: async () => {
      const response = await jobsApi.getAll();

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch jobs');
      }

      const rows = response.data || [];
      return rows.map(transformJobFromDB);
    },
    staleTime: 0,
    gcTime: 0,
    retry: 3,
    refetchInterval: (queryInstance) => {
      const jobs = queryInstance.state.data || [];
      return shouldContinuePolling(jobs) ? POLL_INTERVAL_MS : false;
    },
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const jobs = useMemo(() => {
    const data = query.data || [];
    const filtered = includeCompleted
      ? data
      : data.filter((job) => job.status !== 'completed');

    return filtered.slice(0, limit);
  }, [query.data, includeCompleted, limit]);

  const completedJobs = useMemo(() => {
    if (!includeCompleted) {
      return [];
    }

    return (query.data || []).filter((job) => job.status === 'completed');
  }, [query.data, includeCompleted]);

  return {
    jobs: jobs || [],
    completedJobs: completedJobs || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ?? null,
    refetch: query.refetch,
  };
}

function shouldContinuePolling(jobs: Job[]): boolean {
  if (!jobs || jobs.length === 0) {
    return false;
  }

  return jobs.some((job) => job.status !== 'completed' && job.status !== 'cancelled');
}
