'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

interface JobFiltersProps {
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  dateFilter: string;
  onDateFilterChange: (value: string) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  className?: string;
}

export function JobFilters({
  statusFilter,
  onStatusFilterChange,
  dateFilter,
  onDateFilterChange,
  searchQuery,
  onSearchChange,
  className,
}: JobFiltersProps) {
  const hasActiveFilters = statusFilter !== 'all' || dateFilter !== 'all' || searchQuery !== '';

  const clearAllFilters = () => {
    onStatusFilterChange('all');
    onDateFilterChange('all');
    onSearchChange('');
  };

  return (
    <div className={`flex flex-col gap-4 md:flex-row md:items-end ${className}`}>
      {/* Search Box */}
      <div className="flex-1">
        <Label htmlFor="job-search" className="text-sm font-medium">
          Search Jobs
        </Label>
        <div className="relative mt-1.5">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="job-search"
            type="text"
            placeholder="Search by job name..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
            aria-label="Search jobs by name"
          />
        </div>
      </div>

      {/* Status Filter */}
      <div className="w-full md:w-[180px]">
        <Label htmlFor="status-filter" className="text-sm font-medium">
          Status
        </Label>
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger id="status-filter" className="mt-1.5">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="processing">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Date Range Filter */}
      <div className="w-full md:w-[180px]">
        <Label htmlFor="date-filter" className="text-sm font-medium">
          Date Range
        </Label>
        <Select value={dateFilter} onValueChange={onDateFilterChange}>
          <SelectTrigger id="date-filter" className="mt-1.5">
            <SelectValue placeholder="All time" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <Button
          variant="outline"
          size="default"
          onClick={clearAllFilters}
          className="w-full md:w-auto"
          aria-label="Clear all filters"
        >
          <X className="mr-2 h-4 w-4" />
          Clear Filters
        </Button>
      )}
    </div>
  );
}
