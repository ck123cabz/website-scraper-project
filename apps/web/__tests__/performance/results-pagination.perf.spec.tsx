import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import { ResultsTable } from '@/components/results/ResultsTable';
import { resultsApi } from '@/lib/api-client';
import { buildMockResults, createPerformanceQueryWrapper } from './perf-test-helpers';

jest.mock('@/lib/api-client', () => ({
  resultsApi: {
    getJobResults: jest.fn(),
  },
}));

// Mock Supabase client to silence realtime wiring inside useResults
jest.mock('@/lib/supabase-client', () => ({
  supabase: {
    channel: jest.fn(() => ({
      on: jest.fn(() => ({
        on: jest.fn(() => ({
          subscribe: jest.fn(),
        })),
      })),
    })),
    removeChannel: jest.fn(),
  },
}));

const mockedResultsApi = resultsApi as jest.Mocked<typeof resultsApi>;

describe('SC-003 Results pagination performance (T115)', () => {
  beforeEach(() => {
    mockedResultsApi.getJobResults.mockReset();
  });

  it('renders a 100k-row dataset page in under 500ms', async () => {
    const results = buildMockResults(50);
    mockedResultsApi.getJobResults.mockResolvedValue({
      data: results,
      pagination: {
        page: 1,
        limit: 50,
        total: 100_000,
        totalPages: 2_000,
      },
    });

    const Wrapper = createPerformanceQueryWrapper();

    const start = performance.now();

    render(<ResultsTable jobId="job-123" jobName="Load Test Job" pageSize={50} />, {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(screen.getByText('https://example-0.com/page/0')).toBeInTheDocument();
    });

    const durationMs = performance.now() - start;

    expect(durationMs).toBeLessThan(500);
    expect(mockedResultsApi.getJobResults).toHaveBeenCalledTimes(1);
  });
});
