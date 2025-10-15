'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

interface LLMParametersSectionProps {
  temperature: number;
  contentLimit: number;
  onChange: (field: 'temperature' | 'contentLimit', value: number) => void;
  errors?: {
    temperature?: string;
    contentLimit?: string;
  };
}

export function LLMParametersSection({
  temperature,
  contentLimit,
  onChange,
  errors,
}: LLMParametersSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>LLM Parameters</CardTitle>
        <CardDescription>
          Configure temperature and content limits for LLM classification requests
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Temperature Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="temperature">LLM Temperature: {temperature.toFixed(1)}</Label>
          </div>
          <Slider
            id="temperature"
            min={0}
            max={1}
            step={0.1}
            value={[temperature]}
            onValueChange={([value]) => onChange('temperature', value)}
            className="w-full"
          />
          <p className="text-sm text-muted-foreground">
            Lower = more focused and deterministic, Higher = more creative and varied
          </p>
          {errors?.temperature && (
            <p className="text-sm text-destructive">{errors.temperature}</p>
          )}
        </div>

        {/* Content Truncation Limit */}
        <div className="space-y-2">
          <Label htmlFor="content-limit">Content Truncation Limit (characters)</Label>
          <Input
            id="content-limit"
            type="number"
            min={1000}
            max={50000}
            value={contentLimit}
            onChange={(e) => onChange('contentLimit', parseInt(e.target.value, 10))}
            className={errors?.contentLimit ? 'border-destructive' : ''}
          />
          <p className="text-sm text-muted-foreground">
            Maximum content length sent to the LLM for classification (1,000 - 50,000 characters)
          </p>
          {errors?.contentLimit && (
            <p className="text-sm text-destructive">{errors.contentLimit}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
