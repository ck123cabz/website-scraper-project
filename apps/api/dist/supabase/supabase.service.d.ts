import { OnModuleInit } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
export declare class SupabaseService implements OnModuleInit {
    private supabase;
    onModuleInit(): void;
    getClient(): SupabaseClient;
    query(table: string): Promise<import("@supabase/postgrest-js").PostgrestQueryBuilder<any, any, any, string, unknown>>;
    insert(table: string, data: unknown): Promise<import("@supabase/supabase-js").PostgrestSingleResponse<any[]>>;
    update(table: string, id: string, data: unknown): Promise<import("@supabase/supabase-js").PostgrestSingleResponse<any[]>>;
    delete(table: string, id: string): Promise<import("@supabase/supabase-js").PostgrestSingleResponse<null>>;
    findById(table: string, id: string): Promise<import("@supabase/supabase-js").PostgrestSingleResponse<any>>;
    findAll(table: string): Promise<import("@supabase/supabase-js").PostgrestSingleResponse<any[]>>;
}
