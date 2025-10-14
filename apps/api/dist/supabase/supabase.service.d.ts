import { OnModuleInit } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
export declare class SupabaseService implements OnModuleInit {
    private supabase;
    onModuleInit(): void;
    getClient(): SupabaseClient;
    query<T>(table: string): Promise<import("@supabase/postgrest-js").PostgrestQueryBuilder<any, any, any, string, unknown>>;
    insert<T>(table: string, data: Partial<T> | Partial<T>[]): Promise<import("@supabase/supabase-js").PostgrestSingleResponse<any[]>>;
    update<T>(table: string, id: string, data: Partial<T>): Promise<import("@supabase/supabase-js").PostgrestSingleResponse<any[]>>;
    delete(table: string, id: string): Promise<import("@supabase/supabase-js").PostgrestSingleResponse<null>>;
    findById<T>(table: string, id: string): Promise<import("@supabase/supabase-js").PostgrestSingleResponse<any>>;
    findAll<T>(table: string): Promise<import("@supabase/supabase-js").PostgrestSingleResponse<any[]>>;
}
