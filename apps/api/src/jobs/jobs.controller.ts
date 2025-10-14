import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpException,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  Headers,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { JobsService } from './jobs.service';
import { FileParserService } from './services/file-parser.service';
import { UrlValidationService } from './services/url-validation.service';
import { CreateJobDto } from './dto/create-job.dto';
import { extname } from 'path';

@Controller('jobs')
export class JobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly fileParserService: FileParserService,
    private readonly urlValidationService: UrlValidationService,
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
            error: 'Invalid request format. Expected file upload, JSON body with urls array, or text/plain body.',
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
      const job = await this.jobsService.createJobWithUrls(jobName, uniqueUrls);

      // Return response (Task 6)
      return {
        success: true,
        data: {
          job_id: job.id,
          url_count: uniqueUrls.length,
          duplicates_removed_count: duplicatesRemovedCount,
          invalid_urls_count: invalidCount,
          created_at: job.created_at,
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
}
