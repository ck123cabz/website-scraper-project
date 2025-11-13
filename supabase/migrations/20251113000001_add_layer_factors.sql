-- Migration: Add JSONB columns for Layer 1/2/3 factors to url_results table
-- Part of batch processing refactor (Phase 1, Task T001)
-- Date: 2025-11-13
--
-- Purpose: Store complete Layer 1/2/3 analysis factors in JSONB columns
-- to enable rich CSV exports and eliminate dependency on manual review queue.
--
-- JSONB columns will store structured factor data:
-- - layer1_factors: Domain analysis results (TLD, domain classification, pattern matches)
-- - layer2_factors: Publication detection results (module scores, keywords, content signals)
-- - layer3_factors: Sophistication analysis results (LLM classification with reasoning)
--
-- Note: NULL values are acceptable for pre-migration data (backwards compatible)

-- Add Layer 1 factors JSONB column
ALTER TABLE url_results
ADD COLUMN IF NOT EXISTS layer1_factors JSONB DEFAULT NULL;

-- Add Layer 2 factors JSONB column
ALTER TABLE url_results
ADD COLUMN IF NOT EXISTS layer2_factors JSONB DEFAULT NULL;

-- Add Layer 3 factors JSONB column
ALTER TABLE url_results
ADD COLUMN IF NOT EXISTS layer3_factors JSONB DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN url_results.layer1_factors IS
  'Layer 1 domain analysis factors (JSONB): tld_type, domain_classification, pattern_matches, target_profile, reasoning, passed';

COMMENT ON COLUMN url_results.layer2_factors IS
  'Layer 2 publication detection factors (JSONB): publication_score, module_scores, keywords_found, ad_networks_detected, content_signals, reasoning, passed';

COMMENT ON COLUMN url_results.layer3_factors IS
  'Layer 3 sophistication analysis factors (JSONB): classification, sophistication_signals, llm_provider, model_version, cost_usd, reasoning, tokens_used, processing_time_ms';
