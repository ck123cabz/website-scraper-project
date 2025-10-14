"use client";

import { useState, useEffect, useRef } from 'react';
import { useActivityLogs } from '@/hooks/use-activity-logs';
import { LogEntry } from './log-entry';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { cn } from '@/lib/utils';
interface LiveActivityLogProps {
  jobId: string;
  className?: string;
}

type FilterOption = 'all' | 'errors' | 'info';

export function LiveActivityLog({ jobId, className }: LiveActivityLogProps) {
  const [filter, setFilter] = useState<FilterOption>('all');
  const [isAutoScrollPaused, setIsAutoScrollPaused] = useState(false);
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Fetch logs with optional server-side filtering
  const { data: logs = [], isLoading, error } = useActivityLogs(jobId);

  // Apply client-side filtering based on selected filter
  const filteredLogs = logs.filter((log) => {
    if (filter === 'all') return true;
    if (filter === 'errors') return log.severity === 'error';
    if (filter === 'info') return log.severity === 'info';
    return true;
  });

  // Auto-scroll to latest log entry when new logs arrive
  useEffect(() => {
    if (!isAutoScrollPaused && scrollViewportRef.current) {
      const viewport = scrollViewportRef.current;
      // Scroll to bottom smoothly
      viewport.scrollTo({
        top: viewport.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [filteredLogs, isAutoScrollPaused]);

  // Detect user scroll and pause auto-scroll
  const handleScroll = () => {
    if (!scrollViewportRef.current) return;

    const viewport = scrollViewportRef.current;
    const isAtBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 50;

    // If user scrolls away from bottom, pause auto-scroll
    // If user scrolls back to bottom, resume auto-scroll
    setIsAutoScrollPaused(!isAtBottom);
  };

  // Jump to latest log entry
  const handleJumpToLatest = () => {
    if (scrollViewportRef.current) {
      const viewport = scrollViewportRef.current;
      viewport.scrollTo({
        top: viewport.scrollHeight,
        behavior: 'smooth',
      });
      setIsAutoScrollPaused(false);
    }
  };

  return (
    <Card className={cn('flex flex-col h-full', className)}>
      <section aria-label="Live Activity Log" className="flex flex-col h-full">
        {/* Header with filter controls */}
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Activity Log</h2>
          <div className="flex gap-2" role="radiogroup" aria-label="Log filter">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
              role="radio"
              aria-checked={filter === 'all'}
            >
              All
            </Button>
            <Button
              variant={filter === 'errors' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('errors')}
              role="radio"
              aria-checked={filter === 'errors'}
            >
              Errors Only
            </Button>
            <Button
              variant={filter === 'info' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('info')}
              role="radio"
              aria-checked={filter === 'info'}
            >
              Info Only
            </Button>
          </div>
        </div>

        {/* Scrollable log container */}
        <div className="flex-1 relative">
          <ScrollArea className="h-full">
            <div
              ref={scrollViewportRef}
              className="h-full overflow-y-auto p-4 space-y-2"
              onScroll={handleScroll}
            >
              {isLoading && (
                <div className="text-center text-gray-500">Loading logs...</div>
              )}

              {error && (
                <div className="text-center text-red-600">
                  Error loading logs: {error.message}
                </div>
              )}

              {!isLoading && !error && filteredLogs.length === 0 && (
                <div className="text-center text-gray-500">No logs yet</div>
              )}

              {filteredLogs.map((log) => (
                <LogEntry key={log.id} log={log} />
              ))}

              <div ref={scrollContainerRef} />
            </div>
          </ScrollArea>

          {/* Jump to latest button */}
          {isAutoScrollPaused && filteredLogs.length > 0 && (
            <div className="absolute bottom-4 right-4">
              <Button
                onClick={handleJumpToLatest}
                size="sm"
                className="shadow-lg"
              >
                Jump to latest
              </Button>
            </div>
          )}
        </div>
      </section>
    </Card>
  );
}
