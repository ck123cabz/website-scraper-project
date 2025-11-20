import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AppShell } from '../AppShell';

// Mock the child components to avoid complex dependencies
jest.mock('../Sidebar', () => ({
  Sidebar: ({ collapsed, onCollapsedChange }: any) => (
    <div data-testid="sidebar" data-collapsed={collapsed}>
      <button onClick={() => onCollapsedChange(!collapsed)}>
        Toggle Sidebar
      </button>
    </div>
  ),
}));

jest.mock('../Header', () => ({
  Header: ({ sidebarCollapsed }: any) => (
    <div data-testid="header" data-sidebar-collapsed={sidebarCollapsed}>
      Header
    </div>
  ),
}));

jest.mock('@/components/command/CommandPalette', () => ({
  CommandPalette: ({ open, onOpenChange }: any) => (
    <div data-testid="command-palette" data-open={open}>
      Command Palette
    </div>
  ),
}));

describe('AppShell', () => {
  it('renders successfully with children content', () => {
    render(
      <AppShell>
        <div data-testid="test-content">Test Content</div>
      </AppShell>
    );

    expect(screen.getByTestId('test-content')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders sidebar component', () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );

    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
  });

  it('renders header component', () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );

    expect(screen.getByTestId('header')).toBeInTheDocument();
  });

  it('renders command palette component', () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );

    expect(screen.getByTestId('command-palette')).toBeInTheDocument();
  });

  it('passes initial sidebar collapsed state to header', () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );

    const header = screen.getByTestId('header');
    // Initial state should be not collapsed (false)
    expect(header).toHaveAttribute('data-sidebar-collapsed', 'false');
  });

  it('has proper structure with flex layout', () => {
    const { container } = render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );

    const mainContainer = container.querySelector('.flex.h-screen.overflow-hidden');
    expect(mainContainer).toBeInTheDocument();
  });

  it('renders main content area with proper classes', () => {
    const { container } = render(
      <AppShell>
        <div data-testid="test-content">Test Content</div>
      </AppShell>
    );

    const mainElement = container.querySelector('main');
    expect(mainElement).toBeInTheDocument();
    expect(mainElement).toHaveClass('flex-1', 'overflow-auto');
  });

  it('renders children within content wrapper with padding', () => {
    const { container } = render(
      <AppShell>
        <div data-testid="test-content">Test Content</div>
      </AppShell>
    );

    const contentWrapper = container.querySelector('.px-6.py-6');
    expect(contentWrapper).toBeInTheDocument();
    expect(contentWrapper?.querySelector('[data-testid="test-content"]')).toBeInTheDocument();
  });

  it('creates flexbox structure for layout', () => {
    const { container } = render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );

    // Check for flex layout container
    const flexContainer = container.querySelector('.flex.h-screen');
    expect(flexContainer).toBeInTheDocument();

    // Check for main content flex column
    const flexColumn = container.querySelector('.flex.flex-1.flex-col.overflow-auto');
    expect(flexColumn).toBeInTheDocument();
  });

  it('properly composes sidebar, header, and content area', () => {
    const { container } = render(
      <AppShell>
        <div data-testid="test-content">Content</div>
      </AppShell>
    );

    const sidebar = screen.getByTestId('sidebar');
    const header = screen.getByTestId('header');
    const main = container.querySelector('main');

    // Verify all three are present
    expect(sidebar).toBeInTheDocument();
    expect(header).toBeInTheDocument();
    expect(main).toBeInTheDocument();

    // Verify they are siblings (both in the same parent flex container)
    expect(sidebar.parentElement).toBe(header.parentElement?.parentElement);
  });

  it('applies background color class to main container', () => {
    const { container } = render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );

    const mainContainer = container.querySelector('.bg-background');
    expect(mainContainer).toBeInTheDocument();
  });
});
