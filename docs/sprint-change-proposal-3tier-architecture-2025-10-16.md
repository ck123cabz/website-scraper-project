# Sprint Change Proposal: 3-Tier Progressive Filtering Architecture

**Date:** 2025-10-16
**Author:** CK
**Status:** ✅ APPROVED
**Scope:** Major Architectural Refactoring
**Timeline Impact:** +3 weeks (14 weeks → 17 weeks)

---

## Executive Summary

**Issue:** V1 classification logic (Epic 2, Stories 2.3-2.5) fundamentally misaligned with guest posting lead qualification use case. Current pipeline processes in wrong order (scraping → filtering → LLM) causing cost inefficiency and poor manual review quality.

**Root Cause:** "Didn't understand what universal logic should be. SEO is a black box—patterns exist but aren't clearly defined." (Five Whys analysis, brainstorming session 2025-10-16)

**Approved Solution:** Refactor Epic 2 to implement 3-tier progressive filtering architecture:
- **Layer 1:** Domain/URL analysis (no HTTP) → Eliminates 40-60%
- **Layer 2:** Homepage scraping + company validation → Eliminates 20-30% of survivors
- **Layer 3:** LLM classification with confidence-based routing → Manual review queue for medium-confidence

**Business Value:**
- 5x efficiency improvement (2% → 30-40% manual review success rate)
- 60-70% LLM cost savings (vs 40% target)
- 40-60% scraping cost savings (new benefit)
- System that actually works for the use case from day 1

**Timeline:** 17 weeks total (+3 weeks from original 14 weeks)
- Week 13: Documentation + Database migration
- Weeks 14-16: Epic 2 refactoring sprint (3 weeks)
- Week 17: Comprehensive E2E testing + Production deployment

---

## Change Scope

### Stories Affected

**Epic 2 Refactoring:**
- **Story 2.3:** REFACTOR → Layer 1 Domain Analysis (2-3 days)
- **Story 2.6:** NEW → Layer 2 Operational Filter (3-4 days)
- **Story 2.4:** REFACTOR → Layer 3 LLM + Confidence Scoring (2-3 days)
- **Story 2.5:** REFACTOR → 3-Tier Pipeline Orchestration (2 days)

**Epic 3 Adjustments:**
- **Story 3.0:** REFACTOR → UI restructuring for layer-specific configuration (2-3 days)
- **Story 3.1:** REWRITE → E2E test scenarios for 3-tier architecture (2 days)
- **Stories 3.2-3.3:** MINOR UPDATES → Validation criteria adjustments (0.5 days)

**Total Refactoring Effort:** 16-20 days (2.5-3 weeks)

### Database Changes

**Schema Migration Required:**

New fields in `results` table:
- `elimination_layer` (enum: none/layer1/layer2/layer3)
- `manual_review_required` (boolean)
- `confidence_band` (enum: high/medium/low/auto_reject)
- `layer1_reasoning` (TEXT)
- `layer2_signals` (JSONB)

New fields in `jobs` table:
- `layer1_eliminated_count` (INTEGER)
- `layer2_eliminated_count` (INTEGER)
- `scraping_cost` (DECIMAL)
- `estimated_savings` (DECIMAL)
- `current_layer` (INTEGER: 1/2/3)

Restructured `classification_settings` schema:
- `layer1_rules` (JSONB) - Domain patterns, TLD lists, industry keywords
- `layer2_rules` (JSONB) - Blog freshness, tech stack signals, required pages
- `layer3_rules` (JSONB) - LLM indicators, confidence thresholds

### API Changes

**3 New Endpoints:**
- `GET /jobs/:id/manual-review` - Fetch manual review queue
- `PATCH /results/:id/manual-decision` - Submit manual classification
- `GET /jobs/:id/layer-stats` - Per-layer elimination metrics

### Documentation Changes

**PRD Updates:**
- ✅ FR008: Expanded to describe 3-tier progressive filtering
- ✅ NFR002: Updated performance targets for layer-specific throughput
- ✅ NFR003: Increased cost savings targets (60-70% LLM + 40-60% scraping)

