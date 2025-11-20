const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xygwtmddeoqjcnvmzwki.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5Z3d0bWRkZW9xamNudm16d2tpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDE5NjMwNiwiZXhwIjoyMDc1NzcyMzA2fQ.Yx9KGKJmNhfDUqg95KdULsHPniMkA35iYTyXspylqWY';

async function checkTable() {
  console.log('=== CHECKING user_preferences TABLE ===\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Try to query the table
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .limit(1);

  if (error) {
    if (error.message.includes('relation "public.user_preferences" does not exist')) {
      console.log('❌ Table user_preferences DOES NOT EXIST');
      console.log('\nError details:', error.message);
      console.log('\n=== MANUAL MIGRATION REQUIRED ===');
      console.log('\nThe table needs to be created manually. Here are your options:\n');
      console.log('OPTION 1: Use Supabase Dashboard (Recommended)');
      console.log('  1. Visit: https://supabase.com/dashboard/project/xygwtmddeoqjcnvmzwki/editor');
      console.log('  2. Click on "SQL Editor" in the left sidebar');
      console.log('  3. Click "New query"');
      console.log('  4. Copy the SQL from: supabase/migrations/20251118120000_create_user_preferences.sql');
      console.log('  5. Paste and click "Run"');
      console.log('\nOPTION 2: Use psql (if you have direct database access)');
      console.log('  Get the direct connection string from Supabase dashboard');
      console.log('  Then run: psql <connection_string> -f supabase/migrations/20251118120000_create_user_preferences.sql');
      process.exit(1);
    } else {
      console.log('❌ Unexpected error while checking table:');
      console.error(error);
      process.exit(1);
    }
  }

  console.log('✅ Table user_preferences EXISTS!');
  console.log(`   Found ${data.length} row(s) in the table`);

  if (data.length > 0) {
    console.log('\nSample data:');
    console.log(JSON.stringify(data[0], null, 2));
  }

  // Try inserting a test row to verify full functionality
  console.log('\n=== TESTING TABLE FUNCTIONALITY ===');
  const testUserId = '00000000-0000-0000-0000-000000000000';

  const { error: insertError } = await supabase
    .from('user_preferences')
    .upsert({
      user_id: testUserId,
      theme: 'dark',
      sidebar_collapsed: false,
      default_view: 'table'
    }, {
      onConflict: 'user_id'
    });

  if (insertError) {
    console.log('⚠️  Insert test failed:', insertError.message);
  } else {
    console.log('✅ Insert/upsert works correctly');

    // Clean up test data
    await supabase
      .from('user_preferences')
      .delete()
      .eq('user_id', testUserId);

    console.log('✅ Delete works correctly');
  }

  console.log('\n=== TABLE CHECK COMPLETE ===');
}

checkTable().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
