import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResultsTable } from '@/components/results/ResultsTable';
import { resultsApi } from '@/lib/api-client';
import { buildMockResults, createPerformanceQueryWrapper } from './perf-test-helpers';

jest.mock('@/lib/api-client', () => ({
  resultsApi: {
    getJobResults: jest.fn(),
  },
}));

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

describe('SC-006 Expandable row performance (T116)', () => {
  beforeEach(() => {
    mockedResultsApi.getJobResults.mockReset();
  });

  it('reveals factor breakdown for a row in under 500ms', async () => {
    mockedResultsApi.getJobResults.mockResolvedValue({
      data: buildMockResults(25),
      pagination: {
        page: 1,
        limit: 50,
        total: 25,
        totalPages: 1,
      },
    });

    const Wrapper = createPerformanceQueryWrapper();
    const user = userEvent.setup();

    render(<ResultsTable jobId="job-123" jobName="Expand Perf" pageSize={25} />, {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Expand' }).length).toBeGreaterThan(0);
    });

    const expandButton = screen.getAllByRole('button', { name: 'Expand' })[0];

    const start = performance.now();
    await user.click(expandButton);

    await waitFor(() => {
      expect(screen.getByTestId('factor-breakdown')).toBeInTheDocument();
    });

    const durationMs = performance.now() - start;
    expect(durationMs).toBeLessThan(500);
  });
});
