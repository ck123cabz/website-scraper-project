-- Migration: Add confidence band classification for Layer 3 results
-- Story 2.4-refactored: Layer 3 - LLM Classification with Confidence Scoring
-- Date: 2025-10-16

-- Add confidence band classification for Layer 3 results
ALTER TABLE results
  ADD COLUMN confidence_band VARCHAR(20) DEFAULT NULL
    CHECK (confidence_band IN ('high', 'medium', 'low', 'auto_reject')),
  ADD COLUMN manual_review_required BOOLEAN DEFAULT false;

-- Add index for manual review queue queries (optimize filtering for manual review)
CREATE INDEX idx_results_manual_review
  ON results (manual_review_required, confidence_band)
  WHERE manual_review_required = true;

-- Add comments for clarity
COMMENT ON COLUMN results.confidence_band IS 'Layer 3 confidence classification: high (0.8-1.0), medium (0.5-0.79), low (0.3-0.49), auto_reject (0-0.29)';
COMMENT ON COLUMN results.manual_review_required IS 'True if result requires manual review (medium/low confidence bands)';
