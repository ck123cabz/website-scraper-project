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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { JobsService } from './jobs.service';
import { FileParserService } from './services/file-parser.service';
import { UrlValidationService } from './services/url-validation.service';
import { QueueService } from '../queue/queue.service';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateJobDto } from './dto/create-job.dto';
import { extname } from 'path';

@Controller('jobs')
export class JobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly fileParserService: FileParserService,
    private readonly urlValidationService: UrlValidationService,
    private readonly queueService: QueueService,
    private readonly supabase: SupabaseService,
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

      // Database insertion (Task 5)
      const { job, urlIds } = await this.jobsService.createJobWithUrls(jobName, uniqueUrls);

      // Queue URLs for processing (Story 3.1 fix: auto-start job)
      // Update job status to 'processing' and set started_at timestamp
      await this.jobsService.updateJob(job.id, {
        status: 'processing',
        started_at: new Date().toISOString(),
      });

      // Add URLs to BullMQ queue for worker processing with urlId
      const queueJobs = uniqueUrls.map((url, index) => ({
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
          url_count: uniqueUrls.length,
          duplicates_removed_count: duplicatesRemovedCount,
          invalid_urls_count: invalidCount,
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

      return {
        success: true,
        data: result,
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

  @Get(':id/export')
  async exportJobResults(
    @Param('id') jobId: string,
    @Query('format') format: string = 'csv',
    @Query('status') status: string = '',
    @Query('classification') classification: string = '',
    @Query('search') search: string = '',
    @Res() res: Response,
  ) {
    try {
      // Build query
      let query = this.supabase
        .getClient()
        .from('results')
        .select('*')
        .eq('job_id', jobId)
        .order('processed_at', { ascending: false });

      // Apply filters
      if (status && status !== '') {
        query = query.eq('status', status);
      }
      if (classification && classification !== '') {
        query = query.eq('classification_result', classification);
      }
      if (search && search !== '') {
        query = query.ilike('url', `%${search}%`);
      }

      const { data: results, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      if (!results || results.length === 0) {
        throw new HttpException(
          {
            success: false,
            error: 'No results found to export',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      // Get job name for filename
      const { data: job } = await this.supabase
        .getClient()
        .from('jobs')
        .select('name')
        .eq('id', jobId)
        .single();

      const jobName = job?.name || 'job';
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${jobName.replace(/[^a-z0-9]/gi, '_')}_${timestamp}`;

      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
        res.send(JSON.stringify(results, null, 2));
      } else {
        // CSV format
        const headers = [
          'URL',
          'Status',
          'Classification',
          'Score',
          'Reasoning',
          'LLM Provider',
          'Cost',
          'Processing Time (ms)',
          'Retry Count',
          'Error Message',
          'Prefilter Passed',
          'Prefilter Reasoning',
          'Processed At',
        ];

        const csvRows = [headers.join(',')];

        for (const result of results) {
          const row = [
            `"${(result.url || '').replace(/"/g, '""')}"`,
            result.status || '',
            result.classification_result || '',
            result.classification_score || '',
            `"${(result.classification_reasoning || '').replace(/"/g, '""')}"`,
            result.llm_provider || '',
            result.llm_cost || '0',
            result.processing_time_ms || '',
            result.retry_count || '0',
            `"${(result.error_message || '').replace(/"/g, '""')}"`,
            result.prefilter_passed !== null ? result.prefilter_passed : '',
            `"${(result.prefilter_reasoning || '').replace(/"/g, '""')}"`,
            result.processed_at || '',
          ];
          csvRows.push(row.join(','));
        }

        const csvContent = csvRows.join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
        res.send(csvContent);
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      console.error('[JobsController] Error exporting results:', error);
      throw new HttpException(
        {
          success: false,
          error: 'Failed to export results. Please try again.',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
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
}
