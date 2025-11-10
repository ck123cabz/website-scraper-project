-- Migration: Fix incomplete layer data in classification_settings
-- Story: 3.0 Session 8
-- Date: 2025-10-18
-- Issue: Session 7 testing revealed missing keys and invalid values in layer2_rules and layer3_rules

-- Fix layer2_rules: Add missing required_pages array
UPDATE classification_settings
SET layer2_rules = layer2_rules || jsonb_build_object(
  'required_pages', '["about", "team", "contact"]'::jsonb
)
WHERE NOT (layer2_rules ? 'required_pages');

-- Fix layer3_rules: Correct invalid llm_temperature value (2 → 0.3)
UPDATE classification_settings
SET layer3_rules = jsonb_set(
  layer3_rules,
  '{llm_temperature}',
  '0.3'::jsonb
)
WHERE (layer3_rules->>'llm_temperature')::numeric > 1;

-- Verify layer2_rules has all required keys
DO $$
DECLARE
  settings_record RECORD;
  missing_keys TEXT[];
BEGIN
  FOR settings_record IN SELECT id, layer2_rules FROM classification_settings LOOP
    missing_keys := ARRAY[]::TEXT[];

    IF NOT (settings_record.layer2_rules ? 'blog_freshness_days') THEN
      missing_keys := array_append(missing_keys, 'blog_freshness_days');
    END IF;
    IF NOT (settings_record.layer2_rules ? 'required_pages_count') THEN
      missing_keys := array_append(missing_keys, 'required_pages_count');
    END IF;
    IF NOT (settings_record.layer2_rules ? 'required_pages') THEN
      missing_keys := array_append(missing_keys, 'required_pages');
    END IF;
    IF NOT (settings_record.layer2_rules ? 'min_tech_stack_tools') THEN
      missing_keys := array_append(missing_keys, 'min_tech_stack_tools');
    END IF;
    IF NOT (settings_record.layer2_rules ? 'tech_stack_tools') THEN
      missing_keys := array_append(missing_keys, 'tech_stack_tools');
    END IF;
    IF NOT (settings_record.layer2_rules ? 'min_design_quality_score') THEN
      missing_keys := array_append(missing_keys, 'min_design_quality_score');
    END IF;

    IF array_length(missing_keys, 1) > 0 THEN
      RAISE WARNING 'Settings ID %: layer2_rules missing keys: %', settings_record.id, array_to_string(missing_keys, ', ');
    END IF;
  END LOOP;
END $$;

-- Verify layer3_rules has all required keys
DO $$
DECLARE
  settings_record RECORD;
  missing_keys TEXT[];
BEGIN
  FOR settings_record IN SELECT id, layer3_rules FROM classification_settings LOOP
    missing_keys := ARRAY[]::TEXT[];

    IF NOT (settings_record.layer3_rules ? 'content_marketing_indicators') THEN
      missing_keys := array_append(missing_keys, 'content_marketing_indicators');
    END IF;
    IF NOT (settings_record.layer3_rules ? 'seo_investment_signals') THEN
      missing_keys := array_append(missing_keys, 'seo_investment_signals');
    END IF;
    IF NOT (settings_record.layer3_rules ? 'llm_temperature') THEN
      missing_keys := array_append(missing_keys, 'llm_temperature');
    END IF;
    IF NOT (settings_record.layer3_rules ? 'content_truncation_limit') THEN
      missing_keys := array_append(missing_keys, 'content_truncation_limit');
    END IF;

    IF array_length(missing_keys, 1) > 0 THEN
      RAISE WARNING 'Settings ID %: layer3_rules missing keys: %', settings_record.id, array_to_string(missing_keys, ', ');
    END IF;

    -- Verify llm_temperature is valid (0-1)
    IF (settings_record.layer3_rules->>'llm_temperature')::numeric < 0 OR
       (settings_record.layer3_rules->>'llm_temperature')::numeric > 1 THEN
      RAISE WARNING 'Settings ID %: layer3_rules.llm_temperature (%) is invalid (must be 0-1)',
        settings_record.id,
        settings_record.layer3_rules->>'llm_temperature';
    END IF;
  END LOOP;
END $$;

RAISE NOTICE 'Migration 20251018220652: Fixed incomplete layer data in classification_settings';
