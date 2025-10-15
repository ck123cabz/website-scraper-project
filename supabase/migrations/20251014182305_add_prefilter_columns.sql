-- Add pre-filter columns to results table
ALTER TABLE results
  ADD COLUMN IF NOT EXISTS prefilter_passed BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS prefilter_reasoning TEXT DEFAULT NULL;

-- Add pre-filter metrics to jobs table
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS prefilter_rejected_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prefilter_passed_count INTEGER DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN results.prefilter_passed IS 'Whether URL passed the pre-filter check (NULL if not yet processed)';
COMMENT ON COLUMN results.prefilter_reasoning IS 'Reasoning for pre-filter decision (e.g., "PASS - Sending to LLM" or "REJECT - Blog platform")';
COMMENT ON COLUMN jobs.prefilter_rejected_count IS 'Count of URLs rejected by pre-filter';
COMMENT ON COLUMN jobs.prefilter_passed_count IS 'Count of URLs that passed pre-filter';
