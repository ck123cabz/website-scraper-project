'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
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
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatTimestamp } from '@website-scraper/shared';
import type { Job } from '@website-scraper/shared';
import { JobStatusBadge } from './JobStatusBadge';
import { JobFilters } from './JobFilters';
import { BulkActions } from './BulkActions';

interface JobsTableProps {
  filterActive?: boolean;
  className?: string;
}

export function JobsTable({ filterActive = false, className }: JobsTableProps) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'createdAt', desc: true }, // Default sort: newest first
  ]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 20,
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['jobs', 'table', { filterActive, statusFilter, dateFilter }],
    queryFn: async () => {
      const response = await jobsApi.getQueueStatus({
        includeCompleted: true,
        limit: 100, // Maximum allowed by API (1-100)
      });
      const { activeJobs = [], completedJobs = [] } = response.data as any;
      let jobs = [...activeJobs, ...completedJobs] as Job[];

      // Filter for active jobs if needed
      if (filterActive) {
        jobs = jobs.filter(
          (job) => job.status === 'processing' || job.status === 'paused' || job.status === 'pending'
        );
      }

      // Apply status filter
      if (statusFilter !== 'all') {
        jobs = jobs.filter((job) => job.status === statusFilter);
      }

      // Apply date filter
      if (dateFilter !== 'all') {
        const now = new Date();
        const filterDate = new Date();

        if (dateFilter === 'today') {
          filterDate.setHours(0, 0, 0, 0);
        } else if (dateFilter === 'week') {
          filterDate.setDate(now.getDate() - 7);
        } else if (dateFilter === 'month') {
          filterDate.setMonth(now.getMonth() - 1);
        }

        jobs = jobs.filter((job) => new Date(job.createdAt) >= filterDate);
      }

      return jobs;
    },
    refetchInterval: 10000, // Refetch every 10 seconds
    staleTime: 5000,
  });

  const columns: ColumnDef<Job>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all jobs"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={`Select job ${row.original.name}`}
          onClick={(e) => e.stopPropagation()} // Prevent row click
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
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
        return <JobStatusBadge status={row.original.status} />;
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
      enableSorting: false,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/jobs/${row.original.id}`);
            }}
            aria-label={`View details for job ${row.original.name}`}
          >
            View
          </Button>
        );
      },
      enableSorting: false,
    },
  ];

  const table = useReactTable({
    data: data || [],
    columns,
    state: {
      sorting,
      rowSelection,
      pagination,
      globalFilter: searchQuery,
    },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    onGlobalFilterChange: setSearchQuery,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, columnId, filterValue) => {
      const jobName = row.original.name?.toLowerCase() || '';
      return jobName.includes(filterValue.toLowerCase());
    },
  });

  const selectedJobs = table.getSelectedRowModel().rows.map((row) => row.original);
  const hasSelection = selectedJobs.length > 0;

  if (isLoading) {
    return (
      <div className={className}>
        <div className="mb-4">
          <JobFilters
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            dateFilter={dateFilter}
            onDateFilterChange={setDateFilter}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {['', 'Name', 'Status', 'Created', 'Progress / Results', 'Actions'].map((header) => (
                  <TableHead key={header}>{header}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-[60px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-[60px]" /></TableCell>
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
        <div className="mb-4">
          <JobFilters
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            dateFilter={dateFilter}
            onDateFilterChange={setDateFilter}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </div>
        <div className="rounded-md border">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-muted p-6">
              <AlertCircle className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">
              {filterActive ? 'No active jobs' : 'No jobs yet'}
            </h3>
            <p className="text-sm text-muted-foreground mt-2">
              {filterActive
                ? 'There are no jobs currently processing or paused'
                : 'Create your first job to get started with URL processing'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="mb-4">
        <JobFilters
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          dateFilter={dateFilter}
          onDateFilterChange={setDateFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </div>

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
                data-state={row.getIsSelected() && 'selected'}
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

      {/* Pagination Controls */}
      <div className="flex items-center justify-between px-2 py-4">
        <div className="text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{' '}
          {table.getFilteredRowModel().rows.length} row(s) selected
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <select
              value={table.getState().pagination.pageSize}
              onChange={(e) => {
                table.setPageSize(Number(e.target.value));
              }}
              className="h-8 w-[70px] rounded-md border border-input bg-background px-3 py-1 text-sm"
            >
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <option key={pageSize} value={pageSize}>
                  {pageSize}
                </option>
              ))}
            </select>
          </div>
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Page {table.getState().pagination.pageIndex + 1} of{' '}
            {table.getPageCount()}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Go to previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Go to next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar (fixed at bottom when items selected) */}
      {hasSelection && (
        <BulkActions
          selectedJobs={selectedJobs}
          onClearSelection={() => table.resetRowSelection()}
          onActionComplete={() => {
            table.resetRowSelection();
            refetch();
          }}
        />
      )}
    </div>
  );
}
