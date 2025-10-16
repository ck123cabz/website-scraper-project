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
| 2025-10-15 | 2.4 | 2 | TechDebt | Medium | TBD | Open | Complete skipped test suite for LlmService (`apps/api/src/jobs/__tests__/llm.service.spec.ts`). Implement 19 skipped tests covering fallback logic, retry strategy, cost calculation, response parsing, timeout handling. Effort: 4-6h. Fixes Story 2.4 Review M1. AC3-AC10. |
| 2025-10-15 | 2.4 | 2 | Bug | Medium | TBD | Open | Create database migration for LLM fields (`supabase/migrations/20251015_add_llm_classification_fields.sql`). Add classification_score, classification_reasoning, llm_provider, llm_cost, processing_time_ms, retry_count, error_message to results table. Effort: 1-2h. Fixes Story 2.4 Review M2. AC6, AC7, AC9, AC10. |
| 2025-10-15 | 2.4 | 2 | Enhancement | Medium | TBD | Open | Externalize LLM configuration constants (`apps/api/src/jobs/services/llm.service.ts`). Move timeout, model names, retry settings to environment variables (LLM_TIMEOUT_MS, LLM_GEMINI_MODEL, LLM_OPENAI_MODEL, LLM_RETRY_MAX_ATTEMPTS, LLM_RETRY_DELAYS). Update .env.example. Effort: 2-3h. Fixes Story 2.4 Review M3. |
| 2025-10-15 | 2.4 | 2 | Enhancement | Low | TBD | Open | Add content truncation logging (`apps/api/src/jobs/services/llm.service.ts:70`). Log debug message when content exceeds 10K chars for observability. Effort: 15min. Fixes Story 2.4 Review L1. AC2. |
| 2025-10-15 | 2.4 | 2 | Enhancement | Low | TBD | Open | Enhance error context in logs (`apps/api/src/jobs/services/llm.service.ts:209, 230`). Include URL, retry count, elapsed time in fallback/failure messages. Effort: 30min. Fixes Story 2.4 Review L2. |
| 2025-10-15 | 2.4 | 2 | Enhancement | Low | TBD | Open | Add API key validation health check (`apps/api/src/jobs/services/llm.service.ts` constructor). Optional startup ping to validate keys, add to HealthController. Effort: 2-3h. Fixes Story 2.4 Review L3. |
| 2025-10-15 | 2.5 | 2 | Bug | High | Epic 2 Lead | Open | **CRITICAL:** Implement complete graceful shutdown (`apps/api/src/workers/url-worker.processor.ts:571-577`). Call `await this.worker.close()` in onModuleDestroy() to wait for jobs to finish. Railway deployments will interrupt mid-processing without this. Effort: 1h. Fixes Story 2.5 Review ISSUE-1. AC2.5.7. |
| 2025-10-15 | 2.5 | 2 | Bug | High | Epic 2 Lead | Open | **CRITICAL:** Add environment variable validation at startup (`apps/api/src/main.ts`). Validate SCRAPINGBEE_API_KEY, GEMINI_API_KEY, OPENAI_API_KEY, REDIS_URL, SUPABASE_URL before app.listen(), throw error if missing. Effort: 30min. Fixes Story 2.5 Review ISSUE-2. NFR002-R1. |
| 2025-10-15 | 2.5 | 2 | Bug | High | Epic 2 Lead | Open | **CRITICAL:** Enable NestJS shutdown hooks (`apps/api/src/main.ts`). Add `app.enableShutdownHooks()` call before listen for Railway SIGTERM handling. Effort: 5min. Fixes Story 2.5 Review ISSUE-4. AC2.5.7. |
| 2025-10-15 | 2.5 | 2 | Bug | Medium | Epic 2 Lead | Open | Implement pause/resume job database updates (`apps/api/src/queue/queue.service.ts:77-93`). Replace console.log stubs with Supabase client updates to jobs table status field. Dashboard controls won't work without this. Effort: 1h. Fixes Story 2.5 Review ISSUE-3. AC2.5.6. |
| 2025-10-15 | 2.5 | 2 | Test | Medium | TBD | Open | Add Supabase Realtime integration test (`apps/api/src/workers/__tests__/integration/realtime.spec.ts` new file). Create test with test Supabase project to verify events fire on job updates. Effort: 2-3h. Fixes Story 2.5 Review ISSUE-5. AC2.5.4. |
| 2025-10-15 | 2.5 | 2 | Enhancement | Low | TBD | Open | Make worker concurrency configurable (`apps/api/src/workers/url-worker.processor.ts:32`). Use `process.env.WORKER_CONCURRENCY || 5` instead of hardcoded value. Update .env.example. Effort: 15min. Fixes Story 2.5 Review CODE-1. |
| 2025-10-15 | 2.5 | 2 | TechDebt | Low | TBD | Open | Consolidate retry logic to shared utility. Extract `isTransientError()` from apps/api/src/scraper/scraper.service.ts:305-336 and apps/api/src/workers/url-worker.processor.ts:493-527 to packages/shared/src/utils/retry.ts. Effort: 30min. Fixes Story 2.5 Review CODE-3. |
| 2025-10-15 | 2.5 | 2 | TechDebt | Low | TBD | Open | Replace console.log with Logger service (`apps/api/src/queue/queue.service.ts:19,81,92`). Inject NestJS Logger for structured logging consistent with other services. Effort: 15min. Fixes Story 2.5 Review CODE-2. |
| 2025-10-16 | 2.3-refactored | 2 | Bug | High | Epic 2 Lead | Open | **BLOCKING:** Register Layer1DomainAnalysisService in JobsModule (`apps/api/src/jobs/jobs.module.ts`). Add to providers and exports arrays. Service will never be instantiated without module registration. Effort: 5min. Fixes Story 2.3-refactored Review Action Item #1. AC1. |
| 2025-10-16 | 2.3-refactored | 2 | Bug | High | Epic 2 Lead | Open | **BLOCKING:** Integrate Layer1DomainAnalysisService into worker pipeline (`apps/api/src/workers/url-worker.ts`). Inject service, call analyzeUrl() before scraping, persist elimination results to database. Service is dead code without this. Effort: 2-3h. Fixes Story 2.3-refactored Review Action Item #2. AC7. |
| 2025-10-16 | 2.3-refactored | 2 | Bug | High | Epic 2 Lead | Open | **BLOCKING:** Verify database migration applied to Supabase. Run `supabase db push` and verify elimination_layer, layer1_reasoning, layer1_eliminated_count fields exist. Runtime errors will occur without these columns. Effort: 15min. Fixes Story 2.3-refactored Review Action Item #3. AC7. |
| 2025-10-16 | 2.3-refactored | 2 | Bug | High | Epic 2 Lead | Open | **BLOCKING:** Fix configuration file path resolution for production (`layer1-domain-analysis.service.ts:29-36`). Use ConfigModule instead of fs.readFileSync, copy config to dist/ during build. Railway may fail to load rules. Effort: 1-2h. Fixes Story 2.3-refactored Review Action Item #4. AC1. |
| 2025-10-16 | 2.3-refactored | 2 | Test | Medium | TBD | Open | Add integration tests for Layer 1 service (`apps/api/src/jobs/__tests__/layer1-integration.spec.ts` new file). Verify JobsModule injection, worker integration, database writes, job counters. Effort: 3-4h. Fixes Story 2.3-refactored Review Action Item #5. AC6, AC7. |
| 2025-10-16 | 2.3-refactored | 2 | Bug | Medium | TBD | Open | Implement safe-regex validation (`layer1-domain-analysis.service.ts:27-46`). Add safe-regex checks for subdomain_blogs patterns during rule loading to prevent ReDoS vulnerabilities. Effort: 1h. Fixes Story 2.3-refactored Review Action Item #6. AC1. |
| 2025-10-16 | 2.3-refactored | 2 | TechDebt | Medium | TBD | Open | Regenerate story context for refactored Layer 1 approach (`docs/story-context-2.3.xml`). Current context describes original PreFilterService, not refactored Layer1DomainAnalysisService. Run story-context workflow. Effort: 30min. Fixes Story 2.3-refactored Review Action Item #7. Documentation accuracy. |
| 2025-10-16 | 2.3-refactored | 2 | Enhancement | Low | TBD | Open | Improve TLD extraction with library (`layer1-domain-analysis.service.ts:164-181`). Replace hardcoded multi-part TLD logic with `psl` package for comprehensive support. Effort: 1h. Fixes Story 2.3-refactored Review Action Item #8. AC3. |
| 2025-10-16 | 2.3-refactored | 2 | Enhancement | Low | TBD | Open | Adjust performance logging threshold (`layer1-domain-analysis.service.ts:137-139`). Change from 50ms to 100ms to reduce excessive warnings for edge cases. Effort: 5min. Fixes Story 2.3-refactored Review Action Item #9. AC6. |
| 2025-10-16 | 2.3-refactored | 2 | Test | Low | TBD | Open | Verify type exports work correctly. Run `npm run type-check` in monorepo root to ensure Layer1 types exported from shared package. Effort: 5min. Fixes Story 2.3-refactored Review Action Item #10. Build reliability. |

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

**Last Updated:** 2025-10-16 by CK via Senior Developer Review workflow (Story 2.3-refactored review completed, 10 action items added - 4 BLOCKING integration issues must be fixed before service becomes functional: module registration, worker integration, database migration verification, config loading)
