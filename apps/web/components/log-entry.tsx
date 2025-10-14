"use client";

import type { ActivityLog } from '@website-scraper/shared';
import { formatTimestamp } from '@website-scraper/shared';
import { CheckCircle, Info, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogEntryProps {
  log: ActivityLog;
  className?: string;
}

const severityConfig = {
  success: {
    icon: CheckCircle,
    iconClass: 'text-green-600',
    bgClass: 'bg-green-50',
    textClass: 'text-green-900',
  },
  info: {
    icon: Info,
    iconClass: 'text-blue-600',
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-900',
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'text-yellow-600',
    bgClass: 'bg-yellow-50',
    textClass: 'text-yellow-900',
  },
  error: {
    icon: XCircle,
    iconClass: 'text-red-600',
    bgClass: 'bg-red-50',
    textClass: 'text-red-900',
  },
};

export function LogEntry({ log, className }: LogEntryProps) {
  const config = severityConfig[log.severity];
  const Icon = config.icon;
  const timestamp = formatTimestamp(log.createdAt);

  return (
    <article
      className={cn(
        'flex items-start gap-3 p-3 rounded-md transition-colors hover:opacity-80',
        config.bgClass,
        className
      )}
    >
      <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', config.iconClass)} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <time className="text-xs font-mono text-gray-500" dateTime={log.createdAt}>
            {timestamp}
          </time>
          <span className={cn('text-sm font-medium break-words', config.textClass)}>
            {log.message}
          </span>
        </div>
      </div>
    </article>
  );
}
