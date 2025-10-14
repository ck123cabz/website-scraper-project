"use client"

import { Badge } from "@/components/ui/badge"
import { Activity } from "lucide-react"
import type { JobStatus } from "@website-scraper/shared"

export interface ProcessingIndicatorProps {
  /**
   * Current job status - indicator only shows when status is 'processing'
   */
  status: JobStatus;
  /**
   * Optional custom label (defaults to "Live")
   */
  label?: string;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Processing indicator component showing live processing status
 *
 * Features:
 * - Pulse animation when job is actively processing
 * - "Live" badge with green dot indicator
 * - Activity icon from lucide-react
 * - Only renders when status === 'processing'
 */
export function ProcessingIndicator({
  status,
  label = "Live",
  className
}: ProcessingIndicatorProps) {
  // Only show indicator when job is actively processing
  if (status !== 'processing') {
    return null;
  }

  return (
    <Badge
      variant="outline"
      className={`flex items-center gap-2 border-green-500 text-green-600 dark:text-green-400 ${className || ''}`}
    >
      {/* Pulsing green dot */}
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
      </span>

      {/* Activity icon with subtle pulse */}
      <Activity className="h-4 w-4 animate-pulse" aria-label="Processing activity" />

      {/* Label */}
      <span className="font-semibold">{label}</span>
    </Badge>
  );
}
