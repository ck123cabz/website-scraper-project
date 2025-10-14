"use client"

import { useJob } from "@/hooks/use-jobs"
import { ProgressBar, getVariantFromSuccessRate } from "@/components/progress-bar"
import { MetricsPanel } from "@/components/metrics-panel"
import { ProcessingIndicator } from "@/components/processing-indicator"
import { CurrentURLPanel } from "@/components/current-url-panel"
import { RecentURLsList } from "@/components/recent-urls-list"
import { LiveActivityLog } from "@/components/live-activity-log"
import { CostTracker } from "@/components/cost-tracker"
import { ResultsTable } from "@/components/results-table"
import { JobControls } from "@/components/job-controls"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"

export interface JobDetailClientProps {
  jobId: string;
}

/**
 * Client component for job detail page with real-time updates
 *
 * Features:
 * - Fetches job data using useJob hook from Story 1.1
 * - Displays progress bar with color coding based on success rate
 * - Shows comprehensive metrics panel
 * - Displays processing indicator when job is active
 * - Handles loading and error states
 */
export function JobDetailClient({ jobId }: JobDetailClientProps) {
  const { data: job, isLoading, error } = useJob(jobId);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-gray-400" />
          <p className="text-gray-500">Loading job details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !job) {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-2xl mx-auto">
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600">Error Loading Job</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                {error
                  ? `Failed to load job: ${error.message}`
                  : "Job not found. It may have been deleted or you don't have permission to view it."}
              </p>
              <Link href="/dashboard">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Calculate success rate for progress bar color coding
  const successRate =
    job.totalUrls > 0
      ? (job.successfulUrls / job.totalUrls) * 100
      : 0;
  const progressVariant = getVariantFromSuccessRate(successRate);

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <h1 className="text-3xl font-bold">{job.name || `Job ${job.id.slice(0, 8)}`}</h1>
            </div>
            <p className="text-gray-500">
              Created {new Date(job.createdAt).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <JobControls jobId={job.id} status={job.status} className="flex items-center gap-2" />
            <ProcessingIndicator status={job.status} />
          </div>
        </div>

        {/* Progress and Cost Section - Responsive Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Progress Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Progress Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <ProgressBar
                percentage={job.progressPercentage}
                variant={progressVariant}
                label={`Job progress: ${Math.round(job.progressPercentage)}%`}
              />
            </CardContent>
          </Card>

          {/* Cost Tracker - Story 1.5 */}
          <CostTracker job={job} />
        </div>

        {/* Metrics Panel */}
        <MetricsPanel job={job} />

        {/* Tabbed Content - Stories 1.3, 1.4, 1.6 */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="logs">Activity Logs</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Current URL Processing Panel - Story 1.3 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <CurrentURLPanel job={job} />
              </div>
              <div>
                <RecentURLsList jobId={job.id} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="logs">
            {/* Live Activity Log - Story 1.4 */}
            <div className="h-96">
              <LiveActivityLog jobId={job.id} />
            </div>
          </TabsContent>

          <TabsContent value="results">
            {/* Results Table - Story 1.6 */}
            <ResultsTable jobId={job.id} jobName={job.name || undefined} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
