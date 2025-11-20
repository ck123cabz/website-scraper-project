import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class ArchivalService {
  private readonly logger = new Logger(ArchivalService.name);

  constructor(private supabase: SupabaseService) {}

  /**
   * Auto-archive completed jobs that are 90+ days old
   * Runs daily at 2 AM UTC
   *
   * Archival timeline:
   * - Day 0: Job completes (status='completed', completed_at=NOW())
   * - Day 91: Auto-archived by this job (status='archived', archived_at=NOW())
   * - Day 181: Hard-deleted by CleanupService
   *
   * Manual override:
   * - Users can manually archive jobs anytime via PATCH /jobs/:jobId/archive
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM, { timeZone: 'UTC' })
  async autoArchiveJobs(): Promise<void> {
    this.logger.log('Starting auto-archival of completed jobs...');

    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    try {
      // Query jobs eligible for archival
      const { data: jobsToArchive, error: queryError } = await this.supabase
        .getClient()
        .from('jobs')
        .select('id')
        .eq('status', 'completed')
        .lt('completed_at', ninetyDaysAgo.toISOString())
        .is('archived_at', null); // Only archive if not already archived

      if (queryError) {
        this.logger.error(`Archival query failed: ${queryError.message}`, queryError.stack);
        throw queryError;
      }

      const jobIds = jobsToArchive?.map((j) => j.id) || [];

      if (jobIds.length === 0) {
        this.logger.debug(
          'No jobs eligible for archival (completed > 90 days ago, not already archived)',
        );
        return;
      }

      this.logger.log(
        `Found ${jobIds.length} jobs eligible for archival (completed > 90 days ago)`,
      );

      // Archive jobs in batches to avoid locking entire table
      const batchSize = 100;
      let archivedCount = 0;

      for (let i = 0; i < jobIds.length; i += batchSize) {
        const batch = jobIds.slice(i, i + batchSize);
        const batchStart = i;
        const batchEnd = Math.min(i + batchSize, jobIds.length);

        this.logger.debug(
          `Archiving batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(jobIds.length / batchSize)} (${batchStart}-${batchEnd})`,
        );

        const { error: updateError } = await this.supabase
          .getClient()
          .from('jobs')
          .update({
            status: 'archived',
            archived_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .in('id', batch);

        if (updateError) {
          this.logger.error(`Batch archival failed: ${updateError.message}`, updateError.stack);
          throw updateError;
        }

        archivedCount += batch.length;
      }

      this.logger.log(`Successfully archived ${archivedCount} completed jobs (90+ days old)`);
      this.logger.log(
        `These jobs will be hard-deleted after an additional 90 days by CleanupService`,
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Archival cron job failed: ${errorMessage}`, errorStack);
      // Don't re-throw - cron should continue running
    }
  }

  /**
   * Get count of jobs eligible for archival (admin reporting)
   * @returns Number of completed jobs 90+ days old
   */
  async getArchivalEligibleCount(): Promise<number> {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const { count, error } = await this.supabase
      .getClient()
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed')
      .lt('completed_at', ninetyDaysAgo.toISOString())
      .is('archived_at', null);

    if (error) {
      this.logger.error(`Query failed: ${error.message}`);
      throw error;
    }

    return count || 0;
  }

  /**
   * Manually archive a specific job (user action or admin override)
   * @param jobId Job UUID to archive
   */
  async manualArchive(jobId: string): Promise<void> {
    this.logger.log(`Manually archiving job: ${jobId}`);

    const { data, error } = await this.supabase
      .getClient()
      .from('jobs')
      .update({
        status: 'archived',
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)
      .select();

    if (error) {
      this.logger.error(`Manual archive failed: ${error.message}`);
      throw error;
    }

    if (!data || data.length === 0) {
      this.logger.warn(`Job not found for archival: ${jobId}`);
      throw new Error(`Job ${jobId} not found`);
    }

    this.logger.log(`Job archived successfully: ${jobId}`);
  }
}
