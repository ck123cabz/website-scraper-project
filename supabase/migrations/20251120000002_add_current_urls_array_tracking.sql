-- Migration: Add current_urls array for tracking multiple concurrent URL processing
-- Fix: Enable UI to show all 10 concurrent URLs being processed simultaneously
-- Date: 2025-11-20

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ADD COLUMN: current_urls JSONB array for tracking concurrent URL processing
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Add column to track array of currently processing URLs
-- Format: [{url: string, layer: 1|2|3, started_at: timestamp}]
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS current_urls JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.jobs.current_urls IS
  'Array of currently processing URLs with layer and start time: [{url, layer, started_at}]';

-- Create GIN index for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_jobs_current_urls
  ON public.jobs USING gin (current_urls);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- RPC FUNCTION: Add URL to current_urls array
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE FUNCTION public.add_current_url(
  p_job_id UUID,
  p_url_entry JSONB
) RETURNS void AS $$
BEGIN
  UPDATE public.jobs
  SET
    current_urls = (
      -- Keep only the last 9 entries, then add the new one (max 10 total)
      SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
      FROM (
        SELECT elem
        FROM jsonb_array_elements(current_urls) AS elem
        ORDER BY (elem->>'started_at')::timestamptz DESC
        LIMIT 9
      ) AS recent
    ) || jsonb_build_array(p_url_entry),
    current_url = p_url_entry->>'url', -- Keep for backward compatibility
    current_layer = (p_url_entry->>'layer')::integer,
    current_url_started_at = (p_url_entry->>'started_at')::timestamptz,
    updated_at = NOW()
  WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.add_current_url IS
  'Add URL to current_urls array (keeps last 10 for display)';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- RPC FUNCTION: Remove URL from current_urls array
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE FUNCTION public.remove_current_url(
  p_job_id UUID,
  p_url TEXT
) RETURNS void AS $$
BEGIN
  UPDATE public.jobs
  SET
    current_urls = (
      SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
      FROM jsonb_array_elements(current_urls) AS elem
      WHERE elem->>'url' != p_url
    ),
    updated_at = NOW()
  WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.remove_current_url IS
  'Remove URL from current_urls array when processing completes';
