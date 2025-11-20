import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExportButton } from '../ExportButton';
import { resultsApi } from '@/lib/api-client';

// Mock the API client
jest.mock('@/lib/api-client', () => ({
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

describe('ExportButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  it('renders export button', () => {
    render(<ExportButton jobId="job-123" />);

    expect(screen.getByRole('button', { name: /export job results/i })).toBeInTheDocument();
  });

  it('renders with custom variant and size', () => {
    render(<ExportButton jobId="job-123" variant="outline" size="sm" />);

    const button = screen.getByRole('button', { name: /export job results/i });
    expect(button).toBeInTheDocument();
  });

  it('opens dialog when button is clicked', async () => {
    const user = userEvent.setup();
    render(<ExportButton jobId="job-123" jobName="Test Job" />);

    const exportButton = screen.getByRole('button', { name: /export job results/i });
    await user.click(exportButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/Export Job Results/i)).toBeInTheDocument();
    });
  });

  it('displays all format options', async () => {
    const user = userEvent.setup();
    render(<ExportButton jobId="job-123" />);

    await user.click(screen.getByRole('button', { name: /export job results/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/Complete \(All Factors\)/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Summary/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Layer 1 Only/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Layer 2 Only/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Layer 3 Only/i)).toBeInTheDocument();
    });
  });

  it('displays filter checkboxes', async () => {
    const user = userEvent.setup();
    render(<ExportButton jobId="job-123" />);

    await user.click(screen.getByRole('button', { name: /export job results/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/Rejected URLs/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Failed URLs/i)).toBeInTheDocument();
    });
  });

  it('has "include rejected" checkbox checked by default', async () => {
    const user = userEvent.setup();
    render(<ExportButton jobId="job-123" />);

    await user.click(screen.getByRole('button', { name: /export job results/i }));

    await waitFor(() => {
      const rejectedCheckbox = screen.getByLabelText(/Rejected URLs/i);
      expect(rejectedCheckbox).toBeChecked();
    });
  });

  it('has "include failed" checkbox unchecked by default', async () => {
    const user = userEvent.setup();
    render(<ExportButton jobId="job-123" />);

    await user.click(screen.getByRole('button', { name: /export job results/i }));

    await waitFor(() => {
      const failedCheckbox = screen.getByLabelText(/Failed URLs/i);
      expect(failedCheckbox).not.toBeChecked();
    });
  });

  it('allows selecting different export formats', async () => {
    const user = userEvent.setup();
    render(<ExportButton jobId="job-123" />);

    await user.click(screen.getByRole('button', { name: /export job results/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/Summary/i)).toBeInTheDocument();
    });

    // Select Summary format
    const summaryRadio = screen.getByLabelText(/Summary/i);
    await user.click(summaryRadio);

    expect(summaryRadio).toBeChecked();
  });

  it('allows toggling filter checkboxes', async () => {
    const user = userEvent.setup();
    render(<ExportButton jobId="job-123" />);

    await user.click(screen.getByRole('button', { name: /export job results/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/Failed URLs/i)).toBeInTheDocument();
    });

    // Toggle failed checkbox
    const failedCheckbox = screen.getByLabelText(/Failed URLs/i);
    await user.click(failedCheckbox);

    expect(failedCheckbox).toBeChecked();

    // Toggle again
    await user.click(failedCheckbox);

    expect(failedCheckbox).not.toBeChecked();
  });

  it('exports with default format (complete)', async () => {
    const user = userEvent.setup();
    const mockBlob = new Blob(['mock csv data'], { type: 'text/csv' });
    (resultsApi.exportJobResults as jest.Mock).mockResolvedValue(mockBlob);

    render(<ExportButton jobId="job-123" jobName="Test Job" />);

    // Mock document.createElement only for 'a' elements AFTER rendering
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

    await user.click(screen.getByRole('button', { name: /export job results/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Export$/i })).toBeInTheDocument();
    });

    const exportSubmitButton = screen.getByRole('button', { name: /^Export$/i });
    await user.click(exportSubmitButton);

    await waitFor(() => {
      expect(resultsApi.exportJobResults).toHaveBeenCalledWith('job-123', { format: 'complete' });
      expect(mockLink.download).toBe('Test Job-complete-results.csv');
      expect(mockLink.click).toHaveBeenCalled();
    });

    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });

  it('exports with selected format', async () => {
    const user = userEvent.setup();
    const mockBlob = new Blob(['mock csv data'], { type: 'text/csv' });
    (resultsApi.exportJobResults as jest.Mock).mockResolvedValue(mockBlob);

    render(<ExportButton jobId="job-123" jobName="Test Job" />);

    const mockLink = {
      href: '',
      download: '',
      click: jest.fn(),
    };
    const originalCreateElement = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') {
        return mockLink as any;
      }
      return originalCreateElement(tagName);
    });
    jest.spyOn(document.body, 'appendChild').mockImplementation((node: any) => node === mockLink ? mockLink as any : node);
    jest.spyOn(document.body, 'removeChild').mockImplementation((node: any) => node === mockLink ? mockLink as any : node);

    await user.click(screen.getByRole('button', { name: /export job results/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/Layer 2 Only/i)).toBeInTheDocument();
    });

    // Select Layer 2 format
    const layer2Radio = screen.getByLabelText(/Layer 2 Only/i);
    await user.click(layer2Radio);

    const exportSubmitButton = screen.getByRole('button', { name: /^Export$/i });
    await user.click(exportSubmitButton);

    await waitFor(() => {
      expect(resultsApi.exportJobResults).toHaveBeenCalledWith('job-123', { format: 'layer2' });
      expect(mockLink.download).toBe('Test Job-layer2-results.csv');
    });
  });

  it('uses job ID as filename when no job name is provided', async () => {
    const user = userEvent.setup();
    const mockBlob = new Blob(['mock csv data'], { type: 'text/csv' });
    (resultsApi.exportJobResults as jest.Mock).mockResolvedValue(mockBlob);

    render(<ExportButton jobId="job-456" />);

    const mockLink = {
      href: '',
      download: '',
      click: jest.fn(),
    };
    const originalCreateElement = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') {
        return mockLink as any;
      }
      return originalCreateElement(tagName);
    });
    jest.spyOn(document.body, 'appendChild').mockImplementation((node: any) => node === mockLink ? mockLink as any : node);
    jest.spyOn(document.body, 'removeChild').mockImplementation((node: any) => node === mockLink ? mockLink as any : node);

    await user.click(screen.getByRole('button', { name: /export job results/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Export$/i })).toBeInTheDocument();
    });

    const exportSubmitButton = screen.getByRole('button', { name: /^Export$/i });
    await user.click(exportSubmitButton);

    await waitFor(() => {
      expect(mockLink.download).toBe('job-456-complete-results.csv');
    });
  });

  it('shows loading state during export', async () => {
    const user = userEvent.setup();
    const mockBlob = new Blob(['mock csv data'], { type: 'text/csv' });

    // Delay the export to test loading state
    (resultsApi.exportJobResults as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockBlob), 100))
    );

    render(<ExportButton jobId="job-123" />);

    await user.click(screen.getByRole('button', { name: /export job results/i }));
    const exportSubmitButton = screen.getByRole('button', { name: /^Export$/i });
    await user.click(exportSubmitButton);

    // Check loading state
    expect(exportSubmitButton).toHaveTextContent('Exporting...');
    expect(exportSubmitButton).toBeDisabled();

    await waitFor(() => {
      expect(resultsApi.exportJobResults).toHaveBeenCalled();
    });
  });

  it('closes dialog after successful export', async () => {
    const user = userEvent.setup();
    const mockBlob = new Blob(['mock csv data'], { type: 'text/csv' });
    (resultsApi.exportJobResults as jest.Mock).mockResolvedValue(mockBlob);

    render(<ExportButton jobId="job-123" />);

    const mockLink = { href: '', download: '', click: jest.fn() };
    const originalCreateElement = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') {
        return mockLink as any;
      }
      return originalCreateElement(tagName);
    });
    jest.spyOn(document.body, 'appendChild').mockImplementation((node: any) => node === mockLink ? mockLink as any : node);
    jest.spyOn(document.body, 'removeChild').mockImplementation((node: any) => node === mockLink ? mockLink as any : node);

    await user.click(screen.getByRole('button', { name: /export job results/i }));

    await waitFor(() => {
      expect(screen.getByText(/Export Job Results/i)).toBeInTheDocument();
    });

    const exportSubmitButton = screen.getByRole('button', { name: /^Export$/i });
    await user.click(exportSubmitButton);

    await waitFor(() => {
      expect(screen.queryByText(/Export Job Results/i)).not.toBeInTheDocument();
    });
  });

  it('handles export error gracefully', async () => {
    const user = userEvent.setup();
    (resultsApi.exportJobResults as jest.Mock).mockRejectedValue(new Error('Export failed'));

    render(<ExportButton jobId="job-123" />);

    await user.click(screen.getByRole('button', { name: /export job results/i }));
    const exportSubmitButton = screen.getByRole('button', { name: /^Export$/i });
    await user.click(exportSubmitButton);

    await waitFor(() => {
      expect(resultsApi.exportJobResults).toHaveBeenCalled();
    });

    // Dialog should stay open on error
    expect(screen.getByText(/Export Job Results/i)).toBeInTheDocument();
  });

  it('revokes blob URL after download', async () => {
    const user = userEvent.setup();
    const mockBlob = new Blob(['mock csv data'], { type: 'text/csv' });
    (resultsApi.exportJobResults as jest.Mock).mockResolvedValue(mockBlob);

    render(<ExportButton jobId="job-123" />);

    const mockLink = {
      href: '',
      download: '',
      click: jest.fn(),
    };
    const originalCreateElement = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') {
        return mockLink as any;
      }
      return originalCreateElement(tagName);
    });
    jest.spyOn(document.body, 'appendChild').mockImplementation((node: any) => node === mockLink ? mockLink as any : node);
    jest.spyOn(document.body, 'removeChild').mockImplementation((node: any) => node === mockLink ? mockLink as any : node);

    await user.click(screen.getByRole('button', { name: /export job results/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Export$/i })).toBeInTheDocument();
    });

    const exportSubmitButton = screen.getByRole('button', { name: /^Export$/i });
    await user.click(exportSubmitButton);

    await waitFor(() => {
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });
  });
});
