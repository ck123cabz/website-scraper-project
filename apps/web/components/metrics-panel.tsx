"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDuration, formatNumber, calculateProcessingRate } from "@website-scraper/shared"
import type { Job } from "@website-scraper/shared"

export interface MetricsPanelProps {
  /**
   * Job data containing metrics to display
   */
  job: Job;
}

/**
 * Metrics panel component displaying comprehensive job progress metrics
 *
 * Displays:
 * - Processed URL count (X / Y URLs)
 * - Processing rate (XX URLs/min)
 * - Elapsed time (HH:MM:SS)
 * - Estimated remaining time (HH:MM:SS)
 * - Success/failure counts
 *
 * Uses responsive grid layout adapting to mobile/tablet/desktop
 */
export function MetricsPanel({ job }: MetricsPanelProps) {
  // Calculate elapsed time in seconds
  // For completed jobs, use completed_at as end time (not current time)
  // This ensures metrics reflect actual job duration, not time since completion
  const elapsedSeconds = job.startedAt
    ? Math.floor(
        (
          (job.completedAt ? new Date(job.completedAt).getTime() : new Date().getTime()) -
          new Date(job.startedAt).getTime()
        ) / 1000
      )
    : 0;

  // Calculate processing rate using utility function
  // Only calculate if job has started (startedAt is not null)
  const processingRate = job.processingRate ??
    (job.startedAt ? calculateProcessingRate(job.processedUrls, elapsedSeconds) : 0);

  // Calculate estimated remaining time
  // Only calculate if:
  // - Job is processing or paused (not completed/cancelled)
  // - We have processed at least 3 URLs (to establish reliable rate)
  // - Processing rate > 0
  const estimatedRemainingSeconds =
    ((job.status === 'processing' || job.status === 'paused') && job.processedUrls >= 3 && processingRate > 0)
      ? Math.ceil((job.totalUrls - job.processedUrls) / processingRate * 60)
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Progress Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Processed URLs Counter */}
          <MetricItem
            label="Processed"
            value={`${formatNumber(job.processedUrls)} / ${formatNumber(job.totalUrls)} URLs`}
          />

          {/* Processing Rate */}
          <MetricItem
            label="Processing Rate"
            value={`${formatNumber(processingRate)} URLs/min`}
          />

          {/* Elapsed Time */}
          <MetricItem
            label="Elapsed"
            value={formatDuration(elapsedSeconds)}
          />

          {/* Estimated Remaining Time */}
          <MetricItem
            label="Est. Remaining"
            value={
              job.status === 'completed' || job.status === 'cancelled'
                ? formatDuration(0) // Show 00:00:00 for completed/cancelled jobs
                : estimatedRemainingSeconds !== null
                  ? formatDuration(estimatedRemainingSeconds)
                  : job.estimatedTimeRemaining !== null
                    ? formatDuration(job.estimatedTimeRemaining)
                    : "Calculating..."
            }
          />

          {/* Success Counter */}
          <MetricItem
            label="Success"
            value={formatNumber(job.successfulUrls)}
            valueClassName="text-green-600 dark:text-green-400"
          />

          {/* Failed Counter */}
          <MetricItem
            label="Failed"
            value={formatNumber(job.failedUrls)}
            valueClassName="text-red-600 dark:text-red-400"
          />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Individual metric display component
 */
interface MetricItemProps {
  label: string;
  value: string;
  valueClassName?: string;
}

function MetricItem({ label, value, valueClassName }: MetricItemProps) {
  return (
    <div className="flex flex-col space-y-1">
      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
        {label}
      </span>
      <span className={valueClassName || "text-2xl font-bold"}>
        {value}
      </span>
    </div>
  );
}
