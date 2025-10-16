# Story 3.1: Backend Service Migration & Feature Implementation (Phase 2)

**Status:** Planned
**Priority:** P0 (Critical - completes Story 3.0 implementation)
**Estimated Effort:** 12-15 hours
**Dependencies:** Story 3.0 Phase 1 complete

## Overview

Story 3.1 completes the backend implementation for the 3-tier settings management system delivered in Story 3.0. While Story 3.0 delivered a production-ready database schema and frontend UI, the backend services still use V1 field access patterns. Story 3.1 migrates all layer services to use the new layer-specific settings fields and implements missing features identified in the Senior Developer Review.

## Goals

1. **Complete AC2:** Migrate all backend services to load from layer-specific settings fields
2. **Implement missing Layer 1 features:** TLD filtering, industry keywords, elimination rate enforcement
3. **Implement missing Layer 3 features:** SEO signals detection (schema markup, Open Graph, structured data)
4. **Implement confidence band routing:** Create ManualReviewRouterService for automated routing
5. **Add E2E integration tests:** Verify settings changes affect job processing
6. **Close UX gap:** Make all UI controls functional

## Context from Story 3.0

**What Story 3.0 Delivered:**
- ✅ Database schema with 5 JSONB columns (layer1_rules, layer2_rules, layer3_rules, confidence_bands, manual_review_settings)
- ✅ Frontend tabbed UI (5 tabs) with full validation
- ✅ API endpoints (GET/PUT/POST) accepting layer-structured payloads
- ✅ Global UX warning banner explaining implementation status
- ✅ Feature status documentation

**What's Missing (AC2 incomplete):**
- ❌ Backend services still load from V1 fields (prefilter_rules, etc.)
- ❌ Most UI controls don't affect job processing
- ❌ TLD filtering, industry keywords, elimination rate not implemented
- ❌ SEO signals detection not implemented
- ❌ Confidence band routing not implemented
- ❌ No E2E tests verifying settings → job processing integration

**Current Implementation Status (from `/docs/feature-status-3.0.md`):**

| Feature | Status | Notes |
|---------|--------|-------|
| URL Pattern Exclusions | ✅ Working | PreFilterService loads from settings.prefilter_rules |
| Content Indicators | ✅ Working | Layer3LlmService uses indicators in prompts |
| LLM Temperature | ✅ Working | Layer3LlmService passes to API |
| Content Truncation | ✅ Working | Layer3LlmService truncates content |
| **TLD Filtering** | ❌ Not Implemented | **Story 3.1 Target** |
| **Industry Keywords** | ❌ Not Implemented | **Story 3.1 Target** |
| **Elimination Rate** | ❌ Not Implemented | **Story 3.1 Target** |
| **SEO Signals** | ❌ Not Implemented | **Story 3.1 Target** |
| **Confidence Routing** | ❌ Not Implemented | **Story 3.1 Target** |
| Layer 2 Operational Features | ❌ Not Implemented | Story 3.2 target |
| Manual Review Queue | ❌ Not Implemented | Story 3.2 / Epic 4 target |

## Tasks

### Task 1: Migrate Backend Services to Layer-Specific Fields (3-4 hours)

**Objective:** Update all layer services to load from new layer-specific settings fields instead of V1 fields

**Subtasks:**
1. **Update PreFilterService → Layer1DomainAnalysisService**
   - Load from `settings.layer1_rules.url_pattern_exclusions` (currently loads from `settings.prefilter_rules`)
   - Keep backward compatibility: If layer1_rules missing, fall back to prefilter_rules
   - Update service tests to verify layer1_rules loading
   - **File:** `apps/api/src/jobs/services/prefilter.service.ts`

2. **Update Layer2OperationalFilterService**
   - Load from `settings.layer2_rules` (currently uses hardcoded defaults)
   - Implement loadLayer2Rules() method to fetch from SettingsService
   - Fall back to hardcoded defaults if SettingsService unavailable
   - Update service tests
   - **File:** `apps/api/src/jobs/services/layer2-operational-filter.service.ts`

3. **Update Layer3LlmService (formerly LLMService)**
   - Load from `settings.layer3_rules` (currently loads from mixed V1 fields)
   - Consolidate all Layer 3 settings into single layer3_rules object
   - Update temperature, content_truncation_limit, content_marketing_indicators loading
   - Update service tests
   - **File:** `apps/api/src/jobs/services/llm.service.ts`

