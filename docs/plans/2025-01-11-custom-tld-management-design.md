# Custom TLD Management - Design Document

**Date:** 2025-01-11
**Feature:** Allow users to add custom TLDs to Layer 1 Domain filtering
**Status:** Design Approved

## Overview

Enable system-wide custom TLD management in the Classification Settings page, allowing users to add, remove, and toggle custom domain extensions beyond the predefined list. Custom TLDs are stored in the existing settings infrastructure and displayed in a unified alphabetized list alongside predefined TLDs.

## Requirements Summary

From brainstorming session:

- **Scope:** System-wide (all users share the same custom TLDs)
- **UI Pattern:** Text input + Add button for adding TLDs
- **Display:** Single "All TLDs" list (flattens categories, alphabetically sorted)
- **Deletion:** Individual delete buttons for custom TLDs only
- **Validation:** Must start with dot, no duplicates (case-insensitive)

## Architecture

### Data Model

Extend the existing `Layer1Rules.tld_filters` interface to include a `custom` array:

```typescript
tld_filters: {
  commercial: string[];      // Existing - e.g., ['.com', '.io', '.co', '.ai']
  non_commercial: string[];  // Existing - e.g., ['.org', '.gov', '.edu']
  personal: string[];        // Existing - e.g., ['.me', '.blog', '.xyz']
  custom: string[];          // NEW - user-added TLDs
}
```

**Storage Location:** `classification_settings.layer1_rules` JSONB column (existing)

**Benefits:**
- No new database tables or API endpoints required
- Leverages existing settings infrastructure (caching, validation, optimistic updates)
- Backward compatible (missing `custom` field defaults to `[]`)
- Persists across sessions via database

### Backend Changes

#### 1. Shared Types (`packages/shared/src/types/settings.ts`)

```typescript
export interface Layer1Rules {
  tld_filters: {
    commercial: string[];
    non_commercial: string[];
    personal: string[];
    custom: string[];  // NEW
  };
  industry_keywords: string[];
  url_pattern_exclusions: Array<{
    pattern: string;
    enabled: boolean;
    category?: string;
    reasoning?: string;
  }>;
  target_elimination_rate: number;
}
```

#### 2. Validation DTO (`apps/api/src/settings/dto/layer1-rules.dto.ts`)

```typescript
export class TldFiltersDto {
  @IsArray()
  @IsString({ each: true })
  commercial?: string[];

  @IsArray()
  @IsString({ each: true })
  non_commercial?: string[];

  @IsArray()
  @IsString({ each: true })
  personal?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()  // Optional - defaults to []
  custom?: string[];  // NEW
}
```

#### 3. Default Settings (`apps/api/src/settings/settings.service.ts`)

Update line ~352 to include empty custom array:

```typescript
layer1_rules: {
  tld_filters: {
    commercial: ['.com', '.io', '.co', '.ai'],
    non_commercial: ['.org', '.gov', '.edu'],
    personal: ['.me', '.blog', '.xyz'],
    custom: [],  // NEW - starts empty
  },
  industry_keywords: ['SaaS', 'consulting', 'software', 'platform', 'marketing', 'agency'],
  url_pattern_exclusions: v1PrefilterRules,
  target_elimination_rate: 0.5,
}
```

**No API Changes Required:** The existing `PUT /api/settings` endpoint already handles full settings updates with validation. Custom TLDs flow through automatically.

### Frontend Changes

#### 1. Component Restructure (`apps/web/components/settings/Layer1DomainTab.tsx`)

**Current Structure:** Three separate sections (Commercial TLDs, Non-Commercial TLDs, Personal TLDs)

**New Structure:** Single unified "All TLDs" section

```
┌─ TLD Filtering ─────────────────────────────────┐
│ Select which domain extensions to include       │
│                                                  │
│ [Text Input: .crypto          ] [+ Add Button]  │
│                                                  │
│ ┌─ All TLDs (alphabetically sorted) ───────┐   │
│ │ ☑ .ai                              [🗑]   │   (deletable: custom)
│ │ ☑ .blog                            [🗑]   │   (deletable: custom)
│ │ ☑ .co                                     │   (locked: predefined)
│ │ ☑ .com                                    │   (locked: predefined)
│ │ ☐ .crypto                          [🗑]   │   (deletable: custom)
│ │ ☑ .edu                                    │   (locked: predefined)
│ └───────────────────────────────────────────┘   │
└──────────────────────────────────────────────────┘
```

#### 2. State Management

