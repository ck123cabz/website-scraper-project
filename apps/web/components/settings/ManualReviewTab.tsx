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
  const handleEnabledChange = (enabled: boolean) => {
    onChange({
      ...settings,
      enabled,
    });
  };

  const handleQueueSizeChange = (size: number) => {
    onChange({
      ...settings,
      max_queue_size: size,
    });
  };

  const handleTimeoutChange = (hours: number) => {
    onChange({
      ...settings,
      auto_review_timeout_hours: hours,
    });
  };

  const handleSlackChange = (enabled: boolean) => {
    onChange({
      ...settings,
      enable_slack_notifications: enabled,
    });
  };

  return (
    <div className="space-y-6">
      {/* Queue Size Limit */}
      <Card>
        <CardHeader>
          <CardTitle>Queue Size Limit</CardTitle>
          <CardDescription>Maximum number of URLs in manual review queue (0 = unlimited)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="queue-size">Maximum Queue Size:</Label>
            <Input
              id="queue-size"
              type="number"
              min={0}
              max={10000}
              value={settings.max_queue_size || 0}
              onChange={(e) => handleQueueSizeChange(Number(e.target.value))}
              className="w-24 h-8"
            />
            <span className="text-sm text-muted-foreground">URLs (0 = unlimited)</span>
          </div>
        </CardContent>
      </Card>

      {/* Auto-Review Timeout */}
      <Card>
        <CardHeader>
          <CardTitle>Auto-Review Timeout</CardTitle>
          <CardDescription>Automatically approve URLs if not reviewed within timeframe</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="timeout-hours">Auto-approve after:</Label>
            <Input
              id="timeout-hours"
              type="number"
              min={0}
              max={2160}
              value={settings.auto_review_timeout_hours || 0}
              onChange={(e) => handleTimeoutChange(Number(e.target.value))}
              className="w-20 h-8"
            />
            <span className="text-sm text-muted-foreground">hours (0 = disabled)</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Helps prevent stale manual reviews from blocking pipeline
          </p>
        </CardContent>
      </Card>

      {/* Slack Integration */}
      <Card>
        <CardHeader>
          <CardTitle>Slack Integration</CardTitle>
          <CardDescription>Send notifications to Slack for manual review queue updates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="slack-notifications" className="font-medium cursor-pointer">
                Enable Slack Notifications
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Receive Slack alerts when URLs are added to manual review queue
              </p>
            </div>
            <Checkbox
              id="slack-notifications"
              checked={settings.enable_slack_notifications}
              onCheckedChange={(checked) =>
                handleSlackChange(checked === true)
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
