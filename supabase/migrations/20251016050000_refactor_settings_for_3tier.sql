-- Refactor classification_settings for 3-tier progressive filtering architecture
-- Story 3.0 Task 1: Database Schema Migration
-- Migrates V1 settings structure to layer-specific JSONB fields

-- Step 1: Add new layer-specific JSONB columns
ALTER TABLE classification_settings
  ADD COLUMN IF NOT EXISTS layer1_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS layer2_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS layer3_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS confidence_bands JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS manual_review_settings JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Step 2: Migrate existing V1 data to layer-specific structure
-- V1 prefilter_rules was an array of URL pattern objects
-- Transform into new structured format with tld_filters, industry_keywords, url_pattern_exclusions
UPDATE classification_settings
SET layer1_rules = CASE
  WHEN prefilter_rules IS NOT NULL AND prefilter_rules != '{}'::jsonb AND prefilter_rules != '[]'::jsonb
  THEN jsonb_build_object(
    'tld_filters', jsonb_build_object(
      'commercial', '[".com", ".io", ".co", ".ai"]'::jsonb,
      'non_commercial', '[".org", ".gov", ".edu"]'::jsonb,
      'personal', '[".me", ".blog", ".xyz"]'::jsonb
    ),
    'industry_keywords', '["SaaS", "consulting", "software", "platform", "marketing", "agency"]'::jsonb,
    'url_pattern_exclusions', prefilter_rules,  -- Preserve V1 patterns
    'target_elimination_rate', 0.5
  )
  ELSE jsonb_build_object(
    'tld_filters', jsonb_build_object(
      'commercial', '[".com", ".io", ".co", ".ai"]'::jsonb,
      'non_commercial', '[".org", ".gov", ".edu"]'::jsonb,
      'personal', '[".me", ".blog", ".xyz"]'::jsonb
    ),
    'industry_keywords', '["SaaS", "consulting", "software", "platform", "marketing", "agency"]'::jsonb,
    'url_pattern_exclusions', '[
      {"pattern": "/tag/.*", "enabled": true},
      {"pattern": "/author/.*", "enabled": true},
      {"pattern": "blog\\\\..*\\\\.com", "enabled": true},
      {"pattern": "/category/.*", "enabled": true}
    ]'::jsonb,
    'target_elimination_rate', 0.5
  )
END
WHERE layer1_rules = '{}'::jsonb;

-- Step 3: Migrate classification_indicators and LLM settings → layer3_rules
UPDATE classification_settings
SET layer3_rules = jsonb_build_object(
  'content_marketing_indicators', COALESCE(classification_indicators, '[]'::jsonb),
  'seo_investment_signals', '["schema_markup", "open_graph", "structured_data"]'::jsonb,
  'llm_temperature', COALESCE(llm_temperature, 0.3),
  'content_truncation_limit', COALESCE(content_truncation_limit, 10000)
)
WHERE layer3_rules = '{}'::jsonb;

-- Step 4: Migrate confidence thresholds → confidence_bands
UPDATE classification_settings
SET confidence_bands = jsonb_build_object(
  'high', jsonb_build_object(
    'min', COALESCE(confidence_threshold_high, 0.8),
    'max', 1.0,
    'action', 'auto_approve'
  ),
  'medium', jsonb_build_object(
    'min', COALESCE(confidence_threshold_medium, 0.5),
    'max', COALESCE(confidence_threshold_high, 0.8) - 0.01,
    'action', 'manual_review'
  ),
  'low', jsonb_build_object(
    'min', COALESCE(confidence_threshold_low, 0.3),
    'max', COALESCE(confidence_threshold_medium, 0.5) - 0.01,
    'action', 'manual_review'
  ),
  'auto_reject', jsonb_build_object(
    'min', 0.0,
    'max', COALESCE(confidence_threshold_low, 0.3) - 0.01,
    'action', 'reject'
  )
)
WHERE confidence_bands = '{}'::jsonb;

-- Step 5: Seed default layer2_rules (no V1 equivalent, using defaults from story spec)
UPDATE classification_settings
SET layer2_rules = jsonb_build_object(
  'blog_freshness_days', 90,
  'required_pages_count', 2,
  'min_tech_stack_tools', 2,
  'min_design_quality_score', 6
)
WHERE layer2_rules = '{}'::jsonb;

-- Step 6: Seed default manual_review_settings
UPDATE classification_settings
SET manual_review_settings = jsonb_build_object(
  'queue_size_limit', null,
  'auto_review_timeout_days', null,
  'notifications', jsonb_build_object(
    'email_threshold', 100,
    'dashboard_badge', true,
    'slack_integration', false
  )
)
WHERE manual_review_settings = '{}'::jsonb;

-- Step 7: Add JSONB validation constraints (basic structure checks)
-- Validate layer1_rules has expected top-level keys (at least one must exist, or must be non-empty object)
ALTER TABLE classification_settings
  ADD CONSTRAINT layer1_rules_structure_check
    CHECK (
      layer1_rules ? 'tld_filters' OR
      layer1_rules ? 'industry_keywords' OR
      layer1_rules ? 'url_pattern_exclusions'
    );

-- Validate confidence_bands has all required bands
ALTER TABLE classification_settings
  ADD CONSTRAINT confidence_bands_structure_check
    CHECK (
      confidence_bands ? 'high' AND
      confidence_bands ? 'medium' AND
      confidence_bands ? 'low' AND
      confidence_bands ? 'auto_reject'
    );

-- Step 8: Add comments for documentation
COMMENT ON COLUMN classification_settings.layer1_rules IS 'Layer 1 Domain Analysis rules: TLD filters, industry keywords, URL pattern exclusions, elimination rate';
COMMENT ON COLUMN classification_settings.layer2_rules IS 'Layer 2 Operational Validation rules: blog freshness, required pages, tech stack detection, design quality';
COMMENT ON COLUMN classification_settings.layer3_rules IS 'Layer 3 LLM Classification rules: content indicators, SEO signals, temperature, content truncation';
COMMENT ON COLUMN classification_settings.confidence_bands IS 'Confidence score routing bands: high (0.8-1.0 auto-approve), medium/low (manual review), auto-reject (<0.3)';
COMMENT ON COLUMN classification_settings.manual_review_settings IS 'Manual review queue configuration: size limits, timeouts, notification preferences';

-- Step 9: V1 columns preserved for backward compatibility during transition
-- prefilter_rules, classification_indicators, llm_temperature, content_truncation_limit, confidence_threshold_* kept
-- Can be deprecated in future migration after full verification

-- Verification query (commented out - run manually to verify migration)
-- SELECT
--   id,
--   jsonb_pretty(layer1_rules) as layer1_rules,
--   jsonb_pretty(layer2_rules) as layer2_rules,
--   jsonb_pretty(layer3_rules) as layer3_rules,
--   jsonb_pretty(confidence_bands) as confidence_bands,
--   jsonb_pretty(manual_review_settings) as manual_review_settings
-- FROM classification_settings;