```typescript
// Merge all TLD arrays into unified list
const allTlds = useMemo(() => {
  const predefined = [
    ...rules.tld_filters.commercial,
    ...rules.tld_filters.non_commercial,
    ...rules.tld_filters.personal,
  ];
  const custom = rules.tld_filters.custom || [];

  return [...new Set([...predefined, ...custom])]
    .sort()
    .map(tld => ({
      value: tld,
      isCustom: custom.includes(tld),
      isChecked: isCheckedTld(tld),
    }));
}, [rules.tld_filters]);

// Helper to determine if TLD is checked (included in any array)
const isCheckedTld = (tld: string) => {
  return [
    ...rules.tld_filters.commercial,
    ...rules.tld_filters.non_commercial,
    ...rules.tld_filters.personal,
    ...rules.tld_filters.custom,
  ].includes(tld);
};
```

#### 3. Add TLD Handler

```typescript
const [newTld, setNewTld] = useState('');
const [error, setError] = useState('');

const handleAddTld = () => {
  let tld = newTld.trim();

  // Auto-prepend dot if missing (UX helper)
  if (tld && !tld.startsWith('.')) {
    tld = `.${tld}`;
  }

  // Validation: Empty check
  if (!tld) {
    setError('Please enter a TLD');
    return;
  }

  // Validation: Duplicate check (case-insensitive)
  const allExisting = [
    ...rules.tld_filters.commercial,
    ...rules.tld_filters.non_commercial,
    ...rules.tld_filters.personal,
    ...rules.tld_filters.custom,
  ].map(t => t.toLowerCase());

  if (allExisting.includes(tld.toLowerCase())) {
    setError(`TLD ${tld} already exists`);
    return;
  }

  // Add to custom array
  const updated = {
    ...rules.tld_filters,
    custom: [...(rules.tld_filters.custom || []), tld]
  };

  setFormData({
    ...formData,
    layer1_rules: {
      ...rules,
      tld_filters: updated
    }
  });

  setNewTld('');
  setError('');
  setHasUnsavedChanges(true);
};
```

#### 4. Delete TLD Handler

```typescript
const handleDeleteTld = (tld: string) => {
  const updated = {
    ...rules.tld_filters,
    custom: (rules.tld_filters.custom || []).filter(t => t !== tld)
  };

  setFormData({
    ...formData,
    layer1_rules: {
      ...rules,
      tld_filters: updated
    }
  });

  setHasUnsavedChanges(true);
};
```

#### 5. Toggle TLD Handler

```typescript
const handleTldToggle = (tld: string) => {
  const isCustom = (rules.tld_filters.custom || []).includes(tld);
  const isCurrentlyChecked = isCheckedTld(tld);

  if (isCustom) {
    // For custom TLDs, toggle within custom array
    const updated = {
      ...rules.tld_filters,
      custom: isCurrentlyChecked
        ? rules.tld_filters.custom.filter(t => t !== tld)
        : [...(rules.tld_filters.custom || []), tld]
    };

    setFormData({
      ...formData,
      layer1_rules: {
        ...rules,
        tld_filters: updated
      }
    });
  } else {
    // For predefined TLDs, toggle within respective category
    // (Keep existing handleTldToggle logic for predefined categories)
  }

  setHasUnsavedChanges(true);
};
```

## Validation Rules

### Frontend Validation

1. **Empty Input:** Block Add button if input is empty
2. **Auto-prepend Dot:** If user types `crypto`, convert to `.crypto`
3. **Duplicate Detection:**
   - Check across all four arrays (case-insensitive)
   - Show error toast: "TLD already exists"
4. **Format Validation:** Basic check for invalid characters (optional enhancement)

### Backend Validation

1. **Type Validation:** `@IsArray()` and `@IsString({ each: true })` via class-validator
2. **Optional Field:** `@IsOptional()` allows missing `custom` field (defaults to `[]`)
3. **Existing Layer 1 Validation:** "At least one TLD selected" includes custom TLDs

## Error Handling & Edge Cases

| Scenario | Handling |
|----------|----------|
| **Duplicate TLD** | Show toast error, block addition |
| **Empty Input** | Disable Add button, show validation message |
| **Settings Reset** | Clear `custom` array, revert to defaults |
| **Missing Custom Field** | Backend defaults to `[]` via `@IsOptional()` |
| **Delete Predefined TLD** | No delete button shown (UI prevents) |
| **Save Failure** | React Query optimistic rollback + error toast |
| **Network Error** | Existing error handling via `useUpdateSettings` |

## Testing Strategy

### Unit Tests (Backend)

**File:** `apps/api/src/settings/dto/layer1-rules.dto.spec.ts`

