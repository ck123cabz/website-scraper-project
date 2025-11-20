'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/**
 * ScrapingSettings panel for the Settings page.
 * Configures default scraping behavior (timeouts, retries, API keys).
 * Note: These are placeholder settings for future features.
 *
 * @see Story ui-overhaul-4 (Analytics & Settings) - Task 12
 */
export function ScrapingSettings() {
  const [requestTimeout, setRequestTimeout] = React.useState(30);
  const [maxRetries, setMaxRetries] = React.useState(3);
  const [retryDelay, setRetryDelay] = React.useState(5);
  const [apiKey, setApiKey] = React.useState('sk-••••••••••••••••');
  const [isSaving, setIsSaving] = React.useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);
  const [hasChanges, setHasChanges] = React.useState(false);

  const handleSave = () => {
    setShowConfirmDialog(true);
  };

  const confirmSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    setHasChanges(false);
    setShowConfirmDialog(false);
    toast.success('Scraping settings saved successfully');
  };

  const markChanged = () => {
    setHasChanges(true);
  };

  return (
    <div className="space-y-6">
      {/* Timeout Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Request Timeout</CardTitle>
          <CardDescription>
            Maximum time to wait for a single URL request (in seconds)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="request-timeout">Timeout Duration</Label>
              <span className="text-sm font-medium">{requestTimeout}s</span>
            </div>
            <Slider
              id="request-timeout"
              min={10}
              max={120}
              step={5}
              value={[requestTimeout]}
              onValueChange={([value]) => {
                setRequestTimeout(value);
                markChanged();
              }}
              disabled
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Recommended: 30-60 seconds for most websites (feature not yet implemented)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Retry Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Retry Configuration</CardTitle>
          <CardDescription>Configure retry behavior for failed requests</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="max-retries">Maximum Retries</Label>
              <span className="text-sm font-medium">{maxRetries}</span>
            </div>
            <Slider
              id="max-retries"
              min={0}
              max={10}
              step={1}
              value={[maxRetries]}
              onValueChange={([value]) => {
                setMaxRetries(value);
                markChanged();
              }}
              disabled
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Number of retry attempts before marking a URL as failed (feature not yet implemented)
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="retry-delay">Retry Delay</Label>
              <span className="text-sm font-medium">{retryDelay}s</span>
            </div>
            <Slider
              id="retry-delay"
              min={1}
              max={30}
              step={1}
              value={[retryDelay]}
              onValueChange={([value]) => {
                setRetryDelay(value);
                markChanged();
              }}
              disabled
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Delay between retry attempts (feature not yet implemented)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* API Key Management */}
      <Card>
        <CardHeader>
          <CardTitle>API Key Management</CardTitle>
          <CardDescription>
            Configure API keys for LLM classification (if applicable)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="api-key">OpenAI / Gemini API Key</Label>
            <Input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                markChanged();
              }}
              disabled
              className="bg-muted font-mono"
              placeholder="sk-••••••••••••••••"
            />
            <p className="text-xs text-muted-foreground">
              API keys are encrypted and stored securely (feature not yet implemented)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button with Confirmation */}
      <div className="flex items-center gap-4">
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          size="lg"
          className="gap-2"
        >
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Scraping Settings
        </Button>
        {hasChanges && !isSaving && (
          <span className="text-sm text-muted-foreground">Unsaved changes</span>
        )}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save scraping configuration?</AlertDialogTitle>
            <AlertDialogDescription>
              These settings will affect all new scraping jobs. Existing jobs will not be modified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmSave}>Save Changes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Info Banner */}
      <div className="rounded-lg border bg-muted/50 p-4">
        <p className="text-sm text-muted-foreground">
          <strong>Note:</strong> Scraping configuration features are planned for a future release.
          These settings are currently placeholders and do not affect job processing.
        </p>
      </div>
    </div>
  );
}
