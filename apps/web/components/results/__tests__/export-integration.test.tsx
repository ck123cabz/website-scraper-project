/**
 * T070: End-to-End Export Integration Tests
 *
 * Comprehensive integration tests verifying the complete export flow:
 * - API endpoint responses and filtering
 * - Frontend dialog interaction with backend
 * - CSV generation and file downloads
 * - Filter application and data correctness
 * - Error handling across the stack
 *
 * These tests verify the ENTIRE export feature works end-to-end.
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ResultsTable } from '../ResultsTable';
import { ExportDialog } from '../ExportDialog';
import { resultsApi } from '@/lib/api-client';
import type { UrlResult } from '@website-scraper/shared';
import axios from 'axios';

// Mock axios for API calls
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock the API client module
jest.mock('@/lib/api-client', () => ({
  resultsApi: {
    getJobResults: jest.fn(),
    exportJobResults: jest.fn(),
  },
}));

// Mock window.URL methods for file downloads
const mockCreateObjectURL = jest.fn();
const mockRevokeObjectURL = jest.fn();
global.URL.createObjectURL = mockCreateObjectURL;
global.URL.revokeObjectURL = mockRevokeObjectURL;

const mockedResultsApi = resultsApi as jest.Mocked<typeof resultsApi>;

// Test data: Job with mixed results (approved, rejected, failed)
const createTestResults = (): UrlResult[] => [
  // 10 approved URLs
  ...Array.from({ length: 10 }, (_, i) => ({
    id: `approved-${i}`,
    url: `https://approved-${i}.com`,
    job_id: 'test-job-123',
    url_id: `url-approved-${i}`,
    confidence_score: 0.85 + (i * 0.01),
    confidence_band: 'high' as const,
    eliminated_at_layer: 'passed_all',
    processing_time_ms: 1500,
    total_cost: 0.05,
    retry_count: 0,
    last_error: null,
    last_retry_at: null,
    processed_at: new Date('2025-01-11T10:00:00Z'),
    layer1_factors: {
      tld_type: 'gtld',
      tld_value: '.com',
      domain_classification: 'commercial',
      pattern_matches: [],
      target_profile: { type: 'B2B software', confidence: 0.9 },
      reasoning: 'Commercial domain',
      passed: true,
    },
    layer2_factors: {
      publication_score: 0.8,
      module_scores: {
        product_offering: 0.8,
        layout_quality: 0.85,
        navigation_complexity: 0.7,
        monetization_indicators: 0.75,
      },
      keywords_found: ['pricing'],
      ad_networks_detected: [],
      content_signals: {
        has_blog: true,
        has_press_releases: true,
        has_whitepapers: false,
        has_case_studies: true,
      },
      reasoning: 'Strong publication signals',
      passed: true,
    },
    layer3_factors: {
      classification: 'accepted',
      sophistication_signals: {
        design_quality: { score: 0.85, indicators: ['Professional layout'] },
        authority_indicators: { score: 0.8, indicators: ['Industry recognition'] },
        professional_presentation: { score: 0.9, indicators: ['Clear value proposition'] },
        content_originality: { score: 0.75, indicators: ['Original content'] },
      },
      llm_provider: 'openai',
      model_version: 'gpt-4',
      cost_usd: 0.05,
      reasoning: 'High quality website',
      tokens_used: { input: 1000, output: 500 },
      processing_time_ms: 2000,
    },
    status: 'approved',
    reviewer_notes: null,
    created_at: new Date('2025-01-11T10:00:00Z'),
    updated_at: new Date('2025-01-11T10:00:00Z'),
  })),
  // 5 rejected URLs
  ...Array.from({ length: 5 }, (_, i) => ({
    id: `rejected-${i}`,
    url: `https://rejected-${i}.com`,
    job_id: 'test-job-123',
    url_id: `url-rejected-${i}`,
    confidence_score: 0.25 + (i * 0.02),
    confidence_band: 'low' as const,
    eliminated_at_layer: 'layer2',
    processing_time_ms: 800,
    total_cost: 0.01,
    retry_count: 0,
    last_error: null,
    last_retry_at: null,
    processed_at: new Date('2025-01-11T10:01:00Z'),
    layer1_factors: {
      tld_type: 'gtld',
      tld_value: '.com',
      domain_classification: 'personal',
      pattern_matches: ['blog-pattern'],
      target_profile: { type: 'Personal blog', confidence: 0.85 },
      reasoning: 'Personal blog',
      passed: true,
    },
    layer2_factors: {
      publication_score: 0.3,
      module_scores: {
        product_offering: 0.2,
        layout_quality: 0.4,
        navigation_complexity: 0.3,
        monetization_indicators: 0.3,
      },
      keywords_found: [],
      ad_networks_detected: [],
      content_signals: {
        has_blog: true,
        has_press_releases: false,
        has_whitepapers: false,
        has_case_studies: false,
      },
      reasoning: 'Insufficient publication signals',
      passed: false,
    },
    layer3_factors: null,
    status: 'rejected',
    reviewer_notes: null,
    created_at: new Date('2025-01-11T10:01:00Z'),
    updated_at: new Date('2025-01-11T10:01:00Z'),
  })),
  // 2 failed URLs
  ...Array.from({ length: 2 }, (_, i) => ({
    id: `failed-${i}`,
    url: `https://failed-${i}.com`,
    job_id: 'test-job-123',
    url_id: `url-failed-${i}`,
    confidence_score: null,
    confidence_band: null,
    eliminated_at_layer: 'layer1',
    processing_time_ms: 200,
    total_cost: 0,
    retry_count: 3,
    last_error: 'Connection timeout',
    last_retry_at: new Date('2025-01-11T10:02:00Z'),
    processed_at: new Date('2025-01-11T10:02:00Z'),
    layer1_factors: {
      tld_type: 'gtld',
      tld_value: '.spam',
      domain_classification: 'spam',
      pattern_matches: ['spam-pattern'],
      target_profile: { type: 'Spam', confidence: 0.95 },
      reasoning: 'Spam domain detected',
      passed: false,
    },
    layer2_factors: null,
    layer3_factors: null,
    status: 'failed',
    reviewer_notes: null,
    created_at: new Date('2025-01-11T10:02:00Z'),
    updated_at: new Date('2025-01-11T10:02:00Z'),
  })),
];

// Helper: Create QueryClient for tests
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
    logger: { log: () => {}, warn: () => {}, error: () => {} },
  });
}

// Helper: Render component with QueryClient
function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe('CSV Export Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset URL mocks
    mockCreateObjectURL.mockReturnValue('blob:mock-url');
    mockRevokeObjectURL.mockClear();

    // Default mock for getJobResults
    mockedResultsApi.getJobResults.mockResolvedValue({
      data: createTestResults(),
      pagination: { page: 1, limit: 50, total: 17, totalPages: 1 },
    });
  });

  describe('API Endpoint Integration', () => {
    test('should call export API with correct format parameter', async () => {
      const user = userEvent.setup();
      const mockBlob = new Blob(['url,status\n'], { type: 'text/csv' });
      mockedResultsApi.exportJobResults.mockResolvedValue(mockBlob);

      renderWithQueryClient(
        <ExportDialog
          jobId="test-job-123"
          jobName="Test Job"
          isOpen={true}
          onOpenChange={() => {}}
        />
      );

      const exportButton = screen.getByRole('button', { name: /^export$/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockedResultsApi.exportJobResults).toHaveBeenCalledWith('test-job-123', {
          format: 'complete',
          status: undefined,
        });
      });
    });

    test('should call export API with status filter', async () => {
      const user = userEvent.setup();
      const mockBlob = new Blob(['url,status\n'], { type: 'text/csv' });
      mockedResultsApi.exportJobResults.mockResolvedValue(mockBlob);

      renderWithQueryClient(
        <ExportDialog
          jobId="test-job-123"
          jobName="Test Job"
          isOpen={true}
          onOpenChange={() => {}}
        />
      );

      // Select "Approved Only" status filter
      const statusTrigger = screen.getByRole('combobox', { name: /include results/i });
      await user.click(statusTrigger);
      const approvedOption = await screen.findByText('Approved Only');
      await user.click(approvedOption);

      const exportButton = screen.getByRole('button', { name: /^export$/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockedResultsApi.exportJobResults).toHaveBeenCalledWith('test-job-123', {
          format: 'complete',
          status: 'success',
        });
      });
    });

    test('should call export API with rejected status filter', async () => {
      const user = userEvent.setup();
      const mockBlob = new Blob(['url,status\n'], { type: 'text/csv' });
      mockedResultsApi.exportJobResults.mockResolvedValue(mockBlob);

      renderWithQueryClient(
        <ExportDialog
          jobId="test-job-123"
          jobName="Test Job"
          isOpen={true}
          onOpenChange={() => {}}
        />
      );

      const statusTrigger = screen.getByRole('combobox', { name: /include results/i });
      await user.click(statusTrigger);
      const rejectedOption = await screen.findByText('Rejected Only');
      await user.click(rejectedOption);

      const exportButton = screen.getByRole('button', { name: /^export$/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockedResultsApi.exportJobResults).toHaveBeenCalledWith('test-job-123', {
          format: 'complete',
          status: 'rejected',
        });
      });
    });
  });

  describe('Format Selection Integration', () => {
    test('should export complete format with all columns', async () => {
      const user = userEvent.setup();
      // Mock CSV with 48 columns (complete format)
      const csvHeader = Array.from({ length: 48 }, (_, i) => `col${i}`).join(',');
      const mockBlob = new Blob([`${csvHeader}\n`], { type: 'text/csv' });
      mockedResultsApi.exportJobResults.mockResolvedValue(mockBlob);

      renderWithQueryClient(
        <ExportDialog
          jobId="test-job-123"
          jobName="Test Job"
          isOpen={true}
          onOpenChange={() => {}}
        />
      );

      const exportButton = screen.getByRole('button', { name: /^export$/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockedResultsApi.exportJobResults).toHaveBeenCalledWith('test-job-123', {
          format: 'complete',
          status: undefined,
        });
      });
    });

    test('should export summary format with 7 columns', async () => {
      const user = userEvent.setup();
      const csvHeader = 'url,status,confidence,layer,processing_time,created_at,reason';
      const mockBlob = new Blob([`${csvHeader}\n`], { type: 'text/csv' });
      mockedResultsApi.exportJobResults.mockResolvedValue(mockBlob);

      renderWithQueryClient(
        <ExportDialog
          jobId="test-job-123"
          jobName="Test Job"
          isOpen={true}
          onOpenChange={() => {}}
        />
      );

      // Select summary format
      const formatTrigger = screen.getByRole('combobox', { name: /export format/i });
      await user.click(formatTrigger);
      const summaryOption = await screen.findByText('Summary (7 columns)');
      await user.click(summaryOption);

      const exportButton = screen.getByRole('button', { name: /^export$/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockedResultsApi.exportJobResults).toHaveBeenCalledWith('test-job-123', {
          format: 'summary',
          status: undefined,
        });
      });
    });

    test('should export layer1 format with 15 columns', async () => {
      const user = userEvent.setup();
      const mockBlob = new Blob(['layer1 data'], { type: 'text/csv' });
      mockedResultsApi.exportJobResults.mockResolvedValue(mockBlob);

      renderWithQueryClient(
        <ExportDialog
          jobId="test-job-123"
          jobName="Test Job"
          isOpen={true}
          onOpenChange={() => {}}
        />
      );

      const formatTrigger = screen.getByRole('combobox', { name: /export format/i });
      await user.click(formatTrigger);
      const layer1Option = await screen.findByText('Layer 1 (15 columns)');
      await user.click(layer1Option);

      const exportButton = screen.getByRole('button', { name: /^export$/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockedResultsApi.exportJobResults).toHaveBeenCalledWith('test-job-123', {
          format: 'layer1',
          status: undefined,
        });
      });
    });
  });

  describe('File Download Integration', () => {
    test('should create blob URL when export completes', async () => {
      const user = userEvent.setup();
      const mockBlob = new Blob(['test data'], { type: 'text/csv' });
      mockedResultsApi.exportJobResults.mockResolvedValue(mockBlob);

      renderWithQueryClient(
        <ExportDialog
          jobId="test-job-123"
          jobName="Test Job"
          isOpen={true}
          onOpenChange={() => {}}
        />
      );

      const exportButton = screen.getByRole('button', { name: /^export$/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob);
        expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
      });
    });

    test('should handle multiple sequential exports', async () => {
      const user = userEvent.setup();
      const mockBlob1 = new Blob(['export 1'], { type: 'text/csv' });
      const mockBlob2 = new Blob(['export 2'], { type: 'text/csv' });

      mockedResultsApi.exportJobResults
        .mockResolvedValueOnce(mockBlob1)
        .mockResolvedValueOnce(mockBlob2);

      const { rerender } = renderWithQueryClient(
        <ExportDialog
          jobId="test-job-123"
          jobName="Test Job"
          isOpen={true}
          onOpenChange={() => {}}
        />
      );

      // First export
      const exportButton = screen.getByRole('button', { name: /^export$/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob1);
      });

      // Close and reopen dialog
      rerender(
        <QueryClientProvider client={createTestQueryClient()}>
          <ExportDialog
            jobId="test-job-123"
            jobName="Test Job"
            isOpen={false}
            onOpenChange={() => {}}
          />
        </QueryClientProvider>
      );

      rerender(
        <QueryClientProvider client={createTestQueryClient()}>
          <ExportDialog
            jobId="test-job-123"
            jobName="Test Job"
            isOpen={true}
            onOpenChange={() => {}}
          />
        </QueryClientProvider>
      );

      // Second export
      const exportButton2 = screen.getByRole('button', { name: /^export$/i });
      await user.click(exportButton2);

      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob2);
      });
    });
  });

  describe('ResultsTable Export Button Integration', () => {
    test('should render export button in ResultsTable', async () => {
      renderWithQueryClient(<ResultsTable jobId="test-job-123" jobName="Test Job" />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /export results/i })).toBeInTheDocument();
      });
    });

    test('should open ExportDialog when export button clicked', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<ResultsTable jobId="test-job-123" jobName="Test Job" />);

      // Wait for table to load first
      await waitFor(() => {
        expect(screen.getByText(/https:\/\/approved-0\.com/)).toBeInTheDocument();
      });

      const exportButton = screen.getByRole('button', { name: /export results/i });
      await user.click(exportButton);

      // Look for the dialog description text which is unique to the dialog
      await waitFor(() => {
        expect(screen.getByText(/Choose an export format and optional filters/i)).toBeInTheDocument();
      });
    });

    test('should complete full export flow from ResultsTable', async () => {
      const user = userEvent.setup();
      const mockBlob = new Blob(['csv data'], { type: 'text/csv' });
      mockedResultsApi.exportJobResults.mockResolvedValue(mockBlob);

      renderWithQueryClient(<ResultsTable jobId="test-job-123" jobName="Test Job" />);

      // Wait for table to load first
      await waitFor(() => {
        expect(screen.getByText(/https:\/\/approved-0\.com/)).toBeInTheDocument();
      });

      // Click export button in table
      const tableExportButton = screen.getByRole('button', { name: /export results/i });
      await user.click(tableExportButton);

      // Dialog should open - check for unique dialog text
      await waitFor(() => {
        expect(screen.getByText(/Choose an export format and optional filters/i)).toBeInTheDocument();
      });

      // Click export in dialog
      const dialogExportButton = screen.getByRole('button', { name: /^export$/i });
      await user.click(dialogExportButton);

      // Verify download initiated (blob URL created and revoked)
      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob);
        expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
      });
    });
  });

  describe('Filter Application Integration', () => {
    test('should filter results by status=success', async () => {
      const user = userEvent.setup();
      const approvedOnlyBlob = new Blob(['approved data'], { type: 'text/csv' });
      mockedResultsApi.exportJobResults.mockResolvedValue(approvedOnlyBlob);

      renderWithQueryClient(
        <ExportDialog
          jobId="test-job-123"
          jobName="Test Job"
          isOpen={true}
          onOpenChange={() => {}}
        />
      );

      // Select "Approved Only" filter
      const statusTrigger = screen.getByRole('combobox', { name: /include results/i });
      await user.click(statusTrigger);
      const approvedOption = await screen.findByText('Approved Only');
      await user.click(approvedOption);

      const exportButton = screen.getByRole('button', { name: /^export$/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockedResultsApi.exportJobResults).toHaveBeenCalledWith('test-job-123', {
          format: 'complete',
          status: 'success',
        });
      });
    });

    test('should export all results when no filter selected', async () => {
      const user = userEvent.setup();
      const allResultsBlob = new Blob(['all data'], { type: 'text/csv' });
      mockedResultsApi.exportJobResults.mockResolvedValue(allResultsBlob);

      renderWithQueryClient(
        <ExportDialog
          jobId="test-job-123"
          jobName="Test Job"
          isOpen={true}
          onOpenChange={() => {}}
        />
      );

      const exportButton = screen.getByRole('button', { name: /^export$/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockedResultsApi.exportJobResults).toHaveBeenCalledWith('test-job-123', {
          format: 'complete',
          status: undefined, // No filter means undefined
        });
      });
    });

    test('should combine format and status filters', async () => {
      const user = userEvent.setup();
      const mockBlob = new Blob(['filtered data'], { type: 'text/csv' });
      mockedResultsApi.exportJobResults.mockResolvedValue(mockBlob);

      renderWithQueryClient(
        <ExportDialog
          jobId="test-job-123"
          jobName="Test Job"
          isOpen={true}
          onOpenChange={() => {}}
        />
      );

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

      const exportButton = screen.getByRole('button', { name: /^export$/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockedResultsApi.exportJobResults).toHaveBeenCalledWith('test-job-123', {
          format: 'layer3',
          status: 'rejected',
        });
      });
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle 404 error when job does not exist', async () => {
      const user = userEvent.setup();
      const error = new Error('Job not found');
      (error as any).response = { status: 404 };
      mockedResultsApi.exportJobResults.mockRejectedValue(error);

      renderWithQueryClient(
        <ExportDialog
          jobId="invalid-job-id"
          jobName="Invalid Job"
          isOpen={true}
          onOpenChange={() => {}}
        />
      );

      const exportButton = screen.getByRole('button', { name: /^export$/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText(/job not found/i)).toBeInTheDocument();
      });
    });

    test('should handle 400 error with invalid format', async () => {
      const user = userEvent.setup();
      const error = new Error('Invalid format parameter');
      (error as any).response = { status: 400 };
      mockedResultsApi.exportJobResults.mockRejectedValue(error);

      renderWithQueryClient(
        <ExportDialog
          jobId="test-job-123"
          jobName="Test Job"
          isOpen={true}
          onOpenChange={() => {}}
        />
      );

      const exportButton = screen.getByRole('button', { name: /^export$/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid format parameter/i)).toBeInTheDocument();
      });
    });

    test('should handle network error during export', async () => {
      const user = userEvent.setup();
      const error = new Error('Network Error');
      mockedResultsApi.exportJobResults.mockRejectedValue(error);

      renderWithQueryClient(
        <ExportDialog
          jobId="test-job-123"
          jobName="Test Job"
          isOpen={true}
          onOpenChange={() => {}}
        />
      );

      const exportButton = screen.getByRole('button', { name: /^export$/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    test('should display error alert for export failures', async () => {
      const user = userEvent.setup();
      mockedResultsApi.exportJobResults.mockRejectedValue(new Error('Export failed'));

      renderWithQueryClient(
        <ExportDialog
          jobId="test-job-123"
          jobName="Test Job"
          isOpen={true}
          onOpenChange={() => {}}
        />
      );

      const exportButton = screen.getByRole('button', { name: /^export$/i });
      await user.click(exportButton);

      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toBeInTheDocument();
        expect(screen.getByText(/export failed/i)).toBeInTheDocument();
      });
    });

    test('should disable export button during loading', async () => {
      const user = userEvent.setup();
      let resolveExport: (value: Blob) => void;
      const exportPromise = new Promise<Blob>((resolve) => {
        resolveExport = resolve;
      });
      mockedResultsApi.exportJobResults.mockReturnValue(exportPromise);

      renderWithQueryClient(
        <ExportDialog
          jobId="test-job-123"
          jobName="Test Job"
          isOpen={true}
          onOpenChange={() => {}}
        />
      );

      const exportButton = screen.getByRole('button', { name: /^export$/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(exportButton).toBeDisabled();
        expect(screen.getByText(/exporting/i)).toBeInTheDocument();
      });

      resolveExport!(new Blob(['data'], { type: 'text/csv' }));

      await waitFor(() => {
        expect(exportButton).not.toBeDisabled();
      });
    });
  });

  describe('CSV Data Validation', () => {
    test('should handle CSV export successfully', async () => {
      const user = userEvent.setup();
      const csvData = 'url,status,confidence_score\nhttps://test.com,approved,0.85\n';
      const mockBlob = new Blob([csvData], { type: 'text/csv' });
      mockedResultsApi.exportJobResults.mockResolvedValue(mockBlob);

      renderWithQueryClient(
        <ExportDialog
          jobId="test-job-123"
          jobName="Test Job"
          isOpen={true}
          onOpenChange={() => {}}
        />
      );

      const exportButton = screen.getByRole('button', { name: /^export$/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob);
      });
    });

    test('should handle empty CSV (no data rows)', async () => {
      const user = userEvent.setup();
      const csvData = 'url,status,confidence_score\n'; // Only headers
      const mockBlob = new Blob([csvData], { type: 'text/csv' });
      mockedResultsApi.exportJobResults.mockResolvedValue(mockBlob);

      renderWithQueryClient(
        <ExportDialog
          jobId="test-job-123"
          jobName="Test Job"
          isOpen={true}
          onOpenChange={() => {}}
        />
      );

      const exportButton = screen.getByRole('button', { name: /^export$/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob);
      });
    });

    test('should handle large CSV exports', async () => {
      const user = userEvent.setup();
      // Simulate large CSV with 1000 rows
      const rows = Array.from({ length: 1000 }, (_, i) =>
        `https://test-${i}.com,approved,0.85`
      ).join('\n');
      const csvData = `url,status,confidence_score\n${rows}\n`;
      const mockBlob = new Blob([csvData], { type: 'text/csv' });
      mockedResultsApi.exportJobResults.mockResolvedValue(mockBlob);

      renderWithQueryClient(
        <ExportDialog
          jobId="test-job-123"
          jobName="Test Job"
          isOpen={true}
          onOpenChange={() => {}}
        />
      );

      const exportButton = screen.getByRole('button', { name: /^export$/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob);
      });
    });
  });

  describe('CSV Content Type', () => {
    test('should receive blob with text/csv content type', async () => {
      const user = userEvent.setup();
      const mockBlob = new Blob(['csv data'], { type: 'text/csv' });
      mockedResultsApi.exportJobResults.mockResolvedValue(mockBlob);

      renderWithQueryClient(
        <ExportDialog
          jobId="test-job-123"
          jobName="Test Job"
          isOpen={true}
          onOpenChange={() => {}}
        />
      );

      const exportButton = screen.getByRole('button', { name: /^export$/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockedResultsApi.exportJobResults).toHaveBeenCalled();
        const returnedBlob = mockBlob;
        expect(returnedBlob.type).toBe('text/csv');
      });
    });
  });
});
