# Story 3.0 - Session 3 Plan

**Current Progress:** 45% Complete (Database ✅, Types ✅, Tests ✅, Frontend ❌)

## Quick Start Checklist

### ✅ What's Working
- All TypeScript compiles (0 errors)
- All tests passing (210 passed, 0 failures)
- Database migration applied to production
- Settings service fully refactored with layer-structured defaults
- Backend API endpoints support both V1 and 3-tier payloads

### 🔴 Critical Path for Completion

**PRIORITY 1: Frontend Tabbed UI (6-8 hours)**
This is the main blocker. Everything else is bonus.

#### Step 1: Create Tab Structure (30 min)
File: `/apps/web/app/settings/page.tsx`
- Import shadcn/ui `Tabs` component
- Create 5 tab panels: Layer1Domain, Layer2Operational, Layer3LLM, ConfidenceBands, ManualReview
- Add global Save/Reset buttons outside tabs

#### Step 2: Build Tab Components (4-5 hours)
Create these files in `/apps/web/components/settings/`:

1. **Layer1DomainTab.tsx** (1 hour)
   - TLD filtering checkboxes (commercial, non-commercial, personal)
   - Industry keywords textarea (one per line)
   - URL pattern exclusions table (pattern, enabled)
   - Target elimination rate slider (40-60%)

2. **Layer2OperationalTab.tsx** (1 hour)
   - Blog freshness slider (30-180 days)
   - Required pages checkboxes (about, team, contact) + min count
   - Tech stack tools (analytics, marketing)
   - Design quality score slider (1-10)

3. **Layer3LlmTab.tsx** (1 hour)
   - Content marketing indicators textarea
   - SEO signals checkboxes
   - Temperature slider (0-1, step 0.1)
   - Content truncation input (1000-50000)

4. **ConfidenceBandsTab.tsx** (1 hour)
   - 4 band sections (high, medium, low, auto_reject)
   - Each: min slider, max slider, action dropdown
   - Validation: no overlaps, covers 0-1 range

5. **ManualReviewTab.tsx** (1 hour)
   - Queue size limit radio (unlimited / max: [input])
   - Auto-review timeout radio (disabled / after: [input] days)
   - Notification preferences checkboxes

#### Step 3: Wire Up State Management (1-2 hours)
File: `/apps/web/hooks/useSettings.ts`
- Update to handle layer-structured GET response
- Build layer-structured PUT payload from all tab states
- Implement POST `/api/settings/reset` handler
- Add validation before save

#### Step 4: Test in Browser (30 min)
**CRITICAL - MUST DO BEFORE MARKING COMPLETE:**
1. Start dev server: `npm run dev`
2. Navigate to `/settings`
3. Verify all 5 tabs render
4. Fill out each tab with test data
5. Click Save - verify PUT request succeeds
6. Reload page - verify settings persisted
7. Click Reset - verify confirmation dialog + defaults restored

---

## PRIORITY 2: Service Migration (Optional - 3-4 hours)

**Note:** Services currently work with V1 fields via backward compatibility.
This is nice-to-have but not blocking for story completion.

### If Time Permits:

1. **Layer1DomainAnalysisService** (1 hour)
   - Change from `settings.prefilter_rules`
   - To `settings.layer1_rules.url_pattern_exclusions`
   - Update tests

2. **Layer2OperationalFilterService** (1 hour)
   - Load from `settings.layer2_rules`
   - Update tests

3. **Layer3LlmService** (1 hour)
   - Load from `settings.layer3_rules`
   - Update tests

4. **Create ManualReviewRouterService** (1 hour)
   - Load from `settings.confidence_bands`
   - Route based on confidence score
   - Write tests

---

## Key Files Reference

### Backend (Already Complete)
- Settings Service: `/apps/api/src/settings/settings.service.ts`
- Settings Controller: `/apps/api/src/settings/settings.controller.ts`
- Settings DTO: `/apps/api/src/settings/dto/update-settings.dto.ts`
- Migration: `/supabase/migrations/20251016050000_refactor_settings_for_3tier.sql`

### Frontend (To Be Created)
- Main Page: `/apps/web/app/settings/page.tsx` (REFACTOR)
- Hook: `/apps/web/hooks/useSettings.ts` (UPDATE)
- Tab Components: `/apps/web/components/settings/*.tsx` (CREATE 5 FILES)

### Shared Types
- `/packages/shared/src/types/settings.ts` - Layer1Rules, Layer2Rules, Layer3Rules, ConfidenceBands, ManualReviewSettings

---

## API Endpoints (Ready to Use)

### GET /api/settings
Returns layer-structured settings:
```json
{
  "id": "...",
  "layer1_rules": { "tld_filters": {...}, "url_pattern_exclusions": [...] },
  "layer2_rules": { "blog_freshness_days": 90, ... },
  "layer3_rules": { "llm_temperature": 0.3, ... },
  "confidence_bands": { "high": {...}, "medium": {...}, ... },
  "manual_review_settings": { "queue_size_limit": null, ... }
}
```

### PUT /api/settings
Accepts partial layer-structured payload:
```json
{
  "layer1_rules": { ... },
  "layer2_rules": { ... }
}
```

### POST /api/settings/reset
Resets all layers to defaults.

---

## Testing Commands

```bash
# Build (should have 0 errors)
npm run build

# Run tests (should have 210 passed, 0 failures)
npm test

# Start dev server
npm run dev

# Navigate to settings
open http://localhost:3000/settings
```

---

## Success Criteria for Session 3

### Minimum Viable (Complete Story):
- [ ] All 5 tabs render in browser
- [ ] Can save settings (PUT request succeeds)
- [ ] Settings persist after page reload
- [ ] Reset button works with confirmation
- [ ] No console errors

### Stretch Goals (If Time):
- [ ] Services migrated to layer-specific fields
- [ ] ManualReviewRouterService created
- [ ] E2E test for settings flow
- [ ] Story marked as "Ready for Review"

---

## Estimated Time: 6-10 hours
- Frontend UI (MUST DO): 6-8 hours
- Service migration (OPTIONAL): 3-4 hours
- E2E testing (OPTIONAL): 1-2 hours

**Recommended Approach:** Focus 100% on frontend UI first. Service migration can be deferred to a separate refactoring story if needed.
