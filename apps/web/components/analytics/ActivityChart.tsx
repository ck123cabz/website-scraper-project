'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import type { ActivityData } from '@/hooks/use-analytics';

interface ActivityChartProps {
  data: ActivityData[] | undefined;
  isLoading?: boolean;
}

/**
 * ActivityChart component displays a bar chart showing the number of
 * jobs completed per day over the last 30 days.
 *
 * @see Story ui-overhaul-4 (Analytics & Settings) - Task 7
 */
export function ActivityChart({ data, isLoading = false }: ActivityChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-6 w-[180px]" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-[220px]" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  // Check if data is empty or all values are 0
  const isEmpty =
    !data || data.length === 0 || data.every((item) => item.jobsCompleted === 0);

  if (isEmpty) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity Over Time</CardTitle>
          <CardDescription>Jobs completed per day (last 30 days)</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">No activity data available</p>
            <p className="text-xs mt-1">Complete jobs to see activity trends</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Format data for display
  const formattedData = data.map((item) => ({
    ...item,
    dateLabel: format(new Date(item.date), 'MMM d'),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Over Time</CardTitle>
        <CardDescription>Jobs completed per day (last 30 days)</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="dateLabel"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              interval={Math.floor(formattedData.length / 6)} // Show ~6 labels
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              formatter={(value: number) => [value, 'Jobs Completed']}
              labelFormatter={(label) => `Date: ${label}`}
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Legend
              verticalAlign="top"
              height={36}
              formatter={() => <span className="text-sm">Jobs Completed</span>}
            />
            <Bar
              dataKey="jobsCompleted"
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
