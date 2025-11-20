'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { useExportResults } from '@/hooks/use-export-results';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { ExportResultsParams } from '@/lib/api-client';

interface ExportDialogProps {
  jobId: string;
  jobName?: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportDialog({ jobId, jobName, isOpen, onOpenChange }: ExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportResultsParams['format']>('complete');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'approved' | 'rejected'>('all');
  const [selectedLayer, setSelectedLayer] = useState<'all' | 'layer1' | 'layer2' | 'layer3' | 'passed_all'>('all');
  const [selectedConfidence, setSelectedConfidence] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  const { mutate: exportResults, isPending, error, reset } = useExportResults({ jobId, jobName });

  // Reset state when dialog closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      reset();
    }
    onOpenChange(open);
  };

  const handleExport = () => {
    exportResults({
      format: selectedFormat,
      filter: selectedFilter !== 'all' ? selectedFilter : undefined,
      layer: selectedLayer !== 'all' ? selectedLayer : undefined,
      confidence: selectedConfidence !== 'all' ? selectedConfidence : undefined,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export Results</DialogTitle>
          <DialogDescription>
            Choose an export format and optional filters. All exports are in CSV format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label htmlFor="format">Export Format</Label>
            <Select value={selectedFormat} onValueChange={(value) => setSelectedFormat(value as ExportResultsParams['format'])}>
              <SelectTrigger id="format">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="complete">Complete (48 columns)</SelectItem>
                <SelectItem value="summary">Summary (7 columns)</SelectItem>
                <SelectItem value="layer1">Layer 1 (15 columns)</SelectItem>
                <SelectItem value="layer2">Layer 2 (25 columns)</SelectItem>
                <SelectItem value="layer3">Layer 3 (40 columns)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Approval Filter */}
          <div className="space-y-2">
            <Label htmlFor="filter">Approval Status</Label>
            <Select value={selectedFilter} onValueChange={(value) => setSelectedFilter(value as typeof selectedFilter)}>
              <SelectTrigger id="filter">
                <SelectValue placeholder="Select approval status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Results</SelectItem>
                <SelectItem value="approved">Approved Only</SelectItem>
                <SelectItem value="rejected">Rejected Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Layer Filter */}
          <div className="space-y-2">
            <Label htmlFor="layer">Filter by Layer</Label>
            <Select value={selectedLayer} onValueChange={(value) => setSelectedLayer(value as typeof selectedLayer)}>
              <SelectTrigger id="layer">
                <SelectValue placeholder="Select layer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Layers</SelectItem>
                <SelectItem value="layer1">Layer 1 Only</SelectItem>
                <SelectItem value="layer2">Layer 2 Only</SelectItem>
                <SelectItem value="layer3">Layer 3 Only</SelectItem>
                <SelectItem value="passed_all">Passed All Layers</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Confidence Filter */}
          <div className="space-y-2">
            <Label htmlFor="confidence">Filter by Confidence</Label>
            <Select value={selectedConfidence} onValueChange={(value) => setSelectedConfidence(value as typeof selectedConfidence)}>
              <SelectTrigger id="confidence">
                <SelectValue placeholder="Select confidence level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Confidence Levels</SelectItem>
                <SelectItem value="high">High Confidence</SelectItem>
                <SelectItem value="medium">Medium Confidence</SelectItem>
                <SelectItem value="low">Low Confidence</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>
                {error instanceof Error ? error.message : 'Failed to export results'}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
