/**
 * T116: Expandable Row Performance Test
 *
 * Success Criteria SC-006: Factor breakdown loads in <500ms
 *
 * Tests:
 * 1. Load factor breakdown in <500ms when expanding row (100 rows page)
 * 2. Render FactorBreakdown component in <300ms
 * 3. Handle NULL factors from pre-migration data
 * 4. Test with complex Layer3 factors (large objects)
 */

import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResultsTable } from '@/components/results/ResultsTable';
import { FactorBreakdown } from '@/components/results/FactorBreakdown';
import { Layer1Factors } from '@/components/results/Layer1Factors';
import { Layer2Factors } from '@/components/results/Layer2Factors';
import { Layer3Factors } from '@/components/results/Layer3Factors';
import { resultsApi } from '@/lib/api-client';
import { buildMockResults, buildMockResult, createPerformanceQueryWrapper } from './perf-test-helpers';
import type { UrlResult, Layer1Factors as Layer1FactorsType, Layer2Factors as Layer2FactorsType, Layer3Factors as Layer3FactorsType } from '@website-scraper/shared';

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

  /**
   * Test 1: Load factor breakdown in <500ms when expanding row
   * - Load results page with 100 rows
   * - Click expand button
   * - Measure time from click to FactorBreakdown fully rendered
   */
  it('loads factor breakdown in under 500ms with 100 rows', async () => {
    mockedResultsApi.getJobResults.mockResolvedValue({
      data: buildMockResults(100),
      pagination: {
        page: 1,
        limit: 100,
        total: 100,
        totalPages: 1,
      },
    });

    const Wrapper = createPerformanceQueryWrapper();
    const user = userEvent.setup();

    render(<ResultsTable jobId="job-123" jobName="Expand Perf" pageSize={100} />, {
      wrapper: Wrapper,
    });

    // Wait for table to load
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Expand' }).length).toBeGreaterThan(0);
    });

    const expandButton = screen.getAllByRole('button', { name: 'Expand' })[0];

    // Measure expansion performance
    const start = performance.now();
    await user.click(expandButton);

    await waitFor(() => {
      expect(screen.getByTestId('factor-breakdown')).toBeInTheDocument();
    });

    const durationMs = performance.now() - start;
    expect(durationMs).toBeLessThan(500);
  });

  /**
   * Test 2: Render FactorBreakdown component in <300ms
   * - Test Layer1FactorCard, Layer2FactorCard, Layer3FactorCard rendering
   */
  describe('individual layer component rendering performance', () => {
    it('renders Layer1Factors component in under 300ms', () => {
      const mockLayer1: Layer1FactorsType = {
        tld_type: 'gtld',
        tld_value: '.com',
        domain_classification: 'commercial',
        pattern_matches: ['keyword', 'pattern', 'match'],
        target_profile: {
          type: 'B2B software',
          confidence: 0.92,
        },
        reasoning: 'This domain shows clear B2B software characteristics with enterprise-focused content.',
        passed: true,
      };

      const start = performance.now();

      render(<Layer1Factors factors={mockLayer1} />);

      const durationMs = performance.now() - start;
      expect(durationMs).toBeLessThan(300);
    });

    it('renders Layer2Factors component in under 300ms', () => {
      const mockLayer2: Layer2FactorsType = {
        publication_score: 0.78,
        module_scores: {
          product_offering: 0.8,
          layout_quality: 0.75,
          navigation_complexity: 0.7,
          monetization_indicators: 0.65,
        },
        keywords_found: ['pricing', 'enterprise', 'solution', 'platform'],
        ad_networks_detected: [],
        content_signals: {
          has_blog: true,
          has_press_releases: true,
          has_whitepapers: true,
          has_case_studies: true,
        },
        reasoning: 'Strong publication signals with comprehensive content offering.',
        passed: true,
      };

      const start = performance.now();

      render(<Layer2Factors factors={mockLayer2} />);

      const durationMs = performance.now() - start;
      expect(durationMs).toBeLessThan(300);
    });

    it('renders Layer3Factors component in under 300ms', () => {
      const mockLayer3: Layer3FactorsType = {
        classification: 'accepted',
        sophistication_signals: {
          design_quality: { score: 0.85, indicators: ['Modern UI', 'Responsive design', 'Professional branding'] },
          authority_indicators: { score: 0.8, indicators: ['Industry awards', 'Media mentions', 'Customer testimonials'] },
          professional_presentation: { score: 0.82, indicators: ['Consistent style guide', 'High-quality imagery', 'Clear messaging'] },
          content_originality: { score: 0.79, indicators: ['Original research', 'Expert insights', 'Unique perspective'] },
        },
        llm_provider: 'openai',
        model_version: 'gpt-4.1-mini',
        cost_usd: 0.05,
        reasoning: 'Comprehensive analysis showing strong sophistication across all dimensions.',
        tokens_used: { input: 900, output: 300 },
        processing_time_ms: 2200,
      };

      const start = performance.now();

      render(<Layer3Factors factors={mockLayer3} />);

      const durationMs = performance.now() - start;
      expect(durationMs).toBeLessThan(300);
    });

    it('renders complete FactorBreakdown with all layers in under 300ms', () => {
      const mockLayer1: Layer1FactorsType = {
        tld_type: 'gtld',
        tld_value: '.com',
        domain_classification: 'commercial',
        pattern_matches: ['keyword'],
        target_profile: { type: 'B2B software', confidence: 0.92 },
        reasoning: 'Test reasoning',
        passed: true,
      };

      const mockLayer2: Layer2FactorsType = {
        publication_score: 0.78,
        module_scores: {
          product_offering: 0.8,
          layout_quality: 0.75,
          navigation_complexity: 0.7,
          monetization_indicators: 0.65,
        },
        keywords_found: ['pricing'],
        ad_networks_detected: [],
        content_signals: {
          has_blog: true,
          has_press_releases: true,
          has_whitepapers: true,
          has_case_studies: true,
        },
        reasoning: 'Test reasoning',
        passed: true,
      };

      const mockLayer3: Layer3FactorsType = {
        classification: 'accepted',
        sophistication_signals: {
          design_quality: { score: 0.85, indicators: ['Modern UI'] },
          authority_indicators: { score: 0.8, indicators: ['Awards'] },
          professional_presentation: { score: 0.82, indicators: ['Style guide'] },
          content_originality: { score: 0.79, indicators: ['Research'] },
        },
        llm_provider: 'openai',
        model_version: 'gpt-4.1-mini',
        cost_usd: 0.05,
        reasoning: 'Test reasoning',
        tokens_used: { input: 900, output: 300 },
        processing_time_ms: 2200,
      };

      const start = performance.now();

      render(
        <FactorBreakdown
          layer1={mockLayer1}
          layer2={mockLayer2}
          layer3={mockLayer3}
        />
      );

      const durationMs = performance.now() - start;
      expect(durationMs).toBeLessThan(300);
    });
  });

  /**
   * Test 3: Handle NULL factors from pre-migration data
   * - Create result with NULL layer1_factors/layer2_factors
   * - Expand row
   * - Measure render time and verify no errors
   */
  it('handles NULL factors gracefully in under 500ms', async () => {
    const mockResultWithNullFactors: UrlResult = {
      ...buildMockResult(0),
      layer1_factors: null,
      layer2_factors: null,
      layer3_factors: null,
    };

    mockedResultsApi.getJobResults.mockResolvedValue({
      data: [mockResultWithNullFactors],
      pagination: {
        page: 1,
        limit: 50,
        total: 1,
        totalPages: 1,
      },
    });

    const Wrapper = createPerformanceQueryWrapper();
    const user = userEvent.setup();

    render(<ResultsTable jobId="job-123" jobName="Null Factors Test" pageSize={50} />, {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Expand' }).length).toBeGreaterThan(0);
    });

    const expandButton = screen.getAllByRole('button', { name: 'Expand' })[0];

    const start = performance.now();
    await user.click(expandButton);

    // Should show graceful fallback message
    await waitFor(() => {
      expect(screen.getByText(/Factor data not available for this URL/i)).toBeInTheDocument();
    });

    const durationMs = performance.now() - start;
    expect(durationMs).toBeLessThan(500);
  });

  it('renders FactorBreakdown with NULL factors showing fallback message', () => {
    const start = performance.now();

    const { getByText } = render(
      <FactorBreakdown
        layer1={null}
        layer2={null}
        layer3={null}
      />
    );

    const durationMs = performance.now() - start;

    expect(getByText(/Factor data not available for this URL/i)).toBeInTheDocument();
    expect(getByText(/processed before the analysis system was upgraded/i)).toBeInTheDocument();
    expect(durationMs).toBeLessThan(300);
  });

  /**
   * Test 4: Test with complex Layer3 factors (large objects)
   * - Use realistic full Layer3 sophistication signals
   * - Assert: <500ms even with large payload
   */
  it('handles complex Layer3 factors with large indicators in under 500ms', async () => {
    const complexLayer3: Layer3FactorsType = {
      classification: 'accepted',
      sophistication_signals: {
        design_quality: {
          score: 0.92,
          indicators: [
            'Modern responsive design with mobile-first approach',
            'Sophisticated CSS animations and transitions',
            'High-quality visual hierarchy and typography',
            'Professional color palette with consistent branding',
            'Advanced layout techniques including CSS Grid and Flexbox',
            'Optimized images with lazy loading',
            'Accessibility features including ARIA labels',
            'Dark mode support with theme switching',
            'Microinteractions enhancing user experience',
            'Custom iconography and illustration system'
          ]
        },
        authority_indicators: {
          score: 0.88,
          indicators: [
            'Featured in major tech publications (TechCrunch, Forbes)',
            'Industry awards: Best B2B Software 2024',
            'Partnership with Fortune 500 companies',
            'Speaking engagements at major conferences',
            'Patent portfolio demonstrating innovation',
            'Academic citations and research collaborations',
            'Verified social media presence with high engagement',
            'Security certifications (SOC 2, ISO 27001)',
            'Leadership team from recognized companies',
            'Customer testimonials from enterprise clients'
          ]
        },
        professional_presentation: {
          score: 0.91,
          indicators: [
            'Comprehensive brand style guide implementation',
            'Professional photography and videography',
            'Consistent messaging across all pages',
            'Well-structured information architecture',
            'Clear value proposition and positioning',
            'Professional copywriting with no errors',
            'Detailed product documentation',
            'Case studies with measurable outcomes',
            'Interactive demos and product tours',
            'Professional email templates and communications'
          ]
        },
        content_originality: {
          score: 0.87,
          indicators: [
            'Original research reports with unique data insights',
            'Industry whitepapers with novel frameworks',
            'Expert blog content from domain specialists',
            'Proprietary methodology and best practices',
            'Unique perspective on industry trends',
            'Custom-created infographics and data visualizations',
            'Interview series with industry leaders',
            'Educational webinars and workshop content',
            'Open-source contributions and technical documentation',
            'Thought leadership content with strategic insights'
          ]
        },
      },
      llm_provider: 'openai',
      model_version: 'gpt-4-turbo-preview-2024-01-25',
      cost_usd: 0.089,
      reasoning: `This URL demonstrates exceptional sophistication across all analyzed dimensions.

Design Quality (92%): The site exhibits modern web design practices with responsive layouts, advanced CSS techniques, and thoughtful user experience considerations. Notable features include smooth animations, consistent visual hierarchy, and accessibility compliance.

Authority Indicators (88%): Strong signals of industry recognition through media coverage, awards, and partnerships. The company has established credibility through certifications, patents, and enterprise customer relationships.

Professional Presentation (91%): Extremely well-executed brand identity with consistent messaging, high-quality media assets, and comprehensive documentation. The site demonstrates significant investment in professional content creation and maintains high standards across all touchpoints.

Content Originality (87%): Significant original content creation including proprietary research, unique frameworks, and thought leadership. The company contributes meaningfully to industry discourse through various content formats and demonstrates deep domain expertise.

Overall Assessment: This is a highly sophisticated B2B software platform with clear enterprise positioning, strong market presence, and professional execution across all dimensions. The level of investment and attention to detail suggests a mature company with substantial resources dedicated to brand and content quality.`,
      tokens_used: { input: 2450, output: 850 },
      processing_time_ms: 4200,
    };

    const mockResultWithComplexLayer3: UrlResult = {
      ...buildMockResult(0),
      layer3_factors: complexLayer3,
    };

    mockedResultsApi.getJobResults.mockResolvedValue({
      data: [mockResultWithComplexLayer3],
      pagination: {
        page: 1,
        limit: 50,
        total: 1,
        totalPages: 1,
      },
    });

    const Wrapper = createPerformanceQueryWrapper();
    const user = userEvent.setup();

    render(<ResultsTable jobId="job-123" jobName="Complex Layer3 Test" pageSize={50} />, {
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
      expect(screen.getByText('Layer 3: Sophistication Analysis')).toBeInTheDocument();
    });

    const durationMs = performance.now() - start;
    expect(durationMs).toBeLessThan(500);
  });

  it('renders Layer3Factors directly with complex indicators in under 300ms', () => {
    const complexLayer3: Layer3FactorsType = {
      classification: 'accepted',
      sophistication_signals: {
        design_quality: {
          score: 0.92,
          indicators: Array.from({ length: 15 }, (_, i) => `Design indicator ${i + 1}: Very detailed description of the design quality aspect being evaluated`)
        },
        authority_indicators: {
          score: 0.88,
          indicators: Array.from({ length: 15 }, (_, i) => `Authority indicator ${i + 1}: Comprehensive explanation of authority signals`)
        },
        professional_presentation: {
          score: 0.91,
          indicators: Array.from({ length: 15 }, (_, i) => `Presentation indicator ${i + 1}: Detailed professional presentation metrics`)
        },
        content_originality: {
          score: 0.87,
          indicators: Array.from({ length: 15 }, (_, i) => `Originality indicator ${i + 1}: In-depth content originality assessment`)
        },
      },
      llm_provider: 'openai',
      model_version: 'gpt-4-turbo-preview-2024-01-25',
      cost_usd: 0.089,
      reasoning: 'A'.repeat(4000), // 4000 character reasoning
      tokens_used: { input: 2450, output: 850 },
      processing_time_ms: 4200,
    };

    const start = performance.now();

    render(<Layer3Factors factors={complexLayer3} />);

    const durationMs = performance.now() - start;
    expect(durationMs).toBeLessThan(300);
  });
});
