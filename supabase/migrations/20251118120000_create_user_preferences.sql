-- Create user_preferences table for storing user preferences
-- Including theme selection, sidebar state, and default view mode

CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  theme VARCHAR(20) NOT NULL DEFAULT 'system',
  sidebar_collapsed BOOLEAN NOT NULL DEFAULT false,
  default_view VARCHAR(20) NOT NULL DEFAULT 'cards',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Create trigger to update updated_at on row modifications
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER trigger_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_preferences_updated_at();

-- Add RLS policies if auth.users exists, otherwise skip
DO $$
BEGIN
  -- Check if auth.users table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    -- Enable RLS
    ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Enable select for own preferences" ON user_preferences;
    DROP POLICY IF EXISTS "Enable update for own preferences" ON user_preferences;
    DROP POLICY IF EXISTS "Enable insert for own preferences" ON user_preferences;

    -- Policy: Users can select their own preferences
    CREATE POLICY "Enable select for own preferences"
      ON user_preferences
      FOR SELECT
      USING (auth.uid() = user_id);

    -- Policy: Users can update their own preferences
    CREATE POLICY "Enable update for own preferences"
      ON user_preferences
      FOR UPDATE
      USING (auth.uid() = user_id);

    -- Policy: Users can insert their own preferences
    CREATE POLICY "Enable insert for own preferences"
      ON user_preferences
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON user_preferences TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
