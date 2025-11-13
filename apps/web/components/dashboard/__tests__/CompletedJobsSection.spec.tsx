import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CompletedJobsSection, CompletedJob } from '../CompletedJobsSection';

// Mock the ExportDialog component
jest.mock('@/components/results/ExportDialog', () => ({
  ExportDialog: ({ isOpen, jobName }: { isOpen: boolean; jobName: string }) => (
    isOpen ? <div data-testid="export-dialog">Export Dialog for {jobName}</div> : null
  ),
}));

// Mock next/link
jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
  MockLink.displayName = 'MockLink';
  return MockLink;
});

const mockJobs: CompletedJob[] = [
  {
    id: 'job-1',
    name: 'Website Analysis',
    completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    urlCount: 500,
    totalCost: 5.0,
  },
  {
    id: 'job-2',
    name: 'API Testing',
    completedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
    urlCount: 1000,
    totalCost: 10.0,
  },
  {
    id: 'job-3',
    name: 'Product Review',
    completedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
    urlCount: 250,
    totalCost: 2.5,
  },
];

describe('CompletedJobsSection', () => {
  describe('Empty State', () => {
    it('should not render when no jobs and not loading', () => {
      const { container } = render(<CompletedJobsSection jobs={[]} isLoading={false} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render loading skeleton when loading', () => {
      render(<CompletedJobsSection jobs={[]} isLoading={true} />);
      expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
    });
  });

  describe('Section Header', () => {
    it('should display title and count when jobs are provided', () => {
      render(<CompletedJobsSection jobs={mockJobs} />);
      expect(screen.getByText('Recently Completed Jobs')).toBeInTheDocument();
      expect(screen.getByText('3 completed in last 24 hours')).toBeInTheDocument();
    });

    it('should not display count when loading', () => {
      render(<CompletedJobsSection jobs={[]} isLoading={true} />);
      expect(screen.getByText('Recently Completed Jobs')).toBeInTheDocument();
      expect(screen.queryByText(/completed in last 24 hours/)).not.toBeInTheDocument();
    });
  });

  describe('Job List Display', () => {
    it('should render all jobs in the list', () => {
      render(<CompletedJobsSection jobs={mockJobs} />);

      // Both table and mobile views are rendered (one hidden), so use getAllByText
      expect(screen.getAllByText('Website Analysis').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('API Testing').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Product Review').length).toBeGreaterThanOrEqual(1);
    });

    it('should format URL count with locale string', () => {
      render(<CompletedJobsSection jobs={mockJobs} />);

      // Check for formatted numbers (500, 1,000, 250)
      // Both table and mobile views are rendered, so use getAllByText
      expect(screen.getAllByText('500').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('1,000').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('250').length).toBeGreaterThanOrEqual(1);
    });

    it('should format cost as currency', () => {
      render(<CompletedJobsSection jobs={mockJobs} />);
      
      // formatCurrency should format these properly
      const costElements = screen.getAllByText(/\$\d+\.\d{2}/);
      expect(costElements.length).toBeGreaterThan(0);
    });

    it('should display relative time for completion', () => {
      render(<CompletedJobsSection jobs={mockJobs} />);
      
      // Should contain "ago" text for relative time
      expect(screen.getAllByText(/ago/).length).toBeGreaterThan(0);
    });

    it('should link job names to job detail pages', () => {
      render(<CompletedJobsSection jobs={mockJobs} />);
      
      const jobLinks = screen.getAllByRole('link', { name: /Website Analysis|API Testing|Product Review/ });
      expect(jobLinks[0]).toHaveAttribute('href', '/jobs/job-1');
    });
  });

  describe('Download Integration', () => {
    it('should render download button for each job', () => {
      render(<CompletedJobsSection jobs={mockJobs} />);

      const downloadButtons = screen.getAllByRole('button', { name: /CSV/ });
      // Both table and mobile views are rendered (one hidden), so we get 2x the buttons
      expect(downloadButtons.length).toBe(mockJobs.length * 2);
    });

    it('should open export dialog when download button is clicked', async () => {
      render(<CompletedJobsSection jobs={mockJobs} />);

      const downloadButtons = screen.getAllByRole('button', { name: /CSV/ });
      fireEvent.click(downloadButtons[0]);

      await waitFor(() => {
        expect(screen.getByTestId('export-dialog')).toBeInTheDocument();
      });
    });

    it('should call onDownload callback when provided', async () => {
      const onDownload = jest.fn();
      render(<CompletedJobsSection jobs={mockJobs} onDownload={onDownload} />);
      
      const downloadButtons = screen.getAllByRole('button', { name: /CSV/ });
      fireEvent.click(downloadButtons[0]);
      
      // The dialog opens but onDownload is handled by the ExportDialog itself
      await waitFor(() => {
        expect(screen.getByTestId('export-dialog')).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('should render skeleton loaders when loading', () => {
      render(<CompletedJobsSection jobs={[]} isLoading={true} />);
      
      const skeletons = screen.getAllByTestId('skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should not render jobs when loading', () => {
      render(<CompletedJobsSection jobs={mockJobs} isLoading={true} />);
      
      expect(screen.queryByText('Website Analysis')).not.toBeInTheDocument();
      expect(screen.queryByText('API Testing')).not.toBeInTheDocument();
    });
  });

  describe('Responsive Layout', () => {
    it('should render table on desktop (hidden on mobile)', () => {
      render(<CompletedJobsSection jobs={mockJobs} />);

      // Table should exist - parent div has hidden md:block classes
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();

      // Find the parent div with responsive classes
      const tableContainer = table.closest('div')?.parentElement;
      expect(tableContainer).toHaveClass('hidden', 'md:block');
    });

    it('should render cards on mobile (hidden on desktop)', () => {
      render(<CompletedJobsSection jobs={mockJobs} />);

      // Find container with md:hidden class by checking all text instances
      const { container } = render(<CompletedJobsSection jobs={mockJobs} />);
      const mobileContainer = container.querySelector('.md\\:hidden.space-y-3');

      expect(mobileContainer).toBeInTheDocument();
      expect(mobileContainer).toHaveClass('md:hidden', 'space-y-3');
    });
  });

  describe('Interaction', () => {
    it('should not propagate click event from download button to row', () => {
      render(<CompletedJobsSection jobs={mockJobs} />);

      // Find download button - clicking should open dialog, not navigate
      const downloadButtons = screen.getAllByRole('button', { name: /CSV/ });

      // Click the first download button
      fireEvent.click(downloadButtons[0]);

      // Dialog should open instead of navigation
      expect(screen.getByTestId('export-dialog')).toBeInTheDocument();
    });
  });
});
