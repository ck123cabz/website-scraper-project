-- Add Layer 3 confidence threshold configuration fields
-- Story 2.4-refactored Task 7: Configuration Integration

-- Add confidence threshold fields for Layer 3 classification
ALTER TABLE classification_settings
  ADD COLUMN IF NOT EXISTS confidence_threshold_high DECIMAL(3,2) NOT NULL DEFAULT 0.8 CHECK (confidence_threshold_high >= 0 AND confidence_threshold_high <= 1),
  ADD COLUMN IF NOT EXISTS confidence_threshold_medium DECIMAL(3,2) NOT NULL DEFAULT 0.5 CHECK (confidence_threshold_medium >= 0 AND confidence_threshold_medium <= 1),
  ADD COLUMN IF NOT EXISTS confidence_threshold_low DECIMAL(3,2) NOT NULL DEFAULT 0.3 CHECK (confidence_threshold_low >= 0 AND confidence_threshold_low <= 1);

-- Add check constraint to ensure thresholds are logically ordered (high > medium > low)
ALTER TABLE classification_settings
  ADD CONSTRAINT confidence_thresholds_ordered
    CHECK (confidence_threshold_high > confidence_threshold_medium AND confidence_threshold_medium > confidence_threshold_low);

-- Comment for clarity
COMMENT ON COLUMN classification_settings.confidence_threshold_high IS 'Layer 3 high confidence threshold (0.8-1.0): Auto-approve as suitable';
COMMENT ON COLUMN classification_settings.confidence_threshold_medium IS 'Layer 3 medium confidence threshold (0.5-0.79): Route to manual review';
COMMENT ON COLUMN classification_settings.confidence_threshold_low IS 'Layer 3 low confidence threshold (0.3-0.49): Route to manual review';

-- Update existing row with default thresholds if it exists
UPDATE classification_settings
SET
  confidence_threshold_high = 0.8,
  confidence_threshold_medium = 0.5,
  confidence_threshold_low = 0.3
WHERE confidence_threshold_high IS NULL OR confidence_threshold_medium IS NULL OR confidence_threshold_low IS NULL;
