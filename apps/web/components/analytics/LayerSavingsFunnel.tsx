'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowDown, Filter, Sparkles } from 'lucide-react';
import type { LayerFunnelData } from '@/hooks/use-cost-analytics';

interface LayerSavingsFunnelProps {
  data: LayerFunnelData | undefined;
  isLoading?: boolean;
}

/**
 * LayerSavingsFunnel component displays a visual funnel showing how many URLs
 * were filtered at each layer and the estimated cost savings.
 */
export function LayerSavingsFunnel({ data, isLoading = false }: LayerSavingsFunnelProps) {
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
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const isEmpty = !data || data.totalUrls === 0;

  if (isEmpty) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Layer Filtering Funnel</CardTitle>
          <CardDescription>URL filtering and cost savings breakdown</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[350px]">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">No data available</p>
            <p className="text-xs mt-1">Process jobs to see layer filtering stats</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const afterLayer1 = data.totalUrls - data.layer1Eliminated;
  const afterLayer2 = afterLayer1 - data.layer2Eliminated;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Layer Filtering Funnel</CardTitle>
        <CardDescription>URL filtering and cost savings breakdown</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center space-y-2">
          {/* Total URLs */}
          <div className="w-full max-w-md">
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-center">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">
                Total URLs
              </div>
              <div className="text-2xl font-bold text-primary">
                {data.totalUrls.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Arrow + Layer 1 elimination */}
          <div className="flex flex-col items-center">
            <ArrowDown className="h-5 w-5 text-muted-foreground" />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4 text-orange-500" />
              <span>Layer 1 eliminated: </span>
              <span className="font-medium text-orange-600">
                -{data.layer1Eliminated.toLocaleString()}
              </span>
            </div>
          </div>

          {/* After Layer 1 */}
          <div className="w-full max-w-sm">
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 text-center">
              <div className="text-xs text-muted-foreground">After Layer 1</div>
              <div className="text-xl font-semibold text-orange-600">
                {afterLayer1.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Arrow + Layer 2 elimination */}
          <div className="flex flex-col items-center">
            <ArrowDown className="h-5 w-5 text-muted-foreground" />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4 text-amber-500" />
              <span>Layer 2 eliminated: </span>
              <span className="font-medium text-amber-600">
                -{data.layer2Eliminated.toLocaleString()}
              </span>
            </div>
          </div>

          {/* After Layer 2 (to Layer 3) */}
          <div className="w-full max-w-xs">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-center">
              <div className="text-xs text-muted-foreground">To Layer 3</div>
              <div className="text-xl font-semibold text-amber-600">
                {afterLayer2.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Savings summary */}
          <div className="w-full mt-4 pt-4 border-t">
            <div className="flex items-center justify-center gap-2 text-center">
              <Sparkles className="h-5 w-5 text-green-500" />
              <div>
                <span className="text-sm text-muted-foreground">Estimated Savings: </span>
                <span className="text-lg font-bold text-green-600">
                  ${data.estimatedSavings.toFixed(2)}
                </span>
                <span className="text-sm text-muted-foreground ml-2">
                  ({data.savingsPercentage.toFixed(1)}% URLs filtered)
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
