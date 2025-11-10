'use client';

import { JobList } from '@/components/job-list';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Settings, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { useDashboardBadge } from '@/hooks/useDashboardBadge';

// Force dynamic rendering - don't prerender at build time
// Supabase env vars are only available at runtime in Railway
export const dynamic = 'force-dynamic';

/**
 * DashboardPage Component (Phase 6: T043)
 *
 * Main dashboard page with manual review queue badge UI.
 * The badge displays queue count when dashboard_badge setting is enabled.
 *
 * Features:
 * - Displays badge next to Manual Review button showing active queue count
 * - Badge only visible when dashboard_badge setting is enabled
 * - Uses useDashboardBadge hook to fetch queue status and settings
 * - Loads within 1 second for badge display
 */
export default function DashboardPage() {
  const { queueCount, isEnabled } = useDashboardBadge();

  return (
    <div className="container mx-auto py-8 px-4" data-testid="dashboard-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-8" data-testid="dashboard-header">
        <div>
          <h1 className="text-3xl font-bold mb-2" data-testid="dashboard-title">Job Dashboard</h1>
          <p className="text-muted-foreground" data-testid="dashboard-description">
            Monitor your scraping jobs in real-time
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/manual-review">
            <Button size="lg" variant="outline" className="gap-2 relative" data-testid="manual-review-button">
              <ClipboardList className="h-5 w-5" />
              Manual Review
              {/* Dashboard Badge - shows when enabled and queue has items */}
              {isEnabled && queueCount > 0 && (
                <Badge
                  className="ml-2 bg-red-500 text-white hover:bg-red-600"
                  data-testid="manual-review-badge"
                >
                  {queueCount}
                </Badge>
              )}
            </Button>
          </Link>
          <Link href="/settings">
            <Button size="lg" variant="outline" className="gap-2" data-testid="settings-button">
              <Settings className="h-5 w-5" />
              Settings
            </Button>
          </Link>
          <Link href="/jobs/new">
            <Button size="lg" className="gap-2" data-testid="new-job-button">
              <Plus className="h-5 w-5" />
              New Job
            </Button>
          </Link>
        </div>
      </div>

      {/* Job List */}
      <JobList />
    </div>
  );
}
