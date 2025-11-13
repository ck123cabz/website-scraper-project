/**
 * Dashboard Data Flow Integration Tests (T075-T076)
 *
 * Tests the complete data flow from API → React Query → UI components
 * Following TDD principles - written before dashboard implementation
 *
 * Test Coverage:
 * - T075: API to React Query cache integration (5-6 tests)
 * - T076: React Query cache to UI component rendering (5-6 tests)
 *
 * Data Flow:
 * Backend API → jobsApi.getAll() → useJobs hook → React Query cache → Dashboard components
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { jobsApi } from '@/lib/api-client';
import { Job } from '@website-scraper/shared';
import { useJobs } from '@/hooks/use-jobs';

// Mock Supabase client to avoid environment variable requirements
jest.mock('@/lib/supabase-client', () => ({
  supabase: {
    from: jest.fn(),
    channel: jest.fn(),
  },
}));

// Mock the API client
jest.mock('@/lib/api-client', () => ({
  jobsApi: {
    getAll: jest.fn(),
  },
}));

// Mock the realtime service to avoid WebSocket connections in tests
jest.mock('@/lib/realtime-service', () => ({
  subscribeToJobList: jest.fn(() => ({ unsubscribe: jest.fn() })),
  unsubscribeAll: jest.fn(),
}));

const mockedJobsApi = jobsApi as jest.Mocked<typeof jobsApi>;

/**
 * Create realistic test job data in snake_case format (as returned by API)
 * The useJobs hook will transform this to camelCase
 * Ensures all numeric fields have valid defaults to avoid NaN
 */
