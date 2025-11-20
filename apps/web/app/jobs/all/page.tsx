import { Metadata } from 'next';
import { JobsTable } from '@/components/jobs/JobsTable';

export const metadata: Metadata = {
  title: 'All Jobs | Website Scraper',
  description: 'View and manage all scraping jobs',
};

export default function AllJobsPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">All Jobs</h1>
        <p className="text-muted-foreground mt-2">
          View and manage all your scraping jobs
        </p>
      </div>

      <JobsTable />
    </div>
  );
}
