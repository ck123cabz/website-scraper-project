import { Controller, Get } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import Redis from 'ioredis';

@Controller('health')
export class HealthController {
  private readonly startTime: number;
  private redisClient: Redis;

  constructor(private readonly supabaseService: SupabaseService) {
    this.startTime = Date.now();
    this.redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
    });
  }

  @Get()
  async getHealth() {
    const uptime = (Date.now() - this.startTime) / 1000;

    // Check database connection
    let databaseStatus = 'unknown';
    try {
      const { data, error } = await this.supabaseService.getClient()
        .from('jobs')
        .select('id')
        .limit(1);
      databaseStatus = error ? 'error' : 'connected';
    } catch (error) {
      databaseStatus = 'error';
    }

    // Check Redis connection
    let redisStatus = 'unknown';
    try {
      await this.redisClient.ping();
      redisStatus = 'connected';
    } catch (error) {
      redisStatus = 'error';
    }

    const isHealthy = databaseStatus === 'connected' && redisStatus === 'connected';

    return {
      status: isHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime,
      database: databaseStatus,
      redis: redisStatus,
      environment: process.env.NODE_ENV || 'development',
    };
  }
}
