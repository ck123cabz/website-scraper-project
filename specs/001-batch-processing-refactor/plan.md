# Implementation Plan: Batch Processing Workflow Refactor

**Branch**: `001-batch-processing-refactor` | **Date**: 2025-11-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-batch-processing-refactor/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Transform the website scraper from an in-app manual review queue system to a pure batch-processing workflow. Users upload CSV files with URLs, the system automatically processes all URLs through Layer 1/2/3 analysis without manual intervention, and users download rich CSV exports (48 columns) with complete factor breakdowns for external review in Excel/Google Sheets. This eliminates the manual review bottleneck, reduces workflow time from 7+ hours to 3.5 hours (50% savings), and shifts human review to familiar spreadsheet tools.

## Technical Context

**Language/Version**: TypeScript (Node.js v24.6.0+), TypeScript 5.5+ with strict mode
**Primary Dependencies**: NestJS 10.3, Next.js 14.2, BullMQ 5.0, React Query 5.90, class-validator 0.14, Supabase client 2.39+
**Storage**: PostgreSQL (Supabase) with JSONB columns for Layer 1/2/3 factors, GIN indexes for filtering
**Testing**: Jest 30+ (unit/integration), Playwright 1.56+ (E2E), supertest 7.1+ (API contract tests)
**Target Platform**: Linux server (Railway), modern browsers (Chrome/Firefox/Safari)
**Project Type**: Monorepo (web/api/shared) - Turborepo-managed workspaces
**Performance Goals**: Process 10,000 URLs in <3 hours, CSV export <5s for 10k rows, dashboard updates <5s latency
**Constraints**: Max 5 concurrent jobs system-wide, p95 API response <500ms reads/<2s writes, no memory exhaustion on large exports
**Scale/Scope**: 100,000+ URLs per job, 48-column CSV exports, 3-layer classification pipeline (Layer 1 domain analysis, Layer 2 publication detection, Layer 3 LLM sophistication analysis)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with `.specify/memory/constitution.md`:

- [x] **Monorepo Architecture**: Yes - changes span all three workspaces (api for backend, web for UI, shared for types). Clear separation maintained.
- [x] **Database-First**: Yes - spec defines url_results schema changes (3 JSONB columns, retry_count, archived_at) that MUST be implemented as migrations before code changes.
- [x] **Queue-Based Processing**: Yes - batch URL processing continues to use BullMQ. New concurrency management (max 5 jobs) and retry logic (exponential backoff) enhance existing queue infrastructure.
- [x] **Test-Driven Development**: Yes - spec includes comprehensive acceptance scenarios for all 5 user stories. Tests required before implementation.
- [x] **Type Safety**: Yes - Layer 1/2/3 factor structures will be defined in shared types, validated with class-validator in API, consumed type-safely in frontend.
- [x] **Feature Specifications**: Yes - spec.md is complete with user stories, acceptance criteria, data model, success metrics, and clarifications.

**Violations**: None. This feature fully aligns with constitutional principles.

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
