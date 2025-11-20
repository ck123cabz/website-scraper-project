'use client';

import { useState, useMemo, Fragment } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import { ChevronDown, ChevronRight, Download, Search, X } from 'lucide-react';
import type { Result } from '@website-scraper/shared';
import { useJobResults } from '@/hooks/use-results';
import { useExportResults } from '@/hooks/use-export-results';
import { formatTimestamp, formatCurrency } from '@website-scraper/shared';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface ResultsTableProps {
  jobId: string;
  jobName?: string;
}

export function ResultsTable({ jobId, jobName }: ResultsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });

  // Filters for API
  const statusFilter = columnFilters.find((f) => f.id === 'status')?.value as string | undefined;
  const classificationFilter = columnFilters.find((f) => f.id === 'classification_result')
    ?.value as string | undefined;

  // Fetch results with filters
  const { data, isLoading, error } = useJobResults({
    jobId,
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    status: statusFilter as 'success' | 'rejected' | 'failed' | undefined,
    classification: classificationFilter as
      | 'suitable'
      | 'not_suitable'
      | 'rejected_prefilter'
      | undefined,
    search: globalFilter || undefined,
  });

  const exportMutation = useExportResults({ jobId, jobName });

  const columns = useMemo<ColumnDef<Result>[]>(
    () => [
      {
        id: 'expander',
        header: '',
        cell: ({ row }) => {
          const isExpanded = expandedRows.has(row.original.id);
          return (
            <button
              onClick={() => {
                const newExpanded = new Set(expandedRows);
                if (isExpanded) {
                  newExpanded.delete(row.original.id);
                } else {
                  newExpanded.add(row.original.id);
                }
                setExpandedRows(newExpanded);
              }}
              className="p-1 hover:bg-accent rounded"
              aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          );
        },
        size: 40,
      },
      {
        accessorKey: 'url',
        header: 'URL',
        cell: ({ getValue }) => {
          const url = getValue() as string;
          return (
            <div className="max-w-xs truncate" title={url}>
              {url}
            </div>
          );
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => {
          const status = getValue() as string;
          const colors = {
            success: 'bg-green-100 text-green-800',
            rejected: 'bg-yellow-100 text-yellow-800',
            failed: 'bg-red-100 text-red-800',
          };
          return (
            <Badge className={colors[status as keyof typeof colors] || ''}>
              {status}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'classification_result',
        header: 'Classification',
        cell: ({ getValue }) => {
          const classification = getValue() as string | null;
          if (!classification) return <span className="text-muted-foreground">-</span>;
          const colors = {
            suitable: 'bg-green-100 text-green-800',
            not_suitable: 'bg-gray-100 text-gray-800',
            rejected_prefilter: 'bg-yellow-100 text-yellow-800',
          };
          return (
            <Badge className={colors[classification as keyof typeof colors] || ''}>
              {classification.replace('_', ' ')}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'classification_score',
        header: 'Score',
        cell: ({ getValue }) => {
          const score = getValue() as number | null;
          if (score === null) return <span className="text-muted-foreground">-</span>;
          return <span>{(score * 100).toFixed(0)}%</span>;
        },
      },
      {
        accessorKey: 'llm_cost',
        header: 'Cost',
        cell: ({ getValue }) => {
          const cost = getValue() as number | null;
          if (cost === null || cost === 0)
            return <span className="text-muted-foreground">-</span>;
          return <span>{formatCurrency(cost)}</span>;
        },
      },
      {
        accessorKey: 'processing_time_ms',
        header: 'Time',
        cell: ({ getValue }) => {
          const ms = getValue() as number | null;
          if (!ms) return <span className="text-muted-foreground">-</span>;
          return <span>{(ms / 1000).toFixed(2)}s</span>;
        },
      },
      {
        accessorKey: 'updated_at',
        header: 'Timestamp',
        cell: ({ getValue }) => {
          const timestamp = getValue() as string;
          return <span className="text-sm">{formatTimestamp(timestamp)}</span>;
        },
      },
    ],
    [expandedRows]
  );

  const table = useReactTable({
    data: data?.data || [],
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination,
    },
    pageCount: data?.pagination?.totalPages || -1,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
  });

  const handleExport = (format: 'complete' | 'summary' | 'layer1' | 'layer2' | 'layer3') => {
    exportMutation.mutate({
      format,
      status: statusFilter as 'success' | 'rejected' | 'failed' | undefined,
      classification: classificationFilter as
        | 'suitable'
        | 'not_suitable'
        | 'rejected_prefilter'
        | undefined,
      search: globalFilter || undefined,
    });
  };

  const clearFilters = () => {
    setColumnFilters([]);
    setGlobalFilter('');
  };

  const hasActiveFilters = columnFilters.length > 0 || globalFilter !== '';

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive">Failed to load results: {(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-1 flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search URLs..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Status Filter */}
          <Select
            value={statusFilter || 'all'}
            onValueChange={(value) => {
              if (value === 'all') {
                setColumnFilters((prev) => prev.filter((f) => f.id !== 'status'));
              } else {
                setColumnFilters((prev) => [
                  ...prev.filter((f) => f.id !== 'status'),
                  { id: 'status', value },
                ]);
              }
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>

          {/* Classification Filter */}
          <Select
            value={classificationFilter || 'all'}
            onValueChange={(value) => {
              if (value === 'all') {
                setColumnFilters((prev) =>
                  prev.filter((f) => f.id !== 'classification_result')
                );
              } else {
                setColumnFilters((prev) => [
                  ...prev.filter((f) => f.id !== 'classification_result'),
                  { id: 'classification_result', value },
                ]);
              }
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Classification" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classifications</SelectItem>
              <SelectItem value="suitable">Suitable</SelectItem>
              <SelectItem value="not_suitable">Not Suitable</SelectItem>
              <SelectItem value="rejected_prefilter">Rejected (Prefilter)</SelectItem>
            </SelectContent>
          </Select>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {/* Export Button */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('complete')}
            disabled={exportMutation.isPending}
          >
            <Download className="h-4 w-4 mr-1" />
            Complete CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('summary')}
            disabled={exportMutation.isPending}
          >
            <Download className="h-4 w-4 mr-1" />
            Summary CSV
          </Button>
        </div>
      </div>

      {/* Live Indicator */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span>Live updates enabled</span>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} scope="col">
                    {header.isPlaceholder ? null : (
                      <div
                        className={
                          header.column.getCanSort()
                            ? 'cursor-pointer select-none flex items-center gap-2'
                            : ''
                        }
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                          asc: ' 🔼',
                          desc: ' 🔽',
                        }[header.column.getIsSorted() as string] ?? null}
                      </div>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const isExpanded = expandedRows.has(row.original.id);
                return (
                  <Fragment key={row.id}>
                    <TableRow
                      data-state={row.getIsSelected() && 'selected'}
                      className="cursor-pointer"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={columns.length}>
                          <div
                            className="p-4 bg-muted/50 rounded space-y-4"
                            role="region"
                            aria-label="Row details"
                          >
                            {/* URL Section */}
                            <div>
                              <strong>Full URL:</strong>{' '}
                              <a
                                href={row.original.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                {row.original.url}
                              </a>
                            </div>

                            {/* Filtering Journey Section */}
                            <div className="border-t pt-3">
                              <h4 className="font-semibold mb-2">Filtering Journey</h4>

                              {/* Elimination Layer Badge */}
                              {row.original.elimination_layer && (
                                <div className="mb-3">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    Eliminated at: {row.original.elimination_layer.toUpperCase()}
                                  </span>
                                </div>
                              )}

                              {/* Layer 1: Domain Analysis */}
                              {row.original.layer1_reasoning && (
                                <div className="mb-3 p-3 bg-background rounded border">
                                  <strong className="text-sm">Layer 1 - Domain Analysis:</strong>
                                  <p className="mt-1 text-sm text-muted-foreground">
                                    {row.original.layer1_reasoning}
                                  </p>
                                </div>
                              )}

                              {/* Prefilter Information */}
                              {row.original.prefilter_reasoning && (
                                <div className="mb-3 p-3 bg-background rounded border">
                                  <strong className="text-sm">
                                    Prefilter: {row.original.prefilter_passed ? '✓ Passed' : '✗ Failed'}
                                  </strong>
                                  <p className="mt-1 text-sm text-muted-foreground">
                                    {row.original.prefilter_reasoning}
                                  </p>
                                </div>
                              )}

                              {/* Layer 3: LLM Classification */}
                              {row.original.classification_reasoning && (
                                <div className="mb-3 p-3 bg-background rounded border">
                                  <strong className="text-sm">Layer 3 - LLM Classification:</strong>
                                  <p className="mt-1 text-sm text-muted-foreground">
                                    {row.original.classification_reasoning}
                                  </p>
                                  {row.original.confidence_band && (
                                    <div className="mt-2">
                                      <span className="text-xs font-medium">
                                        Confidence Band: <span className="text-primary">{row.original.confidence_band}</span>
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Technical Metadata Section */}
                            <div className="border-t pt-3">
                              <h4 className="font-semibold mb-2 text-sm">Technical Metadata</h4>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <strong>LLM Provider:</strong> {row.original.llm_provider || '-'}
                                </div>
                                <div>
                                  <strong>Retry Count:</strong> {row.original.retry_count || 0}
                                </div>
                              </div>
                            </div>

                            {/* Error Section */}
                            {row.original.error_message && (
                              <div className="border-t pt-3">
                                <strong className="text-destructive">Error Details:</strong>
                                <p className="mt-1 text-sm text-destructive">
                                  {row.original.error_message}
                                </p>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-muted-foreground">
          {data?.pagination && (
            <>
              Showing {(data.pagination.page - 1) * data.pagination.limit + 1} to{' '}
              {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} of{' '}
              {data.pagination.total} results
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <div className="text-sm">
            Page {pagination.pageIndex + 1} of {data?.pagination?.totalPages || 1}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
