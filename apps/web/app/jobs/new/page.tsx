import { JobCreationForm } from '@/components/job-creation-form';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewJobPage() {
  return (
    <div className="container mx-auto py-8 px-4" data-testid="new-job-page">
      {/* Back Button */}
      <Link href="/dashboard">
        <Button variant="ghost" className="mb-6" data-testid="back-to-dashboard">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </Link>

      {/* Job Creation Form */}
      <JobCreationForm />
    </div>
  );
}
