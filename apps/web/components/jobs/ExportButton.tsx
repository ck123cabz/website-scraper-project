'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download } from 'lucide-react';
import { resultsApi } from '@/lib/api-client';
import { toast } from 'sonner';

interface ExportButtonProps {
  jobId: string;
  jobName?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

export function ExportButton({
  jobId,
  jobName,
  variant = 'default',
  size = 'default',
  className,
}: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<'complete' | 'summary' | 'layer1' | 'layer2' | 'layer3'>(
    'complete'
  );
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'approved' | 'rejected'>('all');
  const [selectedLayer, setSelectedLayer] = useState<'all' | 'layer1' | 'layer2' | 'layer3' | 'passed_all'>('all');
  const [selectedConfidence, setSelectedConfidence] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Build export parameters
      const params: any = {
        format,
        filter: selectedFilter !== 'all' ? selectedFilter : undefined,
        layer: selectedLayer !== 'all' ? selectedLayer : undefined,
        confidence: selectedConfidence !== 'all' ? selectedConfidence : undefined,
      };

      const blob = await resultsApi.exportJobResults(jobId, params);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const filename = `${jobName || jobId}-${format}-results.csv`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Export started! Your download should begin shortly.');
      setOpen(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export results. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={className}
          aria-label="Export job results"
        >
          <Download className="mr-2 h-4 w-4" />
          Export Results
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export Job Results</DialogTitle>
          <DialogDescription>
            Choose export format and options. The file will be downloaded as CSV.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Export Format</Label>
            <RadioGroup value={format} onValueChange={(value: any) => setFormat(value)}>
              <div className="flex items-start space-x-2">
                <RadioGroupItem value="complete" id="format-complete" />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="format-complete" className="font-medium cursor-pointer">
                    Complete (All Factors)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Includes URL, status, and all Layer 1/2/3 factor details
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <RadioGroupItem value="summary" id="format-summary" />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="format-summary" className="font-medium cursor-pointer">
                    Summary
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Basic columns: URL, status, classification, confidence
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <RadioGroupItem value="layer1" id="format-layer1" />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="format-layer1" className="font-medium cursor-pointer">
                    Layer 1 Only
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Domain analysis factors (TLD, patterns, target profile)
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <RadioGroupItem value="layer2" id="format-layer2" />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="format-layer2" className="font-medium cursor-pointer">
                    Layer 2 Only
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Publication detection factors (scores, keywords, monetization)
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <RadioGroupItem value="layer3" id="format-layer3" />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="format-layer3" className="font-medium cursor-pointer">
                    Layer 3 Only
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Sophistication analysis (design, authority, originality)
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Filter Options */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Filter Options</Label>

            {/* Approval Filter */}
            <div className="space-y-2">
              <Label htmlFor="filter" className="text-sm">Approval Status</Label>
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
              <Label htmlFor="layer" className="text-sm">Filter by Layer</Label>
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
              <Label htmlFor="confidence" className="text-sm">Filter by Confidence</Label>
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
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isExporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
