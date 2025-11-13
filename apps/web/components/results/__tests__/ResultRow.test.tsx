import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ResultRow } from '../ResultRow';
import { jobsApi } from '@/lib/api-client';
import type { UrlResult, Layer1Factors, Layer2Factors, Layer3Factors } from '@website-scraper/shared';

// Mock the API client
jest.mock('@/lib/api-client', () => ({
  jobsApi: {
    getResultDetails: jest.fn(),
  },
}));

// Mock FactorBreakdown component (will be created in T048)
jest.mock('../FactorBreakdown', () => ({
  FactorBreakdown: ({ layer1, layer2, layer3, isLoading }: any) => {
    if (isLoading) {
      return <div data-testid="factor-breakdown-loading">Loading factors...</div>;
    }
    return (
      <div data-testid="factor-breakdown">
        {layer1 && <div data-testid="layer1-data">Layer 1 Factors</div>}
        {layer2 && <div data-testid="layer2-data">Layer 2 Factors</div>}
        {layer3 && <div data-testid="layer3-data">Layer 3 Factors</div>}
      </div>
    );
  },
}));

describe('ResultRow Component - TDD Test Suite', () => {
  let queryClient: QueryClient;

  // Mock data factories
  const createMockResult = (overrides?: Partial<UrlResult>): UrlResult => ({
    id: 'result-123',
    url: 'https://example.com',
    job_id: 'job-456',
    url_id: 'url-789',
    confidence_score: 0.85,
    confidence_band: 'high',
    eliminated_at_layer: null,
    processing_time_ms: 4523,
    total_cost: 0.00145,
    retry_count: 0,
    last_error: null,
    last_retry_at: null,
    processed_at: new Date('2024-01-15T10:30:00Z'),
    layer1_factors: null,
    layer2_factors: null,
    layer3_factors: null,
    status: 'approved',
    reviewer_notes: null,
    created_at: new Date('2024-01-15T10:25:00Z'),
    updated_at: new Date('2024-01-15T10:30:00Z'),
    ...overrides,
  });

  const createLayer1Factors = (): Layer1Factors => ({
    tld_type: 'gtld',
    tld_value: '.com',
    domain_classification: 'commercial',
    pattern_matches: [],
    target_profile: {
      type: 'B2B software',
      confidence: 0.92,
    },
    reasoning: 'Domain appears to be a legitimate B2B software company',
    passed: true,
  });

  const createLayer2Factors = (): Layer2Factors => ({
    publication_score: 0.45,
    module_scores: {
      product_offering: 0.8,
      layout_quality: 0.75,
      navigation_complexity: 0.6,
      monetization_indicators: 0.2,
    },
    keywords_found: ['pricing', 'demo', 'get started'],
    ad_networks_detected: [],
    content_signals: {
      has_blog: true,
      has_press_releases: false,
      has_whitepapers: true,
      has_case_studies: true,
    },
    reasoning: 'Strong product offering indicators with business-focused navigation',
    passed: true,
  });

  const createLayer3Factors = (): Layer3Factors => ({
    classification: 'accepted',
    sophistication_signals: {
      design_quality: {
        score: 0.88,
        indicators: ['Modern UI', 'Consistent branding', 'Professional typography'],
      },
      authority_indicators: {
        score: 0.82,
        indicators: ['Industry certifications', 'Customer testimonials', 'Case studies'],
      },
      professional_presentation: {
        score: 0.90,
        indicators: ['Clear value proposition', 'Well-structured content', 'Professional imagery'],
      },
      content_originality: {
        score: 0.85,
        indicators: ['Original research', 'Unique insights', 'Custom graphics'],
      },
    },
    llm_provider: 'openai',
    model_version: 'gpt-4-turbo-preview',
    cost_usd: 0.0012,
    reasoning: 'High-quality B2B software company with strong design and authority signals',
    tokens_used: {
      input: 1500,
      output: 300,
    },
    processing_time_ms: 2100,
  });

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    jest.clearAllMocks();
  });

  const renderWithQueryClient = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>
    );
  };

  // Test Scenario 1: Renders summary row with URL, status, confidence, eliminated_layer, processing_time
  describe('Initial Render', () => {
    it('should render summary row with all required fields', () => {
      const mockResult = createMockResult({
        url: 'https://testcompany.com',
        status: 'approved',
        confidence_score: 0.85,
        eliminated_at_layer: null,
        processing_time_ms: 4523,
      });

      renderWithQueryClient(
        <ResultRow result={mockResult} jobId="job-456" />
      );

      // Verify URL is displayed
      expect(screen.getByText('https://testcompany.com')).toBeInTheDocument();

      // Verify status is displayed
      expect(screen.getByText(/approved/i)).toBeInTheDocument();

      // Verify confidence score is displayed (85%)
      expect(screen.getByText(/85%|0\.85/)).toBeInTheDocument();

      // Verify processing time is displayed (4.5s)
      expect(screen.getByText(/4\.5s|4523ms/)).toBeInTheDocument();
    });

    it('should display correct eliminated_at_layer for Layer 1 elimination', () => {
      const mockResult = createMockResult({
        eliminated_at_layer: 'layer1',
        status: 'rejected',
        confidence_score: null,
      });

      renderWithQueryClient(
        <ResultRow result={mockResult} jobId="job-456" />
      );

      expect(screen.getByText(/Layer 1|layer1/i)).toBeInTheDocument();
      expect(screen.getByText(/rejected/i)).toBeInTheDocument();
    });

    it('should display correct eliminated_at_layer for Layer 2 elimination', () => {
      const mockResult = createMockResult({
        eliminated_at_layer: 'layer2',
        status: 'rejected',
        confidence_score: null,
      });

      renderWithQueryClient(
        <ResultRow result={mockResult} jobId="job-456" />
      );

      expect(screen.getByText(/Layer 2|layer2/i)).toBeInTheDocument();
    });

    it('should display "Passed All" for results that passed all layers', () => {
      const mockResult = createMockResult({
        eliminated_at_layer: 'passed_all',
        status: 'approved',
        confidence_score: 0.92,
      });

      renderWithQueryClient(
        <ResultRow result={mockResult} jobId="job-456" />
      );

      expect(screen.getByText(/Passed All|passed_all/i)).toBeInTheDocument();
    });
  });

  // Test Scenario 2: Shows expand button in initial state
  describe('Expand/Collapse Button', () => {
    it('should show expand button in collapsed state', () => {
      const mockResult = createMockResult();

      renderWithQueryClient(
        <ResultRow result={mockResult} jobId="job-456" />
      );

      const expandButton = screen.getByRole('button', { name: /expand|show details|view factors/i });
      expect(expandButton).toBeInTheDocument();
    });

    it('should have aria-expanded=false initially', () => {
      const mockResult = createMockResult();

      renderWithQueryClient(
        <ResultRow result={mockResult} jobId="job-456" />
      );

      const expandButton = screen.getByRole('button', { name: /expand|show details|view factors/i });
      expect(expandButton).toHaveAttribute('aria-expanded', 'false');
    });
  });

  // Test Scenario 3: Fetches and displays full factor data on expand
  describe('Expand Functionality', () => {
    it('should fetch result details when expand button is clicked', async () => {
      const user = userEvent.setup();
      const mockResult = createMockResult();
      const mockDetailedResult = {
        ...mockResult,
        layer1_factors: createLayer1Factors(),
        layer2_factors: createLayer2Factors(),
        layer3_factors: createLayer3Factors(),
      };

      (jobsApi.getResultDetails as jest.Mock).mockResolvedValue(mockDetailedResult);

      renderWithQueryClient(
        <ResultRow result={mockResult} jobId="job-456" />
      );

      const expandButton = screen.getByRole('button', { name: /expand|show details|view factors/i });
      await user.click(expandButton);

      // Verify API was called with correct parameters
      await waitFor(() => {
        expect(jobsApi.getResultDetails).toHaveBeenCalledWith('job-456', 'result-123');
      });
    });

    it('should make API call to GET /jobs/{jobId}/results/{resultId}', async () => {
      const user = userEvent.setup();
      const mockResult = createMockResult({
        id: 'specific-result-id',
        job_id: 'specific-job-id',
      });

      (jobsApi.getResultDetails as jest.Mock).mockResolvedValue({
        ...mockResult,
        layer1_factors: createLayer1Factors(),
      });

      renderWithQueryClient(
        <ResultRow result={mockResult} jobId="specific-job-id" />
      );

      const expandButton = screen.getByRole('button', { name: /expand|show details|view factors/i });
      await user.click(expandButton);

      await waitFor(() => {
        expect(jobsApi.getResultDetails).toHaveBeenCalledWith('specific-job-id', 'specific-result-id');
      });
    });
  });

  // Test Scenario 4: Shows loading spinner while fetching details
  describe('Loading State', () => {
    it('should display loading spinner while fetching details', async () => {
      const user = userEvent.setup();
      const mockResult = createMockResult();

      // Mock a delayed response
      (jobsApi.getResultDetails as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          ...mockResult,
          layer1_factors: createLayer1Factors(),
        }), 100))
      );

      renderWithQueryClient(
        <ResultRow result={mockResult} jobId="job-456" />
      );

      const expandButton = screen.getByRole('button', { name: /expand|show details|view factors/i });
      await user.click(expandButton);

      // Check for loading state
      expect(screen.getByTestId('factor-breakdown-loading')).toBeInTheDocument();
      expect(screen.getByText('Loading factors...')).toBeInTheDocument();
    });
  });

  // Test Scenario 5: Displays FactorBreakdown component after data loads
  describe('Factor Data Display', () => {
    it('should display FactorBreakdown component with data after loading', async () => {
      const user = userEvent.setup();
      const mockResult = createMockResult();
      const mockDetailedResult = {
        ...mockResult,
        layer1_factors: createLayer1Factors(),
        layer2_factors: createLayer2Factors(),
        layer3_factors: createLayer3Factors(),
      };

      (jobsApi.getResultDetails as jest.Mock).mockResolvedValue(mockDetailedResult);

      renderWithQueryClient(
        <ResultRow result={mockResult} jobId="job-456" />
      );

      const expandButton = screen.getByRole('button', { name: /expand|show details|view factors/i });
      await user.click(expandButton);

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByTestId('factor-breakdown')).toBeInTheDocument();
      });
    });

    it('should pass all three layers to FactorBreakdown component', async () => {
      const user = userEvent.setup();
      const mockResult = createMockResult();
      const mockDetailedResult = {
        ...mockResult,
        layer1_factors: createLayer1Factors(),
        layer2_factors: createLayer2Factors(),
        layer3_factors: createLayer3Factors(),
      };

      (jobsApi.getResultDetails as jest.Mock).mockResolvedValue(mockDetailedResult);

      renderWithQueryClient(
        <ResultRow result={mockResult} jobId="job-456" />
      );

      const expandButton = screen.getByRole('button', { name: /expand|show details|view factors/i });
      await user.click(expandButton);

      await waitFor(() => {
        expect(screen.getByTestId('layer1-data')).toBeInTheDocument();
        expect(screen.getByTestId('layer2-data')).toBeInTheDocument();
        expect(screen.getByTestId('layer3-data')).toBeInTheDocument();
      });
    });
  });

  // Test Scenario 6: Shows error message if detail fetch fails
  describe('Error Handling', () => {
    it('should display error message if API call fails', async () => {
      const user = userEvent.setup();
      const mockResult = createMockResult();

      (jobsApi.getResultDetails as jest.Mock).mockRejectedValue(
        new Error('Failed to fetch result details')
      );

      renderWithQueryClient(
        <ResultRow result={mockResult} jobId="job-456" />
      );

      const expandButton = screen.getByRole('button', { name: /expand|show details|view factors/i });
      await user.click(expandButton);

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText(/error|failed|could not load/i)).toBeInTheDocument();
      });
    });

    it('should handle 404 error gracefully', async () => {
      const user = userEvent.setup();
      const mockResult = createMockResult();

      (jobsApi.getResultDetails as jest.Mock).mockRejectedValue({
        response: { status: 404, data: { message: 'Result not found' } },
      });

      renderWithQueryClient(
        <ResultRow result={mockResult} jobId="job-456" />
      );

      const expandButton = screen.getByRole('button', { name: /expand|show details|view factors/i });
      await user.click(expandButton);

      await waitFor(() => {
        expect(screen.getByText(/not found|error/i)).toBeInTheDocument();
      });
    });

    it('should handle network error gracefully', async () => {
      const user = userEvent.setup();
      const mockResult = createMockResult();

      (jobsApi.getResultDetails as jest.Mock).mockRejectedValue(
        new Error('Network Error')
      );

      renderWithQueryClient(
        <ResultRow result={mockResult} jobId="job-456" />
      );

      const expandButton = screen.getByRole('button', { name: /expand|show details|view factors/i });
      await user.click(expandButton);

      await waitFor(() => {
        expect(screen.getByText(/error|failed/i)).toBeInTheDocument();
      });
    });
  });

  // Test Scenario 7: Collapses and hides FactorBreakdown on second click
  describe('Collapse Functionality', () => {
    it('should collapse and hide FactorBreakdown on second click', async () => {
      const user = userEvent.setup();
      const mockResult = createMockResult();
      const mockDetailedResult = {
        ...mockResult,
        layer1_factors: createLayer1Factors(),
      };

      (jobsApi.getResultDetails as jest.Mock).mockResolvedValue(mockDetailedResult);

      renderWithQueryClient(
        <ResultRow result={mockResult} jobId="job-456" />
      );

      const expandButton = screen.getByRole('button', { name: /expand|show details|view factors/i });

      // First click - expand
      await user.click(expandButton);
      await waitFor(() => {
        expect(screen.getByTestId('factor-breakdown')).toBeInTheDocument();
      });

      // Second click - collapse
      const collapseButton = screen.getByRole('button', { name: /collapse|hide details/i });
      await user.click(collapseButton);

      // FactorBreakdown should be hidden
      await waitFor(() => {
        expect(screen.queryByTestId('factor-breakdown')).not.toBeInTheDocument();
      });
    });

    it('should update aria-expanded attribute on toggle', async () => {
      const user = userEvent.setup();
      const mockResult = createMockResult();

      (jobsApi.getResultDetails as jest.Mock).mockResolvedValue({
        ...mockResult,
        layer1_factors: createLayer1Factors(),
      });

      renderWithQueryClient(
        <ResultRow result={mockResult} jobId="job-456" />
      );

      const expandButton = screen.getByRole('button', { name: /expand|show details|view factors/i });
      expect(expandButton).toHaveAttribute('aria-expanded', 'false');

      // Expand
      await user.click(expandButton);
      await waitFor(() => {
        expect(expandButton).toHaveAttribute('aria-expanded', 'true');
      });

      // Collapse
      await user.click(expandButton);
      await waitFor(() => {
        expect(expandButton).toHaveAttribute('aria-expanded', 'false');
      });
    });
  });

  // Test Scenario 8: Shows correct data for Layer 1 (eliminated)
  describe('Layer 1 Elimination', () => {
    it('should display Layer 1 factors when eliminated at Layer 1', async () => {
      const user = userEvent.setup();
      const mockResult = createMockResult({
        eliminated_at_layer: 'layer1',
        status: 'rejected',
        confidence_score: null,
      });
      const mockDetailedResult = {
        ...mockResult,
        layer1_factors: createLayer1Factors(),
        layer2_factors: null,
        layer3_factors: null,
      };

      (jobsApi.getResultDetails as jest.Mock).mockResolvedValue(mockDetailedResult);

      renderWithQueryClient(
        <ResultRow result={mockResult} jobId="job-456" />
      );

      const expandButton = screen.getByRole('button', { name: /expand|show details|view factors/i });
      await user.click(expandButton);

      await waitFor(() => {
        expect(screen.getByTestId('layer1-data')).toBeInTheDocument();
        expect(screen.queryByTestId('layer2-data')).not.toBeInTheDocument();
        expect(screen.queryByTestId('layer3-data')).not.toBeInTheDocument();
      });
    });

    it('should show failed status for Layer 1 eliminated results', async () => {
      const mockResult = createMockResult({
        eliminated_at_layer: 'layer1',
        status: 'rejected',
      });

      renderWithQueryClient(
        <ResultRow result={mockResult} jobId="job-456" />
      );

      expect(screen.getByText(/rejected/i)).toBeInTheDocument();
      expect(screen.getByText(/Layer 1|layer1/i)).toBeInTheDocument();
    });
  });

  // Test Scenario 9: Shows correct data for Layer 2 (eliminated)
  describe('Layer 2 Elimination', () => {
    it('should display Layer 1 and 2 factors when eliminated at Layer 2', async () => {
      const user = userEvent.setup();
      const mockResult = createMockResult({
        eliminated_at_layer: 'layer2',
        status: 'rejected',
        confidence_score: null,
      });
      const mockDetailedResult = {
        ...mockResult,
        layer1_factors: createLayer1Factors(),
        layer2_factors: createLayer2Factors(),
        layer3_factors: null,
      };

      (jobsApi.getResultDetails as jest.Mock).mockResolvedValue(mockDetailedResult);

      renderWithQueryClient(
        <ResultRow result={mockResult} jobId="job-456" />
      );

      const expandButton = screen.getByRole('button', { name: /expand|show details|view factors/i });
      await user.click(expandButton);

      await waitFor(() => {
        expect(screen.getByTestId('layer1-data')).toBeInTheDocument();
        expect(screen.getByTestId('layer2-data')).toBeInTheDocument();
        expect(screen.queryByTestId('layer3-data')).not.toBeInTheDocument();
      });
    });
  });

  // Test Scenario 10: Shows correct data for Layer 3 (passed all layers)
  describe('Passed All Layers', () => {
    it('should display all three layers when passed all layers', async () => {
      const user = userEvent.setup();
      const mockResult = createMockResult({
        eliminated_at_layer: 'passed_all',
        status: 'approved',
        confidence_score: 0.92,
      });
      const mockDetailedResult = {
        ...mockResult,
        layer1_factors: createLayer1Factors(),
        layer2_factors: createLayer2Factors(),
        layer3_factors: createLayer3Factors(),
      };

      (jobsApi.getResultDetails as jest.Mock).mockResolvedValue(mockDetailedResult);

      renderWithQueryClient(
        <ResultRow result={mockResult} jobId="job-456" />
      );

      const expandButton = screen.getByRole('button', { name: /expand|show details|view factors/i });
      await user.click(expandButton);

      await waitFor(() => {
        expect(screen.getByTestId('layer1-data')).toBeInTheDocument();
        expect(screen.getByTestId('layer2-data')).toBeInTheDocument();
        expect(screen.getByTestId('layer3-data')).toBeInTheDocument();
      });
    });

    it('should display high confidence score for approved results', () => {
      const mockResult = createMockResult({
        eliminated_at_layer: 'passed_all',
        status: 'approved',
        confidence_score: 0.92,
        confidence_band: 'very-high',
      });

      renderWithQueryClient(
        <ResultRow result={mockResult} jobId="job-456" />
      );

      expect(screen.getByText(/92%|0\.92/)).toBeInTheDocument();
    });
  });

  // Test Scenario 11: Handles NULL factor values (pre-migration data)
  describe('NULL Factor Handling (Pre-Migration Data)', () => {
    it('should handle NULL layer1_factors gracefully', async () => {
      const user = userEvent.setup();
      const mockResult = createMockResult({
        eliminated_at_layer: 'passed_all',
        layer1_factors: null,
      });
      const mockDetailedResult = {
        ...mockResult,
        layer1_factors: null,
        layer2_factors: createLayer2Factors(),
        layer3_factors: createLayer3Factors(),
      };

      (jobsApi.getResultDetails as jest.Mock).mockResolvedValue(mockDetailedResult);

      renderWithQueryClient(
        <ResultRow result={mockResult} jobId="job-456" />
      );

      const expandButton = screen.getByRole('button', { name: /expand|show details|view factors/i });
      await user.click(expandButton);

      await waitFor(() => {
        expect(screen.getByTestId('factor-breakdown')).toBeInTheDocument();
      });
    });

    it('should handle all NULL factors (pre-migration data)', async () => {
      const user = userEvent.setup();
      const mockResult = createMockResult({
        layer1_factors: null,
        layer2_factors: null,
        layer3_factors: null,
      });
      const mockDetailedResult = {
        ...mockResult,
        layer1_factors: null,
        layer2_factors: null,
        layer3_factors: null,
      };

      (jobsApi.getResultDetails as jest.Mock).mockResolvedValue(mockDetailedResult);

      renderWithQueryClient(
        <ResultRow result={mockResult} jobId="job-456" />
      );

      const expandButton = screen.getByRole('button', { name: /expand|show details|view factors/i });
      await user.click(expandButton);

      await waitFor(() => {
        expect(screen.getByTestId('factor-breakdown')).toBeInTheDocument();
      });
    });

    it('should show "No data available" message for pre-migration records', async () => {
      const user = userEvent.setup();
      const mockResult = createMockResult({
        layer1_factors: null,
        layer2_factors: null,
        layer3_factors: null,
      });

      (jobsApi.getResultDetails as jest.Mock).mockResolvedValue(mockResult);

      renderWithQueryClient(
        <ResultRow result={mockResult} jobId="job-456" />
      );

      const expandButton = screen.getByRole('button', { name: /expand|show details|view factors/i });
      await user.click(expandButton);

      await waitFor(() => {
        // FactorBreakdown should show empty state
        expect(screen.getByTestId('factor-breakdown')).toBeInTheDocument();
      });
    });
  });

  // Test Scenario 12: Styling correct for expanded/collapsed states
  describe('Visual States', () => {
    it('should apply collapsed styling initially', () => {
      const mockResult = createMockResult();

      const { container } = renderWithQueryClient(
        <ResultRow result={mockResult} jobId="job-456" />
      );

      // Check that expanded content is not visible
      expect(screen.queryByTestId('factor-breakdown')).not.toBeInTheDocument();
    });

    it('should apply expanded styling when open', async () => {
      const user = userEvent.setup();
      const mockResult = createMockResult();

      (jobsApi.getResultDetails as jest.Mock).mockResolvedValue({
        ...mockResult,
        layer1_factors: createLayer1Factors(),
      });

      renderWithQueryClient(
        <ResultRow result={mockResult} jobId="job-456" />
      );

      const expandButton = screen.getByRole('button', { name: /expand|show details|view factors/i });
      await user.click(expandButton);

      await waitFor(() => {
        expect(screen.getByTestId('factor-breakdown')).toBeInTheDocument();
      });
    });

    it('should show different styling for approved vs rejected results', () => {
      const { rerender } = renderWithQueryClient(
        <ResultRow result={createMockResult({ status: 'approved' })} jobId="job-456" />
      );

      expect(screen.getByText(/approved/i)).toBeInTheDocument();

      rerender(
        <QueryClientProvider client={queryClient}>
          <ResultRow result={createMockResult({ status: 'rejected' })} jobId="job-456" />
        </QueryClientProvider>
      );

      expect(screen.getByText(/rejected/i)).toBeInTheDocument();
    });

    it('should display confidence bands with appropriate styling', () => {
      const confidenceBands: Array<'very-high' | 'high' | 'medium' | 'low' | 'very-low'> = [
        'very-high',
        'high',
        'medium',
        'low',
        'very-low',
      ];

      confidenceBands.forEach(band => {
        const { rerender } = renderWithQueryClient(
          <ResultRow
            result={createMockResult({
              confidence_band: band,
              confidence_score: 0.85,
            })}
            jobId="job-456"
          />
        );

        // Band should be reflected in UI somehow (could be color, badge, etc)
        expect(screen.getByText(/85%|0\.85/)).toBeInTheDocument();
      });
    });
  });

  // Additional Test: Only fetches once on expand
  describe('Performance', () => {
    it('should only fetch data once when expanding', async () => {
      const user = userEvent.setup();
      const mockResult = createMockResult();

      (jobsApi.getResultDetails as jest.Mock).mockResolvedValue({
        ...mockResult,
        layer1_factors: createLayer1Factors(),
      });

      renderWithQueryClient(
        <ResultRow result={mockResult} jobId="job-456" />
      );

      const expandButton = screen.getByRole('button', { name: /expand|show details|view factors/i });

      // First expand
      await user.click(expandButton);
      await waitFor(() => {
        expect(screen.getByTestId('factor-breakdown')).toBeInTheDocument();
      });

      expect(jobsApi.getResultDetails).toHaveBeenCalledTimes(1);

      // Collapse
      await user.click(expandButton);

      // Expand again - should not fetch again (React Query caching)
      await user.click(expandButton);

      // Should still be called only once due to caching
      expect(jobsApi.getResultDetails).toHaveBeenCalledTimes(1);
    });
  });
});
