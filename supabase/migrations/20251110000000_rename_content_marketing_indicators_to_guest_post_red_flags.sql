-- Migration: Rename content_marketing_indicators to guest_post_red_flags
-- Reason: Invert classification logic - these signals should be RED FLAGS (negative indicators)
-- Date: 2025-11-10

-- Rename the field in layer3_rules JSONB column
-- This preserves all existing data while changing the key name
UPDATE classification_settings
SET layer3_rules =
  -- Remove the old key and add the new key with the same value
  layer3_rules - 'content_marketing_indicators' ||
  jsonb_build_object(
    'guest_post_red_flags',
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
  )
WHERE layer3_rules ? 'content_marketing_indicators';

-- Log the migration
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Migration completed: Renamed content_marketing_indicators to guest_post_red_flags in % records', updated_count;
END $$;
