# Pending Manual Review System Cleanup

**Status**: DEFERRED - Execute after 2+ weeks of production stability
**Date Created**: 2025-11-16
**Target Execution**: After 2025-11-30 (earliest)
**Phase**: Phase 7, User Story 5 - Remove Manual Review System

## Overview

The manual review system has been deprecated and removed from the codebase as of Phase 7. However, database tables and npm dependencies remain to ensure backward compatibility during the transition period.

**This file tracks pending cleanup tasks that should be executed ONLY after confirming 2+ weeks of production stability.**

---

## Pending Database Migrations (T100-T103)

### ⚠️ IMPORTANT: Pre-Execution Checklist

Before executing these migrations, verify:

1. ✅ Phase 3 (User Story 1 - Automated Batch Processing) has been in production for 2+ weeks
2. ✅ All jobs are processing successfully through Layer 1/2/3 without manual review routing
3. ✅ No active references to `manual_review_queue` table in application logs
4. ✅ No business need to access historical manual review data
5. ✅ Backup of `manual_review_queue_archived` and `manual_review_activity` tables completed

---

### T100: Drop manual_review_queue_archived Table

**File**: `supabase/migrations/20251127000001_drop_manual_review_queue_archived.sql`

```sql
-- Migration: Drop manual_review_queue_archived table
-- Phase 7, User Story 5 - Manual Review System Removal
-- Execute ONLY after 2+ weeks of production stability

-- Verify table exists and is no longer needed
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'manual_review_queue_archived'
  ) THEN
    -- Log before dropping
    RAISE NOTICE 'Dropping manual_review_queue_archived table...';

    -- Drop the table
    DROP TABLE IF EXISTS public.manual_review_queue_archived CASCADE;

    RAISE NOTICE 'manual_review_queue_archived table dropped successfully';
  ELSE
    RAISE NOTICE 'manual_review_queue_archived table does not exist, skipping';
  END IF;
END $$;
```

**Rollback Plan**: Restore from backup if needed

---

### T101: Drop manual_review_activity Table

**File**: `supabase/migrations/20251127000002_drop_manual_review_activity.sql`

```sql
-- Migration: Drop manual_review_activity table
-- Phase 7, User Story 5 - Manual Review System Removal
-- Execute ONLY after 2+ weeks of production stability

-- Verify table exists and is no longer needed
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'manual_review_activity'
  ) THEN
    -- Log before dropping
    RAISE NOTICE 'Dropping manual_review_activity table...';

    -- Drop the table
    DROP TABLE IF EXISTS public.manual_review_activity CASCADE;

    RAISE NOTICE 'manual_review_activity table dropped successfully';
  ELSE
    RAISE NOTICE 'manual_review_activity table does not exist, skipping';
  END IF;
END $$;
```

**Rollback Plan**: Restore from backup if needed

---

### T102: Remove @slack/webhook Dependency

**Action**: Remove `@slack/webhook` from `package.json` if only used for manual review

**Pre-Check**:
```bash
# Search for any remaining Slack webhook usage
grep -r "@slack/webhook" apps/api/src/
grep -r "IncomingWebhook" apps/api/src/
```

**If no other usage found**:
```bash
# Remove from dependencies
npm uninstall @slack/webhook --workspace=@website-scraper/api

# Verify removal
npm list @slack/webhook
```

**If other usage found**: Keep the dependency and document the other use case

---

### T103: Remove @nestjs/schedule Dependency

**Action**: Remove `@nestjs/schedule` from `package.json` if only used for manual review

**Pre-Check**:
```bash
# Check if ScheduleModule is still used for ArchivalService/CleanupService
grep -r "@nestjs/schedule" apps/api/src/
grep -r "ScheduleModule" apps/api/src/
grep -r "@Cron" apps/api/src/
```

**Current Status**: `@nestjs/schedule` is STILL NEEDED for:
- `ArchivalService` (T109) - Daily cron to mark old jobs as archived
- `CleanupService` (T110) - Daily cron to hard-delete archived jobs

**Action**: **DO NOT REMOVE** - This dependency is actively used by Phase 8 services

---

## Code Cleanup (Already Completed)

These items were completed during Phase 7 frontend/backend cleanup:

- ✅ T090: Removed `/manual-review` route (deleted empty directory)
- ✅ T091: Deleted `ManualReviewQueue` component (did not exist)
- ✅ T092: Deleted `ReviewDialog` component (did not exist)
- ✅ T093: Removed manual review badge from navigation (e2e test deleted)
- ✅ T094: Removed manual review UI references from `results-table.tsx`
- ✅ T095: Verified no ManualReviewModule import in `app.module.ts`
- ✅ T096: Verified no NotificationService calls in `queue.service.ts`
- ✅ T097: Verified no StaleQueueMarkerProcessor in `jobs.module.ts`
- ✅ T098: Verified QueueService has no `manual_review_queue` routing
- ✅ T099: Added deprecation comments to:
  - `packages/shared/src/types/manual-review.ts`
  - `packages/shared/src/types/settings.ts`
  - `apps/api/src/settings/dto/manual-review-settings.dto.ts`
  - `apps/api/src/settings/dto/update-settings.dto.ts`

---

## Execution Timeline

1. **2025-11-16**: Phase 7 frontend/backend cleanup completed (T090-T099)
2. **2025-11-30** (earliest): Execute database migrations T100-T101
3. **After T100-T101**: Review and execute T102-T103 dependency cleanup

---

## Post-Execution Verification

After executing T100-T101 migrations:

```bash
# Verify tables are dropped
psql $DATABASE_URL -c "\dt manual_review*"

# Should return no rows
```

After executing T102-T103 dependency cleanup:

```bash
# Verify dependencies removed
npm list @slack/webhook @nestjs/schedule

# Should show "not installed" or only @nestjs/schedule if still needed
```

---

## Contact

For questions about this cleanup:
- See `specs/001-batch-processing-refactor/tasks.md` Phase 7
- See `specs/001-batch-processing-refactor/spec.md` User Story 5
