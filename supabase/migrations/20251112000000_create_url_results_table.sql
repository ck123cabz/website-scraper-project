-- Create url_results table for manual review system
-- This table stores final results for URLs that go through manual review
-- Separate from the automated 'results' table to maintain clean separation of concerns

CREATE TABLE IF NOT EXISTS url_results (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- URL identification
  url_id UUID NOT NULL,
  job_id UUID NOT NULL,
  url TEXT NOT NULL,

  -- Foreign key constraints
  CONSTRAINT fk_url_results_job
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  CONSTRAINT fk_url_results_url
    FOREIGN KEY (url_id) REFERENCES job_urls(id) ON DELETE CASCADE,

  -- Status and review data
  status TEXT NOT NULL,
  confidence_score NUMERIC(3,2),
  confidence_band TEXT,
  reviewer_notes TEXT,

  -- Status constraint
  CONSTRAINT url_results_status_check
    CHECK (status IN ('approved', 'rejected', 'queue_overflow', 'pending', 'processing', 'failed', 'timeout')),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for query performance
CREATE INDEX IF NOT EXISTS idx_url_results_url_id ON url_results(url_id);
CREATE INDEX IF NOT EXISTS idx_url_results_job_id ON url_results(job_id);
CREATE INDEX IF NOT EXISTS idx_url_results_status ON url_results(status);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_url_results_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_url_results_updated_at
  BEFORE UPDATE ON url_results
  FOR EACH ROW
  EXECUTE FUNCTION update_url_results_updated_at();

-- Enable Row Level Security
ALTER TABLE url_results ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow authenticated users to read url_results"
  ON url_results
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert url_results"
  ON url_results
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update url_results"
  ON url_results
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow service role full access to url_results"
  ON url_results
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add helpful comments
COMMENT ON TABLE url_results IS
  'Final results for URLs processed through manual review system. Separate from automated results table for clean separation of concerns.';

COMMENT ON COLUMN url_results.status IS
  'Status of the URL: approved (manually or auto), rejected (manually or auto), queue_overflow (rejected due to queue limit), or processing states.';

COMMENT ON COLUMN url_results.reviewer_notes IS
  'Notes from manual reviewer or system reason (e.g., "Manual review queue full", "Auto-approved based on high confidence").';
