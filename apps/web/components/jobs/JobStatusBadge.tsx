import { Badge } from '@/components/ui/badge';
import type { JobStatus } from '@website-scraper/shared';

interface JobStatusBadgeProps {
  status: JobStatus;
  className?: string;
}

function getStatusColor(status: JobStatus): string {
  switch (status) {
    case 'completed':
      return 'bg-green-500 hover:bg-green-600 text-white';
    case 'failed':
    case 'cancelled':
      return 'bg-red-500 hover:bg-red-600 text-white';
    case 'processing':
      return 'bg-blue-500 hover:bg-blue-600 text-white';
    case 'pending':
      return 'bg-yellow-500 hover:bg-yellow-600 text-white';
    case 'paused':
      return 'bg-gray-500 hover:bg-gray-600 text-white';
    default:
      return 'bg-gray-500 hover:bg-gray-600 text-white';
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

export function JobStatusBadge({ status, className }: JobStatusBadgeProps) {
  return (
    <Badge className={`${getStatusColor(status)} ${className}`}>
      {getStatusLabel(status)}
    </Badge>
  );
}
