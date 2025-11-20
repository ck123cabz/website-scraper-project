'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

/**
 * GeneralSettings panel for the Settings page.
 * Displays user account information and notification preferences.
 * Note: Auth not implemented yet, so this shows placeholder data.
 *
 * @see Story ui-overhaul-4 (Analytics & Settings) - Task 11
 */
export function GeneralSettings() {
  const [emailNotifications, setEmailNotifications] = React.useState(true);
  const [inAppNotifications, setInAppNotifications] = React.useState(true);
  const [dataRetentionDays, setDataRetentionDays] = React.useState('90');
  const [isSaving, setIsSaving] = React.useState(false);
  const [hasChanges, setHasChanges] = React.useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsSaving(false);
    setHasChanges(false);
    toast.success('General settings saved successfully');
  };

  const markChanged = () => {
    setHasChanges(true);
  };

  return (
    <div className="space-y-6">
      {/* User Account Info */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Your account details (authentication not yet implemented)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="user-name">Name</Label>
            <Input
              id="user-name"
              value="CK"
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              User authentication will be added in a future update
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="user-email">Email</Label>
            <Input
              id="user-email"
              type="email"
              value="user@example.com"
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Email notifications require authentication setup
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>
            Manage how you receive notifications (requires authentication)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-notifications">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive email updates about job completions and failures
              </p>
            </div>
            <Switch
              id="email-notifications"
              checked={emailNotifications}
              onCheckedChange={(checked) => {
                setEmailNotifications(checked);
                markChanged();
              }}
              disabled
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="in-app-notifications">In-App Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Show toast notifications for important events
              </p>
            </div>
            <Switch
              id="in-app-notifications"
              checked={inAppNotifications}
              onCheckedChange={(checked) => {
                setInAppNotifications(checked);
                markChanged();
              }}
              disabled
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Retention */}
      <Card>
        <CardHeader>
          <CardTitle>Data Retention</CardTitle>
          <CardDescription>Configure how long job data is retained</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="retention-days">Retention Period (days)</Label>
            <Input
              id="retention-days"
              type="number"
              min="7"
              max="365"
              value={dataRetentionDays}
              onChange={(e) => {
                setDataRetentionDays(e.target.value);
                markChanged();
              }}
              disabled
              className="bg-muted max-w-[200px]"
            />
            <p className="text-xs text-muted-foreground">
              Job data will be automatically deleted after this many days (feature not yet implemented)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex items-center gap-4">
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          size="lg"
          className="gap-2"
        >
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save General Settings
        </Button>
        {hasChanges && !isSaving && (
          <span className="text-sm text-muted-foreground">Unsaved changes</span>
        )}
      </div>

      {/* Info Banner */}
      <div className="rounded-lg border bg-muted/50 p-4">
        <p className="text-sm text-muted-foreground">
          <strong>Note:</strong> User authentication and email notification features are planned for
          a future release. These settings are currently placeholders.
        </p>
      </div>
    </div>
  );
}
