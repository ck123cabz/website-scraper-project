import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, createElement } from 'react';
import axios from 'axios';
import { useDashboardBadge } from '../useDashboardBadge';
import { useSettings } from '../useSettings';
import { ClassificationSettings } from '@website-scraper/shared';

// Mock axios and useSettings
jest.mock('axios');
jest.mock('../useSettings');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedUseSettings = useSettings as jest.MockedFunction<typeof useSettings>;

describe('useDashboardBadge', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  const createSettingsMockWithBadge = (enabled: boolean): ClassificationSettings => ({
    id: 'settings-1',
    layer1_rules: {} as any,
    layer2_rules: {} as any,
    layer3_rules: {} as any,
    confidence_bands: {} as any,
    manual_review_settings: {
      queue_size_limit: null,
      auto_review_timeout_days: null,
      notifications: {
        email_threshold: 100,
        email_recipient: 'test@example.com',
        slack_webhook_url: null,
        slack_threshold: 50,
        dashboard_badge: enabled,
      },
    },
    prefilter_rules: [],
    classification_indicators: [],
    llm_temperature: 0.5,
    confidence_threshold: 0.5,
    content_truncation_limit: 10000,
    updated_at: '2025-11-11T00:00:00Z',
  });

  describe('successful data fetching', () => {
    it('returns queue count and enabled status when both queries succeed', async () => {
      // Mock queue status response
      const queueStatusData = {
        active_count: 12,
        stale_count: 3,
        by_band: { high: 5, medium: 4, low: 3 },
        oldest_queued_at: '2025-11-11T10:00:00Z',
      };

      mockedAxios.get.mockResolvedValueOnce({ data: queueStatusData });

      const settingsData = createSettingsMockWithBadge(true);

      mockedUseSettings.mockReturnValueOnce({
        data: settingsData,
        isLoading: false,
        error: null,
      } as any);

      const { result } = renderHook(() => useDashboardBadge(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.queueCount).toBe(12);
      expect(result.current.isEnabled).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('returns correct queue count with dashboard_badge disabled', async () => {
      const queueStatusData = {
        active_count: 25,
        stale_count: 5,
        by_band: { high: 15, medium: 10 },
        oldest_queued_at: '2025-11-11T09:00:00Z',
      };

      mockedAxios.get.mockResolvedValueOnce({ data: queueStatusData });

      const settingsDataDisabled = createSettingsMockWithBadge(false);

      mockedUseSettings.mockReturnValueOnce({
        data: settingsDataDisabled,
        isLoading: false,
        error: null,
      } as any);

      const { result } = renderHook(() => useDashboardBadge(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.queueCount).toBe(25);
      expect(result.current.isEnabled).toBe(false);
    });

    it('returns 0 queue count when queue is empty', async () => {
      const queueStatusData = {
        active_count: 0,
        stale_count: 0,
        by_band: {},
        oldest_queued_at: null,
      };

      mockedAxios.get.mockResolvedValueOnce({ data: queueStatusData });

      const settingsData = createSettingsMockWithBadge(true);

      mockedUseSettings.mockReturnValueOnce({
        data: settingsData,
        isLoading: false,
        error: null,
      } as any);

      const { result } = renderHook(() => useDashboardBadge(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.queueCount).toBe(0);
      expect(result.current.isEnabled).toBe(true);
      expect(result.current.error).toBeNull();
    });
  });

  describe('loading states', () => {
    it('returns isLoading=true while queue status is loading', () => {
      mockedAxios.get.mockImplementationOnce(() => new Promise(() => {})); // Never resolves

      const settingsData = createSettingsMockWithBadge(true);

      mockedUseSettings.mockReturnValueOnce({
        data: settingsData,
        isLoading: false,
        error: null,
      } as any);

      const { result } = renderHook(() => useDashboardBadge(), { wrapper });

      // Hook should indicate loading
      expect(result.current.isLoading).toBe(true);
    });

    it('returns isLoading=true while settings is loading', () => {
      const queueStatusData = {
        active_count: 5,
        stale_count: 1,
        by_band: { high: 5 },
        oldest_queued_at: '2025-11-11T10:00:00Z',
      };

      mockedAxios.get.mockResolvedValueOnce({ data: queueStatusData });

      mockedUseSettings.mockReturnValueOnce({
        data: undefined,
        isLoading: true,
        error: null,
      } as any);

      const { result } = renderHook(() => useDashboardBadge(), { wrapper });

      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('error handling', () => {
    it('returns error when queue status fetch fails', async () => {
      const errorMessage = 'Failed to fetch queue status';
      mockedAxios.get.mockRejectedValueOnce(new Error(errorMessage));

      const settingsData = createSettingsMockWithBadge(true);

      mockedUseSettings.mockReturnValueOnce({
        data: settingsData,
        isLoading: false,
        error: null,
      } as any);

      const { result } = renderHook(() => useDashboardBadge(), { wrapper });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error?.message).toBe(errorMessage);
      expect(result.current.isLoading).toBe(false);
    });

    it('returns error when settings fetch fails', async () => {
      const queueStatusData = {
        active_count: 10,
        stale_count: 2,
        by_band: { medium: 10 },
        oldest_queued_at: '2025-11-11T10:00:00Z',
      };

      mockedAxios.get.mockResolvedValueOnce({ data: queueStatusData });

      const settingsError = new Error('Failed to fetch settings');

      mockedUseSettings.mockReturnValueOnce({
        data: undefined,
        isLoading: false,
        error: settingsError,
      } as any);

      const { result } = renderHook(() => useDashboardBadge(), { wrapper });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error).toBe(settingsError);
    });

    it('prioritizes queue status error over settings error', async () => {
      const queueError = new Error('Queue status failed');
      const settingsError = new Error('Settings failed');

      mockedAxios.get.mockRejectedValueOnce(queueError);

      mockedUseSettings.mockReturnValueOnce({
        data: undefined,
        isLoading: false,
        error: settingsError,
      } as any);

      const { result } = renderHook(() => useDashboardBadge(), { wrapper });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      // Should return queue error first
      expect(result.current.error).toBe(queueError);
    });
  });

  describe('edge cases', () => {
    it('handles missing manual_review_settings gracefully', async () => {
      const queueStatusData = {
        active_count: 8,
        stale_count: 2,
        by_band: { low: 8 },
        oldest_queued_at: '2025-11-11T10:00:00Z',
      };

      mockedAxios.get.mockResolvedValueOnce({ data: queueStatusData });

      // Settings without manual_review_settings
      const settingsData: Partial<ClassificationSettings> = {
        id: 'settings-6',
        prefilter_rules: [],
        classification_indicators: [],
        llm_temperature: 0.5,
        confidence_threshold: 0.5,
        content_truncation_limit: 10000,
      };

      mockedUseSettings.mockReturnValueOnce({
        data: settingsData as any,
        isLoading: false,
        error: null,
      } as any);

      const { result } = renderHook(() => useDashboardBadge(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.queueCount).toBe(8);
      expect(result.current.isEnabled).toBe(false); // Default to false
      expect(result.current.error).toBeNull();
    });

    it('handles undefined settings data gracefully', async () => {
      const queueStatusData = {
        active_count: 6,
        stale_count: 1,
        by_band: { high: 6 },
        oldest_queued_at: '2025-11-11T10:00:00Z',
      };

      mockedAxios.get.mockResolvedValueOnce({ data: queueStatusData });

      mockedUseSettings.mockReturnValueOnce({
        data: undefined,
        isLoading: false,
        error: null,
      } as any);

      const { result } = renderHook(() => useDashboardBadge(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.queueCount).toBe(6);
      expect(result.current.isEnabled).toBe(false); // Default to false
      expect(result.current.error).toBeNull();
    });
  });

  describe('return type validation', () => {
    it('returns object with all required properties', async () => {
      const queueStatusData = {
        active_count: 5,
        stale_count: 1,
        by_band: { high: 5 },
        oldest_queued_at: '2025-11-11T10:00:00Z',
      };

      mockedAxios.get.mockResolvedValueOnce({ data: queueStatusData });

      const settingsData = createSettingsMockWithBadge(true);

      mockedUseSettings.mockReturnValue({
        data: settingsData,
        isLoading: false,
        error: null,
      } as any);

      const { result } = renderHook(() => useDashboardBadge(), { wrapper });

      await waitFor(() => {
        expect(result.current.queueCount).toBe(5);
      });

      // Verify return object has all required properties
      expect(result.current).toHaveProperty('queueCount');
      expect(result.current).toHaveProperty('isEnabled');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');

      // Verify property types
      expect(typeof result.current.queueCount).toBe('number');
      expect(typeof result.current.isEnabled).toBe('boolean');
      expect(typeof result.current.isLoading).toBe('boolean');
      expect(
        result.current.error === null || result.current.error instanceof Error,
      ).toBe(true);
    });
  });
});
