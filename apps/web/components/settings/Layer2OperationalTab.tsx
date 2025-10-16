'use client';

import * as React from 'react';
import { Layer2Rules } from '@website-scraper/shared';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus, ChevronDown, ChevronRight } from 'lucide-react';

interface Layer2OperationalTabProps {
  rules: Layer2Rules;
  onChange: (rules: Layer2Rules) => void;
  errors?: Record<string, string>;
}

export function Layer2OperationalTab({ rules, onChange, errors }: Layer2OperationalTabProps) {
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(
    new Set(['analytics', 'marketing'])
  );
  const [newAnalyticsTool, setNewAnalyticsTool] = React.useState('');
  const [newMarketingTool, setNewMarketingTool] = React.useState('');

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const handleAddTool = (category: 'analytics' | 'marketing', tool: string) => {
    if (tool.trim()) {
      const updated = { ...rules };
      if (!updated.tech_stack_tools) {
        updated.tech_stack_tools = { analytics: [], marketing: [] };
      }
      updated.tech_stack_tools[category].push(tool.trim());
      onChange(updated);
      if (category === 'analytics') {
        setNewAnalyticsTool('');
      } else {
        setNewMarketingTool('');
      }
    }
  };

  const handleRemoveTool = (category: 'analytics' | 'marketing', index: number) => {
    const updated = { ...rules };
    updated.tech_stack_tools[category].splice(index, 1);
    onChange(updated);
  };

  const requiredPages = ['about', 'team', 'contact'];

  const handleRequiredPagesChange = (count: number) => {
    onChange({
      ...rules,
      required_pages_count: count,
    });
  };

  return (
    <div className="space-y-6">
      {/* Blog Freshness Threshold */}
      <Card>
        <CardHeader>
          <CardTitle>Blog Freshness Threshold</CardTitle>
          <CardDescription>Maximum days since last blog post</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Slider
              value={[rules.blog_freshness_days]}
              onValueChange={(value) =>
                onChange({
                  ...rules,
                  blog_freshness_days: value[0],
                })
              }
              min={30}
              max={180}
              step={1}
              className="flex-1 mr-4"
            />
            <div className="text-lg font-semibold min-w-20 text-right">
              {rules.blog_freshness_days} days
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            URLs with blog posts older than this threshold will not pass Layer 2
          </p>
        </CardContent>
      </Card>

      {/* Required Company Pages */}
      <Card>
        <CardHeader>
          <CardTitle>Required Company Pages</CardTitle>
          <CardDescription>Minimum pages required (select 1-3)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {requiredPages.map((page, index) => (
              <div key={page} className="flex items-center gap-3">
                <Checkbox
                  id={`page-${page}`}
                  checked={index < rules.required_pages_count}
                  onCheckedChange={(checked) => {
                    if (checked && index === rules.required_pages_count) {
                      handleRequiredPagesChange(rules.required_pages_count + 1);
                    } else if (!checked && index === rules.required_pages_count - 1) {
                      handleRequiredPagesChange(Math.max(1, rules.required_pages_count - 1));
                    }
                  }}
                  disabled={index < rules.required_pages_count && rules.required_pages_count === 1}
                />
                <label htmlFor={`page-${page}`} className="text-sm font-medium capitalize cursor-pointer">
                  {page}
                </label>
              </div>
            ))}
          </div>
          <div className="text-sm text-muted-foreground">
            Minimum required: <span className="font-semibold">{rules.required_pages_count} of 3</span>
          </div>
        </CardContent>
      </Card>

      {/* Tech Stack Detection */}
      <Card>
        <CardHeader>
          <CardTitle>Tech Stack Signals</CardTitle>
          <CardDescription>
            Minimum {rules.min_tech_stack_tools} tools required to pass Layer 2
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Analytics Tools */}
          <div className="border rounded-lg">
            <button
              onClick={() => toggleSection('analytics')}
              className="w-full flex items-center justify-between p-3 hover:bg-muted/50"
            >
              <span className="font-medium">Analytics Tools</span>
              {expandedSections.has('analytics') ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            {expandedSections.has('analytics') && (
              <div className="border-t p-3 space-y-2">
                {rules.tech_stack_tools.analytics.map((tool, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="text-sm">{tool}</span>
                    <Button
                      onClick={() => handleRemoveTool('analytics', index)}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2 pt-2">
                  <Input
                    placeholder="e.g., Google Analytics"
                    value={newAnalyticsTool}
                    onChange={(e) => setNewAnalyticsTool(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') handleAddTool('analytics', newAnalyticsTool);
                    }}
                    className="h-8 text-sm"
                  />
                  <Button
                    onClick={() => handleAddTool('analytics', newAnalyticsTool)}
                    variant="outline"
                    size="sm"
                    className="h-8"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Marketing Tools */}
          <div className="border rounded-lg">
            <button
              onClick={() => toggleSection('marketing')}
              className="w-full flex items-center justify-between p-3 hover:bg-muted/50"
            >
              <span className="font-medium">Marketing Tools</span>
              {expandedSections.has('marketing') ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            {expandedSections.has('marketing') && (
              <div className="border-t p-3 space-y-2">
                {rules.tech_stack_tools.marketing.map((tool, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="text-sm">{tool}</span>
                    <Button
                      onClick={() => handleRemoveTool('marketing', index)}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2 pt-2">
                  <Input
                    placeholder="e.g., HubSpot"
                    value={newMarketingTool}
                    onChange={(e) => setNewMarketingTool(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') handleAddTool('marketing', newMarketingTool);
                    }}
                    className="h-8 text-sm"
                  />
                  <Button
                    onClick={() => handleAddTool('marketing', newMarketingTool)}
                    variant="outline"
                    size="sm"
                    className="h-8"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Professional Design Score */}
      <Card>
        <CardHeader>
          <CardTitle>Professional Design Score</CardTitle>
          <CardDescription>Minimum acceptable design quality</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Slider
              value={[rules.min_design_quality_score]}
              onValueChange={(value) =>
                onChange({
                  ...rules,
                  min_design_quality_score: value[0],
                })
              }
              min={1}
              max={10}
              step={1}
              className="flex-1 mr-4"
            />
            <div className="text-lg font-semibold min-w-16 text-right">
              {rules.min_design_quality_score}/10
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Higher scores require more professional design indicators
          </p>
        </CardContent>
      </Card>

      {/* Target Pass Rate (Display Only) */}
      <Card>
        <CardHeader>
          <CardTitle>Target Pass Rate</CardTitle>
          <CardDescription>Expected percentage of URLs passing Layer 2</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">70%</div>
          <p className="text-xs text-muted-foreground mt-1">
            This is an informational metric showing the expected pass rate based on current configuration
          </p>
        </CardContent>
      </Card>

      {/* Minimum Tech Stack Tools Setting */}
      <Card>
        <CardHeader>
          <CardTitle>Minimum Tech Stack Tools</CardTitle>
          <CardDescription>Required number of detected tools to pass</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Slider
              value={[rules.min_tech_stack_tools]}
              onValueChange={(value) =>
                onChange({
                  ...rules,
                  min_tech_stack_tools: value[0],
                })
              }
              min={1}
              max={5}
              step={1}
              className="flex-1 mr-4"
            />
            <div className="text-lg font-semibold min-w-16 text-right">
              {rules.min_tech_stack_tools} tools
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            URLs must have at least this many detected tools from analytics or marketing platforms
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
