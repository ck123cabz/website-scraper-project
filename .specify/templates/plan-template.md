# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION]  
**Primary Dependencies**: [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]  
**Storage**: [if applicable, e.g., PostgreSQL, CoreData, files or N/A]  
**Testing**: [e.g., pytest, XCTest, cargo test or NEEDS CLARIFICATION]  
**Target Platform**: [e.g., Linux server, iOS 15+, WASM or NEEDS CLARIFICATION]
**Project Type**: [single/web/mobile - determines source structure]  
**Performance Goals**: [domain-specific, e.g., 1000 req/s, 10k lines/sec, 60 fps or NEEDS CLARIFICATION]  
**Constraints**: [domain-specific, e.g., <200ms p95, <100MB memory, offline-capable or NEEDS CLARIFICATION]  
**Scale/Scope**: [domain-specific, e.g., 10k users, 1M LOC, 50 screens or NEEDS CLARIFICATION]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with `.specify/memory/constitution.md`:

- [ ] **Monorepo Architecture**: Does feature respect workspace boundaries (api/web/shared)?
- [ ] **Database-First**: Is data model designed in Supabase migrations before code?
- [ ] **Queue-Based Processing**: Are long-running operations queued via BullMQ?
- [ ] **Test-Driven Development**: Are tests written before implementation?
- [ ] **Type Safety**: Are types shared across stack with runtime validation?
- [ ] **Feature Specifications**: Is spec complete with user stories, data model, API contracts?

**Violations** (if any):

| Principle Violated | Justification | Simpler Alternative Rejected |
|--------------------|---------------|------------------------------|
| [e.g., Database-First] | [why needed] | [why alternative insufficient] |

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
