-- Migration: Add 3-Tier Pipeline Tracking Fields
-- Story 2.5-refactored: 3-Tier Pipeline Orchestration & Real-Time Updates
-- Date: 2025-10-16

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- JOBS TABLE: Add current layer tracking, cost tracking, and Layer 2 counter
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS current_layer INTEGER DEFAULT NULL
    CHECK (current_layer IN (1, 2, 3)),
  ADD COLUMN IF NOT EXISTS scraping_cost DECIMAL(10, 6) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estimated_savings DECIMAL(10, 6) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS layer2_eliminated_count INTEGER DEFAULT 0;

COMMENT ON COLUMN public.jobs.current_layer IS
  'Current processing layer for in-progress URLs (1: domain analysis, 2: homepage scraping, 3: LLM classification)';

COMMENT ON COLUMN public.jobs.scraping_cost IS
  'Total scraping cost (ScrapingBee API charges) in USD';

COMMENT ON COLUMN public.jobs.estimated_savings IS
  'Estimated cost savings from Layer 1 and Layer 2 eliminations (USD)';

COMMENT ON COLUMN public.jobs.layer2_eliminated_count IS
  'Number of URLs eliminated in Layer 2 operational filtering';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- RESULTS TABLE: Add per-layer timing and Layer 2 signals
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALTER TABLE public.results
  ADD COLUMN IF NOT EXISTS layer1_processing_time_ms INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS layer2_processing_time_ms INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS layer3_processing_time_ms INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS layer2_signals JSONB DEFAULT NULL;

COMMENT ON COLUMN public.results.layer1_processing_time_ms IS
  'Processing time for Layer 1 domain analysis (milliseconds)';

COMMENT ON COLUMN public.results.layer2_processing_time_ms IS
  'Processing time for Layer 2 operational filtering (milliseconds)';

COMMENT ON COLUMN public.results.layer3_processing_time_ms IS
  'Processing time for Layer 3 LLM classification (milliseconds)';

COMMENT ON COLUMN public.results.layer2_signals IS
  'Layer 2 operational signals (JSONB): company_page_found, blog_freshness_score, tech_stack, etc.';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- UPDATE INCREMENT FUNCTION: Add Layer 2 counter support
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Drop existing function (will be recreated with new parameters)
-- Current signature from database: uuid, integer, integer, integer, integer, integer, integer, numeric, numeric, numeric
DROP FUNCTION IF EXISTS public.increment_job_counters(
  uuid, integer, integer, integer, integer, integer, integer, numeric, numeric, numeric
);

-- Recreate with Layer 2 support and scraping cost
CREATE OR REPLACE FUNCTION public.increment_job_counters(
  p_job_id UUID,
  p_processed_urls_delta INTEGER DEFAULT 0,
  p_successful_urls_delta INTEGER DEFAULT 0,
  p_failed_urls_delta INTEGER DEFAULT 0,
  p_prefilter_passed_delta INTEGER DEFAULT 0,
  p_prefilter_rejected_delta INTEGER DEFAULT 0,
  p_layer1_eliminated_delta INTEGER DEFAULT 0,
  p_layer2_eliminated_delta INTEGER DEFAULT 0,
  p_total_cost_delta NUMERIC DEFAULT 0,
  p_scraping_cost_delta NUMERIC DEFAULT 0,
  p_gemini_cost_delta NUMERIC DEFAULT 0,
  p_gpt_cost_delta NUMERIC DEFAULT 0
) RETURNS TABLE (
  processed_urls INTEGER,
  successful_urls INTEGER,
  failed_urls INTEGER,
  prefilter_passed_count INTEGER,
  prefilter_rejected_count INTEGER,
  layer1_eliminated_count INTEGER,
  layer2_eliminated_count INTEGER,
  total_cost NUMERIC,
  scraping_cost NUMERIC,
  gemini_cost NUMERIC,
  gpt_cost NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  UPDATE public.jobs
  SET
    processed_urls = jobs.processed_urls + p_processed_urls_delta,
    successful_urls = jobs.successful_urls + p_successful_urls_delta,
    failed_urls = jobs.failed_urls + p_failed_urls_delta,
    prefilter_passed_count = jobs.prefilter_passed_count + p_prefilter_passed_delta,
    prefilter_rejected_count = jobs.prefilter_rejected_count + p_prefilter_rejected_delta,
    layer1_eliminated_count = jobs.layer1_eliminated_count + p_layer1_eliminated_delta,
    layer2_eliminated_count = jobs.layer2_eliminated_count + p_layer2_eliminated_delta,
    total_cost = jobs.total_cost + p_total_cost_delta,
    scraping_cost = jobs.scraping_cost + p_scraping_cost_delta,
    gemini_cost = jobs.gemini_cost + p_gemini_cost_delta,
    gpt_cost = jobs.gpt_cost + p_gpt_cost_delta,
    updated_at = NOW()
  WHERE id = p_job_id
  RETURNING
    jobs.processed_urls,
    jobs.successful_urls,
    jobs.failed_urls,
    jobs.prefilter_passed_count,
    jobs.prefilter_rejected_count,
    jobs.layer1_eliminated_count,
    jobs.layer2_eliminated_count,
    jobs.total_cost,
    jobs.scraping_cost,
    jobs.gemini_cost,
    jobs.gpt_cost;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.increment_job_counters IS
  'Atomically increment job counters (Story 2.5-refactored: Added Layer 2 and scraping cost support)';
