import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { ClassificationSettings, UpdateClassificationSettingsDto } from '@website-scraper/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Fetch current settings
async function fetchSettings(): Promise<ClassificationSettings> {
  const response = await axios.get<ClassificationSettings>(`${API_URL}/api/settings`);
  return response.data;
}

// Build payload for update endpoint, stripping metadata and coercing numbers
export function buildUpdatePayload(
  settings: ClassificationSettings,
): UpdateClassificationSettingsDto {
  return {
    // Layer-specific fields (Story 3.0)
    layer1_rules: settings.layer1_rules,
    layer2_rules: settings.layer2_rules,
    layer3_rules: settings.layer3_rules,
    confidence_bands: settings.confidence_bands,
    manual_review_settings: settings.manual_review_settings,

    // V1 fields for backward compatibility
    prefilter_rules: settings.prefilter_rules?.map((rule) => ({
      category: rule.category,
      pattern: rule.pattern,
      reasoning: rule.reasoning,
      enabled: Boolean(rule.enabled),
    })),
    classification_indicators: settings.classification_indicators,
    llm_temperature: settings.llm_temperature,
    confidence_threshold: settings.confidence_threshold,
    content_truncation_limit: settings.content_truncation_limit,
  };
}

// Update settings
async function updateSettings(settings: ClassificationSettings): Promise<ClassificationSettings> {
  const payload = buildUpdatePayload(settings);
  const response = await axios.put<ClassificationSettings>(`${API_URL}/api/settings`, payload);
  return response.data;
}

// Reset settings to defaults via dedicated endpoint
async function resetSettingsToDefaults(): Promise<ClassificationSettings> {
  const response = await axios.post<ClassificationSettings>(`${API_URL}/api/settings/reset`);
  return response.data;
}

// Query key
const SETTINGS_KEY = ['settings'];

/**
 * Hook to fetch current classification settings
 */
export function useSettings() {
  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: fetchSettings,
    staleTime: 5 * 60 * 1000, // 5 minutes (matches backend cache TTL)
    retry: 2,
  });
}

/**
 * Hook to update classification settings
 */
export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSettings,
    // Optimistic update
    onMutate: async (newSettings: ClassificationSettings) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: SETTINGS_KEY });

      // Snapshot previous value
      const previousSettings = queryClient.getQueryData<ClassificationSettings>(SETTINGS_KEY);

      // Optimistically update to new value
      if (previousSettings) {
        queryClient.setQueryData<ClassificationSettings>(SETTINGS_KEY, {
          ...previousSettings,
          ...newSettings,
        });
      }

      return { previousSettings };
    },
    // On error, roll back to previous value
    onError: (err, newSettings, context) => {
      if (context?.previousSettings) {
        queryClient.setQueryData(SETTINGS_KEY, context.previousSettings);
      }
    },
    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: SETTINGS_KEY });
    },
  });
}

/**
 * Hook to reset settings to defaults
 */
export function useResetSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: resetSettingsToDefaults,
    onSuccess: (data: ClassificationSettings) => {
      // Update cache with reset data
      queryClient.setQueryData(SETTINGS_KEY, data);
    },
  });
}
