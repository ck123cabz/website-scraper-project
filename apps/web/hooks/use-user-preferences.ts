'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UserPreferences, UpdatePreferencesDto } from '@website-scraper/shared';
import { preferencesApi } from '@/lib/api/preferences';

const PREFERENCES_QUERY_KEY = ['preferences'];

export function useUserPreferences() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: PREFERENCES_QUERY_KEY,
    queryFn: preferencesApi.getPreferences,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const mutation = useMutation({
    mutationFn: (preferences: UpdatePreferencesDto) =>
      preferencesApi.updatePreferences(preferences),
    onSuccess: (data) => {
      queryClient.setQueryData(PREFERENCES_QUERY_KEY, data);
    },
  });

  return {
    preferences: query.data,
    isLoading: query.isLoading,
    error: query.error,
    updatePreferences: mutation.mutate,
    updatePreferencesAsync: mutation.mutateAsync,
    isUpdating: mutation.isPending,
  };
}
