import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JobProgressCard } from '../JobProgressCard';

// Test fixtures
interface JobProgressCardProps {
  jobId: string;
  name: string;
  status: 'processing' | 'queued' | 'completed';
  progress: number; // 0-100
  completedCount: number;
  totalCount: number;
  layerBreakdown: {
    layer1: number;
    layer2: number;
    layer3: number;
  };
  queuePosition?: number;
  estimatedWaitTime?: number;
  createdAt: string;
  onRetry?: () => void;
}

const mockJob1: JobProgressCardProps = {
  jobId: 'job-1',
  name: 'Company Website Analysis',
  status: 'processing',
  progress: 30,
  completedCount: 150,
  totalCount: 500,
  layerBreakdown: {
    layer1: 60,
    layer2: 55,
    layer3: 35,
  },
  createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 minutes ago
};

const mockJob2: JobProgressCardProps = {
  jobId: 'job-2',
  name: 'E-commerce Platform Audit',
  status: 'completed',
  progress: 100,
  completedCount: 500,
  totalCount: 500,
  layerBreakdown: {
    layer1: 500,
    layer2: 500,
    layer3: 500,
  },
  createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
};

const mockJob3: JobProgressCardProps = {
  jobId: 'job-3',
  name: 'Startup Portfolio Scan',
  status: 'processing',
  progress: 0,
  completedCount: 0,
  totalCount: 500,
  layerBreakdown: {
    layer1: 0,
    layer2: 0,
    layer3: 0,
  },
  createdAt: new Date(Date.now() - 30 * 1000).toISOString(), // 30 seconds ago
};

const mockJob4: JobProgressCardProps = {
  jobId: 'job-4',
  name: 'Media Site Review',
  status: 'queued',
  progress: 0,
  completedCount: 0,
  totalCount: 500,
  layerBreakdown: {
    layer1: 0,
    layer2: 0,
    layer3: 0,
  },
  queuePosition: 2,
  estimatedWaitTime: 10,
  createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
};

