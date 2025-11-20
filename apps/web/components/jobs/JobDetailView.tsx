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
import { formatTimestamp, formatDurationHumanReadable, calculateProcessingRate } from '@website-scraper/shared';
import type { Job, UrlResult } from '@website-scraper/shared';
import { JobStatusBadge } from './JobStatusBadge';
import { ExportButton } from './ExportButton';
import { LayerFactorsDisplay } from './LayerFactorsDisplay';
import { toast } from 'sonner';
import { useJob, jobKeys } from '@/hooks/use-jobs';
import { useState, useEffect } from 'react';

interface JobDetailViewProps {
  jobId: string;
}

export function JobDetailView({ jobId }: JobDetailViewProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Use the useJob hook for proper real-time updates with consistent cache keys
  const { data: job, isLoading, error } = useJob(jobId, { enableRealtime: true });

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

  // Live timer state for elapsed and estimated time
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update timer every second for live counting
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Calculate elapsed time
  const elapsedSeconds = job?.startedAt
    ? Math.floor(
        ((job.completedAt ? new Date(job.completedAt).getTime() : currentTime) -
         new Date(job.startedAt).getTime()) / 1000
      )
    : 0;

  // Calculate processing rate
  const processingRate = job?.startedAt && elapsedSeconds > 0
    ? calculateProcessingRate(job.processedUrls, elapsedSeconds)
    : 0;

  // Calculate estimated remaining time
  const estimatedRemainingSeconds =
    (job?.status === 'processing' || job?.status === 'paused') &&
    job?.processedUrls >= 3 &&
    processingRate > 0
      ? Math.ceil((job.totalUrls - job.processedUrls) / processingRate * 60)
      : null;

  const pauseMutation = useMutation({
    mutationFn: () => jobsApi.pause(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.detail(jobId) });
      toast.success('Job paused successfully');
    },
    onError: () => {
      toast.error('Failed to pause job');
    },
  });

  const resumeMutation = useMutation({
    mutationFn: () => jobsApi.resume(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.detail(jobId) });
      toast.success('Job resumed successfully');
    },
    onError: () => {
      toast.error('Failed to resume job');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => jobsApi.cancel(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.detail(jobId) });
      toast.success('Job cancelled successfully');
    },
    onError: () => {
      toast.error('Failed to cancel job');
    },
  });

  const retryMutation = useMutation({
    mutationFn: () => jobsApi.retry(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.detail(jobId) });
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

      {/* Progress Section (for active jobs) - Enhanced with layer visibility */}
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
                {processingRate > 0 && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {processingRate.toFixed(1)} URLs/min
                  </span>
                )}
              </div>

              {/* Elapsed Time Display */}
              {job.startedAt && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>
                    Elapsed: <span className="font-medium text-foreground">{formatDurationHumanReadable(elapsedSeconds)}</span>
                  </span>
                </div>
              )}

              {/* Estimated Remaining Time Display */}
              {estimatedRemainingSeconds !== null && estimatedRemainingSeconds > 0 && (
                <div className="text-sm text-muted-foreground">
                  Estimated remaining: <span className="font-medium text-foreground">~{formatDurationHumanReadable(estimatedRemainingSeconds)}</span>
                </div>
              )}

              {/* Show "Calculating..." if job is processing but not enough data yet */}
              {(job.status === 'processing' || job.status === 'paused') && job.processedUrls < 3 && (
                <div className="text-sm text-muted-foreground italic">
                  Estimated time remaining: Calculating...
                </div>
              )}

              {/* Current Processing State - Multiple URLs */}
              {job.currentUrls && job.currentUrls.length > 0 && (
                <div className="mt-4 pt-4 border-t space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Real-Time Processing</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                      {job.currentUrls.length} URL{job.currentUrls.length > 1 ? 's' : ''} active
                    </span>
                  </div>

                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {job.currentUrls.map((entry: any, idx: number) => {
                      // Handle both snake_case (started_at) and camelCase (startedAt)
                      const startedAt = entry.startedAt || entry.started_at;
                      const secondsAgo = startedAt
                        ? Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
                        : 0;

                      return (
                        <div key={idx} className="bg-muted/50 p-2 rounded space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium">
                              Layer {entry.layer} of 3
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {secondsAgo}s ago
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground break-all">
                            {entry.url}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {entry.layer === 1 ? 'Domain analysis (fast)' :
                             entry.layer === 2 ? 'Homepage scraping + filtering' :
                             entry.layer === 3 ? 'LLM classification (expensive)' :
                             'Pipeline processing'}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="text-xs text-blue-600 text-center">
                    Concurrency: Up to 10 URLs processing simultaneously
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Job Metrics - Redesigned for clarity */}
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
              Approved (Layer 3)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <div className="text-2xl font-bold text-green-600">
                {job.successfulUrls ?? 0}
              </div>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              LLM classified as suitable
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Not Suitable (Layer 3)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500" />
              <div className="text-2xl font-bold text-red-600">
                {job.rejectedUrls ?? 0}
              </div>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              LLM classified as not suitable
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Eliminated Early (L1+L2)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-orange-500" />
              <div className="text-2xl font-bold text-orange-600">
                {(job.layer1EliminatedCount ?? 0) + (job.layer2EliminatedCount ?? 0)}
              </div>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Filtered before LLM analysis
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3-Tier Pipeline Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            3-Tier Pipeline Analysis
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Progressive filtering reduces costs by eliminating unsuitable URLs before expensive LLM analysis
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Layer 1 */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  <span className="font-semibold">Layer 1 - Domain Analysis</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {job.layer1EliminatedCount ?? 0} eliminated
                </span>
              </div>
              <div className="text-xs text-muted-foreground pl-4">
                Fast domain-level filtering (pattern matching, no API calls)
              </div>
              {job.estimatedSavings > 0 && job.layer1EliminatedCount > 0 && (
                <div className="text-xs text-green-600 pl-4">
                  Saved: ${((job.layer1EliminatedCount / ((job.layer1EliminatedCount ?? 0) + (job.layer2EliminatedCount ?? 0)) || 0) * job.estimatedSavings).toFixed(4)}
                </div>
              )}
            </div>

            {/* Layer 2 */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-purple-500" />
                  <span className="font-semibold">Layer 2 - Operational Filter</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {job.layer2EliminatedCount ?? 0} eliminated
                </span>
              </div>
              <div className="text-xs text-muted-foreground pl-4">
                Homepage scraping + rule-based filtering
              </div>
              {job.estimatedSavings > 0 && job.layer2EliminatedCount > 0 && (
                <div className="text-xs text-green-600 pl-4">
                  Saved: ${((job.layer2EliminatedCount / ((job.layer1EliminatedCount ?? 0) + (job.layer2EliminatedCount ?? 0)) || 0) * job.estimatedSavings).toFixed(4)}
                </div>
              )}
            </div>

            {/* Layer 3 */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="font-semibold">Layer 3 - LLM Classification</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {(job.successfulUrls ?? 0) + (job.rejectedUrls ?? 0)} classified
                </span>
              </div>
              <div className="text-xs text-muted-foreground pl-4">
                Deep AI analysis for final classification
              </div>
              <div className="text-xs text-orange-600 pl-4">
                Cost: ${(job.totalCost ?? 0).toFixed(4)}
              </div>
            </div>

            {/* Total Savings */}
            {job.estimatedSavings > 0 && (
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg">Total Cost Savings</span>
                  <span className="text-2xl font-bold text-green-600">
                    ${(job.estimatedSavings ?? 0).toFixed(4)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Layer 1 + Layer 2 eliminations avoided {(job.layer1EliminatedCount ?? 0) + (job.layer2EliminatedCount ?? 0)} expensive LLM calls
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
