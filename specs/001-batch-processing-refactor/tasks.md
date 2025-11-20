# Tasks: Batch Processing Workflow Refactor

**Input**: Design documents from `/specs/001-batch-processing-refactor/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/jobs-api.yaml

**Tests**: Following Test-Driven Development (TDD) - tests written FIRST before implementation

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Project Structure

This is a **monorepo** project with three workspaces:
- `apps/api/` - NestJS backend (workspace: @website-scraper/api)
- `apps/web/` - Next.js frontend (workspace: web)
- `packages/shared/` - Shared TypeScript types (workspace: @website-scraper/shared)
- `supabase/migrations/` - Database schema migrations

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database migrations and shared type definitions that all user stories depend on

- [X] T001 Create migration to add JSONB columns to url_results table in supabase/migrations/20251113000001_add_layer_factors.sql
- [X] T002 Create migration to add GIN indexes on JSONB columns in supabase/migrations/20251113000002_add_jsonb_indexes.sql
- [X] T003 Create migration to add retry tracking columns in supabase/migrations/20251113000003_add_retry_tracking.sql
- [X] T004 Create migration to add archived_at and update status enum for jobs table in supabase/migrations/20251113000004_add_job_archival.sql
- [X] T005 Apply all migrations locally and verify schema changes with supabase db push
- [X] T006 [P] Define Layer1Factors interface in packages/shared/src/types/url-results.ts
- [X] T007 [P] Define Layer2Factors interface in packages/shared/src/types/url-results.ts
- [X] T008 [P] Define Layer3Factors interface in packages/shared/src/types/url-results.ts
- [X] T009 [P] Define UrlResult interface in packages/shared/src/types/url-results.ts
- [X] T010 [P] Define Job interface with archival support in packages/shared/src/types/jobs.ts
- [X] T011 Export all types from packages/shared/src/index.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core backend infrastructure that MUST be complete before ANY user story implementation

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T012 Create Layer1FactorsDto with class-validator decorators in apps/api/src/queue/dto/layer1-factors.dto.ts
- [X] T013 Create Layer2FactorsDto with class-validator decorators in apps/api/src/queue/dto/layer2-factors.dto.ts
- [X] T014 Create Layer3FactorsDto with class-validator decorators in apps/api/src/queue/dto/layer3-factors.dto.ts
- [X] T015 Update Layer 1 processor to return complete Layer1Factors structure in apps/api/src/queue/processors/layer1-processor.ts
- [X] T016 Update Layer 2 processor to return complete Layer2Factors structure with module scores in apps/api/src/queue/processors/layer2-processor.ts
- [X] T017 Update Layer 3 processor to return complete Layer3Factors structure with sophistication signals in apps/api/src/queue/processors/layer3-processor.ts
- [X] T018 Update QueueService to remove manual_review_queue routing logic in apps/api/src/queue/queue.service.ts
- [X] T019 Update QueueService.processUrl() to always write to url_results with layer factors in apps/api/src/queue/queue.service.ts
- [X] T020 Configure BullMQ worker with max concurrency of 5 in apps/api/src/jobs/jobs.module.ts
- [X] T021 Configure BullMQ retry strategy with exponential backoff in apps/api/src/queue/queue.service.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Automated Batch Processing (Priority: P1) 🎯 MVP

**Goal**: Users upload CSV files and system automatically processes ALL URLs through Layer 1/2/3 without manual intervention

**Independent Test**: Upload CSV with 100 test URLs, verify all process through Layer 1/2/3 without routing to manual_review_queue, confirm all results in url_results table

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T022 [P] [US1] Write unit test for Layer1Processor returning complete factors in apps/api/src/queue/__tests__/layer1-processor.spec.ts
- [X] T023 [P] [US1] Write unit test for Layer2Processor returning complete factors in apps/api/src/queue/__tests__/layer2-processor.spec.ts
- [X] T024 [P] [US1] Write unit test for Layer3Processor returning complete factors in apps/api/src/queue/__tests__/layer3-processor.spec.ts
- [X] T025 [P] [US1] Write integration test for QueueService.processUrl() writing to url_results in apps/api/src/queue/__tests__/queue.service.spec.ts
- [X] T026 [P] [US1] Write integration test verifying no writes to manual_review_queue in apps/api/src/queue/__tests__/queue.service.spec.ts
- [X] T027 [P] [US1] Write test for retry logic with exponential backoff in apps/api/src/queue/__tests__/retry-logic.spec.ts
- [X] T028 [P] [US1] Write test for permanent failure after 3 retry attempts in apps/api/src/queue/__tests__/retry-logic.spec.ts

### Implementation for User Story 1

- [X] T029 [US1] Implement error classification helper isTransientError() in apps/api/src/queue/utils/error-classifier.ts
- [X] T030 [US1] Update Layer 1 processor implementation to pass T022 test
- [X] T031 [US1] Update Layer 2 processor implementation to pass T023 test
- [X] T032 [US1] Update Layer 3 processor implementation to pass T024 test
- [X] T033 [US1] Update QueueService to write complete factor structures to url_results
- [X] T034 [US1] Implement retry tracking (increment retry_count, store last_error) in apps/api/src/queue/queue.service.ts
- [X] T035 [US1] Add exponential backoff configuration to BullMQ job options
- [X] T036 [US1] Verify all Unit Story 1 tests pass (T022-T028)

**Checkpoint**: Automated batch processing complete - URLs process through all layers without manual review

---

## Phase 4: User Story 2 - Enhanced Results Display with Factor Transparency (Priority: P2)

**Goal**: Users expand URL result rows to see complete Layer 1/2/3 decision path with all factors, scores, and reasoning

**Independent Test**: View completed job results, click expand on any URL row, verify Layer 1/2/3 analysis breakdown displays with all factors and reasoning

### Tests for User Story 2 ⚠️

- [X] T037 [P] [US2] Write contract test for GET /jobs/:jobId/results endpoint in apps/api/src/jobs/__tests__/jobs.controller.spec.ts
- [X] T038 [P] [US2] Write contract test for GET /jobs/:jobId/results/:resultId endpoint in apps/api/src/jobs/__tests__/jobs.controller.spec.ts
- [X] T039 [P] [US2] Write React test for ResultsTable pagination in apps/web/components/results/__tests__/ResultsTable.test.tsx
- [X] T040 [P] [US2] Write React test for expandable row showing factor breakdown in apps/web/components/results/__tests__/ResultRow.test.tsx
- [X] T041 [P] [US2] Write React test for Layer1Factors component in apps/web/components/results/__tests__/Layer1Factors.test.tsx

### Implementation for User Story 2

- [X] T042 [P] [US2] Implement GET /jobs/:jobId/results with pagination and filters in apps/api/src/jobs/jobs.controller.ts
- [X] T043 [P] [US2] Implement GET /jobs/:jobId/results/:resultId with complete factor data in apps/api/src/jobs/jobs.controller.ts
- [X] T044 [US2] Implement JobsService.getJobResults() with filter logic in apps/api/src/jobs/jobs.service.ts
- [X] T045 [US2] Implement JobsService.getResultDetails() in apps/api/src/jobs/jobs.service.ts
- [X] T046 [P] [US2] Create ResultsTable component with pagination controls in apps/web/components/results/ResultsTable.tsx
- [X] T047 [P] [US2] Create ResultRow component with expand/collapse button in apps/web/components/results/ResultRow.tsx
- [X] T048 [P] [US2] Create FactorBreakdown component container in apps/web/components/results/FactorBreakdown.tsx
- [X] T049 [P] [US2] Create Layer1Factors display component in apps/web/components/results/Layer1Factors.tsx
- [X] T050 [P] [US2] Create Layer2Factors display component in apps/web/components/results/Layer2Factors.tsx
- [X] T051 [P] [US2] Create Layer3Factors display component in apps/web/components/results/Layer3Factors.tsx
- [X] T052 [US2] Integrate ResultsTable with React Query for data fetching
- [X] T053 [US2] Add filter dropdowns (decision, layer, confidence band) to ResultsTable
- [X] T054 [US2] Implement graceful handling of NULL factor values for pre-migration data
- [X] T055 [US2] Verify all User Story 2 tests pass (T037-T055)

**Checkpoint**: Factor transparency complete - users can view complete Layer 1/2/3 decision paths

---

## Phase 5: User Story 3 - Rich CSV Export for External Review (Priority: P2)

**Goal**: Users download CSV files with 48 columns of complete Layer 1/2/3 analysis data for external review in Excel/Google Sheets

**Independent Test**: Complete job with 50 test URLs, click "Download CSV" with "Complete Results" format, verify 48 columns with all factors, open in Excel to confirm formatting

### Tests for User Story 3 ⚠️

- [X] T056 [P] [US3] Write contract test for POST /jobs/:jobId/export endpoint with format and filter parameters in apps/api/src/jobs/__tests__/jobs.controller.spec.ts
- [X] T057 [P] [US3] Write unit test for complete CSV format (48 columns: 10 core + 5 L1 + 10 L2 + 15 L3) in apps/api/src/jobs/__tests__/export.service.spec.ts
- [X] T058 [P] [US3] Write unit test for all format options (summary 7 cols, layer1 15 cols, layer2 20 cols, layer3 25 cols) in apps/api/src/jobs/__tests__/export.service.spec.ts
- [X] T059 [P] [US3] Write unit test for CSV escaping (commas, quotes, newlines per RFC 4180) in apps/api/src/jobs/__tests__/export.service.spec.ts
- [X] T060 [P] [US3] Write performance test for 10k row export (<5s) with streaming in apps/api/src/jobs/__tests__/export.service.spec.ts

### Implementation for User Story 3

- [X] T061 [US3] Create ExportService with streamCSVExport() method in apps/api/src/jobs/services/export.service.ts
- [X] T062 [P] [US3] Implement generateCompleteColumns() for 48-column format (10 core + 5 L1 + 10 L2 + 15 L3) in apps/api/src/jobs/services/export.service.ts
- [X] T063 [P] [US3] Implement generateSummaryColumns() for 7-column format in apps/api/src/jobs/services/export.service.ts
- [X] T064 [P] [US3] Implement generateLayerColumns() for Layer1 (15 cols), Layer2 (20 cols), Layer3 (25 cols) formats in apps/api/src/jobs/services/export.service.ts
- [X] T065 [US3] Implement streaming with 100-row batches in apps/api/src/jobs/services/export.service.ts
- [X] T066 [US3] Add Excel compatibility (UTF-8 BOM, CRLF, RFC 4180 quoting) in apps/api/src/jobs/services/export.service.ts
- [X] T067 [US3] Implement POST /jobs/:jobId/export endpoint in apps/api/src/jobs/jobs.controller.ts
- [X] T068 [US3] Add CSV download button to results page in apps/web/components/results/ResultsTable.tsx
- [X] T069 [US3] Add format selector (complete/summary/layer1/layer2/layer3) with filter options (decision, confidence, layer) to export dialog in apps/web/components/results/ExportDialog.tsx
- [X] T070 [US3] Implement filtered export capability (filters apply to any format - not a separate format) in apps/api/src/jobs/services/export.service.ts
- [X] T071 [US3] Verify all User Story 3 tests pass (T056-T060)

**Checkpoint**: Rich CSV export complete - users can download complete analysis data for external review

---

## Phase 6: User Story 4 - Job-Centric Dashboard with Real-Time Progress (Priority: P3)

**Goal**: Users see dashboard showing active jobs with real-time progress and recent completed jobs with quick CSV download

**Independent Test**: Create 3 jobs (running, paused, queued), navigate to dashboard, verify progress bars, layer breakdown, costs, and ETA display correctly

### Tests for User Story 4 ⚠️

- [X] T072 [P] [US4] Write contract test for GET /queue/status endpoint in apps/api/src/jobs/__tests__/jobs.controller.spec.ts
- [X] T073 [P] [US4] Write React test for JobDashboard with active jobs section in apps/web/app/dashboard/__tests__/page.test.tsx
- [X] T074 [P] [US4] Write React test for progress bar updates in apps/web/components/dashboard/__tests__/JobProgressCard.test.tsx
- [X] T075 [P] [US4] Write React test for polling every 5 seconds in apps/web/components/dashboard/__tests__/JobDashboard.test.tsx
- [X] T076 [P] [US4] Write React test for polling stops when job completes in apps/web/components/dashboard/__tests__/JobDashboard.test.tsx

### Implementation for User Story 4

- [X] T077 [US4] Implement GET /queue/status endpoint in apps/api/src/jobs/jobs.controller.ts
- [X] T078 [US4] Implement calculateProgress() helper in apps/api/src/jobs/jobs.service.ts
- [X] T079 [US4] Implement getQueuePosition() helper in apps/api/src/jobs/jobs.service.ts
- [X] T080 [US4] Implement getEstimatedWaitTime() helper in apps/api/src/jobs/jobs.service.ts
- [X] T081 [P] [US4] Create JobDashboard page component in apps/web/app/dashboard/page.tsx
- [X] T082 [P] [US4] Create JobProgressCard component with progress bar in apps/web/components/dashboard/JobProgressCard.tsx
- [X] T083 [P] [US4] Create LayerBreakdown component showing elimination counts in apps/web/components/dashboard/LayerBreakdown.tsx
- [X] T084 [P] [US4] Create CompletedJobsSection component in apps/web/components/dashboard/CompletedJobsSection.tsx
- [X] T085 [US4] Integrate React Query polling (5s interval) in apps/web/app/dashboard/page.tsx
- [X] T086 [US4] Implement conditional polling (stop when job completes) in apps/web/app/dashboard/page.tsx
- [X] T087 [US4] Add quick CSV download button to completed jobs section
- [X] T088 [US4] Display queue position for queued jobs ("Queued - position #3")
- [X] T089 [US4] Verify all User Story 4 tests pass (T072-T076)

**Checkpoint**: Real-time dashboard complete - users can monitor active jobs and access completed results

---

## Phase 7: User Story 5 - Remove Manual Review System (Priority: P3)

**Goal**: Completely remove manual review queue system (UI, backend routing, notifications, database tables) to simplify codebase

**Independent Test**: Verify /manual-review route returns 404, manual review API endpoints removed, QueueService has no routing to manual_review_queue, NotificationService removed

### Implementation for User Story 5

**Frontend Cleanup**:
- [X] T090 [P] [US5] Remove /manual-review route (redirect to 404) in apps/web/app/manual-review/page.tsx
- [X] T091 [P] [US5] Delete ManualReviewQueue component from apps/web/components/manual-review/ManualReviewQueue.tsx
- [X] T092 [P] [US5] Delete ReviewDialog component from apps/web/components/manual-review/ReviewDialog.tsx
- [X] T093 [P] [US5] Remove manual review badge from navigation in apps/web/components/layout/Navigation.tsx
- [X] T094 [P] [US5] Remove manual review related imports and references from apps/web/

**Backend Cleanup**:
- [X] T095 [P] [US5] Comment out ManualReviewModule import in apps/api/src/app.module.ts
- [X] T096 [P] [US5] Comment out NotificationService calls in apps/api/src/queue/queue.service.ts
- [X] T097 [P] [US5] Comment out StaleQueueMarkerProcessor cron job in apps/api/src/jobs/jobs.module.ts
- [X] T098 [US5] Verify QueueService has no routing logic to manual_review_queue table
- [X] T099 [US5] Add deprecation comments to manual review code explaining removal plan

**Database Migration (⚠️ EXECUTE AFTER 2 WEEKS PRODUCTION STABILITY - ADD CALENDAR REMINDER)**:
- [ ] T100 Create migration to drop manual_review_queue_archived table in supabase/migrations/20251127000001_drop_manual_review_queue_archived.sql (See PENDING_MANUAL_REVIEW_CLEANUP.md)
- [ ] T101 Create migration to drop manual_review_activity table in supabase/migrations/20251127000002_drop_manual_review_activity.sql (See PENDING_MANUAL_REVIEW_CLEANUP.md)
- [ ] T102 Remove @slack/webhook from package.json if only used for manual review (See PENDING_MANUAL_REVIEW_CLEANUP.md)
- [ ] T103 Remove @nestjs/schedule from package.json if only used for manual review (NOTE: Still needed for ArchivalService/CleanupService - DO NOT REMOVE)

**Checkpoint**: Manual review system removed - codebase simplified, zero references to manual_review_queue in active code

**IMPORTANT**: Set manual reminder for 2 weeks after Phase 3 (User Story 1) production deployment to execute T100-T103

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T104 [P] Add error handling for NULL factor values in CSV export
- [X] T105 [P] Add comprehensive logging for job lifecycle events in apps/api/src/jobs/jobs.service.ts
- [X] T106 [P] Update API documentation (OpenAPI spec) with new endpoints in apps/api/src/main.ts
- [X] T107 [P] Add performance monitoring for CSV export generation
- [X] T108 Create migration script to export manual_review_queue to CSV (url, job_id, confidence_score, routed_at, layer2_factors, layer3_factors), mark jobs as "requires_manual_completion", and rename table to manual_review_queue_archived in supabase/migrations/20251113000005_migrate_manual_review_items.sql
- [X] T109 Create ArchivalService with daily cron (2 AM UTC) to mark jobs completed_at > 90 days as status='archived' in apps/api/src/jobs/services/archival.service.ts
- [X] T110 Create CleanupService with daily cron (2 AM UTC) to hard-delete archived jobs with archived_at > 90 days in apps/api/src/jobs/services/cleanup.service.ts
- [X] T111 [P] Update README with new batch processing workflow documentation
- [X] T111a [P] Add integration test verifying open access model: all endpoints return all jobs without user filtering in apps/api/src/__tests__/integration/open-access.spec.ts
- [X] T112 Run all tests and verify no linting errors (npm test && npm run lint)
- [X] T113 Run quickstart.md validation scenarios

---

## Phase 9: Performance & Load Testing (Success Criteria Validation)

**Purpose**: Validate performance-related success criteria before production deployment

**⚠️ CRITICAL**: These tests validate production readiness metrics

- [X] T114 [P] Write load test for SC-001: Process 10,000 URLs end-to-end in <3 hours in apps/api/src/__tests__/load/batch-processing.load.spec.ts
- [X] T115 [P] Write performance test for SC-003: Results table pagination handles 100,000+ rows with <500ms page load in apps/web/__tests__/performance/results-pagination.perf.spec.ts
- [X] T116 [P] Write performance test for SC-006: Expandable row data loads in <500ms in apps/web/__tests__/performance/expand-row.perf.spec.ts
- [X] T117 [P] Write performance test for SC-007: Dashboard updates with <5s latency from actual job state in apps/web/__tests__/performance/dashboard-realtime.perf.spec.ts
- [X] T118 [P] Write concurrency test for SC-009: System processes 5 concurrent jobs without performance degradation in apps/api/src/__tests__/load/concurrent-jobs.load.spec.ts
- [X] T119 [P] Write storage test for SC-010: Database storage increases <50MB per 10k URLs in apps/api/src/__tests__/integration/storage-growth.spec.ts
- [X] T120 [P] Write reliability test for SC-011: Transient failures result in <1% permanent failure rate in apps/api/src/__tests__/integration/retry-reliability.spec.ts
- [X] T121 Run all performance tests and verify SC-001, SC-003, SC-006, SC-007, SC-009, SC-010, SC-011 pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (US1 → US2 → US3 → US4 → US5)
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories - ✅ **MVP CANDIDATE**
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Depends on US1 results structure but independently testable
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Depends on US1 results structure but independently testable
- **User Story 4 (P3)**: Can start after Foundational (Phase 2) - Integrates with all stories but independently testable
- **User Story 5 (P3)**: Should wait until US1-US4 are stable (2 weeks in production) before removing manual review system

### Within Each User Story

- Tests MUST be written FIRST and FAIL before implementation
- Models before services
- Services before endpoints/controllers
- Backend before frontend (API contracts define frontend data requirements)
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

**Phase 1 (Setup) - 11 tasks can run in 3 waves**:
- Wave 1: T001-T005 (migrations) - sequential
- Wave 2: T006-T010 (type definitions) - all parallel
- Wave 3: T011 (exports) - after types complete

**Phase 2 (Foundational) - 10 tasks can run in 3 waves**:
- Wave 1: T012-T014 (DTOs) - all parallel
- Wave 2: T015-T017 (processor updates) - all parallel
- Wave 3: T018-T021 (service updates) - sequential

**User Story 1 - Tests (T022-T028)**: All 7 tests can run in parallel

**User Story 2 - Tests (T037-T041)**: All 5 tests can run in parallel

**User Story 2 - Backend (T042-T043)**: Both endpoints in parallel

**User Story 2 - Frontend (T046-T051)**: All 6 components can run in parallel

**User Story 3 - Tests (T056-T060)**: All 5 tests can run in parallel

**User Story 3 - Column Generators (T062-T064)**: All 3 formats in parallel

**User Story 4 - Tests (T072-T076)**: All 5 tests can run in parallel

**User Story 4 - Frontend Components (T081-T084)**: All 4 components in parallel

**User Story 5 - Frontend Cleanup (T090-T094)**: All 5 tasks in parallel

**User Story 5 - Backend Cleanup (T095-T097)**: All 3 tasks in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together (write tests first):
Task T022: "Write unit test for Layer1Processor in apps/api/src/queue/__tests__/layer1-processor.spec.ts"
Task T023: "Write unit test for Layer2Processor in apps/api/src/queue/__tests__/layer2-processor.spec.ts"
Task T024: "Write unit test for Layer3Processor in apps/api/src/queue/__tests__/layer3-processor.spec.ts"
Task T025: "Write integration test for QueueService.processUrl() in apps/api/src/queue/__tests__/queue.service.spec.ts"
Task T026: "Write integration test verifying no manual_review_queue writes"
Task T027: "Write test for retry logic with exponential backoff"
Task T028: "Write test for permanent failure after 3 attempts"

# After tests are written and FAILING, implement in sequence:
Task T029: "Implement error classification helper"
Task T030-T032: "Update Layer processors" (can be parallel)
Task T033-T035: "Update QueueService with retry logic"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T011) - ~1 day
2. Complete Phase 2: Foundational (T012-T021) - ~2 days
3. Complete Phase 3: User Story 1 (T022-T036) - ~2 days
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

**Estimated MVP Duration**: 5 working days

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready (3 days)
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!) (2 days)
3. Add User Story 2 → Test independently → Deploy/Demo (2 days)
4. Add User Story 3 → Test independently → Deploy/Demo (2 days)
5. Add User Story 4 → Test independently → Deploy/Demo (1 day)
6. Add User Story 5 → Test independently → Deploy/Demo (1 day)
7. Polish Phase → Final validation (1 day)

**Total Estimated Duration**: 12 working days (2.5 weeks)

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (3 days)
2. Once Foundational is done:
   - Developer A: User Story 1 (2 days)
   - Developer B: User Story 2 (2 days)
   - Developer C: User Story 3 (2 days)
3. Then:
   - Developer A: User Story 4 (1 day)
   - Developer B: User Story 5 (1 day)
   - Developer C: Polish Phase (1 day)

**Parallel Duration**: 6 working days (1.5 weeks with 3 developers)

---

## Task Summary

**Total Tasks**: 122

**Task Count by Phase**:
- Phase 1 (Setup): 11 tasks
- Phase 2 (Foundational): 10 tasks
- Phase 3 (User Story 1): 15 tasks (7 tests + 8 implementation)
- Phase 4 (User Story 2): 19 tasks (5 tests + 14 implementation)
- Phase 5 (User Story 3): 16 tasks (5 tests + 11 implementation)
- Phase 6 (User Story 4): 18 tasks (5 tests + 13 implementation)
- Phase 7 (User Story 5): 14 tasks (cleanup only)
- Phase 8 (Polish): 11 tasks
- Phase 9 (Performance Testing): 8 tasks

**Parallel Opportunities**: 48 tasks marked with [P] can run in parallel within their phase

**MVP Scope**: Phase 1 + Phase 2 + Phase 3 = 36 tasks (User Story 1 only)

---

## Notes

- [P] tasks = different files, no dependencies within phase
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- TDD approach: Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
