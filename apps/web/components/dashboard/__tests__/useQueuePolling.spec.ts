/**
 * T074: React Query polling behavior tests
 *
 * Comprehensive test suite for useQueuePolling custom hook
 * Tests written BEFORE implementation (TDD approach)
 *
 * Hook Purpose:
 * - Poll job queue status every 5 seconds
 * - Stop polling when all jobs complete
 * - Provide real-time job progress updates
 * - Handle errors gracefully with retry logic
 * - Clean up properly on unmount
 *
 * Phase 6: Dashboard (Real-time polling)
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { jobsApi } from '@/lib/api-client';
import type { Job, JobProgress } from '@website-scraper/shared';

// Mock the API client
jest.mock('@/lib/api-client', () => ({
  jobsApi: {
    getAll: jest.fn(),
  },
}));

// Type definitions for the hook (expected interface)
interface UseQueuePollingOptions {
  includeCompleted?: boolean;
  limit?: number;
}

interface UseQueuePollingReturn {
  jobs: JobProgress[];
  completedJobs?: Job[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<any>;
}

// STUB: The hook we're testing (will be implemented later in useQueuePolling.ts)
// This stub allows tests to run and fail properly (TDD approach)
function useQueuePolling(options?: UseQueuePollingOptions): UseQueuePollingReturn {
  // Placeholder return - all tests should fail until real implementation exists
  return {
    jobs: [],
    completedJobs: [],
    isLoading: false,
    isError: false,
    error: null,
    refetch: async () => ({}),
  };
}

// Test wrapper with React Query provider
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retry for tests
        gcTime: 0, // Disable cache to prevent cross-test pollution
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

// Helper to create mock job data
function createMockJob(overrides: Partial<Job> = {}): Job {
  return {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Job',
    status: 'processing',
    totalUrls: 100,
    processedUrls: 50,
    successfulUrls: 45,
    failedUrls: 2,
    rejectedUrls: 3,
    currentUrl: 'https://example.com',
    currentStage: 'classifying',
    currentUrlStartedAt: new Date().toISOString(),
    progressPercentage: 50,
    processingRate: 10,
    estimatedTimeRemaining: 300,
    totalCost: 5.50,
    geminiCost: 3.00,
    gptCost: 2.50,
    avgCostPerUrl: 0.11,
    projectedTotalCost: 11.00,
    startedAt: new Date().toISOString(),
    completedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// Helper to create mock job progress data
function createMockJobProgress(overrides: Partial<JobProgress> = {}): JobProgress {
  return {
    job_id: '123e4567-e89b-12d3-a456-426614174000',
    job_name: 'Test Job',
    status: 'processing' as any,
    progress_percentage: 50,
    processing_rate: 10,
    estimated_time_remaining: 300,
    queue_position: null,
    layer_breakdown: {
      layer1_eliminated: 10,
      layer2_eliminated: 5,
      layer3_classified: 35,
    },
    cost_metrics: {
      total_cost: 5.50,
      avg_cost_per_url: 0.11,
      projected_total_cost: 11.00,
    },
    ...overrides,
  };
}

describe('useQueuePolling', () => {
  let mockJobsApi: jest.Mocked<typeof jobsApi>;

  beforeEach(() => {
    jest.useFakeTimers();
    mockJobsApi = jobsApi as jest.Mocked<typeof jobsApi>;
    mockJobsApi.getAll.mockClear();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('Polling Activation (4 tests)', () => {
    test('starts polling immediately on mount', async () => {
      const mockJob = createMockJob();
      mockJobsApi.getAll.mockResolvedValue({
        success: true,
        data: [mockJob],
      });

      const { result } = renderHook(() => useQueuePolling(), {
        wrapper: createWrapper(),
      });

      // Hook should be loading initially
      expect(result.current.isLoading).toBe(true);

      // Wait for initial fetch to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify API was called immediately (no 5s delay for first fetch)
      expect(mockJobsApi.getAll).toHaveBeenCalledTimes(1);
      expect(result.current.jobs).toHaveLength(1);
    });

    test('polling interval is 5000ms (5 seconds)', async () => {
      const mockJob = createMockJob();
      mockJobsApi.getAll.mockResolvedValue({
        success: true,
        data: [mockJob],
      });

      renderHook(() => useQueuePolling(), {
        wrapper: createWrapper(),
      });

      // Wait for initial fetch
      await waitFor(() => {
        expect(mockJobsApi.getAll).toHaveBeenCalledTimes(1);
      });

      // Advance time by 5 seconds - should trigger second fetch
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(mockJobsApi.getAll).toHaveBeenCalledTimes(2);
      });

      // Advance another 5 seconds - should trigger third fetch
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(mockJobsApi.getAll).toHaveBeenCalledTimes(3);
      });
    });

    test('each poll calls the API endpoint', async () => {
      const mockJob = createMockJob();
      mockJobsApi.getAll.mockResolvedValue({
        success: true,
        data: [mockJob],
      });

      renderHook(() => useQueuePolling(), {
        wrapper: createWrapper(),
      });

      // Wait for initial fetch
      await waitFor(() => {
        expect(mockJobsApi.getAll).toHaveBeenCalledTimes(1);
      });

      // Trigger 3 more polls
      for (let i = 0; i < 3; i++) {
        act(() => {
          jest.advanceTimersByTime(5000);
        });

        await waitFor(() => {
          expect(mockJobsApi.getAll).toHaveBeenCalledTimes(i + 2);
        });
      }

      // Verify total calls
      expect(mockJobsApi.getAll).toHaveBeenCalledTimes(4);
    });

    test('polling uses React Query refetchInterval', async () => {
      const mockJob = createMockJob();
      mockJobsApi.getAll.mockResolvedValue({
        success: true,
        data: [mockJob],
      });

      const { result } = renderHook(() => useQueuePolling(), {
        wrapper: createWrapper(),
      });

      // Initial fetch
      await waitFor(() => {
        expect(mockJobsApi.getAll).toHaveBeenCalledTimes(1);
      });

      // Verify polling continues automatically (React Query refetchInterval)
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(mockJobsApi.getAll).toHaveBeenCalledTimes(2);
      });

      // Polling should continue indefinitely while jobs are processing
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Stop Polling on Job Complete (3 tests)', () => {
    test('polling stops when all jobs reach completed status', async () => {
      const processingJob = createMockJob({ status: 'processing' });
      const completedJob = createMockJob({ status: 'completed', completedAt: new Date().toISOString() });

      // Start with processing job
      mockJobsApi.getAll.mockResolvedValueOnce({
        success: true,
        data: [processingJob],
      });

      const { rerender } = renderHook(() => useQueuePolling(), {
        wrapper: createWrapper(),
      });

      // Wait for initial fetch
      await waitFor(() => {
        expect(mockJobsApi.getAll).toHaveBeenCalledTimes(1);
      });

      // Job completes - return completed status
      mockJobsApi.getAll.mockResolvedValueOnce({
        success: true,
        data: [completedJob],
      });

      // Advance time to trigger next poll
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(mockJobsApi.getAll).toHaveBeenCalledTimes(2);
      });

      // Advance another 5 seconds - polling should have STOPPED
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Wait a bit to ensure no new calls
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Should still be 2 calls (no third call)
      expect(mockJobsApi.getAll).toHaveBeenCalledTimes(2);
    });

    test('polling stops when job count reaches zero', async () => {
      const mockJob = createMockJob({ status: 'processing' });

      // Start with one job
      mockJobsApi.getAll.mockResolvedValueOnce({
        success: true,
        data: [mockJob],
      });

      renderHook(() => useQueuePolling(), {
        wrapper: createWrapper(),
      });

      // Wait for initial fetch
      await waitFor(() => {
        expect(mockJobsApi.getAll).toHaveBeenCalledTimes(1);
      });

      // Job disappears (completed and removed from queue)
      mockJobsApi.getAll.mockResolvedValueOnce({
        success: true,
        data: [],
      });

      // Advance time to trigger next poll
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(mockJobsApi.getAll).toHaveBeenCalledTimes(2);
      });

      // Advance another 5 seconds - polling should have STOPPED
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Wait a bit to ensure no new calls
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Should still be 2 calls (no third call)
      expect(mockJobsApi.getAll).toHaveBeenCalledTimes(2);
    });

    test('polling continues if even one job still processing', async () => {
      const completedJob1 = createMockJob({
        id: 'job-1',
        status: 'completed',
        completedAt: new Date().toISOString(),
      });
      const completedJob2 = createMockJob({
        id: 'job-2',
        status: 'completed',
        completedAt: new Date().toISOString(),
      });
      const processingJob = createMockJob({
        id: 'job-3',
        status: 'processing',
      });

      // Multiple jobs, one still processing
      mockJobsApi.getAll.mockResolvedValue({
        success: true,
        data: [completedJob1, completedJob2, processingJob],
      });

      renderHook(() => useQueuePolling(), {
        wrapper: createWrapper(),
      });

      // Wait for initial fetch
      await waitFor(() => {
        expect(mockJobsApi.getAll).toHaveBeenCalledTimes(1);
      });

      // Advance time - polling should CONTINUE because one job is still processing
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(mockJobsApi.getAll).toHaveBeenCalledTimes(2);
      });

      // Advance again - polling should still continue
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(mockJobsApi.getAll).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe('Data Freshness (3 tests)', () => {
    test('fresh data on each poll', async () => {
      const job1 = createMockJob({ processedUrls: 50, progressPercentage: 50 });
      const job2 = createMockJob({ processedUrls: 75, progressPercentage: 75 });
      const job3 = createMockJob({ processedUrls: 100, progressPercentage: 100, status: 'completed' });

      // First poll returns 50% complete
      mockJobsApi.getAll.mockResolvedValueOnce({
        success: true,
        data: [job1],
      });

      const { result } = renderHook(() => useQueuePolling(), {
        wrapper: createWrapper(),
      });

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.jobs).toHaveLength(1);
        expect(result.current.jobs[0].processedUrls).toBe(50);
      });

      // Second poll returns 75% complete
      mockJobsApi.getAll.mockResolvedValueOnce({
        success: true,
        data: [job2],
      });

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(result.current.jobs[0].processedUrls).toBe(75);
      });

      // Third poll returns 100% complete
      mockJobsApi.getAll.mockResolvedValueOnce({
        success: true,
        data: [job3],
      });

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(result.current.jobs[0].processedUrls).toBe(100);
        expect(result.current.jobs[0].status).toBe('completed');
      });
    });

    test('stale time is none (immediate refetch)', async () => {
      const mockJob = createMockJob();
      mockJobsApi.getAll.mockResolvedValue({
        success: true,
        data: [mockJob],
      });

      const { result } = renderHook(() => useQueuePolling(), {
        wrapper: createWrapper(),
      });

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Manually trigger refetch (should execute immediately, not use stale data)
      const refetchPromise = result.current.refetch();

      await waitFor(() => {
        expect(mockJobsApi.getAll).toHaveBeenCalledTimes(2);
      });

      await refetchPromise;
    });

    test('data updates in real-time as jobs progress', async () => {
      let progressValue = 0;

      // Mock API returns increasing progress
      mockJobsApi.getAll.mockImplementation(async () => {
        progressValue += 25;
        return {
          success: true,
          data: [
            createMockJob({
              processedUrls: progressValue,
              progressPercentage: progressValue,
            }),
          ],
        };
      });

      const { result } = renderHook(() => useQueuePolling(), {
        wrapper: createWrapper(),
      });

      // Initial fetch: 25%
      await waitFor(() => {
        expect(result.current.jobs[0]?.progressPercentage).toBe(25);
      });

      // Poll 2: 50%
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      await waitFor(() => {
        expect(result.current.jobs[0]?.progressPercentage).toBe(50);
      });

      // Poll 3: 75%
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      await waitFor(() => {
        expect(result.current.jobs[0]?.progressPercentage).toBe(75);
      });

      // Poll 4: 100%
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      await waitFor(() => {
        expect(result.current.jobs[0]?.progressPercentage).toBe(100);
      });
    });
  });

  describe('Error Handling (3 tests)', () => {
    test('polling continues on transient errors', async () => {
      const mockJob = createMockJob();

      // First call succeeds
      mockJobsApi.getAll.mockResolvedValueOnce({
        success: true,
        data: [mockJob],
      });

      renderHook(() => useQueuePolling(), {
        wrapper: createWrapper(),
      });

      // Wait for initial fetch
      await waitFor(() => {
        expect(mockJobsApi.getAll).toHaveBeenCalledTimes(1);
      });

      // Second call fails (transient error)
      mockJobsApi.getAll.mockRejectedValueOnce(new Error('Network timeout'));

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Wait for error to be handled
      await waitFor(() => {
        expect(mockJobsApi.getAll).toHaveBeenCalledTimes(2);
      });

      // Third call succeeds (polling continues)
      mockJobsApi.getAll.mockResolvedValueOnce({
        success: true,
        data: [mockJob],
      });

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(mockJobsApi.getAll).toHaveBeenCalledTimes(3);
      });
    });

    test('shows error after 3 consecutive failures', async () => {
      // All calls fail
      mockJobsApi.getAll.mockRejectedValue(new Error('API unavailable'));

      // Create wrapper with retry enabled for this test
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: 3,
            retryDelay: 0, // No delay for tests
            gcTime: 0,
          },
        },
      });

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useQueuePolling(), { wrapper });

      // Should show error after retries exhausted
      await waitFor(
        () => {
          expect(result.current.isError).toBe(true);
          expect(result.current.error).toBeInstanceOf(Error);
          expect(result.current.error?.message).toBe('API unavailable');
        },
        { timeout: 3000 }
      );

      // Should have attempted 4 times (initial + 3 retries)
      expect(mockJobsApi.getAll).toHaveBeenCalledTimes(4);
    });

    test('polling resumes after error recovery', async () => {
      const mockJob = createMockJob();

      // First call succeeds
      mockJobsApi.getAll.mockResolvedValueOnce({
        success: true,
        data: [mockJob],
      });

      const { result } = renderHook(() => useQueuePolling(), {
        wrapper: createWrapper(),
      });

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.isError).toBe(false);
      });

      // Second call fails
      mockJobsApi.getAll.mockRejectedValueOnce(new Error('Temporary failure'));

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Third call succeeds (recovery)
      mockJobsApi.getAll.mockResolvedValueOnce({
        success: true,
        data: [mockJob],
      });

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Verify error state cleared and data returned
      await waitFor(() => {
        expect(result.current.isError).toBe(false);
        expect(result.current.jobs).toHaveLength(1);
      });

      // Polling should continue normally
      mockJobsApi.getAll.mockResolvedValueOnce({
        success: true,
        data: [mockJob],
      });

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(mockJobsApi.getAll).toHaveBeenCalledTimes(4);
      });
    });
  });

  describe('Memory & Performance (2 tests)', () => {
    test('no memory leaks on unmount', async () => {
      const mockJob = createMockJob();
      mockJobsApi.getAll.mockResolvedValue({
        success: true,
        data: [mockJob],
      });

      const { unmount } = renderHook(() => useQueuePolling(), {
        wrapper: createWrapper(),
      });

      // Wait for initial fetch
      await waitFor(() => {
        expect(mockJobsApi.getAll).toHaveBeenCalledTimes(1);
      });

      // Unmount the component
      unmount();

      // Advance time - should NOT trigger more API calls
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Wait a bit to ensure no calls
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Should still be only 1 call (no polling after unmount)
      expect(mockJobsApi.getAll).toHaveBeenCalledTimes(1);
    });

    test('polling stops when component unmounts', async () => {
      const mockJob = createMockJob();
      mockJobsApi.getAll.mockResolvedValue({
        success: true,
        data: [mockJob],
      });

      const { unmount } = renderHook(() => useQueuePolling(), {
        wrapper: createWrapper(),
      });

      // Wait for initial fetch and one poll
      await waitFor(() => {
        expect(mockJobsApi.getAll).toHaveBeenCalledTimes(1);
      });

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(mockJobsApi.getAll).toHaveBeenCalledTimes(2);
      });

      // Unmount
      unmount();

      // Advance time multiple times - no more calls should happen
      for (let i = 0; i < 5; i++) {
        act(() => {
          jest.advanceTimersByTime(5000);
        });
      }

      // Wait to ensure no new calls
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Should remain at 2 calls
      expect(mockJobsApi.getAll).toHaveBeenCalledTimes(2);
    });
  });

  describe('Initial Load (2 tests)', () => {
    test('immediate first fetch (not waiting 5s)', async () => {
      const mockJob = createMockJob();
      const startTime = Date.now();

      mockJobsApi.getAll.mockResolvedValue({
        success: true,
        data: [mockJob],
      });

      renderHook(() => useQueuePolling(), {
        wrapper: createWrapper(),
      });

      // Wait for first API call
      await waitFor(() => {
        expect(mockJobsApi.getAll).toHaveBeenCalledTimes(1);
      });

      const elapsedTime = Date.now() - startTime;

      // Should be called within 1 second (not after 5 second delay)
      expect(elapsedTime).toBeLessThan(1000);
    });

    test('loading state before first data arrives', async () => {
      const mockJob = createMockJob();

      // Delay the API response
      mockJobsApi.getAll.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                success: true,
                data: [mockJob],
              });
            }, 100);
          })
      );

      const { result } = renderHook(() => useQueuePolling(), {
        wrapper: createWrapper(),
      });

      // Should be loading initially
      expect(result.current.isLoading).toBe(true);
      expect(result.current.jobs).toEqual([]);

      // Wait for data to arrive
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.jobs).toHaveLength(1);
      });
    });
  });

  describe('Conditional Polling Logic (2 tests)', () => {
    test('refetchInterval is false when all jobs complete', async () => {
      const completedJob = createMockJob({
        status: 'completed',
        completedAt: new Date().toISOString(),
      });

      mockJobsApi.getAll.mockResolvedValue({
        success: true,
        data: [completedJob],
      });

      renderHook(() => useQueuePolling(), {
        wrapper: createWrapper(),
      });

      // Wait for initial fetch
      await waitFor(() => {
        expect(mockJobsApi.getAll).toHaveBeenCalledTimes(1);
      });

      // Advance time - should NOT trigger more polls
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Should remain at 1 call (refetchInterval = false)
      expect(mockJobsApi.getAll).toHaveBeenCalledTimes(1);
    });

    test('refetchInterval is 5000 when jobs are processing', async () => {
      const processingJob = createMockJob({ status: 'processing' });

      mockJobsApi.getAll.mockResolvedValue({
        success: true,
        data: [processingJob],
      });

      renderHook(() => useQueuePolling(), {
        wrapper: createWrapper(),
      });

      // Wait for initial fetch
      await waitFor(() => {
        expect(mockJobsApi.getAll).toHaveBeenCalledTimes(1);
      });

      // Advance time - should trigger polls at 5s intervals
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(mockJobsApi.getAll).toHaveBeenCalledTimes(2);
      });

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(mockJobsApi.getAll).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe('Options Support (2 tests)', () => {
    test('includeCompleted option filters completed jobs', async () => {
      const processingJob = createMockJob({ id: 'job-1', status: 'processing' });
      const completedJob = createMockJob({ id: 'job-2', status: 'completed' });

      mockJobsApi.getAll.mockResolvedValue({
        success: true,
        data: [processingJob, completedJob],
      });

      const { result } = renderHook(() => useQueuePolling({ includeCompleted: true }), {
        wrapper: createWrapper(),
      });

      // Wait for data
      await waitFor(() => {
        expect(result.current.jobs).toHaveLength(1); // Only processing job
        expect(result.current.completedJobs).toHaveLength(1); // Completed job separate
      });
    });

    test('limit option controls result count', async () => {
      const jobs = Array.from({ length: 10 }, (_, i) =>
        createMockJob({ id: `job-${i}`, status: 'processing' })
      );

      mockJobsApi.getAll.mockResolvedValue({
        success: true,
        data: jobs,
      });

      const { result } = renderHook(() => useQueuePolling({ limit: 5 }), {
        wrapper: createWrapper(),
      });

      // Wait for data
      await waitFor(() => {
        expect(result.current.jobs).toHaveLength(5); // Limited to 5
      });
    });
  });
});
