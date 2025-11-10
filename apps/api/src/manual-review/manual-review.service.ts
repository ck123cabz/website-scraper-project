import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { ManualReviewQueueEntry } from '@website-scraper/shared';
import { PostgrestError } from '@supabase/supabase-js';

/**
 * ManualReviewService (Phase 3: T011)
 *
 * Core service for querying and managing the manual review queue.
 * Provides methods to:
 * - Retrieve active queue items (paginated)
 * - Get queue status and metrics
 * - Fetch individual queue entries with full evaluation details
 * - Process review decisions (approve/reject)
 *
 * @example
 * const service = new ManualReviewService(supabaseService);
 * const queue = await service.getQueue({ page: 1, limit: 20 });
 * const status = await service.getQueueStatus();
 */
@Injectable()
export class ManualReviewService {
  private readonly logger = new Logger(ManualReviewService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Retrieve paginated manual review queue items
   *
   * Returns all active queue items (WHERE reviewed_at IS NULL) with pagination support.
   * Optionally filters by confidence band and is_stale status.
   *
   * @param options - Query options
   * @param options.page - Page number (1-indexed, default: 1)
   * @param options.limit - Items per page (default: 20)
   * @param options.is_stale - Filter by stale status (optional)
   * @param options.confidence_band - Filter by confidence band (optional)
   * @returns Paginated queue items with total count
   * @throws Error if database query fails
   */
  async getQueue(options: {
    page?: number;
    limit?: number;
    is_stale?: boolean;
    confidence_band?: string;
  } = {}): Promise<{
    items: ManualReviewQueueEntry[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    try {
      const client = this.supabaseService.getClient();

      // Build query
      let query = client
        .from('manual_review_queue')
        .select('*', { count: 'exact' })
        .is('reviewed_at', null)
        .order('queued_at', { ascending: false });

      // Apply filters
      if (typeof options.is_stale === 'boolean') {
        query = query.eq('is_stale', options.is_stale);
      }

      if (options.confidence_band) {
        query = query.eq('confidence_band', options.confidence_band);
      }

      // Apply pagination
      const { data, count, error } = await query.range(offset, offset + limit - 1);

      if (error) {
        this.logger.error(`Failed to fetch queue: ${error.message}`, {
          page,
          limit,
          filters: { is_stale: options.is_stale, confidence_band: options.confidence_band },
        });
        throw error;
      }

      return {
        items: (data || []) as ManualReviewQueueEntry[],
        total: count || 0,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error(`Queue retrieval error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get queue status and metrics
   *
   * Returns statistics about the manual review queue:
   * - Total active items
   * - Stale items count
   * - Items by confidence band
   * - Oldest item in queue (for monitoring stale processing)
   *
   * @returns Queue status with metrics
   * @throws Error if database query fails
   */
  async getQueueStatus(): Promise<{
    active_count: number;
    stale_count: number;
    by_band: Record<string, number>;
    oldest_queued_at: string | null;
  }> {
    try {
      const client = this.supabaseService.getClient();

      // Count active items
      const { count: activeCount, error: activeError } = await client
        .from('manual_review_queue')
        .select('id', { count: 'exact', head: true })
        .is('reviewed_at', null);

      if (activeError) throw activeError;

      // Count stale items
      const { count: staleCount, error: staleError } = await client
        .from('manual_review_queue')
        .select('id', { count: 'exact', head: true })
        .is('reviewed_at', null)
        .eq('is_stale', true);

      if (staleError) throw staleError;

      // Get count by confidence band
      const { data: bandData, error: bandError } = await client
        .from('manual_review_queue')
        .select('confidence_band')
        .is('reviewed_at', null);

      if (bandError) throw bandError;

      const by_band: Record<string, number> = {};
      (bandData || []).forEach((item: any) => {
        by_band[item.confidence_band] = (by_band[item.confidence_band] || 0) + 1;
      });

      // Get oldest queued item
      const { data: oldestData, error: oldestError } = await client
        .from('manual_review_queue')
        .select('queued_at')
        .is('reviewed_at', null)
        .order('queued_at', { ascending: true })
        .limit(1);

      if (oldestError) throw oldestError;

      return {
        active_count: activeCount || 0,
        stale_count: staleCount || 0,
        by_band,
        oldest_queued_at: oldestData && oldestData[0] ? oldestData[0].queued_at : null,
      };
    } catch (error) {
      this.logger.error(`Queue status retrieval error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Retrieve a single queue entry with all evaluation details
   *
   * Fetches complete queue entry including layer1/2/3 results and reasoning.
   * Used when displaying review dialog with factor breakdown.
   *
   * @param id - Queue entry ID (UUID)
   * @returns Complete queue entry or null if not found
   * @throws Error if database query fails
   */
  async getQueueEntry(id: string): Promise<ManualReviewQueueEntry | null> {
    try {
      const client = this.supabaseService.getClient();

      const { data, error } = await client
        .from('manual_review_queue')
        .select('*')
        .eq('id', id)
        .single();

      if (error && error.code === 'PGRST116') {
        // Not found - this is not an error condition
        this.logger.debug(`Queue entry not found: ${id}`);
        return null;
      }

      if (error) throw error;

      return data as ManualReviewQueueEntry;
    } catch (error) {
      this.logger.error(
        `Queue entry retrieval error for ${id}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Process a review decision (approve or reject)
   *
   * Updates manual_review_queue with review decision and timestamp (soft-delete).
   * This is the API endpoint handler method - actual business logic (inserting to url_results)
   * is handled by ManualReviewRouterService.reviewAndSoftDelete().
   *
   * This method only updates the queue entry itself.
   *
   * @param id - Queue entry ID
   * @param decision - 'approved' or 'rejected'
   * @param notes - Optional reviewer notes
   * @returns Updated queue entry
   * @throws Error if entry not found or update fails
   */
  async reviewEntry(
    id: string,
    decision: 'approved' | 'rejected',
    notes?: string,
  ): Promise<ManualReviewQueueEntry> {
    try {
      const client = this.supabaseService.getClient();

      const { data, error } = await client
        .from('manual_review_queue')
        .update({
          review_decision: decision,
          reviewer_notes: notes || null,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      if (!data) {
        throw new Error(`Failed to update queue entry: ${id}`);
      }

      this.logger.debug(`Queue entry reviewed: ${id} (decision: ${decision})`);
      return data as ManualReviewQueueEntry;
    } catch (error) {
      this.logger.error(
        `Review entry error for ${id}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }
}
