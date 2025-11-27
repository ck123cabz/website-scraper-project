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
import type { CostTrendData } from '@/hooks/use-cost-analytics';

interface CostTrendChartProps {
  data: CostTrendData[] | undefined;
  isLoading?: boolean;
}

/**
 * CostTrendChart component displays a line chart showing daily cost trends
 * over the last 30 days.
 */
export function CostTrendChart({ data, isLoading = false }: CostTrendChartProps) {
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
  const isEmpty = !data || data.length === 0 || data.every((item) => item.cost === 0);

  if (isEmpty) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cost Trends</CardTitle>
          <CardDescription>Daily spend over the last 30 days</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">No cost data available</p>
            <p className="text-xs mt-1">Process jobs to see cost trends</p>
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
        <CardTitle>Cost Trends</CardTitle>
        <CardDescription>Daily spend over the last 30 days</CardDescription>
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
              interval={Math.floor(formattedData.length / 6)}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${value.toFixed(2)}`}
            />
            <Tooltip
              formatter={(value: number) => [`$${value.toFixed(2)}`, 'Cost']}
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
              formatter={() => <span className="text-sm">Daily Spend</span>}
            />
            <Line
              type="monotone"
              dataKey="cost"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--chart-1))', r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
