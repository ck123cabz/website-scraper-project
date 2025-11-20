import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { JobsTable } from '../JobsTable';
import { jobsApi } from '@/lib/api-client';

// Mock the API client
jest.mock('@/lib/api-client', () => ({
  jobsApi: {
    getQueueStatus: jest.fn(),
    deleteJob: jest.fn(),
  },
  resultsApi: {
    exportJobResults: jest.fn(),
  },
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockJobs = [
  {
    id: '1',
    name: 'Test Job 1',
    status: 'completed',
    totalUrls: 100,
    processedUrls: 100,
    successfulUrls: 80,
    rejectedUrls: 20,
    failedUrls: 0,
    progressPercentage: 100,
    createdAt: '2025-01-18T10:00:00Z',
    updatedAt: '2025-01-18T12:00:00Z',
    startedAt: '2025-01-18T10:05:00Z',
    completedAt: '2025-01-18T12:00:00Z',
    currentUrl: null,
    currentStage: null,
    currentUrlStartedAt: null,
    processingRate: null,
    estimatedTimeRemaining: null,
    totalCost: 0.5,
    geminiCost: 0.3,
    gptCost: 0.2,
    avgCostPerUrl: 0.005,
    projectedTotalCost: 0.5,
  },
  {
    id: '2',
    name: 'Test Job 2',
    status: 'processing',
    totalUrls: 50,
    processedUrls: 25,
    successfulUrls: 20,
    rejectedUrls: 5,
    failedUrls: 0,
    progressPercentage: 50,
    createdAt: '2025-01-18T11:00:00Z',
    updatedAt: '2025-01-18T12:30:00Z',
    startedAt: '2025-01-18T11:05:00Z',
    completedAt: null,
    currentUrl: 'https://example.com',
    currentStage: 'filtering',
    currentUrlStartedAt: '2025-01-18T12:25:00Z',
    processingRate: 10.5,
    estimatedTimeRemaining: 300,
    totalCost: 0.25,
    geminiCost: 0.15,
    gptCost: 0.1,
    avgCostPerUrl: 0.01,
    projectedTotalCost: 0.5,
  },
];

describe('JobsTable', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    (jobsApi.getQueueStatus as jest.Mock).mockResolvedValue({
      data: mockJobs,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderWithQuery = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    );
  };

  it('renders loading state initially', () => {
    renderWithQuery(<JobsTable />);
    // Check for skeleton rows by looking for the table structure
    // In loading state, we render 5 skeleton rows
    const skeletonElements = screen.getAllByRole('row');
    // 1 header row + 5 skeleton rows = 6 total rows
    expect(skeletonElements.length).toBe(6);
  });

  it('renders job table with data', async () => {
    renderWithQuery(<JobsTable />);

    await waitFor(() => {
      expect(screen.getByText('Test Job 1')).toBeInTheDocument();
      expect(screen.getByText('Test Job 2')).toBeInTheDocument();
    });
  });

  it('displays job status badges', async () => {
    renderWithQuery(<JobsTable />);

    await waitFor(() => {
      expect(screen.getByText('Success')).toBeInTheDocument(); // completed
      expect(screen.getByText('Active')).toBeInTheDocument(); // processing
    });
  });

  it('shows progress for active jobs', async () => {
    renderWithQuery(<JobsTable />);

    await waitFor(() => {
      expect(screen.getByText('25 / 50 URLs')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
    });
  });

  it('shows results for completed jobs', async () => {
    renderWithQuery(<JobsTable />);

    await waitFor(() => {
      expect(screen.getByText('80 success')).toBeInTheDocument();
      expect(screen.getByText('20 rejected')).toBeInTheDocument();
    });
  });

  it('filters to show only active jobs when filterActive is true', async () => {
    renderWithQuery(<JobsTable filterActive />);

    await waitFor(() => {
      expect(screen.getByText('Test Job 2')).toBeInTheDocument();
      expect(screen.queryByText('Test Job 1')).not.toBeInTheDocument();
    });
  });

  it('shows empty state when no jobs', async () => {
    (jobsApi.getQueueStatus as jest.Mock).mockResolvedValue({ data: [] });
    renderWithQuery(<JobsTable />);

    await waitFor(() => {
      expect(screen.getByText('No jobs yet')).toBeInTheDocument();
    });
  });

  it('shows empty state for active jobs filter when no active jobs', async () => {
    (jobsApi.getQueueStatus as jest.Mock).mockResolvedValue({
      data: [mockJobs[0]], // Only completed job
    });
    renderWithQuery(<JobsTable filterActive />);

    await waitFor(() => {
      expect(screen.getByText('No active jobs')).toBeInTheDocument();
    });
  });

  it('renders pagination controls', async () => {
    renderWithQuery(<JobsTable />);

    await waitFor(() => {
      expect(screen.getByText(/rows per page/i)).toBeInTheDocument();
      expect(screen.getByText(/page 1 of/i)).toBeInTheDocument();
    });
  });
});
