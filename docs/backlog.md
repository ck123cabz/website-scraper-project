# Project Backlog

**Generated:** 2025-10-13
**Project:** Website Scraper Platform
**Purpose:** Track action items, technical debt, and follow-ups from code reviews and development

---

## Action Items from Story Reviews

| Date | Story | Epic | Type | Severity | Owner | Status | Notes |
|------|-------|------|------|----------|-------|--------|-------|
| 2025-10-13 | 1.3 | 1 | Test | Medium | Claude | Completed | ✅ **DONE 2025-10-13:** Unit tests for useCurrentURLTimer hook added. 11/11 tests passing with 100% coverage (statements, branches, functions, lines). Files: `apps/web/hooks/__tests__/use-current-url-timer.test.ts`, `jest.config.js`, `jest.setup.js`. See Story 1.3 changelog v2.2. |
| 2025-10-13 | 1.3 | 1 | Enhancement | Low | TBD | Open | Improve timer display formatting (`apps/web/components/current-url-panel.tsx:116`). Use formatDuration() or create formatElapsedTime() helper for consistency with MetricsPanel. See Story 1.2 patterns, NFR001-P1. |
| 2025-10-13 | 1.3 | 1 | TechDebt | Low | TBD | Open | Add error boundary protection (`apps/web/components/job-detail-client.tsx:118-125`). Wrap CurrentURLPanel in error boundary with fallback UI. See NFR001-R4, Epic 1 Tech Spec. |
| 2025-10-13 | 1.3 | 1 | Review | Low | TBD | Open | Review Zod URL validation strictness (`packages/shared/src/schemas/job.ts:15`). Consider relaxing .url() validation for real-world scraping URL formats or document rationale. |
| 2025-10-14 | 1.5 | 1 | Bug | High | Claude | Open | **BLOCKING:** Fix transformJobFromDB - add missing avgCostPerUrl and projectedTotalCost fields (`apps/web/hooks/use-jobs.ts:228-251`). Production build fails. Must fix before merge. See Story 1.5 Review H1. |
| 2025-10-14 | 1.5 | 1 | TechDebt | Medium | TBD | Open | Document or improve savings calculation (`apps/web/components/cost-tracker.tsx:34-43`). Add JSDoc explaining 3x multiplier assumption or make configurable. See Story 1.5 Review M1. |
| 2025-10-14 | 1.5 | 1 | Enhancement | Low | TBD | Open | Simplify job card cost display (`apps/web/components/job-card.tsx:88`). Remove redundant ternary - formatCurrency handles 0. See Story 1.5 Review L1. |
| 2025-10-14 | 1.5 | 1 | Test | Low | TBD | Open | Add unit tests for formatCurrency utility. Create `packages/shared/src/utils/__tests__/format-currency.test.ts` covering standard amounts, micro-costs, edge cases. See Story 1.5 Review L3. |
| 2025-10-14 | 1.5 | 1 | Review | Low | TBD | Open | Verify test screenshot exists (`docs/story-1.5-test-screenshot.png`) and shows cost tracking features. See Story 1.5 Review L2. |
| 2025-10-15 | 2.2 | 2 | Bug | High | Epic 2 Lead | Open | **SECURITY:** Implement file path validation and cleanup (`apps/api/src/jobs/jobs.controller.ts:46`, `jobs.module.ts:14`). Validate file.path is within /tmp/uploads, add fs.unlink() in finally block, verify directory exists at startup. Fixes H1, H2. AC1, AC9. |
| 2025-10-15 | 2.2 | 2 | Bug | High | Epic 2 Lead | Open | **SECURITY:** Strengthen URL validation against injection (`apps/api/src/jobs/services/url-validation.service.ts:6-7`). Add protocol whitelist check, reject javascript:, data:, file: schemes. Fixes H3. AC3. |
| 2025-10-15 | 2.2 | 2 | Bug | Medium | Epic 2 Lead | Open | Implement proper database transactions (`apps/api/src/jobs/jobs.service.ts:95-145`). Replace manual rollback with Supabase RPC using Postgres BEGIN...COMMIT. Fixes M1. AC5, AC6. |
| 2025-10-15 | 2.2 | 2 | TechDebt | Medium | Epic 2 Lead | Open | Sanitize error messages (`apps/api/src/jobs/jobs.controller.ts:116, 133, 169`). Log detailed errors server-side, return generic client messages. Fixes M2. AC9. |
| 2025-10-15 | 2.2 | 2 | Enhancement | Medium | Epic 2 Lead | Open | Complete DTO validation decorators (`apps/api/src/jobs/dto/create-job.dto.ts:8-10`). Add @ArrayMaxSize(10000), @IsString({ each: true }), consider @IsUrl(). Fixes M3. AC2, AC8. |
| 2025-10-15 | 2.2 | 2 | Test | Low | TBD | Open | Add unit tests for FileParserService and UrlValidationService (`apps/api/src/jobs/__tests__/`). Create file-parser.service.spec.ts, url-validation.service.spec.ts. Fixes L3. Tasks 2.5, 3.5, 4.4. |
| 2025-10-15 | 2.2 | 2 | Enhancement | Low | TBD | Open | Improve error specificity in file parser (`apps/api/src/jobs/services/file-parser.service.ts:19, 53, 91`). Return specific errors for each failure case. Fixes L1. AC9. |
| 2025-10-15 | 2.2 | 2 | Test | Low | TBD | Open | Run performance verification test for 10K URLs. Generate test file, measure end-to-end time, document results (target: <5s). AC8. |

---

## Epic 2 Dependencies (Backend Coordination)

| Date | Story | Epic | Type | Owner | Status | Notes |
|------|-------|------|------|-------|--------|-------|
| 2025-10-13 | 1.3 | 2 | Feature | Epic 2 Lead | Blocked | Implement RecentURLsList with real data (`apps/web/components/recent-urls-list.tsx`). Depends on Epic 2, Story 2.5 (results table creation). Replace placeholder with useJobResults hook. See AC5, Story 1.3 Dev Notes (line 173). |
| 2025-10-13 | 1.3 | 2 | Backend | Epic 2 Lead | Blocked | Backend must update current_url fields in real-time. NestJS worker must update `currentUrl`, `currentStage`, `currentUrlStartedAt` as URLs progress. See Story 1.3 Dev Notes (line 182-185). Tracked in Epic 2, Story 2.5. |
| 2025-10-14 | 1.5 | 2 | Backend | Epic 2 Lead | Blocked | Backend must update cost fields in real-time (`total_cost`, `gemini_cost`, `gpt_cost` in jobs table). Cumulative cost tracking after each URL processed. See Story 1.5 Review Action Item #6, Epic 2 Story 2.5. |
| 2025-10-14 | 1.5 | 2 | Feature | Epic 2 Lead | Blocked | Improve savings calculation with actual data. Track actual GPT fallback vs Gemini cost per URL, calculate savings based on real pre-filter rejection rate. See Story 1.5 Review Action Item #7, Epic 2 Story 2.4/2.5. |

---

## Backlog Management Notes

- **Priority Levels:** High / Medium / Low
- **Status Values:** Open / In Progress / Blocked / Completed / Deferred
- **Type Values:** Bug / TechDebt / Enhancement / Feature / Test / Review / Backend
- **Epic References:** 1 (Real-Time Dashboard), 2 (Processing Pipeline)

**Last Updated:** 2025-10-15 by CK via Senior Developer Review workflow (Story 2.2 review completed, 8 action items added)
