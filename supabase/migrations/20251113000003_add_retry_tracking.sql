-- Migration: Add retry tracking columns to url_results table
-- Part of batch processing refactor (Phase 1, Task T003)
-- Date: 2025-11-13
--
-- Purpose: Track retry attempts and errors for URL processing failures
-- to support exponential backoff retry strategy (max 3 attempts).
--
-- Columns added:
-- - retry_count: Number of retry attempts (0 for first attempt, max 3)
-- - last_error: Last error message for debugging (NULL on success)
-- - last_retry_at: Timestamp of last retry attempt (NULL if never retried)
--
-- Retry strategy:
-- - Attempt 1: Immediate
-- - Attempt 2: After 30 seconds
-- - Attempt 3: After 2 minutes
-- - Attempt 4 (final): After 5 minutes
-- - After 3 retries: Permanent failure (final_decision = 'error')

-- Add retry count column (0 = first attempt, max 3 retries = 4 total attempts)
ALTER TABLE url_results
ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0;

-- Add last error message column
ALTER TABLE url_results
ADD COLUMN IF NOT EXISTS last_error TEXT DEFAULT NULL;

-- Add last retry timestamp column
ALTER TABLE url_results
ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMPTZ DEFAULT NULL;

-- Add check constraint for retry_count (0-3 retries allowed)
-- Drop existing constraint if it exists to avoid conflicts
ALTER TABLE url_results
DROP CONSTRAINT IF EXISTS url_results_retry_count_check;

ALTER TABLE url_results
ADD CONSTRAINT url_results_retry_count_check
  CHECK (retry_count >= 0 AND retry_count <= 3);

-- Add comments for documentation
COMMENT ON COLUMN url_results.retry_count IS
  'Number of retry attempts (0-3). 0 = first attempt, 3 = maximum retries reached';

COMMENT ON COLUMN url_results.last_error IS
  'Last error message if retry was needed. NULL on success. Used for debugging transient vs permanent failures.';

COMMENT ON COLUMN url_results.last_retry_at IS
  'Timestamp of last retry attempt. NULL if never retried. Used to calculate exponential backoff delay.';
