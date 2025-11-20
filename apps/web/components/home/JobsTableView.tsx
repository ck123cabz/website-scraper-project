'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  flexRender,
} from '@tanstack/react-table';
import { useState } from 'react';
import { jobsApi } from '@/lib/api-client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ArrowUpDown } from 'lucide-react';
import { formatTimestamp } from '@website-scraper/shared';
import type { Job, JobStatus } from '@website-scraper/shared';

interface JobsTableViewProps {
  className?: string;
}

function getStatusColor(status: JobStatus): string {
  switch (status) {
    case 'completed':
      return 'bg-green-500 hover:bg-green-600';
    case 'failed':
    case 'cancelled':
      return 'bg-red-500 hover:bg-red-600';
    case 'processing':
      return 'bg-blue-500 hover:bg-blue-600';
    case 'pending':
      return 'bg-yellow-500 hover:bg-yellow-600';
    case 'paused':
      return 'bg-gray-500 hover:bg-gray-600';
    default:
      return 'bg-gray-500 hover:bg-gray-600';
  }
}

function getStatusLabel(status: JobStatus): string {
  switch (status) {
    case 'completed':
      return 'Success';
    case 'failed':
      return 'Failed';
    case 'cancelled':
      return 'Cancelled';
    case 'processing':
      return 'Active';
    case 'pending':
      return 'Pending';
    case 'paused':
      return 'Paused';
    default:
      return status;
  }
}

const columns: ColumnDef<Job>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => {
      return (
        <button
          className="flex items-center gap-1 hover:text-accent-foreground"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          aria-label="Sort by job name"
        >
          Name
          <ArrowUpDown className="ml-2 h-3.5 w-3.5" aria-hidden="true" />
        </button>
      );
    },
    cell: ({ row }) => {
      return (
        <div className="font-medium max-w-[300px] truncate">
          {row.original.name || 'Untitled Job'}
        </div>
      );
    },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => {
      return (
        <button
          className="flex items-center gap-1 hover:text-accent-foreground"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          aria-label="Sort by job status"
        >
          Status
          <ArrowUpDown className="ml-2 h-3.5 w-3.5" aria-hidden="true" />
        </button>
      );
    },
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge className={getStatusColor(status)}>
          {getStatusLabel(status)}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => {
      return (
        <button
          className="flex items-center gap-1 hover:text-accent-foreground"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          aria-label="Sort by creation date"
        >
          Created
          <ArrowUpDown className="ml-2 h-3.5 w-3.5" aria-hidden="true" />
        </button>
      );
    },
    cell: ({ row }) => {
      return (
        <div className="text-sm text-muted-foreground">
          {formatTimestamp(row.original.createdAt)}
        </div>
      );
    },
  },
  {
    accessorKey: 'progress',
    header: 'Progress / Results',
    cell: ({ row }) => {
      const job = row.original;
      const isActive = job.status === 'processing' || job.status === 'paused';

      if (isActive) {
        return (
          <div className="space-y-1 min-w-[200px]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{job.processedUrls} / {job.totalUrls} URLs</span>
              <span className="font-medium">{Math.round(job.progressPercentage)}%</span>
            </div>
            <Progress value={job.progressPercentage} className="h-1.5" />
          </div>
        );
      }

      if (job.status === 'completed') {
        return (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-green-600 font-medium">{job.successfulUrls} success</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-red-600">{job.rejectedUrls} rejected</span>
          </div>
        );
      }

      return <span className="text-xs text-muted-foreground">—</span>;
    },
  },
];

export function JobsTableView({ className }: JobsTableViewProps) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'createdAt', desc: true }, // Default sort: newest first
  ]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['jobs', 'recent'],
    queryFn: async () => {
      const response = await jobsApi.getQueueStatus({ includeCompleted: true, limit: 20 });
      const { activeJobs = [], completedJobs = [] } = response.data as any;
      return [...activeJobs, ...completedJobs] as Job[];
    },
    refetchInterval: 10000, // Refetch every 10 seconds
    staleTime: 5000,
  });

  const table = useReactTable({
    data: data || [],
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (isLoading) {
    return (
      <div className={className}>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {['Name', 'Status', 'Created', 'Progress / Results'].map((header) => (
                  <TableHead key={header}>{header}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-[60px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load jobs. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={className}>
        <div className="rounded-md border">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-muted p-6">
              <AlertCircle className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No jobs yet</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Create your first job to get started with URL processing
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => router.push(`/jobs/${row.original.id}`)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
