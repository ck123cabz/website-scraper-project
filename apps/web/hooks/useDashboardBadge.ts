import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useSettings } from './useSettings';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Queue Status Response Type
 * Response from GET /api/manual-review/status
 */
interface QueueStatusResponse {
  active_count: number;
  stale_count: number;
  by_band: Record<string, number>;
  oldest_queued_at: string | null;
}

/**
 * useDashboardBadge Hook (Phase 6: T044)
 *
 * React Query hook for fetching manual review queue status and checking
 * if dashboard badge is enabled in settings.
 *
 * Combines two data sources:
 * 1. Queue status from /api/manual-review/status (active_count)
 * 2. Settings to check if dashboard_badge is enabled in notifications
 *
 * Features:
 * - Fetches queue count (total active items)
 * - Checks if dashboard_badge is enabled in settings
 * - Handles loading and error states
 * - Uses React Query for caching and automatic refetching
 *
 * @returns Object with queue count, badge enabled status, loading state, and error
 * @returns {number} queueCount - Total number of active items in manual review queue
 * @returns {boolean} isEnabled - Whether dashboard_badge is enabled in settings
 * @returns {boolean} isLoading - Whether data is currently loading
 * @returns {Error | null} error - Error object if either query fails, null otherwise
 *
 * @example
 * const { queueCount, isEnabled, isLoading, error } = useDashboardBadge();
 * if (isEnabled && !isLoading) {
 *   return <Badge count={queueCount} />;
 * }
 */
export function useDashboardBadge() {
  // Fetch queue status
  const queueStatusQuery = useQuery({
    queryKey: ['manual-review-queue-status'],
    queryFn: async () => {
      const response = await axios.get<QueueStatusResponse>(
        `${API_URL}/api/manual-review/status`,
      );
      return response.data;
    },
    staleTime: 10000, // 10 seconds
    retry: 3,
    refetchInterval: 60000, // Refetch every 60 seconds for metrics
  });

  // Fetch settings to check if dashboard_badge is enabled
  const settingsQuery = useSettings();

  // Determine if badge is enabled (check nested optional values safely)
  const isEnabled =
    settingsQuery.data?.manual_review_settings?.notifications?.dashboard_badge === true;

  // Determine overall loading state (either query is loading)
  const isLoading = queueStatusQuery.isLoading || settingsQuery.isLoading;

  // Determine error state (prefer queue status error, fallback to settings error)
  const error = (queueStatusQuery.error as Error | null) || (settingsQuery.error as Error | null);

  // Get queue count from active items
  const queueCount = queueStatusQuery.data?.active_count ?? 0;

  return {
    queueCount,
    isEnabled,
    isLoading,
    error,
  };
}
