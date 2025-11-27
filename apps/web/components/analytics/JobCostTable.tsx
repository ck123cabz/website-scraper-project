'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ArrowUpDown,
  Filter,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { JobCostData } from '@/hooks/use-cost-analytics';

interface JobCostTableProps {
  data: JobCostData[] | undefined;
  isLoading?: boolean;
}

type SortField = 'date' | 'totalCost' | 'costPerUrl' | 'urls' | 'savings';
type SortDirection = 'asc' | 'desc';

const statusColors: Record<string, string> = {
  completed: 'bg-green-500/10 text-green-700 dark:text-green-400',
  processing: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  pending: 'bg-gray-500/10 text-gray-700 dark:text-gray-400',
  paused: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  failed: 'bg-red-500/10 text-red-700 dark:text-red-400',
  cancelled: 'bg-gray-500/10 text-gray-700 dark:text-gray-400',
};

/**
 * Get cost efficiency color based on cost per URL.
 * Lower cost per URL = more efficient (green)
 */
function getCostEfficiencyColor(costPerUrl: number): string {
  if (costPerUrl <= 0.01) return 'text-green-600 dark:text-green-400';
  if (costPerUrl <= 0.02) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

/**
 * JobCostTable component displays a sortable table of jobs with their cost details.
 * Includes expandable rows for provider breakdown.
 */
export function JobCostTable({ data, isLoading = false }: JobCostTableProps) {
  const [sortField, setSortField] = React.useState<SortField>('date');
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('desc');
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set());
  const [displayCount, setDisplayCount] = React.useState(10);

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
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const isEmpty = !data || data.length === 0;

  if (isEmpty) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Job Cost Breakdown</CardTitle>
          <CardDescription>Cost details for each job</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[200px]">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">No jobs found</p>
            <p className="text-xs mt-1">Create jobs to see cost breakdown</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort data
  const sortedData = [...data].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case 'date':
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
        break;
      case 'totalCost':
        comparison = a.totalCost - b.totalCost;
        break;
      case 'costPerUrl':
        comparison = a.costPerUrl - b.costPerUrl;
        break;
      case 'urls':
        comparison = a.urls - b.urls;
        break;
      case 'savings':
        comparison = a.savings - b.savings;
        break;
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const displayedData = sortedData.slice(0, displayCount);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const SortButton = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 data-[state=open]:bg-accent"
      onClick={() => handleSort(field)}
    >
      {children}
      {sortField === field ? (
        sortDirection === 'asc' ? (
          <ChevronUp className="ml-1 h-4 w-4" />
        ) : (
          <ChevronDown className="ml-1 h-4 w-4" />
        )
      ) : (
        <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />
      )}
    </Button>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Job Cost Breakdown</CardTitle>
        <CardDescription>Cost details for each job (click row to expand)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30px]"></TableHead>
                <TableHead>Job Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <SortButton field="urls">URLs</SortButton>
                </TableHead>
                <TableHead>
                  <SortButton field="totalCost">Total Cost</SortButton>
                </TableHead>
                <TableHead>
                  <SortButton field="costPerUrl">$/URL</SortButton>
                </TableHead>
                <TableHead>
                  <SortButton field="savings">Savings</SortButton>
                </TableHead>
                <TableHead>
                  <SortButton field="date">Date</SortButton>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedData.map((job) => (
                <React.Fragment key={job.id}>
                  <TableRow
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleRow(job.id)}
                  >
                    <TableCell>
                      <ChevronRight
                        className={cn(
                          'h-4 w-4 transition-transform',
                          expandedRows.has(job.id) && 'rotate-90'
                        )}
                      />
                    </TableCell>
                    <TableCell className="font-medium max-w-[150px] truncate">
                      {job.name}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn('capitalize', statusColors[job.status])}
                      >
                        {job.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{job.urls.toLocaleString()}</TableCell>
                    <TableCell>${job.totalCost.toFixed(2)}</TableCell>
                    <TableCell className={getCostEfficiencyColor(job.costPerUrl)}>
                      ${job.costPerUrl.toFixed(4)}
                    </TableCell>
                    <TableCell className="text-green-600 dark:text-green-400">
                      ${job.savings.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(job.date), 'MMM d, yyyy')}
                    </TableCell>
                  </TableRow>
                  {/* Expanded row with provider breakdown */}
                  {expandedRows.has(job.id) && (
                    <TableRow className="bg-muted/30">
                      <TableCell colSpan={8} className="py-3">
                        <div className="pl-6 space-y-2">
                          <div className="flex items-center gap-6 text-sm">
                            <span className="text-muted-foreground">Provider Breakdown:</span>
                            <span>
                              Scraping:{' '}
                              <span className="font-medium">${job.scrapingCost.toFixed(2)}</span>
                            </span>
                            <span>
                              Gemini:{' '}
                              <span className="font-medium">${job.geminiCost.toFixed(2)}</span>
                            </span>
                            <span>
                              GPT:{' '}
                              <span className="font-medium">${job.gptCost.toFixed(2)}</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-6 text-sm">
                            <span className="text-muted-foreground">Layer Eliminations:</span>
                            <span className="flex items-center gap-1">
                              <Filter className="h-3 w-3 text-orange-500" />
                              Layer 1:{' '}
                              <span className="font-medium">
                                {job.layer1Eliminated.toLocaleString()}
                              </span>
                            </span>
                            <span className="flex items-center gap-1">
                              <Filter className="h-3 w-3 text-amber-500" />
                              Layer 2:{' '}
                              <span className="font-medium">
                                {job.layer2Eliminated.toLocaleString()}
                              </span>
                            </span>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Load more button */}
        {displayCount < data.length && (
          <div className="mt-4 text-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDisplayCount((prev) => prev + 10)}
            >
              Load More ({data.length - displayCount} remaining)
            </Button>
          </div>
        )}

        <div className="mt-2 text-center text-xs text-muted-foreground">
          Showing {displayedData.length} of {data.length} jobs
        </div>
      </CardContent>
    </Card>
  );
}
