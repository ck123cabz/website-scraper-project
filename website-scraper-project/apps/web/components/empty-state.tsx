import { Button } from '@/components/ui/button';
import { FileQuestion } from 'lucide-react';

interface EmptyStateProps {
  onCreateJob?: () => void;
}

export function EmptyState({ onCreateJob }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="rounded-full bg-muted p-6 mb-4">
        <FileQuestion className="h-12 w-12 text-muted-foreground" />
      </div>
      <h2 className="text-2xl font-semibold mb-2">No jobs yet</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        Get started by creating your first scraping job. Monitor progress, track costs, and view
        results in real-time.
      </p>
      {onCreateJob && (
        <Button onClick={onCreateJob} size="lg">
          Create First Job
        </Button>
      )}
    </div>
  );
}