**Architecture Documentation:**
- Processing pipeline flow section rewritten
- Component architecture updated (5 new/refactored services)
- Database schema updated
- API specifications extended

---

## Implementation Plan

### Phase 1: Documentation & Schema (Week 13)

**Duration:** 1 week

**Tasks:**
1. ✅ Update PRD (FR008, NFR002, NFR003) - COMPLETE
2. Update Architecture documentation (4 hours)
   - Rewrite processing pipeline flow
   - Update component architecture
   - Document new services
3. Database migration (1.5 days)
   - Create migration with 9 new fields
   - Restructure classification_settings schema
   - Test in local environment
   - Apply to development database

**Deliverables:**
- [ ] Updated architecture documentation
- [ ] Executed database migration
- [ ] Development environment ready for refactoring

### Phase 2: Refactoring Sprint (Weeks 14-16)

**Week 14: Layer 1 + Story 3.0 UI**

**Story 2.3 Refactor - Layer 1** (2-3 days)
- Move filtering logic BEFORE scraping
- Implement domain classification
- Add TLD filtering
- Add URL pattern exclusions
- Target: 40-60% elimination

**Story 3.0 Refactor - UI** (2-3 days)
- Restructure settings schema (layer1/layer2/layer3 sections)
- Split UI into layer-specific configuration sections
- Add Layer 1 UI: TLD lists, industry keywords
- Add Layer 2 UI: Blog freshness, tech stack signals
- Add confidence band configuration

**Week 15: Layer 2 + Layer 3**

**NEW Story 2.6 - Layer 2** (3-4 days)
- Create layer2-operational-filter.service.ts
- Implement homepage-only scraping
- Detect company infrastructure signals
- Validate active blog (recent posts)
- Target: 70% pass rate

**Story 2.4 Refactor - Layer 3** (2-3 days)
- Add confidence scoring (0-1 scale)
- Implement confidence bands (high/medium/low/reject)
- Create manual-review-router.service.ts
- Enhanced prompt for content sophistication

**Week 16: Pipeline + API**

**Story 2.5 Refactor - Pipeline** (2 days)
- Implement progressive elimination flow
- Track elimination at each layer
- Skip subsequent layers when eliminated
- Update job metrics and real-time fields
- Enhanced cost tracking

**API Endpoints** (0.5 days)
- Implement 3 new endpoints
- OpenAPI documentation
- Integration tests

### Phase 3: Testing & Deployment (Week 17)

**Story 3.1 E2E Testing** (2 days)

**Test Scenarios:**
1. Layer 1 elimination rate validation (40-60%)
2. Layer 2 operational validation (70% pass rate)
3. Layer 3 confidence distribution testing
4. End-to-end pipeline flow
5. Cost optimization validation (60-70% LLM, 40-60% scraping)
6. Manual review queue functionality
7. Settings configuration testing

**Chrome DevTools MCP Testing** (1 day)
- UI validation for layer-specific settings
- Dashboard real-time updates verification
- Per-layer log viewing

**Supabase MCP Validation** (0.5 days)
- Query schema changes
- Verify layer-specific fields
- Validate Realtime events

**Stories 3.2-3.3 Deployment** (0.5 days)
- Railway production deployment
- Production smoke test (5 URLs through 3-tier pipeline)
- Monitoring and health checks

---

## Success Criteria

### Technical Success
- [ ] All refactored stories pass unit tests
- [ ] NEW Story 2.6 complete with tests
- [ ] Story 3.0 UI displays layer-specific sections
- [ ] Database migration applied (9 fields + settings restructure)
- [ ] 3 new API endpoints functional
- [ ] Story 3.1 E2E tests pass (all 7 scenarios)

### Performance Success
- [ ] Layer 1: 40-60% elimination rate
- [ ] Layer 2: 70% pass rate of Layer 1 survivors
- [ ] Layer 3: 60% high confidence, 20% medium, 15% low, 5% reject
- [ ] Overall throughput: 20+ URLs/min

