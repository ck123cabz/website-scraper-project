# Implementation Plan: Complete Settings Implementation (Manual Review System)

**Branch**: `001-manual-review-system` | **Date**: 2025-11-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-manual-review-system/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

This feature implements the complete manual review system for URLs requiring human judgment. The primary requirements include:

1. **Manual Review Queue Infrastructure**: Database table, API endpoints, and UI for reviewing URLs that fall into configurable confidence bands
2. **Confidence Band Action Routing**: Use the stored action field (auto_approve, manual_review, reject) instead of hardcoded logic
3. **Queue Management**: Size limiting, stale flagging, and overflow handling
4. **Notifications**: Email and Slack alerts when queue reaches thresholds
5. **Factor Visibility**: Comprehensive UI showing all Layer 1, 2, and 3 evaluation results with visual indicators

The technical approach leverages existing NestJS/BullMQ backend architecture with Supabase PostgreSQL, adding a new manual_review_queue table and API module, plus Next.js frontend pages for queue management.

## Technical Context

**Language/Version**: TypeScript (Node.js 18+)
**Primary Dependencies**: NestJS 10, Next.js 14, BullMQ 4, React Query 5, class-validator 0.14
**Storage**: Supabase PostgreSQL with Row-Level Security (RLS)
**Testing**: Jest (unit/integration), Playwright (E2E)
**Target Platform**: Web (Railway deployment, Docker Compose local)
**Project Type**: Monorepo (web + API)
**Performance Goals**: <500ms p95 for API reads, <2s for writes, <2s page loads, <100ms routing logic
**Constraints**: Queue size configurable to prevent runaway growth, stale-flagging job runs daily, notification failures must not block processing
**Scale/Scope**: Support 1000+ URLs per job, manual review queue up to 10,000 items, concurrent reviewers supported

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with `.specify/memory/constitution.md`:

- [x] **Monorepo Architecture**: Feature respects workspace boundaries - manual review API module in `apps/api/src/manual-review/`, frontend pages in `apps/web/app/manual-review/`, shared types in `packages/shared/src/types/`
- [x] **Database-First**: Data model will be designed in Supabase migration (`manual_review_queue` table) before application code
- [x] **Queue-Based Processing**: Stale-flagging is a scheduled job (BullMQ cron job), notification sending is async (non-blocking)
- [x] **Test-Driven Development**: Tests will be written for API endpoints (contract tests), routing logic (unit tests), and UI flows (E2E tests) before implementation
- [x] **Type Safety**: Shared TypeScript types for ManualReviewQueueEntry, FactorEvaluationResults, ReviewDecision with DTOs using class-validator for runtime validation
- [x] **Feature Specifications**: Spec is complete with 6 user stories, acceptance criteria, data model (key entities), API contracts (FR-002), and success criteria

**Violations**: None

All constitutional principles are satisfied. This feature fits cleanly into existing architecture without requiring new patterns or violations.

---

### Post-Design Re-Evaluation (Phase 1 Complete)

**Date**: 2025-11-11

After completing Phase 0 (research) and Phase 1 (design artifacts: data-model.md, contracts, quickstart.md), re-evaluating constitutional compliance:

- [x] **Monorepo Architecture**: ✅ CONFIRMED - Design maintains strict workspace boundaries. API module in apps/api/src/manual-review/, frontend in apps/web/app/manual-review/, shared types in packages/shared/src/types/manual-review.ts
- [x] **Database-First**: ✅ CONFIRMED - data-model.md defines complete schema with manual_review_queue table, indexes, constraints, and JSONB structures. Migration must be applied before any code implementation.
- [x] **Queue-Based Processing**: ✅ CONFIRMED - StaleQueueMarkerProcessor uses BullMQ @Cron decorator for daily scheduled job. NotificationService sends emails/Slack asynchronously without blocking URL processing (documented in research.md)
- [x] **Test-Driven Development**: ✅ CONFIRMED - quickstart.md explicitly sequences TDD workflow: write test → watch fail → implement. Integration tests for routing logic, contract tests for API endpoints, E2E tests for UI flows.
- [x] **Type Safety**: ✅ CONFIRMED - Complete TypeScript interfaces defined in data-model.md (ManualReviewQueueEntry, Layer1/2/3Results, ReviewDecision). DTOs with class-validator decorators specified for API validation (@IsIn, @IsEmail, etc.)
- [x] **Feature Specifications**: ✅ CONFIRMED - Spec contains 6 user stories with acceptance scenarios, 24 functional requirements, data model with 9 entities, OpenAPI contract with 5 endpoints, 11 success criteria

**New Technical Decisions (from research.md)**:
- **nodemailer with SMTP**: Industry-standard email library, no vendor lock-in → Aligns with simplicity principle
- **@slack/webhook**: Official Slack SDK for webhook integration → Aligns with using maintained libraries
- **Redis for threshold tracking**: Reuses existing infrastructure, lightweight state storage → Aligns with not adding unnecessary complexity
- **JSONB for layer results**: Flexible schema evolution without migrations → Justified by evolving evaluation logic requirements
- **Soft-delete pattern**: Preserves audit trail for compliance → Justified by regulatory/debugging needs

**Constitution Compliance**: ✅ **PASS**

No new violations introduced during design phase. All architectural decisions align with constitutional principles. Implementation can proceed to Phase 2 (task generation via /speckit.tasks).

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

This project uses a **monorepo structure** with separate workspaces:

```text
apps/
├── api/                    # NestJS backend (workspace: @website-scraper/api)
│   ├── src/
│   │   ├── [feature]/      # Feature modules
│   │   ├── jobs/           # BullMQ job processors
│   │   ├── settings/       # Settings endpoints
│   │   └── main.ts
│   └── __tests__/          # Jest tests
│
├── web/                    # Next.js frontend (workspace: web)
│   ├── app/                # App router pages
│   ├── components/         # React components
│   └── __tests__/          # Jest + Playwright tests
│
packages/
└── shared/                 # Shared types (workspace: @website-scraper/shared)
    └── src/
        └── types/          # TypeScript types/interfaces

supabase/
└── migrations/             # Database schema migrations
```

**Key Locations for This Feature**:

- API Backend: `apps/api/src/[feature-name]/`
- Frontend UI: `apps/web/app/[feature-name]/` or `apps/web/components/[feature-name]/`
- Shared Types: `packages/shared/src/types/[feature-name].ts`
- Database: `supabase/migrations/[timestamp]_[feature_name].sql`
- Tests: Feature-specific `__tests__/` directories in each workspace

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
