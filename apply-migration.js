const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://xygwtmddeoqjcnvmzwki.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5Z3d0bWRkZW9xamNudm16d2tpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDE5NjMwNiwiZXhwIjoyMDc1NzcyMzA2fQ.Yx9KGKJmNhfDUqg95KdULsHPniMkA35iYTyXspylqWY';

async function runMigration() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Read the migration file
  const migrationPath = path.join(__dirname, 'supabase/migrations/20251118120000_create_user_preferences.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('Applying migration: 20251118120000_create_user_preferences.sql');
  console.log('Migration SQL length:', sql.length, 'characters');

  try {
    // Execute the SQL using the Supabase client's REST API
    const { data, error } = await supabase.rpc('exec', { sql });

    if (error) {
      console.error('Error applying migration:', error);
      process.exit(1);
    }

    console.log('Migration applied successfully!');

    // Verify the table exists
    console.log('\nVerifying table creation...');
    const { data: tableCheck, error: checkError } = await supabase
      .from('user_preferences')
      .select('*')
      .limit(0);

    if (checkError) {
      console.error('Table verification failed:', checkError);
      process.exit(1);
    }

    console.log('✓ Table user_preferences exists and is accessible');

    // Check table schema
    const { data: schemaData, error: schemaError } = await supabase
      .rpc('exec', {
        sql: `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_name = 'user_preferences'
          ORDER BY ordinal_position;
        `
      });

    if (!schemaError && schemaData) {
      console.log('\nTable schema:');
      console.log(schemaData);
    }

  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

runMigration();
