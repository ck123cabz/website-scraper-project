import { Metadata } from 'next';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';

export const metadata: Metadata = {
  title: 'Analytics | Website Scraper',
  description: 'View analytics and insights for your URL processing jobs',
};

/**
 * Analytics page - Server Component that displays job metrics and charts.
 * Shows success rates, processing times, and activity trends.
 *
 * @see Story ui-overhaul-4 (Analytics & Settings)
 */
export default function AnalyticsPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            View insights and performance metrics for your URL processing jobs
          </p>
        </div>
      </div>

      {/* Analytics Dashboard - Client component for interactive charts */}
      <AnalyticsDashboard />
    </div>
  );
}
