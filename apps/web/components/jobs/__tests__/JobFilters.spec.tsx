import { render, screen, fireEvent } from '@testing-library/react';
import { JobFilters } from '../JobFilters';

describe('JobFilters', () => {
  const mockProps = {
    statusFilter: 'all',
    onStatusFilterChange: jest.fn(),
    dateFilter: 'all',
    onDateFilterChange: jest.fn(),
    searchQuery: '',
    onSearchChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders search input', () => {
    render(<JobFilters {...mockProps} />);
    expect(screen.getByLabelText(/search jobs by name/i)).toBeInTheDocument();
  });

  it('renders status filter select', () => {
    render(<JobFilters {...mockProps} />);
    // Use getByLabelText to avoid ambiguity (label vs select value)
    expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
  });

  it('renders date range filter select', () => {
    render(<JobFilters {...mockProps} />);
    // Use getByLabelText to avoid ambiguity (label vs select value)
    expect(screen.getByLabelText(/date range/i)).toBeInTheDocument();
  });

  it('calls onSearchChange when typing in search box', () => {
    render(<JobFilters {...mockProps} />);
    const searchInput = screen.getByLabelText(/search jobs by name/i);
    fireEvent.change(searchInput, { target: { value: 'test job' } });
    expect(mockProps.onSearchChange).toHaveBeenCalledWith('test job');
  });

  it('shows clear filters button when filters are active', () => {
    render(<JobFilters {...mockProps} statusFilter="processing" />);
    expect(screen.getByText(/clear filters/i)).toBeInTheDocument();
  });

  it('hides clear filters button when no filters are active', () => {
    render(<JobFilters {...mockProps} />);
    expect(screen.queryByText(/clear filters/i)).not.toBeInTheDocument();
  });

  it('clears all filters when clear button is clicked', () => {
    render(<JobFilters {...mockProps} statusFilter="processing" dateFilter="today" searchQuery="test" />);
    const clearButton = screen.getByText(/clear filters/i);
    fireEvent.click(clearButton);
    expect(mockProps.onStatusFilterChange).toHaveBeenCalledWith('all');
    expect(mockProps.onDateFilterChange).toHaveBeenCalledWith('all');
    expect(mockProps.onSearchChange).toHaveBeenCalledWith('');
  });
});
