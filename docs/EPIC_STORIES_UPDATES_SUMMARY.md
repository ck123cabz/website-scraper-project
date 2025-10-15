# Epic Stories Updates Summary - 3-Tier Architecture Refactoring

**Date:** 2025-10-16
**Reference:** Sprint Change Proposal - 3-Tier Progressive Filtering Architecture
**Status:** Updates Required

---

## Changes Applied

### Epic 2: Production-Grade Processing Pipeline

**UPDATED Epic Header:**
- **Timeline:** ✅ COMPLETE (Weeks 3-8) → Requires refactoring for 3-tier architecture (Weeks 14-16)
- **Story Count:** 5 stories → **6 stories** (added Story 2.6)
- **Story Points:** ~18 points → **~25 points**
- **Note Added:** "Epic 2 implementation completed (Week 8) based on V1 single-pass pipeline logic. Sprint Change Proposal approved 2025-10-16 requires refactoring Stories 2.3-2.5 and adding NEW Story 2.6 for 3-tier progressive filtering architecture. Refactoring scheduled for Weeks 14-16."

**Story 2.3:** REFACTORED → Layer 1 - Domain Analysis Filter
- Changed from "Intelligent Pre-Filtering Engine" to "Layer 1 - Domain Analysis Filter (REFACTORED)"
- Updated to execute BEFORE scraping (no HTTP requests)
- Target: 40-60% elimination rate
- Points: 3 (refactoring)

**Story 2.6:** NEW → Layer 2 - Operational Validation Filter
- Homepage-only scraping + company validation
- Target: 70% pass rate (30% elimination)
- Points: 4
- Dependencies: Story 2.3

**Story 2.4:** REFACTORED → Layer 3 - LLM Classification with Confidence Scoring
- Added confidence scoring (0-1 scale)
- Confidence bands: High (≥0.7), Medium (0.4-0.69), Low (0.2-0.39), Auto-reject (<0.2)
- Manual review routing for medium/low confidence
- Points: 5 (refactoring)
- Dependencies: Story 2.6

**Story 2.5:** REFACTORED → 3-Tier Pipeline Orchestration & Real-Time Updates
- Progressive filtering flow through 3 layers
- Per-layer metrics tracking
- Points: 5 (refactoring)
- Dependencies: Story 2.4

---

### Epic 3: Local Testing & Production Deployment

**UPDATED Epic Header:**
- **Timeline:** Weeks 13-15 → **Weeks 13-17** (+2 weeks for refactoring, +1 week for testing)
- **Story Count:** 4 stories (~17 points) - no change in count
- **Description Updated:** "Includes refactoring Story 3.0 (Settings UI) for layer-specific configuration and rewriting Story 3.1 test scenarios for 3-tier architecture validation."

**Story 3.0:** REFACTORED → Layer-Specific Classification Settings Management
- Restructured for layer1_rules, layer2_rules, layer3_rules
- Layer-specific UI sections
- Points: 5 (refactoring +1 pt for UI complexity)

**Story 3.1:** Test scenarios updated for 3-tier validation
- Layer 1: 40-60% elimination rate validation
- Layer 2: 70% pass rate validation
- Layer 3: Confidence distribution testing
- Manual review queue functionality
- Points: 5 (rewrite +3 pts for comprehensive testing)

---

### Timeline Updates

**UPDATED Epic Sequencing & Timeline:**

```
**Weeks 1-2:** Epic 1 Stories 1.1, 1.2, 1.3 (Dashboard foundation + progress tracking)
**Weeks 3-4:** Epic 2 Stories 2.1, 2.2 (Backend setup + URL upload)
**Weeks 5-6:** Epic 1 Stories 1.4, 1.5, 1.6 (Logs, costs, results table) + Epic 2 Story 2.3 (Pre-filtering)
**Weeks 7-8:** Epic 2 Stories 2.4, 2.5 (LLM classification + worker processing)
**Weeks 9-10:** Epic 1 Story 1.7 (Job controls) + Integration testing
**Weeks 11-12:** Bug fixes, polish, final Epic 2 integration testing ✅ COMPLETE
**Week 13:** Documentation updates, database migration design, PRD updates 🔄 NEXT (Phase 1)
**Week 14:** Epic 2 Refactoring Sprint - Layer 1 (Story 2.3) + Story 3.0 UI refactoring
**Week 15:** Epic 2 Refactoring Sprint - Layer 2 (NEW Story 2.6) + Layer 3 (Story 2.4)
**Week 16:** Epic 2 Refactoring Sprint - Pipeline Orchestration (Story 2.5) + API endpoints
**Week 17:** Epic 3 Story 3.1 (Comprehensive E2E Testing) + Stories 3.2-3.3 (Deployment)

**Total Estimated Effort:** 59 story points (~17 weeks for solo developer with AI assistance)
```

