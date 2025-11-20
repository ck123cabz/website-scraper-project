import { Metadata } from 'next';
import { JobsTable } from '@/components/jobs/JobsTable';

export const metadata: Metadata = {
  title: 'Active Jobs | Website Scraper',
  description: 'View and manage active scraping jobs',
};

export default function ActiveJobsPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Active Jobs</h1>
        <p className="text-muted-foreground mt-2">
          Jobs currently processing or paused
        </p>
      </div>

      <JobsTable filterActive />
    </div>
  );
}
