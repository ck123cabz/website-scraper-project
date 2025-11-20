import { apiClient } from '../api-client';
import type { UserPreferences, UpdatePreferencesDto } from '@website-scraper/shared';

export const preferencesApi = {
  getPreferences: async (): Promise<UserPreferences> => {
    const response = await apiClient.get<{ data: UserPreferences }>('/preferences');
    return response.data.data;
  },

  updatePreferences: async (
    preferences: UpdatePreferencesDto,
  ): Promise<UserPreferences> => {
    const response = await apiClient.patch<{ data: UserPreferences }>(
      '/preferences',
      preferences,
    );
    return response.data.data;
  },
};
