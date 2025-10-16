'use client';

import * as React from 'react';
import { ConfidenceBands, ConfidenceBandConfig } from '@website-scraper/shared';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

interface ConfidenceBandsTabProps {
  bands: ConfidenceBands;
  onChange: (bands: ConfidenceBands) => void;
  errors?: Record<string, string>;
}

export function ConfidenceBandsTab({ bands, onChange, errors }: ConfidenceBandsTabProps) {
  const [validationErrors, setValidationErrors] = React.useState<string[]>([]);

  const validateBands = React.useCallback(() => {
    const errors: string[] = [];

    // Check for overlaps
    const bandArray = Object.entries(bands).map(([name, config]) => ({
      name,
      ...config,
    }));

    for (let i = 0; i < bandArray.length; i++) {
      for (let j = i + 1; j < bandArray.length; j++) {
        const band1 = bandArray[i];
        const band2 = bandArray[j];
        // Check if ranges overlap
        if (!(band1.max < band2.min || band2.max < band1.min)) {
          errors.push(`${band1.name} and ${band2.name} ranges overlap`);
        }
      }
    }

    // Check if full range is covered
    const sorted = bandArray.sort((a, b) => a.min - b.min);
    if (sorted[0].min > 0) {
      errors.push('Range does not start at 0');
    }
    if (sorted[sorted.length - 1].max < 1) {
      errors.push('Range does not end at 1.0');
    }

    // Check for gaps
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].max < sorted[i + 1].min) {
        errors.push(`Gap between ${sorted[i].name} and ${sorted[i + 1].name}`);
      }
    }

    setValidationErrors(errors);
  }, [bands]);

  React.useEffect(() => {
    validateBands();
  }, [validateBands]);

  const handleBandChange = (
    bandName: keyof ConfidenceBands,
    field: keyof ConfidenceBandConfig,
    value: number | string
  ) => {
    const updated = { ...bands };
    const band = updated[bandName];
    if (field === 'min' || field === 'max') {
      band[field] = Number(value);
    } else if (field === 'action') {
      band.action = value as 'auto_approve' | 'manual_review' | 'reject';
    }
    onChange(updated);
  };

  const bandNames: (keyof ConfidenceBands)[] = ['high', 'medium', 'low', 'auto_reject'];
  const bandLabels: Record<keyof ConfidenceBands, string> = {
    high: 'High Confidence',
    medium: 'Medium Confidence',
    low: 'Low Confidence',
    auto_reject: 'Auto-Reject',
  };

  const bandColors: Record<keyof ConfidenceBands, string> = {
    high: 'bg-green-100 border-green-300',
    medium: 'bg-yellow-100 border-yellow-300',
    low: 'bg-orange-100 border-orange-300',
    auto_reject: 'bg-red-100 border-red-300',
  };

  return (
    <div className="space-y-6">
      {/* Validation Warnings */}
      {validationErrors.length > 0 && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-900 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Configuration Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {validationErrors.map((error, i) => (
                <li key={i} className="text-sm text-yellow-800">
                  • {error}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Band Configurations */}
      {bandNames.map((bandName) => {
        const band = bands[bandName];
        return (
          <Card key={bandName} className={`border-2 ${bandColors[bandName]}`}>
            <CardHeader>
              <CardTitle className="text-base">{bandLabels[bandName]}</CardTitle>
              <CardDescription>
                Confidence range: {(band.min * 100).toFixed(0)}% - {(band.max * 100).toFixed(0)}%
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Min Slider */}
              <div className="space-y-2">
                <Label>Minimum Confidence</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[band.min * 100]}
                    onValueChange={(value) =>
                      handleBandChange(bandName, 'min', value[0] / 100)
                    }
                    min={0}
                    max={100}
                    step={5}
                    className="flex-1"
                  />
                  <div className="text-lg font-semibold min-w-16 text-right">
                    {(band.min * 100).toFixed(0)}%
                  </div>
                </div>
              </div>

              {/* Max Slider */}
              <div className="space-y-2">
                <Label>Maximum Confidence</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[band.max * 100]}
                    onValueChange={(value) =>
                      handleBandChange(bandName, 'max', value[0] / 100)
                    }
                    min={0}
                    max={100}
                    step={5}
                    className="flex-1"
                  />
                  <div className="text-lg font-semibold min-w-16 text-right">
                    {(band.max * 100).toFixed(0)}%
                  </div>
                </div>
              </div>

              {/* Action Dropdown */}
              <div className="space-y-2">
                <Label>Action</Label>
                <Select
                  value={band.action}
                  onValueChange={(value) =>
                    handleBandChange(
                      bandName,
                      'action',
                      value as 'auto_approve' | 'manual_review' | 'reject'
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto_approve">Auto Approve</SelectItem>
                    <SelectItem value="manual_review">Manual Review</SelectItem>
                    <SelectItem value="reject">Reject</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Distribution Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Expected Distribution</CardTitle>
          <CardDescription>Estimated percentage of URLs in each confidence band</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {bandNames.map((bandName) => {
              const band = bands[bandName];
              const range = band.max - band.min;
              const percentage = Math.round(range * 100);
              return (
                <div key={bandName} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium capitalize">{bandLabels[bandName]}</span>
                    <span className="text-muted-foreground">{percentage}%</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${bandColors[bandName]}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            This is a visual representation of your confidence band configuration. Actual distribution will vary based on content quality.
          </p>
        </CardContent>
      </Card>

      {/* Errors */}
      {errors && Object.keys(errors).length > 0 && (
        <Card className="border-destructive bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive">Validation Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {Object.entries(errors).map(([key, error]) => (
                <li key={key} className="text-sm text-destructive">
                  • {error}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
