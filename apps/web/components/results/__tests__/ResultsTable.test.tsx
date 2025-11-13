import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ResultsTable } from '../ResultsTable';
import { resultsApi } from '@/lib/api-client';
import type { UrlResult } from '@website-scraper/shared';

// Mock the API client
jest.mock('@/lib/api-client', () => ({
  resultsApi: {
    getJobResults: jest.fn(),
  },
}));

// Mock Supabase client to avoid realtime subscription errors
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

// Mock result data
const mockResults: UrlResult[] = [
  {
    id: '1',
    url: 'https://example.com',
    job_id: 'job-1',
    url_id: 'url-1',
    confidence_score: 0.85,
    confidence_band: 'high',
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
      target_profile: {
        type: 'B2B software',
        confidence: 0.9,
      },
      reasoning: 'Commercial domain with strong B2B indicators',
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
      keywords_found: ['pricing', 'enterprise'],
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
        design_quality: {
          score: 0.85,
          indicators: ['Professional layout', 'Modern design'],
        },
        authority_indicators: {
          score: 0.8,
          indicators: ['Industry recognition'],
        },
        professional_presentation: {
          score: 0.9,
          indicators: ['Clear value proposition'],
        },
        content_originality: {
          score: 0.75,
          indicators: ['Original content'],
        },
      },
      llm_provider: 'openai',
      model_version: 'gpt-4',
      cost_usd: 0.05,
      reasoning: 'High quality website with strong sophistication signals',
      tokens_used: {
        input: 1000,
        output: 500,
      },
      processing_time_ms: 2000,
    },
    status: 'approved',
    reviewer_notes: null,
    created_at: new Date('2025-01-11T10:00:00Z'),
    updated_at: new Date('2025-01-11T10:00:00Z'),
  },
  {
    id: '2',
    url: 'https://rejected-example.com',
    job_id: 'job-1',
    url_id: 'url-2',
    confidence_score: 0.25,
    confidence_band: 'low',
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
      target_profile: {
        type: 'Personal blog',
        confidence: 0.85,
      },
      reasoning: 'Personal blog without commercial indicators',
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
  },
  {
    id: '3',
    url: 'https://failed-example.com',
    job_id: 'job-1',
    url_id: 'url-3',
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
      pattern_matches: ['spam-pattern', 'blacklist'],
      target_profile: {
        type: 'Spam',
        confidence: 0.95,
      },
      reasoning: 'Spam domain detected',
      passed: false,
    },
    layer2_factors: null,
    layer3_factors: null,
    status: 'failed',
    reviewer_notes: null,
    created_at: new Date('2025-01-11T10:02:00Z'),
    updated_at: new Date('2025-01-11T10:02:00Z'),
  },
];

const mockPaginatedResponse = {
  data: mockResults,
  pagination: {
    page: 1,
    limit: 50,
    total: 3,
    totalPages: 1,
  },
};

// Helper function to create a fresh QueryClient for each test
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: () => {},
      warn: () => {},
      error: () => {},
    },
  });
}

// Helper function to render component with QueryClientProvider
function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}

