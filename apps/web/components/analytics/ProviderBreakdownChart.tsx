'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import type { ProviderBreakdown } from '@/hooks/use-cost-analytics';

interface ProviderBreakdownChartProps {
  data: ProviderBreakdown[] | undefined;
  isLoading?: boolean;
}

/**
 * ProviderBreakdownChart component displays a donut chart showing the breakdown
 * of costs by provider (Scraping, Gemini, GPT).
 */
export function ProviderBreakdownChart({ data, isLoading = false }: ProviderBreakdownChartProps) {
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

  // Calculate total for center display
  const total = data?.reduce((sum, item) => sum + item.value, 0) || 0;
  const isEmpty = !data || data.length === 0 || total === 0;

  if (isEmpty) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Provider Costs</CardTitle>
          <CardDescription>Breakdown of costs by API provider</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">No cost data available</p>
            <p className="text-xs mt-1">Process jobs to see cost breakdown</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Provider Costs</CardTitle>
        <CardDescription>Breakdown of costs by API provider</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [`$${value.toFixed(2)}`, 'Cost']}
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
            {/* Center label showing total */}
            <text
              x="50%"
              y="50%"
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-foreground"
            >
              <tspan x="50%" dy="-0.5em" className="text-sm fill-muted-foreground">
                Total
              </tspan>
              <tspan x="50%" dy="1.5em" className="text-lg font-bold">
                ${total.toFixed(2)}
              </tspan>
            </text>
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
