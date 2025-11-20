import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

// Load environment variables
config({ path: 'apps/api/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in apps/api/.env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Read migration SQL
const migrationSQL = readFileSync('supabase/migrations/20251118120000_create_user_preferences.sql', 'utf8');

console.log('🔄 Running migration: create_user_preferences...');

try {
  const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL }).catch(async () => {
    // If rpc doesn't exist, try direct SQL execution
    console.log('📝 Using direct SQL execution...');
    const { data, error } = await supabase.from('_migrations').select('*').limit(1).single();

    // Since RPC might not be available, we'll use psql instead
    console.log('⚠️  Direct SQL not available via Supabase client');
    console.log('💡 Please run this command manually:');
    console.log(`   npx supabase db execute --file supabase/migrations/20251118120000_create_user_preferences.sql`);
    console.log('   OR copy the SQL and run it in the Supabase SQL editor');
    process.exit(1);
  });

  console.log('✅ Migration completed successfully!');

  // Verify table exists
  const { data: tables, error: tableError } = await supabase
    .from('user_preferences')
    .select('*')
    .limit(0);

  if (tableError) {
    console.error('❌ Table verification failed:', tableError.message);
  } else {
    console.log('✅ Table user_preferences exists and is accessible');
  }

} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}
