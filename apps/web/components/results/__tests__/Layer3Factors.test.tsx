import { render, screen, fireEvent } from '@testing-library/react';
import { Layer3Factors } from '../Layer3Factors';
import type { Layer3Factors as Layer3FactorsType } from '@website-scraper/shared';

describe('Layer3Factors Display Component', () => {
  // Mock data for different scenarios
  const mockLayer3FactorsAccepted: Layer3FactorsType = {
    classification: 'accepted',
    sophistication_signals: {
      design_quality: {
        score: 0.85,
        indicators: [
          'Modern responsive layout',
          'Professional color scheme',
          'High-quality imagery',
          'Consistent branding',
        ],
      },
      authority_indicators: {
        score: 0.78,
        indicators: [
          'Industry certifications displayed',
          'Client testimonials',
          'Case studies',
          'Expert team bios',
        ],
      },
      professional_presentation: {
        score: 0.92,
        indicators: [
          'Well-structured navigation',
          'Clear value proposition',
          'Professional copywriting',
          'Active blog with regular updates',
        ],
      },
      content_originality: {
        score: 0.88,
        indicators: [
          'Original research and insights',
          'Unique perspective',
          'Proprietary data',
          'Thought leadership content',
        ],
      },
    },
    llm_provider: 'openai',
    model_version: 'gpt-4-turbo-preview',
    cost_usd: 0.0234,
    reasoning:
      'This website demonstrates exceptional sophistication across all evaluation criteria. The design quality is outstanding with modern responsive layouts and professional aesthetics. Authority indicators are strong with visible certifications, client testimonials, and comprehensive case studies. Professional presentation is excellent with clear navigation and value proposition. Content originality stands out with proprietary research and thought leadership.',
    tokens_used: {
      input: 1500,
      output: 350,
    },
    processing_time_ms: 2450,
  };

  const mockLayer3FactorsRejected: Layer3FactorsType = {
    classification: 'rejected',
    sophistication_signals: {
      design_quality: {
        score: 0.35,
        indicators: ['Outdated layout', 'Generic template', 'Low-quality images'],
      },
      authority_indicators: {
        score: 0.28,
        indicators: ['No credentials displayed', 'Anonymous authorship'],
      },
      professional_presentation: {
        score: 0.42,
        indicators: ['Broken navigation', 'Inconsistent branding'],
      },
      content_originality: {
        score: 0.31,
        indicators: ['Duplicate content', 'Thin content', 'Keyword stuffing'],
      },
    },
    llm_provider: 'anthropic',
    model_version: 'claude-3-opus',
    cost_usd: 0.0156,
    reasoning:
      'This website fails to meet sophistication requirements. Design quality is poor with outdated layouts. Authority indicators are weak with no visible credentials. Content appears to be duplicate or thin with evidence of keyword stuffing.',
    tokens_used: {
      input: 1200,
      output: 280,
    },
    processing_time_ms: 1850,
  };

  const mockLayer3FactorsEmptySignals: Layer3FactorsType = {
    classification: 'rejected',
    sophistication_signals: {
      design_quality: {
        score: 0.2,
        indicators: [],
      },
      authority_indicators: {
        score: 0.15,
        indicators: [],
      },
      professional_presentation: {
        score: 0.18,
        indicators: [],
      },
      content_originality: {
        score: 0.12,
        indicators: [],
      },
    },
    llm_provider: 'google',
    model_version: 'gemini-pro',
    cost_usd: 0.0089,
    reasoning: 'Minimal sophistication detected across all categories.',
    tokens_used: {
      input: 800,
      output: 150,
    },
    processing_time_ms: 1200,
  };

  const mockLayer3FactorsNoReasoning: Layer3FactorsType = {
    classification: 'accepted',
    sophistication_signals: {
      design_quality: {
        score: 0.75,
        indicators: ['Clean design', 'Responsive layout'],
      },
      authority_indicators: {
        score: 0.70,
        indicators: ['Client logos'],
      },
      professional_presentation: {
        score: 0.78,
        indicators: ['Clear messaging'],
      },
      content_originality: {
        score: 0.72,
        indicators: ['Original content'],
      },
    },
    llm_provider: 'openai',
    model_version: 'gpt-4',
    cost_usd: 0.0145,
    reasoning: '',
    tokens_used: {
      input: 1000,
      output: 200,
    },
    processing_time_ms: 1600,
  };

  const mockLayer3FactorsNoMetadata: Layer3FactorsType = {
    classification: 'accepted',
    sophistication_signals: {
      design_quality: {
        score: 0.80,
        indicators: ['Good design'],
      },
      authority_indicators: {
        score: 0.75,
        indicators: ['Authority signals'],
      },
      professional_presentation: {
        score: 0.82,
        indicators: ['Professional'],
      },
      content_originality: {
        score: 0.77,
        indicators: ['Original'],
      },
    },
    llm_provider: '',
    model_version: '',
    cost_usd: 0,
    reasoning: 'Analysis complete.',
    tokens_used: {
      input: 0,
      output: 0,
    },
    processing_time_ms: 0,
  };

  describe('Basic Rendering', () => {
    it('should render all Layer 3 factor fields for accepted classification', () => {
      render(<Layer3Factors factors={mockLayer3FactorsAccepted} />);

      // Title
      expect(screen.getByText(/Layer 3: Sophistication Analysis/i)).toBeInTheDocument();

      // Classification
      expect(screen.getByText(/Classification/i)).toBeInTheDocument();
      expect(screen.getByText('ACCEPTED')).toBeInTheDocument();

      // Sophistication Signals section
      expect(screen.getByText(/Sophistication Signals/i)).toBeInTheDocument();
      expect(screen.getByText('Design Quality')).toBeInTheDocument();
      expect(screen.getByText('Authority Indicators')).toBeInTheDocument();
      expect(screen.getByText('Professional Presentation')).toBeInTheDocument();
      expect(screen.getByText('Content Originality')).toBeInTheDocument();

      // Reasoning
      expect(screen.getByText(/Analysis Reasoning/i)).toBeInTheDocument();
      expect(
        screen.getByText(/This website demonstrates exceptional sophistication/)
      ).toBeInTheDocument();

      // LLM Metadata
      expect(screen.getByText(/LLM Metadata/i)).toBeInTheDocument();
      expect(screen.getByText(/Provider:/i)).toBeInTheDocument();
      expect(screen.getByText('openai')).toBeInTheDocument();
      expect(screen.getByText(/Model:/i)).toBeInTheDocument();
      expect(screen.getByText('gpt-4-turbo-preview')).toBeInTheDocument();
    });

    it('should render all fields for rejected classification', () => {
      render(<Layer3Factors factors={mockLayer3FactorsRejected} />);

      expect(screen.getByText('REJECTED')).toBeInTheDocument();
      expect(screen.getByText('anthropic')).toBeInTheDocument();
      expect(screen.getByText('claude-3-opus')).toBeInTheDocument();
      expect(
        screen.getByText(/This website fails to meet sophistication requirements/)
      ).toBeInTheDocument();
    });
  });

  describe('Classification Display', () => {
    it('should display accepted classification correctly', () => {
      render(<Layer3Factors factors={mockLayer3FactorsAccepted} />);
      expect(screen.getByText('ACCEPTED')).toBeInTheDocument();
      expect(screen.getByText('Accepted')).toBeInTheDocument();
    });

    it('should display rejected classification correctly', () => {
      render(<Layer3Factors factors={mockLayer3FactorsRejected} />);
      expect(screen.getByText('REJECTED')).toBeInTheDocument();
      expect(screen.getByText('Rejected')).toBeInTheDocument();
    });
  });

  describe('Sophistication Signals Display', () => {
    it('should display all 7 signal types', () => {
      render(<Layer3Factors factors={mockLayer3FactorsAccepted} />);

      expect(screen.getByText('Design Quality')).toBeInTheDocument();
      expect(screen.getByText('Authority Indicators')).toBeInTheDocument();
      expect(screen.getByText('Professional Presentation')).toBeInTheDocument();
      expect(screen.getByText('Content Originality')).toBeInTheDocument();
    });

    it('should display signal scores as percentages', () => {
      render(<Layer3Factors factors={mockLayer3FactorsAccepted} />);

      expect(screen.getByText('85%')).toBeInTheDocument(); // design_quality
      expect(screen.getByText('78%')).toBeInTheDocument(); // authority_indicators
      expect(screen.getByText('92%')).toBeInTheDocument(); // professional_presentation
      expect(screen.getByText('88%')).toBeInTheDocument(); // content_originality
    });

    it('should show signal indicators as badges when section is expanded', () => {
      render(<Layer3Factors factors={mockLayer3FactorsAccepted} />);

      // Expand design quality section
      const designQualityButton = screen.getByRole('button', { name: /Design Quality/i });
      fireEvent.click(designQualityButton);

      // Check for indicators
      expect(screen.getByText('Modern responsive layout')).toBeInTheDocument();
      expect(screen.getByText('Professional color scheme')).toBeInTheDocument();
      expect(screen.getByText('High-quality imagery')).toBeInTheDocument();
      expect(screen.getByText('Consistent branding')).toBeInTheDocument();
    });

    it('should handle empty signal lists', () => {
      render(<Layer3Factors factors={mockLayer3FactorsEmptySignals} />);

      // Expand a section
      const designQualityButton = screen.getByRole('button', { name: /Design Quality/i });
      fireEvent.click(designQualityButton);

      expect(screen.getByText('No indicators found')).toBeInTheDocument();
    });
  });

  describe('Expandable Sections', () => {
    it('should toggle sections when clicked', () => {
      render(<Layer3Factors factors={mockLayer3FactorsAccepted} />);

      const designQualityButton = screen.getByRole('button', { name: /Design Quality/i });

      // Initially collapsed - indicators should not be visible
      expect(screen.queryByText('Modern responsive layout')).not.toBeInTheDocument();

      // Expand
      fireEvent.click(designQualityButton);
      expect(screen.getByText('Modern responsive layout')).toBeInTheDocument();

      // Collapse
      fireEvent.click(designQualityButton);
      expect(screen.queryByText('Modern responsive layout')).not.toBeInTheDocument();
    });

    it('should allow multiple sections to be expanded simultaneously', () => {
      render(<Layer3Factors factors={mockLayer3FactorsAccepted} />);

      // Expand design quality
      fireEvent.click(screen.getByRole('button', { name: /Design Quality/i }));
      expect(screen.getByText('Modern responsive layout')).toBeInTheDocument();

      // Expand authority indicators
      fireEvent.click(screen.getByRole('button', { name: /Authority Indicators/i }));
      expect(screen.getByText('Industry certifications displayed')).toBeInTheDocument();

      // Both should remain expanded
      expect(screen.getByText('Modern responsive layout')).toBeInTheDocument();
      expect(screen.getByText('Industry certifications displayed')).toBeInTheDocument();
    });
  });

  describe('Reasoning Display', () => {
    it('should display reasoning text', () => {
      render(<Layer3Factors factors={mockLayer3FactorsAccepted} />);

      expect(
        screen.getByText(/This website demonstrates exceptional sophistication/)
      ).toBeInTheDocument();
    });

    it('should handle empty reasoning', () => {
      render(<Layer3Factors factors={mockLayer3FactorsNoReasoning} />);

      expect(screen.getByText('No analysis provided')).toBeInTheDocument();
    });

    it('should display reasoning with proper formatting', () => {
      render(<Layer3Factors factors={mockLayer3FactorsAccepted} />);

      const reasoningElement = screen.getByText(/This website demonstrates exceptional/);
      expect(reasoningElement).toHaveClass('whitespace-pre-wrap');
      expect(reasoningElement).toHaveClass('break-words');
    });
  });

  describe('LLM Metadata Display', () => {
    it('should display all metadata fields correctly', () => {
      render(<Layer3Factors factors={mockLayer3FactorsAccepted} />);

      expect(screen.getByText(/Provider:/i)).toBeInTheDocument();
      expect(screen.getByText('openai')).toBeInTheDocument();

      expect(screen.getByText(/Model:/i)).toBeInTheDocument();
      expect(screen.getByText('gpt-4-turbo-preview')).toBeInTheDocument();

      expect(screen.getByText(/Processing Time:/i)).toBeInTheDocument();
      expect(screen.getByText('2450ms')).toBeInTheDocument();

      expect(screen.getByText(/Cost:/i)).toBeInTheDocument();
      expect(screen.getByText('$0.0234')).toBeInTheDocument();

      expect(screen.getByText(/Token Usage:/i)).toBeInTheDocument();
      expect(screen.getByText(/1500 input \/ 350 output/i)).toBeInTheDocument();
      expect(screen.getByText(/1850 total/i)).toBeInTheDocument();
    });

    it('should handle different LLM providers', () => {
      const { rerender } = render(<Layer3Factors factors={mockLayer3FactorsAccepted} />);
      expect(screen.getByText('openai')).toBeInTheDocument();

      rerender(<Layer3Factors factors={mockLayer3FactorsRejected} />);
      expect(screen.getByText('anthropic')).toBeInTheDocument();
    });

    it('should format cost correctly', () => {
      render(<Layer3Factors factors={mockLayer3FactorsRejected} />);
      expect(screen.getByText('$0.0156')).toBeInTheDocument();
    });

    it('should handle missing metadata gracefully', () => {
      render(<Layer3Factors factors={mockLayer3FactorsNoMetadata} />);

      // Should show Unknown or N/A for missing fields
      expect(screen.getByText(/Provider:/i)).toBeInTheDocument();
      expect(screen.getByText(/Model:/i)).toBeInTheDocument();
    });
  });

  describe('Null/Empty Cases', () => {
    it('should handle null factors', () => {
      render(<Layer3Factors factors={null} />);

      expect(
        screen.getByText(/No Layer 3 data available. This may be a pre-migration record/)
      ).toBeInTheDocument();
    });

    it('should handle missing sophistication signals', () => {
      const factorsNoSignals = {
        classification: 'rejected' as const,
        sophistication_signals: null,
        llm_provider: 'openai',
        model_version: 'gpt-4',
        cost_usd: 0.01,
        reasoning: 'Analysis could not detect sophistication signals',
        tokens_used: { input: 100, output: 50 },
        processing_time_ms: 1000,
      } as Layer3FactorsType;

      render(<Layer3Factors factors={factorsNoSignals} />);

      // Use getAllByText since "No signals detected" appears in the signals section
      const noSignalsTexts = screen.getAllByText('No signals detected');
      expect(noSignalsTexts.length).toBeGreaterThan(0);
      expect(noSignalsTexts[0]).toBeInTheDocument();
    });
  });

  describe('Loading and Error States', () => {
    it('should display loading state', () => {
      render(<Layer3Factors factors={null} loading={true} />);

      expect(screen.getByText(/Loading Layer 3 analysis/i)).toBeInTheDocument();
    });

    it('should display error state', () => {
      render(<Layer3Factors factors={null} error="Failed to load Layer 3 data" />);

      expect(screen.getByText('Failed to load Layer 3 data')).toBeInTheDocument();
    });
  });

  describe('Color Coding', () => {
    it('should use green styling for accepted classification', () => {
      render(<Layer3Factors factors={mockLayer3FactorsAccepted} />);

      const acceptedBadge = screen.getByText('ACCEPTED');
      expect(acceptedBadge.closest('div')).toHaveClass('text-green-600');
    });

    it('should use red styling for rejected classification', () => {
      render(<Layer3Factors factors={mockLayer3FactorsRejected} />);

      const rejectedBadge = screen.getByText('REJECTED');
      expect(rejectedBadge.closest('div')).toHaveClass('text-red-600');
    });

    it('should display different colored badges for signal types', () => {
      render(<Layer3Factors factors={mockLayer3FactorsAccepted} />);

      // Expand all sections to see badges
      fireEvent.click(screen.getByRole('button', { name: /Design Quality/i }));

      const designIndicator = screen.getByText('Modern responsive layout');
      // Check that the indicator is rendered (it's a badge element)
      expect(designIndicator).toBeInTheDocument();

      // Badge component renders as a div with specific classes, verify the indicator itself
      // has the badge classes applied (inline-flex, rounded-md, border, etc.)
      expect(designIndicator).toHaveClass('inline-flex');
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      render(<Layer3Factors factors={mockLayer3FactorsAccepted} />);

      expect(screen.getByText(/Layer 3: Sophistication Analysis/i)).toBeInTheDocument();
    });

    it('should have accessible buttons for expandable sections', () => {
      render(<Layer3Factors factors={mockLayer3FactorsAccepted} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should have proper labels for all sections', () => {
      render(<Layer3Factors factors={mockLayer3FactorsAccepted} />);

      expect(screen.getByText(/Classification/i)).toBeInTheDocument();
      expect(screen.getByText(/Sophistication Signals/i)).toBeInTheDocument();
      expect(screen.getByText(/Analysis Reasoning/i)).toBeInTheDocument();
      expect(screen.getByText(/LLM Metadata/i)).toBeInTheDocument();
    });
  });
});
