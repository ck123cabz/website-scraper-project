import { SupabaseService } from '../supabase/supabase.service';
export declare class HealthController {
    private readonly supabaseService;
    private readonly startTime;
    private redisClient;
    constructor(supabaseService: SupabaseService);
    getHealth(): Promise<{
        status: string;
        timestamp: string;
        uptime: number;
        database: string;
        redis: string;
        environment: string;
    }>;
}
