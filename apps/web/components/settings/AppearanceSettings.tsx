'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

/**
 * AppearanceSettings panel for the Settings page.
 * Allows users to customize theme, view mode, and sidebar preferences.
 * Changes apply immediately without a save button.
 *
 * @see Story ui-overhaul-4 (Analytics & Settings) - Task 13
 */
export function AppearanceSettings() {
  const { preferences, updatePreferences, isLoading, isUpdating } = useUserPreferences();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
    updatePreferences(
      { theme },
      {
        onSuccess: () => {
          toast.success(`Theme changed to ${theme}`);
        },
        onError: () => {
          toast.error('Failed to update theme');
        },
      }
    );
  };

  const handleViewModeChange = (defaultView: 'cards' | 'table') => {
    updatePreferences(
      { defaultView },
      {
        onSuccess: () => {
          toast.success(`Default view changed to ${defaultView}`);
        },
        onError: () => {
          toast.error('Failed to update view mode');
        },
      }
    );
  };

  const handleSidebarToggle = (sidebarCollapsed: boolean) => {
    updatePreferences(
      { sidebarCollapsed },
      {
        onSuccess: () => {
          toast.success(
            sidebarCollapsed ? 'Sidebar will collapse by default' : 'Sidebar will expand by default'
          );
        },
        onError: () => {
          toast.error('Failed to update sidebar preference');
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Theme Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
          <CardDescription>Select your preferred color theme</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={preferences?.theme || 'system'}
            onValueChange={(value) => handleThemeChange(value as 'light' | 'dark' | 'system')}
            disabled={isUpdating}
            className="space-y-3"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="light" id="theme-light" />
              <Label htmlFor="theme-light" className="font-normal cursor-pointer">
                Light
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="dark" id="theme-dark" />
              <Label htmlFor="theme-dark" className="font-normal cursor-pointer">
                Dark
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="system" id="theme-system" />
              <Label htmlFor="theme-system" className="font-normal cursor-pointer">
                System (follows your OS preference)
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Default View Mode */}
      <Card>
        <CardHeader>
          <CardTitle>Default View Mode</CardTitle>
          <CardDescription>Choose how jobs are displayed on the dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={preferences?.defaultView || 'cards'}
            onValueChange={(value) => handleViewModeChange(value as 'cards' | 'table')}
            disabled={isUpdating}
            className="space-y-3"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="cards" id="view-cards" />
              <Label htmlFor="view-cards" className="font-normal cursor-pointer">
                Cards View (visual cards with progress indicators)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="table" id="view-table" />
              <Label htmlFor="view-table" className="font-normal cursor-pointer">
                Table View (compact data table)
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Sidebar Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Sidebar</CardTitle>
          <CardDescription>Customize sidebar behavior</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sidebar-collapsed" className="font-normal">
                Collapse sidebar by default
              </Label>
              <p className="text-sm text-muted-foreground">
                Start with the sidebar collapsed on page load
              </p>
            </div>
            <Switch
              id="sidebar-collapsed"
              checked={preferences?.sidebarCollapsed || false}
              onCheckedChange={handleSidebarToggle}
              disabled={isUpdating}
            />
          </div>
        </CardContent>
      </Card>

      {/* Info Banner */}
      <div className="rounded-lg border bg-muted/50 p-4">
        <p className="text-sm text-muted-foreground">
          <strong>Note:</strong> Changes apply immediately and are saved automatically. No need to
          click a save button.
        </p>
      </div>
    </div>
  );
}
