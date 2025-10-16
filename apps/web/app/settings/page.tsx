'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Layer1DomainTab } from '@/components/settings/Layer1DomainTab';
import { Layer2OperationalTab } from '@/components/settings/Layer2OperationalTab';
import { Layer3LlmTab } from '@/components/settings/Layer3LlmTab';
import { ConfidenceBandsTab } from '@/components/settings/ConfidenceBandsTab';
import { ManualReviewTab } from '@/components/settings/ManualReviewTab';
import { useSettings, useUpdateSettings, useResetSettings } from '@/hooks/useSettings';
import { ClassificationSettings } from '@website-scraper/shared';
import { toast } from 'sonner';
import Link from 'next/link';
import { ArrowLeft, Loader2, RotateCcw, AlertCircle, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function SettingsPage() {
  const { data: settings, isLoading, error } = useSettings();
  const updateSettings = useUpdateSettings();
  const resetSettings = useResetSettings();

  const [formData, setFormData] = React.useState<ClassificationSettings | null>(null);
  const [activeTab, setActiveTab] = React.useState('layer1');
  const [showResetDialog, setShowResetDialog] = React.useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);

  // Initialize form data when settings load
  React.useEffect(() => {
    if (settings) {
      setFormData(settings);
      setHasUnsavedChanges(false);
    }
  }, [settings]);

  // Track unsaved changes
  const handleSettingsChange = (updateFn: (prev: ClassificationSettings) => ClassificationSettings) => {
    setFormData((prev) => (prev ? updateFn(prev) : prev));
    setHasUnsavedChanges(true);
  };

  const validateAllTabs = (): boolean => {
    // Basic validation for layer-specific fields
    if (!formData) return false;

    // Layer 1: Check TLD filters
    const hasAnyTld =
      formData.layer1_rules.tld_filters.commercial.length > 0 ||
      formData.layer1_rules.tld_filters.non_commercial.length > 0 ||
      formData.layer1_rules.tld_filters.personal.length > 0;
    if (!hasAnyTld) {
      toast.error('Layer 1: At least one TLD filter must be selected');
      return false;
    }

    // Layer 1: Validate URL pattern exclusions (regex)
    try {
      formData.layer1_rules.url_pattern_exclusions.forEach((exclusion) => {
        new RegExp(exclusion.pattern);
      });
    } catch {
      toast.error('Layer 1: Invalid regex pattern detected');
      return false;
    }

    // Layer 2: Validate ranges
    if (formData.layer2_rules.blog_freshness_days < 30 || formData.layer2_rules.blog_freshness_days > 180) {
      toast.error('Layer 2: Blog freshness must be between 30-180 days');
      return false;
    }

    if (formData.layer2_rules.required_pages_count < 1 || formData.layer2_rules.required_pages_count > 3) {
      toast.error('Layer 2: Required pages must be between 1-3');
      return false;
    }

    if (formData.layer2_rules.min_design_quality_score < 1 || formData.layer2_rules.min_design_quality_score > 10) {
      toast.error('Layer 2: Design quality score must be between 1-10');
      return false;
    }

    // Layer 3: Validate ranges
    if (formData.layer3_rules.llm_temperature < 0 || formData.layer3_rules.llm_temperature > 1) {
      toast.error('Layer 3: LLM temperature must be between 0-1');
      return false;
    }

    if (
      formData.layer3_rules.content_truncation_limit < 1000 ||
      formData.layer3_rules.content_truncation_limit > 50000
    ) {
      toast.error('Layer 3: Content truncation limit must be between 1000-50000');
      return false;
    }

    // Confidence bands: Check no overlaps and full coverage
    const bands = Object.entries(formData.confidence_bands);
    const sorted = bands.sort((a, b) => a[1].min - b[1].min);

    if (sorted[0][1].min > 0) {
      toast.error('Confidence Bands: Range must start at 0');
      return false;
    }

    if (sorted[sorted.length - 1][1].max < 1) {
      toast.error('Confidence Bands: Range must end at 1.0');
      return false;
    }

    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i][1].max !== sorted[i + 1][1].min) {
        toast.error('Confidence Bands: Ranges must be continuous with no gaps or overlaps');
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!formData) return;

    if (!validateAllTabs()) {
      setActiveTab('layer1');
      return;
    }

    try {
      await updateSettings.mutateAsync(formData);
      setHasUnsavedChanges(false);
      toast.success('Settings saved successfully for all layers');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to save settings: ${message}`);
    }
  };

  const handleReset = async () => {
    try {
      const defaults = await resetSettings.mutateAsync();
      setFormData(defaults);
      setHasUnsavedChanges(false);
      setShowResetDialog(false);
      toast.success('Settings reset to defaults for all layers');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to reset settings: ${message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-destructive mb-2">Error Loading Settings</h2>
          <p className="text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!formData) {
    return null;
  }

  const isSaving = updateSettings.isPending || resetSettings.isPending;

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Classification Settings</h1>
            <p className="text-muted-foreground">
              Configure layer-specific settings for the 3-tier progressive filtering pipeline
            </p>
          </div>
          {hasUnsavedChanges && (
            <div className="flex items-center gap-2 text-amber-600 text-sm">
              <AlertCircle className="h-4 w-4" />
              Unsaved changes
            </div>
          )}
        </div>
      </div>

      {/* Implementation Status Warning Banner */}
      <Alert className="mb-6 border-amber-500 bg-amber-50 dark:bg-amber-950/20">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
        <AlertTitle className="text-amber-900 dark:text-amber-100">Partial Implementation Status</AlertTitle>
        <AlertDescription className="text-amber-800 dark:text-amber-200 text-sm">
          Settings UI is functional and saves to database, but most controls don&apos;t affect job processing yet.
          Only <strong>URL Pattern Exclusions</strong>, <strong>Content Indicators</strong>, <strong>Temperature</strong>, and <strong>Truncation Limit</strong> are currently implemented.
          See tooltips (⚠️) on individual controls for details. Full implementation planned in Story 3.1.
        </AlertDescription>
      </Alert>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="layer1">Layer 1 Domain</TabsTrigger>
          <TabsTrigger value="layer2">Layer 2 Operational</TabsTrigger>
          <TabsTrigger value="layer3">Layer 3 LLM</TabsTrigger>
          <TabsTrigger value="confidence">Confidence Bands</TabsTrigger>
          <TabsTrigger value="manual">Manual Review</TabsTrigger>
        </TabsList>

        {/* Layer 1 Tab */}
        <TabsContent value="layer1" className="space-y-4">
          <Layer1DomainTab
            rules={formData.layer1_rules}
            onChange={(rules) =>
              handleSettingsChange((prev) => ({
                ...prev,
                layer1_rules: rules,
              }))
            }
          />
        </TabsContent>

        {/* Layer 2 Tab */}
        <TabsContent value="layer2" className="space-y-4">
          <Layer2OperationalTab
            rules={formData.layer2_rules}
            onChange={(rules) =>
              handleSettingsChange((prev) => ({
                ...prev,
                layer2_rules: rules,
              }))
            }
          />
        </TabsContent>

        {/* Layer 3 Tab */}
        <TabsContent value="layer3" className="space-y-4">
          <Layer3LlmTab
            rules={formData.layer3_rules}
            onChange={(rules) =>
              handleSettingsChange((prev) => ({
                ...prev,
                layer3_rules: rules,
              }))
            }
          />
        </TabsContent>

        {/* Confidence Bands Tab */}
        <TabsContent value="confidence" className="space-y-4">
          <ConfidenceBandsTab
            bands={formData.confidence_bands}
            onChange={(bands) =>
              handleSettingsChange((prev) => ({
                ...prev,
                confidence_bands: bands,
              }))
            }
          />
        </TabsContent>

        {/* Manual Review Tab */}
        <TabsContent value="manual" className="space-y-4">
          <ManualReviewTab
            settings={formData.manual_review_settings}
            onChange={(settings) =>
              handleSettingsChange((prev) => ({
                ...prev,
                manual_review_settings: settings,
              }))
            }
          />
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="mt-8 flex gap-4">
        <Button onClick={handleSave} disabled={isSaving || !hasUnsavedChanges} size="lg" className="gap-2">
          {updateSettings.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Settings
        </Button>
        <Button
          onClick={() => setShowResetDialog(true)}
          disabled={isSaving}
          variant="outline"
          size="lg"
          className="gap-2"
        >
          {resetSettings.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          <RotateCcw className="h-4 w-4" />
          Reset to Defaults
        </Button>
      </div>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset all layer settings to defaults?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset all layers to their default configuration. All current settings will be lost. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <AlertDialogCancel onClick={() => setShowResetDialog(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset} className="bg-destructive hover:bg-destructive/90">
              Reset
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
