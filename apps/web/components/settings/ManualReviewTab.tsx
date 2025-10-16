'use client';

import * as React from 'react';
import { ManualReviewSettings } from '@website-scraper/shared';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ExternalLink } from 'lucide-react';

interface ManualReviewTabProps {
  settings: ManualReviewSettings;
  onChange: (settings: ManualReviewSettings) => void;
  errors?: Record<string, string>;
}

export function ManualReviewTab({ settings, onChange, errors }: ManualReviewTabProps) {
  const handleQueueLimitChange = (unlimited: boolean, limit?: number) => {
    onChange({
      ...settings,
      queue_size_limit: unlimited ? null : limit || 100,
    });
  };

  const handleTimeoutChange = (enabled: boolean, days?: number) => {
    onChange({
      ...settings,
      auto_review_timeout_days: enabled ? (days || 7) : null,
    });
  };

  const handleNotificationChange = (
    key: keyof ManualReviewSettings['notifications'],
    value: number | boolean
  ) => {
    onChange({
      ...settings,
      notifications: {
        ...settings.notifications,
        [key]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Queue Size Limit */}
      <Card>
        <CardHeader>
          <CardTitle>Queue Size Limit</CardTitle>
          <CardDescription>Maximum number of URLs in manual review queue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={settings.queue_size_limit === null ? 'unlimited' : 'limited'}
            onValueChange={(value) =>
              handleQueueLimitChange(value === 'unlimited', settings.queue_size_limit || 100)
            }
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="unlimited" id="queue-unlimited" />
              <Label htmlFor="queue-unlimited" className="font-normal cursor-pointer">
                Unlimited (no cap on queue size)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="limited" id="queue-limited" />
              <Label htmlFor="queue-limited" className="font-normal cursor-pointer">
                Maximum:
              </Label>
              <Input
                type="number"
                min={1}
                max={10000}
                value={settings.queue_size_limit || ''}
                onChange={(e) =>
                  handleQueueLimitChange(false, Number(e.target.value))
                }
                disabled={settings.queue_size_limit === null}
                className="w-24 h-8"
              />
              <span className="text-sm text-muted-foreground">URLs</span>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Auto-Review Timeout */}
      <Card>
        <CardHeader>
          <CardTitle>Auto-Review Timeout</CardTitle>
          <CardDescription>Automatically approve URLs if not reviewed within timeframe</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={settings.auto_review_timeout_days === null ? 'disabled' : 'enabled'}
            onValueChange={(value) =>
              handleTimeoutChange(value === 'enabled', settings.auto_review_timeout_days || 7)
            }
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="disabled" id="timeout-disabled" />
              <Label htmlFor="timeout-disabled" className="font-normal cursor-pointer">
                Disabled (manual review only)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="enabled" id="timeout-enabled" />
              <Label htmlFor="timeout-enabled" className="font-normal cursor-pointer">
                Auto-approve after:
              </Label>
              <Input
                type="number"
                min={1}
                max={90}
                value={settings.auto_review_timeout_days || ''}
                onChange={(e) =>
                  handleTimeoutChange(true, Number(e.target.value))
                }
                disabled={settings.auto_review_timeout_days === null}
                className="w-20 h-8"
              />
              <span className="text-sm text-muted-foreground">days</span>
            </div>
          </RadioGroup>
          <p className="text-xs text-muted-foreground">
            Helps prevent stale manual reviews from blocking pipeline
          </p>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>Configure how you are notified about manual review queue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Email Notifications */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="font-medium">Email Notifications</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Send email when queue reaches</span>
                <Input
                  type="number"
                  min={1}
                  max={1000}
                  value={settings.notifications.email_threshold}
                  onChange={(e) =>
                    handleNotificationChange('email_threshold', Number(e.target.value))
                  }
                  className="w-20 h-8"
                />
                <span className="text-sm text-muted-foreground">URLs</span>
              </div>
            </div>
          </div>

          {/* Dashboard Badge */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="dashboard-badge" className="font-medium cursor-pointer">
                Dashboard Badge
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Show badge on dashboard when queue has pending items
              </p>
            </div>
            <Checkbox
              id="dashboard-badge"
              checked={settings.notifications.dashboard_badge}
              onCheckedChange={(checked) =>
                handleNotificationChange('dashboard_badge', checked === true)
              }
            />
          </div>

          {/* Slack Integration */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="slack-integration" className="font-medium cursor-pointer">
                Slack Integration
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Send Slack notifications for manual review queue updates
              </p>
            </div>
            <Checkbox
              id="slack-integration"
              checked={settings.notifications.slack_integration}
              onCheckedChange={(checked) =>
                handleNotificationChange('slack_integration', checked === true)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Current Queue Status */}
      <Card>
        <CardHeader>
          <CardTitle>Current Queue Status</CardTitle>
          <CardDescription>Real-time information about manual review queue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">URLs Pending Review</p>
              <p className="text-2xl font-bold">-</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Oldest Item</p>
              <p className="text-lg font-semibold">-</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Queue status will update in real-time once configured
          </p>
        </CardContent>
      </Card>

      {/* View Queue Button */}
      <div className="flex justify-center">
        <Button variant="outline" disabled className="gap-2">
          <ExternalLink className="h-4 w-4" />
          View Manual Review Queue
        </Button>
      </div>

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
