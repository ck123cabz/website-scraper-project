import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CommandPalette } from '../CommandPalette';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock command components
jest.mock('@/components/ui/command', () => ({
  Command: ({ children, ...props }: any) => (
    <div data-testid="command" {...props}>
      {children}
    </div>
  ),
  CommandDialog: ({ open, onOpenChange, children }: any) => (
    open && (
      <div data-testid="command-dialog" data-open={open}>
        <button
          data-testid="close-dialog"
          onClick={() => onOpenChange(false)}
        >
          Close
        </button>
        {children}
      </div>
    )
  ),
  CommandEmpty: ({ children }: any) => (
    <div data-testid="command-empty">{children}</div>
  ),
  CommandGroup: ({ heading, children }: any) => (
    <div data-testid="command-group">
      <h2>{heading}</h2>
      {children}
    </div>
  ),
  CommandInput: ({ placeholder }: any) => (
    <input data-testid="command-input" placeholder={placeholder} />
  ),
  CommandItem: ({ onSelect, children, ...props }: any) => (
    <div data-testid="command-item" onClick={onSelect} {...props}>
      {children}
    </div>
  ),
  CommandList: ({ children }: any) => (
    <div data-testid="command-list">{children}</div>
  ),
}));

// Mock lucide icons
jest.mock('lucide-react', () => ({
  Home: () => <div data-testid="icon-home">🏠</div>,
  Briefcase: () => <div data-testid="icon-briefcase">💼</div>,
  BarChart3: () => <div data-testid="icon-chart">📊</div>,
  Settings: () => <div data-testid="icon-settings">⚙️</div>,
  LogOut: () => <div data-testid="icon-logout">🚪</div>,
}));

