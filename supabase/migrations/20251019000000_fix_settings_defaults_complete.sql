-- Migration: Fix incomplete default data in classification_settings table
-- Story 3.0: Ensure all layer2_rules and layer3_rules have complete default data
-- Date: 2025-10-19

-- Fix layer2_rules: Add missing keys for existing records
UPDATE classification_settings
SET layer2_rules = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        COALESCE(layer2_rules, '{}'::jsonb),
        '{tech_stack_tools}',
        COALESCE(
          layer2_rules->'tech_stack_tools',
          '{"analytics": ["google-analytics", "mixpanel", "amplitude"], "marketing": ["hubspot", "marketo", "activecampaign", "mailchimp"]}'::jsonb
        )
      ),
      '{required_pages_count}',
      COALESCE(
        (layer2_rules->>'required_pages_count')::int,
        2
      )::text::jsonb
    ),
    '{min_tech_stack_tools}',
    COALESCE(
      (layer2_rules->>'min_tech_stack_tools')::int,
      2
    )::text::jsonb
  ),
  '{min_design_quality_score}',
  COALESCE(
    (layer2_rules->>'min_design_quality_score')::int,
    6
  )::text::jsonb
)
WHERE layer2_rules IS NULL 
   OR layer2_rules->'tech_stack_tools' IS NULL
   OR layer2_rules->>'required_pages_count' IS NULL
   OR layer2_rules->>'min_tech_stack_tools' IS NULL
   OR layer2_rules->>'min_design_quality_score' IS NULL;

-- Fix layer3_rules: Add missing keys and fix invalid temperature values
UPDATE classification_settings
SET layer3_rules = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        COALESCE(layer3_rules, '{}'::jsonb),
        '{content_marketing_indicators}',
        COALESCE(
          layer3_rules->'content_marketing_indicators',
          '[
            "Explicit \"Write for Us\" or \"Guest Post Guidelines\" pages",
            "Author bylines with external contributors",
            "Contributor sections or editorial team listings",
            "Writing opportunities or submission guidelines",
            "Clear evidence of accepting external content"
          ]'::jsonb
        )
      ),
      '{seo_investment_signals}',
      COALESCE(
        layer3_rules->'seo_investment_signals',
        '["schema_markup", "open_graph", "structured_data"]'::jsonb
      )
    ),
    '{content_truncation_limit}',
    COALESCE(
      (layer3_rules->>'content_truncation_limit')::int,
      10000
    )::text::jsonb
  ),
  '{llm_temperature}',
  CASE
    -- Fix invalid temperature values (> 1.0 or < 0.0) to default 0.3
    WHEN (layer3_rules->>'llm_temperature')::numeric > 1.0 
      OR (layer3_rules->>'llm_temperature')::numeric < 0.0 
      OR layer3_rules->>'llm_temperature' IS NULL
    THEN '0.3'::jsonb
    ELSE (layer3_rules->>'llm_temperature')::jsonb
  END
)
WHERE layer3_rules IS NULL
   OR layer3_rules->'content_marketing_indicators' IS NULL
   OR layer3_rules->'seo_investment_signals' IS NULL
   OR layer3_rules->>'content_truncation_limit' IS NULL
   OR (layer3_rules->>'llm_temperature')::numeric > 1.0
   OR (layer3_rules->>'llm_temperature')::numeric < 0.0
   OR layer3_rules->>'llm_temperature' IS NULL;

-- Log the migration
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Migration completed: Fixed incomplete layer data in % classification_settings records', updated_count;
END $$;

