import { QuickStats } from '@/components/home/QuickStats';
import { DashboardViewWrapper } from '@/components/home/DashboardViewWrapper';
import { RecentActivity } from '@/components/home/RecentActivity';
import { QuickActions } from '@/components/home/QuickActions';

/**
 * HomePage is a Server Component that composes the dashboard layout.
 * The DashboardViewWrapper handles client-side view switching for optimal performance.
 * This separation allows most of the page to be server-rendered with static content.
 *
 * @see https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns
 */
export default function HomePage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor your URL processing jobs and system statistics
          </p>
        </div>
        <QuickActions />
      </div>

      {/* Quick Stats Section */}
      <QuickStats />

      {/* Jobs Section - Client component for view switching */}
      <DashboardViewWrapper />

      {/* Recent Activity Section */}
      <RecentActivity />
    </div>
  );
}
