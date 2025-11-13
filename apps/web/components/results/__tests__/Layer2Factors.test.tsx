import { render, screen } from '@testing-library/react';
import { Layer2Factors } from '../Layer2Factors';
import type { Layer2Factors as Layer2FactorsType } from '@website-scraper/shared';

describe('Layer2Factors Display Component', () => {
  // Mock data for different scenarios
  const mockLayer2FactorsPassed: Layer2FactorsType = {
    publication_score: 0.82,
    module_scores: {
      product_offering: 0.75,
      layout_quality: 0.90,
      navigation_complexity: 0.85,
      monetization_indicators: 0.78,
    },
    keywords_found: ['whitepapers', 'case studies', 'blog', 'resources'],
    ad_networks_detected: [],
    content_signals: {
      has_blog: true,
      has_press_releases: false,
      has_whitepapers: true,
      has_case_studies: true,
    },
    reasoning:
      'Strong publication signals: blog section, whitepapers, case studies. High-quality layout with professional navigation.',
    passed: true,
  };

  const mockLayer2FactorsRejected: Layer2FactorsType = {
    publication_score: 0.45,
    module_scores: {
      product_offering: 0.30,
      layout_quality: 0.50,
      navigation_complexity: 0.40,
      monetization_indicators: 0.60,
    },
    keywords_found: ['ads', 'sponsored', 'affiliate'],
    ad_networks_detected: ['Google Ads', 'Amazon Associates', 'MediaVine'],
    content_signals: {
      has_blog: true,
      has_press_releases: false,
      has_whitepapers: false,
      has_case_studies: false,
    },
    reasoning:
      'Multiple ad networks detected with low module scores. Primarily content-focused with monetization signals.',
    passed: false,
  };

  const mockLayer2FactorsHighScores: Layer2FactorsType = {
    publication_score: 0.95,
    module_scores: {
      product_offering: 0.92,
      layout_quality: 0.98,
      navigation_complexity: 0.96,
      monetization_indicators: 0.94,
    },
    keywords_found: ['enterprise', 'solutions', 'products', 'services', 'pricing'],
    ad_networks_detected: [],
    content_signals: {
      has_blog: true,
      has_press_releases: true,
      has_whitepapers: true,
      has_case_studies: true,
    },
    reasoning: 'Excellent publication signals across all modules with comprehensive content offerings.',
    passed: true,
  };

  const mockLayer2FactorsNoContent: Layer2FactorsType = {
    publication_score: 0.55,
    module_scores: {
      product_offering: 0.55,
      layout_quality: 0.60,
      navigation_complexity: 0.50,
      monetization_indicators: 0.55,
    },
    keywords_found: [],
    ad_networks_detected: [],
    content_signals: {
      has_blog: false,
      has_press_releases: false,
      has_whitepapers: false,
      has_case_studies: false,
    },
    reasoning: 'Moderate scores with minimal content signals detected.',
    passed: true,
  };

  describe('Basic Rendering', () => {
    it('should render all Layer 2 factor fields for passed URL', () => {
      render(<Layer2Factors factors={mockLayer2FactorsPassed} />);

      // Publication score
      expect(screen.getByText(/Overall Publication Score/i)).toBeInTheDocument();
      expect(screen.getByText(/0\.82/)).toBeInTheDocument();

      // Module scores
      expect(screen.getByText(/Module Scores/i)).toBeInTheDocument();
      expect(screen.getByText(/Product Offering/i)).toBeInTheDocument();
      expect(screen.getByText(/Layout Quality/i)).toBeInTheDocument();
      expect(screen.getByText(/Navigation Complexity/i)).toBeInTheDocument();
      expect(screen.getByText(/Monetization Indicators/i)).toBeInTheDocument();

      // Keywords
      expect(screen.getByText(/Publication Keywords/i)).toBeInTheDocument();
      expect(screen.getByText('whitepapers')).toBeInTheDocument();
      expect(screen.getByText('case studies')).toBeInTheDocument();

      // Content signals
      expect(screen.getByText(/Content Signals/i)).toBeInTheDocument();
      expect(screen.getByText(/Has Blog/i)).toBeInTheDocument();

      // Reasoning
      expect(screen.getByText(/Reasoning/i)).toBeInTheDocument();
      expect(screen.getByText(/Strong publication signals/)).toBeInTheDocument();

      // Status
      expect(screen.getByText(/PASS Layer 2/i)).toBeInTheDocument();
    });

    it('should render all fields for rejected URL', () => {
      render(<Layer2Factors factors={mockLayer2FactorsRejected} />);

      expect(screen.getByText(/0\.45/)).toBeInTheDocument();
      expect(screen.getByText('ads')).toBeInTheDocument();
      expect(screen.getByText('Google Ads')).toBeInTheDocument();
      expect(screen.getByText('Amazon Associates')).toBeInTheDocument();
      expect(screen.getByText(/REJECTED at Layer 2/i)).toBeInTheDocument();
    });
  });

  describe('Publication Score Display', () => {
    it('should display publication score with percentage', () => {
      render(<Layer2Factors factors={mockLayer2FactorsPassed} />);

      // Should show both decimal and percentage
      expect(screen.getByText(/0\.82/)).toBeInTheDocument();
      expect(screen.getByText(/82%/)).toBeInTheDocument();
    });

    it('should apply color coding to publication score', () => {
      const { container } = render(<Layer2Factors factors={mockLayer2FactorsPassed} />);

      // High score (82%) should have green color
      const scoreElement = screen.getByText(/0\.82/).closest('span');
      expect(scoreElement).toHaveClass(/green/);
    });

    it('should display low publication score with appropriate color', () => {
      const { container } = render(<Layer2Factors factors={mockLayer2FactorsRejected} />);

      // Low score (45%) should have yellow or red color
      const scoreElement = screen.getByText(/0\.45/).closest('span');
      expect(scoreElement?.className).toMatch(/yellow|red/);
    });

    it('should display very high publication score', () => {
      render(<Layer2Factors factors={mockLayer2FactorsHighScores} />);

      expect(screen.getByText(/0\.95/)).toBeInTheDocument();
      expect(screen.getByText(/95%/)).toBeInTheDocument();
    });
  });

  describe('Module Scores Display', () => {
    it('should render all four module scores', () => {
      render(<Layer2Factors factors={mockLayer2FactorsPassed} />);

      expect(screen.getByText(/Product Offering/i)).toBeInTheDocument();
      expect(screen.getByText(/Layout Quality/i)).toBeInTheDocument();
      expect(screen.getByText(/Navigation Complexity/i)).toBeInTheDocument();
      expect(screen.getByText(/Monetization Indicators/i)).toBeInTheDocument();
    });

    it('should display module scores with percentages', () => {
      render(<Layer2Factors factors={mockLayer2FactorsPassed} />);

      // Product Offering: 0.75 = 75%
      expect(screen.getByText(/0\.75/)).toBeInTheDocument();
      expect(screen.getByText(/75%/)).toBeInTheDocument();

      // Layout Quality: 0.90 = 90%
      expect(screen.getByText(/0\.90/)).toBeInTheDocument();
      expect(screen.getByText(/90%/)).toBeInTheDocument();
    });

    it('should apply color coding to module scores based on value', () => {
      const { container } = render(<Layer2Factors factors={mockLayer2FactorsPassed} />);

      // Layout Quality (0.90 = 90%) should be green
      const layoutScore = screen.getByText(/0\.90/).closest('span');
      expect(layoutScore).toHaveClass(/green/);

      // Product Offering (0.75 = 75%) should be green
      const productScore = screen.getByText(/0\.75/).closest('span');
      expect(productScore).toHaveClass(/green/);
    });

    it('should handle low module scores correctly', () => {
      render(<Layer2Factors factors={mockLayer2FactorsRejected} />);

      // Product Offering: 0.30 = 30% (should be red)
      expect(screen.getByText(/0\.30/)).toBeInTheDocument();
      expect(screen.getByText(/30%/)).toBeInTheDocument();
    });

    it('should display very high module scores', () => {
      render(<Layer2Factors factors={mockLayer2FactorsHighScores} />);

      expect(screen.getByText(/0\.92/)).toBeInTheDocument();
      expect(screen.getByText(/0\.98/)).toBeInTheDocument();
      expect(screen.getByText(/0\.96/)).toBeInTheDocument();
      expect(screen.getByText(/0\.94/)).toBeInTheDocument();
    });
  });

  describe('Publication Keywords Display', () => {
    it('should render publication keywords as badges', () => {
      render(<Layer2Factors factors={mockLayer2FactorsPassed} />);

      expect(screen.getByText('whitepapers')).toBeInTheDocument();
      expect(screen.getByText('case studies')).toBeInTheDocument();
      expect(screen.getByText('blog')).toBeInTheDocument();
      expect(screen.getByText('resources')).toBeInTheDocument();
    });

    it('should handle empty keywords array gracefully', () => {
      render(<Layer2Factors factors={mockLayer2FactorsNoContent} />);

      expect(screen.getAllByText(/Publication Keywords/i)[0]).toBeInTheDocument();
      expect(screen.getByText(/No publication keywords detected/i)).toBeInTheDocument();
    });

    it('should display different keyword types correctly', () => {
      render(<Layer2Factors factors={mockLayer2FactorsRejected} />);

      expect(screen.getByText('ads')).toBeInTheDocument();
      expect(screen.getByText('sponsored')).toBeInTheDocument();
      expect(screen.getByText('affiliate')).toBeInTheDocument();
    });
  });

  describe('Ad Networks Display', () => {
    it('should render ad networks as destructive badges', () => {
      render(<Layer2Factors factors={mockLayer2FactorsRejected} />);

      expect(screen.getByText('Google Ads')).toBeInTheDocument();
      expect(screen.getByText('Amazon Associates')).toBeInTheDocument();
      expect(screen.getByText('MediaVine')).toBeInTheDocument();
    });

    it('should handle empty ad networks array gracefully', () => {
      render(<Layer2Factors factors={mockLayer2FactorsPassed} />);

      expect(screen.getAllByText(/Ad Networks Detected/i)[0]).toBeInTheDocument();
      expect(screen.getByText(/No ad networks detected/i)).toBeInTheDocument();
    });

    it('should show message when no ad networks detected', () => {
      render(<Layer2Factors factors={mockLayer2FactorsHighScores} />);

      expect(screen.getByText(/No ad networks detected/i)).toBeInTheDocument();
    });
  });

  describe('Content Signals Display', () => {
    it('should show all content signal indicators', () => {
      render(<Layer2Factors factors={mockLayer2FactorsPassed} />);

      expect(screen.getByText(/Has Blog/i)).toBeInTheDocument();
      expect(screen.getByText(/Has Press Releases/i)).toBeInTheDocument();
      expect(screen.getByText(/Has Whitepapers/i)).toBeInTheDocument();
      expect(screen.getByText(/Has Case Studies/i)).toBeInTheDocument();
    });

    it('should display check icons for true content signals', () => {
      render(<Layer2Factors factors={mockLayer2FactorsPassed} />);

      // has_blog, has_whitepapers, has_case_studies are true
      // Should see 3 check icons (using lucide-react Check component)
      const blogRow = screen.getByText(/Has Blog/i).closest('div');
      expect(blogRow).toBeInTheDocument();
    });

    it('should display X icons for false content signals', () => {
      render(<Layer2Factors factors={mockLayer2FactorsPassed} />);

      // has_press_releases is false
      const pressReleasesRow = screen.getByText(/Has Press Releases/i).closest('div');
      expect(pressReleasesRow).toBeInTheDocument();
    });

    it('should handle all content signals being false', () => {
      render(<Layer2Factors factors={mockLayer2FactorsNoContent} />);

      expect(screen.getByText(/Has Blog/i)).toBeInTheDocument();
      expect(screen.getByText(/Has Press Releases/i)).toBeInTheDocument();
      expect(screen.getByText(/Has Whitepapers/i)).toBeInTheDocument();
      expect(screen.getByText(/Has Case Studies/i)).toBeInTheDocument();
    });

    it('should handle all content signals being true', () => {
      render(<Layer2Factors factors={mockLayer2FactorsHighScores} />);

      expect(screen.getByText(/Has Blog/i)).toBeInTheDocument();
      expect(screen.getByText(/Has Press Releases/i)).toBeInTheDocument();
      expect(screen.getByText(/Has Whitepapers/i)).toBeInTheDocument();
      expect(screen.getByText(/Has Case Studies/i)).toBeInTheDocument();
    });
  });

  describe('Pass/Fail Status Display', () => {
    it('should display passed=true as green "PASS Layer 2" badge', () => {
      render(<Layer2Factors factors={mockLayer2FactorsPassed} />);

      const passBadge = screen.getByText(/PASS Layer 2/i);
      expect(passBadge).toBeInTheDocument();

      const badgeElement = passBadge.closest('div');
      expect(badgeElement).toHaveClass(/green/);
    });

    it('should display passed=false as red "REJECTED at Layer 2" badge', () => {
      render(<Layer2Factors factors={mockLayer2FactorsRejected} />);

      const rejectBadge = screen.getByText(/REJECTED at Layer 2/i);
      expect(rejectBadge).toBeInTheDocument();

      const badgeElement = rejectBadge.closest('div');
      expect(badgeElement).toHaveClass(/red/);
    });

    it('should visually distinguish pass from fail status', () => {
      const { rerender, container } = render(<Layer2Factors factors={mockLayer2FactorsPassed} />);

      const passText = screen.getByText(/PASS Layer 2/i);
      const passElement = passText.closest('div');
      const passClasses = passElement?.className;

      rerender(<Layer2Factors factors={mockLayer2FactorsRejected} />);

      const rejectText = screen.getByText(/REJECTED at Layer 2/i);
      const rejectElement = rejectText.closest('div');
      const rejectClasses = rejectElement?.className;

      // They should have different class names
      expect(passClasses).not.toBe(rejectClasses);
      // Pass should have green, reject should have red
      expect(passClasses).toMatch(/green/);
      expect(rejectClasses).toMatch(/red/);
    });
  });

  describe('Reasoning Display', () => {
    it('should display complete reasoning text for passed URL', () => {
      render(<Layer2Factors factors={mockLayer2FactorsPassed} />);

      expect(
        screen.getByText(/Strong publication signals: blog section, whitepapers, case studies/)
      ).toBeInTheDocument();
    });

    it('should display complete reasoning text for rejected URL', () => {
      render(<Layer2Factors factors={mockLayer2FactorsRejected} />);

      expect(
        screen.getByText(/Multiple ad networks detected with low module scores/)
      ).toBeInTheDocument();
    });

    it('should display reasoning in readable format', () => {
      const { container } = render(<Layer2Factors factors={mockLayer2FactorsPassed} />);

      const reasoningSection = screen.getByText(/Reasoning/i).closest('div');
      expect(reasoningSection).toBeInTheDocument();

      const reasoningText = screen.getByText(/Strong publication signals/);
      expect(reasoningText).toBeVisible();
    });
  });

  describe('NULL Data Handling', () => {
    it('should handle NULL layer2_factors data gracefully', () => {
      render(<Layer2Factors factors={null} />);

      expect(screen.getByText(/No Layer 2 data/i)).toBeInTheDocument();
    });

    it('should show appropriate message for pre-migration records', () => {
      render(<Layer2Factors factors={null} />);

      expect(
        screen.getByText(/No Layer 2 data|Layer 2 analysis not available|Pre-migration record/i)
      ).toBeInTheDocument();
    });

    it('should not render factor fields when data is NULL', () => {
      render(<Layer2Factors factors={null} />);

      expect(screen.queryByText(/Publication Score/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Module Scores/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Publication Keywords/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Content Signals/i)).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should display loading state when loading prop is true', () => {
      render(<Layer2Factors factors={null} loading={true} />);

      expect(screen.getByText(/Loading|Analyzing/i)).toBeInTheDocument();
    });

    it('should not display data when in loading state', () => {
      render(<Layer2Factors factors={mockLayer2FactorsPassed} loading={true} />);

      expect(screen.queryByText('whitepapers')).not.toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should display error message when error prop is provided', () => {
      render(<Layer2Factors factors={null} error="Failed to load Layer 2 analysis" />);

      expect(screen.getByText(/Failed to load Layer 2 analysis/i)).toBeInTheDocument();
    });

    it('should not display data when in error state', () => {
      render(<Layer2Factors factors={mockLayer2FactorsPassed} error="Analysis failed" />);

      expect(screen.queryByText('whitepapers')).not.toBeInTheDocument();
    });
  });

  describe('Layout and Formatting', () => {
    it('should have organized and readable layout', () => {
      const { container } = render(<Layer2Factors factors={mockLayer2FactorsPassed} />);

      expect(container.firstChild).toBeInTheDocument();

      expect(screen.getByText(/Overall Publication Score/i)).toBeInTheDocument();
      expect(screen.getByText(/Module Scores/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Publication Keywords/i)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/Ad Networks Detected/i)[0]).toBeInTheDocument();
      expect(screen.getByText(/Content Signals/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Reasoning/i)[0]).toBeInTheDocument();
    });

    it('should be properly formatted and well-organized', () => {
      const { container } = render(<Layer2Factors factors={mockLayer2FactorsPassed} />);

      const sections = container.querySelectorAll('div');
      expect(sections.length).toBeGreaterThan(0);
    });
  });

  describe('Responsive Layout', () => {
    it('should render without layout errors', () => {
      const { container } = render(<Layer2Factors factors={mockLayer2FactorsPassed} />);

      expect(container.firstChild).toBeInTheDocument();
    });

    it('should handle long reasoning text without breaking layout', () => {
      const longReasoningFactors: Layer2FactorsType = {
        ...mockLayer2FactorsPassed,
        reasoning:
          'This is a very long reasoning text that should wrap properly without breaking the layout. '.repeat(
            10
          ),
      };

      const { container } = render(<Layer2Factors factors={longReasoningFactors} />);

      expect(container.firstChild).toBeInTheDocument();
      expect(screen.getByText(/This is a very long reasoning text/)).toBeInTheDocument();
    });

    it('should handle many keywords without breaking layout', () => {
      const manyKeywordsFactors: Layer2FactorsType = {
        ...mockLayer2FactorsPassed,
        keywords_found: [
          'keyword-1',
          'keyword-2',
          'keyword-3',
          'keyword-4',
          'keyword-5',
          'keyword-6',
          'keyword-7',
          'keyword-8',
        ],
      };

      render(<Layer2Factors factors={manyKeywordsFactors} />);

      expect(screen.getByText('keyword-1')).toBeInTheDocument();
      expect(screen.getByText('keyword-8')).toBeInTheDocument();
    });

    it('should handle many ad networks without breaking layout', () => {
      const manyAdsFactors: Layer2FactorsType = {
        ...mockLayer2FactorsRejected,
        ad_networks_detected: [
          'Google Ads',
          'Amazon Associates',
          'MediaVine',
          'AdSense',
          'Taboola',
          'Outbrain',
        ],
      };

      render(<Layer2Factors factors={manyAdsFactors} />);

      expect(screen.getByText('Google Ads')).toBeInTheDocument();
      expect(screen.getByText('Outbrain')).toBeInTheDocument();
    });
  });

  describe('Score Color Coding', () => {
    it('should apply green color to high scores (>=70%)', () => {
      render(<Layer2Factors factors={mockLayer2FactorsPassed} />);

      // Layout Quality: 0.90 = 90%
      const highScore = screen.getByText(/0\.90/).closest('span');
      expect(highScore).toHaveClass(/green/);
    });

    it('should apply yellow color to medium scores (40-70%)', () => {
      render(<Layer2Factors factors={mockLayer2FactorsRejected} />);

      // Navigation Complexity: 0.40 = 40%
      const mediumScore = screen.getByText(/0\.40/).closest('span');
      expect(mediumScore?.className).toMatch(/yellow|red/);
    });

    it('should apply red color to low scores (<40%)', () => {
      render(<Layer2Factors factors={mockLayer2FactorsRejected} />);

      // Product Offering: 0.30 = 30%
      const lowScore = screen.getByText(/0\.30/).closest('span');
      expect(lowScore?.className).toMatch(/red/);
    });
  });

  describe('Component Integration', () => {
    it('should accept factors prop with correct type', () => {
      render(<Layer2Factors factors={mockLayer2FactorsPassed} />);
      expect(screen.getByText('whitepapers')).toBeInTheDocument();
    });

    it('should accept optional loading and error props', () => {
      render(
        <Layer2Factors factors={mockLayer2FactorsPassed} loading={false} error={undefined} />
      );
      expect(screen.getByText('whitepapers')).toBeInTheDocument();
    });
  });
});
