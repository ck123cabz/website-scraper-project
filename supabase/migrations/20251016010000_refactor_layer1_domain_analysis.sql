-- Migration: Refactor to Layer 1 Domain Analysis Schema
-- Story 2.3 Refactored: Layer 1 Domain Analysis (Pre-Scrape)
-- Date: 2025-10-16
--
-- Changes:
-- 1. Add elimination_layer column to results table (replaces prefilter_passed)
-- 2. Add layer1_reasoning column to results table (replaces prefilter_reasoning)
-- 3. Add layer1_eliminated_count to jobs table
-- 4. Keep prefilter columns for backward compatibility during transition

-- Update results table
ALTER TABLE results
ADD COLUMN IF NOT EXISTS elimination_layer VARCHAR(10) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS layer1_reasoning TEXT DEFAULT NULL;

-- Comment on new columns
COMMENT ON COLUMN results.elimination_layer IS 'Layer at which URL was eliminated: layer1, layer2, layer3, or null if passed all layers';
COMMENT ON COLUMN results.layer1_reasoning IS 'Detailed reasoning for Layer 1 elimination decision';

-- Update jobs table
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS layer1_eliminated_count INTEGER DEFAULT 0;

-- Comment on new column
COMMENT ON COLUMN jobs.layer1_eliminated_count IS 'Number of URLs eliminated in Layer 1 analysis';

-- Create index on elimination_layer for efficient filtering
CREATE INDEX IF NOT EXISTS idx_results_elimination_layer
ON results(job_id, elimination_layer);

-- Update RLS policies if results table has them
-- Policy to allow reading elimination_layer and layer1_reasoning for authenticated users
ALTER POLICY "Users can view their own job results"
ON results
USING (
  EXISTS (
    SELECT 1 FROM jobs
    WHERE jobs.id = results.job_id
    AND jobs.user_id = auth.uid()
  )
);

-- Verify the table structure
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'results' AND (column_name LIKE 'layer1%' OR column_name = 'elimination_layer');
