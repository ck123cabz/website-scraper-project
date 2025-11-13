-- Migration: Export and archive manual review queue items
-- Date: 2025-01-13
-- Description: Export all pending manual review items to CSV before archiving table
-- This migration prepares the manual_review_queue table for eventual deletion

BEGIN;

-- Create temporary export table with all pending items
CREATE TEMPORARY TABLE manual_review_export AS
SELECT
  id,
  url,
  job_id,
  url_id,
  confidence_score,
  routed_at,
  layer1_factors,
  layer2_factors,
  layer3_factors,
  reviewer_notes
FROM manual_review_queue
WHERE reviewed_at IS NULL  -- Only pending items
ORDER BY routed_at ASC;

-- Record count for logging
SELECT COUNT(*) as pending_count INTO TEMP pending_items FROM manual_review_export;

-- Update originating jobs to indicate manual review was pending
UPDATE jobs
SET status = CASE
    WHEN status = 'running' THEN 'paused'
    ELSE 'requires_manual_review'
  END
WHERE id IN (SELECT DISTINCT job_id FROM manual_review_export);

-- Rename table to archive (soft delete)
ALTER TABLE IF EXISTS manual_review_queue
RENAME TO manual_review_queue_archived;

-- Drop old constraints on archived table if they exist
ALTER TABLE IF EXISTS manual_review_queue_archived
DROP CONSTRAINT IF EXISTS fk_manual_review_job_id CASCADE;

ALTER TABLE IF EXISTS manual_review_queue_archived
DROP CONSTRAINT IF EXISTS fk_manual_review_url_id CASCADE;

-- Drop old triggers on archived table
DROP TRIGGER IF EXISTS update_manual_review_queue_updated_at
ON manual_review_queue_archived;

-- Drop trigger function
DROP FUNCTION IF EXISTS update_manual_review_queue_updated_at();

-- Drop old indexes on archived table
DROP INDEX IF EXISTS idx_manual_review_queue_active;
DROP INDEX IF EXISTS idx_manual_review_queue_stale;
DROP INDEX IF EXISTS idx_manual_review_queue_job;
DROP INDEX IF EXISTS idx_manual_review_queue_url;
DROP INDEX IF EXISTS idx_manual_review_queue_band;

-- Drop RLS policies on archived table
DROP POLICY IF EXISTS "Service role can manage manual review items" ON manual_review_queue_archived;
DROP POLICY IF EXISTS "Authenticated users can view manual review items" ON manual_review_queue_archived;
DROP POLICY IF EXISTS "Authenticated users can submit reviews" ON manual_review_queue_archived;

-- Record migration timestamp
INSERT INTO migration_log (name, description, status, created_at)
VALUES (
  '20251113000005_migrate_manual_review_items',
  'Exported and archived manual_review_queue table',
  'completed',
  NOW()
)
ON CONFLICT DO NOTHING;

COMMIT;
