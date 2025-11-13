"use client";

import * as React from "react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export interface LayerBreakdownProps {
  layer1: number; // URLs that passed Layer 1
  layer2: number; // URLs that passed Layer 2
  layer3: number; // URLs that passed Layer 3
  totalCompleted: number; // Total URLs analyzed (for percentage calc)
}

interface LayerData {
  label: string;
  count: number;
  percentage: number;
  textColor: string;
  indicatorColor: string;
}

export function LayerBreakdown({
  layer1,
  layer2,
  layer3,
  totalCompleted,
}: LayerBreakdownProps) {
  // Handle edge cases: treat null/undefined as 0
  const safeLayer1 = layer1 ?? 0;
  const safeLayer2 = layer2 ?? 0;
  const safeLayer3 = layer3 ?? 0;
  const safeTotal = totalCompleted ?? 0;

  // Calculate percentages (cap at 100%)
  const calculatePercentage = (value: number): number => {
    if (safeTotal === 0) return 0;
    const percentage = (value / safeTotal) * 100;
    return Math.min(Math.round(percentage), 100);
  };

  const layers: LayerData[] = [
    {
      label: "Layer 1",
      count: safeLayer1,
      percentage: calculatePercentage(safeLayer1),
      textColor: "text-blue-600 dark:text-blue-400",
      indicatorColor: "[&>div]:bg-blue-500",
    },
    {
      label: "Layer 2",
      count: safeLayer2,
      percentage: calculatePercentage(safeLayer2),
      textColor: "text-purple-600 dark:text-purple-400",
      indicatorColor: "[&>div]:bg-purple-500",
    },
    {
      label: "Layer 3",
      count: safeLayer3,
      percentage: calculatePercentage(safeLayer3),
      textColor: "text-green-600 dark:text-green-400",
      indicatorColor: "[&>div]:bg-green-500",
    },
  ];

  return (
    <div className="space-y-4" data-testid="layer-breakdown">
      {layers.map((layer) => (
        <div key={layer.label} className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className={cn("font-medium", layer.textColor)}>
              {layer.label}: {layer.count} completed ({layer.percentage}%)
            </span>
          </div>
          <Progress
            value={layer.percentage}
            className={cn("h-2", layer.indicatorColor)}
            data-testid={`${layer.label.toLowerCase().replace(" ", "-")}-progress`}
            aria-label={`${layer.label} progress: ${layer.percentage}%`}
          />
        </div>
      ))}
    </div>
  );
}
