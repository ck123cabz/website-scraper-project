'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Download, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { jobsApi, resultsApi } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import type { Job } from '@website-scraper/shared';

interface QuickActionsProps {
  className?: string;
}

export function QuickActions({ className }: QuickActionsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  // Get recent completed jobs for export
  const { data: jobs } = useQuery({
    queryKey: ['jobs', 'recent-completed'],
    queryFn: async () => {
      const response = await jobsApi.getQueueStatus({ includeCompleted: true, limit: 10 });
      const { activeJobs = [], completedJobs = [] } = response.data as any;
      const allJobs = [...activeJobs, ...completedJobs] as Job[];
      return allJobs.filter((job) => job.status === 'completed').slice(0, 10);
    },
  });

  const handleNewJob = () => {
    router.push('/jobs/new');
  };

  const handleExportRecent = async () => {
    if (!jobs || jobs.length === 0) {
      toast({
        title: 'No completed jobs',
        description: 'There are no completed jobs to export.',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);

    try {
      // Export results from the most recent completed job
      const mostRecentJob = jobs[0];

      const blob = await resultsApi.exportJobResults(mostRecentJob.id, {
        format: 'complete',
      });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${mostRecentJob.name || 'results'}-export.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Export successful',
        description: `Exported results from "${mostRecentJob.name || 'Untitled Job'}"`,
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: 'Export failed',
        description: 'Failed to export job results. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Button onClick={handleNewJob} size="default" className="gap-2">
        <Plus className="h-4 w-4" />
        New Job
      </Button>
      <Button
        onClick={handleExportRecent}
        variant="outline"
        size="default"
        className="gap-2"
        disabled={isExporting || !jobs || jobs.length === 0}
      >
        <Download className="h-4 w-4" />
        {isExporting ? 'Exporting...' : 'Export Recent'}
      </Button>
    </div>
  );
}
