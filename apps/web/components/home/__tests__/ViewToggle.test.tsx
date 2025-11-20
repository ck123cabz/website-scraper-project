import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ViewToggle } from '../ViewToggle';
import { useUserPreferences } from '@/hooks/use-user-preferences';

jest.mock('@/hooks/use-user-preferences');

const mockUseUserPreferences = useUserPreferences as jest.MockedFunction<typeof useUserPreferences>;

function renderWithQueryClient(component: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
}

describe('ViewToggle', () => {
  let mockUpdatePreferences: jest.Mock;
  let mockOnViewChange: jest.Mock;

  beforeEach(() => {
    mockUpdatePreferences = jest.fn();
    mockOnViewChange = jest.fn();
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    mockUseUserPreferences.mockReturnValue({
      preferences: undefined,
      isLoading: true,
      error: null,
      updatePreferences: mockUpdatePreferences,
      updatePreferencesAsync: jest.fn(),
      isUpdating: false,
    });

    renderWithQueryClient(<ViewToggle onViewChange={mockOnViewChange} />);

    // Check for the animated loading skeleton div by finding the div with animate-pulse class
    const allDivs = screen.getAllByRole('generic');
    const animatedDiv = allDivs.find(div => div.className.includes('animate-pulse'));
    expect(animatedDiv).toBeDefined();
    expect(animatedDiv).toHaveClass('animate-pulse');
  });

  it('initializes with default view from preferences', async () => {
    mockUseUserPreferences.mockReturnValue({
      preferences: {
        id: '1',
        userId: 'user1',
        theme: 'light',
        sidebarCollapsed: false,
        defaultView: 'table',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      isLoading: false,
      error: null,
      updatePreferences: mockUpdatePreferences,
      updatePreferencesAsync: jest.fn(),
      isUpdating: false,
    });

    renderWithQueryClient(<ViewToggle onViewChange={mockOnViewChange} />);

    await waitFor(() => {
      expect(mockOnViewChange).toHaveBeenCalledWith('table');
    });
  });

  it('switches view when clicking toggle', async () => {
    const user = userEvent.setup();

    mockUseUserPreferences.mockReturnValue({
      preferences: {
        id: '1',
        userId: 'user1',
        theme: 'light',
        sidebarCollapsed: false,
        defaultView: 'cards',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      isLoading: false,
      error: null,
      updatePreferences: mockUpdatePreferences,
      updatePreferencesAsync: jest.fn(),
      isUpdating: false,
    });

    renderWithQueryClient(<ViewToggle onViewChange={mockOnViewChange} />);

    const tableButton = screen.getByRole('tab', { name: /table/i });
    await user.click(tableButton);

    await waitFor(() => {
      expect(mockOnViewChange).toHaveBeenLastCalledWith('table');
      expect(mockUpdatePreferences).toHaveBeenCalledWith({ defaultView: 'table' });
    });
  });

  it('persists view selection to backend', async () => {
    const user = userEvent.setup();

    mockUseUserPreferences.mockReturnValue({
      preferences: {
        id: '1',
        userId: 'user1',
        theme: 'light',
        sidebarCollapsed: false,
        defaultView: 'cards',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      isLoading: false,
      error: null,
      updatePreferences: mockUpdatePreferences,
      updatePreferencesAsync: jest.fn(),
      isUpdating: false,
    });

    renderWithQueryClient(<ViewToggle onViewChange={mockOnViewChange} />);

    const tableButton = screen.getByRole('tab', { name: /table/i });
    await user.click(tableButton);

    await waitFor(() => {
      expect(mockUpdatePreferences).toHaveBeenCalledWith({ defaultView: 'table' });
    });
  });
});
