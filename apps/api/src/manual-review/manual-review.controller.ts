import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ManualReviewService } from './manual-review.service';
import { ManualReviewRouterService } from '../jobs/services/manual-review-router.service';
import { ReviewDecisionDto } from './dto/review-decision.dto';
import { ManualReviewQueueEntry } from '@website-scraper/shared';

/**
 * ManualReviewController (Phase 3: T013)
 *
 * REST API endpoints for manual review queue management.
 * Endpoints:
 * - GET /api/manual-review - List queue items (paginated)
 * - GET /api/manual-review/status - Queue metrics and statistics
 * - GET /api/manual-review/:id - Get single queue entry details
 * - POST /api/manual-review/:id/review - Submit review decision
 *
 * Routes handle pagination, filtering, and decision processing.
 * Database interactions delegated to ManualReviewService (queries) and
 * ManualReviewRouterService (review decision persistence).
 */
@Controller('api/manual-review')
export class ManualReviewController {
  private readonly logger = new Logger(ManualReviewController.name);

  constructor(
    private readonly manualReviewService: ManualReviewService,
    private readonly manualReviewRouterService: ManualReviewRouterService,
  ) {}

  /**
   * GET /api/manual-review
   * List manual review queue items with pagination and optional filtering
   *
   * Query Parameters:
   * - page: number (1-indexed, default: 1)
   * - limit: number (default: 20, max: 100)
   * - is_stale: boolean (optional) - filter by stale status
   * - confidence_band: string (optional) - filter by band (high/medium/low/auto_reject)
   *
   * Response: { items: ManualReviewQueueEntry[], total: number, page: number, limit: number }
   *
   * @returns Paginated queue items
   */
  @Get()
  async getQueue(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('is_stale') is_stale?: string,
    @Query('confidence_band') confidence_band?: string,
  ): Promise<{
    items: ManualReviewQueueEntry[];
    total: number;
    page: number;
    limit: number;
  }> {
    this.logger.log('GET /api/manual-review - Fetching queue items', {
      page: page || '1',
      limit: limit || '20',
      filters: { is_stale, confidence_band },
    });

    try {
      // Parse and validate query parameters
      const pageNum = page ? Math.max(1, parseInt(page, 10)) : 1;
      const limitNum = limit ? Math.min(Math.max(1, parseInt(limit, 10)), 100) : 20;
      const isStale = is_stale ? is_stale === 'true' : undefined;

      const result = await this.manualReviewService.getQueue({
        page: pageNum,
        limit: limitNum,
        is_stale: isStale,
        confidence_band,
      });

      this.logger.debug(
        `Retrieved ${result.items.length} items (total: ${result.total}, page: ${pageNum})`,
      );
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to fetch queue: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * GET /api/manual-review/status
   * Get queue status and metrics
   *
   * Returns:
   * - active_count: number of active queue items
   * - stale_count: number of stale items
   * - by_band: count of items by confidence band
   * - oldest_queued_at: timestamp of oldest item (for monitoring)
   *
   * @returns Queue status metrics
   */
  @Get('status')
  async getQueueStatus(): Promise<{
    active_count: number;
    stale_count: number;
    by_band: Record<string, number>;
    oldest_queued_at: string | null;
  }> {
    this.logger.log('GET /api/manual-review/status - Fetching queue status');

    try {
      const status = await this.manualReviewService.getQueueStatus();
      this.logger.debug(
        `Queue status: active=${status.active_count}, stale=${status.stale_count}`,
      );
      return status;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to fetch queue status: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * GET /api/manual-review/:id
   * Get single queue entry with all evaluation details
   *
   * Returns complete entry including Layer 1/2/3 results for factor breakdown display.
   *
   * @param id - Queue entry ID (UUID)
   * @returns Single queue entry with all details
   * @throws NotFoundException (404) if entry not found
   */
  @Get(':id')
  async getQueueEntry(@Param('id') id: string): Promise<ManualReviewQueueEntry> {
    this.logger.log(`GET /api/manual-review/${id} - Fetching queue entry`);

    try {
      const entry = await this.manualReviewService.getQueueEntry(id);

      if (!entry) {
        this.logger.warn(`Queue entry not found: ${id}`);
        throw new NotFoundException(`Queue entry ${id} not found`);
      }

      this.logger.debug(`Retrieved queue entry: ${id}`);
      return entry;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to fetch queue entry: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * GET /api/manual-review/:id/factors
   * Get factor breakdown for a queue entry (Phase 4: T021)
   *
   * Returns all Layer 1, 2, and 3 evaluation results for displaying
   * comprehensive factor breakdown in the review dialog.
   *
   * Response: Layer1Results, Layer2Results, Layer3Results
   *
   * @param id - Queue entry ID
   * @returns Factor breakdown data
   * @throws NotFoundException (404) if entry not found
   */
  @Get(':id/factors')
  async getFactorBreakdown(@Param('id') id: string): Promise<{
    layer1_results?: any;
    layer2_results?: any;
    layer3_results?: any;
  }> {
    this.logger.log(`GET /api/manual-review/${id}/factors - Fetching factor breakdown`);

    try {
      const entry = await this.manualReviewService.getQueueEntry(id);

      if (!entry) {
        this.logger.warn(`Queue entry not found for factor breakdown: ${id}`);
        throw new NotFoundException(`Queue entry ${id} not found`);
      }

      // Return all layer results
      return {
        layer1_results: entry.layer1_results,
        layer2_results: entry.layer2_results,
        layer3_results: entry.layer3_results,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to fetch factor breakdown: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * POST /api/manual-review/:id/review
   * Submit a review decision for a queue entry
   *
   * Processes user's approval or rejection decision and persists it to:
   * 1. manual_review_queue (soft-delete with decision recorded)
   * 2. url_results (final result with status and notes)
   * 3. activity_logs (audit trail)
   *
   * Body: ReviewDecisionDto
   * {
   *   "decision": "approved" | "rejected",
   *   "notes": "optional reviewer notes"
   * }
   *
   * Response: Updated queue entry with reviewed_at and decision fields set
   *
   * @param id - Queue entry ID
   * @param reviewDecisionDto - Decision payload
   * @returns Updated queue entry
   * @throws NotFoundException (404) if entry not found
   * @throws BadRequestException (400) if validation fails
   */
  @Post(':id/review')
  @HttpCode(HttpStatus.OK)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async reviewEntry(
    @Param('id') id: string,
    @Body() reviewDecisionDto: ReviewDecisionDto,
  ): Promise<{
    queue_entry: ManualReviewQueueEntry;
    message: string;
  }> {
    this.logger.log(`POST /api/manual-review/${id}/review - Processing review decision`, {
      decision: reviewDecisionDto.decision,
      has_notes: !!reviewDecisionDto.notes,
    });

    try {
      // Verify queue entry exists
      const queueEntry = await this.manualReviewService.getQueueEntry(id);
      if (!queueEntry) {
        this.logger.warn(`Queue entry not found for review: ${id}`);
        throw new NotFoundException(`Queue entry ${id} not found`);
      }

      // Update queue entry with decision (soft-delete)
      const updatedEntry = await this.manualReviewService.reviewEntry(
        id,
        reviewDecisionDto.decision,
        reviewDecisionDto.notes,
      );

      // Persist to url_results and log activity
      await this.manualReviewRouterService.reviewAndSoftDelete({
        queue_entry_id: id,
        url_id: queueEntry.url_id,
        job_id: queueEntry.job_id,
        decision: reviewDecisionDto.decision,
        notes: reviewDecisionDto.notes,
        confidence_band: queueEntry.confidence_band,
      });

      this.logger.log(
        `Review decision processed: ${id} (${reviewDecisionDto.decision})`,
      );

      return {
        queue_entry: updatedEntry,
        message: `URL ${reviewDecisionDto.decision} successfully`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process review decision: ${errorMessage}`);
      throw error;
    }
  }
}
