'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { PreFilterRuleWithEnabled } from '@website-scraper/shared';

interface PreFilterRulesSectionProps {
  rules: PreFilterRuleWithEnabled[];
  onChange: (rules: PreFilterRuleWithEnabled[]) => void;
  errors?: Record<number, string>;
}

export function PreFilterRulesSection({ rules, onChange, errors }: PreFilterRulesSectionProps) {
  const [expandedRules, setExpandedRules] = React.useState<Set<number>>(new Set());

  const toggleExpand = (index: number) => {
    const newExpanded = new Set(expandedRules);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRules(newExpanded);
  };

  const updateRule = (index: number, field: keyof PreFilterRuleWithEnabled, value: string | boolean) => {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], [field]: value };
    onChange(newRules);
  };

  const deleteRule = (index: number) => {
    if (confirm('Are you sure you want to delete this rule?')) {
      onChange(rules.filter((_, i) => i !== index));
    }
  };

  const addNewRule = () => {
    onChange([
      ...rules,
      {
        category: '',
        pattern: '',
        reasoning: '',
        enabled: true,
      },
    ]);
    // Auto-expand the new rule
    setExpandedRules(new Set([...Array.from(expandedRules), rules.length]));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pre-filter Rules</CardTitle>
        <CardDescription>
          Configure URL pattern matching rules to pre-filter unsuitable URLs before LLM classification
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rules.map((rule, index) => {
          const isExpanded = expandedRules.has(index);
          const error = errors?.[index];

          return (
            <div key={index} className="border rounded-lg p-3">
              {/* Collapsed View */}
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleExpand(index)}
                  className="p-0 h-6 w-6"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>

                <div className="flex-1 flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    {rule.category || 'uncategorized'}
                  </Badge>
                  <code className="text-xs flex-1 truncate">{rule.pattern || '(empty)'}</code>
                </div>

                <Switch
                  checked={rule.enabled}
                  onCheckedChange={(checked) => updateRule(index, 'enabled', checked)}
                />

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteRule(index)}
                  className="text-destructive hover:text-destructive h-8 w-8 p-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Expanded View */}
              {isExpanded && (
                <div className="mt-4 space-y-3 pl-9">
                  <div className="space-y-2">
                    <Label htmlFor={`rule-category-${index}`}>Category</Label>
                    <Input
                      id={`rule-category-${index}`}
                      value={rule.category}
                      onChange={(e) => updateRule(index, 'category', e.target.value)}
                      placeholder="e.g., blog_platform, social_media"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`rule-pattern-${index}`}>Pattern (Regex)</Label>
                    <Input
                      id={`rule-pattern-${index}`}
                      value={rule.pattern}
                      onChange={(e) => updateRule(index, 'pattern', e.target.value)}
                      placeholder="e.g., wordpress\\.com/.*"
                      className={`font-mono ${error ? 'border-destructive' : ''}`}
                    />
                    {error && <p className="text-sm text-destructive">{error}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`rule-reasoning-${index}`}>Reasoning</Label>
                    <Input
                      id={`rule-reasoning-${index}`}
                      value={rule.reasoning}
                      onChange={(e) => updateRule(index, 'reasoning', e.target.value)}
                      placeholder="e.g., REJECT - Blog platform domain (WordPress.com)"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <Button type="button" variant="outline" onClick={addNewRule} className="w-full gap-2">
          <Plus className="h-4 w-4" />
          Add New Rule
        </Button>
      </CardContent>
    </Card>
  );
}
