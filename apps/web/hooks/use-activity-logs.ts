import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import { subscribeToLogs, unsubscribe } from '@/lib/realtime-service';
import type { ActivityLog, LogSeverity } from '@website-scraper/shared';

// Constants for cache management and polling configuration
const REALTIME_FALLBACK_POLL_INTERVAL_MS = 5000; // Fallback polling when Realtime WebSocket fails

// Query key factory for cache management
export const activityLogKeys = {
  all: ['activity-logs'] as const,
  lists: () => [...activityLogKeys.all, 'list'] as const,
  list: (jobId: string, filters?: { severity?: LogSeverity }) =>
    [...activityLogKeys.lists(), jobId, filters] as const,
};

/**
 * Fetch activity logs for a specific job with optional severity filtering
 *
 * Features:
 * - Real-time Supabase subscription for instant log updates
 * - Fallback polling (5s interval) if Realtime WebSocket fails
 * - Proper cleanup using channel.unsubscribe()
 * - Client-side filtering by severity
 * - React Query cache invalidation on INSERT events
 */
export function useActivityLogs(
  jobId: string,
  filters?: { severity?: LogSeverity }
) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: activityLogKeys.list(jobId, filters),
    queryFn: async (): Promise<ActivityLog[]> => {
      // Type assertion needed until activity_logs table is added to Database types
      // Backend requirement: Create activity_logs table (Epic 2, Story 2.5)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let queryBuilder = (supabase as any)
        .from('activity_logs')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: true });

      // Apply server-side filtering if severity filter is provided
      if (filters?.severity) {
        queryBuilder = queryBuilder.eq('severity', filters.severity);
      }

      const { data, error } = await queryBuilder;

      if (error) {
        console.error(`[useActivityLogs] Error fetching logs for job ${jobId}:`, error);
        throw new Error(error.message);
      }

      // Transform snake_case to camelCase
      return (data || []).map(transformActivityLogFromDB);
    },
    enabled: !!jobId,
    staleTime: 10 * 1000, // Consider data fresh for 10 seconds
    // Fallback polling: refetch every 5 seconds when window is focused
    refetchInterval: REALTIME_FALLBACK_POLL_INTERVAL_MS,
    refetchIntervalInBackground: false, // Only poll when window is active
  });

  // Set up Realtime subscription for instant updates
  useEffect(() => {
    if (!jobId) return;

    console.log(`[useActivityLogs] Setting up Realtime subscription for job ${jobId} logs`);

    // Subscribe to log inserts via Realtime
    const channel = subscribeToLogs(jobId, (newLog) => {
      console.log(`[useActivityLogs] Received INSERT event for job ${jobId} log`);

      // Invalidate React Query cache to trigger refetch
      // This ensures UI updates with the latest data
      queryClient.invalidateQueries({ queryKey: activityLogKeys.list(jobId, filters) });
    });

    // Cleanup: unsubscribe when component unmounts or jobId changes
    return () => {
      console.log(`[useActivityLogs] Cleaning up Realtime subscription for job ${jobId} logs`);
      unsubscribe(channel);
    };
  }, [jobId, filters, queryClient]);

  return query;
}

/**
 * Transform activity log data from snake_case (DB) to camelCase (frontend)
 */
function transformActivityLogFromDB(dbLog: any): ActivityLog {
  return {
    id: dbLog.id,
    jobId: dbLog.job_id,
    severity: dbLog.severity,
    message: dbLog.message,
    context: dbLog.context,
    createdAt: dbLog.created_at,
  };
}
