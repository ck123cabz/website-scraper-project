import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BulkActions } from '../BulkActions';
import { jobsApi, resultsApi } from '@/lib/api-client';
import type { Job } from '@website-scraper/shared';

// Mock the API client
jest.mock('@/lib/api-client', () => ({
  jobsApi: {
    deleteJob: jest.fn(),
  },
  resultsApi: {
    exportJobResults: jest.fn(),
  },
}));

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

const mockJobs: Job[] = [
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
    updatedAt: '2025-01-18T11:30:00Z',
    startedAt: '2025-01-18T11:05:00Z',
    completedAt: null,
    currentUrl: 'https://example.com',
    currentStage: 'scraping',
    currentUrlStartedAt: '2025-01-18T11:29:00Z',
  },
];

describe('BulkActions', () => {
  const mockOnClearSelection = jest.fn();
  const mockOnActionComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  it('renders selection counter with singular form', () => {
    render(
      <BulkActions
        selectedJobs={[mockJobs[0]]}
        onClearSelection={mockOnClearSelection}
        onActionComplete={mockOnActionComplete}
      />
    );

    expect(screen.getByText('1 job selected')).toBeInTheDocument();
  });

  it('renders selection counter with plural form', () => {
    render(
      <BulkActions
        selectedJobs={mockJobs}
        onClearSelection={mockOnClearSelection}
        onActionComplete={mockOnActionComplete}
      />
    );

    expect(screen.getByText('2 jobs selected')).toBeInTheDocument();
  });

  it('calls onClearSelection when clear button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <BulkActions
        selectedJobs={mockJobs}
        onClearSelection={mockOnClearSelection}
        onActionComplete={mockOnActionComplete}
      />
    );

    const clearButton = screen.getByRole('button', { name: /clear selection/i });
    await user.click(clearButton);

    expect(mockOnClearSelection).toHaveBeenCalledTimes(1);
  });

  it('renders export and delete buttons', () => {
    render(
      <BulkActions
        selectedJobs={mockJobs}
        onClearSelection={mockOnClearSelection}
        onActionComplete={mockOnActionComplete}
      />
    );

    expect(screen.getByRole('button', { name: /export selected jobs/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete selected jobs/i })).toBeInTheDocument();
  });

  it('opens delete confirmation dialog when delete button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <BulkActions
        selectedJobs={mockJobs}
        onClearSelection={mockOnClearSelection}
        onActionComplete={mockOnActionComplete}
      />
    );

    const deleteButton = screen.getByRole('button', { name: /delete selected jobs/i });
    await user.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText(/Delete 2 Job\(s\)\?/i)).toBeInTheDocument();
      expect(screen.getByText(/This action cannot be undone/i)).toBeInTheDocument();
    });
  });

  it('displays selected job names in delete confirmation dialog', async () => {
    const user = userEvent.setup();
    render(
      <BulkActions
        selectedJobs={mockJobs}
        onClearSelection={mockOnClearSelection}
        onActionComplete={mockOnActionComplete}
      />
    );

    const deleteButton = screen.getByRole('button', { name: /delete selected jobs/i });
    await user.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText(/• Test Job 1/)).toBeInTheDocument();
      expect(screen.getByText(/• Test Job 2/)).toBeInTheDocument();
    });
  });

  it('handles bulk delete successfully', async () => {
    const user = userEvent.setup();
    (jobsApi.deleteJob as jest.Mock).mockResolvedValue({});

    render(
      <BulkActions
        selectedJobs={mockJobs}
        onClearSelection={mockOnClearSelection}
        onActionComplete={mockOnActionComplete}
      />
    );

    // Open delete dialog
    const deleteButton = screen.getByRole('button', { name: /delete selected jobs/i });
    await user.click(deleteButton);

    // Confirm deletion
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Delete$/ })).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole('button', { name: /^Delete$/ });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(jobsApi.deleteJob).toHaveBeenCalledTimes(2);
      expect(jobsApi.deleteJob).toHaveBeenCalledWith('1');
      expect(jobsApi.deleteJob).toHaveBeenCalledWith('2');
      expect(mockOnActionComplete).toHaveBeenCalledTimes(1);
    });
  });

  it('handles bulk export successfully', async () => {
    const user = userEvent.setup();
    const mockBlob = new Blob(['mock csv data'], { type: 'text/csv' });
    (resultsApi.exportJobResults as jest.Mock).mockResolvedValue(mockBlob);

    // Mock document.createElement only for 'a' elements
    const mockLink = {
      href: '',
      download: '',
      click: jest.fn(),
    };
    const originalCreateElement = document.createElement.bind(document);
    const createElementSpy = jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') {
        return mockLink as any;
      }
      return originalCreateElement(tagName);
    });
    const appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation((node: any) => {
      if (node === mockLink) {
        return mockLink as any;
      }
      return node;
    });
    const removeChildSpy = jest.spyOn(document.body, 'removeChild').mockImplementation((node: any) => {
      if (node === mockLink) {
        return mockLink as any;
      }
      return node;
    });

    render(
      <BulkActions
        selectedJobs={mockJobs}
        onClearSelection={mockOnClearSelection}
        onActionComplete={mockOnActionComplete}
      />
    );

    const exportButton = screen.getByRole('button', { name: /export selected jobs/i });
    await user.click(exportButton);

    await waitFor(() => {
      expect(resultsApi.exportJobResults).toHaveBeenCalledTimes(2);
      expect(resultsApi.exportJobResults).toHaveBeenCalledWith('1', { format: 'complete' });
      expect(resultsApi.exportJobResults).toHaveBeenCalledWith('2', { format: 'complete' });
      expect(mockOnClearSelection).toHaveBeenCalledTimes(1);
    });

    // Verify download links were created
    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(appendChildSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();
    expect(mockLink.click).toHaveBeenCalled();

    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });

  it('disables buttons during export', async () => {
    const user = userEvent.setup();
    const mockBlob = new Blob(['mock csv data'], { type: 'text/csv' });

    // Delay the export to test loading state
    (resultsApi.exportJobResults as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockBlob), 100))
    );

    render(
      <BulkActions
        selectedJobs={mockJobs}
        onClearSelection={mockOnClearSelection}
        onActionComplete={mockOnActionComplete}
      />
    );

    const exportButton = screen.getByRole('button', { name: /export selected jobs/i });
    const deleteButton = screen.getByRole('button', { name: /delete selected jobs/i });

    await user.click(exportButton);

    // Buttons should be disabled during export
    expect(exportButton).toHaveTextContent('Exporting...');
    expect(exportButton).toBeDisabled();
    expect(deleteButton).toBeDisabled();

    await waitFor(() => {
      expect(mockOnClearSelection).toHaveBeenCalled();
    });
  });

  it('disables buttons during delete', async () => {
    const user = userEvent.setup();

    // Delay the delete to test loading state
    (jobsApi.deleteJob as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({}), 100))
    );

    render(
      <BulkActions
        selectedJobs={mockJobs}
        onClearSelection={mockOnClearSelection}
        onActionComplete={mockOnActionComplete}
      />
    );

    // Open delete dialog
    const deleteButton = screen.getByRole('button', { name: /delete selected jobs/i });
    await user.click(deleteButton);

    // Confirm deletion
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Delete$/ })).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole('button', { name: /^Delete$/ });

    // Get the Cancel button before clicking Delete (it will be disabled after)
    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    expect(cancelButton).not.toBeDisabled(); // Should be enabled initially

    await user.click(confirmButton);

    // Cancel button should be disabled during delete
    await waitFor(() => {
      expect(cancelButton).toBeDisabled();
    });
  });
});