4. **Create ManualReviewRouterService**
   - New service to handle confidence-based routing
   - Load from `settings.confidence_bands`
   - Route high confidence (0.8-1.0) → auto-approve
   - Route medium/low confidence (0.3-0.79) → manual review queue
   - Route very low confidence (<0.3) → auto-reject
   - Add unit tests (100% coverage)
   - **File:** `apps/api/src/jobs/services/manual-review-router.service.ts` (new)

5. **Update SettingsService cache invalidation**
   - Ensure cache refresh triggers reload in all layer services
   - Add logging for cache invalidation events
   - **File:** `apps/api/src/settings/settings.service.ts`

**Acceptance Criteria:**
- [ ] All services load from layer-specific fields
- [ ] Backward compatibility maintained (V1 fallbacks work)
- [ ] Settings cache invalidation triggers refresh across all services
- [ ] All existing tests pass
- [ ] New tests verify layer-specific loading

**Estimated Effort:** 3-4 hours

---

### Task 2: Implement Layer 1 TLD Filtering & Industry Keywords (2-3 hours)

**Objective:** Complete Layer 1 Domain Analysis feature implementation

**Subtasks:**
1. **Add TLD Filtering**
   - Implement `filterByTld()` method in Layer1DomainAnalysisService
   - Check domain TLD against `layer1_rules.tld_filters.commercial`, `non_commercial`, `personal`
   - Filter out domains with TLDs not in allowed lists
   - Add unit tests for TLD filtering

2. **Add Industry Keywords Matching**
   - Implement `filterByIndustryKeywords()` method
   - Match domain name and homepage content against `layer1_rules.industry_keywords`
   - Use simple keyword matching (case-insensitive, substring match)
   - Add unit tests for keyword matching

3. **Add Target Elimination Rate Enforcement**
   - Implement `enforceEliminationRate()` method
   - Ensure Layer 1 eliminates target % of URLs based on `layer1_rules.target_elimination_rate`
   - Use scoring system: calculate score for each URL, sort by score, eliminate bottom X%
   - Add unit tests for elimination rate

4. **Integration**
   - Update Layer1DomainAnalysisService to apply all 3 filters in sequence
   - Add integration tests: TLD → Keywords → Patterns → Elimination Rate
   - Update logging to show Layer 1 statistics (TLD filtered: X, Keywords filtered: Y, etc.)

**Files Modified:**
- `apps/api/src/jobs/services/layer1-domain-analysis.service.ts` (or prefilter.service.ts)
- `apps/api/src/jobs/services/__tests__/layer1-domain-analysis.service.spec.ts`

**Acceptance Criteria:**
- [ ] TLD filtering works correctly (filters based on tld_filters config)
- [ ] Industry keywords matching works (filters domains without industry keywords)
- [ ] Elimination rate enforcement works (eliminates target % of URLs)
- [ ] All filters can be configured via settings UI
- [ ] Unit tests cover all new methods (90%+ coverage)

**Estimated Effort:** 2-3 hours

---

### Task 3: Implement Layer 3 SEO Signals Detection (2-3 hours)

**Objective:** Add SEO investment signals detection to Layer 3 LLM classification

**Subtasks:**
1. **Add Schema Markup Detection**
   - Implement `detectSchemaMarkup()` method (new service or in Layer3LlmService)
   - Parse HTML for JSON-LD `<script type="application/ld+json">` tags
   - Check for microdata attributes (itemscope, itemtype, itemprop)
   - Return boolean: has schema markup

2. **Add Open Graph Detection**
   - Implement `detectOpenGraph()` method
   - Check for `<meta property="og:*">` tags in HTML
   - Verify presence of og:title, og:description, og:image
   - Return boolean: has Open Graph tags

3. **Add Structured Data Detection**
   - Implement `detectStructuredData()` method
   - Check for RDFa, Microdata, or JSON-LD structured data
   - Return boolean: has structured data

4. **Integration with LLM Classification**
   - Update Layer3LlmService to call SEO detection methods
   - Include SEO signals in LLM classification prompt as additional context
   - Example: "This website has Schema markup, Open Graph tags, and structured data, indicating SEO investment."
   - Add unit tests for SEO detection

**Files Modified:**
- `apps/api/src/jobs/services/llm.service.ts`
- `apps/api/src/jobs/services/__tests__/llm.service.spec.ts`

**Files Created (optional):**
- `apps/api/src/jobs/services/seo-detection.service.ts` (if logic is complex enough to warrant separate service)

**Acceptance Criteria:**
- [ ] Schema markup detection works (detects JSON-LD and microdata)
- [ ] Open Graph detection works (detects og: meta tags)
- [ ] Structured data detection works
- [ ] SEO signals integrated into LLM classification prompt
- [ ] SEO signals can be configured via settings UI (enable/disable specific signals)
- [ ] Unit tests cover all detection methods (90%+ coverage)