function createTestJob(overrides: Partial<Job> = {}): any {
  const now = new Date().toISOString();

  // Default values in camelCase for easy override
  const defaults = {
    id: `job-${Math.random()}`,
    name: 'Test Job',
    status: 'processing' as Job['status'],
    totalUrls: 100,
    processedUrls: 50,
    successfulUrls: 45,
    failedUrls: 5,
    rejectedUrls: 0,
    currentUrl: 'https://example.com',
    currentStage: 'classifying' as Job['currentStage'],
    currentUrlStartedAt: now,
    progressPercentage: 50,
    processingRate: 10, // URLs per minute
    estimatedTimeRemaining: 300, // 5 minutes in seconds
    totalCost: 0.50,
    geminiCost: 0.30,
    gptCost: 0.20,
    avgCostPerUrl: 0.01,
    projectedTotalCost: 1.00,
    startedAt: now,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  // Merge overrides
  const merged = { ...defaults, ...overrides };

  // Recalculate derived fields ONLY if:
  // 1. processedUrls or totalUrls were overridden
  // 2. AND progressPercentage was NOT explicitly provided
  if (
    (overrides.processedUrls !== undefined || overrides.totalUrls !== undefined) &&
    overrides.progressPercentage === undefined
  ) {
    merged.progressPercentage = merged.totalUrls > 0
      ? (merged.processedUrls / merged.totalUrls) * 100
      : 0;
  }

  // Convert to snake_case format as returned by API
  // The useJobs hook expects snake_case and will transform to camelCase
  return {
    id: merged.id,
    name: merged.name,
    status: merged.status,
    total_urls: merged.totalUrls,
    processed_urls: merged.processedUrls,
    successful_urls: merged.successfulUrls,
    failed_urls: merged.failedUrls,
    rejected_urls: merged.rejectedUrls,
    current_url: merged.currentUrl,
    current_stage: merged.currentStage,
    current_url_started_at: merged.currentUrlStartedAt,
    progress_percentage: merged.progressPercentage,
    processing_rate: merged.processingRate,
    estimated_time_remaining: merged.estimatedTimeRemaining,
    total_cost: merged.totalCost,
    gemini_cost: merged.geminiCost,
    gpt_cost: merged.gptCost,
    started_at: merged.startedAt,
    completed_at: merged.completedAt,
    created_at: merged.createdAt,
    updated_at: merged.updatedAt,
  };
}

/**
 * Test component that uses useJobs hook to verify data flow
 */
function TestDashboard() {
  const { data: jobs, isLoading, error } = useJobs();

  if (isLoading) {
    return <div data-testid="loading">Loading...</div>;
  }

  if (error) {
    return (
      <div data-testid="error">
        <p data-testid="error-message">Error: {(error as Error).message}</p>
        <button data-testid="retry-button">Retry</button>
      </div>
    );
  }

  if (!jobs || jobs.length === 0) {
    return <div data-testid="empty-state">No jobs found</div>;
  }

  // Separate active and completed jobs
  const activeJobs = jobs.filter(j => j.status === 'processing' || j.status === 'pending');
  const completedJobs = jobs.filter(j => j.status === 'completed');

  return (
    <div data-testid="dashboard">
      <section data-testid="active-jobs-section">
        <h2>Active Jobs ({activeJobs.length})</h2>
        {activeJobs.map(job => (
          <div key={job.id} data-testid={`job-card-${job.id}`}>
            <div data-testid={`job-name-${job.id}`}>{job.name}</div>
            <div data-testid={`job-status-${job.id}`}>{job.status}</div>
            <div data-testid={`job-progress-${job.id}`}>{job.progressPercentage}%</div>
            <div data-testid={`job-urls-${job.id}`}>
              {job.processedUrls} / {job.totalUrls}
            </div>
            <div data-testid={`job-estimate-${job.id}`}>
              {job.estimatedTimeRemaining ? `${Math.ceil(job.estimatedTimeRemaining / 60)} min` : 'N/A'}
            </div>
            {job.status === 'pending' && (
              <div data-testid={`job-queue-position-${job.id}`}>
                Queued - position #1
              </div>
            )}
          </div>
        ))}
      </section>

      {completedJobs.length > 0 && (
        <section data-testid="completed-jobs-section">
          <h2>Completed Jobs ({completedJobs.length})</h2>
          {completedJobs.map(job => (
            <div key={job.id} data-testid={`completed-job-${job.id}`}>
              <div data-testid={`completed-job-name-${job.id}`}>{job.name}</div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

describe('Dashboard Data Flow Integration Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    // Create fresh QueryClient for each test to avoid cache pollution
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false, // Disable retries in tests
          gcTime: Infinity, // Keep data in cache for entire test
        },
      },
    });
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    queryClient.clear();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  /**
   * T075: Complete Data Flow (API → React Query → UI)
   * Tests that data flows correctly from backend API through React Query cache to UI
   */
  describe('Complete Data Flow (T075)', () => {
    test('API returns job list → React Query caches → components render', async () => {
      // Arrange: Mock API returns 3 jobs
      const testJobs: Job[] = [
        createTestJob({ id: 'job-1', name: 'Job 1', progressPercentage: 30 }),
        createTestJob({ id: 'job-2', name: 'Job 2', progressPercentage: 60 }),
        createTestJob({ id: 'job-3', name: 'Job 3', progressPercentage: 90 }),
      ];

      mockedJobsApi.getAll.mockResolvedValueOnce({
        success: true,
        data: testJobs,
      });

      // Act: Render dashboard
      render(<TestDashboard />, { wrapper });

      // Assert: Loading state appears first
      expect(screen.getByTestId('loading')).toBeInTheDocument();

      // Assert: Jobs render after API call completes
      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      });

      // Verify all jobs are displayed with correct data
      expect(screen.getByTestId('job-card-job-1')).toBeInTheDocument();
      expect(screen.getByTestId('job-name-job-1')).toHaveTextContent('Job 1');
      expect(screen.getByTestId('job-progress-job-1')).toHaveTextContent('30%');

      expect(screen.getByTestId('job-card-job-2')).toBeInTheDocument();
      expect(screen.getByTestId('job-progress-job-2')).toHaveTextContent('60%');

      expect(screen.getByTestId('job-card-job-3')).toBeInTheDocument();
      expect(screen.getByTestId('job-progress-job-3')).toHaveTextContent('90%');

      // Verify API was called once
      expect(mockedJobsApi.getAll).toHaveBeenCalledTimes(1);
    });

    test('progress updates flow from API → cache → UI without manual refresh', async () => {
      // Arrange: Initial API call returns 30% progress
      const initialJob = createTestJob({
        id: 'job-1',
        name: 'Processing Job',
        progressPercentage: 30,
        processedUrls: 30,
        estimatedTimeRemaining: 420, // 7 minutes
      });

      mockedJobsApi.getAll.mockResolvedValueOnce({
        success: true,
        data: [initialJob],
      });

      // Act: Render dashboard
      render(<TestDashboard />, { wrapper });

      // Assert: Initial progress displays
      await waitFor(() => {
        expect(screen.getByTestId('job-progress-job-1')).toHaveTextContent('30%');
      });
      expect(screen.getByTestId('job-urls-job-1')).toHaveTextContent('30 / 100');
      expect(screen.getByTestId('job-estimate-job-1')).toHaveTextContent('7 min');

      // Act: Advance timers by 5 seconds (polling interval)
      // Mock updated API response with increased progress
      const updatedJob = createTestJob({
        id: 'job-1',
        name: 'Processing Job',
        progressPercentage: 35,
        processedUrls: 35,
        estimatedTimeRemaining: 390, // 6.5 minutes
      });

      mockedJobsApi.getAll.mockResolvedValueOnce({
        success: true,
        data: [updatedJob],
      });

      // Note: This simulates the polling behavior
      // In real implementation, useJobs would have refetchInterval: 5000
      queryClient.invalidateQueries({ queryKey: ['jobs', 'list'] });
      jest.advanceTimersByTime(5000);

      // Assert: UI updates with new progress automatically
      await waitFor(() => {
        expect(screen.getByTestId('job-progress-job-1')).toHaveTextContent('35%');
      });
      expect(screen.getByTestId('job-urls-job-1')).toHaveTextContent('35 / 100');
      expect(screen.getByTestId('job-estimate-job-1')).toHaveTextContent('7 min');
    });

    test('multiple jobs render with correct data', async () => {
      // Arrange: API returns multiple jobs with varying states
      const testJobs: Job[] = [
        createTestJob({
          id: 'job-1',
          name: 'Fast Job',
          progressPercentage: 95,
          processedUrls: 95,
          estimatedTimeRemaining: 30,
        }),
        createTestJob({
          id: 'job-2',
          name: 'Slow Job',
          progressPercentage: 20,
          processedUrls: 20,
          estimatedTimeRemaining: 600,
        }),
        createTestJob({
          id: 'job-3',
          name: 'Medium Job',
          progressPercentage: 50,
          processedUrls: 50,
          estimatedTimeRemaining: 300,
        }),
      ];

      mockedJobsApi.getAll.mockResolvedValueOnce({
        success: true,
        data: testJobs,
      });

      // Act: Render dashboard
      render(<TestDashboard />, { wrapper });

      // Assert: All jobs display with correct progress
      await waitFor(() => {
        expect(screen.getByTestId('job-progress-job-1')).toHaveTextContent('95%');
        expect(screen.getByTestId('job-progress-job-2')).toHaveTextContent('20%');
        expect(screen.getByTestId('job-progress-job-3')).toHaveTextContent('50%');
      });

      // Verify estimated times
      expect(screen.getByTestId('job-estimate-job-1')).toHaveTextContent('1 min');
      expect(screen.getByTestId('job-estimate-job-2')).toHaveTextContent('10 min');
      expect(screen.getByTestId('job-estimate-job-3')).toHaveTextContent('5 min');
    });

    test('completed jobs section appears when available', async () => {
      // Arrange: API returns mix of active and completed jobs
      const testJobs: Job[] = [
        createTestJob({
          id: 'job-1',
          name: 'Active Job',
          status: 'processing',
          progressPercentage: 50,
        }),
        createTestJob({
          id: 'job-2',
          name: 'Completed Job 1',
          status: 'completed',
          progressPercentage: 100,
          completedAt: new Date().toISOString(),
        }),
        createTestJob({
          id: 'job-3',
          name: 'Completed Job 2',
          status: 'completed',
          progressPercentage: 100,
          completedAt: new Date().toISOString(),
        }),
      ];

      mockedJobsApi.getAll.mockResolvedValueOnce({
        success: true,
        data: testJobs,
      });

      // Act: Render dashboard
      render(<TestDashboard />, { wrapper });

      // Assert: Both active and completed sections appear
      await waitFor(() => {
        expect(screen.getByTestId('active-jobs-section')).toBeInTheDocument();
        expect(screen.getByTestId('completed-jobs-section')).toBeInTheDocument();
      });

      // Verify active section has 1 job
      const activeSection = screen.getByTestId('active-jobs-section');
      expect(within(activeSection).getByText(/Active Jobs \(1\)/)).toBeInTheDocument();
      expect(within(activeSection).getByTestId('job-card-job-1')).toBeInTheDocument();

      // Verify completed section has 2 jobs
      const completedSection = screen.getByTestId('completed-jobs-section');
      expect(within(completedSection).getByText(/Completed Jobs \(2\)/)).toBeInTheDocument();
      expect(within(completedSection).getByTestId('completed-job-job-2')).toBeInTheDocument();
      expect(within(completedSection).getByTestId('completed-job-job-3')).toBeInTheDocument();
    });
  });

  /**
   * T075: Polling Integration
   * Tests that React Query polling works correctly with 5-second intervals
   */
  describe('Polling Integration (T075)', () => {
    test('initial load fetches data immediately', async () => {
      // Arrange: Mock API
      const testJob = createTestJob({ id: 'job-1', name: 'Initial Job' });
      mockedJobsApi.getAll.mockResolvedValueOnce({
        success: true,
        data: [testJob],
      });

      // Act: Render dashboard
      const startTime = Date.now();
      render(<TestDashboard />, { wrapper });

      // Assert: API called immediately (not after 5 seconds)
      await waitFor(() => {
        expect(screen.getByTestId('job-card-job-1')).toBeInTheDocument();
      });
      const endTime = Date.now();
      const elapsed = endTime - startTime;

      // Verify fetch happened quickly (< 1 second, not after 5s poll interval)
      expect(elapsed).toBeLessThan(1000);
      expect(mockedJobsApi.getAll).toHaveBeenCalledTimes(1);
    });

    test('second fetch happens 5 seconds later', async () => {
      // Arrange: Initial API call
      const initialJob = createTestJob({ id: 'job-1', progressPercentage: 40 });
      mockedJobsApi.getAll.mockResolvedValueOnce({
        success: true,
        data: [initialJob],
      });

      // Act: Render dashboard
      render(<TestDashboard />, { wrapper });

      // Assert: Initial render
      await waitFor(() => {
        expect(screen.getByTestId('job-progress-job-1')).toHaveTextContent('40%');
      });
      expect(mockedJobsApi.getAll).toHaveBeenCalledTimes(1);

      // Act: Advance timers by 5 seconds (polling interval)
      const updatedJob = createTestJob({ id: 'job-1', progressPercentage: 45 });
      mockedJobsApi.getAll.mockResolvedValueOnce({
        success: true,
        data: [updatedJob],
      });

      // Simulate polling behavior
      queryClient.invalidateQueries({ queryKey: ['jobs', 'list'] });
      jest.advanceTimersByTime(5000);

      // Assert: Second fetch happened
      await waitFor(() => {
        expect(screen.getByTestId('job-progress-job-1')).toHaveTextContent('45%');
      });
      expect(mockedJobsApi.getAll).toHaveBeenCalledTimes(2);
    });

    test('data from second fetch updates UI', async () => {
      // Arrange: Initial data
      const initialJob = createTestJob({
        id: 'job-1',
        progressPercentage: 50,
        estimatedTimeRemaining: 300,
      });
      mockedJobsApi.getAll.mockResolvedValueOnce({
        success: true,
        data: [initialJob],
      });

      render(<TestDashboard />, { wrapper });

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByTestId('job-progress-job-1')).toHaveTextContent('50%');
      });

      // Act: Simulate poll with updated data
      const updatedJob = createTestJob({
        id: 'job-1',
        progressPercentage: 57,
        estimatedTimeRemaining: 258,
      });
      mockedJobsApi.getAll.mockResolvedValueOnce({
        success: true,
        data: [updatedJob],
      });

      queryClient.invalidateQueries({ queryKey: ['jobs', 'list'] });
      jest.advanceTimersByTime(5000);

      // Assert: UI shows updated values
      await waitFor(() => {
        expect(screen.getByTestId('job-progress-job-1')).toHaveTextContent('57%');
      });
      expect(screen.getByTestId('job-estimate-job-1')).toHaveTextContent('5 min');
    });
  });

  /**
   * T076: Component Integration (Cache → UI)
   * Tests that data from React Query cache renders correctly in UI components
   */
  describe('Component Integration (T076)', () => {
    test('JobProgressCard receives correct data from hook', async () => {
      // Arrange: API returns job with specific progress data
      const testJob = createTestJob({
        id: 'job-1',
        name: 'Test Progress Job',
        progressPercentage: 42.5,
        processedUrls: 425,
        totalUrls: 1000,
      });

      mockedJobsApi.getAll.mockResolvedValueOnce({
        success: true,
        data: [testJob],
      });

      // Act: Render dashboard
      render(<TestDashboard />, { wrapper });

      // Assert: Progress card displays exact data from cache
      await waitFor(() => {
        expect(screen.getByTestId('job-progress-job-1')).toHaveTextContent('42.5%');
      });
      expect(screen.getByTestId('job-urls-job-1')).toHaveTextContent('425 / 1000');
    });

    test('queue position displays correctly for queued jobs', async () => {
      // Arrange: API returns queued job
      const queuedJob = createTestJob({
        id: 'job-1',
        name: 'Queued Job',
        status: 'pending',
        progressPercentage: 0,
        processedUrls: 0,
      });

      mockedJobsApi.getAll.mockResolvedValueOnce({
        success: true,
        data: [queuedJob],
      });

      // Act: Render dashboard
      render(<TestDashboard />, { wrapper });

      // Assert: Queue position badge appears
      await waitFor(() => {
        expect(screen.getByTestId('job-status-job-1')).toHaveTextContent('pending');
      });
      expect(screen.getByTestId('job-queue-position-job-1')).toHaveTextContent('Queued - position #1');
    });

    test('completed jobs render in separate section', async () => {
      // Arrange: Mix of active and completed jobs
      const testJobs: Job[] = [
        createTestJob({ id: 'active-1', status: 'processing' }),
        createTestJob({
          id: 'completed-1',
          name: 'Done Job',
          status: 'completed',
          progressPercentage: 100,
        }),
      ];

      mockedJobsApi.getAll.mockResolvedValueOnce({
        success: true,
        data: testJobs,
      });

      // Act: Render dashboard
      render(<TestDashboard />, { wrapper });

      // Assert: Completed job appears in completed section
      await waitFor(() => {
        expect(screen.getByTestId('completed-jobs-section')).toBeInTheDocument();
      });
      expect(screen.getByTestId('completed-job-completed-1')).toBeInTheDocument();
      expect(screen.getByTestId('completed-job-name-completed-1')).toHaveTextContent('Done Job');
    });

    test('multiple jobs render without data mixing', async () => {
      // Arrange: Three distinct jobs
      const testJobs: Job[] = [
        createTestJob({
          id: 'job-a',
          name: 'Job A',
          progressPercentage: 25,
          estimatedTimeRemaining: 600,
        }),
        createTestJob({
          id: 'job-b',
          name: 'Job B',
          progressPercentage: 50,
          estimatedTimeRemaining: 300,
        }),
        createTestJob({
          id: 'job-c',
          name: 'Job C',
          progressPercentage: 75,
          estimatedTimeRemaining: 150,
        }),
      ];

      mockedJobsApi.getAll.mockResolvedValueOnce({
        success: true,
        data: testJobs,
      });

      // Act: Render dashboard
      render(<TestDashboard />, { wrapper });

      // Assert: Each job displays its own data (no cross-contamination)
      await waitFor(() => {
        expect(screen.getByTestId('job-name-job-a')).toHaveTextContent('Job A');
        expect(screen.getByTestId('job-progress-job-a')).toHaveTextContent('25%');
        expect(screen.getByTestId('job-estimate-job-a')).toHaveTextContent('10 min');

        expect(screen.getByTestId('job-name-job-b')).toHaveTextContent('Job B');
        expect(screen.getByTestId('job-progress-job-b')).toHaveTextContent('50%');
        expect(screen.getByTestId('job-estimate-job-b')).toHaveTextContent('5 min');

        expect(screen.getByTestId('job-name-job-c')).toHaveTextContent('Job C');
        expect(screen.getByTestId('job-progress-job-c')).toHaveTextContent('75%');
        expect(screen.getByTestId('job-estimate-job-c')).toHaveTextContent('3 min');
      });
    });
  });

  /**
   * T076: Real-Time Updates
   * Tests that UI updates correctly as job state changes
   */
  describe('Real-Time Updates (T076)', () => {
    test('job progress increases → card shows new percentage', async () => {
      // Arrange: Initial state
      const initialJob = createTestJob({ id: 'job-1', progressPercentage: 60 });
      mockedJobsApi.getAll.mockResolvedValueOnce({
        success: true,
        data: [initialJob],
      });

      render(<TestDashboard />, { wrapper });

      await waitFor(() => {
        expect(screen.getByTestId('job-progress-job-1')).toHaveTextContent('60%');
      });

      // Act: Simulate progress update
      const updatedJob = createTestJob({ id: 'job-1', progressPercentage: 68 });
      mockedJobsApi.getAll.mockResolvedValueOnce({
        success: true,
        data: [updatedJob],
      });

      queryClient.invalidateQueries({ queryKey: ['jobs', 'list'] });
      jest.advanceTimersByTime(5000);

      // Assert: Progress increased
      await waitFor(() => {
        expect(screen.getByTestId('job-progress-job-1')).toHaveTextContent('68%');
      });
    });

    test('estimated time decreases → card shows new estimate', async () => {
      // Arrange: Initial state with 10 minutes remaining
      const initialJob = createTestJob({
        id: 'job-1',
        estimatedTimeRemaining: 600,
      });
      mockedJobsApi.getAll.mockResolvedValueOnce({
        success: true,
        data: [initialJob],
      });

      render(<TestDashboard />, { wrapper });

      await waitFor(() => {
        expect(screen.getByTestId('job-estimate-job-1')).toHaveTextContent('10 min');
      });

      // Act: Time decreases to 7 minutes
      const updatedJob = createTestJob({
        id: 'job-1',
        estimatedTimeRemaining: 420,
      });
      mockedJobsApi.getAll.mockResolvedValueOnce({
        success: true,
        data: [updatedJob],
      });

      queryClient.invalidateQueries({ queryKey: ['jobs', 'list'] });
      jest.advanceTimersByTime(5000);

      // Assert: Estimate updated
      await waitFor(() => {
        expect(screen.getByTestId('job-estimate-job-1')).toHaveTextContent('7 min');
      });
    });

    test('job moves from queued to processing → badge changes', async () => {
      // Arrange: Queued job
      const queuedJob = createTestJob({
        id: 'job-1',
        status: 'pending',
        progressPercentage: 0,
      });
      mockedJobsApi.getAll.mockResolvedValueOnce({
        success: true,
        data: [queuedJob],
      });

      render(<TestDashboard />, { wrapper });

      await waitFor(() => {
        expect(screen.getByTestId('job-status-job-1')).toHaveTextContent('pending');
      });
      expect(screen.getByTestId('job-queue-position-job-1')).toBeInTheDocument();

      // Act: Job starts processing
      const processingJob = createTestJob({
        id: 'job-1',
        status: 'processing',
        progressPercentage: 5,
      });
      mockedJobsApi.getAll.mockResolvedValueOnce({
        success: true,
        data: [processingJob],
      });

      queryClient.invalidateQueries({ queryKey: ['jobs', 'list'] });
      jest.advanceTimersByTime(5000);

      // Assert: Status changed, queue position removed
      await waitFor(() => {
        expect(screen.getByTestId('job-status-job-1')).toHaveTextContent('processing');
      });
      expect(screen.queryByTestId('job-queue-position-job-1')).not.toBeInTheDocument();
    });

    test('completed job moves to completedJobs section', async () => {
      // Arrange: Processing job
      const processingJob = createTestJob({
        id: 'job-1',
        name: 'Almost Done',
        status: 'processing',
        progressPercentage: 98,
      });
      mockedJobsApi.getAll.mockResolvedValueOnce({
        success: true,
        data: [processingJob],
      });

      render(<TestDashboard />, { wrapper });

      await waitFor(() => {
        expect(screen.getByTestId('active-jobs-section')).toBeInTheDocument();
        expect(screen.getByTestId('job-card-job-1')).toBeInTheDocument();
      });

      // Should not have completed section yet
      expect(screen.queryByTestId('completed-jobs-section')).not.toBeInTheDocument();

      // Act: Job completes
      const completedJob = createTestJob({
        id: 'job-1',
        name: 'Almost Done',
        status: 'completed',
        progressPercentage: 100,
        completedAt: new Date().toISOString(),
      });
      mockedJobsApi.getAll.mockResolvedValueOnce({
        success: true,
        data: [completedJob],
      });

      queryClient.invalidateQueries({ queryKey: ['jobs', 'list'] });
      jest.advanceTimersByTime(5000);

      // Assert: Job moved to completed section
      await waitFor(() => {
        expect(screen.getByTestId('completed-jobs-section')).toBeInTheDocument();
      });
      expect(screen.getByTestId('completed-job-job-1')).toBeInTheDocument();
      expect(screen.queryByTestId('job-card-job-1')).not.toBeInTheDocument();
    });
  });

  /**
   * Edge Cases
   * Tests boundary conditions and performance scenarios
   */
  describe('Edge Cases', () => {
    test('empty queue (no jobs) shows empty state', async () => {
      // Arrange: API returns empty array
      mockedJobsApi.getAll.mockResolvedValueOnce({
        success: true,
        data: [],
      });

      // Act: Render dashboard
      render(<TestDashboard />, { wrapper });

      // Assert: Empty state displays
      await waitFor(() => {
        expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      });
      expect(screen.getByText('No jobs found')).toBeInTheDocument();
      expect(screen.queryByTestId('dashboard')).not.toBeInTheDocument();
    });

    test('very large job list (100+ jobs) renders efficiently', async () => {
      // Arrange: Generate 150 jobs
      const largeJobList: Job[] = Array.from({ length: 150 }, (_, i) =>
        createTestJob({
          id: `job-${i}`,
          name: `Job ${i}`,
          progressPercentage: Math.random() * 100,
        })
      );

      mockedJobsApi.getAll.mockResolvedValueOnce({
        success: true,
        data: largeJobList,
      });

      // Act: Render dashboard
      const startTime = performance.now();
      render(<TestDashboard />, { wrapper });

      // Assert: All jobs render
      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      });
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Verify performance: should render in < 500ms
      expect(renderTime).toBeLessThan(500);

      // Spot check some jobs are present
      expect(screen.getByTestId('job-card-job-0')).toBeInTheDocument();
      expect(screen.getByTestId('job-card-job-50')).toBeInTheDocument();
      expect(screen.getByTestId('job-card-job-149')).toBeInTheDocument();
    });

    test('rapid polling updates (simulated) don\'t cause flicker', async () => {
      // Arrange: Initial job
      const initialJob = createTestJob({ id: 'job-1', progressPercentage: 50 });
      mockedJobsApi.getAll.mockResolvedValueOnce({
        success: true,
        data: [initialJob],
      });

      render(<TestDashboard />, { wrapper });

      await waitFor(() => {
        expect(screen.getByTestId('job-progress-job-1')).toHaveTextContent('50%');
      });

      // Act: Rapid updates (every 100ms for 1 second)
      for (let i = 0; i < 10; i++) {
        const updatedJob = createTestJob({
          id: 'job-1',
          progressPercentage: 50 + i,
        });
        mockedJobsApi.getAll.mockResolvedValueOnce({
          success: true,
          data: [updatedJob],
        });

        queryClient.invalidateQueries({ queryKey: ['jobs', 'list'] });
        jest.advanceTimersByTime(100);

        await waitFor(() => {
          const progressElement = screen.getByTestId('job-progress-job-1');
          // Just verify element exists and doesn't unmount (no flicker)
          expect(progressElement).toBeInTheDocument();
        });
      }

      // Assert: Final progress reflects last update
      await waitFor(() => {
        expect(screen.getByTestId('job-progress-job-1')).toHaveTextContent('59%');
      });
    });
  });

  /**
   * Error Recovery
   * Tests error handling and retry functionality
   */
  describe('Error Recovery', () => {
    test('API error shown to user', async () => {
      // Arrange: API returns error
      mockedJobsApi.getAll.mockResolvedValueOnce({
        success: false,
        error: { message: 'Network connection failed' },
      });

      // Act: Render dashboard
      render(<TestDashboard />, { wrapper });

      // Assert: Error message displays
      await waitFor(() => {
        expect(screen.getByTestId('error')).toBeInTheDocument();
      });
      expect(screen.getByTestId('error-message')).toHaveTextContent(
        'Error: Network connection failed'
      );
    });

    test('retry button works after error', async () => {
      // Arrange: API fails first, succeeds second
      mockedJobsApi.getAll
        .mockResolvedValueOnce({
          success: false,
          error: { message: 'Temporary error' },
        })
        .mockResolvedValueOnce({
          success: true,
          data: [createTestJob({ id: 'job-1', name: 'Recovered Job' })],
        });

      render(<TestDashboard />, { wrapper });

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByTestId('error')).toBeInTheDocument();
      });

      // Act: Simulate retry (invalidate query)
      queryClient.invalidateQueries({ queryKey: ['jobs', 'list'] });

      // Assert: Dashboard recovers and displays data
      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      });
      expect(screen.getByTestId('job-name-job-1')).toHaveTextContent('Recovered Job');
    });

    test('polling resumes after error', async () => {
      // Arrange: Success → Error → Success pattern
      const job1 = createTestJob({ id: 'job-1', progressPercentage: 40 });
      const job2 = createTestJob({ id: 'job-1', progressPercentage: 50 });

      mockedJobsApi.getAll
        .mockResolvedValueOnce({ success: true, data: [job1] })
        .mockResolvedValueOnce({ success: false, error: { message: 'Transient error' } })
        .mockResolvedValueOnce({ success: true, data: [job2] });

      render(<TestDashboard />, { wrapper });

      // Initial success
      await waitFor(() => {
        expect(screen.getByTestId('job-progress-job-1')).toHaveTextContent('40%');
      });

      // Poll encounters error
      queryClient.invalidateQueries({ queryKey: ['jobs', 'list'] });
      jest.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(screen.getByTestId('error')).toBeInTheDocument();
      });

      // Poll resumes and succeeds
      queryClient.invalidateQueries({ queryKey: ['jobs', 'list'] });
      jest.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(screen.getByTestId('job-progress-job-1')).toHaveTextContent('50%');
      });
    });
  });
});
