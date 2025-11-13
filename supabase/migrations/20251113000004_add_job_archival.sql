-- Migration: Add archived_at column and update status enum for jobs table
-- Part of batch processing refactor (Phase 1, Task T004)
-- Date: 2025-11-13
--
-- Purpose: Add archival support to jobs table for soft-deletion and cleanup
--
-- Changes:
-- - Add archived_at column for tracking when job was archived
-- - Update status enum to include 'archived' state
-- - Add index for efficient archival queries
--
-- Lifecycle:
-- 1. Jobs completed > 90 days ago: Auto-archive (status='archived', archived_at=NOW())
-- 2. Archived jobs > 90 days old: Hard delete (CASCADE deletes url_results)
-- 3. Total retention: 180 days (90 days active + 90 days archived)

-- Add archived_at timestamp column
ALTER TABLE jobs
ADD COLUMN archived_at TIMESTAMPTZ DEFAULT NULL;

-- Drop existing status constraint to update enum values
ALTER TABLE jobs
DROP CONSTRAINT IF EXISTS jobs_status_check;

-- Add updated status constraint with 'archived' state
ALTER TABLE jobs
ADD CONSTRAINT jobs_status_check
  CHECK (status IN ('queued', 'running', 'paused', 'completed', 'failed', 'archived'));

-- Create partial index for archived jobs (only indexes non-NULL archived_at)
-- This makes queries for archived jobs efficient while minimizing index size
CREATE INDEX IF NOT EXISTS idx_jobs_archived_at
  ON jobs (archived_at)
  WHERE archived_at IS NOT NULL;

-- Create index for finding jobs eligible for auto-archive
-- (completed jobs older than 90 days that aren't already archived)
CREATE INDEX IF NOT EXISTS idx_jobs_completed_at
  ON jobs (completed_at)
  WHERE completed_at IS NOT NULL AND archived_at IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN jobs.archived_at IS
  'Timestamp when job was archived (soft-deleted). NULL for active jobs. Jobs auto-archive 90 days after completion. Archived jobs hard-delete after another 90 days.';

COMMENT ON INDEX idx_jobs_archived_at IS
  'Partial index for efficient queries on archived jobs. Only indexes rows where archived_at IS NOT NULL.';

COMMENT ON INDEX idx_jobs_completed_at IS
  'Index for finding jobs eligible for auto-archival (completed > 90 days ago, not yet archived).';
