import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: 'apps/api/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('🔍 Checking if user_preferences table exists...');

// Try to query the table
const { data, error } = await supabase
  .from('user_preferences')
  .select('id')
  .limit(1);

if (error) {
  if (error.message.includes('does not exist') || error.message.includes('schema cache')) {
    console.log('❌ Table does not exist - migration needs to be run');
    console.log('\n📋 MANUAL STEPS TO FIX:');
    console.log('1. Open Supabase Dashboard: ' + supabaseUrl.replace('.supabase.co', '.supabase.co/project/_/sql'));
    console.log('2. Go to SQL Editor');
    console.log('3. Copy and paste the contents of: supabase/migrations/20251118120000_create_user_preferences.sql');
    console.log('4. Click "Run"');
    console.log('\nOR use Supabase CLI after linking your project:');
    console.log('   npx supabase link');
    console.log('   npx supabase db push');
  } else {
    console.error('❌ Unexpected error:', error.message);
  }
  process.exit(1);
} else {
  console.log('✅ Table user_preferences already exists!');
  console.log('✅ Migration not needed - table is accessible');
}
