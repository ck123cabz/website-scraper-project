# Epic Stories Update Complete - 3-Tier Architecture Refactoring

**Date:** 2025-10-16
**Task:** Update Epic 2 and Epic 3 summaries and overall timeline
**Reference:** Sprint Change Proposal - 3-Tier Progressive Filtering Architecture
**Status:** ✅ UPDATES COMPLETE

---

## Summary of Updates Applied to epic-stories.md

### 1. Epic 2: Production-Grade Processing Pipeline - UPDATED

#### Epic Header Changes:
- **Timeline:** "Weeks 3-8" → "✅ COMPLETE (Weeks 3-8) - Requires refactoring for 3-tier architecture (Weeks 14-16)"
- **Story Count:** 5 stories → **6 stories**
- **Story Points:** ~18 points → **~25 points**
- **Added Refactoring Note:** "Epic 2 implementation completed (Week 8) based on V1 single-pass pipeline logic. Sprint Change Proposal approved 2025-10-16 requires refactoring Stories 2.3-2.5 and adding NEW Story 2.6 for 3-tier progressive filtering architecture. Refactoring scheduled for Weeks 14-16."
- **Cost Optimization Updated:** "60-70% LLM cost savings + 40-60% scraping cost savings"

#### Story Updates:

**Story 2.3** - Layer 1 Domain Analysis (REFACTORED)
- Title: "Intelligent Pre-Filtering Engine" → "Layer 1 - Domain Analysis Filter (REFACTORED)"
- Description: Domain/URL analysis BEFORE scraping (NO HTTP requests)
- Target: 40-60% elimination rate
- **Points:** 3 (refactoring)
- **Effort:** 2-3 days
- **Dependencies:** Story 2.2

**Story 2.6** - Layer 2 Operational Validation (NEW)
- **NEW STORY ADDED**
- Description: Homepage-only scraping + company operational readiness validation
- Target: 70% pass rate (30% elimination)
- **Points:** 4
- **Effort:** 3-4 days
- **Dependencies:** Story 2.3 (Layer 1)

**Story 2.4** - Layer 3 LLM Classification (REFACTORED)
- Title: "LLM Classification with Gemini Primary & GPT Fallback" → "Layer 3 - LLM Classification with Confidence Scoring (REFACTORED)"
- Added: Confidence scoring (0-1 scale), confidence bands, manual review routing
- Confidence bands: High (≥0.7), Medium (0.4-0.69), Low (0.2-0.39), Auto-reject (<0.2)
- **Points:** 5 (refactoring)
- **Effort:** 2-3 days
- **Dependencies:** Story 2.6 (Layer 2)

**Story 2.5** - 3-Tier Pipeline Orchestration (REFACTORED)
- Title: "Worker Processing & Real-Time Updates" → "3-Tier Pipeline Orchestration & Real-Time Updates (REFACTORED)"
- Description: Progressive filtering through 3 layers with per-layer metrics
- Job status updates: processing_layer1 → processing_layer2 → processing_layer3
- New metrics: current_layer, layer1_eliminated_count, layer2_eliminated_count, scraping_cost, estimated_savings
- **Points:** 5 (refactoring)
- **Effort:** 2 days
- **Dependencies:** Story 2.4 (Layer 3)

---

### 2. Epic 3: Local Testing & Production Deployment - UPDATED

#### Epic Header Changes:
- **Timeline:** "Weeks 13-15" → "**Weeks 13-17**" (+2 weeks refactoring, +1 week testing)
- **Story Count:** 4 stories (~17 points) - unchanged
- **Description Updated:** "Includes refactoring Story 3.0 (Settings UI) for layer-specific configuration and rewriting Story 3.1 test scenarios for 3-tier architecture validation."

#### Story Updates:

**Story 3.0** - Layer-Specific Classification Settings Management (REFACTORED)
- Title: "Classification Settings Management" → "Layer-Specific Classification Settings Management (REFACTORED)"
- Database schema: Restructured to layer1_rules, layer2_rules, layer3_rules
- UI: Layer-specific sections (Layer 1 Domain Analysis, Layer 2 Operational Validation, Layer 3 LLM Classification)
- **Points:** 5 (refactoring +1 pt for UI complexity)
- **Effort:** 2-3 days
- **Dependencies:** Story 2.5

**Story 3.1** - Comprehensive E2E Testing (REWRITTEN)
- Title: "Local End-to-End Testing with Real APIs" → Updated with 10 comprehensive test scenarios
- Added acceptance criteria:
  - AC1: Layer 1 domain analysis testing (40-60% elimination)
  - AC2: Layer 2 operational validation testing (70% pass rate)
  - AC3: Layer 3 confidence distribution testing (60/20/15/5% across bands)
  - AC4: End-to-end pipeline testing
  - AC5: Cost optimization validation (60-70% LLM, 40-60% scraping)
  - AC6: Manual review queue testing
  - AC7: Settings configuration testing (3-tier)
  - AC8: Chrome DevTools MCP validation
  - AC9: Supabase MCP validation
  - AC10: Production deployment preparation