**Estimated Effort:** 2-3 hours

---

### Task 4: Implement Confidence Band Routing (2-3 hours)

**Objective:** Create ManualReviewRouterService and integrate with job orchestration

**Subtasks:**
1. **Create ManualReviewRouterService** (see Task 1.4)
   - Load confidence_bands from SettingsService
   - Implement route() method: takes confidence score → returns action (auto_approve, manual_review, reject)
   - Add unit tests (100% coverage)

2. **Update Job Orchestration**
   - Integrate ManualReviewRouterService into UrlWorkerProcessor (3-tier orchestration)
   - After Layer 3 LLM classification, call router.route(confidenceScore)
   - Handle routing actions:
     - auto_approve: Mark result as approved, skip manual review
     - manual_review: Add to manual review queue (placeholder for Story 3.2)
     - reject: Mark result as rejected
   - Update orchestration logs to show routing decision

3. **Add Integration Tests**
   - Test high confidence URLs → auto-approve
   - Test medium/low confidence URLs → manual_review
   - Test very low confidence URLs → reject
   - Verify routing respects settings.confidence_bands configuration

**Files Modified:**
- `apps/api/src/workers/url-worker.processor.ts` (job orchestration)
- `apps/api/src/workers/__tests__/url-worker.processor.spec.ts`

**Files Created:**
- `apps/api/src/jobs/services/manual-review-router.service.ts`
- `apps/api/src/jobs/services/__tests__/manual-review-router.service.spec.ts`

**Acceptance Criteria:**
- [ ] ManualReviewRouterService created and tested
- [ ] Routing integrated into job orchestration (after Layer 3)
- [ ] High confidence URLs auto-approved
- [ ] Medium/low confidence URLs flagged for manual review
- [ ] Very low confidence URLs rejected
- [ ] Routing respects confidence_bands configuration from settings UI
- [ ] Integration tests verify end-to-end routing

**Estimated Effort:** 2-3 hours

---

### Task 5: E2E Integration Tests (3-4 hours)

**Objective:** Add automated E2E tests to verify settings changes affect job processing

**Subtasks:**
1. **Setup E2E Test Infrastructure**
   - Use Playwright or Chrome DevTools MCP for browser automation
   - Setup test database with known settings
   - Create test job fixtures with known URLs

2. **Test Scenarios**
   - **Scenario 1: Layer 1 TLD Filtering**
     - Update tld_filters via settings UI → Save
     - Create job with mix of .com, .org, .blog domains
     - Verify Layer 1 filters correct TLDs based on settings

   - **Scenario 2: Layer 1 Industry Keywords**
     - Update industry_keywords via settings UI → Save
     - Create job with domains having/not having keywords
     - Verify Layer 1 filters based on keywords

   - **Scenario 3: Layer 3 Temperature**
     - Update llm_temperature via settings UI → Save
     - Create job
     - Verify LLM API calls use new temperature value (check logs)

   - **Scenario 4: Confidence Band Routing**
     - Update confidence_bands thresholds via settings UI → Save
     - Create job with URLs that will have varying confidence scores
     - Verify routing respects new thresholds (high → approve, low → review)

   - **Scenario 5: Settings Persistence**
     - Update multiple settings → Save → Reload page
     - Verify all settings persisted correctly

   - **Scenario 6: Reset to Defaults**
     - Update settings → Save → Reset to defaults
     - Verify all layers revert to default values
     - Create job → Verify job processing uses default settings

3. **Test Automation**
   - Add E2E tests to CI/CD pipeline
   - Document E2E test setup in README
   - Create test fixtures and helpers for common scenarios

**Files Created:**
- `apps/web/tests/e2e/settings-layer-integration.spec.ts` (Playwright tests)
- OR use Chrome DevTools MCP for manual E2E validation (document steps)

**Acceptance Criteria:**
- [ ] E2E tests verify Layer 1 TLD filtering affects job processing
- [ ] E2E tests verify Layer 1 industry keywords affect job processing
- [ ] E2E tests verify Layer 3 temperature affects LLM API calls
- [ ] E2E tests verify confidence band routing affects results
- [ ] E2E tests verify settings persistence across page reloads
- [ ] E2E tests verify reset to defaults works correctly
- [ ] All E2E tests pass consistently (95%+ success rate)

**Estimated Effort:** 3-4 hours

---

## Deliverables

