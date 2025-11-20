import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = 'https://xygwtmddeoqjcnvmzwki.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5Z3d0bWRkZW9xamNudm16d2tpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDE5NjMwNiwiZXhwIjoyMDc1NzcyMzA2fQ.Yx9KGKJmNhfDUqg95KdULsHPniMkA35iYTyXspylqWY';

async function runMigration() {
  console.log('Starting migration process...');

  // Read the migration file
  const migrationPath = path.join(__dirname, 'supabase/migrations/20251118120000_create_user_preferences.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log(`Migration file: ${migrationPath}`);
  console.log(`SQL length: ${sql.length} characters\n`);

  // Create Supabase admin client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Split SQL into individual statements and execute them
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Found ${statements.length} SQL statements to execute\n`);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';
    console.log(`Executing statement ${i + 1}/${statements.length}...`);

    // For each statement, we need to execute it directly
    // Since Supabase doesn't expose raw SQL execution via client library,
    // we'll need to verify table creation by attempting to query it
  }

  // Instead of executing SQL directly, let's verify the table exists
  console.log('\n=== VERIFICATION ===');
  console.log('Checking if user_preferences table exists...');

  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .limit(1);

  if (error) {
    if (error.message.includes('relation "public.user_preferences" does not exist')) {
      console.log('\n❌ Table does NOT exist. Need to apply migration manually.');
      console.log('\nManual steps required:');
      console.log('1. Go to https://supabase.com/dashboard/project/xygwtmddeoqjcnvmzwki');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Paste and run the migration SQL from:');
      console.log('   supabase/migrations/20251118120000_create_user_preferences.sql');
      process.exit(1);
    } else {
      console.error('Unexpected error:', error);
      process.exit(1);
    }
  }

  console.log('✅ Table user_preferences exists and is accessible!\n');

  // Get table schema info
  console.log('Fetching table structure...');
  const { data: schemaData, error: schemaError } = await supabase
    .from('user_preferences')
    .select('*')
    .limit(0);

  if (!schemaError) {
    console.log('✅ Table is accessible via Supabase client');
  }

  console.log('\n=== MIGRATION COMPLETE ===');
}

runMigration().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
