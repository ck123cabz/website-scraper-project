# website-scraper-project Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-11-11

## Active Technologies
- TypeScript (Node.js v24.6.0+), TypeScript 5.5+ with strict mode + NestJS 10.3, Next.js 14.2, BullMQ 5.0, React Query 5.90, class-validator 0.14, Supabase client 2.39+ (001-batch-processing-refactor)
- PostgreSQL (Supabase) with JSONB columns for Layer 1/2/3 factors, GIN indexes for filtering (001-batch-processing-refactor)

- TypeScript (Node.js 18+) + NestJS 10, Next.js 14, BullMQ 4, React Query 5, class-validator 0.14 (001-manual-review-system)
- @slack/webhook 7.0.6 - Slack webhook integration for queue notifications
- @nestjs/schedule 6.0.1 - Scheduled cron jobs (stale queue marking, daily 2 AM)

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
- 001-batch-processing-refactor: Added TypeScript (Node.js v24.6.0+), TypeScript 5.5+ with strict mode + NestJS 10.3, Next.js 14.2, BullMQ 5.0, React Query 5.90, class-validator 0.14, Supabase client 2.39+

- 001-manual-review-system (Phase 9-10): Complete manual review system with end-to-end integration
  - **Phase 7-8**: Manual review module with API endpoints and frontend UI
    - Manual review queue with filtering and pagination
    - Factor breakdown component showing Layer 1/2/3 analysis results
    - Review dialog with approve/reject decisions
    - Dashboard badge showing queue count
    - Notification service with Slack webhook integration (phase 5)
    - Exponential backoff retry logic for notifications (phase 8)
    - Comprehensive error handling for notification failures (phase 8)
  - **Phase 9**: Stale queue management and settings validation
    - StaleQueueMarkerProcessor with daily cron job (2 AM)
    - Auto-review timeout based on configurable settings
    - Activity logging for audit trail
  - **New dependencies added**: @slack/webhook 7.0.6, @nestjs/schedule 6.0.1
  - **Key modules**: ManualReviewModule, NotificationService, StaleQueueMarkerProcessor

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