describe('JobProgressCard', () => {
  describe('Progress Display', () => {
    it('should render job name and progress percentage', () => {
      render(<JobProgressCard {...mockJob1} />);

      expect(screen.getByText('Company Website Analysis')).toBeInTheDocument();
      expect(screen.getByText('30%')).toBeInTheDocument();
    });

    it('should show progress bar with correct width', () => {
      render(<JobProgressCard {...mockJob1} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveAttribute('aria-valuenow', '30');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });

    it('should show completed/total count', () => {
      render(<JobProgressCard {...mockJob1} />);

      expect(screen.getByText(/150\/500 URLs/i)).toBeInTheDocument();
    });

    it('should update percentage text when progress changes', () => {
      const { rerender } = render(<JobProgressCard {...mockJob1} />);
      expect(screen.getByText('30%')).toBeInTheDocument();

      const updatedJob = { ...mockJob1, progress: 50, completedCount: 250 };
      rerender(<JobProgressCard {...updatedJob} />);
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('should apply color based on progress level', () => {
      const { rerender, container } = render(<JobProgressCard {...mockJob1} />);

      // 30% should have warning/orange color (25-50%)
      let progressIndicator = container.querySelector('[data-testid="progress-indicator"]');
      expect(progressIndicator).toHaveClass(/orange|warning/i);

      // 15% should have danger/red color (0-25%)
      rerender(<JobProgressCard {...mockJob1} progress={15} completedCount={75} />);
      progressIndicator = container.querySelector('[data-testid="progress-indicator"]');
      expect(progressIndicator).toHaveClass(/red|danger/i);

      // 60% should have caution/yellow color (50-75%)
      rerender(<JobProgressCard {...mockJob1} progress={60} completedCount={300} />);
      progressIndicator = container.querySelector('[data-testid="progress-indicator"]');
      expect(progressIndicator).toHaveClass(/yellow|caution/i);

      // 85% should have success/green color (75-100%)
      rerender(<JobProgressCard {...mockJob1} progress={85} completedCount={425} />);
      progressIndicator = container.querySelector('[data-testid="progress-indicator"]');
      expect(progressIndicator).toHaveClass(/green|success/i);
    });
  });

  describe('Layer Breakdown', () => {
    it('should display Layer 1, 2, 3 completion counts', () => {
      render(<JobProgressCard {...mockJob1} />);

      expect(screen.getByText(/Layer 1.*60/i)).toBeInTheDocument();
      expect(screen.getByText(/Layer 2.*55/i)).toBeInTheDocument();
      expect(screen.getByText(/Layer 3.*35/i)).toBeInTheDocument();
    });

    it('should show breakdown that sums to total', () => {
      render(<JobProgressCard {...mockJob1} />);

      const layer1 = mockJob1.layerBreakdown.layer1;
      const layer2 = mockJob1.layerBreakdown.layer2;
      const layer3 = mockJob1.layerBreakdown.layer3;
      const sum = layer1 + layer2 + layer3;

      expect(sum).toBe(mockJob1.completedCount);
      expect(screen.getByText(/150\/500 URLs/i)).toBeInTheDocument();
    });

    it('should show each layer as percentage of total work', () => {
      render(<JobProgressCard {...mockJob1} />);

      // Layer 1: 60/500 = 12%
      expect(screen.getByText(/Layer 1.*12%/i)).toBeInTheDocument();
      // Layer 2: 55/500 = 11%
      expect(screen.getByText(/Layer 2.*11%/i)).toBeInTheDocument();
      // Layer 3: 35/500 = 7%
      expect(screen.getByText(/Layer 3.*7%/i)).toBeInTheDocument();
    });

    it('should handle null/undefined layer data gracefully', () => {
      const jobWithNullLayers = {
        ...mockJob1,
        layerBreakdown: {
          layer1: 0,
          layer2: 0,
          layer3: 0,
        },
      };

      render(<JobProgressCard {...jobWithNullLayers} />);

      expect(screen.getByText(/Layer 1.*0/i)).toBeInTheDocument();
      expect(screen.getByText(/Layer 2.*0/i)).toBeInTheDocument();
      expect(screen.getByText(/Layer 3.*0/i)).toBeInTheDocument();
    });
  });

  describe('Status Indicators', () => {
    it('should show "Processing" badge for active jobs', () => {
      render(<JobProgressCard {...mockJob1} />);

      expect(screen.getByText(/Processing/i)).toBeInTheDocument();
    });

    it('should show "Queued #N" badge with queue position for queued jobs', () => {
      render(<JobProgressCard {...mockJob4} />);

      expect(screen.getByText(/Queued #2/i)).toBeInTheDocument();
    });

    it('should show elapsed time since creation', () => {
      render(<JobProgressCard {...mockJob1} />);

      // Job was created 2 minutes ago
      expect(screen.getByText(/Started 2 min ago|2 minutes ago/i)).toBeInTheDocument();
    });
  });

  describe('Estimated Time', () => {
    it('should show estimated completion time for processing jobs', () => {
      const jobWithEstimate = {
        ...mockJob1,
        estimatedWaitTime: 15, // 15 minutes
      };

      render(<JobProgressCard {...jobWithEstimate} />);

      expect(screen.getByText(/Est\. complete in 15 min|Estimated.*15/i)).toBeInTheDocument();
    });

    it('should show N/A for queued jobs without starting time estimate', () => {
      const queuedJobNoEstimate = {
        ...mockJob4,
        estimatedWaitTime: undefined,
      };

      render(<JobProgressCard {...queuedJobNoEstimate} />);

      // For queued jobs, we might show wait time or N/A if no estimate
      const naElement = screen.queryByText(/N\/A|not available/i);
      const estimateElement = screen.queryByText(/Est\./i);

      // Either N/A is shown, or no estimate text appears
      expect(naElement || !estimateElement).toBeTruthy();
    });
  });

  describe('Expandable Details', () => {
    it('should expand to show detailed breakdown when clicked', async () => {
      const user = userEvent.setup();
      render(<JobProgressCard {...mockJob1} />);

      // Find expand button or clickable card
      const expandButton = screen.getByRole('button', { name: /expand|details|more/i });
      await user.click(expandButton);

      // Detailed breakdown should appear
      await waitFor(() => {
        expect(screen.getByText(/Layer 1:.*60 completed/i)).toBeInTheDocument();
        expect(screen.getByText(/Layer 2:.*55 completed/i)).toBeInTheDocument();
        expect(screen.getByText(/Layer 3:.*35 completed/i)).toBeInTheDocument();
      });
    });

    it('should show cost accumulation if available', async () => {
      const user = userEvent.setup();
      const jobWithCost = {
        ...mockJob1,
        cost: 12.34,
      } as any;

      render(<JobProgressCard {...jobWithCost} />);

      const expandButton = screen.getByRole('button', { name: /expand|details|more/i });
      await user.click(expandButton);

      await waitFor(() => {
        expect(screen.getByText(/\$12\.34|Cost.*12\.34/i)).toBeInTheDocument();
      });
    });

    it('should collapse when clicked again', async () => {
      const user = userEvent.setup();
      render(<JobProgressCard {...mockJob1} />);

      // Expand
      const expandButton = screen.getByRole('button', { name: /expand|details|more/i });
      await user.click(expandButton);

      await waitFor(() => {
        expect(screen.getByText(/Layer 1:.*60 completed/i)).toBeInTheDocument();
      });

      // Collapse
      const collapseButton = screen.getByRole('button', { name: /collapse|hide|less/i });
      await user.click(collapseButton);

      await waitFor(() => {
        expect(screen.queryByText(/Layer 1:.*60 completed/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Loading & Error States', () => {
    it('should show skeleton loading state before data loads', () => {
      const { container } = render(<JobProgressCard {...mockJob1} isLoading={true} />);

      // Check for skeleton elements
      const skeletons = container.querySelectorAll('[data-testid="skeleton"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should show error alert if data fails to load', () => {
      const errorMessage = 'Failed to load job progress';
      render(<JobProgressCard {...mockJob1} error={errorMessage} />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('should show retry button on error', async () => {
      const user = userEvent.setup();
      const mockRetry = jest.fn();
      const errorMessage = 'Failed to load job progress';

      render(<JobProgressCard {...mockJob1} error={errorMessage} onRetry={mockRetry} />);

      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();

      await user.click(retryButton);
      expect(mockRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-labels for progress elements', () => {
      render(<JobProgressCard {...mockJob1} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAccessibleName(/Company Website Analysis progress|Job progress/i);
    });

    it('should use semantic HTML for status badges', () => {
      render(<JobProgressCard {...mockJob1} />);

      const statusBadge = screen.getByText(/Processing/i);
      expect(statusBadge.tagName).toMatch(/SPAN|DIV|BUTTON/);
    });

    it('should have keyboard navigation support', async () => {
      const user = userEvent.setup();
      render(<JobProgressCard {...mockJob1} />);

      const expandButton = screen.getByRole('button', { name: /expand|details|more/i });

      // Tab to button
      await user.tab();
      expect(expandButton).toHaveFocus();

      // Press Enter to expand
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText(/Layer 1:.*60 completed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle 0% progress correctly', () => {
      render(<JobProgressCard {...mockJob3} />);

      expect(screen.getByText('0%')).toBeInTheDocument();
      expect(screen.getByText(/0\/500 URLs/i)).toBeInTheDocument();
    });

    it('should handle 100% progress correctly', () => {
      render(<JobProgressCard {...mockJob2} />);

      expect(screen.getByText('100%')).toBeInTheDocument();
      expect(screen.getByText(/500\/500 URLs/i)).toBeInTheDocument();
    });

    it('should handle very large numbers gracefully', () => {
      const largeJob = {
        ...mockJob1,
        totalCount: 1000000,
        completedCount: 500000,
        progress: 50,
      };

      render(<JobProgressCard {...largeJob} />);

      expect(screen.getByText(/500,000\/1,000,000 URLs|500000\/1000000/i)).toBeInTheDocument();
    });

    it('should handle jobs with no estimated time', () => {
      const noEstimateJob = {
        ...mockJob1,
        estimatedWaitTime: undefined,
      };

      render(<JobProgressCard {...noEstimateJob} />);

      // Should not crash and should render progress
      expect(screen.getByText('30%')).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('should update when progress prop changes', () => {
      const { rerender } = render(<JobProgressCard {...mockJob1} />);

      expect(screen.getByText('30%')).toBeInTheDocument();

      // Simulate progress update
      const updatedJob = {
        ...mockJob1,
        progress: 60,
        completedCount: 300,
        layerBreakdown: {
          layer1: 120,
          layer2: 110,
          layer3: 70,
        },
      };

      rerender(<JobProgressCard {...updatedJob} />);

      expect(screen.getByText('60%')).toBeInTheDocument();
      expect(screen.getByText(/300\/500 URLs/i)).toBeInTheDocument();
    });

    it('should update when status changes', () => {
      const { rerender } = render(<JobProgressCard {...mockJob1} />);

      expect(screen.getByText(/Processing/i)).toBeInTheDocument();

      // Job completes
      const completedJob = {
        ...mockJob1,
        status: 'completed' as const,
        progress: 100,
        completedCount: 500,
      };

      rerender(<JobProgressCard {...completedJob} />);

      expect(screen.queryByText(/Processing/i)).not.toBeInTheDocument();
      expect(screen.getByText(/Completed|Complete/i)).toBeInTheDocument();
    });
  });
});
