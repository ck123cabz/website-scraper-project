'use client';

import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useJobResults } from '@/hooks/use-results';
import { CheckCircle, XCircle, MinusCircle, Loader2 } from 'lucide-react';
import type { Result } from '@website-scraper/shared';

interface RecentURLsListProps {
  jobId: string;
  className?: string;
}

const URL_TRUNCATE_LENGTH = 40;

/**
 * Displays the 5 most recently processed URLs from a job
 * Shows URL (truncated), status icon, and how long ago it was completed
 */
export function RecentURLsList({ jobId, className }: RecentURLsListProps) {
  // Fetch the 5 most recent results
  const { data, isLoading, error } = useJobResults({
    jobId,
    page: 1,
    limit: 5,
  });

  // Get status icon based on result status and classification
  const getStatusIcon = (result: Result) => {
    if (result.status === 'success') {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    } else if (result.status === 'rejected') {
      return <MinusCircle className="h-4 w-4 text-yellow-600" />;
    } else {
      return <XCircle className="h-4 w-4 text-red-600" />;
    }
  };

  // Format timestamp to relative time (e.g., "2 minutes ago")
  const getRelativeTime = (timestamp: string) => {
    const now = new Date();
    const processed = new Date(timestamp);
    const diffSeconds = Math.floor((now.getTime() - processed.getTime()) / 1000);

    if (diffSeconds < 60) {
      return `${diffSeconds} second${diffSeconds !== 1 ? 's' : ''} ago`;
    } else if (diffSeconds < 3600) {
      const minutes = Math.floor(diffSeconds / 60);
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else if (diffSeconds < 86400) {
      const hours = Math.floor(diffSeconds / 3600);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffSeconds / 86400);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    }
  };

  // Truncate URL for display
  const truncateUrl = (url: string) => {
    if (url.length <= URL_TRUNCATE_LENGTH) return url;
    return `${url.substring(0, URL_TRUNCATE_LENGTH)}...`;
  };

  return (
    <section aria-label="Recent Processed URLs" className={className}>
      <Card>
        <CardHeader>
          <CardTitle>Recent URLs</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <p className="text-sm text-destructive text-center py-4">
              Failed to load recent URLs
            </p>
          ) : !data?.data || data.data.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No URLs processed yet
            </p>
          ) : (
            <div className="space-y-3">
              {data.data.map((result) => (
                <div
                  key={result.id}
                  className="flex items-start gap-2 pb-3 border-b last:border-b-0 last:pb-0"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getStatusIcon(result)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-mono break-all"
                      title={result.url}
                    >
                      {truncateUrl(result.url)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {getRelativeTime(result.updated_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
