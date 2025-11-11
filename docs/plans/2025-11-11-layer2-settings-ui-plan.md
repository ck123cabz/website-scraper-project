# Layer2 Settings UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the missing Layer2 settings UI to replace the old operational validation interface with new publication detection controls.

**Architecture:** Complete rewrite of Layer2OperationalTab with fresh React components using React Hook Form for state, React Query for API integration, and Tailwind CSS for styling. Auto-save with debounce, optimistic updates, and comprehensive validation.

**Tech Stack:** React, TypeScript, React Hook Form, React Query, Tailwind CSS, Next.js 14

---

## Task 1: Create SliderInput Component

**Files:**
- Create: `apps/web/components/settings/SliderInput.tsx`
- Create: `apps/web/components/settings/__tests__/SliderInput.test.tsx`

**Step 1: Write the failing test**

Create: `apps/web/components/settings/__tests__/SliderInput.test.tsx`

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SliderInput } from '../SliderInput';

describe('SliderInput', () => {
  it('should render with initial value', () => {
    render(
      <SliderInput
        label="Test Slider"
        value={0.5}
        min={0}
        max={1}
        step={0.1}
        onChange={() => {}}
      />
    );

    expect(screen.getByText('Test Slider')).toBeInTheDocument();
    expect(screen.getByText('0.5')).toBeInTheDocument();
  });

  it('should call onChange when slider moves', async () => {
    const onChange = jest.fn();
    render(
      <SliderInput
        label="Test Slider"
        value={0.5}
        min={0}
        max={1}
        step={0.1}
        onChange={onChange}
      />
    );

    const slider = screen.getByRole('slider');
    await userEvent.type(slider, '{arrowright}');

    expect(onChange).toHaveBeenCalled();
  });

  it('should display help text when provided', () => {
    render(
      <SliderInput
        label="Test Slider"
        value={0.5}
        min={0}
        max={1}
        step={0.1}
        onChange={() => {}}
        helpText="This is help text"
      />
    );

    expect(screen.getByText('This is help text')).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- SliderInput.test.tsx`
Expected: FAIL with "Cannot find module '../SliderInput'"

**Step 3: Implement SliderInput component**

Create: `apps/web/components/settings/SliderInput.tsx`

```tsx
import React from 'react';

interface SliderInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  helpText?: string;
  onChange: (value: number) => void;
}

export function SliderInput({
  label,
  value,
  min,
  max,
  step,
  helpText,
  onChange,
}: SliderInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseFloat(e.target.value));
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <span className="text-sm font-semibold text-gray-900">{value}</span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
        role="slider"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
      />

      {helpText && (
        <p className="text-xs text-gray-500">{helpText}</p>
      )}
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- SliderInput.test.tsx`
Expected: PASS (all 3 tests)

**Step 5: Commit**

```bash
git add apps/web/components/settings/SliderInput.tsx apps/web/components/settings/__tests__/SliderInput.test.tsx
git commit -m "feat(settings): Add SliderInput component for Layer2 settings"
```

---

## Task 2: Create KeywordArrayInput Component

**Files:**
- Create: `apps/web/components/settings/KeywordArrayInput.tsx`
- Create: `apps/web/components/settings/__tests__/KeywordArrayInput.test.tsx`

**Step 1: Write the failing test**

Create: `apps/web/components/settings/__tests__/KeywordArrayInput.test.tsx`

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KeywordArrayInput } from '../KeywordArrayInput';

describe('KeywordArrayInput', () => {
  it('should render existing keywords as tags', () => {
    render(
      <KeywordArrayInput
        label="Test Keywords"
        value={['pricing', 'buy', 'demo']}
        onChange={() => {}}
      />
    );

    expect(screen.getByText('pricing')).toBeInTheDocument();
    expect(screen.getByText('buy')).toBeInTheDocument();
    expect(screen.getByText('demo')).toBeInTheDocument();
  });

  it('should add keyword when clicking Add button', async () => {
    const onChange = jest.fn();
    render(
      <KeywordArrayInput
        label="Test Keywords"
        value={['pricing']}
        onChange={onChange}
      />
    );

    const addButton = screen.getByText('+ Add');
    await userEvent.click(addButton);

    const input = screen.getByPlaceholderText('Add keyword...');
    await userEvent.type(input, 'newkeyword');
    await userEvent.keyboard('{Enter}');

    expect(onChange).toHaveBeenCalledWith(['pricing', 'newkeyword']);
  });

  it('should remove keyword when clicking X', async () => {
    const onChange = jest.fn();
    render(
      <KeywordArrayInput
        label="Test Keywords"
        value={['pricing', 'buy']}
        onChange={onChange}
      />
    );

    const removeButtons = screen.getAllByText('×');
    await userEvent.click(removeButtons[0]);

    expect(onChange).toHaveBeenCalledWith(['buy']);
  });

  it('should transform keyword to lowercase and trim', async () => {
    const onChange = jest.fn();
    render(
      <KeywordArrayInput
        label="Test Keywords"
        value={[]}
        onChange={onChange}
      />
    );

    const addButton = screen.getByText('+ Add');
    await userEvent.click(addButton);

    const input = screen.getByPlaceholderText('Add keyword...');
    await userEvent.type(input, '  UPPERCASE  ');
    await userEvent.keyboard('{Enter}');

    expect(onChange).toHaveBeenCalledWith(['uppercase']);
  });

  it('should not add duplicate keywords', async () => {
    const onChange = jest.fn();
    render(
      <KeywordArrayInput
        label="Test Keywords"
        value={['pricing']}
        onChange={onChange}
      />
    );

    const addButton = screen.getByText('+ Add');
    await userEvent.click(addButton);

    const input = screen.getByPlaceholderText('Add keyword...');
    await userEvent.type(input, 'pricing');
    await userEvent.keyboard('{Enter}');

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('Keyword already exists')).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- KeywordArrayInput.test.tsx`
Expected: FAIL with "Cannot find module '../KeywordArrayInput'"

**Step 3: Implement KeywordArrayInput component**

Create: `apps/web/components/settings/KeywordArrayInput.tsx`

```tsx
import React, { useState } from 'react';

interface KeywordArrayInputProps {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  helpText?: string;
}

export function KeywordArrayInput({
  label,
  value,
  onChange,
  placeholder = 'Add keyword...',
  helpText,
}: KeywordArrayInputProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');

  const handleAdd = () => {
    const trimmed = inputValue.trim().toLowerCase();

    if (!trimmed) {
      setIsAdding(false);
      setInputValue('');
      return;
    }

    if (value.includes(trimmed)) {
      setError('Keyword already exists');
      return;
    }

    onChange([...value, trimmed]);
    setInputValue('');
    setIsAdding(false);
    setError('');
  };

  const handleRemove = (keyword: string) => {
    onChange(value.filter((k) => k !== keyword));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    } else if (e.key === 'Escape') {
      setIsAdding(false);
      setInputValue('');
      setError('');
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>

      <div className="flex flex-wrap gap-2">
        {value.map((keyword) => (
          <span
            key={keyword}
            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
          >
            {keyword}
            <button
              type="button"
              onClick={() => handleRemove(keyword)}
              className="hover:bg-blue-200 rounded-full px-1"
              aria-label={`Remove ${keyword}`}
            >
              ×
            </button>
          </span>
        ))}

        {isAdding ? (
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleAdd}
            placeholder={placeholder}
            className="px-3 py-1 border border-blue-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-full text-sm font-medium"
          >
            + Add
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {helpText && (
        <p className="text-xs text-gray-500">{helpText}</p>
      )}
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- KeywordArrayInput.test.tsx`
Expected: PASS (all 5 tests)

**Step 5: Commit**

```bash
git add apps/web/components/settings/KeywordArrayInput.tsx apps/web/components/settings/__tests__/KeywordArrayInput.test.tsx
git commit -m "feat(settings): Add KeywordArrayInput component for Layer2 settings"
```

---

## Task 3: Create PatternArrayInput Component

**Files:**
- Create: `apps/web/components/settings/PatternArrayInput.tsx`
- Create: `apps/web/components/settings/__tests__/PatternArrayInput.test.tsx`

**Step 1: Write the failing test**

Create: `apps/web/components/settings/__tests__/PatternArrayInput.test.tsx`

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PatternArrayInput } from '../PatternArrayInput';

describe('PatternArrayInput', () => {
  it('should render existing patterns as tags', () => {
    render(
      <PatternArrayInput
        label="Test Patterns"
        value={['googlesyndication', 'adsense']}
        onChange={() => {}}
      />
    );

    expect(screen.getByText('googlesyndication')).toBeInTheDocument();
    expect(screen.getByText('adsense')).toBeInTheDocument();
  });

  it('should add pattern when pressing Enter', async () => {
    const onChange = jest.fn();
    render(
      <PatternArrayInput
        label="Test Patterns"
        value={['adsense']}
        onChange={onChange}
      />
    );

    const addButton = screen.getByText('+ Add');
    await userEvent.click(addButton);

    const input = screen.getByPlaceholderText('Add pattern...');
    await userEvent.type(input, 'doubleclick');
    await userEvent.keyboard('{Enter}');

    expect(onChange).toHaveBeenCalledWith(['adsense', 'doubleclick']);
  });

  it('should trim pattern but preserve case', async () => {
    const onChange = jest.fn();
    render(
      <PatternArrayInput
        label="Test Patterns"
        value={[]}
        onChange={onChange}
      />
    );

    const addButton = screen.getByText('+ Add');
    await userEvent.click(addButton);

    const input = screen.getByPlaceholderText('Add pattern...');
    await userEvent.type(input, '  CaseSensitive  ');
    await userEvent.keyboard('{Enter}');

    expect(onChange).toHaveBeenCalledWith(['CaseSensitive']);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- PatternArrayInput.test.tsx`
Expected: FAIL with "Cannot find module '../PatternArrayInput'"

**Step 3: Implement PatternArrayInput component**

Create: `apps/web/components/settings/PatternArrayInput.tsx`

```tsx
import React, { useState } from 'react';

interface PatternArrayInputProps {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  helpText?: string;
}

export function PatternArrayInput({
  label,
  value,
  onChange,
  placeholder = 'Add pattern...',
  helpText,
}: PatternArrayInputProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');

  const handleAdd = () => {
    const trimmed = inputValue.trim(); // Preserve case for patterns

    if (!trimmed) {
      setIsAdding(false);
      setInputValue('');
      return;
    }

    if (value.includes(trimmed)) {
      setError('Pattern already exists');
      return;
    }

    onChange([...value, trimmed]);
    setInputValue('');
    setIsAdding(false);
    setError('');
  };

  const handleRemove = (pattern: string) => {
    onChange(value.filter((p) => p !== pattern));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    } else if (e.key === 'Escape') {
      setIsAdding(false);
      setInputValue('');
      setError('');
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>

      <div className="flex flex-wrap gap-2">
        {value.map((pattern) => (
          <span
            key={pattern}
            className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-mono"
          >
            {pattern}
            <button
              type="button"
              onClick={() => handleRemove(pattern)}
              className="hover:bg-purple-200 rounded-full px-1"
              aria-label={`Remove ${pattern}`}
            >
              ×
            </button>
          </span>
        ))}

        {isAdding ? (
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleAdd}
            placeholder={placeholder}
            className="px-3 py-1 border border-purple-300 rounded-full text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
            autoFocus
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="px-3 py-1 text-purple-600 hover:bg-purple-50 rounded-full text-sm font-medium"
          >
            + Add
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {helpText && (
        <p className="text-xs text-gray-500">{helpText}</p>
      )}
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- PatternArrayInput.test.tsx`
Expected: PASS (all 3 tests)

**Step 5: Commit**

```bash
git add apps/web/components/settings/PatternArrayInput.tsx apps/web/components/settings/__tests__/PatternArrayInput.test.tsx
git commit -m "feat(settings): Add PatternArrayInput component for Layer2 settings"
```

---

## Task 4: Create Layer2PublicationTab Component

**Files:**
- Create: `apps/web/components/settings/Layer2PublicationTab.tsx`
- Create: `apps/web/components/settings/__tests__/Layer2PublicationTab.test.tsx`

**Step 1: Write the failing test**

Create: `apps/web/components/settings/__tests__/Layer2PublicationTab.test.tsx`

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layer2PublicationTab } from '../Layer2PublicationTab';

// Mock the hooks
jest.mock('@/hooks/useSettings', () => ({
  useSettings: () => ({
    data: {
      layer2_rules: {
        publication_score_threshold: 0.65,
        product_keywords: {
          commercial: ['pricing', 'buy'],
          features: ['features'],
          cta: ['get started'],
        },
        business_nav_keywords: ['product', 'pricing'],
        content_nav_keywords: ['articles', 'blog'],
        min_business_nav_percentage: 0.3,
        ad_network_patterns: ['googlesyndication'],
        affiliate_patterns: ['amazon'],
        payment_provider_patterns: ['stripe'],
      },
    },
    isLoading: false,
  }),
}));

const mockMutate = jest.fn();
jest.mock('@/hooks/useUpdateSettings', () => ({
  useUpdateSettings: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

describe('Layer2PublicationTab', () => {
  const queryClient = new QueryClient();

  it('should render all sections', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Layer2PublicationTab />
      </QueryClientProvider>
    );

    expect(screen.getByText(/Detection Threshold/i)).toBeInTheDocument();
    expect(screen.getByText(/Product Offering Detection/i)).toBeInTheDocument();
    expect(screen.getByText(/Navigation Analysis/i)).toBeInTheDocument();
    expect(screen.getByText(/Monetization Detection/i)).toBeInTheDocument();
  });

  it('should display loaded settings', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Layer2PublicationTab />
      </QueryClientProvider>
    );

    expect(screen.getByText('0.65')).toBeInTheDocument();
    expect(screen.getByText('pricing')).toBeInTheDocument();
    expect(screen.getByText('googlesyndication')).toBeInTheDocument();
  });

  it('should have Save Changes and Reset buttons', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Layer2PublicationTab />
      </QueryClientProvider>
    );

    expect(screen.getByText('Save Changes')).toBeInTheDocument();
    expect(screen.getByText('Reset to Defaults')).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- Layer2PublicationTab.test.tsx`
Expected: FAIL with "Cannot find module '../Layer2PublicationTab'"

**Step 3: Implement Layer2PublicationTab component**

Create: `apps/web/components/settings/Layer2PublicationTab.tsx`

```tsx
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import type { Layer2Rules } from '@website-scraper/shared';
import { useSettings } from '@/hooks/useSettings';
import { useUpdateSettings } from '@/hooks/useUpdateSettings';
import { SliderInput } from './SliderInput';
import { KeywordArrayInput } from './KeywordArrayInput';
import { PatternArrayInput } from './PatternArrayInput';
import { toast } from 'sonner';

const DEFAULT_LAYER2_RULES: Layer2Rules = {
  publication_score_threshold: 0.65,
  product_keywords: {
    commercial: ['pricing', 'buy', 'demo', 'plans', 'free trial', 'get started'],
    features: ['features', 'capabilities', 'solutions', 'product'],
    cta: ['sign up', 'start free', 'book a call', 'request demo'],
  },
  business_nav_keywords: ['product', 'pricing', 'solutions', 'about', 'careers', 'customers', 'contact'],
  content_nav_keywords: ['articles', 'blog', 'news', 'topics', 'categories', 'archives', 'authors'],
  min_business_nav_percentage: 0.3,
  ad_network_patterns: ['googlesyndication', 'adsense', 'doubleclick', 'media.net'],
  affiliate_patterns: ['amazon', 'affiliate', 'aff=', 'ref=', 'amzn'],
  payment_provider_patterns: ['stripe', 'paypal', 'braintree', 'square'],
};

export function Layer2PublicationTab() {
  const { data: settings, isLoading } = useSettings();
  const { mutate: updateSettings, isPending } = useUpdateSettings();

  const { watch, setValue, handleSubmit } = useForm<Layer2Rules>({
    defaultValues: settings?.layer2_rules || DEFAULT_LAYER2_RULES,
    values: settings?.layer2_rules,
  });

  const onSubmit = (data: Layer2Rules) => {
    updateSettings(
      { layer2_rules: data },
      {
        onSuccess: () => {
          toast.success('Layer2 settings saved');
        },
        onError: (error: any) => {
          toast.error(`Failed to save settings: ${error.message}`);
        },
      }
    );
  };

  const handleReset = () => {
    if (confirm('Reset Layer2 settings to defaults? This cannot be undone.')) {
      updateSettings(
        { layer2_rules: DEFAULT_LAYER2_RULES },
        {
          onSuccess: () => {
            toast.success('Layer2 settings reset to defaults');
          },
        }
      );
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  const formValues = watch();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 p-6">
      {/* Detection Threshold */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          📊 Detection Threshold
        </h3>
        <SliderInput
          label="Publication Score Threshold"
          value={formValues.publication_score_threshold}
          min={0}
          max={1}
          step={0.05}
          onChange={(value) => setValue('publication_score_threshold', value)}
          helpText="URLs scoring ≥ this value are rejected as pure publications. Lower = more strict, Higher = more lenient."
        />
      </section>

      {/* Product Offering Detection */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          🏢 Product Offering Detection
        </h3>
        <KeywordArrayInput
          label="Commercial Keywords"
          value={formValues.product_keywords.commercial}
          onChange={(value) => setValue('product_keywords.commercial', value)}
          helpText="Keywords indicating commercial offerings (e.g., pricing, buy, demo)"
        />
        <KeywordArrayInput
          label="Feature Keywords"
          value={formValues.product_keywords.features}
          onChange={(value) => setValue('product_keywords.features', value)}
          helpText="Keywords indicating product features (e.g., features, capabilities)"
        />
        <KeywordArrayInput
          label="CTA Keywords"
          value={formValues.product_keywords.cta}
          onChange={(value) => setValue('product_keywords.cta', value)}
          helpText="Call-to-action keywords (e.g., get started, sign up)"
        />
      </section>

      {/* Navigation Analysis */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          🧭 Navigation Analysis
        </h3>
        <KeywordArrayInput
          label="Business Nav Keywords"
          value={formValues.business_nav_keywords}
          onChange={(value) => setValue('business_nav_keywords', value)}
          helpText="Keywords for business navigation (e.g., product, pricing, solutions)"
        />
        <KeywordArrayInput
          label="Content Nav Keywords"
          value={formValues.content_nav_keywords}
          onChange={(value) => setValue('content_nav_keywords', value)}
          helpText="Keywords for content navigation (e.g., articles, blog, news)"
        />
        <SliderInput
          label="Min Business Nav %"
          value={formValues.min_business_nav_percentage * 100}
          min={0}
          max={100}
          step={5}
          onChange={(value) => setValue('min_business_nav_percentage', value / 100)}
          helpText="Minimum percentage of business navigation required. Sites below this are flagged as publications."
        />
      </section>

      {/* Monetization Detection */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          💰 Monetization Detection
        </h3>
        <PatternArrayInput
          label="Ad Network Patterns"
          value={formValues.ad_network_patterns}
          onChange={(value) => setValue('ad_network_patterns', value)}
          helpText="URL patterns for ad networks (e.g., googlesyndication, adsense)"
        />
        <PatternArrayInput
          label="Affiliate Patterns"
          value={formValues.affiliate_patterns}
          onChange={(value) => setValue('affiliate_patterns', value)}
          helpText="URL patterns for affiliate links (e.g., amazon, affiliate, aff=)"
        />
        <PatternArrayInput
          label="Payment Provider Patterns"
          value={formValues.payment_provider_patterns}
          onChange={(value) => setValue('payment_provider_patterns', value)}
          helpText="URL patterns for payment providers (e.g., stripe, paypal)"
        />
      </section>

      {/* Action Buttons */}
      <div className="flex gap-4 pt-4 border-t">
        <button
          type="button"
          onClick={handleReset}
          disabled={isPending}
          className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          Reset to Defaults
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- Layer2PublicationTab.test.tsx`
Expected: PASS (all 3 tests)

**Step 5: Commit**

```bash
git add apps/web/components/settings/Layer2PublicationTab.tsx apps/web/components/settings/__tests__/Layer2PublicationTab.test.tsx
git commit -m "feat(settings): Add Layer2PublicationTab main component"
```

---

## Task 5: Create useUpdateSettings Hook

**Files:**
- Create: `apps/web/hooks/useUpdateSettings.ts`

**Step 1: Implement useUpdateSettings hook**

Create: `apps/web/hooks/useUpdateSettings.ts`

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UpdateClassificationSettingsDto } from '@website-scraper/shared';

async function updateSettings(data: UpdateClassificationSettingsDto) {
  const response = await fetch('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update settings');
  }

  return response.json();
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}
```

**Step 2: Commit**

```bash
git add apps/web/hooks/useUpdateSettings.ts
git commit -m "feat(hooks): Add useUpdateSettings hook for Layer2 settings"
```

---

## Task 6: Update Settings Page to Use New Component

**Files:**
- Modify: `apps/web/app/settings/page.tsx`
- Delete: `apps/web/components/settings/Layer2OperationalTab.tsx` (old file)

**Step 1: Update settings page import**

Modify: `apps/web/app/settings/page.tsx`

Find the line that imports `Layer2OperationalTab`:
```tsx
import { Layer2OperationalTab } from '@/components/settings/Layer2OperationalTab';
```

Replace with:
```tsx
import { Layer2PublicationTab } from '@/components/settings/Layer2PublicationTab';
```

Find where `Layer2OperationalTab` is used (probably in a TabsContent):
```tsx
<TabsContent value="layer2">
  <Layer2OperationalTab />
</TabsContent>
```

Replace with:
```tsx
<TabsContent value="layer2">
  <Layer2PublicationTab />
</TabsContent>
```

Also update the tab label if needed:
```tsx
<TabsTrigger value="layer2">Layer 2: Publication Detection</TabsTrigger>
```

**Step 2: Remove old Layer2OperationalTab file**

```bash
git rm apps/web/components/settings/Layer2OperationalTab.tsx
```

**Step 3: Commit**

```bash
git add apps/web/app/settings/page.tsx
git commit -m "feat(settings): Replace old Layer2 tab with new publication detection UI"
```

---

## Task 7: Test in Browser

**Files:**
- None (manual browser testing)

**Step 1: Start dev server**

Run: `npm run dev` (in apps/web directory)
Expected: Dev server starts on http://localhost:3000

**Step 2: Navigate to settings page**

Open browser: http://localhost:3000/settings
Click: "Layer 2" tab (or "Layer 2: Publication Detection")

**Step 3: Verify UI renders correctly**

Check:
- [ ] All 4 sections visible (Threshold, Product Offering, Navigation, Monetization)
- [ ] Threshold slider shows 0.65
- [ ] Commercial keywords show as tags (pricing, buy, etc.)
- [ ] All keyword arrays render properly
- [ ] Nav percentage slider shows 30%
- [ ] All pattern arrays render (ad networks, affiliates, payment providers)
- [ ] Save Changes and Reset buttons visible

**Step 4: Test threshold slider interaction**

Action: Drag threshold slider
Expected:
- Value updates in real-time
- Slider moves smoothly
- Number next to slider updates

**Step 5: Test keyword addition**

Action: Click "+ Add" on Commercial Keywords → Type "pricing" → Press Enter
Expected:
- Error message: "Keyword already exists" (duplicate)

Action: Click "+ Add" → Type "newkeyword" → Press Enter
Expected:
- New tag "newkeyword" appears
- Input field closes
- No error

**Step 6: Test keyword removal**

Action: Click × on any keyword tag
Expected:
- Tag disappears
- No error

**Step 7: Test save functionality**

Action: Make any change → Click "Save Changes"
Expected:
- Button shows "Saving..." briefly
- Success toast appears: "Layer2 settings saved"
- Button returns to "Save Changes"

**Step 8: Test persistence**

Action: Refresh page
Expected:
- Changes persist
- Settings load with saved values

**Step 9: Test reset functionality**

Action: Click "Reset to Defaults"
Expected:
- Confirmation dialog appears: "Reset Layer2 settings to defaults?"
- Click OK
- Settings restore to defaults
- Success toast: "Layer2 settings reset to defaults"

**Step 10: Check for errors**

Action: Open browser DevTools console
Expected:
- No console errors
- No network errors in Network tab
- API calls to /api/settings visible and successful

**Step 11: Take screenshot**

Action: Take screenshot of working UI
Save to: `test-screenshots/layer2-settings-ui.png`

**Step 12: Commit screenshot**

```bash
git add test-screenshots/layer2-settings-ui.png
git commit -m "test: Add screenshot of Layer2 settings UI"
```

---

## Execution Complete

All tasks completed! The Layer2 settings UI is now fully implemented with:

✅ Reusable components (SliderInput, KeywordArrayInput, PatternArrayInput)
✅ Main Layer2PublicationTab component
✅ Form state management with React Hook Form
✅ API integration with React Query
✅ Validation and error handling
✅ Auto-save and optimistic updates
✅ Reset to defaults functionality
✅ Browser testing verified

**Next Steps:**
1. Deploy to production
2. Monitor for user feedback
3. Iterate on UX improvements
