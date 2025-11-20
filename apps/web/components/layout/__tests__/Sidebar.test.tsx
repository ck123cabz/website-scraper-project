import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Sidebar } from '../Sidebar';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/'),
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock the theme provider
jest.mock('@/components/shared/ThemeProvider', () => ({
  useTheme: () => ({
    setTheme: jest.fn(),
    resolvedTheme: 'light',
    theme: 'system',
  }),
}));

// Mock the preferences hook
jest.mock('@/hooks/use-user-preferences', () => ({
  useUserPreferences: () => ({
    preferences: {
      theme: 'light',
      sidebarCollapsed: false,
    },
    updatePreferences: jest.fn(),
  }),
}));

// Mock Button component
jest.mock('@/components/ui/button', () => ({
  Button: ({ onClick, children, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

// Mock lucide icons
jest.mock('lucide-react', () => ({
  Home: () => <div data-testid="icon-home">Home Icon</div>,
  Briefcase: () => <div data-testid="icon-briefcase">Briefcase Icon</div>,
  BarChart3: () => <div data-testid="icon-analytics">Analytics Icon</div>,
  Settings: () => <div data-testid="icon-settings">Settings Icon</div>,
  ChevronLeft: () => <div data-testid="icon-chevron-left">Chevron Left</div>,
  ChevronRight: () => <div data-testid="icon-chevron-right">Chevron Right</div>,
}));

describe('Sidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders successfully', () => {
    const { container } = render(<Sidebar />);
    const sidebar = container.querySelector('aside');
    expect(sidebar).toBeInTheDocument();
  });

  it('displays all navigation items', () => {
    render(<Sidebar />);

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Jobs')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders sidebar header with title when expanded', () => {
    render(<Sidebar collapsed={false} />);
    expect(screen.getByText('Scraper')).toBeInTheDocument();
  });

  it('hides sidebar header title when collapsed', () => {
    const { container } = render(<Sidebar collapsed={true} />);
    const title = screen.queryByText('Scraper');
    // When collapsed, title should not be in the document
    if (title) {
      expect(title).not.toBeVisible();
    }
  });

  it('renders collapse/expand button', () => {
    render(<Sidebar />);
    const button = screen.getByRole('button', { name: /toggle/i });
    expect(button).toBeInTheDocument();
  });

  it('calls onCollapsedChange when collapse button is clicked', () => {
    const onCollapsedChange = jest.fn();
    render(<Sidebar collapsed={false} onCollapsedChange={onCollapsedChange} />);

    const button = screen.getByRole('button', { name: /collapse/i });
    fireEvent.click(button);

    expect(onCollapsedChange).toHaveBeenCalledWith(true);
  });

  it('displays expand chevron when sidebar is collapsed', () => {
    render(<Sidebar collapsed={true} />);
    expect(screen.getByTestId('icon-chevron-right')).toBeInTheDocument();
  });

  it('displays collapse chevron when sidebar is expanded', () => {
    render(<Sidebar collapsed={false} />);
    expect(screen.getByTestId('icon-chevron-left')).toBeInTheDocument();
  });

  it('applies correct width class when expanded', () => {
    const { container } = render(<Sidebar collapsed={false} />);
    const sidebar = container.querySelector('aside');
    expect(sidebar).toHaveClass('w-64');
  });

  it('applies correct width class when collapsed', () => {
    const { container } = render(<Sidebar collapsed={true} />);
    const sidebar = container.querySelector('aside');
    expect(sidebar).toHaveClass('w-16');
  });

  it('applies transition duration class', () => {
    const { container } = render(<Sidebar />);
    const sidebar = container.querySelector('aside');
    expect(sidebar).toHaveClass('transition-all', 'duration-300');
  });

  it('renders navigation links with correct hrefs', () => {
    render(<Sidebar />);

    const homeLink = screen.getByRole('link', { name: /home/i });
    const jobsLink = screen.getByRole('link', { name: /jobs/i });
    const analyticsLink = screen.getByRole('link', { name: /analytics/i });
    const settingsLink = screen.getByRole('link', { name: /settings/i });

    expect(homeLink).toHaveAttribute('href', '/');
    expect(jobsLink).toHaveAttribute('href', '/jobs/all');
    expect(analyticsLink).toHaveAttribute('href', '/analytics');
    expect(settingsLink).toHaveAttribute('href', '/settings');
  });

  it('renders theme toggle button at the bottom', () => {
    render(<Sidebar />);
    const themeButton = screen.getByRole('button', { name: /toggle theme/i });
    expect(themeButton).toBeInTheDocument();
  });

  it('displays theme emoji in button', () => {
    render(<Sidebar collapsed={false} />);
    const themeButton = screen.getByRole('button', { name: /toggle theme/i });
    // Check that button contains sun emoji for light theme
    expect(themeButton).toHaveTextContent('☀️');
  });

  it('renders theme text when expanded', () => {
    render(<Sidebar collapsed={false} />);
    const themeButton = screen.getByRole('button', { name: /toggle theme/i });
    expect(themeButton).toHaveTextContent('Theme');
  });

  it('hides theme text when collapsed', () => {
    render(<Sidebar collapsed={true} />);
    const themeButton = screen.getByRole('button', { name: /toggle theme/i });
    // When collapsed, theme text should not be visible
    const themeText = Array.from(themeButton.childNodes).find(
      node => node.nodeType === Node.TEXT_NODE && node.textContent?.includes('Theme')
    );
    // Either the text node doesn't exist or is hidden
    expect(themeText ? themeText.textContent?.trim() : '').not.toBe('Theme');
  });

  it('has proper ARIA labels for accessibility', () => {
    render(<Sidebar collapsed={false} />);

    const collapseButton = screen.getByRole('button', { name: /collapse/i });
    expect(collapseButton).toHaveAttribute('aria-label');

    const themeButton = screen.getByRole('button', { name: /toggle theme/i });
    expect(themeButton).toHaveAttribute('aria-label');
  });

  it('marks active route with aria-current', () => {
    const { usePathname } = require('next/navigation');
    usePathname.mockReturnValue('/');

    render(<Sidebar />);

    const homeLink = screen.getByRole('link', { name: /home/i });
    expect(homeLink).toHaveAttribute('aria-current', 'page');
  });

  it('does not mark inactive routes with aria-current', () => {
    const { usePathname } = require('next/navigation');
    usePathname.mockReturnValue('/');

    render(<Sidebar />);

    const jobsLink = screen.getByRole('link', { name: /jobs/i });
    expect(jobsLink).not.toHaveAttribute('aria-current');
  });

  it('applies active styling to current route', () => {
    const { usePathname } = require('next/navigation');
    usePathname.mockReturnValue('/');

    render(<Sidebar collapsed={false} />);

    const homeLink = screen.getByRole('link', { name: /home/i });
    expect(homeLink).toHaveClass('bg-accent', 'text-accent-foreground');
  });

  it('applies inactive styling to other routes', () => {
    const { usePathname } = require('next/navigation');
    usePathname.mockReturnValue('/');

    render(<Sidebar collapsed={false} />);

    const jobsLink = screen.getByRole('link', { name: /jobs/i });
    expect(jobsLink).toHaveClass('text-muted-foreground');
  });

  it('renders all navigation icons', () => {
    render(<Sidebar />);

    expect(screen.getByTestId('icon-home')).toBeInTheDocument();
    expect(screen.getByTestId('icon-briefcase')).toBeInTheDocument();
    expect(screen.getByTestId('icon-analytics')).toBeInTheDocument();
    expect(screen.getByTestId('icon-settings')).toBeInTheDocument();
  });

  it('hides nav item labels when collapsed', () => {
    render(<Sidebar collapsed={true} />);

    // When collapsed, text labels like "Home", "Jobs" etc should not be visible
    // (they're rendered but hidden via conditional rendering)
    const homeLabel = screen.queryByText('Home');
    if (homeLabel) {
      expect(homeLabel).not.toBeVisible();
    }
  });

  it('shows nav item labels when expanded', () => {
    render(<Sidebar collapsed={false} />);

    expect(screen.getByText('Home')).toBeVisible();
    expect(screen.getByText('Jobs')).toBeVisible();
    expect(screen.getByText('Analytics')).toBeVisible();
    expect(screen.getByText('Settings')).toBeVisible();
  });

  it('applies fixed positioning', () => {
    const { container } = render(<Sidebar />);
    const sidebar = container.querySelector('aside');
    expect(sidebar).toHaveClass('fixed', 'left-0', 'top-0', 'h-screen');
  });

  it('renders border and background styling', () => {
    const { container } = render(<Sidebar />);
    const sidebar = container.querySelector('aside');
    expect(sidebar).toHaveClass('border-r', 'border-border', 'bg-background');
  });

  it('centers collapse button when sidebar is collapsed', () => {
    const { container } = render(<Sidebar collapsed={true} />);
    const headerDiv = container.querySelector('[class*="justify-center"]');
    expect(headerDiv).toHaveClass('justify-center');
  });

  it('maintains flex layout in navigation', () => {
    const { container } = render(<Sidebar />);
    const nav = container.querySelector('nav');
    expect(nav).toHaveClass('flex', 'flex-col');
  });

  it('renders footer area with theme toggle', () => {
    const { container } = render(<Sidebar />);
    const footer = container.querySelector('[class*="absolute bottom"]');
    expect(footer).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /toggle theme/i })).toBeInTheDocument();
  });
});
