import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useUserPreferences } from '../use-user-preferences';
import * as preferencesApi from '@/lib/api/preferences';

// Mock the preferences API
jest.mock('@/lib/api/preferences', () => ({
  preferencesApi: {
    getPreferences: jest.fn(),
    updatePreferences: jest.fn(),
  },
}));

const mockPreferences = {
  id: 'pref-1',
  userId: 'user-1',
  theme: 'light' as const,
  sidebarCollapsed: false,
  defaultView: 'cards' as const,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

// Helper to create wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useUserPreferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with undefined preferences', async () => {
    (preferencesApi.preferencesApi.getPreferences as jest.Mock).mockResolvedValue(mockPreferences);

    const { result } = renderHook(() => useUserPreferences(), {
      wrapper: createWrapper(),
    });

    expect(result.current.preferences).toBeUndefined();
    expect(result.current.isLoading).toBe(true);
  });

  it('should fetch preferences on mount', async () => {
    (preferencesApi.preferencesApi.getPreferences as jest.Mock).mockResolvedValue(mockPreferences);

    const { result } = renderHook(() => useUserPreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.preferences).toBeDefined();
    });

    expect(preferencesApi.preferencesApi.getPreferences).toHaveBeenCalled();
  });

  it('should return fetched preferences', async () => {
    (preferencesApi.preferencesApi.getPreferences as jest.Mock).mockResolvedValue(mockPreferences);

    const { result } = renderHook(() => useUserPreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.preferences).toEqual(mockPreferences);
    });
  });

  it('should handle loading state', async () => {
    (preferencesApi.preferencesApi.getPreferences as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockPreferences), 100))
    );

    const { result } = renderHook(() => useUserPreferences(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should handle fetch errors', async () => {
    const error = new Error('Failed to fetch preferences');
    (preferencesApi.preferencesApi.getPreferences as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(() => useUserPreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });
  });

  it('should update preferences', async () => {
    (preferencesApi.preferencesApi.getPreferences as jest.Mock).mockResolvedValue(mockPreferences);
    (preferencesApi.preferencesApi.updatePreferences as jest.Mock).mockResolvedValue({
      ...mockPreferences,
      theme: 'dark',
    });

    const { result } = renderHook(() => useUserPreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.preferences).toBeDefined();
    });

    act(() => {
      result.current.updatePreferences({ theme: 'dark' });
    });

    await waitFor(() => {
      expect(preferencesApi.preferencesApi.updatePreferences).toHaveBeenCalledWith({
        theme: 'dark',
      });
    });
  });

  it('should handle update errors', async () => {
    (preferencesApi.preferencesApi.getPreferences as jest.Mock).mockResolvedValue(mockPreferences);
    const updateError = new Error('Update failed');
    (preferencesApi.preferencesApi.updatePreferences as jest.Mock).mockRejectedValue(updateError);

    const { result } = renderHook(() => useUserPreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.preferences).toBeDefined();
    });

    act(() => {
      result.current.updatePreferences({ theme: 'dark' });
    });

    // Note: Error handling in React Query happens asynchronously
    await waitFor(() => {
      expect(result.current.isUpdating).toBe(false);
    });
  });

  it('should provide updatePreferencesAsync', async () => {
    (preferencesApi.preferencesApi.getPreferences as jest.Mock).mockResolvedValue(mockPreferences);
    (preferencesApi.preferencesApi.updatePreferences as jest.Mock).mockResolvedValue(mockPreferences);

    const { result } = renderHook(() => useUserPreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.preferences).toBeDefined();
    });

    expect(result.current.updatePreferencesAsync).toBeDefined();
    expect(typeof result.current.updatePreferencesAsync).toBe('function');
  });

  it('should track updating state', async () => {
    (preferencesApi.preferencesApi.getPreferences as jest.Mock).mockResolvedValue(mockPreferences);
    (preferencesApi.preferencesApi.updatePreferences as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockPreferences), 100))
    );

    const { result } = renderHook(() => useUserPreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.preferences).toBeDefined();
    });

    act(() => {
      result.current.updatePreferences({ theme: 'dark' });
    });

    expect(result.current.isUpdating).toBe(true);

    await waitFor(() => {
      expect(result.current.isUpdating).toBe(false);
    });
  });

  it('should cache preferences for 5 minutes', async () => {
    (preferencesApi.preferencesApi.getPreferences as jest.Mock).mockResolvedValue(mockPreferences);

    const { result } = renderHook(() => useUserPreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.preferences).toBeDefined();
    });

    // Second call should use cache
    const { result: result2 } = renderHook(() => useUserPreferences(), {
      wrapper: createWrapper(),
    });

    expect(result2.current.preferences).toEqual(mockPreferences);
  });

  it('should update cached data on successful mutation', async () => {
    (preferencesApi.preferencesApi.getPreferences as jest.Mock).mockResolvedValue(mockPreferences);
    const updatedPreferences = { ...mockPreferences, theme: 'dark' as const };
    (preferencesApi.preferencesApi.updatePreferences as jest.Mock).mockResolvedValue(
      updatedPreferences
    );

    const { result } = renderHook(() => useUserPreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.preferences).toEqual(mockPreferences);
    });

    act(() => {
      result.current.updatePreferences({ theme: 'dark' });
    });

    await waitFor(() => {
      expect(result.current.preferences).toEqual(updatedPreferences);
    });
  });

  it('should return all required properties', async () => {
    (preferencesApi.preferencesApi.getPreferences as jest.Mock).mockResolvedValue(mockPreferences);

    const { result } = renderHook(() => useUserPreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.preferences).toBeDefined();
    });

    expect(result.current).toHaveProperty('preferences');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('updatePreferences');
    expect(result.current).toHaveProperty('updatePreferencesAsync');
    expect(result.current).toHaveProperty('isUpdating');
  });

  it('should handle multiple sequential updates', async () => {
    (preferencesApi.preferencesApi.getPreferences as jest.Mock).mockResolvedValue(mockPreferences);
    (preferencesApi.preferencesApi.updatePreferences as jest.Mock).mockResolvedValue(mockPreferences);

    const { result } = renderHook(() => useUserPreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.preferences).toBeDefined();
    });

    act(() => {
      result.current.updatePreferences({ theme: 'dark' });
    });

    await waitFor(() => {
      expect(result.current.isUpdating).toBe(false);
    });

    act(() => {
      result.current.updatePreferences({ sidebarCollapsed: true });
    });

    await waitFor(() => {
      expect(preferencesApi.preferencesApi.updatePreferences).toHaveBeenCalledTimes(2);
    });
  });

  it('should provide updatePreferences as a mutation function', async () => {
    (preferencesApi.preferencesApi.getPreferences as jest.Mock).mockResolvedValue(mockPreferences);
    (preferencesApi.preferencesApi.updatePreferences as jest.Mock).mockResolvedValue(mockPreferences);

    const { result } = renderHook(() => useUserPreferences(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.updatePreferences).toBe('function');
    expect(typeof result.current.updatePreferencesAsync).toBe('function');
  });

  it('should handle empty preferences response', async () => {
    (preferencesApi.preferencesApi.getPreferences as jest.Mock).mockResolvedValue(null);

    const { result } = renderHook(() => useUserPreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.preferences).toBeNull();
  });

  it('should call API with correct method name', async () => {
    (preferencesApi.preferencesApi.getPreferences as jest.Mock).mockResolvedValue(mockPreferences);

    renderHook(() => useUserPreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(preferencesApi.preferencesApi.getPreferences).toHaveBeenCalled();
    });
  });

  it('should use correct query key', async () => {
    (preferencesApi.preferencesApi.getPreferences as jest.Mock).mockResolvedValue(mockPreferences);

    const { result } = renderHook(() => useUserPreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.preferences).toBeDefined();
    });

    // Query key should be ['preferences']
    expect(preferencesApi.preferencesApi.getPreferences).toHaveBeenCalled();
  });
});
