<!--
Sync Impact Report
Version: 0.0.0 → 1.0.0
Added sections:
  - All sections (initial creation)
Modified principles: N/A (initial creation)
Removed sections: N/A
Templates requiring updates:
  ✅ plan-template.md - validated
  ✅ spec-template.md - validated
  ✅ tasks-template.md - validated
Follow-up TODOs: None
-->

# Website Scraper Constitution

## Core Principles

### I. Monorepo Architecture

The project MUST maintain a clear monorepo structure with strict workspace boundaries:

- **API workspace** (`apps/api`): NestJS backend providing REST APIs and background job processing
- **Web workspace** (`apps/web`): Next.js frontend for user interface and dashboards
- **Shared workspace** (`packages/shared`): Common types, utilities, and interfaces used by both apps

**Rationale**: Clear workspace boundaries prevent circular dependencies and ensure each workspace can be independently tested, built, and deployed. The shared workspace provides a single source of truth for common contracts.

### II. Database-First Data Modeling

All data structures MUST be defined first in Supabase PostgreSQL migrations before implementing application code:

- Database migrations are the source of truth for schema
- TypeScript types are generated from database schema
- Application code adapts to database contracts, not vice versa
- Row-Level Security (RLS) policies MUST be defined for all user-facing tables

**Rationale**: Database-first ensures schema consistency across all services, enables automatic type generation, and leverages PostgreSQL's built-in data integrity features. RLS provides security at the database level rather than relying solely on application logic.

### III. Queue-Based Job Processing

Background processing MUST use BullMQ queues with proper job lifecycle management:

- All long-running operations run as queued jobs
- Jobs MUST be idempotent and resumable
- Job status tracked in database for user visibility
- Failed jobs MUST have clear error messages and retry strategies

**Rationale**: Queue-based architecture provides scalability, fault tolerance, and clear separation between web requests and background work. Idempotent jobs prevent duplicate work on retries.

### IV. Test-Driven Development for Critical Paths

Tests MUST be written before implementation for:

- New API endpoints (contract tests)
- Data validation and transformation logic (unit tests)
- Database migrations (integration tests)
- User-facing features (end-to-end tests)

**Rationale**: TDD ensures code is designed for testability, prevents regressions, and serves as living documentation. Critical paths require higher test coverage to maintain system reliability.

### V. Type Safety Across the Stack

Type safety MUST be enforced at all boundaries:

- Shared TypeScript types for API contracts
- DTOs with class-validator for runtime validation
- Database-generated types for data access
- Strict TypeScript configuration (`strict: true`)

**Rationale**: Type safety catches errors at compile time, provides better IDE support, and serves as self-documenting code. Runtime validation catches issues from external sources.

### VI. Feature-Complete Specifications

New features MUST have complete specifications before implementation:

- User stories with acceptance criteria
- Data model design
- API contracts
- Success metrics

**Rationale**: Complete specifications prevent scope creep, enable parallel work, and ensure all stakeholders understand the feature before development begins.

## Development Standards

### Code Quality

- **Linting**: ESLint with Prettier for consistent formatting
- **Type Checking**: TypeScript strict mode with no implicit `any`
- **Testing**: Jest for unit/integration tests, Playwright for E2E tests
- **Code Review**: All changes require review before merging

### Documentation

- **README**: Each workspace MUST have a README explaining its purpose and setup
- **API Documentation**: Endpoints documented with examples
- **Migration Comments**: Database migrations include purpose and impact
- **Inline Comments**: Complex business logic requires explanatory comments

### Performance Standards

- **API Response Time**: p95 < 500ms for read operations, < 2s for write operations
- **Background Jobs**: Large batches (>100 URLs) complete within 10 minutes
- **Database Queries**: No N+1 queries, use eager loading where appropriate
- **Frontend Load Time**: Initial page load < 3s on 3G connection

## Deployment & Operations

### Environment Management

- **Local Development**: Docker Compose for Supabase, local Redis
- **Staging**: Railway preview environments for PRs
- **Production**: Railway production environment with monitoring

### Deployment Process

1. All tests MUST pass before merge
2. Railway automatically deploys on merge to `main`
3. Database migrations run automatically on deployment
4. Rollback strategy: revert git commit + rollback migration

### Monitoring & Observability

- **Application Logs**: Structured logging with context (job IDs, user IDs, request IDs)
- **Error Tracking**: Critical errors logged with stack traces
- **Job Monitoring**: BullMQ dashboard for job queue visibility
- **Database Monitoring**: Supabase dashboard for query performance

## Governance

### Constitution Authority

This constitution supersedes all other development practices. When conflicts arise between this constitution and existing code patterns, the constitution takes precedence.

### Amendment Process

1. Proposed changes discussed with rationale
2. Impact assessment on existing code
3. Migration plan for affected code
4. Version increment following semantic versioning:
   - **MAJOR**: Backward-incompatible changes (e.g., removing a principle)
   - **MINOR**: New principles or substantial guidance additions
   - **PATCH**: Clarifications, typo fixes, non-semantic refinements

### Compliance Review

- All pull requests MUST be reviewed against this constitution
- New features checked against Core Principles during planning
- Quarterly constitution review to ensure it reflects current needs

### Complexity Justification

Any violation of principles MUST be justified in writing with:
- What principle is being violated
- Why it's necessary for this specific case
- What simpler alternative was considered and rejected
- Plan to refactor back to compliance (if applicable)

---

**Version**: 1.0.0 | **Ratified**: 2025-11-11 | **Last Amended**: 2025-11-11
