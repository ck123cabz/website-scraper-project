import { Injectable, OnModuleInit } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private supabase!: SupabaseClient;

  onModuleInit() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        'Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables.',
      );
    }

    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log('Supabase client initialized');
  }

  getClient(): SupabaseClient {
    if (!this.supabase) {
      throw new Error('Supabase client not initialized');
    }
    return this.supabase;
  }

  // Helper methods for common database operations
  async query<T>(table: string) {
    return this.supabase.from(table);
  }

  async insert<T>(table: string, data: Partial<T> | Partial<T>[]) {
    return this.supabase.from(table).insert(data).select();
  }

  async update<T>(table: string, id: string, data: Partial<T>) {
    return this.supabase.from(table).update(data).eq('id', id).select();
  }

  async delete(table: string, id: string) {
    return this.supabase.from(table).delete().eq('id', id);
  }

  async findById<T>(table: string, id: string) {
    return this.supabase.from(table).select('*').eq('id', id).single();
  }

  async findAll<T>(table: string) {
    return this.supabase.from(table).select('*');
  }
}
