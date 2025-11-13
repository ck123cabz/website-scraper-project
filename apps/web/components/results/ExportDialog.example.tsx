/**
 * Example usage of ExportDialog component
 *
 * This example shows how to integrate the ExportDialog into a page
 * to allow users to export job results with different formats and filters.
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { ExportDialog } from './ExportDialog';

export function ExportDialogExample() {
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  // These would typically come from your page props or context
  const jobId = 'job-123';
  const jobName = 'My Website Scrape';

  return (
    <div>
      {/* Trigger button - can be placed anywhere in your UI */}
      <Button onClick={() => setIsExportDialogOpen(true)}>
        <Download className="h-4 w-4" />
        Export Results
      </Button>

      {/* Export Dialog */}
      <ExportDialog
        jobId={jobId}
        jobName={jobName}
        isOpen={isExportDialogOpen}
        onOpenChange={setIsExportDialogOpen}
      />
    </div>
  );
}

/**
 * Integration Notes:
 *
 * 1. The dialog will automatically handle the export process using the useExportResults hook
 * 2. When export completes successfully, a CSV file will be automatically downloaded
 * 3. File naming format: {jobName}-results-{format}-{date}.csv
 * 4. Example filename: "My Website Scrape-results-complete-2025-01-13.csv"
 *
 * Available Formats:
 * - complete: All 48 columns with full Layer 1/2/3 factors
 * - summary: 7 essential columns
 * - layer1: 15 columns including Layer 1 factors
 * - layer2: 25 columns including Layer 1 & 2 factors
 * - layer3: 40 columns including all layers
 *
 * Available Filters:
 * - All Results: No filtering
 * - Approved Only: status=success
 * - Rejected Only: status=rejected
 * - Failed Only: status=failed
 *
 * Props:
 * @param jobId - The job ID to export results for (required)
 * @param jobName - Optional job name for the filename (defaults to jobId)
 * @param isOpen - Control dialog visibility
 * @param onOpenChange - Callback when dialog open state changes
 */
