'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricsCardProps {
  title: string;
  value: string | number;
  trend?: number; // Percentage or percentage points change
  trendLabel?: string; // Label for trend (e.g., "vs last month")
  icon?: React.ReactNode;
  isLoading?: boolean;
  format?: 'number' | 'percentage' | 'duration' | 'currency' | 'currencySmall'; // Format for value display
}

/**
 * MetricsCard component for displaying key analytics metrics.
 * Supports trend indicators (up/down arrows) and loading states.
 *
 * @see Story ui-overhaul-4 (Analytics & Settings) - Task 3
 */
export function MetricsCard({
  title,
  value,
  trend,
  trendLabel = 'vs last period',
  icon,
  isLoading = false,
  format = 'number',
}: MetricsCardProps) {
  // Format value based on type
  const formattedValue = React.useMemo(() => {
    if (typeof value === 'string') return value;

    switch (format) {
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'duration':
        // Convert minutes to human-readable format
        const minutes = Math.floor(value);
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        if (hours > 0) {
          return `${hours}h ${remainingMinutes}m`;
        }
        return `${minutes}m`;
      case 'currency':
        return `$${value.toFixed(2)}`;
      case 'currencySmall':
        // For small amounts like cost per URL, show more decimals
        return `$${value.toFixed(4)}`;
      case 'number':
      default:
        return value.toLocaleString();
    }
  }, [value, format]);

  // Determine trend direction and icon
  const trendDirection = trend
    ? trend > 0
      ? 'up'
      : trend < 0
        ? 'down'
        : 'neutral'
    : null;

  const TrendIcon =
    trendDirection === 'up'
      ? TrendingUp
      : trendDirection === 'down'
        ? TrendingDown
        : Minus;

  const trendColor =
    trendDirection === 'up'
      ? 'text-green-600 dark:text-green-400'
      : trendDirection === 'down'
        ? 'text-red-600 dark:text-red-400'
        : 'text-muted-foreground';

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            <Skeleton className="h-4 w-[120px]" />
          </CardTitle>
          {icon && <Skeleton className="h-4 w-4 rounded" />}
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-[100px] mb-2" />
          <Skeleton className="h-3 w-[80px]" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formattedValue}</div>
        {trend !== undefined && (
          <div className={cn('flex items-center text-xs', trendColor)}>
            <TrendIcon className="mr-1 h-3 w-3" />
            <span>
              {Math.abs(trend).toFixed(1)}
              {format === 'percentage' ? ' pts' : '%'} {trendLabel}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Add React import for useMemo
import * as React from 'react';