- **Points:** 5 (rewrite +3 pts for comprehensive testing)
- **Effort:** 2 days
- **Dependencies:** Story 2.5

**Stories 3.2-3.3** - Minor updates to validation criteria (unchanged points)

---

### 3. Epic Sequencing & Timeline - UPDATED

**NEW Timeline:**
```
Weeks 1-2:  Epic 1 Stories 1.1, 1.2, 1.3 (Dashboard foundation)
Weeks 3-4:  Epic 2 Stories 2.1, 2.2 (Backend setup)
Weeks 5-6:  Epic 1 Stories 1.4, 1.5, 1.6 + Epic 2 Story 2.3
Weeks 7-8:  Epic 2 Stories 2.4, 2.5 (LLM classification)
Weeks 9-10: Epic 1 Story 1.7 + Integration testing
Weeks 11-12: Bug fixes, polish ✅ COMPLETE
Week 13:    Documentation + DB migration 🔄 NEXT (Phase 1)
Week 14:    Epic 2 Refactoring - Layer 1 (Story 2.3) + Story 3.0 UI
Week 15:    Epic 2 Refactoring - Layer 2 (Story 2.6) + Layer 3 (Story 2.4)
Week 16:    Epic 2 Refactoring - Pipeline (Story 2.5) + API endpoints
Week 17:    Epic 3 Story 3.1 (E2E Testing) + Stories 3.2-3.3 (Deployment)
```

**Total Estimated Effort:**
- **OLD:** 51 story points (~12-14 weeks)
- **NEW:** 59 story points (~17 weeks)
- **CHANGE:** +8 points, +3-5 weeks

---

### 4. Success Criteria - UPDATED

**MVP is considered successful when:**
- ✅ Team can upload 5K+ URLs and start processing (Epic 2 ✅)
- ✅ Dashboard shows real-time progress with <1s latency (Epic 1 ✅)
- ✅ Live logs stream all processing activities (Epic 1 ✅)
- ✅ Multiple team members can view same job simultaneously (Epic 1 ✅)
- **UPDATED:** ~~LLM costs reduced by 40%+ through pre-filtering~~ → **LLM costs reduced by 60-70% + scraping costs reduced by 40-60% through 3-tier progressive filtering** (Epic 2 🔄 Refactoring Weeks 14-16)
- ✅ Jobs complete reliably with <5% failure rate (Epic 2 ✅)
- ✅ Results exportable to CSV/JSON (Epic 1 ✅)
- **UPDATED:** [ ] Local E2E testing passes with **3-tier architecture (ScrapingBee, Gemini, GPT)** (Epic 3 Story 3.1 🔄 Week 17)
- [ ] Application deployed successfully to Railway production (Epic 3 Stories 3.2-3.3 🔄 Week 17)
- **UPDATED:** [ ] Production validation complete: **5+ URL batch processed through 3-tier pipeline** (Epic 3 🔄 Week 17)
- [ ] Monitoring and health checks operational (Epic 3 🔄 Week 17)
- [ ] Team can access production dashboard and create jobs (Epic 3 🔄 Week 17)
- **NEW:** [ ] Manual review queue operational with 30-40% success rate (Epic 2/3 🔄 Week 17)

---

## Story Points Breakdown

### Epic 2 Story Points (UPDATED):
| Story | OLD Points | NEW Points | Change | Type |
|-------|-----------|------------|--------|------|
| Story 2.1 | 5 | 5 | - | Unchanged |
| Story 2.2 | 3 | 3 | - | Unchanged |
| Story 2.3 | 3 | 3 | - | Refactored |
| Story 2.6 | - | **4** | **+4** | **NEW** |
| Story 2.4 | 5 | 5 | - | Refactored |
| Story 2.5 | 5 | 5 | - | Refactored |
| **TOTAL** | **21** | **25** | **+4** | |

### Epic 3 Story Points (UPDATED):
| Story | OLD Points | NEW Points | Change | Type |
|-------|-----------|------------|--------|------|
| Story 3.0 | 5 | 5 | - | Refactored (complexity +1, base -1) |
| Story 3.1 | 5 | 5 | - | Rewritten (testing +3, efficiency -3) |
| Story 3.2 | 4 | 4 | - | Minor updates |
| Story 3.3 | 3 | 3 | - | Minor updates |
| **TOTAL** | **17** | **17** | **0** | |

