/**
 * CompletedJobsSection Usage Examples
 *
 * This component displays recently completed jobs (last 24 hours) with:
 * - Table layout on desktop, card layout on mobile
 * - Quick download button that opens ExportDialog
 * - Links to job detail pages
 * - Loading skeleton support
 * - Auto-hides when no jobs
 */

import { CompletedJobsSection } from './CompletedJobsSection';

// Example 1: Basic usage with completed jobs
export function BasicExample() {
  const completedJobs = [
    {
      id: 'job-1',
      name: 'Website Analysis',
      completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      urlCount: 500,
      totalCost: 5.0,
    },
    {
      id: 'job-2',
      name: 'API Testing',
      completedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      urlCount: 1000,
      totalCost: 10.0,
    },
  ];

  return <CompletedJobsSection jobs={completedJobs} />;
}

// Example 2: Loading state
export function LoadingExample() {
  return <CompletedJobsSection jobs={[]} isLoading={true} />;
}

// Example 3: Empty state (component won't render)
export function EmptyExample() {
  return <CompletedJobsSection jobs={[]} />;
}

// Example 4: Integrated in dashboard
export function DashboardExample() {
  // Fetch completed jobs from API
  const { data: completedJobs, isLoading } = useCompletedJobs();

  return (
    <div className="space-y-6">
      <h1>Dashboard</h1>

      {/* Other dashboard sections */}

      {/* Completed Jobs Section */}
      <CompletedJobsSection
        jobs={completedJobs || []}
        isLoading={isLoading}
      />
    </div>
  );
}

// Helper hook example (not included in component)
function useCompletedJobs() {
  // This would fetch from your API
  // Filter jobs completed in last 24 hours
  return {
    data: [
      {
        id: 'job-1',
        name: 'Website Analysis',
        completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        urlCount: 500,
        totalCost: 5.0,
      },
    ],
    isLoading: false,
  };
}
