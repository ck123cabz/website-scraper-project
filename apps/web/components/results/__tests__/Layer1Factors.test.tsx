import { render, screen } from '@testing-library/react';
import { Layer1Factors } from '../Layer1Factors';
import type { Layer1Factors as Layer1FactorsType } from '@website-scraper/shared';

describe('Layer1Factors Display Component', () => {
  // Mock data for different scenarios
  const mockLayer1FactorsPassed: Layer1FactorsType = {
    tld_type: 'gtld',
    tld_value: '.com',
    domain_classification: 'commercial',
    pattern_matches: ['blog-platform', 'tag-page'],
    target_profile: {
      type: 'B2B software',
      confidence: 0.85,
    },
    reasoning: 'Domain appears to be a commercial B2B software company with high-quality content and professional presentation. TLD is generic top-level domain (.com) which is widely accepted.',
    passed: true,
  };

  const mockLayer1FactorsRejected: Layer1FactorsType = {
    tld_type: 'custom',
    tld_value: '.xyz',
    domain_classification: 'spam',
    pattern_matches: ['affiliate-link', 'url-shortener', 'redirect-page'],
    target_profile: {
      type: 'affiliate marketing',
      confidence: 0.95,
    },
    reasoning: 'Domain shows multiple red flags including custom TLD (.xyz), spam classification, and pattern matches indicating affiliate links and URL shorteners. Not suitable for our target audience.',
    passed: false,
  };

  const mockLayer1FactorsCCTLD: Layer1FactorsType = {
    tld_type: 'cctld',
    tld_value: '.co.uk',
    domain_classification: 'institutional',
    pattern_matches: [],
    target_profile: {
      type: 'educational institution',
      confidence: 0.72,
    },
    reasoning: 'Domain uses country-code TLD (.co.uk) and appears to be an institutional website, likely educational.',
    passed: true,
  };

  const mockLayer1FactorsPersonal: Layer1FactorsType = {
    tld_type: 'gtld',
    tld_value: '.blog',
    domain_classification: 'personal',
    pattern_matches: ['personal-blog'],
    target_profile: {
      type: 'personal blog',
      confidence: 0.65,
    },
    reasoning: 'Personal blog with professional content, using .blog TLD.',
    passed: true,
  };

  describe('Basic Rendering', () => {
    it('should render all Layer 1 factor fields for passed URL', () => {
      render(<Layer1Factors factors={mockLayer1FactorsPassed} />);

      // TLD information
      expect(screen.getByText(/TLD Type/i)).toBeInTheDocument();
      expect(screen.getByText(/gtld/i)).toBeInTheDocument();
      expect(screen.getByText(/TLD Value/i)).toBeInTheDocument();
      expect(screen.getByText('.com')).toBeInTheDocument();

      // Domain classification
      expect(screen.getByText(/Domain Classification/i)).toBeInTheDocument();
      expect(screen.getByText(/commercial/i)).toBeInTheDocument();

      // Pattern matches
      expect(screen.getByText(/Pattern Matches/i)).toBeInTheDocument();
      expect(screen.getByText('blog-platform')).toBeInTheDocument();
      expect(screen.getByText('tag-page')).toBeInTheDocument();

      // Target profile
      expect(screen.getByText(/Target Profile/i)).toBeInTheDocument();
      expect(screen.getByText('B2B software')).toBeInTheDocument();
      expect(screen.getByText(/0\.85/)).toBeInTheDocument();

      // Reasoning
      expect(screen.getByText(/Reasoning/i)).toBeInTheDocument();
      expect(screen.getByText(/Domain appears to be a commercial B2B software company/)).toBeInTheDocument();

      // Status
      expect(screen.getByText(/PASS Layer 1/i)).toBeInTheDocument();
    });

    it('should render all fields for rejected URL', () => {
      render(<Layer1Factors factors={mockLayer1FactorsRejected} />);

      expect(screen.getByText(/custom/i)).toBeInTheDocument();
      expect(screen.getByText('.xyz')).toBeInTheDocument();
      expect(screen.getByText(/spam/i)).toBeInTheDocument();
      expect(screen.getByText('affiliate-link')).toBeInTheDocument();
      expect(screen.getByText('url-shortener')).toBeInTheDocument();
      expect(screen.getByText('redirect-page')).toBeInTheDocument();
      expect(screen.getByText('affiliate marketing')).toBeInTheDocument();
      expect(screen.getByText(/0\.95/)).toBeInTheDocument();
      expect(screen.getByText(/REJECTED at Layer 1/i)).toBeInTheDocument();
    });
  });

  describe('TLD Type Display', () => {
    it('should display gtld TLD type correctly', () => {
      render(<Layer1Factors factors={mockLayer1FactorsPassed} />);
      expect(screen.getByText(/gtld/i)).toBeInTheDocument();
    });

    it('should display cctld TLD type correctly', () => {
      render(<Layer1Factors factors={mockLayer1FactorsCCTLD} />);
      expect(screen.getByText(/cctld/i)).toBeInTheDocument();
    });

    it('should display custom TLD type correctly', () => {
      render(<Layer1Factors factors={mockLayer1FactorsRejected} />);
      expect(screen.getByText(/custom/i)).toBeInTheDocument();
    });

    it('should display various TLD values correctly', () => {
      const { rerender } = render(<Layer1Factors factors={mockLayer1FactorsPassed} />);
      expect(screen.getByText('.com')).toBeInTheDocument();

      rerender(<Layer1Factors factors={mockLayer1FactorsCCTLD} />);
      expect(screen.getByText('.co.uk')).toBeInTheDocument();

      rerender(<Layer1Factors factors={mockLayer1FactorsRejected} />);
      expect(screen.getByText('.xyz')).toBeInTheDocument();
    });
  });

  describe('Domain Classification Display', () => {
    it('should display commercial classification', () => {
      render(<Layer1Factors factors={mockLayer1FactorsPassed} />);
      expect(screen.getByText(/commercial/i)).toBeInTheDocument();
    });

    it('should display spam classification', () => {
      render(<Layer1Factors factors={mockLayer1FactorsRejected} />);
      expect(screen.getByText(/spam/i)).toBeInTheDocument();
    });

    it('should display institutional classification', () => {
      render(<Layer1Factors factors={mockLayer1FactorsCCTLD} />);
      expect(screen.getByText(/institutional/i)).toBeInTheDocument();
    });

    it('should display personal classification', () => {
      render(<Layer1Factors factors={mockLayer1FactorsPersonal} />);
      expect(screen.getByText(/personal/i)).toBeInTheDocument();
    });

    it('should apply color coding to domain classification', () => {
      const { container } = render(<Layer1Factors factors={mockLayer1FactorsPassed} />);

      // Check for color-coded badge/chip (implementation-dependent)
      const commercialBadge = screen.getByText(/commercial/i).closest('span');
      expect(commercialBadge).toBeInTheDocument();
    });
  });

  describe('Pattern Matches Display', () => {
    it('should render multiple pattern matches as separate chips', () => {
      render(<Layer1Factors factors={mockLayer1FactorsPassed} />);

      // Each pattern should be rendered separately
      expect(screen.getByText('blog-platform')).toBeInTheDocument();
      expect(screen.getByText('tag-page')).toBeInTheDocument();
    });

    it('should render three pattern matches correctly', () => {
      render(<Layer1Factors factors={mockLayer1FactorsRejected} />);

      expect(screen.getByText('affiliate-link')).toBeInTheDocument();
      expect(screen.getByText('url-shortener')).toBeInTheDocument();
      expect(screen.getByText('redirect-page')).toBeInTheDocument();
    });

    it('should handle empty pattern_matches array gracefully', () => {
      render(<Layer1Factors factors={mockLayer1FactorsCCTLD} />);

      expect(screen.getByText(/Pattern Matches/i)).toBeInTheDocument();
      // Should show empty state or "None" text
      expect(screen.getByText(/None|No patterns detected/i)).toBeInTheDocument();
    });

    it('should render single pattern match', () => {
      render(<Layer1Factors factors={mockLayer1FactorsPersonal} />);

      expect(screen.getByText('personal-blog')).toBeInTheDocument();
    });
  });

  describe('Target Profile Display', () => {
    it('should show target profile type and confidence score', () => {
      render(<Layer1Factors factors={mockLayer1FactorsPassed} />);

      expect(screen.getByText('B2B software')).toBeInTheDocument();
      expect(screen.getByText(/0\.85/)).toBeInTheDocument();
    });

    it('should display confidence score as decimal (0.0-1.0)', () => {
      render(<Layer1Factors factors={mockLayer1FactorsRejected} />);

      // Should show 0.95 confidence
      expect(screen.getByText(/0\.95/)).toBeInTheDocument();
    });

    it('should display confidence score with percentage or decimal format', () => {
      render(<Layer1Factors factors={mockLayer1FactorsCCTLD} />);

      // Should show 0.72 confidence (could be displayed as 72% or 0.72)
      const confidenceText = screen.getByText(/0\.72|72%/);
      expect(confidenceText).toBeInTheDocument();
    });

    it('should display various target profile types', () => {
      const { rerender } = render(<Layer1Factors factors={mockLayer1FactorsPassed} />);
      expect(screen.getByText('B2B software')).toBeInTheDocument();

      rerender(<Layer1Factors factors={mockLayer1FactorsRejected} />);
      expect(screen.getByText('affiliate marketing')).toBeInTheDocument();

      rerender(<Layer1Factors factors={mockLayer1FactorsCCTLD} />);
      expect(screen.getByText('educational institution')).toBeInTheDocument();

      rerender(<Layer1Factors factors={mockLayer1FactorsPersonal} />);
      expect(screen.getByText('personal blog')).toBeInTheDocument();
    });
  });

  describe('Pass/Fail Status Display', () => {
    it('should display passed=true as green "PASS Layer 1" badge', () => {
      const { container } = render(<Layer1Factors factors={mockLayer1FactorsPassed} />);

      const passBadge = screen.getByText(/PASS Layer 1/i);
      expect(passBadge).toBeInTheDocument();

      // Check for green color class (Tailwind: bg-green-500, bg-green-600, text-green-600, etc.)
      const badgeElement = passBadge.closest('div, span');
      expect(badgeElement).toHaveClass(/green/);
    });

    it('should display passed=false as red "REJECTED at Layer 1" badge', () => {
      const { container } = render(<Layer1Factors factors={mockLayer1FactorsRejected} />);

      const rejectBadge = screen.getByText(/REJECTED at Layer 1/i);
      expect(rejectBadge).toBeInTheDocument();

      // Check for red color class
      const badgeElement = rejectBadge.closest('div, span');
      expect(badgeElement).toHaveClass(/red/);
    });

    it('should visually distinguish pass from fail status', () => {
      const { rerender, container } = render(<Layer1Factors factors={mockLayer1FactorsPassed} />);

      const passText = screen.getByText(/PASS Layer 1/i);
      const passElement = passText.closest('div, span');

      rerender(<Layer1Factors factors={mockLayer1FactorsRejected} />);

      const rejectText = screen.getByText(/REJECTED at Layer 1/i);
      const rejectElement = rejectText.closest('div, span');

      // Elements should have different classes
      expect(passElement?.className).not.toBe(rejectElement?.className);
    });
  });

  describe('Reasoning Display', () => {
    it('should display complete reasoning text for passed URL', () => {
      render(<Layer1Factors factors={mockLayer1FactorsPassed} />);

      expect(screen.getByText(/Domain appears to be a commercial B2B software company/)).toBeInTheDocument();
      expect(screen.getByText(/professional presentation/)).toBeInTheDocument();
    });

    it('should display complete reasoning text for rejected URL', () => {
      render(<Layer1Factors factors={mockLayer1FactorsRejected} />);

      expect(screen.getByText(/Domain shows multiple red flags/)).toBeInTheDocument();
      expect(screen.getByText(/Not suitable for our target audience/)).toBeInTheDocument();
    });

    it('should display reasoning in readable format', () => {
      const { container } = render(<Layer1Factors factors={mockLayer1FactorsPassed} />);

      const reasoningSection = screen.getByText(/Reasoning/i).closest('div');
      expect(reasoningSection).toBeInTheDocument();

      // Reasoning text should be visible and properly formatted
      const reasoningText = screen.getByText(/Domain appears to be a commercial B2B software company/);
      expect(reasoningText).toBeVisible();
    });
  });

  describe('NULL Data Handling', () => {
    it('should handle NULL layer1_factors data gracefully', () => {
      render(<Layer1Factors factors={null} />);

      expect(screen.getByText(/No Layer 1 data/i)).toBeInTheDocument();
    });

    it('should show appropriate message for pre-migration records', () => {
      render(<Layer1Factors factors={null} />);

      // Should show informative message about missing data
      expect(screen.getByText(/No Layer 1 data|Layer 1 analysis not available|Pre-migration record/i)).toBeInTheDocument();
    });

    it('should not render factor fields when data is NULL', () => {
      render(<Layer1Factors factors={null} />);

      expect(screen.queryByText(/TLD Type/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Domain Classification/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Pattern Matches/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Target Profile/i)).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should display loading state when loading prop is true', () => {
      render(<Layer1Factors factors={null} loading={true} />);

      expect(screen.getByText(/Loading|Analyzing/i)).toBeInTheDocument();
    });

    it('should not display data when in loading state', () => {
      render(<Layer1Factors factors={mockLayer1FactorsPassed} loading={true} />);

      // Should show loading, not the actual data
      expect(screen.queryByText('B2B software')).not.toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should display error message when error prop is provided', () => {
      render(<Layer1Factors factors={null} error="Failed to load Layer 1 analysis" />);

      expect(screen.getByText(/Failed to load Layer 1 analysis/i)).toBeInTheDocument();
    });

    it('should not display data when in error state', () => {
      render(<Layer1Factors factors={mockLayer1FactorsPassed} error="Analysis failed" />);

      expect(screen.queryByText('B2B software')).not.toBeInTheDocument();
    });
  });

  describe('Layout and Formatting', () => {
    it('should have organized and readable layout', () => {
      const { container } = render(<Layer1Factors factors={mockLayer1FactorsPassed} />);

      // Component should have structured sections
      expect(container.firstChild).toBeInTheDocument();

      // Should have distinct sections for different factor types
      expect(screen.getByText(/TLD Type/i)).toBeInTheDocument();
      expect(screen.getByText(/Domain Classification/i)).toBeInTheDocument();
      expect(screen.getByText(/Pattern Matches/i)).toBeInTheDocument();
      expect(screen.getByText(/Target Profile/i)).toBeInTheDocument();
      expect(screen.getByText(/Reasoning/i)).toBeInTheDocument();
    });

    it('should be properly formatted and well-organized', () => {
      const { container } = render(<Layer1Factors factors={mockLayer1FactorsPassed} />);

      // Check that component has some structure
      const sections = container.querySelectorAll('div');
      expect(sections.length).toBeGreaterThan(0);
    });
  });

  describe('Responsive Layout', () => {
    it('should render without layout errors', () => {
      const { container } = render(<Layer1Factors factors={mockLayer1FactorsPassed} />);

      // Component should render successfully
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should handle long reasoning text without breaking layout', () => {
      const longReasoningFactors: Layer1FactorsType = {
        ...mockLayer1FactorsPassed,
        reasoning: 'This is a very long reasoning text that should wrap properly without breaking the layout. '.repeat(10),
      };

      const { container } = render(<Layer1Factors factors={longReasoningFactors} />);

      expect(container.firstChild).toBeInTheDocument();
      expect(screen.getByText(/This is a very long reasoning text/)).toBeInTheDocument();
    });

    it('should handle many pattern matches without breaking layout', () => {
      const manyPatternsFactors: Layer1FactorsType = {
        ...mockLayer1FactorsPassed,
        pattern_matches: [
          'pattern-1',
          'pattern-2',
          'pattern-3',
          'pattern-4',
          'pattern-5',
          'pattern-6',
          'pattern-7',
          'pattern-8',
        ],
      };

      render(<Layer1Factors factors={manyPatternsFactors} />);

      expect(screen.getByText('pattern-1')).toBeInTheDocument();
      expect(screen.getByText('pattern-8')).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    it('should accept factors prop with correct type', () => {
      // TypeScript compilation will fail if prop types are incorrect
      render(<Layer1Factors factors={mockLayer1FactorsPassed} />);
      expect(screen.getByText(/B2B software/)).toBeInTheDocument();
    });

    it('should accept optional loading and error props', () => {
      render(
        <Layer1Factors
          factors={mockLayer1FactorsPassed}
          loading={false}
          error={undefined}
        />
      );
      expect(screen.getByText(/B2B software/)).toBeInTheDocument();
    });
  });
});
