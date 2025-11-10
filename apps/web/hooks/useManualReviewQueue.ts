import { useQuery } from '@tanstack/react-query';
import { ManualReviewQueueEntry } from '@website-scraper/shared';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * useManualReviewQueue Hook (Phase 3: T015)
 *
 * React Query hook for fetching manual review queue items with pagination and filtering.
 *
 * Features:
 * - Pagination (page, limit)
 * - Filtering by confidence band and stale status
 * - Automatic retries on failure
 * - Refetch on demand
 *
 * @param options - Query options
 * @param options.page - Page number (1-indexed, default: 1)
 * @param options.limit - Items per page (default: 20)
 * @param options.is_stale - Filter by stale status (optional)
 * @param options.confidence_band - Filter by confidence band (optional)
 * @returns useQuery result with queue data
 *
 * @example
 * const { data, isLoading, error, refetch } = useManualReviewQueue({
 *   page: 1,
 *   limit: 20,
 *   is_stale: false,
 * });
 */
export function useManualReviewQueue(options: {
  page?: number;
  limit?: number;
  is_stale?: boolean;
  confidence_band?: string;
} = {}) {
  const page = options.page || 1;
  const limit = options.limit || 20;

  // Build query string
  const queryParams = new URLSearchParams();
  queryParams.append('page', String(page));
  queryParams.append('limit', String(limit));
  if (typeof options.is_stale === 'boolean') {
    queryParams.append('is_stale', String(options.is_stale));
  }
  if (options.confidence_band) {
    queryParams.append('confidence_band', options.confidence_band);
  }

  return useQuery({
    queryKey: ['manual-review-queue', page, limit, options.is_stale, options.confidence_band],
    queryFn: async () => {
      const response = await axios.get<{
        items: ManualReviewQueueEntry[];
        total: number;
        page: number;
        limit: number;
      }>(`${API_URL}/api/manual-review?${queryParams.toString()}`);

      return response.data;
    },
    staleTime: 30000, // 30 seconds
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * useQueueStatus Hook
 *
 * Fetch manual review queue status and metrics.
 *
 * @returns useQuery result with queue status data
 *
 * @example
 * const { data: status } = useQueueStatus();
 * console.log(status?.active_count); // Number of active queue items
 */
export function useQueueStatus() {
  return useQuery({
    queryKey: ['manual-review-queue-status'],
    queryFn: async () => {
      const response = await axios.get<{
        active_count: number;
        stale_count: number;
        by_band: Record<string, number>;
        oldest_queued_at: string | null;
      }>(`${API_URL}/api/manual-review/status`);

      return response.data;
    },
    staleTime: 10000, // 10 seconds
    retry: 3,
    refetchInterval: 60000, // Refetch every 60 seconds for metrics
  });
}

/**
 * useQueueEntry Hook
 *
 * Fetch a single queue entry with full evaluation details.
 * Used when displaying review dialog with factor breakdown.
 *
 * @param id - Queue entry ID
 * @returns useQuery result with queue entry data
 *
 * @example
 * const { data: entry, isLoading } = useQueueEntry(entryId);
 */
export function useQueueEntry(id: string | null) {
  return useQuery({
    queryKey: ['manual-review-queue-entry', id],
    queryFn: async () => {
      if (!id) throw new Error('No entry ID provided');

      const response = await axios.get<ManualReviewQueueEntry>(
        `${API_URL}/api/manual-review/${id}`,
      );

      return response.data;
    },
    enabled: !!id, // Only run query if ID is provided
    staleTime: 10000, // 10 seconds
    retry: 2,
  });
}
