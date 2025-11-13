import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { QueueModule } from './queue/queue.module';
import { SupabaseModule } from './supabase/supabase.module';
import { HealthController } from './health/health.controller';
import { JobsModule } from './jobs/jobs.module';
import { ScraperModule } from './scraper/scraper.module';
import { WorkersModule } from './workers/workers.module';
import { SettingsModule } from './settings/settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(), // Enable cron jobs for ArchivalService and CleanupService
    SupabaseModule,
    QueueModule,
    SettingsModule,
    JobsModule,
    ScraperModule,
    WorkersModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
