-- Update create_job_with_urls RPC function to use job_urls table
-- This fixes the architectural mismatch where worker expects urlId but RPC doesn't provide it

-- Drop the old function first since we're changing the return type
DROP FUNCTION IF EXISTS create_job_with_urls(TEXT, TEXT[]);

-- Create the updated function
CREATE FUNCTION create_job_with_urls(p_name TEXT, p_urls TEXT[])
RETURNS TABLE(job_id UUID, job_name TEXT, total_urls INT, status TEXT, created_at TIMESTAMPTZ, url_ids UUID[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_id UUID;
  v_job_name TEXT;
  v_total_urls INT;
  v_status TEXT;
  v_created_at TIMESTAMPTZ;
  v_url_ids UUID[];
BEGIN
  -- Insert job record
  INSERT INTO jobs (name, total_urls, status)
  VALUES (p_name, array_length(p_urls, 1), 'pending')
  RETURNING jobs.id, jobs.name, jobs.total_urls, jobs.status, jobs.created_at
  INTO v_job_id, v_job_name, v_total_urls, v_status, v_created_at;

  -- Bulk insert URLs into job_urls table and collect their IDs
  WITH inserted_urls AS (
    INSERT INTO job_urls (job_id, url, status, order_index)
    SELECT
      v_job_id,
      unnest_val,
      'queued',
      row_number() OVER () - 1
    FROM unnest(p_urls) AS unnest_val
    RETURNING id
  )
  SELECT array_agg(id) INTO v_url_ids FROM inserted_urls;

  -- Return job details and url IDs
  RETURN QUERY SELECT v_job_id, v_job_name, v_total_urls, v_status, v_created_at, v_url_ids;
END;
$$;