**OLD:** 51 story points (~12-14 weeks)
**NEW:** 59 story points (~17 weeks)
**CHANGE:** +8 points (+3-5 weeks)

---

### Success Criteria Updates

**UPDATED Success Criteria:**

**MVP is considered successful when:**
- ✅ Team can upload 5K+ URLs and start processing (Epic 2 ✅)
- ✅ Dashboard shows real-time progress with <1s latency (Epic 1 ✅)
- ✅ Live logs stream all processing activities (Epic 1 ✅)
- ✅ Multiple team members can view same job simultaneously (Epic 1 ✅)
- **UPDATED:** ~~LLM costs reduced by 40%+ through pre-filtering~~ → **LLM costs reduced by 60-70% + scraping costs reduced by 40-60% through 3-tier progressive filtering** (Epic 2 🔄 Refactoring Week 14-16)
- ✅ Jobs complete reliably with <5% failure rate (Epic 2 ✅)
- ✅ Results exportable to CSV/JSON (Epic 1 ✅)
- **UPDATED:** [ ] Local E2E testing passes with **3-tier architecture (ScrapingBee, Gemini, GPT)** (Epic 3 Story 3.1 🔄 Week 17)
- [ ] Application deployed successfully to Railway production (Epic 3 Stories 3.2-3.3 🔄 Week 17)
- **UPDATED:** [ ] Production validation complete: **5+ URL batch processed through 3-tier pipeline** (Epic 3 🔄 Week 17)
- [ ] Monitoring and health checks operational (Epic 3 🔄 Week 17)
- [ ] Team can access production dashboard and create jobs (Epic 3 🔄 Week 17)
- **NEW:** [ ] Manual review queue operational with 30-40% success rate (Epic 2/3 🔄 Week 17)

---

## Summary of Changes

| Section | Change Type | Details |
|---------|-------------|---------|
| Epic 2 Header | Updated | 5 → 6 stories, 18 → 25 points, added refactoring note |
| Story 2.3 | Refactored | Layer 1 Domain Analysis (pre-scrape, no HTTP) |
| Story 2.6 | NEW | Layer 2 Operational Validation Filter (4 pts) |
| Story 2.4 | Refactored | Layer 3 LLM with confidence scoring + manual review routing |
| Story 2.5 | Refactored | 3-tier progressive filtering orchestration |
| Epic 3 Header | Updated | Timeline 13-15 → 13-17 weeks, description updated |
| Story 3.0 | Refactored | Layer-specific settings management UI |
| Story 3.1 | Updated | Comprehensive 3-tier E2E testing scenarios |
| Timeline | Extended | 12-14 weeks → 17 weeks (+3 weeks) |
| Story Points | Increased | 51 → 59 points (+8 points) |
| Success Criteria | Enhanced | Cost savings targets updated, manual review queue added |

---

## Implementation Priority

**Week 13 (Current):**
1. ✅ PRD updates (FR008, NFR002, NFR003) - COMPLETE
2. Architecture documentation updates
3. Database migration (9 new fields + restructured classification_settings)

**Week 14:**
- Story 2.3 refactoring (Layer 1)
- Story 3.0 UI refactoring

**Week 15:**
- Story 2.6 implementation (Layer 2)
- Story 2.4 refactoring (Layer 3)

**Week 16:**
- Story 2.5 refactoring (Pipeline)
- New API endpoints

**Week 17:**
- Story 3.1 comprehensive testing
- Stories 3.2-3.3 deployment

---

**Status:** ✅ Summary document created - Epic Stories file updates in progress