```typescript
describe('TldFiltersDto', () => {
  it('should accept valid custom array', () => {
    const dto = plainToClass(TldFiltersDto, {
      custom: ['.crypto', '.web3']
    });
    const errors = validateSync(dto);
    expect(errors).toHaveLength(0);
  });

  it('should accept missing custom field', () => {
    const dto = plainToClass(TldFiltersDto, {
      commercial: ['.com']
    });
    const errors = validateSync(dto);
    expect(errors).toHaveLength(0);
  });

  it('should reject non-string custom values', () => {
    const dto = plainToClass(TldFiltersDto, {
      custom: [123, '.crypto']
    });
    const errors = validateSync(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
```

**File:** `apps/api/src/settings/settings.service.spec.ts`

```typescript
describe('SettingsService', () => {
  it('should include empty custom array in defaults', async () => {
    const settings = await service.getSettings();
    expect(settings.layer1_rules.tld_filters.custom).toEqual([]);
  });

  it('should preserve custom TLDs on update', async () => {
    const updated = await service.updateSettings({
      layer1_rules: {
        tld_filters: {
          commercial: ['.com'],
          non_commercial: ['.org'],
          personal: ['.me'],
          custom: ['.crypto', '.web3']
        }
      }
    });
    expect(updated.layer1_rules.tld_filters.custom).toEqual(['.crypto', '.web3']);
  });
});
```

### Component Tests (Frontend)

**File:** `apps/web/components/settings/Layer1DomainTab.spec.tsx`

```typescript
describe('Layer1DomainTab - Custom TLDs', () => {
  it('should render all TLDs alphabetically', () => {
    const { getAllByRole } = render(<Layer1DomainTab {...props} />);
    const checkboxes = getAllByRole('checkbox');
    const labels = checkboxes.map(cb => cb.getAttribute('aria-label'));
    expect(labels).toEqual(['.ai', '.blog', '.co', '.com', '.crypto', '.edu']);
  });

  it('should add custom TLD when Add button clicked', () => {
    const { getByPlaceholderText, getByText } = render(<Layer1DomainTab {...props} />);
    const input = getByPlaceholderText('Add custom TLD');
    const addButton = getByText('Add');

    fireEvent.change(input, { target: { value: '.crypto' } });
    fireEvent.click(addButton);

    expect(mockSetFormData).toHaveBeenCalledWith(
      expect.objectContaining({
        layer1_rules: expect.objectContaining({
          tld_filters: expect.objectContaining({
            custom: expect.arrayContaining(['.crypto'])
          })
        })
      })
    );
  });

  it('should auto-prepend dot if missing', () => {
    const { getByPlaceholderText, getByText } = render(<Layer1DomainTab {...props} />);
    const input = getByPlaceholderText('Add custom TLD');

    fireEvent.change(input, { target: { value: 'crypto' } });
    fireEvent.click(getByText('Add'));

    expect(mockSetFormData).toHaveBeenCalledWith(
      expect.objectContaining({
        layer1_rules: expect.objectContaining({
          tld_filters: expect.objectContaining({
            custom: ['.crypto']
          })
        })
      })
    );
  });

  it('should show error on duplicate TLD', () => {
    const { getByPlaceholderText, getByText, getByRole } = render(<Layer1DomainTab {...props} />);
    const input = getByPlaceholderText('Add custom TLD');

    fireEvent.change(input, { target: { value: '.com' } });
    fireEvent.click(getByText('Add'));

    expect(getByRole('alert')).toHaveTextContent('TLD .com already exists');
  });

  it('should only show delete button for custom TLDs', () => {
    const { getAllByTestId, queryByTestId } = render(<Layer1DomainTab {...props} />);

    expect(queryByTestId('delete-tld-.com')).toBeNull(); // Predefined
    expect(queryByTestId('delete-tld-.crypto')).toBeInTheDocument(); // Custom
  });

  it('should remove custom TLD when delete clicked', () => {
    const { getByTestId } = render(<Layer1DomainTab {...props} />);

    fireEvent.click(getByTestId('delete-tld-.crypto'));

    expect(mockSetFormData).toHaveBeenCalledWith(
      expect.objectContaining({
        layer1_rules: expect.objectContaining({
          tld_filters: expect.objectContaining({
            custom: []
          })
        })
      })
    );
  });
});
```

### E2E Tests