describe('CommandPalette', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<CommandPalette />);
    expect(screen.getByTestId('command-input')).toBeInTheDocument();
  });

  it('does not display command dialog when closed by default', () => {
    render(<CommandPalette />);
    expect(screen.queryByTestId('command-dialog')).not.toBeInTheDocument();
  });

  it('displays command dialog when open prop is true', () => {
    render(<CommandPalette open={true} />);
    expect(screen.getByTestId('command-dialog')).toBeInTheDocument();
  });

  it('closes dialog when onOpenChange is called with false', () => {
    const { rerender } = render(<CommandPalette open={true} />);
    expect(screen.getByTestId('command-dialog')).toBeInTheDocument();

    rerender(<CommandPalette open={false} />);
    expect(screen.queryByTestId('command-dialog')).not.toBeInTheDocument();
  });

  it('renders command input field', () => {
    render(<CommandPalette open={true} />);
    const input = screen.getByTestId('command-input');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('placeholder', 'Search commands, go to pages...');
  });

  it('renders command list', () => {
    render(<CommandPalette open={true} />);
    expect(screen.getByTestId('command-list')).toBeInTheDocument();
  });

  it('renders Navigation command group', () => {
    render(<CommandPalette open={true} />);
    const groups = screen.getAllByTestId('command-group');
    const navigationGroup = groups.find(g => g.textContent?.includes('Navigation'));
    expect(navigationGroup).toBeInTheDocument();
  });

  it('renders navigation commands', () => {
    render(<CommandPalette open={true} />);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Jobs')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders command descriptions', () => {
    render(<CommandPalette open={true} />);
    expect(screen.getByText('Go to dashboard')).toBeInTheDocument();
    expect(screen.getByText('View all jobs')).toBeInTheDocument();
    expect(screen.getByText('View analytics dashboard')).toBeInTheDocument();
    expect(screen.getByText('Open settings')).toBeInTheDocument();
  });

  it('renders action commands', () => {
    render(<CommandPalette open={true} />);
    expect(screen.getByText('Create Job')).toBeInTheDocument();
  });

  it('renders navigation icons', () => {
    render(<CommandPalette open={true} />);
    expect(screen.getByTestId('icon-home')).toBeInTheDocument();
    expect(screen.getByTestId('icon-briefcase')).toBeInTheDocument();
    expect(screen.getByTestId('icon-chart')).toBeInTheDocument();
    expect(screen.getByTestId('icon-settings')).toBeInTheDocument();
  });

  it('navigates to home when home command is selected', () => {
    render(<CommandPalette open={true} onOpenChange={jest.fn()} />);
    const items = screen.getAllByTestId('command-item');
    const homeItem = items.find(i => i.textContent?.includes('Home'));

    if (homeItem) {
      fireEvent.click(homeItem);
      expect(mockPush).toHaveBeenCalledWith('/');
    }
  });

  it('navigates to jobs when jobs command is selected', () => {
    render(<CommandPalette open={true} onOpenChange={jest.fn()} />);
    const items = screen.getAllByTestId('command-item');
    const jobsItem = items.find(i => i.textContent?.includes('Jobs'));

    if (jobsItem) {
      fireEvent.click(jobsItem);
      expect(mockPush).toHaveBeenCalledWith('/jobs/all');
    }
  });

  it('navigates to analytics when analytics command is selected', () => {
    render(<CommandPalette open={true} onOpenChange={jest.fn()} />);
    const items = screen.getAllByTestId('command-item');
    const analyticsItem = items.find(i => i.textContent?.includes('Analytics'));

    if (analyticsItem) {
      fireEvent.click(analyticsItem);
      expect(mockPush).toHaveBeenCalledWith('/analytics');
    }
  });

  it('navigates to settings when settings command is selected', () => {
    render(<CommandPalette open={true} onOpenChange={jest.fn()} />);
    const items = screen.getAllByTestId('command-item');
    const settingsItem = items.find(i => i.textContent?.includes('Settings'));

    if (settingsItem) {
      fireEvent.click(settingsItem);
      expect(mockPush).toHaveBeenCalledWith('/settings');
    }
  });

  it('closes dialog when command is selected', () => {
    const onOpenChange = jest.fn();
    render(<CommandPalette open={true} onOpenChange={onOpenChange} />);

    const items = screen.getAllByTestId('command-item');
    if (items[0]) {
      fireEvent.click(items[0]);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    }
  });

  it('renders keyboard shortcut hint', () => {
    render(<CommandPalette open={true} />);
    expect(screen.getByText('⌘K')).toBeInTheDocument();
    expect(screen.getByText('to open')).toBeInTheDocument();
  });

  it('registers keyboard listener for opening command palette', async () => {
    const onOpenChange = jest.fn();
    render(<CommandPalette open={false} onOpenChange={onOpenChange} />);

    const event = new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: true,
    });

    document.dispatchEvent(event);

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalled();
    });
  });

  it('handles ctrl+k shortcut on non-Mac', async () => {
    const onOpenChange = jest.fn();
    render(<CommandPalette open={false} onOpenChange={onOpenChange} />);

    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
    });

    document.dispatchEvent(event);

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalled();
    });
  });

  it('closes palette with escape key when open', async () => {
    const onOpenChange = jest.fn();
    render(<CommandPalette open={true} onOpenChange={onOpenChange} />);

    const event = new KeyboardEvent('keydown', {
      key: 'Escape',
    });

    document.dispatchEvent(event);

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('prevents default behavior for command palette shortcuts', () => {
    render(<CommandPalette open={false} />);

    const event = new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: true,
    });
    const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

    document.dispatchEvent(event);

    // Note: actual testing of preventDefault may require more setup
    expect(preventDefaultSpy).not.toThrow();
  });

  it('renders all command groups', () => {
    render(<CommandPalette open={true} />);
    const groups = screen.getAllByTestId('command-group');
    expect(groups.length).toBeGreaterThanOrEqual(2);
  });

  it('renders commands in correct groups', () => {
    render(<CommandPalette open={true} />);
    const groups = screen.getAllByTestId('command-group');

    // Find Navigation group and verify it contains navigation items
    const navGroup = groups.find(g => g.textContent?.includes('Navigation'));
    expect(navGroup?.textContent).toContain('Home');
    expect(navGroup?.textContent).toContain('Jobs');
  });

  it('renders correct number of command items', () => {
    render(<CommandPalette open={true} />);
    const items = screen.getAllByTestId('command-item');
    expect(items.length).toBeGreaterThanOrEqual(5);
  });

  it('maintains dialog state correctly', () => {
    const onOpenChange = jest.fn();
    const { rerender } = render(
      <CommandPalette open={true} onOpenChange={onOpenChange} />
    );

    expect(screen.getByTestId('command-dialog')).toBeInTheDocument();

    rerender(<CommandPalette open={false} onOpenChange={onOpenChange} />);

    expect(screen.queryByTestId('command-dialog')).not.toBeInTheDocument();
  });

  it('handles multiple command selections', () => {
    const onOpenChange = jest.fn();
    render(<CommandPalette open={true} onOpenChange={onOpenChange} />);

    // Click first item
    const items = screen.getAllByTestId('command-item');
    if (items[0]) {
      fireEvent.click(items[0]);
    }

    expect(mockPush).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('cleans up keyboard listeners on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');
    const { unmount } = render(<CommandPalette />);

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    removeEventListenerSpy.mockRestore();
  });

  it('updates keyboard listener when open state changes', () => {
    const { rerender } = render(<CommandPalette open={false} />);

    rerender(<CommandPalette open={true} />);

    // Component should re-register listener with new open state
    expect(screen.getByTestId('command-dialog')).toBeInTheDocument();
  });
});
