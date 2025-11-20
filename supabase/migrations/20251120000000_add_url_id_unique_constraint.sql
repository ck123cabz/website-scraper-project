-- Migration: Add unique constraint on url_id to url_results table
-- Date: 2025-11-20
--
-- Purpose: Fix missing unique constraint that prevents upsert operations from working correctly.
-- The worker code uses onConflict: 'url_id' which requires a unique constraint on that column.
--
-- This was missing from the original table creation (20251112000000_create_url_results_table.sql)
-- causing all upsert operations to fail silently, resulting in no data being stored.

-- Add unique constraint on url_id
ALTER TABLE url_results
ADD CONSTRAINT url_results_url_id_unique UNIQUE (url_id);

-- Add comment for documentation
COMMENT ON CONSTRAINT url_results_url_id_unique ON url_results IS
  'Ensures each job_url (url_id) has only one result record. Required for worker upsert operations using onConflict.';
