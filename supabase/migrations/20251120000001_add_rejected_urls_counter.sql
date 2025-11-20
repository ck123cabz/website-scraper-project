-- Migration: Add rejected_urls counter support
-- Fix: increment_job_counters function needs to support tracking rejected URLs (Layer 3 "not suitable")
-- Date: 2025-11-20

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- UPDATE INCREMENT FUNCTION: Add rejected_urls counter support
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Drop existing function
DROP FUNCTION IF EXISTS public.increment_job_counters(
  uuid, integer, integer, integer, integer, integer, integer, integer, numeric, numeric, numeric, numeric
);

-- Recreate with rejected_urls support
CREATE OR REPLACE FUNCTION public.increment_job_counters(
  p_job_id UUID,
  p_processed_urls_delta INTEGER DEFAULT 0,
  p_successful_urls_delta INTEGER DEFAULT 0,
  p_rejected_urls_delta INTEGER DEFAULT 0,
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
  rejected_urls INTEGER,
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
    rejected_urls = jobs.rejected_urls + p_rejected_urls_delta,
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
    jobs.rejected_urls,
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
  'Atomically increment job counters (Added rejected_urls_delta support for Layer 3 rejections)';
