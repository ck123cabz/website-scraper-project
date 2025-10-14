import { createClient } from '@supabase/supabase-js';
import type { Database } from '@website-scraper/shared';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check .env.local');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // No auth for MVP
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Test connection function
export async function testSupabaseConnection() {
  try {
    const { error } = await supabase.from('jobs').select('count').single();

    if (error) {
      console.error('[Supabase] Connection test failed:', error);
      return false;
    }

    console.log('[Supabase] Connection successful');
    return true;
  } catch (error) {
    console.error('[Supabase] Connection test error:', error);
    return false;
  }
}
