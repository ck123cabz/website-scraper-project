import { useQuery } from '@tanstack/react-query';
import { Layer1Results, Layer2Results, Layer3Results } from '@website-scraper/shared';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Factor Breakdown API Response
 */
interface FactorBreakdownResponse {
  layer1_results?: Layer1Results;
  layer2_results?: Layer2Results;
  layer3_results?: Layer3Results;
}

/**
 * useFactorBreakdown Hook (Phase 4: T020)
 *
 * Fetches factor breakdown data for a specific queue entry.
 * Uses React Query for caching, deduplication, and automatic refetching.
 *
 * @param queueEntryId - The ID of the queue entry to fetch factors for
 * @returns Query object with factor data, loading, and error states
 *
 * @example
 * const { data, isLoading, error } = useFactorBreakdown('entry-123');
 * if (isLoading) return <Spinner />;
 * if (error) return <Error message={error.message} />;
 * return <FactorBreakdown {...data} />;
 */
export function useFactorBreakdown(queueEntryId: string) {
  return useQuery<FactorBreakdownResponse, Error>({
    queryKey: ['manualReview', 'factors', queueEntryId],
    queryFn: async () => {
      const response = await axios.get<FactorBreakdownResponse>(
        `${API_URL}/api/manual-review/${queueEntryId}/factors`,
      );
      return response.data;
    },
    enabled: !!queueEntryId,
    staleTime: 30000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Alternative: Fetch all factors at once (batch)
 * Useful when you have multiple entries
 */
export function useFactorBreakdownBatch(queueEntryIds: string[]) {
  return useQuery<Record<string, FactorBreakdownResponse>, Error>({
    queryKey: ['manualReview', 'factors', 'batch', queueEntryIds],
    queryFn: async () => {
      // Fetch in parallel using Promise.all
      const responses = await Promise.all(
        queueEntryIds.map((id) =>
          axios.get<FactorBreakdownResponse>(
            `${API_URL}/api/manual-review/${id}/factors`,
          ),
        ),
      );

      // Map results back to IDs
      return queueEntryIds.reduce(
        (acc, id, idx) => {
          acc[id] = responses[idx].data;
          return acc;
        },
        {} as Record<string, FactorBreakdownResponse>,
      );
    },
    enabled: queueEntryIds.length > 0,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
