'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import type { SuccessRateData } from '@/hooks/use-analytics';

interface SuccessRateChartProps {
  data: SuccessRateData | undefined;
  isLoading?: boolean;
}

const COLORS = {
  approved: 'hsl(142, 76%, 36%)', // Green for approved
  rejected: 'hsl(0, 84%, 60%)', // Red for rejected
};

/**
 * SuccessRateChart component displays a pie chart showing the breakdown
 * of approved vs rejected URLs across all completed jobs.
 *
 * @see Story ui-overhaul-4 (Analytics & Settings) - Task 5
 */
export function SuccessRateChart({ data, isLoading = false }: SuccessRateChartProps) {
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

  // Check if data is empty
  const isEmpty = !data || (data.approved === 0 && data.rejected === 0);

  if (isEmpty) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Success/Failure Rate</CardTitle>
          <CardDescription>Breakdown of approved and rejected URLs</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">No data available</p>
            <p className="text-xs mt-1">Complete jobs to see success rates</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare data for recharts
  const chartData = [
    { name: 'Approved', value: data.approved, color: COLORS.approved },
    { name: 'Rejected', value: data.rejected, color: COLORS.rejected },
  ].filter((item) => item.value > 0); // Only show non-zero values

  return (
    <Card>
      <CardHeader>
        <CardTitle>Success/Failure Rate</CardTitle>
        <CardDescription>Breakdown of approved and rejected URLs</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [value.toLocaleString(), 'URLs']}
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => <span className="text-sm">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
