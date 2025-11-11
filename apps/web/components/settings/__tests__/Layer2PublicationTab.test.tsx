import { render, screen } from '@testing-library/react';
import { Layer2PublicationTab } from '../Layer2PublicationTab';
import { Layer2Rules } from '@website-scraper/shared';

describe('Layer2PublicationTab', () => {
  const mockRules: Layer2Rules = {
    publication_score_threshold: 0.65,
    product_keywords: {
      commercial: ['pricing', 'buy'],
      features: ['features'],
      cta: ['get started'],
    },
    business_nav_keywords: ['product', 'pricing'],
    content_nav_keywords: ['articles', 'blog'],
    min_business_nav_percentage: 0.3,
    ad_network_patterns: ['googlesyndication'],
    affiliate_patterns: ['amazon'],
    payment_provider_patterns: ['stripe'],
    // Default values for other required fields
    blog_freshness_days: 90,
    required_pages_count: 2,
    tech_stack_tools: { analytics: [], marketing: [] },
    min_tech_stack_tools: 2,
    min_design_quality_score: 7,
  };

  const mockOnChange = jest.fn();

  it('should render all sections', () => {
    render(<Layer2PublicationTab rules={mockRules} onChange={mockOnChange} />);

    expect(screen.getByText(/Detection Threshold/i)).toBeInTheDocument();
    expect(screen.getByText(/Product Offering Detection/i)).toBeInTheDocument();
    expect(screen.getByText(/Navigation Analysis/i)).toBeInTheDocument();
    expect(screen.getByText(/Monetization Detection/i)).toBeInTheDocument();
  });

  it('should display loaded settings', () => {
    render(<Layer2PublicationTab rules={mockRules} onChange={mockOnChange} />);

    // Check threshold value
    expect(screen.getByText('0.65')).toBeInTheDocument();

    // Check that keywords are displayed (use getAllByText for duplicates)
    const pricingElements = screen.getAllByText('pricing');
    expect(pricingElements.length).toBeGreaterThan(0);

    expect(screen.getByText('googlesyndication')).toBeInTheDocument();
  });

  it('should have all input components', () => {
    render(<Layer2PublicationTab rules={mockRules} onChange={mockOnChange} />);

    // Check for SliderInput components
    expect(screen.getByText('Publication Score Threshold')).toBeInTheDocument();
    expect(screen.getByText('Min Business Nav %')).toBeInTheDocument();

    // Check for KeywordArrayInput components
    expect(screen.getByText('Commercial Keywords')).toBeInTheDocument();
    expect(screen.getByText('Feature Keywords')).toBeInTheDocument();
    expect(screen.getByText('CTA Keywords')).toBeInTheDocument();
    expect(screen.getByText('Business Nav Keywords')).toBeInTheDocument();
    expect(screen.getByText('Content Nav Keywords')).toBeInTheDocument();

    // Check for PatternArrayInput components
    expect(screen.getByText('Ad Network Patterns')).toBeInTheDocument();
    expect(screen.getByText('Affiliate Patterns')).toBeInTheDocument();
    expect(screen.getByText('Payment Provider Patterns')).toBeInTheDocument();
  });
});
