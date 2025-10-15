'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface ClassificationIndicatorsSectionProps {
  indicators: string[];
  onChange: (indicators: string[]) => void;
}

export function ClassificationIndicatorsSection({
  indicators,
  onChange,
}: ClassificationIndicatorsSectionProps) {
  const textValue = indicators.join('\n');

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const lines = e.target.value.split('\n').filter((line) => line.trim().length > 0);
    onChange(lines);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Classification Indicators</CardTitle>
        <CardDescription>
          Define indicators that the LLM uses to identify websites accepting guest posts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="indicators">Indicators (one per line)</Label>
          <Textarea
            id="indicators"
            value={textValue}
            onChange={handleChange}
            rows={8}
            placeholder="Enter one indicator per line&#10;e.g., Explicit 'Write for Us' or 'Guest Post Guidelines' pages"
            className="font-sans"
          />
          <p className="text-sm text-muted-foreground">
            Current indicators: {indicators.length}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
