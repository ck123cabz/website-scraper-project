# website-scraper-project Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-11-11

## Active Technologies
- TypeScript (Node.js v24.6.0+), TypeScript 5.5+ with strict mode + NestJS 10.3, Next.js 14.2, BullMQ 5.0, React Query 5.90, class-validator 0.14, Supabase client 2.39+ (001-batch-processing-refactor)
- PostgreSQL (Supabase) with JSONB columns for Layer 1/2/3 factors, GIN indexes for filtering (001-batch-processing-refactor)

## Project Structure

```text
backend/
frontend/
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript (Node.js 18+): Follow standard conventions

## Recent Changes
- 001-batch-processing-refactor: Batch processing workflow (replaces manual review system)
  - Automated URL processing through Layer 1/2/3 pipeline
  - CSV export with 48 columns for external review in Excel/Google Sheets
  - Job-centric dashboard with real-time progress tracking
  - Factor transparency with expandable result rows
  - 5 concurrent job processing with queue management
  - 50% workflow time reduction (7h → 3.5h)
  - Technologies: TypeScript 5.5+, NestJS 10.3, Next.js 14.2, BullMQ 5.0, React Query 5.90

- 002-manual-review-system: **DEPRECATED** (removed 2025-11-13)
  - Replaced by batch processing workflow above
  - See `specs/002-manual-review-system/DEPRECATED.md` for details

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
- always use supabase mcp to access database