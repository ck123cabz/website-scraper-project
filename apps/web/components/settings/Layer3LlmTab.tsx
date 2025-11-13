'use client';

import * as React from 'react';
import { Layer3Rules } from '@website-scraper/shared';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

interface Layer3LlmTabProps {
  rules: Layer3Rules;
  onChange: (rules: Layer3Rules) => void;
  errors?: Record<string, string>;
}

export function Layer3LlmTab({ rules, onChange, errors }: Layer3LlmTabProps) {
  // Ensure arrays exist with defaults
  const guestPostRedFlags = rules?.guest_post_red_flags || [];
  const seoInvestmentSignals = rules?.seo_investment_signals || [];

  return (
    <div className="space-y-6">
      {/* Guest Post Red Flags */}
      <Card>
        <CardHeader>
          <CardTitle>Guest Post Red Flags (Negative Indicators)</CardTitle>
          <CardDescription>
            Sites WITH these signals should be marked NOT suitable (low-quality link farms).
            Enter one signal per line.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="Explicit &quot;Write for Us&quot; or &quot;Guest Post Guidelines&quot; pages&#10;Author bylines with external contributors&#10;Contributor sections or editorial team listings&#10;Writing opportunities or submission guidelines&#10;Clear evidence of accepting external content"
            value={guestPostRedFlags.join('\n')}
            onChange={(e) => {
              const indicators = e.target.value
                .split('\n')
                .map((i) => i.trim())
                .filter((i) => i);
              onChange({ ...rules, guest_post_red_flags: indicators });
            }}
            rows={6}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Current red flags: {guestPostRedFlags.length}
          </p>
        </CardContent>
      </Card>

      {/* SEO Investment Signals */}
      <Card>
        <CardHeader>
          <CardTitle>SEO Investment Signals</CardTitle>
          <CardDescription>Technical SEO indicators to detect</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-3">
            {['schema_markup', 'open_graph', 'structured_data'].map((signal) => (
              <div key={signal} className="flex items-center space-x-2">
                <Checkbox
                  id={`seo-${signal}`}
                  checked={seoInvestmentSignals.includes(signal)}
                  onCheckedChange={(checked) => {
                    const updated = [...seoInvestmentSignals];
                    if (checked) {
                      updated.push(signal);
                    } else {
                      updated.splice(updated.indexOf(signal), 1);
                    }
                    onChange({ ...rules, seo_investment_signals: updated });
                  }}
                />
                <label htmlFor={`seo-${signal}`} className="text-sm font-medium cursor-pointer capitalize">
                  {signal.replace(/_/g, ' ')}
                </label>
              </div>
            ))}
          </div>
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
