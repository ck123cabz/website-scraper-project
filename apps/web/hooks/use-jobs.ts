import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import { jobsApi } from '@/lib/api-client';
import { subscribeToJob, unsubscribe } from '@/lib/realtime-service';
import type { BatchJob as Job } from '@website-scraper/shared';
import { transformJobFromDB } from './job-transform';

// Constants for cache management and polling configuration
const REALTIME_FALLBACK_POLL_INTERVAL_MS = 2000; // Fallback polling when Realtime WebSocket fails (faster updates for real-time visibility)

// Query key factory for cache management
export const jobKeys = {
  all: ['jobs'] as const,
  lists: () => [...jobKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...jobKeys.lists(), filters] as const,
  details: () => [...jobKeys.all, 'detail'] as const,
  detail: (id: string) => [...jobKeys.details(), id] as const,
};

/**
 * Fetch all jobs from backend API (Epic 3 Story 3.0 - Integration)
 */
export function useJobs() {
  return useQuery({
    queryKey: jobKeys.lists(),
    queryFn: async (): Promise<Job[]> => {
      console.log('[useJobs] Fetching jobs from backend API');
      const response = await jobsApi.getAll();

      if (!response.success) {
        console.error('[useJobs] Backend API error:', response);
        throw new Error(response.error?.message || 'Failed to fetch jobs');
      }

      console.log('[useJobs] Received', response.data.length, 'jobs from backend');
      // Transform snake_case from backend to camelCase for frontend
      return (response.data || []).map(transformJobFromDB);
    },
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
    refetchOnWindowFocus: true,
  });
}

/**
 * Fetch a single job by ID from backend API with real-time updates (Epic 3 Story 3.0 - Integration)
 *
 * Features:
 * - Backend API for initial data fetch
 * - Real-time Supabase subscription for instant updates
 * - Fallback polling (5s interval) if Realtime WebSocket fails
 * - Proper cleanup using channel.unsubscribe() (NOT unsubscribeAll)
 * - React Query cache invalidation on UPDATE events
 */
export function useJob(jobId: string, options?: { enableRealtime?: boolean }) {
  const queryClient = useQueryClient();
  const enableRealtime = options?.enableRealtime ?? true; // Default to enabled

  const query = useQuery({
    queryKey: jobKeys.detail(jobId),
    queryFn: async (): Promise<Job> => {
      console.log(`[useJob] Fetching job ${jobId} from backend API`);
      const response = await jobsApi.getById(jobId);

      if (!response.success) {
        console.error(`[useJob] Backend API error for job ${jobId}:`, response);
        throw new Error(response.error?.message || 'Failed to fetch job');
      }

      console.log(`[useJob] Received job ${jobId} from backend`);
      // Transform snake_case from backend to camelCase for frontend
      return transformJobFromDB(response.data);
    },
    enabled: !!jobId,
    staleTime: 10 * 1000, // Consider data fresh for 10 seconds
    // Fallback polling: refetch every 5 seconds when window is focused
    // This ensures updates even if Realtime WebSocket fails (NFR001-R7)
    refetchInterval: enableRealtime ? REALTIME_FALLBACK_POLL_INTERVAL_MS : false,
    refetchIntervalInBackground: false, // Only poll when window is active
  });

  // Set up Realtime subscription for instant updates
  useEffect(() => {
    if (!jobId || !enableRealtime) return;

    console.log(`[useJob] Setting up Realtime subscription for job ${jobId}`);

    // Subscribe to job updates via Realtime
    const channel = subscribeToJob(jobId, (payload) => {
      console.log(`[useJob] Received UPDATE event for job ${jobId}`);

      // Invalidate React Query cache to trigger refetch
      // This ensures UI updates with the latest data
      queryClient.invalidateQueries({ queryKey: jobKeys.detail(jobId) });
    });

    // Cleanup: unsubscribe when component unmounts or jobId changes
    // IMPORTANT: Use unsubscribe(channel), NOT unsubscribeAll()
    // to avoid breaking other components' subscriptions
    return () => {
      console.log(`[useJob] Cleaning up Realtime subscription for job ${jobId}`);
      unsubscribe(channel);
    };
  }, [jobId, enableRealtime, queryClient]);

  return query;
}

/**
 * Pause a job
 */
export function usePauseJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobId: string) => {
      // For MVP, update directly via Supabase since backend API isn't ready yet
      const { data, error } = await supabase
        .from('jobs')
        .update({ status: 'paused' })
        .eq('id', jobId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return transformJobFromDB(data);
    },
    onMutate: async (jobId) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: jobKeys.detail(jobId) });

      const previousJob = queryClient.getQueryData<Job>(jobKeys.detail(jobId));

      if (previousJob) {
        queryClient.setQueryData<Job>(jobKeys.detail(jobId), {
          ...previousJob,
          status: 'paused',
        });
      }

      return { previousJob };
    },
    onError: (err, jobId, context) => {
      // Rollback on error
      if (context?.previousJob) {
        queryClient.setQueryData(jobKeys.detail(jobId), context.previousJob);
      }
      console.error('[usePauseJob] Error:', err);
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: jobKeys.lists() });
    },
  });
}

/**
 * Resume a job
 */
export function useResumeJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobId: string) => {
      const { data, error } = await supabase
        .from('jobs')
        .update({ status: 'processing' })
        .eq('id', jobId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return transformJobFromDB(data);
    },
    onMutate: async (jobId) => {
      await queryClient.cancelQueries({ queryKey: jobKeys.detail(jobId) });

      const previousJob = queryClient.getQueryData<Job>(jobKeys.detail(jobId));

      if (previousJob) {
        queryClient.setQueryData<Job>(jobKeys.detail(jobId), {
          ...previousJob,
          status: 'processing',
        });
      }

      return { previousJob };
    },
    onError: (err, jobId, context) => {
      if (context?.previousJob) {
        queryClient.setQueryData(jobKeys.detail(jobId), context.previousJob);
      }
      console.error('[useResumeJob] Error:', err);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.lists() });
    },
  });
}

/**
 * Cancel a job
 */
export function useCancelJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobId: string) => {
      const { data, error } = await supabase
        .from('jobs')
        .update({ status: 'cancelled' })
        .eq('id', jobId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return transformJobFromDB(data);
    },
    onMutate: async (jobId) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: jobKeys.detail(jobId) });

      const previousJob = queryClient.getQueryData<Job>(jobKeys.detail(jobId));

      if (previousJob) {
        queryClient.setQueryData<Job>(jobKeys.detail(jobId), {
          ...previousJob,
          status: 'cancelled',
        });
      }

      return { previousJob };
    },
    onError: (err, jobId, context) => {
      // Rollback on error
      if (context?.previousJob) {
        queryClient.setQueryData(jobKeys.detail(jobId), context.previousJob);
      }
      console.error('[useCancelJob] Error:', err);
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: jobKeys.lists() });
    },
  });
}
