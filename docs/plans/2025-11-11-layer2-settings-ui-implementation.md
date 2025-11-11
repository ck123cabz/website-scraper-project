# Layer 2 Settings UI Implementation Design

**Date:** 2025-11-11
**Status:** Design Approved
**Author:** Design Session with User

## Executive Summary

Implement the missing Layer2 settings UI for the publication detection system. The current settings page displays the OLD Layer2 structure (blog freshness, tech stack, design quality) which no longer exists in the type system. Users need a UI to configure the NEW publication detection settings: threshold, product keywords, navigation keywords, and monetization patterns.

**Approach:** Complete rewrite of `Layer2OperationalTab.tsx` with fresh components, replacing all old fields with the new publication detection structure.

## Context

**Completed Work:**
- ✅ Backend Layer2 refactor complete (4 detection modules)
- ✅ Type definitions updated (Layer2Rules, Layer2Signals)
- ✅ Settings persistence working (database save/load)
- ✅ Manual Review UI updated (displays new signals)

**Missing:**
- ❌ Settings UI (still shows old fields that don't exist in types)

**Impact:** Users currently have NO way to configure publication detection settings through the UI. The settings page references fields that no longer exist, causing type errors and confusion.

## Goals

1. **Primary:** Replace old Layer2 settings UI with new publication detection UI
2. **User Experience:** Intuitive configuration of all 4 detection modules
3. **Validation:** Client-side validation with clear error messages
4. **Persistence:** Auto-save changes with optimistic updates
5. **Defaults:** Reset to sensible default values

## Design Decisions

### Decision 1: Complete Rewrite vs Gradual Migration

**Choice:** Complete rewrite of `Layer2OperationalTab.tsx`

**Rationale:**
- Old fields don't exist in type system anymore (blog_freshness_days, required_pages_count, etc.)
- TypeScript compilation errors with current implementation
- Faster to rebuild than refactor
- Clean slate for new structure

**Alternatives Considered:**
- Gradual transformation: Too complex given type mismatch
- Side-by-side migration: Unnecessary complexity for internal tool

### Decision 2: Component Reuse Strategy

**Choice:** Build fresh components specific to Layer2

**Rationale:**
- Layer1 TLD components are too specialized for reuse
- Fresh components allow Layer2-specific validation and UX
- Better isolation and maintainability

**Alternatives Considered:**
- Reuse Layer1 components: Too coupled to TLD logic
- Generic shared components: Premature abstraction

### Decision 3: State Management

**Choice:** React Hook Form with React Query

**Rationale:**
- React Hook Form for form state and validation (already used in project)
- React Query for server state and caching (already used in project)
- Debounced auto-save (500ms) for better UX
- Optimistic updates with rollback on error

## Architecture

### Component Structure

```
Layer2PublicationTab.tsx (main container)
├── ThresholdSection
│   └── Slider (publication_score_threshold: 0-1)
├── ProductKeywordsSection
│   ├── KeywordArrayInput (commercial)
│   ├── KeywordArrayInput (features)
│   └── KeywordArrayInput (cta)
├── NavigationSection
│   ├── KeywordArrayInput (business_nav_keywords)
│   ├── KeywordArrayInput (content_nav_keywords)
│   └── PercentageSlider (min_business_nav_percentage: 0-100%)
├── MonetizationSection
│   ├── PatternArrayInput (ad_network_patterns)
│   ├── PatternArrayInput (affiliate_patterns)
│   └── PatternArrayInput (payment_provider_patterns)
└── ActionButtons
    ├── Button (Reset to Defaults)
    └── Button (Save Changes)
```

### Reusable Components

**SliderInput:**
- Props: `value`, `min`, `max`, `step`, `label`, `helpText`, `onChange`
- Displays current value next to slider
- Range validation

**KeywordArrayInput:**
- Props: `value: string[]`, `label`, `placeholder`, `onChange`
- Tag-based interface (click × to remove, + Add to add new)
- Validation: non-empty, trimmed, lowercase, no duplicates
- Enter key to add new keyword

**PatternArrayInput:**
- Similar to KeywordArrayInput but for URL/domain patterns
- Different placeholder text and help text

### Data Flow

```
┌─────────────┐
│   User      │
│  Edits UI   │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ React Hook Form │ (validation, state)
└──────┬──────────┘
       │
       ▼ (debounced 500ms)
┌─────────────────┐
│  useMutation    │ (updateSettings API)
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│    Backend      │ (persist to database)
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  queryClient    │ (invalidate + refetch)
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│   UI Updates    │ (optimistic update)
└─────────────────┘
```

## UI Design

### Layout

```
┌─ Layer 2: Publication Detection ──────────────────────┐
│                                                        │
│  📊 Detection Threshold                                │
│  ├─ Publication Score Threshold                        │
│  │   [━━━━━━●━━━] 0.65                                 │
│  │   Lower = more strict, Higher = more lenient        │
│  │   URLs scoring ≥ this value are rejected           │
│                                                        │
│  🏢 Product Offering Detection                         │
│  ├─ Commercial Keywords                                │
│  │   [pricing] [buy] [demo] [+ Add]                   │
│  ├─ Feature Keywords                                   │
│  │   [features] [capabilities] [+ Add]                │
│  └─ CTA Keywords                                       │
│      [get started] [sign up] [+ Add]                  │
│                                                        │
│  🧭 Navigation Analysis                                │
│  ├─ Business Nav Keywords                              │
│  │   [product] [pricing] [solutions] [+ Add]          │
│  ├─ Content Nav Keywords                               │
│  │   [articles] [blog] [news] [+ Add]                 │
│  └─ Min Business Nav %                                 │
│      [━━━●━━━━━━] 30%                                  │
│                                                        │
│  💰 Monetization Detection                             │
│  ├─ Ad Network Patterns                                │
│  │   [googlesyndication] [adsense] [+ Add]            │
│  ├─ Affiliate Patterns                                 │
│  │   [amazon] [affiliate] [+ Add]                     │
│  └─ Payment Provider Patterns                          │
│      [stripe] [paypal] [+ Add]                        │
│                                                        │
│  [Reset to Defaults]  [Save Changes]                  │
└────────────────────────────────────────────────────────┘
```

### Visual Design Tokens

- **Spacing:** Use Tailwind spacing scale (space-y-6 for sections, space-y-3 for fields)
- **Colors:**
  - Section headers: text-gray-900
  - Labels: text-sm text-gray-600
  - Help text: text-xs text-gray-500
  - Error messages: text-sm text-red-600
  - Success: text-green-600
- **Icons:** Use emoji for section headers (📊 🏢 🧭 💰)
- **Tags:**
  - Background: bg-blue-100
  - Text: text-blue-800
  - Border: rounded-full
  - Remove button: hover:bg-blue-200

### Interactions

1. **Slider Interaction:**
   - Drag handle to adjust value
   - Value updates in real-time next to slider
   - Range: 0-1 (threshold), 0-100 (nav %)
   - Step: 0.05 (threshold), 5 (nav %)

2. **Keyword Tag Interaction:**
   - Click × button on tag to remove
   - Click "+ Add" to show input field
   - Type keyword and press Enter or click Add
   - ESC to cancel input
   - Validation on blur: trim, lowercase, check duplicates

3. **Save Behavior:**
   - Debounced auto-save on blur (500ms delay)
   - Manual "Save Changes" button for immediate save
   - Optimistic update (UI updates before server confirms)
   - Show spinner during save
   - Show checkmark on success (2s)
   - Show error toast on failure with retry button

4. **Reset Behavior:**
   - "Reset to Defaults" button
   - Confirmation dialog: "Reset Layer2 settings to defaults? This cannot be undone."
   - On confirm: Restore default values and save immediately

### Validation Rules

**Threshold:**
- Type: number
- Range: 0-1 (inclusive)
- Error: "Threshold must be between 0 and 1"

**Nav Percentage:**
- Type: number
- Range: 0-100 (displayed as percentage)
- Stored as: 0-1 in database
- Error: "Percentage must be between 0 and 100"

**Keywords (all types):**
- Type: string[]
- Min length: 1 character per keyword
- Transform: trim() + toLowerCase()
- Validation: no duplicates
- Error: "Keyword already exists"

**Patterns (all types):**
- Type: string[]
- Min length: 1 character per pattern
- Transform: trim()
- Validation: no duplicates
- Error: "Pattern already exists"

## API Integration

### Hooks Used

**useSettings():**
```typescript
const { data: settings, isLoading, error } = useSettings();
const layer2Rules = settings?.layer2_rules;
```

**useMutation:**
```typescript
const mutation = useMutation({
  mutationFn: (data: Layer2Rules) =>
    updateSettings({ layer2_rules: data }),
  onSuccess: () => {
    queryClient.invalidateQueries(['settings']);
    toast.success('Layer2 settings saved');
  },
  onError: (error) => {
    toast.error(`Failed to save settings: ${error.message}`);
  }
});
```

### API Endpoints

**GET /api/settings**
- Returns: `{ layer2_rules: Layer2Rules, ... }`
- Used by: useSettings() hook

**PUT /api/settings**
- Body: `{ layer2_rules: Layer2Rules }`
- Returns: Updated settings
- Validation: Layer2RulesDto on backend

### Default Values

Match backend defaults from `DEFAULT_RULES` in `layer2-operational-filter.service.ts`:

```typescript
const DEFAULT_LAYER2_RULES: Layer2Rules = {
  publication_score_threshold: 0.65,
  product_keywords: {
    commercial: ['pricing', 'buy', 'demo', 'plans', 'free trial', 'get started'],
    features: ['features', 'capabilities', 'solutions', 'product'],
    cta: ['sign up', 'start free', 'book a call', 'request demo'],
  },
  business_nav_keywords: ['product', 'pricing', 'solutions', 'about', 'careers', 'customers', 'contact'],
  content_nav_keywords: ['articles', 'blog', 'news', 'topics', 'categories', 'archives', 'authors'],
  min_business_nav_percentage: 0.3, // 30%
  ad_network_patterns: ['googlesyndication', 'adsense', 'doubleclick', 'media.net'],
  affiliate_patterns: ['amazon', 'affiliate', 'aff=', 'ref=', 'amzn'],
  payment_provider_patterns: ['stripe', 'paypal', 'braintree', 'square'],
};
```

## Error Handling

### Network Errors
- **Symptom:** API request fails (timeout, 500, etc.)
- **Action:** Show error toast with retry button
- **Message:** "Failed to save settings. [Retry]"
- **Recovery:** Manual retry or page refresh

### Validation Errors
- **Symptom:** Backend returns 400 with validation errors
- **Action:** Show inline error messages under each field
- **Message:** Field-specific error from backend
- **Recovery:** User fixes validation errors

### Save Conflicts
- **Symptom:** Settings changed by another user/session
- **Action:** Show conflict dialog
- **Message:** "Settings have been updated elsewhere. Reload to see latest changes?"
- **Recovery:** Reload settings and prompt user to re-enter changes

### Loading States
- **Initial load:** Skeleton UI for all sections
- **Save in progress:** Spinner on Save button, disable form
- **Reset in progress:** Spinner on Reset button, disable form

## Testing Strategy

### Unit Tests

**Component Tests:**
- SliderInput: Value updates on drag, validation works
- KeywordArrayInput: Add/remove keywords, duplicate detection
- Layer2PublicationTab: Renders all sections, loads settings

**Hook Tests:**
- Form validation rules work correctly
- Debounce logic prevents excessive API calls

### Integration Tests

**User Flows:**
1. **Load settings:** Visit settings page → Layer2 tab → See current values
2. **Edit threshold:** Drag slider → Value updates → Auto-save triggers
3. **Add keyword:** Click "+ Add" → Type keyword → Press Enter → Tag appears
4. **Remove keyword:** Click × on tag → Tag disappears → Auto-save triggers
5. **Reset defaults:** Click Reset → Confirm dialog → Defaults restored → Saved

**API Integration:**
1. **Save success:** Edit field → Wait 500ms → API called → Success toast
2. **Save failure:** Mock API error → Error toast with retry → Retry works
3. **Concurrent edits:** Edit multiple fields → Single API call after debounce
4. **Optimistic update:** Edit field → UI updates immediately → Server confirms

### Browser Testing

**Manual Testing Checklist:**
- [ ] Open settings page in browser (http://localhost:3000/settings)
- [ ] Click "Layer 2" tab (or similar)
- [ ] Verify all sections render correctly
- [ ] Drag threshold slider → Value updates
- [ ] Add keyword → Tag appears
- [ ] Remove keyword → Tag disappears
- [ ] Check network tab → API call made after 500ms
- [ ] Refresh page → Settings persist
- [ ] Click Reset → Confirm → Defaults restored
- [ ] Check for console errors

## Migration Plan

### Phase 1: Component Implementation
1. Create new `Layer2PublicationTab.tsx` component
2. Implement reusable components (SliderInput, KeywordArrayInput, PatternArrayInput)
3. Add form validation with React Hook Form
4. Wire up API integration with React Query

### Phase 2: Replace Old Component
1. Update settings page to import new component
2. Remove old `Layer2OperationalTab.tsx` file
3. Update any references in test files

### Phase 3: Testing & Verification
1. Run unit tests for new components
2. Test in browser with dev server
3. Test save/load cycle with real database
4. Verify no TypeScript errors
5. Test all user interactions (add, remove, edit, save, reset)

### Phase 4: Deployment
1. Commit changes with descriptive message
2. Deploy to production
3. Monitor for errors in logs
4. User testing and feedback

## Success Metrics

**Completion Criteria:**
- [ ] User can load Layer2 settings from database
- [ ] User can edit all Layer2 fields in UI
- [ ] Changes save to database successfully
- [ ] Reset to defaults works
- [ ] No TypeScript compilation errors
- [ ] No console errors in browser
- [ ] All unit tests pass
- [ ] Manual browser testing passes

**User Experience Metrics:**
- Settings save within 1 second of edit (after debounce)
- No page refresh required to see saved changes
- Clear validation errors shown inline
- Intuitive keyword/pattern management

## Risks & Mitigations

### Risk 1: Type Mismatches
**Risk:** Frontend types don't match backend Layer2Rules type
**Impact:** TypeScript errors, runtime failures
**Mitigation:** Use shared types from `@website-scraper/shared` package

### Risk 2: Data Loss
**Risk:** User edits lost if save fails
**Impact:** Frustration, wasted time
**Mitigation:** Optimistic updates + error recovery with retry

### Risk 3: Concurrent Edits
**Risk:** Multiple users/tabs editing same settings
**Impact:** Overwrite conflicts
**Mitigation:** Last-write-wins (acceptable for admin settings)

### Risk 4: Invalid Defaults
**Risk:** Frontend defaults don't match backend defaults
**Impact:** Inconsistent behavior
**Mitigation:** Import defaults from backend constant or API

## Open Questions

None - design is complete and ready for implementation.

## Appendix: File Structure

```
apps/web/
├── app/settings/page.tsx (update import)
├── components/settings/
│   ├── Layer2PublicationTab.tsx (NEW - complete rewrite)
│   ├── SliderInput.tsx (NEW - reusable)
│   ├── KeywordArrayInput.tsx (NEW - reusable)
│   └── PatternArrayInput.tsx (NEW - reusable)
└── hooks/
    └── useSettings.ts (already exists)

packages/shared/src/types/
└── layer2.ts (already updated with Layer2Rules)
```

## Approval & Next Steps

**Design Status:** ✅ Approved
**Next Phase:** Create implementation plan with writing-plans skill
**Implementation Method:** Subagent-driven development

**Action Items:**
1. Create detailed implementation plan with bite-sized tasks
2. Implement Layer2PublicationTab with TDD approach
3. Test thoroughly in browser
4. Deploy and monitor
