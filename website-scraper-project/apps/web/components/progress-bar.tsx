"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { cn } from "@/lib/utils"

// Progress bar color thresholds based on success rate
const SUCCESS_THRESHOLD = 95; // Green when success rate >95%
const WARNING_THRESHOLD = 80; // Yellow when success rate >80%
// Below WARNING_THRESHOLD shows red (danger)

export type ProgressVariant = 'success' | 'warning' | 'danger';

export interface ProgressBarProps {
  /**
   * Progress percentage (0-100)
   */
  percentage: number;
  /**
   * Visual variant for color coding
   * - success: green (>95% success rate)
   * - warning: yellow (>80% success rate)
   * - danger: red (<80% success rate)
   */
  variant?: ProgressVariant;
  /**
   * Optional label for accessibility
   */
  label?: string;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Determines the appropriate variant based on success rate
 * @param successRate - Success rate as a percentage (0-100)
 * @returns The corresponding ProgressVariant
 */
export function getVariantFromSuccessRate(successRate: number): ProgressVariant {
  if (successRate > SUCCESS_THRESHOLD) return 'success';
  if (successRate > WARNING_THRESHOLD) return 'warning';
  return 'danger';
}

/**
 * Custom progress bar component with color coding and accessibility features
 *
 * Features:
 * - Color variants based on success rate (green >95%, yellow >80%, red <80%)
 * - Full ARIA label support for screen readers
 * - Smooth CSS transitions for percentage changes
 * - Built on Radix UI Progress primitive
 */
export function ProgressBar({
  percentage,
  variant = 'success',
  label,
  className
}: ProgressBarProps) {
  // Clamp percentage between 0-100 to protect against invalid backend data
  // (e.g., negative values, values >100, NaN, Infinity)
  const clampedPercentage = Math.min(100, Math.max(0, percentage));

  // Generate accessible label
  const ariaLabel = label || `Job progress: ${Math.round(clampedPercentage)}%`;

  // Variant-specific indicator colors
  const indicatorColorClass = {
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500',
  }[variant];

  return (
    <div className={cn("w-full", className)}>
      <ProgressPrimitive.Root
        className="relative h-3 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800"
        value={clampedPercentage}
        aria-valuenow={clampedPercentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel}
      >
        <ProgressPrimitive.Indicator
          className={cn(
            "h-full w-full flex-1 transition-all duration-500 ease-in-out",
            indicatorColorClass
          )}
          style={{ transform: `translateX(-${100 - clampedPercentage}%)` }}
        />
      </ProgressPrimitive.Root>
      <div className="mt-1 text-right text-sm text-gray-600 dark:text-gray-400">
        {Math.round(clampedPercentage)}%
      </div>
    </div>
  );
}
