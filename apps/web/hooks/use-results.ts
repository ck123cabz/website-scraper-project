import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { resultsApi, type GetResultsParams } from '@/lib/api-client';
import { supabase } from '@/lib/supabase-client';
import type { Result } from '@website-scraper/shared';

interface UseJobResultsOptions extends GetResultsParams {
  jobId: string;
  enabled?: boolean;
}

interface ResultsResponse {
  data: Result[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function useJobResults({
  jobId,
  page = 1,
  limit = 50,
  status,
  classification,
  search,
  enabled = true,
}: UseJobResultsOptions) {
  const queryClient = useQueryClient();

  const query = useQuery<ResultsResponse>({
    queryKey: ['job-results', jobId, { page, limit, status, classification, search }],
    queryFn: () => resultsApi.getJobResults(jobId, { page, limit, status, classification, search }),
    enabled,
    staleTime: 1000, // 1 second
    refetchInterval: false, // Don't auto-refetch, rely on realtime
  });

  // Set up Supabase Realtime subscription for new results
  useEffect(() => {
    if (!enabled || !jobId) return;

    const channel = supabase
      .channel(`results-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'results',
          filter: `job_id=eq.${jobId}`,
        },
        () => {
          // Invalidate query to refetch results
          queryClient.invalidateQueries({
            queryKey: ['job-results', jobId],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId, enabled, queryClient]);

  return query;
}
