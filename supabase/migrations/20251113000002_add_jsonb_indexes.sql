-- Migration: Add GIN indexes on JSONB columns for url_results table
-- Part of batch processing refactor (Phase 1, Task T002)
-- Date: 2025-11-13
--
-- Purpose: Create GIN (Generalized Inverted Index) indexes on JSONB columns
-- to enable efficient querying and filtering of Layer 1/2/3 factor data.
--
-- GIN indexes support:
-- - Containment queries: layer1_factors @> '{"passed": true}'
-- - Existence queries: layer2_factors ? 'publication_score'
-- - Path queries: layer3_factors @> '{"classification": "accepted"}'
--
-- Performance expectations:
-- - Index overhead: ~10% of JSONB column size
-- - Query time: <500ms for JSONB containment queries on 10k+ rows
-- - Build time: <1s for 10k existing rows

-- Create GIN index on layer1_factors
CREATE INDEX IF NOT EXISTS idx_url_results_layer1_factors
  ON url_results USING GIN (layer1_factors);

-- Create GIN index on layer2_factors
CREATE INDEX IF NOT EXISTS idx_url_results_layer2_factors
  ON url_results USING GIN (layer2_factors);

-- Create GIN index on layer3_factors
CREATE INDEX IF NOT EXISTS idx_url_results_layer3_factors
  ON url_results USING GIN (layer3_factors);

-- Add comments for documentation
COMMENT ON INDEX idx_url_results_layer1_factors IS
  'GIN index for efficient JSONB queries on Layer 1 factors (e.g., filtering by tld_type, domain_classification, passed status)';

COMMENT ON INDEX idx_url_results_layer2_factors IS
  'GIN index for efficient JSONB queries on Layer 2 factors (e.g., filtering by publication_score, keywords_found, content_signals)';

COMMENT ON INDEX idx_url_results_layer3_factors IS
  'GIN index for efficient JSONB queries on Layer 3 factors (e.g., filtering by classification, sophistication_signals)';