**File:** `apps/web/tests/e2e/custom-tlds.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Custom TLD Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    await page.click('button:has-text("Layer 1 Domain")');
  });

  test('SC-012: Add custom TLD and verify persistence', async ({ page }) => {
    // Add custom TLD
    await page.fill('input[placeholder*="Add custom TLD"]', '.crypto');
    await page.click('button:has-text("Add")');

    // Verify appears in list
    await expect(page.locator('text=.crypto')).toBeVisible();

    // Check the TLD
    await page.check('input[type="checkbox"][aria-label=".crypto"]');

    // Save settings
    await page.click('button:has-text("Save Changes")');
    await expect(page.locator('text=Settings saved successfully')).toBeVisible();

    // Reload page
    await page.reload();

    // Verify custom TLD persists
    await page.click('button:has-text("Layer 1 Domain")');
    await expect(page.locator('text=.crypto')).toBeVisible();
    await expect(page.locator('input[type="checkbox"][aria-label=".crypto"]')).toBeChecked();
  });

  test('SC-013: Prevent duplicate TLD addition', async ({ page }) => {
    await page.fill('input[placeholder*="Add custom TLD"]', '.com');
    await page.click('button:has-text("Add")');

    await expect(page.locator('text=TLD .com already exists')).toBeVisible();
  });

  test('SC-014: Delete custom TLD', async ({ page }) => {
    // Add TLD
    await page.fill('input[placeholder*="Add custom TLD"]', '.test');
    await page.click('button:has-text("Add")');

    // Delete TLD
    await page.click('button[data-testid="delete-tld-.test"]');

    // Verify removed
    await expect(page.locator('text=.test')).not.toBeVisible();
  });

  test('SC-015: Auto-prepend dot', async ({ page }) => {
    await page.fill('input[placeholder*="Add custom TLD"]', 'crypto');
    await page.click('button:has-text("Add")');

    await expect(page.locator('text=.crypto')).toBeVisible();
  });

  test('SC-016: Reset to defaults clears custom TLDs', async ({ page }) => {
    // Add custom TLD
    await page.fill('input[placeholder*="Add custom TLD"]', '.crypto');
    await page.click('button:has-text("Add")');
    await page.click('button:has-text("Save Changes")');

    // Reset settings
    await page.click('button:has-text("Reset to Defaults")');
    await page.click('button:has-text("Confirm")');

    // Verify custom TLD removed
    await expect(page.locator('text=.crypto')).not.toBeVisible();
  });
});
```

## Manual Testing Checklist

- [ ] Add custom TLD `.crypto` → appears in alphabetically sorted list
- [ ] Try to add duplicate `.com` → see error toast
- [ ] Auto-prepend dot: type `web3` → converts to `.web3`
- [ ] Check `.crypto` checkbox → included in active filters
- [ ] Delete `.crypto` → removed from list
- [ ] Save settings → reload page → custom TLDs persist
- [ ] Reset to defaults → custom TLDs cleared
- [ ] Verify "Unsaved changes" warning when adding/deleting TLDs
- [ ] Verify predefined TLDs have no delete button
- [ ] Verify custom TLDs have delete button

## Deployment Considerations

### Migration Strategy

**No database migration required!** The `layer1_rules` column is already JSONB, allowing schema-less additions.

**Backward Compatibility:**
- Existing records without `custom` field: Backend treats as `undefined` → `@IsOptional()` → defaults to `[]`
- Old frontend versions: Ignore unknown `custom` field gracefully

**Rollback Safety:**
- Removing feature doesn't break existing data
- Custom TLDs simply ignored by old code

### Deployment Steps

1. Deploy backend changes (types, DTO, defaults)
2. Run backend tests: `npm test -- settings.service.spec.ts`
3. Deploy frontend changes (component refactor)
4. Run E2E tests: `npm run test:e2e -- custom-tlds.spec.ts`
5. Manual smoke test in staging environment
6. Deploy to production (zero downtime)

### Performance Impact

- **Minimal:** Custom TLDs stored in existing JSONB field
- **Caching:** Leverages existing 5-minute cache (no additional queries)
- **UI Rendering:** Negligible (sorting ~20 TLDs is instant)

## Estimated Effort

| Component | Time Estimate |
|-----------|---------------|
| Backend types & validation | 1 hour |
| Backend tests | 1 hour |
| Frontend component refactor | 3 hours |
| Frontend tests | 1 hour |
| E2E tests | 1 hour |
| Manual testing & polish | 1 hour |
| **Total** | **~8 hours** |

## Success Criteria

✅ Users can add custom TLDs via text input
✅ Custom TLDs appear in unified alphabetized list
✅ Delete button only shown for custom TLDs
✅ Validation prevents duplicates and enforces dot prefix
✅ Custom TLDs persist across sessions
✅ Reset to defaults clears custom TLDs
✅ All tests pass (unit, component, E2E)
✅ Zero database migration required
✅ Backward compatible with existing settings

## Future Enhancements (Out of Scope)

- User-specific custom TLDs (current: system-wide only)
- Import/export custom TLD lists
- TLD categories for custom TLDs (e.g., "Blockchain TLDs")
- Format validation (regex for valid TLD characters)
- Length limits (IANA standard: 2-63 characters)
- Bulk add/remove operations
