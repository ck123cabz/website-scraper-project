'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { formatCurrency } from '@website-scraper/shared';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ExportDialog } from '@/components/results/ExportDialog';
import Link from 'next/link';

export interface CompletedJob {
  id: string;
  name: string;
  completedAt: string;
  urlCount: number;
  totalCost: number;
}

export interface CompletedJobsSectionProps {
  jobs: CompletedJob[];
  isLoading?: boolean;
  onDownload?: (jobId: string, format: string) => void;
}

// Skeleton component for loading state
const Skeleton = ({ className }: { className?: string }) => (
  <div
    data-testid="skeleton"
    className={cn('animate-pulse rounded-md bg-muted', className)}
  />
);

// Skeleton for table row
const TableRowSkeleton = () => (
  <TableRow>
    <TableCell>
      <Skeleton className="h-4 w-48" />
    </TableCell>
    <TableCell>
      <Skeleton className="h-4 w-24" />
    </TableCell>
    <TableCell>
      <Skeleton className="h-4 w-16" />
    </TableCell>
    <TableCell>
      <Skeleton className="h-4 w-16" />
    </TableCell>
    <TableCell>
      <Skeleton className="h-8 w-20" />
    </TableCell>
  </TableRow>
);

// Mobile card view for completed jobs
const JobCard = ({ job, onDownloadClick }: { job: CompletedJob; onDownloadClick: () => void }) => (
  <Card className="hover:shadow-md transition-shadow">
    <CardContent className="p-4 space-y-3">
      <div className="flex justify-between items-start">
        <Link
          href={`/jobs/${job.id}`}
          className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
        >
          {job.name}
        </Link>
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.preventDefault();
            onDownloadClick();
          }}
          className="ml-2 flex-shrink-0"
        >
          <Download className="h-4 w-4 mr-1" />
          CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
        <div>
          <span className="font-medium">Completed:</span>
          <div>{formatDistanceToNow(new Date(job.completedAt), { addSuffix: true })}</div>
        </div>
        <div>
          <span className="font-medium">URLs:</span>
          <div>{job.urlCount.toLocaleString()}</div>
        </div>
        <div className="col-span-2">
          <span className="font-medium">Cost:</span>
          <span className="ml-1">{formatCurrency(job.totalCost)}</span>
        </div>
      </div>
    </CardContent>
  </Card>
);

// Mobile card view skeleton
const JobCardSkeleton = () => (
  <Card>
    <CardContent className="p-4 space-y-3">
      <Skeleton className="h-5 w-3/4" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </CardContent>
  </Card>
);

export function CompletedJobsSection({
  jobs,
  isLoading = false,
}: CompletedJobsSectionProps) {
  const [exportDialogState, setExportDialogState] = useState<{
    isOpen: boolean;
    jobId: string;
    jobName: string;
  }>({
    isOpen: false,
    jobId: '',
    jobName: '',
  });

  // Don't render section if no jobs and not loading
  if (!isLoading && jobs.length === 0) {
    return null;
  }

  const handleDownloadClick = (job: CompletedJob) => {
    setExportDialogState({
      isOpen: true,
      jobId: job.id,
      jobName: job.name,
    });
  };

  const handleExportDialogClose = () => {
    setExportDialogState({
      isOpen: false,
      jobId: '',
      jobName: '',
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recently Completed Jobs</CardTitle>
            {!isLoading && jobs.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {jobs.length} completed in last 24 hours
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job Name</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead className="text-right">URLs</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <>
                    <TableRowSkeleton />
                    <TableRowSkeleton />
                    <TableRowSkeleton />
                  </>
                ) : (
                  jobs.map((job) => (
                    <TableRow
                      key={job.id}
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => window.location.href = `/jobs/${job.id}`}
                    >
                      <TableCell className="font-medium">
                        <Link
                          href={`/jobs/${job.id}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {job.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {formatDistanceToNow(new Date(job.completedAt), {
                          addSuffix: true
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        {job.urlCount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(job.totalCost)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadClick(job);
                          }}
                          className="h-8"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          CSV
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {isLoading ? (
              <>
                <JobCardSkeleton />
                <JobCardSkeleton />
                <JobCardSkeleton />
              </>
            ) : (
              jobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onDownloadClick={() => handleDownloadClick(job)}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Export Dialog */}
      <ExportDialog
        jobId={exportDialogState.jobId}
        jobName={exportDialogState.jobName}
        isOpen={exportDialogState.isOpen}
        onOpenChange={handleExportDialogClose}
      />
    </>
  );
}
