-- Migration: Add core tracking columns to url_results table
-- Part of batch processing refactor (Phase 1, Code Review Fix)
-- Date: 2025-11-13
--
-- Purpose: Add missing core columns for tracking processing lifecycle,
-- performance metrics, and cost tracking across all layers.
--
-- Columns added:
-- - eliminated_at_layer: Which layer eliminated this URL (layer1/layer2/layer3/passed_all)
-- - processing_time_ms: Total processing time across all layers (milliseconds)
-- - total_cost: Total cost for processing this URL (USD, 8 decimal precision)
--
-- These columns are essential for:
-- 1. Performance analytics (processing_time_ms)
-- 2. Cost attribution and billing (total_cost)
-- 3. Pipeline analytics - understanding elimination funnel (eliminated_at_layer)

-- Add eliminated_at_layer column with CHECK constraint
ALTER TABLE url_results
ADD COLUMN IF NOT EXISTS eliminated_at_layer TEXT DEFAULT NULL
  CHECK (eliminated_at_layer IN ('layer1', 'layer2', 'layer3', 'passed_all'));

-- Add processing_time_ms column for performance tracking
ALTER TABLE url_results
ADD COLUMN IF NOT EXISTS processing_time_ms INTEGER DEFAULT 0;

-- Add total_cost column for cost attribution (8 decimal places for precision)
ALTER TABLE url_results
ADD COLUMN IF NOT EXISTS total_cost NUMERIC(10,8) DEFAULT 0.00000000;

-- Add comments for documentation
COMMENT ON COLUMN url_results.eliminated_at_layer IS
  'Which layer eliminated this URL: layer1 (domain analysis), layer2 (publication detection), layer3 (sophistication analysis), or passed_all (approved through all layers)';

COMMENT ON COLUMN url_results.processing_time_ms IS
  'Total processing time across all layers in milliseconds. Sum of layer1 + layer2 + layer3 processing times.';

COMMENT ON COLUMN url_results.total_cost IS
  'Total cost for processing this URL in USD. Sum of scraping costs + LLM API costs. 8 decimal precision for micro-cent accuracy.';
