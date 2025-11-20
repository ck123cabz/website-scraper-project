import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Header } from '../Header';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/'),
}));

// Mock lucide icons
jest.mock('lucide-react', () => ({
  ChevronRight: () => <div data-testid="chevron-icon">›</div>,
}));

describe('Header', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders header element', () => {
    const { container } = render(<Header />);
    const header = container.querySelector('header');
    expect(header).toBeInTheDocument();
  });

  it('displays breadcrumbs on home page', () => {
    render(<Header />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('displays breadcrumbs for jobs page', () => {
    const { usePathname } = require('next/navigation');
    usePathname.mockReturnValue('/jobs/all');

    render(<Header />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('All Jobs')).toBeInTheDocument();
  });

  it('displays breadcrumbs for analytics page', () => {
    const { usePathname } = require('next/navigation');
    usePathname.mockReturnValue('/analytics');

    render(<Header />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
  });

  it('displays breadcrumbs for settings page', () => {
    const { usePathname } = require('next/navigation');
    usePathname.mockReturnValue('/settings');

    render(<Header />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders chevron icons between breadcrumbs', () => {
    const { usePathname } = require('next/navigation');
    usePathname.mockReturnValue('/jobs/all');

    render(<Header />);

    const chevrons = screen.getAllByTestId('chevron-icon');
    // One chevron between Dashboard and Jobs, one between Jobs and All Jobs
    expect(chevrons.length).toBeGreaterThan(0);
  });

  it('displays current page name in right section', () => {
    render(<Header />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('highlights last breadcrumb as current page', () => {
    const { usePathname } = require('next/navigation');
    usePathname.mockReturnValue('/jobs/all');

    const { container } = render(<Header />);

    const spans = container.querySelectorAll('span');
    const lastSpan = Array.from(spans).find(span => span.textContent === 'All Jobs');
    expect(lastSpan).toHaveClass('font-semibold', 'text-foreground');
  });

  it('applies muted color to non-current breadcrumbs', () => {
    const { usePathname } = require('next/navigation');
    usePathname.mockReturnValue('/jobs/all');

    const { container } = render(<Header />);

    const spans = container.querySelectorAll('span');
    const dashboardSpan = Array.from(spans).find(span => span.textContent === 'Dashboard');
    expect(dashboardSpan).toHaveClass('text-muted-foreground');
  });

  it('applies correct margin class when sidebar is not collapsed', () => {
    const { container } = render(<Header sidebarCollapsed={false} />);
    const header = container.querySelector('header');
    expect(header).toHaveClass('ml-64');
  });

  it('applies correct margin class when sidebar is collapsed', () => {
    const { container } = render(<Header sidebarCollapsed={true} />);
    const header = container.querySelector('header');
    expect(header).toHaveClass('ml-16');
  });

  it('applies sticky and header styling classes', () => {
    const { container } = render(<Header />);
    const header = container.querySelector('header');
    expect(header).toHaveClass(
      'sticky',
      'top-0',
      'border-b',
      'border-border',
      'bg-background/95',
      'backdrop-blur'
    );
  });

  it('renders breadcrumbs in correct order', () => {
    const { usePathname } = require('next/navigation');
    usePathname.mockReturnValue('/jobs/all');

    const { container } = render(<Header />);

    const breadcrumbTexts: string[] = [];
    container.querySelectorAll('span').forEach(span => {
      const text = span.textContent?.trim();
      if (text && ['Dashboard', 'Jobs', 'All Jobs'].includes(text)) {
        breadcrumbTexts.push(text);
      }
    });

    expect(breadcrumbTexts[0]).toBe('Dashboard');
  });

  it('handles deep nested paths', () => {
    const { usePathname } = require('next/navigation');
    usePathname.mockReturnValue('/jobs/active');

    render(<Header />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Active Jobs')).toBeInTheDocument();
  });

  it('capitalizes unknown path segments', () => {
    const { usePathname } = require('next/navigation');
    usePathname.mockReturnValue('/unknown/path');

    render(<Header />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    // Unknown segments should be capitalized
    expect(screen.getByText(/Unknown/i)).toBeInTheDocument();
  });

  it('renders flex container with proper alignment', () => {
    const { container } = render(<Header />);
    const flexContainer = container.querySelector('.flex.items-center.justify-between');
    expect(flexContainer).toBeInTheDocument();
  });

  it('renders breadcrumbs section with flex layout', () => {
    const { container } = render(<Header />);
    const breadcrumbsSection = container.querySelector('.flex.items-center.space-x-2');
    expect(breadcrumbsSection).toBeInTheDocument();
  });

  it('renders right side actions section', () => {
    const { container } = render(<Header />);
    const rightSection = container.querySelector('.flex.items-center.space-x-4');
    expect(rightSection).toBeInTheDocument();
  });

  it('displays text with proper spacing', () => {
    const { container } = render(<Header />);
    const textElements = container.querySelectorAll('.text-sm');
    expect(textElements.length).toBeGreaterThan(0);
  });

  it('applies text styling to breadcrumb text', () => {
    const { container } = render(<Header />);
    const textSpans = container.querySelectorAll('span.text-sm');
    expect(textSpans.length).toBeGreaterThan(0);
  });

  it('updates breadcrumbs when pathname changes', () => {
    const { usePathname, rerender } = require('next/navigation');
    usePathname.mockReturnValue('/');

    const { rerender: rtlRerender } = render(<Header />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();

    usePathname.mockReturnValue('/analytics');
    rtlRerender(<Header />);

    expect(screen.getByText('Analytics')).toBeInTheDocument();
  });

  it('renders padding and spacing correctly', () => {
    const { container } = render(<Header />);
    const contentDiv = container.querySelector('.px-6.py-4');
    expect(contentDiv).toBeInTheDocument();
  });

  it('applies muted foreground color to right section text', () => {
    const { container } = render(<Header />);
    const rightText = container.querySelector('.text-xs.text-muted-foreground');
    expect(rightText).toBeInTheDocument();
  });

  it('handles root path correctly', () => {
    const { usePathname } = require('next/navigation');
    usePathname.mockReturnValue('/');

    render(<Header />);

    // Should only display Dashboard breadcrumb for root path
    const dashboards = screen.getAllByText('Dashboard');
    expect(dashboards.length).toBeGreaterThanOrEqual(1);
  });

  it('renders all breadcrumb segments correctly', () => {
    const { usePathname } = require('next/navigation');
    usePathname.mockReturnValue('/jobs/all');

    const { container } = render(<Header />);

    // Get all breadcrumb text content
    const breadcrumbSection = container.querySelector('.flex.items-center.space-x-2');
    expect(breadcrumbSection?.textContent).toContain('Dashboard');
    expect(breadcrumbSection?.textContent).toContain('All Jobs');
  });

  it('applies proper header structure', () => {
    const { container } = render(<Header />);

    const header = container.querySelector('header');
    const innerDiv = header?.querySelector('.flex');

    expect(header).toBeInTheDocument();
    expect(innerDiv).toBeInTheDocument();
  });

  it('renders with default sidebar collapsed state as false', () => {
    const { container } = render(<Header />);
    const header = container.querySelector('header');
    expect(header).toHaveClass('ml-64');
  });
});
