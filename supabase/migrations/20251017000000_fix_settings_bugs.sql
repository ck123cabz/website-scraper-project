-- Fix Story 3.0 Migration Bugs
-- Issue 1: Add missing tech_stack_tools to layer2_rules
-- Issue 2: Fix confidence bands max calculation (remove gaps)

-- Add tech_stack_tools to layer2_rules if not present
UPDATE classification_settings
SET layer2_rules = layer2_rules || jsonb_build_object(
  'tech_stack_tools', jsonb_build_object(
    'analytics', '["google-analytics", "mixpanel", "amplitude"]'::jsonb,
    'marketing', '["hubspot", "marketo", "activecampaign", "mailchimp"]'::jsonb
  )
)
WHERE NOT (layer2_rules ? 'tech_stack_tools');

-- Fix confidence bands to ensure continuous coverage without gaps
-- Current issue: medium.max = threshold - 0.01 creates gaps
-- Solution: medium.max should equal high.min for continuous coverage
UPDATE classification_settings
SET confidence_bands = jsonb_build_object(
  'high', jsonb_build_object(
    'min', COALESCE((confidence_bands->'high'->>'min')::numeric, 0.8),
    'max', 1.0,
    'action', 'auto_approve'
  ),
  'medium', jsonb_build_object(
    'min', COALESCE((confidence_bands->'medium'->>'min')::numeric, 0.5),
    'max', COALESCE((confidence_bands->'high'->>'min')::numeric, 0.8),  -- Continuous: medium.max = high.min
    'action', 'manual_review'
  ),
  'low', jsonb_build_object(
    'min', COALESCE((confidence_bands->'low'->>'min')::numeric, 0.3),
    'max', COALESCE((confidence_bands->'medium'->>'min')::numeric, 0.5),  -- Continuous: low.max = medium.min
    'action', 'manual_review'
  ),
  'auto_reject', jsonb_build_object(
    'min', 0.0,
    'max', COALESCE((confidence_bands->'low'->>'min')::numeric, 0.3),  -- Continuous: auto_reject.max = low.min
    'action', 'reject'
  )
)
WHERE confidence_bands IS NOT NULL;

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 20251017000000: Fixed tech_stack_tools and confidence_bands bugs';
END $$;
