import { Module } from '@nestjs/common';
import { QueueModule } from './queue/queue.module';
import { SupabaseModule } from './supabase/supabase.module';
import { HealthController } from './health/health.controller';
import { JobsModule } from './jobs/jobs.module';

@Module({
  imports: [SupabaseModule, QueueModule, JobsModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
