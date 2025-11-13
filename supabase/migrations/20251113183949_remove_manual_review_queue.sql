-- Migration: Remove manual review queue system
-- Date: 2025-01-13
-- Description: Drop manual_review_queue table and related database objects
-- SAFETY: This migration should only be run 2+ weeks after Phase 3 production deployment
-- WARNING: DO NOT RUN THIS MIGRATION YET - Wait for production safety buffer

BEGIN;

-- Drop triggers first (dependencies)
DROP TRIGGER IF EXISTS trigger_update_manual_review_queue_updated_at ON manual_review_queue;

-- Drop trigger function
DROP FUNCTION IF EXISTS update_manual_review_queue_updated_at();

-- Drop indexes
DROP INDEX IF EXISTS idx_manual_review_queue_active;
DROP INDEX IF EXISTS idx_manual_review_queue_stale;
DROP INDEX IF EXISTS idx_manual_review_queue_job;
DROP INDEX IF EXISTS idx_manual_review_queue_url;
DROP INDEX IF EXISTS idx_manual_review_queue_band;

-- Drop RLS policies
DROP POLICY IF EXISTS "Allow service role full access to queue" ON manual_review_queue;
DROP POLICY IF EXISTS "Allow authenticated users to read queue" ON manual_review_queue;
DROP POLICY IF EXISTS "Allow authenticated users to update queue" ON manual_review_queue;

-- Drop the table
DROP TABLE IF EXISTS manual_review_queue;

-- Optional: Drop activity log table if it was ONLY used for manual review
-- (Check first: SELECT COUNT(*) FROM activity_logs WHERE entity_type = 'manual_review_item')
-- Uncomment below ONLY if you've verified activity_logs was exclusively for manual review:
-- DROP TABLE IF EXISTS activity_logs;

COMMIT;
