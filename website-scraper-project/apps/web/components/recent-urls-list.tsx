'use client';

import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface RecentURLsListProps {
  jobId: string;
  className?: string;
}

// Placeholder component - will be implemented when results table is available
// Backend dependency: Epic 2, Story 2.5 (Worker Processing)
export function RecentURLsList({ className }: RecentURLsListProps) {
  // TODO: Implement useJobResults hook when results table is created
  // const { data: results } = useJobResults(jobId, { limit: 3, orderBy: 'desc' });

  return (
    <section aria-label="Recent Processed URLs" className={className}>
      <Card>
        <CardHeader>
          <CardTitle>Recent URLs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground text-center py-4">
              No URLs processed yet
            </p>
            {/*
            When results table is available, display format:
            - URL (truncated to 40 chars)
            - Status icon: CheckCircle (success), XCircle (failed), MinusCircle (rejected)
            - Timestamp: "Completed XX seconds ago"
            */}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
