-- Migration: Add filtering and analytics indexes to url_results table
-- Part of batch processing refactor (Phase 1, Code Review Fix)
-- Date: 2025-11-13
--
-- Purpose: Create B-tree indexes to support common filtering and analytics queries
--
-- Indexes added:
-- 1. idx_url_results_eliminated_at_layer - Filter by elimination layer (pipeline analytics)
-- 2. idx_url_results_status - Filter by status (already exists in base table, adding for idempotency)
-- 3. idx_url_results_confidence_score - Sort/filter by confidence scores
-- 4. idx_url_results_job_id_updated_at - Composite index for job result pagination
--
-- Performance expectations:
-- - Index overhead: ~5% of column data size (B-tree indexes)
-- - Query time: <100ms for filtered queries on 100k+ rows
-- - Build time: <2s for 100k existing rows

-- Index for filtering by elimination layer
-- Use case: "Show me all URLs eliminated in Layer 1" or pipeline funnel analytics
CREATE INDEX IF NOT EXISTS idx_url_results_eliminated_at_layer
  ON url_results (eliminated_at_layer)
  WHERE eliminated_at_layer IS NOT NULL;

-- Index for filtering by status
-- Use case: "Show me all approved URLs" or "Show me all failed URLs"
-- Note: This index already exists in base migration but adding for idempotency
CREATE INDEX IF NOT EXISTS idx_url_results_status
  ON url_results (status);

-- Index for filtering/sorting by confidence score
-- Use case: "Show me URLs with confidence > 0.8" or "Sort by confidence DESC"
CREATE INDEX IF NOT EXISTS idx_url_results_confidence_score
  ON url_results (confidence_score DESC NULLS LAST)
  WHERE confidence_score IS NOT NULL;

-- Composite index for paginated job results sorted by update time
-- Use case: "Get latest processed results for job X" (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_url_results_job_id_updated_at
  ON url_results (job_id, updated_at DESC);

-- Add comments for documentation
COMMENT ON INDEX idx_url_results_eliminated_at_layer IS
  'Partial index for pipeline analytics: filter URLs by which layer eliminated them. Only indexes non-NULL values to minimize overhead.';

COMMENT ON INDEX idx_url_results_status IS
  'Index for filtering URLs by status (approved, rejected, pending, etc.). Supports WHERE status = $1 queries.';

COMMENT ON INDEX idx_url_results_confidence_score IS
  'Index for filtering and sorting by confidence score (DESC order, NULLs last). Supports confidence band analytics and manual review prioritization.';

COMMENT ON INDEX idx_url_results_job_id_updated_at IS
  'Composite index for efficient job result pagination sorted by update time (most recent first). Supports "Get latest results for job X" queries.';
