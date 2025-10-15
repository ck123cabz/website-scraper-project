import { JobList } from '@/components/job-list';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
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
        <Link href="/jobs/new">
          <Button size="lg" className="gap-2" data-testid="new-job-button">
            <Plus className="h-5 w-5" />
            New Job
          </Button>
        </Link>
      </div>

      {/* Job List */}
      <JobList />
    </div>
  );
}
