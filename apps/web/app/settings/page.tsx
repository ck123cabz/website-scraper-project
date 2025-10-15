'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { PreFilterRulesSection } from '@/components/settings/PreFilterRulesSection';
import { ClassificationIndicatorsSection } from '@/components/settings/ClassificationIndicatorsSection';
import { LLMParametersSection } from '@/components/settings/LLMParametersSection';
import { ConfidenceThresholdSection } from '@/components/settings/ConfidenceThresholdSection';
import { useSettings, useUpdateSettings, useResetSettings } from '@/hooks/useSettings';
import { ClassificationSettings } from '@website-scraper/shared';
import { toast } from 'sonner';
import Link from 'next/link';
import { ArrowLeft, Loader2, RotateCcw } from 'lucide-react';

export default function SettingsPage() {
  const { data: settings, isLoading, error } = useSettings();
  const updateSettings = useUpdateSettings();
  const resetSettings = useResetSettings();

  const [formData, setFormData] = React.useState<ClassificationSettings | null>(null);
  const [validationErrors, setValidationErrors] = React.useState<{
    rules?: Record<number, string>;
    temperature?: string;
    contentLimit?: string;
    confidenceThreshold?: string;
  }>({});

  // Initialize form data when settings load
  React.useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

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

  const validateForm = (): boolean => {
    const errors: typeof validationErrors = {};
    let isValid = true;

    // Validate pre-filter rules (basic regex validation)
    const ruleErrors: Record<number, string> = {};
    formData.prefilter_rules.forEach((rule, index) => {
      try {
        new RegExp(rule.pattern);
      } catch {
        ruleErrors[index] = 'Invalid regular expression pattern';
        isValid = false;
      }
    });
    if (Object.keys(ruleErrors).length > 0) {
      errors.rules = ruleErrors;
    }

    // Validate temperature
    if (formData.llm_temperature < 0 || formData.llm_temperature > 1) {
      errors.temperature = 'Must be between 0 and 1';
      isValid = false;
    }

    // Validate confidence threshold
    if (formData.confidence_threshold < 0 || formData.confidence_threshold > 1) {
      errors.confidenceThreshold = 'Must be between 0 and 1';
      isValid = false;
    }

    // Validate content limit
    if (formData.content_truncation_limit < 1000 || formData.content_truncation_limit > 50000) {
      errors.contentLimit = 'Must be between 1,000 and 50,000';
      isValid = false;
    }

    setValidationErrors(errors);
    return isValid;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Please fix validation errors before saving');
      return;
    }

    try {
      await updateSettings.mutateAsync(formData);
      toast.success('Settings saved successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to save settings: ${message}`);
    }
  };

  const handleReset = async () => {
    if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
      try {
        const defaults = await resetSettings.mutateAsync();
        setFormData(defaults);
        toast.success('Settings reset to defaults');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        toast.error(`Failed to reset settings: ${message}`);
      }
    }
  };

  const isSaving = updateSettings.isPending || resetSettings.isPending;

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold mb-2">Classification Settings</h1>
        <p className="text-muted-foreground">
          Configure pre-filtering rules and LLM classification parameters
        </p>
      </div>

      {/* Form Sections */}
      <div className="space-y-6">
        {/* Pre-filter Rules */}
        <PreFilterRulesSection
          rules={formData.prefilter_rules}
          onChange={(rules) => setFormData({ ...formData, prefilter_rules: rules })}
          errors={validationErrors.rules}
        />

        {/* Classification Indicators */}
        <ClassificationIndicatorsSection
          indicators={formData.classification_indicators}
          onChange={(indicators) =>
            setFormData({ ...formData, classification_indicators: indicators })
          }
        />

        {/* LLM Parameters */}
        <LLMParametersSection
          temperature={formData.llm_temperature}
          contentLimit={formData.content_truncation_limit}
          onChange={(field, value) => {
            if (field === 'temperature') {
              setFormData({ ...formData, llm_temperature: value });
            } else {
              setFormData({ ...formData, content_truncation_limit: value });
            }
          }}
          errors={{
            temperature: validationErrors.temperature,
            contentLimit: validationErrors.contentLimit,
          }}
        />

        {/* Confidence Threshold */}
        <ConfidenceThresholdSection
          threshold={formData.confidence_threshold}
          onChange={(threshold) => setFormData({ ...formData, confidence_threshold: threshold })}
          error={validationErrors.confidenceThreshold}
        />
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex gap-4">
        <Button onClick={handleSave} disabled={isSaving} size="lg" className="gap-2">
          {updateSettings.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Settings
        </Button>
        <Button onClick={handleReset} disabled={isSaving} variant="outline" size="lg" className="gap-2">
          {resetSettings.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          <RotateCcw className="h-4 w-4" />
          Reset to Defaults
        </Button>
      </div>
    </div>
  );
}
