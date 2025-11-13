import { renderHook, waitFor, act } from '@testing-library/react';
import { useJob } from '@/hooks/use-jobs';
import { jobsApi } from '@/lib/api-client';
import { createPerformanceQueryWrapper } from './perf-test-helpers';

jest.mock('@/lib/api-client', () => ({
  jobsApi: {
    getById: jest.fn(),
  },
}));

jest.mock('@/lib/supabase-client', () => ({
  supabase: {
    channel: jest.fn(() => ({
      on: jest.fn(() => ({
        subscribe: jest.fn(),
      })),
    })),
    removeChannel: jest.fn(),
  },
}));

jest.mock('@/lib/realtime-service', () => ({
  subscribeToJob: jest.fn(() => ({ id: 'channel-1' })),
  unsubscribe: jest.fn(),
}));

const mockedJobsApi = jobsApi as jest.Mocked<typeof jobsApi>;

function buildJobResponse(progress: number) {
  const now = new Date().toISOString();
  return {
    success: true,
    data: {
      id: 'job-rt',
      name: 'Realtime Job',
      status: 'processing',
      total_urls: 1000,
      processed_urls: Math.round((progress / 100) * 1000),
      successful_urls: 900,
      failed_urls: 50,
      rejected_urls: 50,
      current_url: 'https://example.com',
      current_stage: 'layer3',
      current_url_started_at: now,
      progress_percentage: progress,
      processing_rate: 120,
      estimated_time_remaining: 120,
      total_cost: 25.5,
      gemini_cost: 10,
      gpt_cost: 15.5,
      started_at: now,
      completed_at: null,
      created_at: now,
      updated_at: now,
    },
  };
}

describe('SC-007 Dashboard realtime polling latency (T117)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockedJobsApi.getById.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('propagates backend job state changes to the UI cache in under 5 seconds', async () => {
    mockedJobsApi.getById.mockResolvedValueOnce(buildJobResponse(10));
    mockedJobsApi.getById.mockResolvedValueOnce(buildJobResponse(60));

    const wrapper = createPerformanceQueryWrapper();
    const { result } = renderHook(() => useJob('job-rt'), { wrapper });

    await waitFor(() => {
      expect(result.current.data?.progressPercentage).toBe(10);
    });

    const pollingWindowMs = 5000;

    act(() => {
      jest.advanceTimersByTime(pollingWindowMs);
    });

    await waitFor(() => {
      expect(result.current.data?.progressPercentage).toBe(60);
    });

    expect(mockedJobsApi.getById).toHaveBeenCalledTimes(2);
  });
});
