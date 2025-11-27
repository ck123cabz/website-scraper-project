import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpException,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  Headers,
  Req,
  Query,
  Res,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { JobsService } from './jobs.service';
import { FileParserService } from './services/file-parser.service';
import { UrlValidationService } from './services/url-validation.service';
import { Layer1DomainAnalysisService } from './services/layer1-domain-analysis.service';
import { QueueService } from '../queue/queue.service';
import { SupabaseService } from '../supabase/supabase.service';
import { ExportService } from './services/export.service';
import { CreateJobDto } from './dto/create-job.dto';
import { extname } from 'path';
import { Logger } from '@nestjs/common';

@Controller('jobs')
export class JobsController {
  private readonly logger = new Logger(JobsController.name);

  constructor(
    private readonly jobsService: JobsService,
    private readonly fileParserService: FileParserService,
    private readonly urlValidationService: UrlValidationService,
    private readonly layer1Analysis: Layer1DomainAnalysisService,
    private readonly queueService: QueueService,
    private readonly supabase: SupabaseService,
    private readonly exportService: ExportService,
  ) {}

  @Post('create')
  @UseInterceptors(FileInterceptor('file'))
  async createJobWithUrls(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: CreateJobDto,
    @Headers('content-type') contentType: string,
    @Req() req: Request,
  ) {
    try {
      let urls: string[] = [];
      const jobName = body.name || 'Untitled Job';

      // Content-type detection
      if (file) {
        // multipart/form-data with file upload (using memory storage - H1/H2 fix)
        const fileExt = extname(file.originalname).toLowerCase();
        urls = await this.fileParserService.parseFile(file.buffer, fileExt);
      } else if (body.urls && Array.isArray(body.urls)) {
        // application/json with urls array
        urls = body.urls;
      } else if (contentType?.includes('text/plain')) {
        // text/plain with line-separated URLs
        const rawBody = (req as any).rawBody || '';
        urls = rawBody
          .split('\n')
          .map((url: string) => url.trim())
          .filter((url: string) => url.length > 0);
      } else {
        throw new HttpException(
          {
            success: false,
            error:
              'Invalid request format. Expected file upload, JSON body with urls array, or text/plain body.',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Validate and normalize URLs (Task 3)
      const { validUrls, invalidCount } = this.urlValidationService.validateAndNormalizeUrls(urls);

      if (validUrls.length === 0) {
        throw new HttpException(
          {
            success: false,
            error: 'No valid URLs found in uploaded file',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Deduplication (Task 4)
      const originalCount = validUrls.length;
      const deduplicationMap = new Map<string, string>(); // normalized URL -> original URL

      for (const url of validUrls) {
        const normalizedKey = this.urlValidationService.normalizeForDeduplication(url);
        if (!deduplicationMap.has(normalizedKey)) {
          deduplicationMap.set(normalizedKey, url);
        }
      }

      const uniqueUrls = Array.from(deduplicationMap.values());
      const duplicatesRemovedCount = originalCount - uniqueUrls.length;

      // Layer 1 filtering (bulk) - filter out URLs before queueing
      // This eliminates 40-60% of URLs instantly without HTTP requests
      const layer1StartTime = performance.now();
      const layer1PassedUrls: string[] = [];
      const layer1RejectedUrls: string[] = [];

      for (const url of uniqueUrls) {
        const result = this.layer1Analysis.analyzeUrl(url);
        if (result.passed) {
          layer1PassedUrls.push(url);
        } else {
          layer1RejectedUrls.push(url);
        }
      }

      const layer1Duration = performance.now() - layer1StartTime;
      const layer1EliminationRate = uniqueUrls.length > 0
        ? ((layer1RejectedUrls.length / uniqueUrls.length) * 100).toFixed(1)
        : '0.0';

      this.logger.log(
        `Layer 1 bulk filtering: ${layer1RejectedUrls.length}/${uniqueUrls.length} URLs rejected (${layer1EliminationRate}% elimination rate) in ${layer1Duration.toFixed(0)}ms`
      );

      // Database insertion (Task 5) - only insert URLs that passed Layer 1
      const { job, urlIds } = await this.jobsService.createJobWithUrls(jobName, layer1PassedUrls);

      // Queue URLs for processing (Story 3.1 fix: auto-start job)
      // Update job status to 'processing' and set started_at timestamp
      await this.jobsService.updateJob(job.id, {
        status: 'processing',
        started_at: new Date().toISOString(),
      });

      // Add URLs to BullMQ queue for worker processing with urlId
      const queueJobs = layer1PassedUrls.map((url, index) => ({
        jobId: job.id,
        url,
        urlId: urlIds[index], // Include urlId from job_urls table
      }));
      await this.queueService.addUrlsToQueue(queueJobs);

      // Return response (Task 6)
      return {
        success: true,
        data: {
          job_id: job.id,
          url_count: layer1PassedUrls.length, // Only count URLs that passed Layer 1
          duplicates_removed_count: duplicatesRemovedCount,
          invalid_urls_count: invalidCount,
          layer1_rejected_count: layer1RejectedUrls.length, // New field
          layer1_elimination_rate: `${layer1EliminationRate}%`, // New field
          created_at: job.created_at,
          status: 'processing',
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      // M2 Fix: Log detailed errors server-side but return generic message to client
      console.error('[JobsController] Error creating job with URLs:', error);
      throw new HttpException(
        {
          success: false,
          error: 'Failed to process upload. Please try again or contact support.',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  async createJob(@Body() body: { name?: string; totalUrls?: number }) {
    try {
      const job = await this.jobsService.createJob(body);
      return {
        success: true,
        data: job,
      };
    } catch (error) {
      // M2 Fix: Log detailed errors server-side but return generic message to client
      console.error('[JobsController] Error creating job:', error);
      throw new HttpException(
        {
          success: false,
          error: 'Failed to create job. Please try again.',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  async getJob(@Param('id') id: string) {
    try {
      const job = await this.jobsService.getJobById(id);

      if (!job) {
        throw new HttpException(
          {
            success: false,
            error: 'Job not found',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        success: true,
        data: job,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      // M2 Fix: Log detailed errors server-side but return generic message to client
      console.error('[JobsController] Error fetching job:', error);
      throw new HttpException(
        {
          success: false,
          error: 'Failed to retrieve job. Please try again.',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  async getAllJobs() {
    try {
      const jobs = await this.jobsService.getAllJobs();
      return {
        success: true,
        data: jobs,
      };
    } catch (error) {
      // M2 Fix: Log detailed errors server-side but return generic message to client
      console.error('[JobsController] Error fetching jobs:', error);
      throw new HttpException(
        {
          success: false,
          error: 'Failed to retrieve jobs. Please try again.',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id/results')
  async getJobResults(
    @Param('id') jobId: string,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20',
    @Query('filter') filter?: 'approved' | 'rejected' | 'all',
    @Query('layer') layer?: 'layer1' | 'layer2' | 'layer3' | 'passed_all' | 'all',
    @Query('confidence') confidence?: 'high' | 'medium' | 'low' | 'very-high' | 'very-low' | 'all',
  ) {
    try {
      const pageNum = parseInt(page, 10) || 1;
      const pageSizeNum = parseInt(pageSize, 10) || 20;

      // Call JobsService method
      const result = await this.jobsService.getJobResults(
        jobId,
        pageNum,
        pageSizeNum,
        filter,
        layer,
        confidence,
      );

      return {
        success: true,
        data: result.results,
        pagination: result.pagination,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('Job not found')) {
        throw new HttpException(
          {
            success: false,
            error: 'Job not found',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      console.error('[JobsController] Error fetching job results:', error);
      throw new HttpException(
        {
          success: false,
          error: 'Failed to retrieve results. Please try again.',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id/results/:resultId')
  async getResultDetails(@Param('id') jobId: string, @Param('resultId') resultId: string) {
    try {
      const result = await this.jobsService.getResultDetails(jobId, resultId);

      if (!result) {
        throw new HttpException(
          {
            success: false,
            error: 'Result not found or does not belong to this job',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      // Handle NULL factors gracefully for pre-migration data
      return {
        success: true,
        data: {
          ...result,
          layer1_factors: result.layer1_factors || {
            message: 'Factor data not available (processed before schema migration)',
            reason: 'Layer 1 analysis not completed',
          },
          layer2_factors: result.layer2_factors || {
            message: 'Factor data not available',
            reason: 'Layer 2 analysis not completed or error occurred',
          },
          layer3_factors: result.layer3_factors || {
            message: 'Factor data not available',
            reason: 'Layer 3 analysis not completed or error occurred',
          },
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      console.error('[JobsController] Error fetching result details:', error);
      throw new HttpException(
        {
          success: false,
          error: 'Failed to retrieve result details. Please try again.',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * T067 [US3]: Export job results to CSV
   * POST /jobs/:id/export
   *
   * Streams CSV data using ExportService with multiple format options.
   * Supports filtering by approval status, layer, and confidence.
   *
   * @param jobId - Job UUID
   * @param format - Export format: complete, summary, layer1, layer2, layer3 (default: complete)
   * @param filter - Filter by approval status: approved, rejected, all
   * @param layer - Filter by layer: layer1, layer2, layer3, passed_all, all
   * @param confidence - Filter by confidence: high, medium, low, all
   * @param res - Express Response object
   */
  @Post(':id/export')
  async exportJobResults(
    @Param('id') jobId: string,
    @Res() res: Response,
    @Query('format') format: string = 'complete',
    @Query('filter') filter?: string,
    @Query('layer') layer?: string,
    @Query('confidence') confidence?: string,
  ): Promise<void> {
    // 1. Validate jobId UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(jobId)) {
      throw new BadRequestException('Invalid job ID format. Must be a valid UUID.');
    }

    // 2. Validate format parameter
    const validFormats = ['complete', 'summary', 'layer1', 'layer2', 'layer3'];
    if (!validFormats.includes(format)) {
      throw new BadRequestException(
        `Invalid format: ${format}. Must be one of: ${validFormats.join(', ')}`,
      );
    }

    // 3. Validate filter parameter
    if (filter && !['approved', 'rejected', 'all'].includes(filter)) {
      throw new BadRequestException(
        `Invalid filter value: ${filter}. Must be one of: approved, rejected, all`,
      );
    }

    // 4. Validate layer parameter
    if (layer && !['layer1', 'layer2', 'layer3', 'passed_all', 'all'].includes(layer)) {
      throw new BadRequestException(
        `Invalid layer value: ${layer}. Must be one of: layer1, layer2, layer3, passed_all, all`,
      );
    }

    // 5. Validate confidence parameter
    if (confidence && !['high', 'medium', 'low', 'all'].includes(confidence)) {
      throw new BadRequestException(
        `Invalid confidence value: ${confidence}. Must be one of: high, medium, low, all`,
      );
    }

    try {
      // 6. Call ExportService to get stream
      const stream = await this.exportService.streamCSVExport(
        jobId,
        format as 'complete' | 'summary' | 'layer1' | 'layer2' | 'layer3',
        {
          filter: filter as 'approved' | 'rejected' | 'all' | undefined,
          layer: layer as 'layer1' | 'layer2' | 'layer3' | 'passed_all' | 'all' | undefined,
          confidence: confidence as 'high' | 'medium' | 'low' | 'all' | undefined,
        },
      );

      // 7. Set response headers
      res.set({
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="job-${jobId}-${format}.csv"`,
      });

      // 8. Pipe stream to response
      stream.pipe(res);

      // Handle stream errors
      stream.on('error', (error) => {
        console.error('[JobsController] Export stream error:', error);
        if (!res.headersSent) {
          throw new InternalServerErrorException('Export stream failed');
        }
      });
    } catch (error) {
      // Handle specific error types
      if (error instanceof BadRequestException) {
        throw error;
      }

      // Handle job not found errors from ExportService
      if (error instanceof Error && error.message.includes('Job not found')) {
        throw new NotFoundException(`Job not found: ${jobId}`);
      }

      // Log and throw generic error
      console.error('[JobsController] Error exporting results:', error);
      throw new InternalServerErrorException('Failed to export results. Please try again.');
    }
  }

  @Patch(':id/pause')
  async pauseJob(@Param('id') jobId: string) {
    try {
      await this.queueService.pauseJob(jobId);

      // Fetch updated job to return
      const job = await this.jobsService.getJobById(jobId);

      return {
        success: true,
        data: job,
        message: 'Job paused successfully',
      };
    } catch (error) {
      console.error('[JobsController] Error pausing job:', error);
      throw new HttpException(
        {
          success: false,
          error: 'Failed to pause job. Please try again.',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id/resume')
  async resumeJob(@Param('id') jobId: string) {
    try {
      await this.queueService.resumeJob(jobId);

      // Fetch updated job to return
      const job = await this.jobsService.getJobById(jobId);

      return {
        success: true,
        data: job,
        message: 'Job resumed successfully',
      };
    } catch (error) {
      console.error('[JobsController] Error resuming job:', error);
      throw new HttpException(
        {
          success: false,
          error: 'Failed to resume job. Please try again.',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  async deleteJob(@Param('id') jobId: string) {
    try {
      await this.jobsService.deleteJob(jobId);

      return {
        success: true,
        message: 'Job deleted successfully',
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('Job not found')) {
        throw new HttpException(
          {
            success: false,
            error: 'Job not found',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      console.error('[JobsController] Error deleting job:', error);
      throw new HttpException(
        {
          success: false,
          error: 'Failed to delete job. Please try again.',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id/cancel')
  async cancelJob(@Param('id') jobId: string) {
    try {
      await this.queueService.cancelJob(jobId);

      // Fetch updated job to return
      const job = await this.jobsService.getJobById(jobId);

      return {
        success: true,
        data: job,
        message: 'Job cancelled successfully',
      };
    } catch (error) {
      console.error('[JobsController] Error cancelling job:', error);
      throw new HttpException(
        {
          success: false,
          error: 'Failed to cancel job. Please try again.',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/retry')
  async retryJob(@Param('id') jobId: string) {
    try {
      await this.queueService.retryJob(jobId);

      // Fetch updated job to return
      const job = await this.jobsService.getJobById(jobId);

      return {
        success: true,
        data: job,
        message: 'Job retry initiated successfully',
      };
    } catch (error) {
      console.error('[JobsController] Error retrying job:', error);

      // Handle specific error cases
      if (error instanceof Error) {
        if (error.message.includes('Job not found')) {
          throw new HttpException(
            {
              success: false,
              error: 'Job not found',
            },
            HttpStatus.NOT_FOUND,
          );
        }
        if (error.message.includes('Can only retry failed jobs')) {
          throw new HttpException(
            {
              success: false,
              error: error.message,
            },
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      throw new HttpException(
        {
          success: false,
          error: 'Failed to retry job. Please try again.',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /jobs/queue/status
   * Task T072 [Phase 6 - Dashboard]
   *
   * Returns real-time job progress for dashboard monitoring.
   * Includes active jobs (processing + queued) with optional completed jobs.
   *
   * @param includeCompleted - Include recently completed jobs (optional)
   * @param limit - Limit active jobs returned (default: 50, max: 100)
   * @param offset - Pagination offset (default: 0)
   * @returns Job queue status with progress metrics
   */
  @Get('queue/status')
  async getQueueStatus(
    @Query('includeCompleted') includeCompleted?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    try {
      // Parse and validate query parameters
      const parsedLimit = limit ? parseInt(limit, 10) : 50;
      const parsedOffset = offset ? parseInt(offset, 10) : 0;
      const parsedIncludeCompleted = includeCompleted === 'true';

      // Validate limit (1-100)
      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
        throw new BadRequestException('Limit must be a number between 1 and 100');
      }

      // Validate offset (>= 0)
      if (isNaN(parsedOffset) || parsedOffset < 0) {
        throw new BadRequestException('Offset must be a non-negative number');
      }

      // Get active jobs (processing + queued)
      const activeJobs = await this.jobsService.getActiveJobs(parsedLimit, parsedOffset);

      // Build response data
      const responseData: any = {
        activeJobs,
      };

      // Include completed jobs if requested
      if (parsedIncludeCompleted) {
        const completedJobs = await this.jobsService.getCompletedJobs(parsedLimit, parsedOffset);
        responseData.completedJobs = completedJobs;
      }

      return {
        success: true,
        data: responseData,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      console.error('[JobsController] Error fetching queue status:', error);
      throw new InternalServerErrorException('Failed to retrieve queue status. Please try again.');
    }
  }
}
