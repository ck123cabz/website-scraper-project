import { Metadata } from 'next';
import { JobDetailView } from '@/components/jobs/JobDetailView';

type Props = {
  params: { id: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title: `Job ${params.id.slice(0, 8)} | Website Scraper`,
    description: 'View job details and results',
  };
}

/**
 * Job detail page - Server Component
 *
 * This page displays comprehensive job information including:
 * - Job metadata cards (name, status, dates, progress)
 * - Results table with enhanced styling
 * - Layer 1/2/3 factors in expandable sections
 * - Export functionality with options
 * - Action buttons (retry, cancel, delete)
 * - Breadcrumb navigation
 */
export default function JobDetailPage({ params }: Props) {
  return (
    <div className="container mx-auto py-8 px-4">
      <JobDetailView jobId={params.id} />
    </div>
  );
}