### Cost Optimization Success
- [ ] LLM cost savings: 60-70% reduction
- [ ] Scraping cost savings: 40-60% reduction
- [ ] Cost tracking shows per-layer costs and savings

### Business Value Success
- [ ] Manual review queue operational
- [ ] Manual review success rate projection: 30-40%
- [ ] System processes 5K URLs → ~300 qualified leads

### Production Readiness
- [ ] Railway deployment successful
- [ ] Production smoke test passes
- [ ] Monitoring operational
- [ ] Team trained on new UI and workflows

---

## Handoff Plan

### Primary: Development Team
**Responsibility:** Execute 3-week refactoring sprint

**Deliverables:**
- Week 14 end: Layer 1 + Story 3.0 UI refactored
- Week 15 end: Layer 2 + Layer 3 implemented
- Week 16 end: Pipeline orchestration + API endpoints
- Week 17 end: E2E testing passed, production deployed

### Secondary: Product Owner / Scrum Master
**Responsibility:** Backlog management, stakeholder communication

**Actions:**
- Communicate +3 week timeline extension to stakeholders
- Update Epic 2 backlog with refactored scopes
- Add NEW Story 2.6
- Schedule 3-week refactoring sprint
- Weekly progress monitoring

### Tertiary: Product Manager / Technical Lead
**Responsibility:** Strategic oversight, architectural guidance

**Actions:**
- Review architecture documentation updates
- Approve database schema migration
- Sign off on API endpoint additions
- Confirm strategic alignment

---

## Weekly Checkpoints

**Week 13:** Documentation + DB migration complete
**Week 14:** Layer 1 + UI refactored, unit tests passing
**Week 15:** Layer 2 + Layer 3 implemented, manual review queue functional
**Week 16:** Pipeline orchestration complete, integration tests passing
**Week 17:** E2E testing complete, production deployment successful

---

## Escalation Paths

**If timeline slips beyond Week 17:**
- Evaluate scope reduction: Defer Story 2.6 → 2-layer architecture
- Simplify Story 3.0 UI → Basic layer grouping only

**If cost optimization targets not met:**
- Tune Layer 1 rules for more aggressive filtering
- Adjust Layer 2 thresholds for stricter validation
- Accept 50-60% LLM savings (vs 60-70% target)

**If manual review queue volume too high (>40%):**
- Raise medium confidence threshold (0.6 → 0.7)
- Lower auto-reject threshold (0.3 → 0.2)
- Add Layer 2 stricter filtering

---

## Approval Record

**Approved By:** CK
**Date:** 2025-10-16
**Approval Type:** Explicit approval for implementation

**Confirmed:**
- ✅ Issue understanding
- ✅ Approach acceptance (Direct Adjustment)
- ✅ Timeline extension (+3 weeks)
- ✅ Scope changes (4 refactors, 1 new story)
- ✅ Resource commitment (3-week sprint)
- ✅ PRD updates (FR008, NFR002, NFR003)
- ✅ Database changes (9 fields + schema restructure)

---

## References

**Discovery Documents:**
- Brainstorming Session Results: `/docs/brainstorming-session-results-2025-10-16.md`
- Five Whys Analysis: Embedded in brainstorming session

**Current Implementation:**
- Story 2.3 (Prefilter): `/apps/api/src/jobs/services/prefilter.service.ts`
- Story 2.4 (LLM): `/apps/api/src/jobs/services/llm.service.ts`
- Story 2.5 (Worker): `/apps/api/src/processing/processing.worker.ts`
- Story 3.0 (Settings): `/apps/web/app/settings/page.tsx`

**Updated Documentation:**
- PRD: `/docs/PRD.md` (FR008, NFR002, NFR003 updated)
- Architecture: `/docs/solution-architecture.md` (pending updates)
- Epic Stories: `/docs/epic-stories.md` (pending updates)

---

**END OF SPRINT CHANGE PROPOSAL**
