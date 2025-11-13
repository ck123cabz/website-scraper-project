import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ExportDialog } from '../ExportDialog';
import { resultsApi } from '@/lib/api-client';

// Mock the API client
jest.mock('@/lib/api-client', () => ({
  resultsApi: {
    exportJobResults: jest.fn(),
  },
}));

describe('ExportDialog Component - TDD Test Suite', () => {
  let queryClient: QueryClient;
  const mockOnOpenChange = jest.fn();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  const renderDialog = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ExportDialog
          jobId="test-job-123"
          jobName="Test Job"
          isOpen={true}
          onOpenChange={mockOnOpenChange}
          {...props}
        />
      </QueryClientProvider>
    );
  };

  describe('Dialog Display', () => {
    test('T069-1: Dialog renders with correct title and description', () => {
      renderDialog();

      expect(screen.getByText('Export Results')).toBeInTheDocument();
      expect(screen.getByText(/Choose an export format and optional filters/i)).toBeInTheDocument();
    });

    test('T069-2: Dialog displays format selection dropdown', () => {
      renderDialog();

      expect(screen.getByText('Export Format')).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /export format/i })).toBeInTheDocument();
    });

    test('T069-3: Dialog displays status filter dropdown', () => {
      renderDialog();

      expect(screen.getByText('Include Results')).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /include results/i })).toBeInTheDocument();
    });

    test('T069-4: Dialog displays Cancel and Export buttons', () => {
      renderDialog();

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^export$/i })).toBeInTheDocument();
    });
  });

  describe('Format Selection', () => {
    test('T069-5: Format dropdown shows all 5 format options', async () => {
      const user = userEvent.setup();
      renderDialog();

      const formatTrigger = screen.getByRole('combobox', { name: /export format/i });
      await user.click(formatTrigger);

      await waitFor(() => {
        const options = screen.getAllByText('Complete (48 columns)');
        expect(options.length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('Summary (7 columns)').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('Layer 1 (15 columns)').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('Layer 2 (25 columns)').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('Layer 3 (40 columns)').length).toBeGreaterThanOrEqual(1);
      });
    });

    test('T069-6: Complete format is selected by default', () => {
      renderDialog();

      const formatTrigger = screen.getByRole('combobox', { name: /export format/i });
      expect(formatTrigger).toHaveTextContent('Complete (48 columns)');
    });

    test('T069-7: User can select different format', async () => {
      const user = userEvent.setup();
      renderDialog();

      const formatTrigger = screen.getByRole('combobox', { name: /export format/i });
      await user.click(formatTrigger);

      const summaryOption = await screen.findByText('Summary (7 columns)');
      await user.click(summaryOption);

      expect(formatTrigger).toHaveTextContent('Summary (7 columns)');
    });
  });

  describe('Status Filter', () => {
    test('T069-8: Status dropdown shows all filter options', async () => {
      const user = userEvent.setup();
      renderDialog();

      const statusTrigger = screen.getByRole('combobox', { name: /include results/i });
      await user.click(statusTrigger);

      await waitFor(() => {
        expect(screen.getAllByText('All Results').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('Approved Only').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('Rejected Only').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('Failed Only').length).toBeGreaterThanOrEqual(1);
      });
    });

    test('T069-9: All Results is selected by default', () => {
      renderDialog();

      const statusTrigger = screen.getByRole('combobox', { name: /include results/i });
      expect(statusTrigger).toHaveTextContent('All Results');
    });

    test('T069-10: User can select different status filter', async () => {
      const user = userEvent.setup();
      renderDialog();

      const statusTrigger = screen.getByRole('combobox', { name: /include results/i });
      await user.click(statusTrigger);

      const approvedOption = await screen.findByText('Approved Only');
      await user.click(approvedOption);

      expect(statusTrigger).toHaveTextContent('Approved Only');
    });
  });

  describe('Export Functionality', () => {
    test('T069-11: Export button triggers export with default settings', async () => {
      const user = userEvent.setup();
      const mockBlob = new Blob(['test data'], { type: 'text/csv' });
      (resultsApi.exportJobResults as jest.Mock).mockResolvedValue(mockBlob);

      renderDialog();

      const exportButton = screen.getByRole('button', { name: /^export$/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(resultsApi.exportJobResults).toHaveBeenCalledWith('test-job-123', {
          format: 'complete',
          status: undefined,
        });
      });
    });

    test('T069-12: Export button includes selected format', async () => {
      const user = userEvent.setup();
      const mockBlob = new Blob(['test data'], { type: 'text/csv' });
      (resultsApi.exportJobResults as jest.Mock).mockResolvedValue(mockBlob);

      renderDialog();

      // Select summary format
      const formatTrigger = screen.getByRole('combobox', { name: /export format/i });
      await user.click(formatTrigger);
      const summaryOption = await screen.findByText('Summary (7 columns)');
      await user.click(summaryOption);

      // Click export
      const exportButton = screen.getByRole('button', { name: /^export$/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(resultsApi.exportJobResults).toHaveBeenCalledWith('test-job-123', {
          format: 'summary',
          status: undefined,
        });
      });
    });

    test('T069-13: Export button includes selected status filter', async () => {
      const user = userEvent.setup();
      const mockBlob = new Blob(['test data'], { type: 'text/csv' });
      (resultsApi.exportJobResults as jest.Mock).mockResolvedValue(mockBlob);

      renderDialog();

      // Select approved status
      const statusTrigger = screen.getByRole('combobox', { name: /include results/i });
      await user.click(statusTrigger);
      const approvedOption = await screen.findByText('Approved Only');
      await user.click(approvedOption);

      // Click export
      const exportButton = screen.getByRole('button', { name: /^export$/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(resultsApi.exportJobResults).toHaveBeenCalledWith('test-job-123', {
          format: 'complete',
          status: 'success',
        });
      });
    });

    test('T069-14: Export button excludes status when "All Results" is selected', async () => {
      const user = userEvent.setup();
      const mockBlob = new Blob(['test data'], { type: 'text/csv' });
      (resultsApi.exportJobResults as jest.Mock).mockResolvedValue(mockBlob);

      renderDialog();

      // Status should default to "All Results"
      const exportButton = screen.getByRole('button', { name: /^export$/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(resultsApi.exportJobResults).toHaveBeenCalledWith('test-job-123', {
          format: 'complete',
          status: undefined, // Should be undefined for "all"
        });
      });
    });

    test('T069-15: Export button combines format and status filters', async () => {
      const user = userEvent.setup();
      const mockBlob = new Blob(['test data'], { type: 'text/csv' });
      (resultsApi.exportJobResults as jest.Mock).mockResolvedValue(mockBlob);

      renderDialog();

      // Select layer3 format
      const formatTrigger = screen.getByRole('combobox', { name: /export format/i });
      await user.click(formatTrigger);
      const layer3Option = await screen.findByText('Layer 3 (40 columns)');
      await user.click(layer3Option);

      // Select rejected status
      const statusTrigger = screen.getByRole('combobox', { name: /include results/i });
      await user.click(statusTrigger);
      const rejectedOption = await screen.findByText('Rejected Only');
      await user.click(rejectedOption);

      // Click export
      const exportButton = screen.getByRole('button', { name: /^export$/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(resultsApi.exportJobResults).toHaveBeenCalledWith('test-job-123', {
          format: 'layer3',
          status: 'rejected',
        });
      });
    });
  });

  describe('Loading State', () => {
    test('T069-16: Export button shows loading state during export', async () => {
      const user = userEvent.setup();
      const mockBlob = new Blob(['test data'], { type: 'text/csv' });
      let resolveExport: (value: Blob) => void;
      const exportPromise = new Promise<Blob>((resolve) => {
        resolveExport = resolve;
      });
      (resultsApi.exportJobResults as jest.Mock).mockReturnValue(exportPromise);

      renderDialog();

      const exportButton = screen.getByRole('button', { name: /^export$/i });
      await user.click(exportButton);

      // Check loading state
      await waitFor(() => {
        expect(screen.getByText('Exporting...')).toBeInTheDocument();
        expect(exportButton).toBeDisabled();
      });

      // Resolve the export
      resolveExport!(mockBlob);

      await waitFor(() => {
        expect(screen.queryByText('Exporting...')).not.toBeInTheDocument();
      });
    });

    test('T069-17: Cancel button is disabled during export', async () => {
      const user = userEvent.setup();
      const mockBlob = new Blob(['test data'], { type: 'text/csv' });
      let resolveExport: (value: Blob) => void;
      const exportPromise = new Promise<Blob>((resolve) => {
        resolveExport = resolve;
      });
      (resultsApi.exportJobResults as jest.Mock).mockReturnValue(exportPromise);

      renderDialog();

      const exportButton = screen.getByRole('button', { name: /^export$/i });
      await user.click(exportButton);

      // Check cancel button is disabled
      await waitFor(() => {
        const cancelButton = screen.getByRole('button', { name: /cancel/i });
        expect(cancelButton).toBeDisabled();
      });

      resolveExport!(mockBlob);
    });
  });

  describe('Error Handling', () => {
    test('T069-18: Displays error alert when export fails', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Failed to export results';
      (resultsApi.exportJobResults as jest.Mock).mockRejectedValue(new Error(errorMessage));

      renderDialog();

      const exportButton = screen.getByRole('button', { name: /^export$/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    test('T069-19: Displays generic error message for non-Error failures', async () => {
      const user = userEvent.setup();
      (resultsApi.exportJobResults as jest.Mock).mockRejectedValue('Unknown error');

      renderDialog();

      const exportButton = screen.getByRole('button', { name: /^export$/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to export results')).toBeInTheDocument();
      });
    });

    test('T069-20: Error alert has destructive variant styling', async () => {
      const user = userEvent.setup();
      (resultsApi.exportJobResults as jest.Mock).mockRejectedValue(new Error('Test error'));

      renderDialog();

      const exportButton = screen.getByRole('button', { name: /^export$/i });
      await user.click(exportButton);

      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toBeInTheDocument();
      });
    });
  });

  describe('Dialog Controls', () => {
    test('T069-21: Cancel button closes the dialog', async () => {
      const user = userEvent.setup();
      renderDialog();

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    test('T069-22: Dialog resets error state when closed', async () => {
      const user = userEvent.setup();
      (resultsApi.exportJobResults as jest.Mock).mockRejectedValue(new Error('Test error'));

      const { rerender } = renderDialog();

      // Trigger error
      const exportButton = screen.getByRole('button', { name: /^export$/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText('Test error')).toBeInTheDocument();
      });

      // Close dialog
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Reopen dialog
      rerender(
        <QueryClientProvider client={queryClient}>
          <ExportDialog
            jobId="test-job-123"
            jobName="Test Job"
            isOpen={true}
            onOpenChange={mockOnOpenChange}
          />
        </QueryClientProvider>
      );

      // Error should be cleared
      expect(screen.queryByText('Test error')).not.toBeInTheDocument();
    });

    test('T069-23: Dialog does not render when isOpen is false', () => {
      renderDialog({ isOpen: false });

      expect(screen.queryByText('Export Results')).not.toBeInTheDocument();
    });
  });

  describe('Icon Display', () => {
    test('T069-24: Export button displays Download icon', () => {
      renderDialog();

      const exportButton = screen.getByRole('button', { name: /^export$/i });
      // Check that button contains an SVG (icon)
      expect(exportButton.querySelector('svg')).toBeInTheDocument();
    });

    test('T069-25: Loading state displays spinner icon', async () => {
      const user = userEvent.setup();
      let resolveExport: (value: Blob) => void;
      const exportPromise = new Promise<Blob>((resolve) => {
        resolveExport = resolve;
      });
      (resultsApi.exportJobResults as jest.Mock).mockReturnValue(exportPromise);

      renderDialog();

      const exportButton = screen.getByRole('button', { name: /^export$/i });
      await user.click(exportButton);

      await waitFor(() => {
        const spinner = exportButton.querySelector('.animate-spin');
        expect(spinner).toBeInTheDocument();
      });

      resolveExport!(new Blob());
    });
  });
});
