'use client';

import * as React from 'react';
import { Layer3Rules } from '@website-scraper/shared';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Layer3LlmTabProps {
  rules: Layer3Rules;
  onChange: (rules: Layer3Rules) => void;
  errors?: Record<string, string>;
}

export function Layer3LlmTab({ rules, onChange, errors }: Layer3LlmTabProps) {
  // Ensure arrays exist with defaults
  const positiveIndicators = rules?.positive_indicators || [];
  const negativeIndicators = rules?.negative_indicators || [];

  return (
    <div className="space-y-6">
      {/* Positive Indicators */}
      <Card>
        <CardHeader>
          <CardTitle>Positive Indicators</CardTitle>
          <CardDescription>
            Signals that indicate a site IS suitable for outreach.
            Enter one indicator per line.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="High-quality editorial content&#10;Multiple authors with detailed profiles&#10;Professional writing and well-researched articles&#10;Active audience engagement (comments, shares)&#10;Strong SEO investment (meta tags, schema markup)"
            value={positiveIndicators.join('\n')}
            onChange={(e) => {
              const indicators = e.target.value
                .split('\n')
                .map((i) => i.trim());
              onChange({ ...rules, positive_indicators: indicators });
            }}
            rows={8}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Current positive indicators: {positiveIndicators.length}
          </p>
        </CardContent>
      </Card>

      {/* Negative Indicators */}
      <Card>
        <CardHeader>
          <CardTitle>Negative Indicators</CardTitle>
          <CardDescription>
            Signals that indicate a site is NOT suitable for outreach.
            Enter one indicator per line.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="Explicit &quot;Write for Us&quot; pages&#10;Guest post solicitation or guidelines&#10;Payment requests for content placement&#10;Low-quality or spammy content&#10;Excessive advertising or affiliate links"
            value={negativeIndicators.join('\n')}
            onChange={(e) => {
              const indicators = e.target.value
                .split('\n')
                .map((i) => i.trim());
              onChange({ ...rules, negative_indicators: indicators });
            }}
            rows={8}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Current negative indicators: {negativeIndicators.length}
          </p>
        </CardContent>
      </Card>

      {/* LLM Temperature */}
      <Card>
        <CardHeader>
          <CardTitle>LLM Temperature</CardTitle>
          <CardDescription>Controls randomness in LLM responses</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Slider
              value={[Math.round(rules.llm_temperature * 100)]}
              onValueChange={(value) =>
                onChange({
                  ...rules,
                  llm_temperature: value[0] / 100,
                })
              }
              min={0}
              max={100}
              step={5}
              className="flex-1 mr-4"
            />
            <div className="text-lg font-semibold min-w-16 text-right">
              {rules.llm_temperature.toFixed(2)}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
            <div>
              <span className="font-medium">Lower (0.0-0.3):</span> More focused and consistent
            </div>
            <div>
              <span className="font-medium">Higher (0.7-1.0):</span> More creative and diverse
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Truncation Limit */}
      <Card>
        <CardHeader>
          <CardTitle>Content Truncation Limit</CardTitle>
          <CardDescription>Maximum characters to send to LLM</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Input
              type="number"
              min={1000}
              max={50000}
              step={1000}
              value={rules.content_truncation_limit}
              onChange={(e) =>
                onChange({
                  ...rules,
                  content_truncation_limit: Math.min(50000, Math.max(1000, Number(e.target.value))),
                })
              }
              className="w-32"
            />
            <span className="text-sm text-muted-foreground">characters</span>
          </div>
          <Slider
            value={[rules.content_truncation_limit]}
            onValueChange={(value) =>
              onChange({
                ...rules,
                content_truncation_limit: value[0],
              })
            }
            min={1000}
            max={50000}
            step={1000}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Larger limits provide more context to LLM but increase API costs. Default: 10,000 characters
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
