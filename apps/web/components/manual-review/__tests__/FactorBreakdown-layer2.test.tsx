import { render, screen } from '@testing-library/react';
import { FactorBreakdown } from '../FactorBreakdown';
import type { Layer2Results } from '@website-scraper/shared';

describe('FactorBreakdown - Layer 2 Publication Detection', () => {
  const mockLayer2WithNewSignals = {
    // New publication detection signals
    has_product_offering: true,
    product_confidence: 0.75,
    detected_product_keywords: ['pricing', 'buy'],
    homepage_is_blog: false,
    layout_type: 'marketing' as const,
    layout_confidence: 0.8,
    has_business_nav: true,
    business_nav_percentage: 0.6,
    nav_items_classified: {
      business: ['product', 'pricing'],
      content: ['blog'],
      other: ['about'],
    },
    monetization_type: 'business' as const,
    ad_networks_detected: [],
    affiliate_patterns_detected: [],
    publication_score: 0.45,
    module_scores: {
      product_offering: 0.25,
      layout: 0.2,
      navigation: 0.4,
      monetization: 0.0,
    },
  } as any; // Type assertion needed for new structure

  const mockLayer2WithOldSignals: Layer2Results = {
    guest_post_red_flags: {
      contact_page: { detected: false },
      author_bio: { detected: false },
      pricing_page: { detected: true },
      submit_content: { detected: false },
      write_for_us: { detected: false },
      guest_post_guidelines: { detected: false },
    },
    content_quality: {
      thin_content: { detected: false, word_count: 1200 },
      excessive_ads: { detected: false },
      broken_links: { detected: false, count: 0 },
    },
  };

  it('should display publication score with new structure', () => {
    render(<FactorBreakdown layer2={mockLayer2WithNewSignals} />);

    // Should show Layer 2 section
    expect(screen.getByText(/Layer 2/i)).toBeInTheDocument();

    // Should show publication score
    expect(screen.getByText(/Publication Score/i)).toBeInTheDocument();
    expect(screen.getByText(/45%/)).toBeInTheDocument();
  });

  it('should display module scores breakdown with new structure', () => {
    render(<FactorBreakdown layer2={mockLayer2WithNewSignals} />);

    expect(screen.getByText(/Module Breakdown/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Product Offering/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Layout Analysis/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Navigation/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Monetization/i).length).toBeGreaterThan(0);
  });

  it('should display detection details with new structure', () => {
    render(<FactorBreakdown layer2={mockLayer2WithNewSignals} />);

    expect(screen.getByText(/Product Offering:/)).toBeInTheDocument();
    expect(screen.getByText(/Detected/)).toBeInTheDocument();
    expect(screen.getByText(/Layout Type:/)).toBeInTheDocument();
    expect(screen.getByText(/marketing/)).toBeInTheDocument();
    expect(screen.getByText(/Business Nav:/)).toBeInTheDocument();
    expect(screen.getByText(/Present/)).toBeInTheDocument();
    expect(screen.getByText(/Monetization:/)).toBeInTheDocument();
    expect(screen.getByText(/business/)).toBeInTheDocument();
  });

  it('should show red progress bar for high publication score', () => {
    const highPubScoreLayer2 = {
      ...mockLayer2WithNewSignals,
      publication_score: 0.75,
    };

    const { container } = render(<FactorBreakdown layer2={highPubScoreLayer2} />);

    // Check for red color class on progress bar
    const progressBar = container.querySelector('.bg-red-500');
    expect(progressBar).toBeInTheDocument();
  });

  it('should show green progress bar for low publication score', () => {
    const { container } = render(<FactorBreakdown layer2={mockLayer2WithNewSignals} />);

    // Check for green color class on progress bar (score is 0.45 < 0.65)
    const progressBar = container.querySelector('.bg-green-500');
    expect(progressBar).toBeInTheDocument();
  });

  it('should display old Layer 2 structure for backward compatibility', () => {
    render(<FactorBreakdown layer2={mockLayer2WithOldSignals} />);

    // Should show old structure
    expect(screen.getAllByText(/Guest Post Indicators/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Content Quality/i).length).toBeGreaterThan(0);
  });

  it('should distinguish between new and old structures', () => {
    const { rerender } = render(<FactorBreakdown layer2={mockLayer2WithNewSignals} />);

    // New structure should show publication score
    expect(screen.getByText(/Publication Score/i)).toBeInTheDocument();

    // Rerender with old structure
    rerender(<FactorBreakdown layer2={mockLayer2WithOldSignals} />);

    // Old structure should show guest post indicators
    expect(screen.queryByText(/Publication Score/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/Guest Post Indicators/i).length).toBeGreaterThan(0);
  });
});
