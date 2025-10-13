import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-client';
import { jobsApi } from '@/lib/api-client';
import type { Job } from '@website-scraper/shared';

// Query key factory for cache management
export const jobKeys = {
  all: ['jobs'] as const,
  lists: () => [...jobKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...jobKeys.lists(), filters] as const,
  details: () => [...jobKeys.all, 'detail'] as const,
  detail: (id: string) => [...jobKeys.details(), id] as const,
};

/**
 * Fetch all jobs from Supabase
 */
export function useJobs() {
  return useQuery({
    queryKey: jobKeys.lists(),
    queryFn: async (): Promise<Job[]> => {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[useJobs] Error fetching jobs:', error);
        throw new Error(error.message);
      }

      // Transform snake_case to camelCase
      return (data || []).map(transformJobFromDB);
    },
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
    refetchOnWindowFocus: true,
  });
}

/**
 * Fetch a single job by ID from Supabase
 */
export function useJob(jobId: string) {
  return useQuery({
    queryKey: jobKeys.detail(jobId),
    queryFn: async (): Promise<Job> => {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) {
        console.error(`[useJob] Error fetching job ${jobId}:`, error);
        throw new Error(error.message);
      }

      return transformJobFromDB(data);
    },
    enabled: !!jobId,
    staleTime: 10 * 1000, // Consider data fresh for 10 seconds (more frequent for detail view)
  });
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
        .update({ status: 'failed' }) // Use 'failed' status for cancelled jobs
        .eq('id', jobId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return transformJobFromDB(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.lists() });
    },
  });
}

/**
 * Transform job data from snake_case (DB) to camelCase (frontend)
 */
function transformJobFromDB(dbJob: any): Job {
  return {
    id: dbJob.id,
    name: dbJob.name,
    status: dbJob.status,
    totalUrls: dbJob.total_urls,
    processedUrls: dbJob.processed_urls,
    successfulUrls: dbJob.successful_urls,
    failedUrls: dbJob.failed_urls,
    rejectedUrls: dbJob.rejected_urls,
    currentUrl: dbJob.current_url,
    currentStage: dbJob.current_stage,
    progressPercentage: Number(dbJob.progress_percentage),
    processingRate: dbJob.processing_rate ? Number(dbJob.processing_rate) : null,
    estimatedTimeRemaining: dbJob.estimated_time_remaining,
    totalCost: Number(dbJob.total_cost),
    geminiCost: Number(dbJob.gemini_cost),
    gptCost: Number(dbJob.gpt_cost),
    startedAt: dbJob.started_at,
    completedAt: dbJob.completed_at,
    createdAt: dbJob.created_at,
    updatedAt: dbJob.updated_at,
  };
}
