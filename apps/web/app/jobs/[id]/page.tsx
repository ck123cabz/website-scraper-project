import { JobDetailClient } from "@/components/job-detail-client"
import { Metadata } from "next"

interface PageProps {
  params: { id: string };
}

/**
 * Job detail page - Server Component
 *
 * This page displays comprehensive job progress information including:
 * - Real-time progress bar with color coding
 * - Comprehensive metrics (processed URLs, rate, time, success/failures)
 * - Live processing indicator
 * - Job status and current URL
 *
 * The actual data fetching and real-time updates are handled by the
 * JobDetailClient component using React Query and Supabase Realtime.
 */
export default function JobDetailPage({ params }: PageProps) {
  return <JobDetailClient jobId={params.id} />;
}

/**
 * Generate metadata for the page
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return {
    title: `Job ${params.id.slice(0, 8)} | Website Scraper`,
    description: "View detailed progress and metrics for your scraping job",
  };
}
