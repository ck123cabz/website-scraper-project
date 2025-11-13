-- Manual Review Queue Table Migration
-- Feature: Complete Settings Implementation (Manual Review System)
-- Date: 2025-11-11
-- Task: T001 - Create manual_review_queue table with indexes

-- ============================================================================
-- 1. Create manual_review_queue table
-- ============================================================================
--
-- NOTE: The url_results table is created in a separate migration
-- (20251112000000_create_url_results_table.sql) to maintain proper
-- migration order and avoid ALTER statements on non-existent tables.
-- ============================================================================

CREATE TABLE IF NOT EXISTS manual_review_queue (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- URL information
  url TEXT NOT NULL,
  job_id UUID NOT NULL,
  url_id UUID NOT NULL,

  -- Foreign key constraints
  CONSTRAINT fk_manual_review_queue_job
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  CONSTRAINT fk_manual_review_queue_url
    FOREIGN KEY (url_id) REFERENCES job_urls(id) ON DELETE CASCADE,

  -- Confidence scoring
  confidence_band TEXT NOT NULL,
  confidence_score NUMERIC(3,2) NOT NULL,
  reasoning TEXT,
  sophistication_signals JSONB,

  -- Score constraint: must be between 0.00 and 1.00
  CONSTRAINT manual_review_queue_score_range
    CHECK (confidence_score >= 0 AND confidence_score <= 1),

  -- Layer evaluation results (stored as JSONB for flexibility)
  layer1_results JSONB NOT NULL,
  layer2_results JSONB NOT NULL,
  layer3_results JSONB NOT NULL,

  -- Queue management
  queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,  -- NULL = active queue item, NOT NULL = reviewed (soft-deleted)
  review_decision TEXT,
  reviewer_notes TEXT,
  is_stale BOOLEAN NOT NULL DEFAULT FALSE,

  -- Decision constraint: must be 'approved' or 'rejected' if set
  CONSTRAINT manual_review_queue_decision_check
    CHECK (review_decision IN ('approved', 'rejected') OR review_decision IS NULL),

  -- Consistency constraint: if reviewed, decision must be set
  CONSTRAINT manual_review_queue_review_consistency
    CHECK (
      (reviewed_at IS NULL AND review_decision IS NULL) OR
      (reviewed_at IS NOT NULL AND review_decision IS NOT NULL)
    ),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. Create indexes for query performance
-- ============================================================================

-- Partial index for active queue queries (WHERE reviewed_at IS NULL)
-- This index dramatically improves performance for the main queue view
CREATE INDEX IF NOT EXISTS idx_manual_review_queue_active
  ON manual_review_queue(reviewed_at)
  WHERE reviewed_at IS NULL;

-- Composite index for stale item queries
-- Used by the stale-flagging cron job and "Stale Items" filter
CREATE INDEX IF NOT EXISTS idx_manual_review_queue_stale
  ON manual_review_queue(is_stale, queued_at)
  WHERE reviewed_at IS NULL;

-- Index for job-based queries (e.g., "show all queue items for this job")
CREATE INDEX IF NOT EXISTS idx_manual_review_queue_job
  ON manual_review_queue(job_id);

-- Index for URL lookups (used when checking if a URL is in the queue)
CREATE INDEX IF NOT EXISTS idx_manual_review_queue_url
  ON manual_review_queue(url_id);

-- Index for confidence band filtering
CREATE INDEX IF NOT EXISTS idx_manual_review_queue_band
  ON manual_review_queue(confidence_band)
  WHERE reviewed_at IS NULL;

-- ============================================================================
-- 4. Add updated_at trigger
-- ============================================================================

-- Create trigger function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_manual_review_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_manual_review_queue_updated_at
  ON manual_review_queue;

CREATE TRIGGER trigger_update_manual_review_queue_updated_at
  BEFORE UPDATE ON manual_review_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_manual_review_queue_updated_at();

-- ============================================================================
-- 5. Enable Row Level Security (RLS) if needed
-- ============================================================================

-- Enable RLS on the manual_review_queue table
-- (Customize policies based on your authentication setup)
ALTER TABLE manual_review_queue ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist (PostgreSQL doesn't support IF NOT EXISTS for policies)
DROP POLICY IF EXISTS "Allow authenticated users to read queue" ON manual_review_queue;
DROP POLICY IF EXISTS "Allow authenticated users to update queue" ON manual_review_queue;
DROP POLICY IF EXISTS "Allow service role full access to queue" ON manual_review_queue;

-- Example policy: Allow authenticated users to read queue items
-- Adjust this based on your authentication and authorization requirements
CREATE POLICY "Allow authenticated users to read queue"
  ON manual_review_queue
  FOR SELECT
  TO authenticated
  USING (true);

-- Example policy: Allow authenticated users to update queue items (for reviews)
CREATE POLICY "Allow authenticated users to update queue"
  ON manual_review_queue
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Example policy: Allow service role full access
CREATE POLICY "Allow service role full access to queue"
  ON manual_review_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 6. Add helpful comments for documentation
-- ============================================================================

COMMENT ON TABLE manual_review_queue IS
  'Queue of URLs requiring manual review based on confidence band actions. Uses soft-delete pattern (reviewed_at) to preserve audit trail.';

COMMENT ON COLUMN manual_review_queue.reviewed_at IS
  'Timestamp when item was reviewed. NULL indicates active queue item. Used for soft-delete pattern.';

COMMENT ON COLUMN manual_review_queue.is_stale IS
  'Flag set by daily cron job when item exceeds auto_review_timeout_days threshold. Used to prioritize old items.';

COMMENT ON COLUMN manual_review_queue.layer1_results IS
  'JSONB containing Layer 1 domain analysis evaluation results (domain_age, tld_type, registrar_reputation, etc.)';

COMMENT ON COLUMN manual_review_queue.layer2_results IS
  'JSONB containing Layer 2 rule-based checks evaluation results (guest_post_red_flags, content_quality)';

COMMENT ON COLUMN manual_review_queue.layer3_results IS
  'JSONB containing Layer 3 LLM sophistication signals evaluation results (design_quality, content_originality, etc.)';

-- ============================================================================
-- 7. Verify migration success
-- ============================================================================

-- Output confirmation message
DO $$
BEGIN
  RAISE NOTICE 'Manual review queue table created successfully';
  RAISE NOTICE 'Indexes created: idx_manual_review_queue_active, idx_manual_review_queue_stale, idx_manual_review_queue_job';
  RAISE NOTICE 'Row Level Security enabled with default policies';
END $$;
