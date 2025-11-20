'use client';

import { useQuery } from '@tanstack/react-query';
import { jobsApi } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, CheckCircle2, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { Job } from '@website-scraper/shared';

interface QuickStatsProps {
  className?: string;
}

interface StatsData {
  activeJobs: number;
  successRate: number;
  recentActivity: string;
}

function calculateStats(jobs: Job[]): StatsData {
  if (!jobs || jobs.length === 0) {
    return {
      activeJobs: 0,
      successRate: 0,
      recentActivity: 'No recent activity',
    };
  }

  // Count active jobs (processing, pending, paused)
  const activeJobs = jobs.filter((job) =>
    job.status === 'processing' || job.status === 'pending' || job.status === 'paused'
  ).length;

  // Calculate success rate from completed jobs
  const completedJobs = jobs.filter((job) => job.status === 'completed');
  let successRate = 0;

  if (completedJobs.length > 0) {
    const totalProcessed = completedJobs.reduce((sum, job) => sum + job.processedUrls, 0);
    const totalSuccessful = completedJobs.reduce((sum, job) => sum + job.successfulUrls, 0);
    successRate = totalProcessed > 0 ? Math.round((totalSuccessful / totalProcessed) * 100) : 0;
  }

  // Get recent activity summary
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)

  const completedToday = completedJobs.filter((job) => {
    const completedAt = job.completedAt ? new Date(job.completedAt) : null;
    return completedAt && completedAt >= today;
  }).length;

  const completedThisWeek = completedJobs.filter((job) => {
    const completedAt = job.completedAt ? new Date(job.completedAt) : null;
    return completedAt && completedAt >= thisWeekStart;
  }).length;

  let recentActivity = 'No recent activity';
  if (completedToday > 0) {
    recentActivity = `${completedToday} job${completedToday > 1 ? 's' : ''} completed today`;
  } else if (completedThisWeek > 0) {
    recentActivity = `${completedThisWeek} job${completedThisWeek > 1 ? 's' : ''} completed this week`;
  }

  return {
    activeJobs,
    successRate,
    recentActivity,
  };
}

export function QuickStats({ className }: QuickStatsProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['jobs', 'quick-stats'],
    queryFn: async () => {
      const response = await jobsApi.getQueueStatus({ includeCompleted: true, limit: 100 });
      // API returns { activeJobs: Job[], completedJobs?: Job[] }
      // Merge both arrays for stats calculation
      const { activeJobs = [], completedJobs = [] } = response.data as any;
      return [...activeJobs, ...completedJobs] as Job[];
    },
    refetchInterval: 10000, // Refetch every 10 seconds
    staleTime: 5000,
  });

  if (isLoading) {
    return (
      <div className={className}>
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[60px] mb-1" />
                <Skeleton className="h-3 w-[120px]" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">
              Failed to load statistics. Please try again later.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = calculateStats(data || []);

  return (
    <div className={className}>
      <div className="grid gap-4 md:grid-cols-3">
        {/* Active Jobs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeJobs}</div>
            <p className="text-xs text-muted-foreground">
              Currently processing or queued
            </p>
          </CardContent>
        </Card>

        {/* Success Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.successRate}%</div>
            <p className="text-xs text-muted-foreground">
              Of all processed URLs
            </p>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentActivity.split(' ')[0]}</div>
            <p className="text-xs text-muted-foreground">
              {stats.recentActivity.split(' ').slice(1).join(' ')}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
