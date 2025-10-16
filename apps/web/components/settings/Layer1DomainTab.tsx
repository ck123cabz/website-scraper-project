'use client';

import * as React from 'react';
import { Layer1Rules } from '@website-scraper/shared';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus } from 'lucide-react';

interface Layer1DomainTabProps {
  rules: Layer1Rules;
  onChange: (rules: Layer1Rules) => void;
  errors?: Record<string, string>;
}

export function Layer1DomainTab({ rules, onChange, errors }: Layer1DomainTabProps) {
  const [newPattern, setNewPattern] = React.useState('');

  const handleTldToggle = (category: 'commercial' | 'non_commercial' | 'personal', tld: string) => {
    const updated = { ...rules };
    const index = updated.tld_filters[category].indexOf(tld);
    if (index > -1) {
      updated.tld_filters[category].splice(index, 1);
    } else {
      updated.tld_filters[category].push(tld);
    }
    onChange(updated);
  };

  const handleAddPattern = () => {
    if (newPattern.trim()) {
      try {
        // Validate regex
        new RegExp(newPattern.trim());
        const updated = { ...rules };
        updated.url_pattern_exclusions.push({
          pattern: newPattern.trim(),
          enabled: true,
        });
        onChange(updated);
        setNewPattern('');
      } catch {
        // Invalid regex - will be handled by form validation
      }
    }
  };

  const handleTogglePattern = (index: number) => {
    const updated = { ...rules };
    updated.url_pattern_exclusions[index].enabled = !updated.url_pattern_exclusions[index].enabled;
    onChange(updated);
  };

  const handleRemovePattern = (index: number) => {
    const updated = { ...rules };
    updated.url_pattern_exclusions.splice(index, 1);
    onChange(updated);
  };

  const handleEliminationRateChange = (value: number[]) => {
    onChange({
      ...rules,
      target_elimination_rate: value[0] / 100,
    });
  };

  return (
    <div className="space-y-6">
      {/* TLD Filtering Section */}
      <Card>
        <CardHeader>
          <CardTitle>TLD Filtering</CardTitle>
          <CardDescription>Select which domain extensions to include</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Commercial TLDs */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">Commercial TLDs</Label>
            <div className="grid grid-cols-2 gap-3">
              {['.com', '.io', '.co', '.ai'].map((tld) => (
                <div key={tld} className="flex items-center space-x-2">
                  <Checkbox
                    id={`commercial-${tld}`}
                    checked={rules.tld_filters.commercial.includes(tld)}
                    onCheckedChange={() => handleTldToggle('commercial', tld)}
                  />
                  <label htmlFor={`commercial-${tld}`} className="text-sm cursor-pointer">
                    {tld}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Non-Commercial TLDs */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">Non-Commercial TLDs</Label>
            <div className="grid grid-cols-2 gap-3">
              {['.org', '.gov', '.edu'].map((tld) => (
                <div key={tld} className="flex items-center space-x-2">
                  <Checkbox
                    id={`non-commercial-${tld}`}
                    checked={rules.tld_filters.non_commercial.includes(tld)}
                    onCheckedChange={() => handleTldToggle('non_commercial', tld)}
                  />
                  <label htmlFor={`non-commercial-${tld}`} className="text-sm cursor-pointer">
                    {tld}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Personal TLDs */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">Personal TLDs</Label>
            <div className="grid grid-cols-2 gap-3">
              {['.me', '.blog', '.xyz'].map((tld) => (
                <div key={tld} className="flex items-center space-x-2">
                  <Checkbox
                    id={`personal-${tld}`}
                    checked={rules.tld_filters.personal.includes(tld)}
                    onCheckedChange={() => handleTldToggle('personal', tld)}
                  />
                  <label htmlFor={`personal-${tld}`} className="text-sm cursor-pointer">
                    {tld}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Industry Keywords Section */}
      <Card>
        <CardHeader>
          <CardTitle>Industry Keywords</CardTitle>
          <CardDescription>Keywords to identify relevant domains (one per line)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="SaaS&#10;Consulting&#10;Software&#10;Platform"
            value={rules.industry_keywords.join('\n')}
            onChange={(e) => {
              const keywords = e.target.value
                .split('\n')
                .map((k) => k.trim())
                .filter((k) => k);
              onChange({ ...rules, industry_keywords: keywords });
            }}
            rows={5}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Current keywords: {rules.industry_keywords.length}
          </p>
        </CardContent>
      </Card>

      {/* URL Pattern Exclusions Section */}
      <Card>
        <CardHeader>
          <CardTitle>URL Pattern Exclusions</CardTitle>
          <CardDescription>Regex patterns to exclude from processing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new pattern */}
          <div className="flex gap-2">
            <Input
              placeholder="e.g., /tag/.*, blog\\..*\\.com"
              value={newPattern}
              onChange={(e) => setNewPattern(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') handleAddPattern();
              }}
              className="font-mono text-sm"
            />
            <Button onClick={handleAddPattern} variant="outline" size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Pattern list */}
          {rules.url_pattern_exclusions.length > 0 ? (
            <div className="space-y-2">
              {rules.url_pattern_exclusions.map((exclusion, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                  <Checkbox
                    checked={exclusion.enabled}
                    onCheckedChange={() => handleTogglePattern(index)}
                  />
                  <code className="flex-1 text-xs font-mono truncate">{exclusion.pattern}</code>
                  <Button
                    onClick={() => handleRemovePattern(index)}
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No patterns added yet</p>
          )}
        </CardContent>
      </Card>

      {/* Target Elimination Rate Section */}
      <Card>
        <CardHeader>
          <CardTitle>Target Elimination Rate</CardTitle>
          <CardDescription>Percentage of URLs to eliminate at Layer 1</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Slider
              value={[Math.round(rules.target_elimination_rate * 100)]}
              onValueChange={handleEliminationRateChange}
              min={40}
              max={60}
              step={1}
              className="flex-1 mr-4"
            />
            <div className="text-lg font-semibold min-w-16 text-right">
              {Math.round(rules.target_elimination_rate * 100)}%
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Higher rates eliminate more URLs at Layer 1, reducing load on downstream layers
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
