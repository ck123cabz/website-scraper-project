'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import type { ProcessingTimeData } from '@/hooks/use-analytics';

interface ProcessingTimeChartProps {
  data: ProcessingTimeData[] | undefined;
  isLoading?: boolean;
}

/**
 * ProcessingTimeChart component displays a line chart showing the trend
 * of average processing times over the last 30 days.
 *
 * @see Story ui-overhaul-4 (Analytics & Settings) - Task 6
 */
export function ProcessingTimeChart({ data, isLoading = false }: ProcessingTimeChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-6 w-[200px]" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-[250px]" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  // Check if data is empty or all values are 0
  const isEmpty = !data || data.length === 0 || data.every((item) => item.avgTime === 0);

  if (isEmpty) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Processing Time Trends</CardTitle>
          <CardDescription>Average processing time over the last 30 days</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">No data available</p>
            <p className="text-xs mt-1">Complete jobs to see processing time trends</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Format data for display (convert date strings to short format)
  const formattedData = data.map((item) => ({
    ...item,
    dateLabel: format(new Date(item.date), 'MMM d'),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Processing Time Trends</CardTitle>
        <CardDescription>Average processing time over the last 30 days</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={formattedData}>
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
              tickFormatter={(value) => `${value}m`}
            />
            <Tooltip
              formatter={(value: number) => [`${value.toFixed(1)} minutes`, 'Avg Time']}
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
              formatter={() => <span className="text-sm">Average Processing Time</span>}
            />
            <Line
              type="monotone"
              dataKey="avgTime"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))', r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
