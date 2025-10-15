'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';

interface ConfidenceThresholdSectionProps {
  threshold: number;
  onChange: (value: number) => void;
  error?: string;
}

export function ConfidenceThresholdSection({
  threshold,
  onChange,
  error,
}: ConfidenceThresholdSectionProps) {
  const isFilteringEnabled = threshold > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Confidence Threshold</CardTitle>
        <CardDescription>
          Filter out classification results below a minimum confidence level
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="confidence-threshold">
              Confidence Threshold: {threshold.toFixed(2)}
            </Label>
            {isFilteringEnabled && (
              <Badge variant="default" className="bg-green-600">
                Filtering Enabled
              </Badge>
            )}
          </div>
          <Slider
            id="confidence-threshold"
            min={0}
            max={1}
            step={0.05}
            value={[threshold]}
            onValueChange={([value]) => onChange(value)}
            className="w-full"
          />
          <p className="text-sm text-muted-foreground">
            Classifications below this confidence will be marked as &quot;not_suitable&quot;. Set to 0 to
            disable filtering.
          </p>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
