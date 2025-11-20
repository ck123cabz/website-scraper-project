'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Clock,
  DollarSign,
  FileText,
  Pause,
  Play,
  RotateCcw,
  Trash2,
  XCircle,
} from 'lucide-react';
import { jobsApi, resultsApi } from '@/lib/api-client';
import { formatTimestamp } from '@website-scraper/shared';
import type { Job, UrlResult } from '@website-scraper/shared';
import { JobStatusBadge } from './JobStatusBadge';
import { ExportButton } from './ExportButton';
import { LayerFactorsDisplay } from './LayerFactorsDisplay';
import { toast } from 'sonner';

interface JobDetailViewProps {
  jobId: string;
}

export function JobDetailView({ jobId }: JobDetailViewProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: job, isLoading, error } = useQuery({
    queryKey: ['job', jobId],
    queryFn: async () => {
      const response = await jobsApi.getById(jobId);
      return response.data as Job;
    },
    refetchInterval: (data) => {
      // Poll every 5 seconds if job is active
      return data?.status === 'processing' || data?.status === 'paused' ? 5000 : false;
    },
  });

  // Fetch sample results for layer factor display (only for completed jobs)
  const { data: resultsResponse } = useQuery({
    queryKey: ['job-results-sample', jobId],
    queryFn: async () => {
      const response = await resultsApi.getJobResults(jobId, {
        page: 1,
        pageSize: 20, // Note: API expects 'pageSize', not 'limit'
        filter: 'all'
      });
      return response;
    },
    enabled: job?.status === 'completed',
  });

  const sampleResults: UrlResult[] = resultsResponse?.data || [];

  const pauseMutation = useMutation({
    mutationFn: () => jobsApi.pause(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      toast.success('Job paused successfully');
    },
    onError: () => {
      toast.error('Failed to pause job');
    },
  });

  const resumeMutation = useMutation({
    mutationFn: () => jobsApi.resume(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      toast.success('Job resumed successfully');
    },
    onError: () => {
      toast.error('Failed to resume job');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => jobsApi.cancel(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      toast.success('Job cancelled successfully');
    },
    onError: () => {
      toast.error('Failed to cancel job');
    },
  });

  const retryMutation = useMutation({
    mutationFn: () => jobsApi.retry(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      toast.success('Job retry initiated successfully');
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.error || 'Failed to retry job';
      toast.error(errorMessage);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => jobsApi.deleteJob(jobId),
    onSuccess: () => {
      toast.success('Job deleted successfully');
      router.push('/jobs/all');
    },
    onError: () => {
      toast.error('Failed to delete job');
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full max-w-[300px]" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-4 w-[100px]" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[120px]" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load job details. The job may not exist or there was an error.
          </AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    );
  }

  const isActive = job.status === 'processing' || job.status === 'paused';
  const canPause = job.status === 'processing';
  const canResume = job.status === 'paused';
  const canCancel = job.status === 'processing' || job.status === 'paused';
  const canRetry = job.status === 'failed';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="mb-2 -ml-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">
            {job.name || 'Untitled Job'}
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <JobStatusBadge status={job.status} />
            <span className="text-sm text-muted-foreground">ID: {job.id.slice(0, 8)}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canPause && (
            <Button
              variant="outline"
              onClick={() => pauseMutation.mutate()}
              disabled={pauseMutation.isPending}
            >
              <Pause className="mr-2 h-4 w-4" />
              Pause
            </Button>
          )}
          {canResume && (
            <Button
              variant="outline"
              onClick={() => resumeMutation.mutate()}
              disabled={resumeMutation.isPending}
            >
              <Play className="mr-2 h-4 w-4" />
              Resume
            </Button>
          )}
          {canRetry && (
            <Button
              variant="outline"
              onClick={() => retryMutation.mutate()}
              disabled={retryMutation.isPending}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          )}
          {canCancel && (
            <Button
              variant="outline"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          )}
          {job.status === 'completed' && (
            <ExportButton jobId={job.id} jobName={job.name || undefined} />
          )}
          <Button
            variant="destructive"
            onClick={() => {
              if (
                window.confirm(
                  'Are you sure you want to delete this job? This action cannot be undone.'
                )
              ) {
                deleteMutation.mutate();
              }
            }}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Progress Section (for active jobs) */}
      {isActive && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Processing Progress</span>
                <span className="text-2xl font-bold">
                  {Math.round(job.progressPercentage ?? 0)}%
                </span>
              </div>
              <Progress value={job.progressPercentage ?? 0} className="h-3" />
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {job.processedUrls} / {job.totalUrls} URLs processed
                </span>
                {job.processingRate != null && job.processingRate > 0 && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {job.processingRate.toFixed(1)} URLs/min
                  </span>
                )}
              </div>
              {job.estimatedTimeRemaining && job.estimatedTimeRemaining > 0 && (
                <div className="text-sm text-muted-foreground">
                  Estimated time remaining: {Math.ceil(job.estimatedTimeRemaining / 60)} minutes
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Job Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total URLs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div className="text-2xl font-bold">{job.totalUrls}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Successful
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <div className="text-2xl font-bold text-green-600">
                {job.successfulUrls}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Rejected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500" />
              <div className="text-2xl font-bold text-red-600">{job.rejectedUrls}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <div className="text-2xl font-bold">${(job.totalCost ?? 0).toFixed(4)}</div>
            </div>
            {job.avgCostPerUrl != null && job.avgCostPerUrl > 0 && (
              <div className="mt-1 text-xs text-muted-foreground">
                ${job.avgCostPerUrl.toFixed(4)} per URL
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Job Details */}
      <Card>
        <CardHeader>
          <CardTitle>Job Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">Created</span>
              </div>
              <div className="text-sm">{formatTimestamp(job.createdAt)}</div>
            </div>

            {job.startedAt && (
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">Started</span>
                </div>
                <div className="text-sm">{formatTimestamp(job.startedAt)}</div>
              </div>
            )}

            {job.completedAt && (
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">Completed</span>
                </div>
                <div className="text-sm">{formatTimestamp(job.completedAt)}</div>
              </div>
            )}

            <div>
              <div className="text-sm text-muted-foreground mb-1 font-medium">
                Last Updated
              </div>
              <div className="text-sm">{formatTimestamp(job.updatedAt)}</div>
            </div>
          </div>

          {job.currentUrl && (
            <>
              <Separator />
              <div>
                <div className="text-sm text-muted-foreground mb-2 font-medium">
                  Currently Processing
                </div>
                <div className="text-sm font-mono bg-muted p-3 rounded-md break-all">
                  {job.currentUrl}
                </div>
                {job.currentStage && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Stage: {job.currentStage}
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Results Section (if completed) */}
      {job.status === 'completed' && (
        <Card>
          <CardHeader>
            <CardTitle>Job Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <div className="text-sm text-muted-foreground mb-1">Success Rate</div>
                  <div className="text-2xl font-bold">
                    {job.totalUrls > 0
                      ? Math.round((job.successfulUrls / job.totalUrls) * 100)
                      : 0}
                    %
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="text-sm text-muted-foreground mb-1">Failed URLs</div>
                  <div className="text-2xl font-bold">{job.failedUrls}</div>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="text-sm text-muted-foreground mb-1">AI Cost Breakdown</div>
                  <div className="text-sm space-y-1">
                    <div>Gemini: ${(job.geminiCost ?? 0).toFixed(4)}</div>
                    <div>GPT: ${(job.gptCost ?? 0).toFixed(4)}</div>
                  </div>
                </div>
              </div>

              <div className="flex justify-center pt-4">
                <ExportButton
                  jobId={job.id}
                  jobName={job.name || undefined}
                  variant="outline"
                  size="lg"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Layer Factors Display (for completed jobs with results) */}
      {job.status === 'completed' && sampleResults && sampleResults.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Sample Results Analysis</h2>
            <span className="text-sm text-muted-foreground">
              Showing first {sampleResults.length} results
            </span>
          </div>

          {sampleResults.map((result, index) => (
            <div key={result.id} className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium break-all mb-1">{result.url}</div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>Status: {result.status}</span>
                    {result.eliminated_at_layer && (
                      <span>Eliminated at: {result.eliminated_at_layer}</span>
                    )}
                    {result.confidence_band && (
                      <span>Confidence: {result.confidence_band}</span>
                    )}
                  </div>
                </div>
              </div>

              <LayerFactorsDisplay
                layer1={(result as any).layer1Factors}
                layer2={(result as any).layer2Factors}
                layer3={(result as any).layer3Factors}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