describe('ResultsTable Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default successful API response
    mockedResultsApi.getJobResults.mockResolvedValue(mockPaginatedResponse);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('1. Basic Rendering', () => {
    it('should render table with result rows', async () => {
      renderWithQueryClient(<ResultsTable jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('https://example.com')).toBeInTheDocument();
        expect(screen.getByText('https://rejected-example.com')).toBeInTheDocument();
        expect(screen.getByText('https://failed-example.com')).toBeInTheDocument();
      });
    });

    it('should display correct column headers', async () => {
      renderWithQueryClient(<ResultsTable jobId="job-1" />);

      await waitFor(() => {
        // Use getByRole to specifically find table headers
        const headers = screen.getAllByRole('columnheader');
        const headerTexts = headers.map(h => h.textContent);

        expect(headerTexts).toContain('URL');
        expect(headerTexts).toContain('Status');
        expect(headerTexts).toContain('Confidence');
        expect(headerTexts).toContain('Eliminated At Layer');
        expect(headerTexts).toContain('Processing Time');
      });
    });

    it('should display correct row data', async () => {
      renderWithQueryClient(<ResultsTable jobId="job-1" />);

      await waitFor(() => {
        // Check first result
        expect(screen.getByText('https://example.com')).toBeInTheDocument();
        expect(screen.getByText('approved')).toBeInTheDocument();
        expect(screen.getByText('0.85')).toBeInTheDocument();
        expect(screen.getByText('passed_all')).toBeInTheDocument();
        expect(screen.getByText('1.5s')).toBeInTheDocument();
      });
    });

    it('should display confidence score with proper formatting', async () => {
      renderWithQueryClient(<ResultsTable jobId="job-1" />);

      await waitFor(() => {
        // High confidence (0.85)
        expect(screen.getByText('0.85')).toBeInTheDocument();
        // Low confidence (0.25)
        expect(screen.getByText('0.25')).toBeInTheDocument();
      });
    });

    it('should handle null confidence scores', async () => {
      renderWithQueryClient(<ResultsTable jobId="job-1" />);

      await waitFor(() => {
        // Failed result has null confidence
        expect(screen.getByText('https://failed-example.com')).toBeInTheDocument();
        // Should show N/A or dash for null confidence
        const cells = screen.getAllByRole('cell');
        expect(cells.some(cell => cell.textContent === 'N/A' || cell.textContent === '-')).toBe(true);
      });
    });
  });

  describe('2. Pagination Controls', () => {
    it('should show pagination controls', async () => {
      renderWithQueryClient(<ResultsTable jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
      });
    });

    it('should display current page number', async () => {
      renderWithQueryClient(<ResultsTable jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText(/page 1/i)).toBeInTheDocument();
      });
    });

    it('should disable Previous button on page 1', async () => {
      renderWithQueryClient(<ResultsTable jobId="job-1" />);

      await waitFor(() => {
        const prevButton = screen.getByRole('button', { name: /previous/i });
        expect(prevButton).toBeDisabled();
      });
    });

    it('should disable Next button on last page', async () => {
      renderWithQueryClient(<ResultsTable jobId="job-1" />);

      await waitFor(() => {
        const nextButton = screen.getByRole('button', { name: /next/i });
        expect(nextButton).toBeDisabled();
      });
    });

    it('should enable Next button when not on last page', async () => {
      mockedResultsApi.getJobResults.mockResolvedValue({
        data: mockResults,
        pagination: {
          page: 1,
          limit: 50,
          total: 150,
          totalPages: 3,
        },
      });

      renderWithQueryClient(<ResultsTable jobId="job-1" />);

      await waitFor(() => {
        const nextButton = screen.getByRole('button', { name: /next/i });
        expect(nextButton).not.toBeDisabled();
      });
    });

    it('should enable Previous button when not on first page', async () => {
      mockedResultsApi.getJobResults.mockResolvedValue({
        data: mockResults,
        pagination: {
          page: 2,
          limit: 50,
          total: 150,
          totalPages: 3,
        },
      });

      renderWithQueryClient(<ResultsTable jobId="job-1" initialPage={2} />);

      await waitFor(() => {
        const prevButton = screen.getByRole('button', { name: /previous/i });
        expect(prevButton).not.toBeDisabled();
      });
    });
  });

  describe('3. Pagination Navigation', () => {
    it('should call API with correct page on next click', async () => {
      mockedResultsApi.getJobResults.mockResolvedValue({
        data: mockResults,
        pagination: {
          page: 1,
          limit: 50,
          total: 150,
          totalPages: 3,
        },
      });

      renderWithQueryClient(<ResultsTable jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
      });

      const nextButton = screen.getByRole('button', { name: /next/i });
      await userEvent.click(nextButton);

      await waitFor(() => {
        expect(mockedResultsApi.getJobResults).toHaveBeenCalledWith(
          'job-1',
          expect.objectContaining({ page: 2 })
        );
      });
    });

    it('should call API with correct page on previous click', async () => {
      mockedResultsApi.getJobResults
        .mockResolvedValueOnce({
          data: mockResults,
          pagination: {
            page: 2,
            limit: 50,
            total: 150,
            totalPages: 3,
          },
        })
        .mockResolvedValueOnce({
          data: mockResults,
          pagination: {
            page: 1,
            limit: 50,
            total: 150,
            totalPages: 3,
          },
        });

      renderWithQueryClient(<ResultsTable jobId="job-1" initialPage={2} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
      });

      const prevButton = screen.getByRole('button', { name: /previous/i });
      await userEvent.click(prevButton);

      await waitFor(() => {
        expect(mockedResultsApi.getJobResults).toHaveBeenCalledWith(
          'job-1',
          expect.objectContaining({ page: 1 })
        );
      });
    });

    it('should update page when jumping to specific page via input', async () => {
      mockedResultsApi.getJobResults
        .mockResolvedValueOnce({
          data: mockResults,
          pagination: {
            page: 1,
            limit: 50,
            total: 150,
            totalPages: 3,
          },
        })
        .mockResolvedValueOnce({
          data: mockResults,
          pagination: {
            page: 3,
            limit: 50,
            total: 150,
            totalPages: 3,
          },
        });

      renderWithQueryClient(<ResultsTable jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByLabelText(/jump to page/i)).toBeInTheDocument();
      });

      const pageInput = screen.getByLabelText(/jump to page/i);
      await userEvent.clear(pageInput);
      await userEvent.type(pageInput, '3');
      await userEvent.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockedResultsApi.getJobResults).toHaveBeenCalledWith(
          'job-1',
          expect.objectContaining({ page: 3 })
        );
      });
    });

    it('should respect pageSize parameter in requests', async () => {
      renderWithQueryClient(<ResultsTable jobId="job-1" pageSize={25} />);

      await waitFor(() => {
        expect(mockedResultsApi.getJobResults).toHaveBeenCalledWith(
          'job-1',
          expect.objectContaining({ limit: 25 })
        );
      });
    });

    it('should use default pageSize of 50 if not specified', async () => {
      renderWithQueryClient(<ResultsTable jobId="job-1" />);

      await waitFor(() => {
        expect(mockedResultsApi.getJobResults).toHaveBeenCalledWith(
          'job-1',
          expect.objectContaining({ limit: 50 })
        );
      });
    });
  });

  describe('4. Loading State', () => {
    it('should show loading state while fetching data', async () => {
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockedResultsApi.getJobResults.mockReturnValue(promise as Promise<typeof mockPaginatedResponse>);

      renderWithQueryClient(<ResultsTable jobId="job-1" />);

      // Should show loading indicator
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      // Resolve the promise
      resolvePromise!(mockPaginatedResponse);

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('https://example.com')).toBeInTheDocument();
      });
    });

    it('should show loading indicator on pagination change', async () => {
      mockedResultsApi.getJobResults
        .mockResolvedValueOnce({
          data: mockResults,
          pagination: {
            page: 1,
            limit: 50,
            total: 150,
            totalPages: 3,
          },
        })
        .mockImplementationOnce(() => {
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                data: mockResults,
                pagination: {
                  page: 2,
                  limit: 50,
                  total: 150,
                  totalPages: 3,
                },
              });
            }, 100);
          });
        });

      renderWithQueryClient(<ResultsTable jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('https://example.com')).toBeInTheDocument();
      });

      const nextButton = screen.getByRole('button', { name: /next/i });
      await userEvent.click(nextButton);

      // Should show loading state briefly
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe('5. Error State', () => {
    it('should show error state if data fetch fails', async () => {
      mockedResultsApi.getJobResults.mockRejectedValue(new Error('Failed to fetch results'));

      renderWithQueryClient(<ResultsTable jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
        expect(screen.getByText(/failed to fetch results/i)).toBeInTheDocument();
      });
    });

    it('should show retry button on error', async () => {
      mockedResultsApi.getJobResults.mockRejectedValue(new Error('Network error'));

      renderWithQueryClient(<ResultsTable jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('should retry fetching data when retry button is clicked', async () => {
      mockedResultsApi.getJobResults
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockPaginatedResponse);

      renderWithQueryClient(<ResultsTable jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await userEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('https://example.com')).toBeInTheDocument();
      });
    });
  });

  describe('6. Empty State', () => {
    it('should show empty state if no results returned', async () => {
      mockedResultsApi.getJobResults.mockResolvedValue({
        data: [],
        pagination: {
          page: 1,
          limit: 50,
          total: 0,
          totalPages: 0,
        },
      });

      renderWithQueryClient(<ResultsTable jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText(/no results found/i)).toBeInTheDocument();
      });
    });

    it('should show appropriate message in empty state', async () => {
      mockedResultsApi.getJobResults.mockResolvedValue({
        data: [],
        pagination: {
          page: 1,
          limit: 50,
          total: 0,
          totalPages: 0,
        },
      });

      renderWithQueryClient(<ResultsTable jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText(/no results found/i)).toBeInTheDocument();
      });
    });

    it('should not show pagination controls in empty state', async () => {
      mockedResultsApi.getJobResults.mockResolvedValue({
        data: [],
        pagination: {
          page: 1,
          limit: 50,
          total: 0,
          totalPages: 0,
        },
      });

      renderWithQueryClient(<ResultsTable jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText(/no results found/i)).toBeInTheDocument();
      });

      expect(screen.queryByRole('button', { name: /previous/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
    });
  });

  describe('7. Row Expand Functionality', () => {
    it('should show expand button for each row', async () => {
      renderWithQueryClient(<ResultsTable jobId="job-1" />);

      await waitFor(() => {
        const expandButtons = screen.getAllByRole('button', { name: /expand/i });
        expect(expandButtons.length).toBe(mockResults.length);
      });
    });

    it('should expand row when expand button is clicked', async () => {
      renderWithQueryClient(<ResultsTable jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('https://example.com')).toBeInTheDocument();
      });

      const expandButtons = screen.getAllByRole('button', { name: /expand/i });
      await userEvent.click(expandButtons[0]);

      await waitFor(() => {
        // Should show additional details - the Layer1Factors component displays "Layer 1: Domain Analysis"
        expect(screen.getByText(/layer 1.*domain analysis/i)).toBeInTheDocument();
      });
    });

    it('should collapse row when collapse button is clicked', async () => {
      renderWithQueryClient(<ResultsTable jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('https://example.com')).toBeInTheDocument();
      });

      const expandButtons = screen.getAllByRole('button', { name: /expand/i });
      await userEvent.click(expandButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/layer 1.*domain analysis/i)).toBeInTheDocument();
      });

      const collapseButton = screen.getByRole('button', { name: /collapse/i });
      await userEvent.click(collapseButton);

      await waitFor(() => {
        expect(screen.queryByText(/layer 1.*domain analysis/i)).not.toBeInTheDocument();
      });
    });

    it('should display layer factors in expanded row', async () => {
      renderWithQueryClient(<ResultsTable jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('https://example.com')).toBeInTheDocument();
      });

      const expandButtons = screen.getAllByRole('button', { name: /expand/i });
      await userEvent.click(expandButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/layer 1.*domain analysis/i)).toBeInTheDocument();
        expect(screen.getByText(/layer 2.*publication detection/i)).toBeInTheDocument();
        expect(screen.getByText(/layer 3.*sophistication analysis/i)).toBeInTheDocument();
      });
    });

    it('should handle rows with null layer factors', async () => {
      renderWithQueryClient(<ResultsTable jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('https://example.com')).toBeInTheDocument();
      });

      // Expand second row (rejected at layer 2, has no layer 3 factors)
      const expandButtons = screen.getAllByRole('button', { name: /expand/i });
      await userEvent.click(expandButtons[1]);

      await waitFor(() => {
        expect(screen.getByText(/layer 1.*domain analysis/i)).toBeInTheDocument();
        expect(screen.getByText(/layer 2.*publication detection/i)).toBeInTheDocument();
        // Should not show layer 3 factors since they're null
        expect(screen.queryByText(/layer 3.*sophistication analysis/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('8. Filtering Support', () => {
    it('should filter by decision (approved)', async () => {
      renderWithQueryClient(<ResultsTable jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('https://example.com')).toBeInTheDocument();
      });

      // Find and click the decision filter dropdown
      const decisionSelect = screen.getByLabelText(/decision/i);
      fireEvent.click(decisionSelect);

      // Wait for options to appear and select "Approved"
      await waitFor(() => {
        expect(screen.getByRole('option', { name: /^approved$/i })).toBeInTheDocument();
      });

      const approvedOption = screen.getByRole('option', { name: /^approved$/i });
      fireEvent.click(approvedOption);

      // Verify API was called with correct filter parameter
      await waitFor(() => {
        expect(mockedResultsApi.getJobResults).toHaveBeenCalledWith(
          'job-1',
          expect.objectContaining({ filter: 'approved' })
        );
      });
    });

    it('should filter by layer (layer2)', async () => {
      renderWithQueryClient(<ResultsTable jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('https://example.com')).toBeInTheDocument();
      });

      // Find and click the layer filter dropdown
      const layerSelect = screen.getByLabelText(/^layer$/i);
      fireEvent.click(layerSelect);

      // Wait for options to appear and select "Layer 2"
      await waitFor(() => {
        expect(screen.getByRole('option', { name: /^layer 2$/i })).toBeInTheDocument();
      });

      const layer2Option = screen.getByRole('option', { name: /^layer 2$/i });
      fireEvent.click(layer2Option);

      // Verify API was called with correct layer parameter
      await waitFor(() => {
        expect(mockedResultsApi.getJobResults).toHaveBeenCalledWith(
          'job-1',
          expect.objectContaining({ layer: 'layer2' })
        );
      });
    });

    it('should filter by confidence band (high)', async () => {
      renderWithQueryClient(<ResultsTable jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('https://example.com')).toBeInTheDocument();
      });

      // Find and click the confidence filter dropdown
      const confidenceSelect = screen.getByLabelText(/confidence band/i);
      fireEvent.click(confidenceSelect);

      // Wait for options to appear and select "High"
      await waitFor(() => {
        expect(screen.getByRole('option', { name: /^high/i })).toBeInTheDocument();
      });

      const highOption = screen.getByRole('option', { name: /^high/i });
      fireEvent.click(highOption);

      // Verify API was called with correct confidence parameter
      await waitFor(() => {
        expect(mockedResultsApi.getJobResults).toHaveBeenCalledWith(
          'job-1',
          expect.objectContaining({ confidence: 'high' })
        );
      });
    });

    it('should combine multiple filters', async () => {
      renderWithQueryClient(<ResultsTable jobId="job-1" />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('https://example.com')).toBeInTheDocument();
      });

      // Select decision filter: Approved
      let decisionSelect = screen.getByLabelText(/decision/i);
      fireEvent.click(decisionSelect);

      await waitFor(() => {
        expect(screen.getByRole('option', { name: /^approved$/i })).toBeInTheDocument();
      });

      const approvedOption = screen.getByRole('option', { name: /^approved$/i });
      fireEvent.click(approvedOption);

      await waitFor(() => {
        expect(mockedResultsApi.getJobResults).toHaveBeenCalledWith(
          'job-1',
          expect.objectContaining({ filter: 'approved' })
        );
      });

      // Wait for the component to finish loading after the first filter
      await waitFor(() => {
        expect(screen.getByText('https://example.com')).toBeInTheDocument();
      });

      // Select layer filter: Layer 3
      const layerSelect = screen.getByLabelText(/^layer$/i);
      fireEvent.click(layerSelect);

      await waitFor(() => {
        expect(screen.getByRole('option', { name: /^layer 3$/i })).toBeInTheDocument();
      });

      const layer3Option = screen.getByRole('option', { name: /^layer 3$/i });
      fireEvent.click(layer3Option);

      await waitFor(() => {
        expect(mockedResultsApi.getJobResults).toHaveBeenCalledWith(
          'job-1',
          expect.objectContaining({ filter: 'approved', layer: 'layer3' })
        );
      });

      // Wait for the component to finish loading after the second filter
      await waitFor(() => {
        expect(screen.getByText('https://example.com')).toBeInTheDocument();
      });

      // Select confidence filter: High
      const confidenceSelect = screen.getByLabelText(/confidence band/i);
      fireEvent.click(confidenceSelect);

      await waitFor(() => {
        expect(screen.getByRole('option', { name: /^high/i })).toBeInTheDocument();
      });

      const highOption = screen.getByRole('option', { name: /^high/i });
      fireEvent.click(highOption);

      // Verify all three filters are applied
      await waitFor(() => {
        expect(mockedResultsApi.getJobResults).toHaveBeenCalledWith(
          'job-1',
          expect.objectContaining({
            filter: 'approved',
            layer: 'layer3',
            confidence: 'high',
          })
        );
      });
    });

    it('should refetch data when filters change', async () => {
      renderWithQueryClient(<ResultsTable jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('https://example.com')).toBeInTheDocument();
      });

      const initialCallCount = mockedResultsApi.getJobResults.mock.calls.length;

      // Change decision filter
      const decisionSelect = screen.getByLabelText(/decision/i);
      fireEvent.click(decisionSelect);

      await waitFor(() => {
        expect(screen.getByRole('option', { name: /^rejected$/i })).toBeInTheDocument();
      });

      const rejectedOption = screen.getByRole('option', { name: /^rejected$/i });
      fireEvent.click(rejectedOption);

      // Verify API was called again with new filter
      await waitFor(() => {
        expect(mockedResultsApi.getJobResults.mock.calls.length).toBeGreaterThan(initialCallCount);
        expect(mockedResultsApi.getJobResults).toHaveBeenCalledWith(
          'job-1',
          expect.objectContaining({ filter: 'rejected' })
        );
      });
    });

    it('should reset to "all" for each filter by default', async () => {
      renderWithQueryClient(<ResultsTable jobId="job-1" />);

      // On initial render, all filters should be "all"
      await waitFor(() => {
        expect(mockedResultsApi.getJobResults).toHaveBeenCalledWith(
          'job-1',
          expect.objectContaining({
            filter: 'all',
            layer: 'all',
            confidence: 'all',
          })
        );
      });
    });
  });

  describe('9. Processing Time Display', () => {
    it('should format processing time correctly in seconds', async () => {
      renderWithQueryClient(<ResultsTable jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('1.5s')).toBeInTheDocument(); // 1500ms
        expect(screen.getByText('0.8s')).toBeInTheDocument(); // 800ms
        expect(screen.getByText('0.2s')).toBeInTheDocument(); // 200ms
      });
    });

    it('should handle zero processing time', async () => {
      const zeroTimeResults = [{
        ...mockResults[0],
        processing_time_ms: 0,
      }];

      mockedResultsApi.getJobResults.mockResolvedValue({
        data: zeroTimeResults,
        pagination: {
          page: 1,
          limit: 50,
          total: 1,
          totalPages: 1,
        },
      });

      renderWithQueryClient(<ResultsTable jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('0.0s')).toBeInTheDocument();
      });
    });
  });

  describe('10. Accessibility', () => {
    it('should have proper ARIA labels for table', async () => {
      renderWithQueryClient(<ResultsTable jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });
    });

    it('should have accessible pagination controls', async () => {
      renderWithQueryClient(<ResultsTable jobId="job-1" />);

      await waitFor(() => {
        const prevButton = screen.getByRole('button', { name: /previous/i });
        const nextButton = screen.getByRole('button', { name: /next/i });
        expect(prevButton).toBeInTheDocument();
        expect(nextButton).toBeInTheDocument();
      });
    });

    it('should have accessible expand buttons', async () => {
      renderWithQueryClient(<ResultsTable jobId="job-1" />);

      await waitFor(() => {
        const expandButtons = screen.getAllByRole('button', { name: /expand/i });
        expect(expandButtons.length).toBeGreaterThan(0);
      });
    });

    it('should have proper table headers', async () => {
      renderWithQueryClient(<ResultsTable jobId="job-1" />);

      await waitFor(() => {
        const headers = screen.getAllByRole('columnheader');
        expect(headers.length).toBeGreaterThan(0);
      });
    });
  });
});