1. **Backend Services**
   - Layer1DomainAnalysisService: Loads from layer1_rules, implements TLD/keywords/elimination
   - Layer2OperationalFilterService: Loads from layer2_rules
   - Layer3LlmService: Loads from layer3_rules, includes SEO signals
   - ManualReviewRouterService: Loads from confidence_bands, routes based on score

2. **Feature Implementations**
   - TLD filtering (Layer 1)
   - Industry keywords matching (Layer 1)
   - Elimination rate enforcement (Layer 1)
   - SEO signals detection (Layer 3)
   - Confidence band routing

3. **Tests**
   - Unit tests for all new methods (90%+ coverage)
   - Integration tests for service loading and settings cache refresh
   - E2E tests for settings → job processing verification

4. **Documentation**
   - Update `/docs/feature-status-3.0.md` to mark implemented features as ✅ Working
   - Update Story 3.0 Dev Agent Record with Story 3.1 completion
   - Document E2E test setup and usage

5. **UX Improvements**
   - Remove or update warning banner to reflect new implementation status
   - Update banner to show: "Most features now functional. Layer 2 operational features coming in Story 3.2."

## Acceptance Criteria

**All Story 3.0 AC2 items complete:**
- [x] Refactor `PreFilterService` → `Layer1DomainAnalysisService` loading from `settings.layer1_rules`
- [x] Update `Layer2OperationalFilterService` to load from `settings.layer2_rules`
- [x] Update `Layer3LlmService` to load from `settings.layer3_rules`
- [x] Implement `ManualReviewRouterService` loading from `settings.confidence_bands`
- [x] All services fall back to hardcoded defaults if database unavailable
- [x] Settings cache invalidation triggers refresh across all layer services

**New features implemented:**
- [x] TLD filtering (Layer 1)
- [x] Industry keywords matching (Layer 1)
- [x] Elimination rate enforcement (Layer 1)
- [x] SEO signals detection (Layer 3)
- [x] Confidence band routing

**Testing complete:**
- [x] Unit tests pass (target: 95%+ coverage for new code)
- [x] Integration tests pass
- [x] E2E tests pass (settings → job processing verified)
- [x] All existing tests still pass (no regressions)

**Documentation updated:**
- [x] Feature status document updated
- [x] Story 3.0 marked as complete
- [x] UX warning banner updated

## Testing Strategy

**Unit Tests:**
- Test each new method in isolation (TLD filtering, keyword matching, SEO detection, routing)
- Mock SettingsService in all layer service tests
- Verify fallback behavior when settings unavailable

**Integration Tests:**
- Test settings loading across all services
- Test cache invalidation triggering service refresh
- Test job orchestration with routing

**E2E Tests:**
- Test user workflow: Update settings → Save → Create job → Verify results
- Test multiple settings changes in sequence
- Test reset to defaults

## Dependencies

- Story 3.0 Phase 1 complete ✅
- Supabase database with Story 3.0 migrations applied ✅
- Frontend tabbed UI deployed and functional ✅
- Chrome DevTools MCP or Playwright for E2E testing

## Estimated Timeline

- **Task 1 (Service Migration):** 3-4 hours
- **Task 2 (Layer 1 Features):** 2-3 hours
- **Task 3 (Layer 3 SEO):** 2-3 hours
- **Task 4 (Confidence Routing):** 2-3 hours
- **Task 5 (E2E Tests):** 3-4 hours

**Total:** 12-17 hours (estimated 3-4 working days)

## Success Metrics

- All Story 3.0 AC2 checkboxes marked complete
- All UI controls functional (except Layer 2 operational features)
- UX warning banner updated to reflect new implementation status
- 95%+ test coverage for new code
- E2E tests pass consistently
- Feature status documentation shows ✅ for all Phase 2 features

## Follow-Up Stories

**Story 3.2: Layer 2 Operational Features & Manual Review Queue (Phase 3)**
- Estimated: 14-18 hours
- Features:
  - Blog freshness threshold detection
  - Required company pages verification
  - Tech stack detection
  - Professional design score calculation
  - Manual review queue management (database + background jobs + notifications)

## References

- **Story 3.0:** `/docs/stories/story-3.0.md`
- **Feature Status:** `/docs/feature-status-3.0.md`
- **Senior Dev Review:** `/docs/stories/story-3.0.md#lines-1060-1482` (13 action items)
- **PRD:** `/docs/PRD.md#lines-100-126` (FR008: 3-tier progressive filtering)

---

**Created:** 2025-10-17
**Author:** Dev Agent (claude-sonnet-4-5-20250929)
**Status:** Ready for implementation