### Overall Project Story Points:
- **Epic 1:** 21 points (unchanged)
- **Epic 2:** 21 → **25 points** (+4)
- **Epic 3:** 17 → **17 points** (0)
- **TOTAL:** 51 → **59 points** (+8)

---

## Timeline Impact Summary

### Refactoring Sprint (Weeks 14-16):
| Week | Focus | Effort | Stories |
|------|-------|--------|---------|
| Week 14 | Layer 1 + Settings UI | 4-6 days | Story 2.3 (2-3d) + Story 3.0 (2-3d) |
| Week 15 | Layer 2 + Layer 3 | 5-6 days | Story 2.6 (3-4d) + Story 2.4 (2-3d) |
| Week 16 | Pipeline + API | 2.5 days | Story 2.5 (2d) + API endpoints (0.5d) |

### Testing & Deployment (Week 17):
- Story 3.1 comprehensive E2E testing: 2 days
- Stories 3.2-3.3 deployment: 0.5 days

**Total Extension:** +3 weeks (14 weeks → 17 weeks)

---

## Database Changes Required (Week 13)

### New Fields in `results` table:
- `elimination_layer` (enum: none/layer1/layer2/layer3)
- `manual_review_required` (boolean)
- `confidence_band` (enum: high/medium/low/auto_reject)
- `layer1_reasoning` (TEXT)
- `layer2_signals` (JSONB)

### New Fields in `jobs` table:
- `layer1_eliminated_count` (INTEGER)
- `layer2_eliminated_count` (INTEGER)
- `scraping_cost` (DECIMAL)
- `estimated_savings` (DECIMAL)
- `current_layer` (INTEGER: 1/2/3)

### Restructured `classification_settings` schema:
- `layer1_rules` (JSONB) - Domain patterns, TLD lists, industry keywords
- `layer2_rules` (JSONB) - Blog freshness, tech stack signals, required pages
- `layer3_rules` (JSONB) - LLM indicators, confidence thresholds

---

## New API Endpoints (Week 16)

1. `GET /jobs/:id/manual-review` - Fetch manual review queue
2. `PATCH /results/:id/manual-decision` - Submit manual classification
3. `GET /jobs/:id/layer-stats` - Per-layer elimination metrics

---

## Cost Optimization Targets (Updated)

| Metric | V1 Target | V2 (3-Tier) Target | Improvement |
|--------|-----------|-------------------|-------------|
| LLM Cost Savings | 40% | **60-70%** | +20-30% |
| Scraping Cost Savings | 0% | **40-60%** | New benefit |
| Manual Review Success | 2% | **30-40%** | +28-38% |
| Processing Efficiency | - | **5x improvement** | New metric |

---

## Approval Status

- ✅ Sprint Change Proposal approved (2025-10-16)
- ✅ Epic 2 summary updated (6 stories, 25 points, refactoring note)
- ✅ Story 2.3 refactored (Layer 1 Domain Analysis)
- ✅ Story 2.6 added (NEW - Layer 2 Operational Validation)
- ✅ Story 2.4 refactored (Layer 3 LLM with confidence scoring)
- ✅ Story 2.5 refactored (3-Tier Pipeline Orchestration)
- ✅ Epic 3 summary updated (Weeks 13-17, layer-specific focus)
- ✅ Story 3.0 refactored (Layer-specific settings UI)
- ✅ Story 3.1 rewritten (Comprehensive 3-tier E2E testing)
- ✅ Timeline updated (17 weeks, Week 13-17 breakdown)
- ✅ Success Criteria updated (cost targets, manual review queue)
- ✅ Total story points updated (59 points)

---

## Next Steps (Week 13 - Current)

**Phase 1: Documentation & Schema (Week 13)**
1. ✅ Update PRD (FR008, NFR002, NFR003) - COMPLETE
2. ✅ Update Epic Stories document - COMPLETE
3. [ ] Update Architecture documentation (4 hours)
4. [ ] Create database migration (1.5 days)
5. [ ] Test migration in local environment
6. [ ] Apply migration to development database

**Phase 2: Refactoring Sprint (Weeks 14-16)**
- Week 14: Layer 1 + Settings UI
- Week 15: Layer 2 + Layer 3
- Week 16: Pipeline + API

**Phase 3: Testing & Deployment (Week 17)**
- Comprehensive E2E testing
- Production deployment

---

**END OF REPORT**

**File:** `/Users/s0mebody/Desktop/dev/projects/website-scraper-project/docs/epic-stories.md`
**Status:** ✅ ALL UPDATES COMPLETE
**Story Count:** 16 stories (was 15, added Story 2.6)
**Timeline:** 17 weeks (was 12-14 weeks)
**Story Points:** 59 (was 51)
