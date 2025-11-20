import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(private supabase: SupabaseService) {}

  /**
   * Hard-delete archived jobs that are 180+ days old
   * Runs daily at 2 AM UTC (after ArchivalService)
   *
   * Cleanup timeline:
   * - Day 0: Job completes
   * - Day 91: Archived (status='archived', archived_at=NOW())
   * - Day 181: Hard-deleted by this job
   *
   * Cascading deletes:
   * - jobs.id has CASCADE delete on url_results.job_id
   * - All URL results deleted with job
   * - activity_logs may be kept for audit trail (optional)
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM, { timeZone: 'UTC' })
  async hardDeleteOldArchives(): Promise<void> {
    this.logger.log('Starting cleanup of archived jobs...');

    const oneEightyDaysAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);

    try {
      // First, query jobs eligible for deletion
      const { data: jobsToDelete, error: queryError } = await this.supabase
        .getClient()
        .from('jobs')
        .select('id')
        .eq('status', 'archived')
        .lt('archived_at', oneEightyDaysAgo.toISOString());

      if (queryError) {
        this.logger.error(`Cleanup query failed: ${queryError.message}`, queryError.stack);
        throw queryError;
      }

      const jobIds = jobsToDelete?.map((j) => j.id) || [];

      if (jobIds.length === 0) {
        this.logger.debug('No jobs eligible for cleanup (older than 180 days)');
        return;
      }

      this.logger.log(`Found ${jobIds.length} jobs eligible for cleanup (archived > 180 days)`);

      // Hard delete jobs in batches to avoid locking entire table
      const batchSize = 100;
      let deletedCount = 0;

      for (let i = 0; i < jobIds.length; i += batchSize) {
        const batch = jobIds.slice(i, i + batchSize);
        const batchStart = i;
        const batchEnd = Math.min(i + batchSize, jobIds.length);

        this.logger.debug(
          `Deleting batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(jobIds.length / batchSize)} (${batchStart}-${batchEnd})`,
        );

        const { error: deleteError } = await this.supabase
          .getClient()
          .from('jobs')
          .delete()
          .in('id', batch);

        if (deleteError) {
          this.logger.error(`Batch delete failed: ${deleteError.message}`, deleteError.stack);
          throw deleteError;
        }

        deletedCount += batch.length;
      }

      this.logger.log(`Successfully hard-deleted ${deletedCount} archived jobs (180+ days old)`);
      this.logger.log(`Associated url_results and related data deleted via CASCADE`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Cleanup cron job failed: ${errorMessage}`, errorStack);
      // Don't re-throw - cron should continue running
    }
  }

  /**
   * Get count of jobs eligible for deletion (admin reporting)
   * @returns Number of archived jobs 180+ days old
   */
  async getCleanupEligibleCount(): Promise<number> {
    const oneEightyDaysAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);

    const { count, error } = await this.supabase
      .getClient()
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'archived')
      .lt('archived_at', oneEightyDaysAgo.toISOString());

    if (error) {
      this.logger.error(`Query failed: ${error.message}`);
      throw error;
    }

    return count || 0;
  }

  /**
   * Manually delete a specific job (admin override)
   * @param jobId Job UUID to delete
   */
  async manualDelete(jobId: string): Promise<void> {
    this.logger.warn(`Manually deleting job: ${jobId}`);

    const { error } = await this.supabase.getClient().from('jobs').delete().eq('id', jobId);

    if (error) {
      this.logger.error(`Manual delete failed: ${error.message}`);
      throw error;
    }

    this.logger.warn(`Job hard-deleted: ${jobId}`);
  }
}
