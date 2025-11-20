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
import { Checkbox } from '@/components/ui/checkbox';
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
  const [includeRejected, setIncludeRejected] = useState(true);
  const [includeFailed, setIncludeFailed] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Build export parameters
      const params: any = { format };

      // No filter logic needed - always export all results
      // The backend defaults to 'all' when filter is not provided

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
      <DialogContent className="sm:max-w-[425px]">
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
            <Label className="text-base font-medium">Include in Export</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-rejected"
                  checked={includeRejected}
                  onCheckedChange={(checked) => setIncludeRejected(checked as boolean)}
                />
                <Label
                  htmlFor="include-rejected"
                  className="text-sm font-normal cursor-pointer"
                >
                  Rejected URLs (didn't pass filters)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-failed"
                  checked={includeFailed}
                  onCheckedChange={(checked) => setIncludeFailed(checked as boolean)}
                />
                <Label
                  htmlFor="include-failed"
                  className="text-sm font-normal cursor-pointer"
                >
                  Failed URLs (errors during processing)
                </Label>
              </div>
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
